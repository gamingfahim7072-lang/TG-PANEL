import React from 'react';
import { ActiveTab } from './Sidebar';
import { TelegramBot, AuthSession } from '../types';
import {
  Bot,
  Send,
  Settings,
  ShieldCheck,
  Plus,
  X,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Download,
  KeyRound,
  Shield
} from 'lucide-react';

interface PhoneMoreDrawerProps {
  bot: TelegramBot;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenTestsModal: () => void;
  onOpenApkModal: () => void;
  onNewBotClick: () => void;
  onClose: () => void;
  authSession?: AuthSession | null;
  onOpenOtpModal?: () => void;
}

export const PhoneMoreDrawer: React.FC<PhoneMoreDrawerProps> = ({
  bot,
  activeTab,
  onTabChange,
  onOpenTestsModal,
  onOpenApkModal,
  onNewBotClick,
  onClose,
  authSession,
  onOpenOtpModal,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
      <div
        className="w-full rounded-t-3xl border-t border-slate-800 bg-slate-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
      >
        {/* Top Handle & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-full bg-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Bot Management & Tools</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                REAL MODE
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Merchant OTP Verification Banner */}
        {onOpenOtpModal && (
          <div className="mt-3">
            <button
              onClick={() => {
                onOpenOtpModal();
                onClose();
              }}
              className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-bold border transition shadow-sm ${
                authSession?.verified
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4" />
                <div>
                  <div className="text-left font-bold">
                    {authSession?.verified ? 'Merchant OTP Verified' : 'Verify Merchant Login (OTP)'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono text-left">
                    {authSession?.verified ? authSession.phoneNumber : 'Required for live bank payouts'}
                  </div>
                </div>
              </div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                {authSession?.verified ? 'ACTIVE' : 'VERIFY'}
              </span>
            </button>
          </div>
        )}

        {/* APK Download Banner */}
        <div className="mt-2.5">
          <button
            onClick={() => {
              onOpenApkModal();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 p-3 text-xs font-bold text-cyan-300 border border-cyan-500/40 hover:brightness-110 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-cyan-400" />
              <span>Install Android App (100% Phone Supported)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 font-bold">
                WebAPK
              </span>
              <Download className="h-3.5 w-3.5 text-cyan-400" />
            </div>
          </button>
        </div>

        {/* Menu Items */}
        <div className="mt-3 space-y-2">
          <button
            onClick={() => {
              onTabChange('builder');
              onClose();
            }}
            className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-semibold transition ${
              activeTab === 'builder'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-950 text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bot className="h-4 w-4 text-cyan-400" />
              <span>Bot Logic, Menus & Webhook</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>

          <button
            onClick={() => {
              onTabChange('broadcasts');
              onClose();
            }}
            className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-semibold transition ${
              activeTab === 'broadcasts'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-950 text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="h-4 w-4 text-purple-400" />
              <span>Broadcast Marketing Engine</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>

          <button
            onClick={() => {
              onTabChange('gateways');
              onClose();
            }}
            className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-semibold transition ${
              activeTab === 'gateways'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-950 text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-amber-400" />
              <span>Settings & APK Distribution</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>

          <button
            onClick={() => {
              onOpenTestsModal();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl bg-emerald-950/30 p-3 text-xs font-bold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950/50"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Acceptance Tests (Tests A–O)</span>
            </div>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px]">
              15/15 Passed
            </span>
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
          <button
            onClick={() => {
              onNewBotClick();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Connect New Bot
          </button>

          <a
            href={`https://t.me/${bot.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <span>Open Telegram</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
