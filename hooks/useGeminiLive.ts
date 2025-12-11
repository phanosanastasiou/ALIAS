
import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION, TOOLS } from '../constants';
import { DistressLevel } from '../types';

interface UseGeminiLiveProps {
  onDistressTrigger: (level: DistressLevel, reason: string) => void;
  isActive: boolean;
  isMuted: boolean;
}

export const useGeminiLive = ({ onDistressTrigger, isActive, isMuted }: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Refs for audio context and processing to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); // Keeping session reference
  
  // Track mute state in ref for the audio processor callback
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });

      // Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // Using Puck for a neutral/masculine friend tone (Sam)
          },
          tools: [{ functionDeclarations: TOOLS }],
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnected(true);
            
            // Setup Audio Input Streaming
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume visualization calculation
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolumeLevel(Math.min(1, rms * 5)); // Amplify for visual effect

              // Handle Mute: If muted, send silence (zeros)
              if (isMutedRef.current) {
                 for(let i=0; i<inputData.length; i++) inputData[i] = 0;
              }

              const pcmData = encodePCM(inputData);
              
              // Send audio chunk
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: pcmData
                  }
                });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Function Calls (Distress Triggers)
             if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                  const args = fc.args as any;
                  console.log("Function Call:", fc.name, args);

                  // Process specific tools
                  if (fc.name === 'trigger_silent_alarm') {
                     onDistressTrigger(DistressLevel.LEVEL_2_ALERT, args.distress_reason || "Silent Alarm Triggered");
                  } else if (fc.name === 'initiate_emergency_dispatch') {
                     onDistressTrigger(DistressLevel.LEVEL_3_SOS, args.threat_description || "Emergency Dispatch Triggered");
                  } else if (fc.name === 'report_location_context') {
                     console.log("Location Context:", args.landmark);
                  }
                     
                  // Respond to tool to keep conversation going
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Action confirmed. Proceed with protocol." }
                      }
                    });
                  });
                }
             }

             // Handle Audio Output
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData && audioContextRef.current) {
                const ctx = audioContextRef.current;
                const buffer = await decodeAudioData(decodeBase64(audioData), ctx);
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                // Scheduling
                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                    nextStartTimeRef.current = currentTime;
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => {
                    sourcesRef.current.delete(source);
                };
             }
             
             // Handle Interruptions
             if (msg.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setError(err.message || "Connection error");
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }
  }, [onDistressTrigger]);

  useEffect(() => {
    if (isActive && !isConnected) {
      connect();
    } else if (!isActive && isConnected) {
      if (sessionRef.current) {
          sessionRef.current.then((s: any) => s.close());
      }
      cleanupAudio();
    }
  }, [isActive, connect, cleanupAudio, isConnected]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return { isConnected, error, volumeLevel };
};

// Utilities
function encodePCM(input: Float32Array): string {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}
