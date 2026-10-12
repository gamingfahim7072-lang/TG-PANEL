import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface PhoneDeviceFrameProps {
  children: React.ReactNode;
  isFrameless?: boolean;
  onToggleFrameless?: () => void;
}

export const PhoneDeviceFrame: React.FC<PhoneDeviceFrameProps> = ({
  children,
  isFrameless = false,
}) => {
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobileWidth = window.innerWidth < 640;
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsMobileScreen(mobileWidth);
      setIsStandalone(standalone);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // On an actual phone or standalone WebAPK app, always render 100% full screen edge-to-edge
  if (isMobileScreen || isStandalone || isFrameless) {
    return (
      <div className="flex h-full w-full max-w-lg mx-auto flex-col bg-slate-950 overflow-hidden relative">
        {/* On standalone WebAPK, phone OS already provides the native status bar, so hide dummy status bar */}
        {!isStandalone && (
          <div className="flex h-6 w-full items-center justify-between px-4 text-[10px] font-semibold text-slate-300 bg-slate-950/95 border-b border-slate-900 z-20 shrink-0 select-none">
            <span className="font-mono text-white">{currentTime}</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[9px] text-cyan-400 font-bold">5G</span>
              <Signal className="h-2.5 w-2.5 text-cyan-400" />
              <Wifi className="h-2.5 w-2.5 text-cyan-400" />
              <BatteryMedium className="h-3 w-3 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Inner Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-950">
          {children}
        </div>
      </div>
    );
  }

  // On desktop / tablet preview mode: Show flagship phone chassis with realistic phone ratio (9:19.5)
  return (
    <div className="flex items-center justify-center p-2 sm:p-4 w-full h-full overflow-hidden">
      <div className="relative w-full max-w-[400px] h-[840px] max-h-[95vh] rounded-[44px] border-[9px] border-slate-800 bg-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.18)] flex flex-col overflow-hidden ring-1 ring-slate-700/60 transition-all">
        {/* Hardware Frame Side Buttons */}
        <div className="absolute -left-[13px] top-28 h-10 w-1 rounded-l-md bg-slate-700" />
        <div className="absolute -left-[13px] top-42 h-10 w-1 rounded-l-md bg-slate-700" />
        <div className="absolute -right-[13px] top-32 h-14 w-1 rounded-r-md bg-slate-700" />

        {/* Dynamic Island / Punch Hole */}
        <div className="flex h-7 w-full items-center justify-between px-5 text-[10px] font-semibold text-slate-300 bg-slate-950 shrink-0 z-30 select-none border-b border-slate-900">
          <span className="font-mono text-xs text-white">{currentTime}</span>
          
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black border border-slate-800 shadow-inner">
            <div className="h-2 w-2 rounded-full bg-slate-900 border border-slate-700 ring-1 ring-cyan-500/20" />
            <div className="h-0.5 w-4 rounded-full bg-slate-800" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[9px] text-cyan-400 font-bold">5G</span>
            <Wifi className="h-2.5 w-2.5 text-cyan-400" />
            <BatteryMedium className="h-3 w-3 text-emerald-400" />
          </div>
        </div>

        {/* Inner Phone Screen Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-950">
          {children}
        </div>

        {/* Bottom Gesture / Home Pill */}
        <div className="h-3.5 w-full bg-slate-950 flex items-center justify-center shrink-0 border-t border-slate-900 select-none">
          <div className="h-1 w-24 rounded-full bg-slate-600/70" />
        </div>
      </div>
    </div>
  );
};
