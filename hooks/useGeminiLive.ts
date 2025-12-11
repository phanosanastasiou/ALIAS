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
  const sessionRef = useRef<any>(null); 
  
  // Stable refs for props
  const onDistressTriggerRef = useRef(onDistressTrigger);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    onDistressTriggerRef.current = onDistressTrigger;
  }, [onDistressTrigger]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch(e) {}
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      try { inputContextRef.current.close(); } catch(e) {}
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (sourcesRef.current) {
      sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      sourcesRef.current.clear();
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found in environment");

      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      
      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
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
            setError(null);
            
            // Setup Input Processing
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate Volume for UI
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolumeLevel(Math.min(1, rms * 5)); 

              // Handle Mute
              if (isMutedRef.current) {
                 for(let i=0; i<inputData.length; i++) inputData[i] = 0;
              }

              const pcmData = encodePCM(inputData);
              
              sessionPromise.then(session => {
                try {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: pcmData
                        }
                    });
                } catch (e) {
                    console.error("Send input error:", e);
                }
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // 1. Handle Tool Calls
             if (msg.toolCall) {
                const responses = [];
                for (const fc of msg.toolCall.functionCalls) {
                  const args = (fc.args as any) || {};
                  console.log(`Tool Triggered: ${fc.name}`, args);

                  let result = { result: "Action confirmed." };

                  if (fc.name === 'find_safe_location') {
                       try {
                           if (!navigator.geolocation) throw new Error("Geolocation not supported");
                           
                           const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                               navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                           });
                           const { latitude, longitude } = position.coords;
                           
                           // Call n8n Webhook
                           const response = await fetch('https://n8n-8gcyh-u31496.vm.elestio.app/webhook/safe-location', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ lat: latitude, lng: longitude })
                           });
                           
                           if (!response.ok) throw new Error("Safety network unreachable");
                           
                           const data = await response.json();
                           // Use 'voice_response' from webhook or fallback
                           const guidance = data.voice_response || "Location sent. Proceed to the nearest public area immediately.";
                           result = { result: guidance };
                           
                       } catch (e: any) {
                           console.error("Safe Location Error:", e);
                           result = { result: "I can't access your GPS right now. Walk towards the nearest street lights or open business." };
                       }
                  } 
                  else if (fc.name === 'trigger_silent_alarm') {
                     onDistressTriggerRef.current(DistressLevel.LEVEL_2_ALERT, args.distress_reason || "Silent Alarm");
                     result = { result: "Silent alarm triggered. Tracking active." };
                  } else if (fc.name === 'initiate_emergency_dispatch') {
                     onDistressTriggerRef.current(DistressLevel.LEVEL_3_SOS, args.threat_description || "SOS");
                     result = { result: "Emergency services contacted." };
                  } else if (fc.name === 'report_location_context') {
                     console.log("Context:", args.landmark);
                     result = { result: "Logged." };
                  }
                     
                  responses.push({
                      id: fc.id,
                      name: fc.name,
                      response: result
                  });
                }
                
                // Send Tool Responses back to model
                if (responses.length > 0) {
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                          functionResponses: responses
                        });
                    });
                }
             }

             // 2. Handle Audio Output
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData && audioContextRef.current) {
                try {
                    const ctx = audioContextRef.current;
                    const buffer = await decodeAudioData(decodeBase64(audioData), ctx);
                    
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    
                    const currentTime = ctx.currentTime;
                    // Ensure smooth playback sequence
                    if (nextStartTimeRef.current < currentTime) {
                        nextStartTimeRef.current = currentTime;
                    }
                    
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                    
                    sourcesRef.current.add(source);
                    source.onended = () => {
                        sourcesRef.current.delete(source);
                    };
                } catch (audioErr) {
                    console.error("Audio decode error:", audioErr);
                }
             }
             
             // 3. Handle Interruptions
             if (msg.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            console.log("Gemini Live Disconnected");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            setError(err.message || "Connection failed");
            setIsConnected(false);
          }
        }
      });
      
      sessionPromise.catch(e => {
          console.error("Session connection failed:", e);
          setError("Failed to connect.");
      });

      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error("Initialization error:", e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (isActive && !sessionRef.current) {
        connect();
    } else if (!isActive) {
        if (sessionRef.current) {
            sessionRef.current.then((s: any) => s.close());
            sessionRef.current = null;
        }
        cleanupAudio();
    }
  }, [isActive, connect, cleanupAudio]);

  useEffect(() => {
    return () => {
        if (sessionRef.current) {
            sessionRef.current.then((s: any) => s.close());
        }
        cleanupAudio();
    };
  }, [cleanupAudio]);

  return { isConnected, error, volumeLevel };
};

// --- Audio Utilities ---
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
