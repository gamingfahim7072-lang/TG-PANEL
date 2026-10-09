import React, { useState } from 'react';
import { TelegramBot } from '../types';
import {
  Settings,
  Flame,
  Wallet,
  Shield,
  Check,
  Save,
  Radio,
  Bell,
  Coins
} from 'lucide-react';

interface GatewaysSettingsProps {
  bot: TelegramBot;
  onUpdateBot: (bot: TelegramBot) => void;
}

export const GatewaysSettings: React.FC<GatewaysSettingsProps> = ({ bot, onUpdateBot }) => {
  const [tonWallet, setTonWallet] = useState('EQBvW8Z5huBkMJYdnfTQY5OgQn7kW8x-D92kF1...7y2');
  const [usdtWallet, setUsdtWallet] = useState('TRX98aJzL01kQ92mZ...902K');
  const [starsEnabled, setStarsEnabled] = useState(bot.features.starsPayment);
  const [saved, setSaved] = useState(false);
  const [stockAlertThreshold, setStockAlertThreshold] = useState(3);
  const [adminChatId, setAdminChatId] = useState('984120491');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            <span>Payment Gateways & Merchant Settlements</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure Telegram Stars payouts, non-custodial crypto receiving addresses, and automated inventory notifications
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 active:scale-95 transition"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{saved ? 'Settings Saved' : 'Save Merchant Gateways'}</span>
        </button>
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
              <span className="text-emerald-400 font-bold">0% (TeleSell Pro Plan)</span>
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
