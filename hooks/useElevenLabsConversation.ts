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
        onError: (err) => {
            log("Error", err);
            setError(err.message || "Connection error");
        },
    });

    // Start session once when isActive becomes true
    useEffect(() => {
        if (!isActive) return;
        if (sessionStartedRef.current) return;

        const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
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
                await conversation.startSession({ agentId });
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
