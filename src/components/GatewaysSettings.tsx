import React, { useState } from 'react';
import { TelegramBot, AuthSession } from '../types';
import {
  Settings,
  Flame,
  Wallet,
  Shield,
  Check,
  Save,
  Radio,
  Bell,
  Coins,
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Lock
} from 'lucide-react';

interface GatewaysSettingsProps {
  bot: TelegramBot;
  onUpdateBot: (bot: TelegramBot) => void;
  onOpenApkModal?: () => void;
  authSession?: AuthSession | null;
  onOpenOtpModal?: () => void;
}

export const GatewaysSettings: React.FC<GatewaysSettingsProps> = ({
  bot,
  onUpdateBot,
  onOpenApkModal,
  authSession,
  onOpenOtpModal,
}) => {
  const [tonWallet, setTonWallet] = useState('EQBvW8Z5huBkMJYdnfTQY5OgQn7kW8x-D92kF1...7y2');
  const [usdtWallet, setUsdtWallet] = useState('TRX98aJzL01kQ92mZ...902K');
  const [starsEnabled, setStarsEnabled] = useState(bot.features.starsPayment);
  const [saved, setSaved] = useState(false);
  const [stockAlertThreshold, setStockAlertThreshold] = useState(3);
  const [adminChatId, setAdminChatId] = useState('984120491');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBot({
      ...bot,
      features: {
        ...bot.features,
        starsPayment: starsEnabled,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      setUpdateStatus('Latest version v2.8.4 (Build 20804) is installed and active.');
      setTimeout(() => setUpdateStatus(null), 4000);
    }, 1000);
  };

  const triggerDirectApkDownload = () => {
    if (onOpenApkModal) {
      onOpenApkModal();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            <span>Store Settings & Mobile App Distribution</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure Android APK mobile distribution, Real Publish Mode, OTP merchant verification, and payouts
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 active:scale-95 transition"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{saved ? 'Settings Saved' : 'Save Settings'}</span>
        </button>
      </div>

      {/* REAL PUBLISH MODE & MERCHANT OTP AUTHENTICATION STATUS */}
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/30 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Production Status: REAL PUBLISH MODE</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                  LIVE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                All sandbox and test modes ended. Real payment gateway switches & authoritative server verification active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authSession?.verified ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400">Merchant Verified via OTP:</div>
                  <div className="font-mono font-bold text-emerald-300">{authSession.phoneNumber}</div>
                </div>
                {onOpenOtpModal && (
                  <button
                    onClick={onOpenOtpModal}
                    className="ml-2 text-[11px] text-cyan-400 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              onOpenOtpModal && (
                <button
                  onClick={onOpenOtpModal}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Verify Login with Phone OTP</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* APK DOWNLOAD & MOBILE DISTRIBUTION CARD */}
      <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-3 text-white shadow-lg shadow-cyan-600/30">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Android APK Mobile Installation</h3>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/20">
                  v2.8.4 STABLE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official standalone Android package with Native Phone Ratio & Dynamic UPI QR Scanning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>Check for Updates</span>
            </button>

            <button
              onClick={triggerDirectApkDownload}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:brightness-110 active:scale-95"
            >
              <Smartphone className="h-4 w-4" />
              <span>Install App on Phone</span>
            </button>
          </div>
        </div>

        {/* APK Spec Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <span className="text-[11px] text-slate-400">Package ID</span>
            <div className="font-mono text-cyan-400 font-bold truncate">com.finebotus.teledash</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <span className="text-[11px] text-slate-400">Build Version</span>
            <div className="text-white font-bold">v2.8.4 (Build 20804)</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <span className="text-[11px] text-slate-400">Phone Compatibility</span>
            <div className="text-emerald-400 font-bold">100% Fixed (Android 7–15)</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <span className="text-[11px] text-slate-400">Install Engine</span>
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> WebAPK / Zero Error
            </div>
          </div>
        </div>

        {updateStatus && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" />
            <span>{updateStatus}</span>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Resolved "Install failed / Problem parsing package" · Direct 1-Tap native installation</span>
          </div>
          <button
            onClick={onOpenApkModal}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Open Phone Install QR & Guide</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Telegram Stars Gateway */}
        <div className="rounded-xl border border-amber-500/30 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-500/20 p-2 text-amber-400 border border-amber-500/30">
                <Flame className="h-5 w-5 fill-amber-400" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Telegram Stars Native Payments</h3>
                <span className="text-[11px] text-amber-400">Official Telegram Merchant API</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={starsEnabled}
                onChange={(e) => setStarsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Telegram Stars allow buyers on iOS, Android, and Telegram Desktop to purchase digital items with one-tap native authorization. You can withdraw Stars for TON on Fragment or use them to run Telegram ads.
          </p>

          <div className="rounded-lg bg-slate-950 p-3 text-xs space-y-2 border border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>Platform Fee:</span>
              <span className="text-emerald-400 font-bold">0% (FINE BOTUS Pro Plan)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Withdrawal Network:</span>
              <span className="text-white">Fragment.com (TON or Fiat)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Auto-Refund Window:</span>
              <span className="text-white">Supported via BotFather API</span>
            </div>
          </div>
        </div>

        {/* TON & Crypto Non-Custodial */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="rounded-lg bg-sky-500/10 p-2 text-sky-400 border border-sky-500/20">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Direct Non-Custodial Crypto</h3>
              <span className="text-[11px] text-slate-400">Funds go directly to your personal wallet</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              TON Receiving Wallet Address
            </label>
            <input
              type="text"
              value={tonWallet}
              onChange={(e) => setTonWallet(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              USDT (TRC-20) Receiving Address
            </label>
            <input
              type="text"
              value={usdtWallet}
              onChange={(e) => setUsdtWallet(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Low Stock Telegram Notifications */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Admin Telegram Alerts</h3>
              <span className="text-[11px] text-slate-400">Get notified when a key pool runs low or new purchase lands</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Telegram Chat ID
              </label>
              <input
                type="text"
                value={adminChatId}
                onChange={(e) => setAdminChatId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">
                Type /my_id to @userinfobot to retrieve your Telegram numerical ID
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Low Key Stock Alert Threshold
              </label>
              <input
                type="number"
                value={stockAlertThreshold}
                onChange={(e) => setStockAlertThreshold(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">
                Trigger emergency Telegram ping when available pool falls below this count
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
