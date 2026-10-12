import React, { useState } from 'react';
import { TelegramBot, AuthSession } from '../types';
import {
  Bot,
  ChevronDown,
  Plus,
  ExternalLink,
  ShieldCheck,
  Zap,
  QrCode,
  Smartphone,
  Monitor,
  KeyRound,
  Shield
} from 'lucide-react';

interface HeaderProps {
  bots: TelegramBot[];
  selectedBot: TelegramBot;
  onSelectBot: (bot: TelegramBot) => void;
  onNewBotClick: () => void;
  onOpenSimulator: () => void;
  onOpenTestsModal: () => void;
  viewMode: 'phone' | 'desktop';
  onToggleViewMode: (mode: 'phone' | 'desktop') => void;
  authSession?: AuthSession | null;
  onOpenOtpModal?: () => void;
  onOpenApkModal?: () => void;
  isAppInstalled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  bots,
  selectedBot,
  onSelectBot,
  onNewBotClick,
  onOpenSimulator,
  onOpenTestsModal,
  viewMode,
  onToggleViewMode,
  authSession,
  onOpenOtpModal,
  onOpenApkModal,
  isAppInstalled,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-lg shadow-cyan-500/20">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">FINE BOTUS</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REAL MODE
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-400">Dynamic UPI QR Commerce Engine</p>
          </div>
        </div>

        {/* Bot Switcher Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none"
          >
            <div className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
            <span className="max-w-[100px] sm:max-w-[150px] truncate font-semibold text-slate-100">{selectedBot.name}</span>
            <span className="hidden md:inline text-xs text-slate-400">@{selectedBot.username}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl z-50">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Managed Telegram Bots ({bots.length})
              </div>
              <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
                {bots.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBot(b);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition ${
                      b.id === selectedBot.id
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold truncate max-w-[140px]">{b.name}</div>
                      <div className="text-[11px] text-slate-400">@{b.username}</div>
                      <div className="text-[10px] text-cyan-400">UPI: {b.paymentAccount?.upiId || 'merchant@upi'}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>₹{b.totalRevenue.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-400">{b.totalOrders} sales</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t border-slate-800 pt-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onNewBotClick();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Connect New Telegram Bot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Merchant Login & OTP Verification Status */}
        {onOpenOtpModal && (
          <button
            onClick={onOpenOtpModal}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              authSession?.verified
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                : 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50'
            }`}
            title="Merchant Login & OTP Verification"
          >
            {authSession?.verified ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-mono text-[11px]">{authSession.phoneNumber}</span>
                <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-bold text-emerald-400">OTP OK</span>
              </>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>Verify OTP</span>
              </>
            )}
          </button>
        )}

        {/* Aspect Ratio Switcher Toggle */}
        <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 p-0.5">
          <button
            onClick={() => onToggleViewMode('phone')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
              viewMode === 'phone'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Convert panel to Phone APK 9:19.5 ratio"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Phone (APK)</span>
          </button>
          <button
            onClick={() => onToggleViewMode('desktop')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
              viewMode === 'desktop'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop Full-Width panel view"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Desktop</span>
          </button>
        </div>

        {/* Install on Phone / APK Modal Button */}
        {onOpenApkModal && (
          <button
            onClick={onOpenApkModal}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition shadow-sm ${
              isAppInstalled
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50'
            }`}
            title="Install App on Phone (WebAPK / 100% Phone Supported)"
          >
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isAppInstalled ? 'Installed' : 'Install on Phone'}</span>
            <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-extrabold text-emerald-400">APK</span>
          </button>
        )}

        <button
          onClick={onOpenTestsModal}
          className="hidden lg:flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-950/50"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Tests (A–O)</span>
        </button>

        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition hover:brightness-110 active:scale-95"
        >
          <QrCode className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">UPI Simulator</span>
        </button>

        <a
          href={`https://t.me/${selectedBot.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <span>Telegram</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
};
