import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Volume2, VolumeX, FastForward, CheckCircle2 } from 'lucide-react';

interface CinematicIntroProps {
  onComplete: () => void;
  brandName?: string;
  tagline?: string;
  videoUrl?: string;
  forceShow?: boolean;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({
  onComplete,
  brandName = 'FZ PANEL',
  tagline = 'NEXT-GEN TELEGRAM COMMERCE & SAAS ENGINE',
  videoUrl,
  forceShow = false
}) => {
  const [phase, setPhase] = useState<number>(0); // 0: init, 1: logo, 2: brand, 3: ready, 4: fading out
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('SYNCHRONIZING SECURE ENCLAVE...');
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check if user already saw intro in this session (unless forceShow is true)
  useEffect(() => {
    if (!forceShow) {
      const alreadySeen = sessionStorage.getItem('fz_intro_seen');
      if (alreadySeen === 'true') {
        onComplete();
        return;
      }
    }

    // Sequence stages
    const timer1 = setTimeout(() => setPhase(1), 300);
    const timer2 = setTimeout(() => {
      setPhase(2);
      setStatusText('INITIALIZING BOT RUNTIME PIPELINES...');
    }, 1200);
    const timer3 = setTimeout(() => {
      setPhase(3);
      setStatusText('ALL ENGINES ONLINE — LAUNCHING FZ PANEL');
    }, 2400);
    const timer4 = setTimeout(() => {
      handleFinish();
    }, 3800);

    // Progress counter
    const startProgress = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startProgress;
      const pct = Math.min(100, Math.floor((elapsed / 3200) * 100));
      setProgress(pct);
    }, 30);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearInterval(interval);
    };
  }, [forceShow]);

  // Particle & Lighting Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particles pool
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = ['#06b6d4', '#38bdf8', '#3b82f6', '#818cf8', '#a855f7'];
    for (let i = 0; i < 75; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.7 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let time = 0;
    const render = () => {
      time += 0.015;
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // Deep anamorphic center flare
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.6
      );
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
      gradient.addColorStop(0.3, 'rgba(37, 99, 235, 0.09)');
      gradient.addColorStop(0.7, 'rgba(15, 23, 42, 0.6)');
      gradient.addColorStop(1, 'rgba(6, 10, 18, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Moving cyber laser grid horizontal line
      const beamY = height / 2 + Math.sin(time) * 40;
      const beamGrad = ctx.createLinearGradient(0, beamY, width, beamY);
      beamGrad.addColorStop(0, 'transparent');
      beamGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.05)');
      beamGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.35)');
      beamGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.05)');
      beamGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, beamY - 1, width, 2);

      // Render & update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 3 + p.x));
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleFinish = () => {
    setPhase(4);
    sessionStorage.setItem('fz_intro_seen', 'true');
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#060a12] text-white flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-500 ${
        phase === 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Dynamic Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />

      {/* Optional Admin-Provided WebM/MP4 Intro Video Overlay */}
      {videoUrl && !videoError && (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover mix-blend-screen transition-opacity duration-700 ${
            videoLoaded ? 'opacity-60' : 'opacity-0'
          }`}
        />
      )}

      {/* Top Header / Skip Button */}
      <div className="absolute top-6 right-6 z-20 flex items-center space-x-3">
        <button
          onClick={handleFinish}
          className="flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 text-xs font-bold tracking-wider uppercase transition-all backdrop-blur-md cursor-pointer group shadow-lg shadow-black/50"
        >
          <span>Skip Intro</span>
          <FastForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Center Cinematic Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-lg px-6 text-center">
        {/* Animated Cyber Emblem */}
        <div
          className={`relative transition-all duration-1000 transform ${
            phase >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-6'
          }`}
        >
          {/* Pulsing Outer Rings */}
          <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 blur-xl animate-pulse" />
          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-gradient-to-tr from-[#0a1122] via-[#0f172a] to-[#1e293b] border-2 border-cyan-500/40 p-1 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
            {/* Inner Glowing Badge */}
            <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center relative overflow-hidden">
              {/* Circuit Scan Line */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-[shimmer_2s_infinite]" />

              <span className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]">
                FZ
              </span>
              <span className="text-[9px] font-extrabold tracking-[0.25em] text-cyan-400/90 mt-1 uppercase">
                ENGINE
              </span>
            </div>
          </div>
        </div>

        {/* Brand Title with High-Impact Typography */}
        <div
          className={`mt-8 transition-all duration-700 transform ${
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center justify-center space-x-2 text-xs font-extrabold text-cyan-400 tracking-[0.3em] uppercase mb-1">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
            <span>POWERED BY FZ SHOT ENGINE</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
            {brandName}
          </h1>

          <p className="mt-2 text-xs md:text-sm text-slate-400 max-w-sm mx-auto font-medium tracking-wide">
            {tagline}
          </p>
        </div>

        {/* Status Indicator & Glowing Progress Bar */}
        <div
          className={`mt-10 w-full max-w-xs transition-all duration-700 ${
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span className="truncate max-w-[200px]">{statusText}</span>
            </span>
            <span className="text-cyan-400 font-bold">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 rounded-full transition-all duration-75 shadow-[0_0_10px_#06b6d4]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-center space-x-2 text-[10px] text-slate-400 tracking-wider">
            <span>PRESS SPACE OR CLICK SKIP TO ENTER</span>
          </div>
        </div>
      </div>
    </div>
  );
};
