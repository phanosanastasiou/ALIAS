import React, { useState, useEffect, useRef } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { DistressLevel, BackgroundNoise, Contact } from '../types';
import { FAKE_CONTACTS } from '../constants';

interface CallScreenProps {
  onEndCall: () => void;
  backgroundNoise: BackgroundNoise;
}

export const CallScreen: React.FC<CallScreenProps> = ({ onEndCall, backgroundNoise }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [distressState, setDistressState] = useState<DistressLevel>(DistressLevel.SAFE);
  const [locationStatus, setLocationStatus] = useState<string>('');
  
  // Overlays
  const [activeOverlay, setActiveOverlay] = useState<'NONE' | 'KEYPAD' | 'CONTACTS'>('NONE');
  
  // Hidden video element for "Video" button functionality
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Audio ref for background noise
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleDistressTrigger = (level: DistressLevel, reason: string) => {
    setDistressState(level);
    console.warn(`DISTRESS LEVEL ${level} TRIGGERED: ${reason}`);
    
    // Simulate backend actions
    if (level === DistressLevel.LEVEL_2_ALERT) {
      setLocationStatus('Sharing Live Location • Contacts Notified');
    } else if (level === DistressLevel.LEVEL_3_SOS) {
      setLocationStatus('SOS: DIALING 911...');
    }
  };

  const { isConnected, volumeLevel, error } = useGeminiLive({
    onDistressTrigger: handleDistressTrigger,
    isActive: true,
    isMuted: isMuted // Pass mute state to hook
  });

  // Call Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ambient Noise Logic
  useEffect(() => {
    const audio = new Audio(backgroundNoise.url); 
    audio.loop = true;
    audio.volume = 0.15; // Low background volume
    audio.play().catch(e => console.log("Auto-play prevented", e));
    ambientAudioRef.current = audio;

    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
    };
  }, [backgroundNoise]); // Re-run if noise choice changes

  // Handle Video "Recording"
  const toggleVideo = async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setIsRecording(true);
        } catch (e) {
            console.error("Camera permission denied");
        }
    } else {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const bgStyle = distressState === DistressLevel.LEVEL_3_SOS 
    ? "bg-red-900 animate-pulse" 
    : "bg-gray-900"; 

  // Keypad Click
  const handleKeypadClick = (key: string) => {
      // Could play DTMF tone here
      console.log("Pressed", key);
  };
  
  // Contact Click
  const handleContactClick = (contact: Contact) => {
      setActiveOverlay('NONE');
      // Briefly show a toast or status
      // Realistically, the user speaks "I'm adding Dad" which the AI hears, 
      // but we can simulate a system sound or message.
      setLocationStatus(`Merging call with ${contact.name}...`);
      setTimeout(() => setLocationStatus(''), 3000);
  };

  return (
    <div className={`h-full w-full flex flex-col items-center justify-between py-12 px-8 text-white relative transition-colors duration-500 ${bgStyle}`}>
      {/* Hidden Video Capture */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* Top Info */}
      <div className={`flex flex-col items-center space-y-2 w-full transition-opacity duration-300 ${activeOverlay !== 'NONE' ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
        <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-semibold">Sam</h1>
            {/* VAD Indicator */}
            {isConnected && (
                <div 
                    className="w-3 h-3 rounded-full bg-green-500" 
                    style={{ opacity: 0.3 + volumeLevel }} 
                />
            )}
        </div>
        <p className="text-gray-400 text-lg">
           {isConnected ? formatTime(callDuration) : 'Connecting...'}
        </p>
        
        {locationStatus && (
            <div className="bg-red-600/20 text-red-200 px-3 py-1 rounded-full text-xs font-mono border border-red-500/30 animate-pulse">
                {locationStatus}
            </div>
        )}
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>

      {/* Overlays */}
      
      {/* Keypad Overlay */}
      {activeOverlay === 'KEYPAD' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-32 bg-gray-900/95">
             <div className="grid grid-cols-3 gap-6 mb-8">
                 {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                     <button 
                        key={key} 
                        onClick={() => handleKeypadClick(key)}
                        className="w-20 h-20 rounded-full bg-gray-800 text-3xl font-medium hover:bg-gray-700 transition-colors"
                     >
                         {key}
                     </button>
                 ))}
             </div>
             <button onClick={() => setActiveOverlay('NONE')} className="text-white font-bold text-lg">Hide</button>
          </div>
      )}

      {/* Contacts Overlay */}
      {activeOverlay === 'CONTACTS' && (
          <div className="absolute inset-0 z-30 flex flex-col bg-gray-900 overflow-hidden">
             <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800">
                 <h2 className="text-xl font-bold">Contacts</h2>
                 <button onClick={() => setActiveOverlay('NONE')} className="text-blue-400 font-bold">Cancel</button>
             </div>
             <div className="flex-1 overflow-y-auto no-scrollbar">
                 {FAKE_CONTACTS.map(contact => (
                     <div 
                        key={contact.id} 
                        onClick={() => handleContactClick(contact)}
                        className="flex items-center p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                     >
                         <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-4">
                             {contact.name[0]}
                         </div>
                         <div className="flex-1">
                             <p className="font-semibold">{contact.name}</p>
                             <p className="text-xs text-gray-500 capitalize">{contact.type}</p>
                         </div>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                         </svg>
                     </div>
                 ))}
             </div>
          </div>
      )}


      {/* Main Avatar Area (Hidden during overlays) */}
      <div className={`flex-grow flex items-center justify-center w-full ${activeOverlay !== 'NONE' ? 'hidden' : 'flex'}`}>
        <div className="w-48 h-48 rounded-full bg-gray-700 flex items-center justify-center text-4xl font-bold text-gray-500 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-600 to-gray-400"></div>
            <span className="z-10 text-white">S</span>
        </div>
      </div>

      {/* Call Controls */}
      <div className={`w-full max-w-sm space-y-6 ${activeOverlay !== 'NONE' ? 'hidden' : 'block'}`}>
        
        {/* Grid Buttons */}
        <div className="grid grid-cols-3 gap-6">
            <CallButton 
                icon="mute" 
                label="mute" 
                active={isMuted} 
                onClick={() => setIsMuted(!isMuted)} 
            />
            <CallButton 
                icon="keypad" 
                label="keypad" 
                active={activeOverlay === 'KEYPAD'}
                onClick={() => setActiveOverlay('KEYPAD')}
            />
            <CallButton 
                icon="speaker" 
                label="audio" 
                active={isSpeaker} 
                onClick={() => setIsSpeaker(!isSpeaker)} 
            />
            <CallButton 
                icon="add" 
                label="add call" 
                onClick={() => setActiveOverlay('CONTACTS')}
            />
            <CallButton 
                icon="video" 
                label="FaceTime" 
                active={isRecording}
                onClick={toggleVideo} // Secretly records
            />
            <CallButton 
                icon="contacts" 
                label="contacts" 
                onClick={() => setActiveOverlay('CONTACTS')}
            />
        </div>

        {/* End Call */}
        <div className="flex justify-center pt-8">
            <button 
                onClick={onEndCall}
                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Buttons
const CallButton = ({ icon, label, active, onClick }: { icon: string, label: string, active?: boolean, onClick?: () => void }) => {
    return (
        <div className="flex flex-col items-center space-y-2">
            <button 
                onClick={onClick}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${active ? 'bg-white text-gray-900' : 'bg-white/10 text-white backdrop-blur-sm'}`}
            >
                {/* Simplified Icon Logic */}
                {icon === 'mute' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                         {active && <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth={1.5} />}
                    </svg>
                )}
                {icon === 'keypad' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                )}
                {icon === 'speaker' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                )}
                {icon === 'add' && (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                     </svg>
                )}
                 {icon === 'video' && (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                     </svg>
                )}
                {icon === 'contacts' && (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                     </svg>
                )}
            </button>
            <span className="text-xs text-white capitalize">{label}</span>
        </div>
    )
}
