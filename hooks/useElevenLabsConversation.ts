import { useConversation } from '@elevenlabs/react';
import { useState, useEffect, useRef } from 'react';
import { DistressLevel } from '../types';

interface UseElevenLabsConversationProps {
    onDistressTrigger: (level: DistressLevel, reason: string) => void;
    isActive: boolean;
    isMuted: boolean;
}

// Debug logger
const log = (msg: string, data?: any) => {
    console.log(`[ElevenLabs] ${msg}`, data ?? '');
};

export const useElevenLabsConversation = ({
    onDistressTrigger,
    isActive,
    isMuted
}: UseElevenLabsConversationProps) => {
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const sessionStartedRef = useRef(false);

    // Simplified: No overrides - configure everything in ElevenLabs dashboard instead
    const conversation = useConversation({
        micMuted: isMuted,
        clientTools: {
            triggerDistressSignal: async (params: { level: number; reason: string }) => {
                log("Distress Triggered", params);
                onDistressTrigger(params.level as DistressLevel, params.reason);
                return 'Distress signal activated. Proceed with protocol.';
            },

            findNearbySafePlace: async () => {
                log("Finding nearby safe place...");

                try {
                    // Get user's current location
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 5000,
                            maximumAge: 0
                        });
                    });

                    const { latitude, longitude } = position.coords;
                    log("Got location", { latitude, longitude });

                    // Call n8n webhook - hardcoded for reliability, can be overridden via env
                    const webhookUrl = 'https://n8n-8gcyh-u31496.vm.elestio.app/webhook/safe-location';

                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lat: latitude, lng: longitude })
                    });

                    if (!response.ok) {
                        throw new Error('Safety service unavailable');
                    }

                    const data = await response.json();
                    log("Safety places found", data);

                    // Return the voice response for the AI to speak
                    return data.voice_response || "Head toward the nearest busy public place like a store or restaurant.";

                } catch (err) {
                    log("Error finding safe place", err);
                    return "I couldn't get your exact location. Head toward any busy, well-lit public area - a store, restaurant, or police station.";
                }
            },
        },
        onConnect: () => {
            log("Connected!");
            setIsConnected(true);
        },
        onDisconnect: () => {
            log("Disconnected");
            setIsConnected(false);
            sessionStartedRef.current = false;
        },
        onError: (err: Error | string) => {
            log("Error", err);
            setError(typeof err === 'string' ? err : err.message || "Connection error");
        },
    });

    // Start session once when isActive becomes true
    useEffect(() => {
        if (!isActive) return;
        if (sessionStartedRef.current) return;

        const agentId = (import.meta as any).env?.VITE_ELEVENLABS_AGENT_ID as string | undefined;
        if (!agentId) {
            setError("VITE_ELEVENLABS_AGENT_ID not found in environment");
            return;
        }

        // Delay to handle Strict Mode
        const timeout = setTimeout(async () => {
            if (sessionStartedRef.current) return;

            log("Starting session with agent:", agentId);
            sessionStartedRef.current = true;

            try {
                await conversation.startSession({ agentId } as any);
            } catch (e: any) {
                log("startSession error", e);
                setError(e.message);
                sessionStartedRef.current = false;
            }
        }, 200);

        return () => clearTimeout(timeout);
    }, [isActive, conversation]);

    return {
        isConnected,
        isSpeaking: conversation.isSpeaking,
        error,
    };
};
