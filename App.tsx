import React, { useState } from 'react';
import ChristmasExperience from './components/ChristmasExperience';
import { AppState, TreeMode } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [currentMode, setCurrentMode] = useState<TreeMode>(TreeMode.TREE);
  const [gestureHint, setGestureHint] = useState<string>("Initializing Vision...");

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-['Cinzel']">
      
      {/* 3D Canvas Layer */}
      <ChristmasExperience 
        setAppState={setAppState} 
        setMode={setCurrentMode}
        setGestureHint={setGestureHint}
      />

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 sm:p-12">
        
        {/* Header */}
        <header className={`transition-opacity duration-1000 flex flex-col items-center ${appState === AppState.READY ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-[#fffbe6] to-[#d4af37] drop-shadow-[0_0_15px_rgba(212,175,55,0.5)] font-bold tracking-widest text-center uppercase">
            Merry Christmas
          </h1>
          <div className="h-[1px] w-24 bg-[#d4af37] mt-4 mb-2 shadow-[0_0_10px_#d4af37]"></div>
          <p className="text-[#8c7e53] text-xs tracking-[0.3em] uppercase">Interactive Luxury Experience</p>
        </header>

        {/* Loading Screen */}
        {appState === AppState.LOADING && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 pointer-events-auto">
            <div className="w-16 h-16 border-t-2 border-b-2 border-[#d4af37] rounded-full animate-spin mb-6 shadow-[0_0_20px_#d4af37]"></div>
            <p className="text-[#d4af37] tracking-[0.25em] text-sm animate-pulse">PREPARING MAGIC...</p>
          </div>
        )}

        {/* Status / Instructions Footer */}
        <footer className={`transition-opacity duration-700 flex flex-col items-center ${appState === AppState.READY ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* Active Mode Indicator */}
          <div className="mb-6 px-6 py-2 border border-[#d4af37]/30 bg-black/60 backdrop-blur-md rounded-full">
            <span className="text-[#d4af37] text-xs tracking-widest uppercase">
              Current State: <span className="font-bold text-white ml-2">{currentMode}</span>
            </span>
          </div>

          {/* Gesture Guide */}
          <div className="grid grid-cols-3 gap-4 md:gap-12 text-center text-[#666]">
            <div className={`flex flex-col items-center transition-colors duration-300 ${currentMode === TreeMode.TREE ? 'text-[#d4af37]' : ''}`}>
              <div className="text-xl mb-2">✊</div>
              <span className="text-[10px] tracking-widest uppercase">Fist to Close</span>
            </div>
            <div className={`flex flex-col items-center transition-colors duration-300 ${currentMode === TreeMode.SCATTER ? 'text-[#d4af37]' : ''}`}>
              <div className="text-xl mb-2">🖐</div>
              <span className="text-[10px] tracking-widest uppercase">Open to Scatter</span>
            </div>
            <div className={`flex flex-col items-center transition-colors duration-300 ${currentMode === TreeMode.FOCUS ? 'text-[#d4af37]' : ''}`}>
              <div className="text-xl mb-2">👌</div>
              <span className="text-[10px] tracking-widest uppercase">Pinch to Inspect</span>
            </div>
          </div>
          
          <div className="mt-8 text-[#444] text-[9px] tracking-widest uppercase animate-pulse">
            {gestureHint}
          </div>
        </footer>

      </div>
    </div>
  );
};

export default App;
