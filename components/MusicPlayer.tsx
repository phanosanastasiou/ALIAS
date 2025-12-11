import React, { useState } from 'react';
import { BackgroundNoise } from '../types';
import { BACKGROUND_NOISES } from '../constants';

interface MusicPlayerProps {
  onTriggerSafety: () => void;
  onLockApp: () => void;
  currentNoise: BackgroundNoise;
  onNoiseChange: (noise: BackgroundNoise) => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ 
    onTriggerSafety, 
    onLockApp, 
    currentNoise,
    onNoiseChange 
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-neutral-800 to-black text-white font-sans relative">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-12 relative z-20">
        <button onClick={() => setShowSettings(!showSettings)} className="text-white hover:text-gray-300">
             {showSettings ? (
                <span className="text-sm font-bold">Done</span>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
             )}
        </button>
        <div className="text-xs tracking-widest uppercase text-neutral-400">Now Playing from Playlist</div>
        <button onClick={onLockApp}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-50 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        </button>
      </div>

      {/* Settings Overlay */}
      {showSettings && (
         <div className="absolute inset-0 bg-black/90 z-10 pt-24 px-6 backdrop-blur-sm animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-white">Environment Settings</h2>
            
            <div className="space-y-4">
                <p className="text-gray-400 text-sm uppercase tracking-wider">Background Audio</p>
                <div className="grid grid-cols-1 gap-2">
                    {BACKGROUND_NOISES.map((noise) => (
                        <button
                            key={noise.id}
                            onClick={() => onNoiseChange(noise)}
                            className={`flex justify-between items-center p-4 rounded-lg border transition-all ${currentNoise.id === noise.id ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800'}`}
                        >
                            <span>{noise.name}</span>
                            {currentNoise.id === noise.id && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-8">
                 <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Quick Actions</p>
                 <button onClick={onLockApp} className="w-full p-4 bg-gray-800 rounded-lg text-left flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Simulate Lock Screen</span>
                 </button>
            </div>
         </div>
      )}

      {/* Album Art (The Trigger) */}
      <div className="px-6 py-4 flex-grow flex items-center justify-center z-0">
        <div 
            onClick={onTriggerSafety} 
            className="w-80 h-80 bg-neutral-800 shadow-2xl overflow-hidden rounded-lg relative cursor-pointer active:scale-95 transition-transform duration-200 group"
        >
          <img src="https://picsum.photos/600/600" alt="Album Art" className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
          
          {/* Subtle Visual Cue it's interactive */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-active:opacity-30 bg-red-500 transition-opacity">
          </div>
        </div>
      </div>

      {/* Track Info */}
      <div className="px-8 mb-4 relative z-0">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold mb-1">Safety Net</h2>
            <p className="text-neutral-400">The Alias Project</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-8 mb-8 relative z-0">
        <div className="w-full bg-neutral-700 h-1 rounded-full overflow-hidden">
          <div className="bg-white h-full w-1/3"></div>
        </div>
        <div className="flex justify-between text-xs text-neutral-400 mt-2">
          <span>1:12</span>
          <span>-3:45</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-8 pb-12 flex justify-between items-center relative z-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>

        <div className="flex items-center space-x-8">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
             <path d="M11 17l-5-5 5-5v10zm7-5l-5 5V7l5 5z"/>
           </svg>
           
           <div 
             onClick={onTriggerSafety}
             className="w-16 h-16 bg-white rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black ml-1" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
             </svg>
           </div>

           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
             <path d="M13 7l5 5-5 5V7zM6 12l5-5v10l-5-5z" transform="rotate(180 12 12)"/>
           </svg>
        </div>

        <button onClick={() => setShowSettings(!showSettings)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
        </button>
      </div>
    </div>
  );
};
