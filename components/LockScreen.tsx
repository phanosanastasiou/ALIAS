import React, { useState, useEffect } from 'react';

interface LockScreenProps {
  onUnlockAndCall: () => void;
  onUnlock: () => void; // Normal unlock
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlockAndCall, onUnlock }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="h-full w-full bg-cover bg-center text-white relative flex flex-col items-center pt-20" 
         style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop)' }}>
      
      {/* Dim Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      
      {/* Content */}
      <div className="z-10 flex flex-col items-center w-full px-6">
        {/* Lock Icon */}
        <div className="mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
           </svg>
        </div>

        {/* Clock */}
        <h1 className="text-8xl font-thin tracking-tighter mb-2">{formatTime(time)}</h1>
        <p className="text-xl font-medium mb-12">{formatDate(time)}</p>

        {/* Notifications */}
        <div className="w-full space-y-2">
            
            {/* The Trigger Widget */}
            <div 
                onClick={onUnlockAndCall}
                className="w-full bg-white/20 backdrop-blur-md rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform border border-white/10 shadow-lg flex items-center space-x-4 animate-pulse-soft"
            >
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                   </svg>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold text-sm">Phone</h3>
                        <span className="text-xs text-gray-300">now</span>
                    </div>
                    <p className="text-sm font-bold">Missed Call: Sam</p>
                    <p className="text-xs text-gray-200">Tap to return call</p>
                </div>
            </div>

             {/* Fake Notification 2 */}
            <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5 opacity-60">
                <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                        <span className="text-xs font-bold">W</span>
                     </div>
                     <div>
                        <div className="flex justify-between w-full space-x-32">
                             <h3 className="font-semibold text-sm">Weather</h3>
                             <span className="text-xs text-gray-300">12m ago</span>
                        </div>
                        <p className="text-xs">Rain starting in 15 minutes.</p>
                     </div>
                </div>
            </div>
        </div>
      </div>

      {/* Swipe to Open Area */}
      <div 
        className="absolute bottom-8 w-full flex flex-col items-center cursor-pointer"
        onClick={onUnlock}
      >
          <div className="w-32 h-1.5 bg-white rounded-full mb-2"></div>
          <p className="text-xs font-medium opacity-80">Swipe up to open</p>
      </div>
    </div>
  );
};
