import React from 'react';
import { Wifi, BatteryMedium, Signal, Maximize2, Minimize2 } from 'lucide-react';

interface PhoneDeviceFrameProps {
  children: React.ReactNode;
  isFrameless?: boolean;
  onToggleFrameless?: () => void;
}

export const PhoneDeviceFrame: React.FC<PhoneDeviceFrameProps> = ({
  children,
  isFrameless = false,
  onToggleFrameless,
}) => {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isFrameless) {
    return (
      <div className="flex h-full w-full max-w-md mx-auto flex-col bg-slate-950 overflow-hidden shadow-2xl relative">
        {/* Minimal Mobile Status Bar */}
        <div className="flex h-7 w-full items-center justify-between px-5 text-[11px] font-semibold text-slate-300 bg-slate-900/90 border-b border-slate-800/80 z-20 shrink-0">
          <span>{currentTime}</span>
          <div className="h-3 w-16 bg-slate-950 rounded-full border border-slate-800" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Signal className="h-3 w-3 text-cyan-400" />
            <Wifi className="h-3 w-3 text-cyan-400" />
            <BatteryMedium className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Inner Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-2 sm:p-4 w-full h-full overflow-y-auto">
      {/* Outer Phone Hardware Bezel (Android / Flagship Chassis) */}
      <div className="relative w-full max-w-[412px] h-[870px] max-h-[96vh] rounded-[48px] border-[10px] border-slate-850 bg-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.18)] flex flex-col overflow-hidden ring-2 ring-slate-700/60 transition-all">
        
        {/* Hardware Frame Side Buttons (Aesthetic) */}
        <div className="absolute -left-[14px] top-28 h-12 w-1 rounded-l-md bg-slate-750" />
        <div className="absolute -left-[14px] top-44 h-12 w-1 rounded-l-md bg-slate-750" />
        <div className="absolute -right-[14px] top-36 h-16 w-1 rounded-r-md bg-slate-750" />

        {/* Top Camera Punch Hole / Dynamic Island */}
        <div className="flex h-8 w-full items-center justify-between px-6 text-[11px] font-semibold text-slate-300 bg-slate-950 shrink-0 z-30 select-none">
          <span className="font-mono text-xs text-white">{currentTime}</span>
          
          {/* Speaker & Front Camera Hole */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black border border-slate-800 shadow-inner">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-700 ring-1 ring-cyan-500/20" />
            <div className="h-1 w-6 rounded-full bg-slate-800" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[10px] text-cyan-400 font-bold">5G</span>
            <Wifi className="h-3 w-3 text-cyan-400" />
            <BatteryMedium className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Inner Phone Screen Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-950">
          {children}
        </div>

        {/* Bottom Gesture / Home Swipe Pill */}
        <div className="h-4 w-full bg-slate-900/95 flex items-center justify-center shrink-0 border-t border-slate-800/40 select-none">
          <div className="h-1 w-28 rounded-full bg-slate-600/80" />
        </div>
      </div>
    </div>
  );
};
