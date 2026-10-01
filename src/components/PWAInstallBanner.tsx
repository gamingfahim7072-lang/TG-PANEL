import React, { useState } from 'react';
import { Download, X, Share, PlusSquare, Sparkles, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isDismissed, install, dismiss } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already installed or user dismissed it, do not render
  if (isInstalled || isDismissed) {
    return null;
  }

  // Must have install capability (either beforeinstallprompt or iOS Safari)
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-[#070b14] to-slate-900 border-b border-cyan-500/20 px-4 py-2.5 sm:px-6 relative z-30 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <img src="/favicon.svg" alt="FZ PAY" className="w-5 h-5 rounded" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-white tracking-wider">INSTALL FZ PAY</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">
                  APP
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Install the FZ PAY Panel for a faster and smoother experience.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{installing ? 'INSTALLING...' : 'INSTALL APP'}</span>
            </button>

            <button
              onClick={dismiss}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              NOT NOW
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/10">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Install on iPhone / iPad</h3>
              <p className="text-xs text-slate-300">
                Follow these simple steps in Safari to add FZ PAY to your Home Screen:
              </p>
            </div>

            <div className="space-y-3 text-left text-xs bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Share className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-200">
                  <span className="font-bold text-white">Step 1:</span> Tap the <strong className="text-cyan-400">Share</strong> icon in the Safari bottom toolbar.
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <PlusSquare className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-200">
                  <span className="font-bold text-white">Step 2:</span> Scroll down and tap <strong className="text-emerald-400">Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-200">
                  <span className="font-bold text-white">Step 3:</span> Tap <strong className="text-white">Add</strong> in the top right corner.
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSModal(false);
                dismiss();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
};
