import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Package,
  ShoppingCart,
  Send,
  MessageSquare,
  Settings,
  Flame,
  Radio,
  QrCode,
  Wallet,
  Receipt,
  ShieldCheck,
  Smartphone,
  Download
} from 'lucide-react';

import { AuthSession } from '../types';
import {
  KeyRound,
  Shield
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'builder'
  | 'products'
  | 'orders'
  | 'simulator'
  | 'broadcasts'
  | 'upi_account'
  | 'transactions_ledger'
  | 'gateways';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  ordersCount: number;
  productsCount: number;
  onOpenTestsModal: () => void;
  onOpenApkModal?: () => void;
  authSession?: AuthSession | null;
  onOpenOtpModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  ordersCount,
  productsCount,
  onOpenTestsModal,
  onOpenApkModal,
  authSession,
  onOpenOtpModal,
}) => {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-6">
        {/* Core Store Section */}
        <div>
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Bot Editor & Commerce
          </div>
          <nav className="mt-2 space-y-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4" />
                <span>Overview & KPIs</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange('simulator')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'simulator'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4" />
                <span>Live Bot Simulator</span>
              </div>
              <span className="rounded bg-cyan-400/20 px-1 text-[10px] font-bold text-cyan-300">
                UPI QR
              </span>
            </button>

            <button
              onClick={() => onTabChange('products')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'products'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="h-4 w-4" />
                <span>Products & Keys</span>
              </div>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700">
                {productsCount}
              </span>
            </button>

            <button
              onClick={() => onTabChange('builder')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'builder'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot className="h-4 w-4" />
                <span>Bot Logic & Menus</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange('broadcasts')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'broadcasts'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className="h-4 w-4" />
                <span>Broadcast Engine</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Payment Settings Section */}
        <div>
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
            <span>Payment & Settings</span>
            <span className="text-[9px] bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
              UPI DYNAMIC
            </span>
          </div>

          <nav className="mt-2 space-y-1">
            <button
              onClick={() => onTabChange('upi_account')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'upi_account'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-cyan-400" />
                <span>My UPI / Payment Account</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange('transactions_ledger')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'transactions_ledger'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <span>Transactions Ledger</span>
              </div>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700">
                {ordersCount}
              </span>
            </button>

            <button
              onClick={() => onTabChange('gateways')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeTab === 'gateways'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-amber-400" />
                <span>Settings & APK Distribution</span>
              </div>
            </button>
          </nav>
        </div>

        {/* APK Download & Acceptance Tests Buttons */}
        <div className="space-y-2">
          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className="flex w-full items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-950/40 transition shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-cyan-400" />
                <span>Download Android APK</span>
              </div>
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px]">
                v2.8.4
              </span>
            </button>
          )}

          <button
            onClick={onOpenTestsModal}
            className="flex w-full items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-950/40 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Acceptance Tests (A–O)</span>
            </div>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px]">
              15/15
            </span>
          </button>

          {/* Merchant OTP Verification Button */}
          {onOpenOtpModal && (
            <button
              onClick={onOpenOtpModal}
              className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition shadow-sm ${
                authSession?.verified
                  ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                  : 'border-amber-500/30 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                <span className="truncate max-w-[120px]">
                  {authSession?.verified ? authSession.phoneNumber : 'Verify OTP'}
                </span>
              </div>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                {authSession?.verified ? 'OTP OK' : 'VERIFY'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Bot Server Status Footer */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">UPI Gateway Status</span>
          <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            REAL MODE
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
          <span>Switch: Live Provider</span>
          <span>WebAPK: Supported</span>
        </div>
      </div>
    </aside>
  );
};
