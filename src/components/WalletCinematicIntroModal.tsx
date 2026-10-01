import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  ArrowRightLeft,
  FileText,
  Lock,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';

interface WalletCinematicIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export const WalletCinematicIntroModal: React.FC<WalletCinematicIntroModalProps> = ({
  isOpen,
  onClose,
  onGetStarted
}) => {
  // Scenes: 1 to 5
  // SCENE 1: Dark premium background + FZ PAY logo appears
  // SCENE 2: Futuristic wallet/card visual forms
  // SCENE 3: Animated text: "YOUR MONEY. YOUR WALLET. YOUR CONTROL."
  // SCENE 4: 5 feature badges appear sequentially: 🔐 Secure, 💳 Wallet, 📷 QR Payments, 💸 Transfers, 📜 Transaction History
  // SCENE 5: "Let's create your FZ PAY wallet." + [ GET STARTED ]
  const [scene, setScene] = useState<number>(1);

  useEffect(() => {
    if (!isOpen) {
      setScene(1);
      return;
    }

    const t1 = setTimeout(() => setScene(2), 650);
    const t2 = setTimeout(() => setScene(3), 1300);
    const t3 = setTimeout(() => setScene(4), 1950);
    const t4 = setTimeout(() => setScene(5), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#070b14] border border-cyan-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-cyan-500/10 text-center overflow-hidden flex flex-col items-center">
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SCENE 1: FZ PAY LOGO APPEARS */}
        <div
          className={`relative transition-all duration-700 transform ${
            scene >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-br from-cyan-500/30 via-slate-900 to-emerald-500/30 border border-cyan-400/40 shadow-xl shadow-cyan-500/20 mx-auto flex items-center justify-center">
            <img src="/logo-master.svg" alt="FZ PAY" className="w-full h-full object-contain rounded-xl" />
          </div>
        </div>

        {/* SCENE 2: FUTURISTIC WALLET/CARD VISUAL FORMS */}
        <div
          className={`mt-6 w-full max-w-xs transition-all duration-700 transform ${
            scene >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
          }`}
        >
          <div className="relative aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#111c33] to-[#070b14] border border-cyan-500/40 p-4 shadow-2xl text-left flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-widest text-cyan-400 font-mono">FZ PAY CARD</span>
              <div className="w-7 h-5 rounded bg-amber-400/80 border border-amber-300" />
            </div>

            <div className="font-mono text-sm tracking-widest text-slate-300 font-bold">
              5399 •••• •••• 3084
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase font-mono">
              <span>PREPAID CLOSED-LOOP</span>
              <span className="text-emerald-400 font-bold">RuPay</span>
            </div>
          </div>
        </div>

        {/* SCENE 3: "YOUR MONEY. YOUR WALLET. YOUR CONTROL." */}
        <div
          className={`mt-6 transition-all duration-700 transform ${
            scene >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <h2 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-emerald-400 uppercase tracking-widest font-mono">
            YOUR MONEY. YOUR WALLET. YOUR CONTROL.
          </h2>
        </div>

        {/* SCENE 4: 5 FEATURE BADGES APPEAR SEQUENTIALLY */}
        <div
          className={`mt-6 grid grid-cols-5 gap-2 w-full transition-all duration-700 transform ${
            scene >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {[
            { label: 'Secure', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Wallet', icon: CreditCard, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'QR Pay', icon: QrCode, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Transfers', icon: ArrowRightLeft, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'History', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1"
              >
                <div className={`w-7 h-7 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* SCENE 5: "Let's create your FZ PAY wallet." + [ GET STARTED ] */}
        <div
          className={`mt-8 w-full space-y-3 transition-all duration-500 transform ${
            scene >= 5 ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'
          }`}
        >
          <p className="text-xs text-slate-300 font-medium">
            Let's create your FZ PAY wallet with verified KYC.
          </p>

          <button
            onClick={onGetStarted}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black rounded-2xl text-xs sm:text-sm transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>GET STARTED</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
