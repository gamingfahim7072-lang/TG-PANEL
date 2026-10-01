import React, { useState, useEffect } from 'react';
import { FastForward, Loader2 } from 'lucide-react';

interface CinematicIntroProps {
  onComplete: () => void;
  brandName?: string;
  tagline?: string;
  forceShow?: boolean;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({
  onComplete,
  brandName = 'FZ PAY',
  tagline = 'SECURE TELEGRAM COMMERCE & DIGITAL WALLET',
  forceShow = false
}) => {
  // Animation Sequence Steps:
  // step 0: Initial mount
  // step 1: LOGO APPEARS (Scale & Glow entrance)
  // step 2: SUBTLE LIGHT SWEEP (Metallic reflection wave)
  // step 3: FZ PAY TEXT REVEAL (Typography tracking expansion)
  // step 4: SMOOTH SCALE / FADE OUT
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !forceShow) {
      onComplete();
      return;
    }

    if (!forceShow) {
      const alreadySeen = sessionStorage.getItem('fzpay_splash_seen');
      if (alreadySeen === 'true') {
        onComplete();
        return;
      }
    }

    // Step 1: Logo Appears at 100ms
    const t1 = setTimeout(() => setStep(1), 80);
    // Step 2: Subtle Light Sweep at 500ms
    const t2 = setTimeout(() => setStep(2), 480);
    // Step 3: FZ PAY Text Reveal at 900ms
    const t3 = setTimeout(() => setStep(3), 880);
    // Step 4: Smooth Scale & Fade Out at 1550ms
    const t4 = setTimeout(() => {
      setStep(4);
      sessionStorage.setItem('fzpay_splash_seen', 'true');
    }, 1550);
    // Complete at 1900ms
    const t5 = setTimeout(() => {
      onComplete();
    }, 1900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [forceShow, onComplete]);

  const handleSkip = () => {
    sessionStorage.setItem('fzpay_splash_seen', 'true');
    setStep(4);
    setTimeout(() => onComplete(), 150);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#070b14] text-white flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-300 ${
        step === 4 ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle Radial Glow in Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#070b14]/80 to-[#030712] pointer-events-none" />

      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleSkip}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 text-[11px] font-bold tracking-wider uppercase transition-all backdrop-blur-md cursor-pointer"
        >
          <span>Skip</span>
          <FastForward className="w-3 h-3" />
        </button>
      </div>

      {/* Main Center Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-sm">
        {/* 1. LOGO APPEARS & 2. LIGHT SWEEP */}
        <div className="relative mb-6">
          {/* Ambient Glow */}
          <div
            className={`absolute -inset-4 rounded-3xl bg-gradient-to-tr from-cyan-500/30 via-emerald-500/20 to-blue-600/30 blur-2xl transition-all duration-700 ${
              step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          />

          {/* Master Logo Container */}
          <div
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-b from-slate-800 to-slate-950 border border-cyan-500/40 shadow-2xl shadow-cyan-500/20 overflow-hidden transition-all duration-500 transform ${
              step >= 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-85 translate-y-4'
            }`}
          >
            <img
              src="/logo-master.svg"
              alt="FZ PAY"
              className="w-full h-full object-contain rounded-[22px]"
            />

            {/* LIGHT SWEEP SHIMMER EFFECT (Runs when step >= 2) */}
            <div
              className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/35 to-transparent pointer-events-none transition-transform duration-700 ease-out transform -skew-x-12 ${
                step >= 2 ? 'translate-x-[200%]' : '-translate-x-[150%]'
              }`}
            />
          </div>
        </div>

        {/* 3. FZ PAY TEXT REVEAL */}
        <div
          className={`space-y-1.5 transition-all duration-500 transform ${
            step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="text-2xl sm:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-emerald-300 drop-shadow-sm font-mono">
            {brandName}
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 font-semibold tracking-wider uppercase max-w-xs">
            {tagline}
          </p>
        </div>

        {/* Subtle Loading Pulse (if held) */}
        <div
          className={`mt-6 flex items-center space-x-2 text-[11px] text-cyan-400/80 font-mono transition-opacity duration-300 ${
            step >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>INITIALIZING SECURE WALLET...</span>
        </div>
      </div>
    </div>
  );
};
