import React, { useState } from 'react';
import { MusicPlayer } from './components/MusicPlayer';
import { CallScreen } from './components/CallScreen';
import { LockScreen } from './components/LockScreen';
import { AppMode, BackgroundNoise } from './types';
import { BACKGROUND_NOISES } from './constants';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.CAMOUFLAGE);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Settings State
  const [activeNoise, setActiveNoise] = useState<BackgroundNoise>(BACKGROUND_NOISES[0]);

  const requestPermissions = async () => {
    if (!permissionGranted) {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionGranted(true);
            return true;
        } catch (e) {
            alert("Microphone access is required for safety features.");
            return false;
        }
    }
    return true;
  };

  const triggerCall = async () => {
    const granted = await requestPermissions();
    if (granted) setMode(AppMode.CALL_ACTIVE);
  };

  const endCall = () => {
    setMode(AppMode.CAMOUFLAGE);
  };
  
  const lockApp = () => {
      setMode(AppMode.LOCK_SCREEN);
  };
  
  const unlockApp = () => {
      setMode(AppMode.CAMOUFLAGE);
  };

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
       
       {/* Lock Screen Layer */}
       <div className={`absolute inset-0 transition-transform duration-500 ${mode === AppMode.LOCK_SCREEN ? 'translate-y-0 z-30' : '-translate-y-full z-30 pointer-events-none'}`}>
           <LockScreen onUnlockAndCall={triggerCall} onUnlock={unlockApp} />
       </div>

       {/* Camouflage Layer */}
       <div className={`absolute inset-0 transition-opacity duration-300 ${mode === AppMode.CAMOUFLAGE ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <MusicPlayer 
            onTriggerSafety={triggerCall} 
            onLockApp={lockApp}
            currentNoise={activeNoise}
            onNoiseChange={setActiveNoise}
          />
       </div>

       {/* Active Safety Layer */}
       <div className={`absolute inset-0 transition-transform duration-300 ${mode === AppMode.CALL_ACTIVE ? 'translate-y-0 z-20' : 'translate-y-full z-20'}`}>
          {mode === AppMode.CALL_ACTIVE && (
              <CallScreen onEndCall={endCall} backgroundNoise={activeNoise} />
          )}
       </div>
    </div>
  );
}

export default App;