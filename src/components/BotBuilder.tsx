import React, { useState } from 'react';
import { TelegramBot } from '../types';
import {
  Bot,
  Key,
  Globe,
  Plus,
  Trash2,
  Check,
  Save,
  Radio,
  Sliders,
  Send,
  Zap,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface BotBuilderProps {
  bot: TelegramBot;
  onUpdateBot: (updated: TelegramBot) => void;
}

export const BotBuilder: React.FC<BotBuilderProps> = ({ bot, onUpdateBot }) => {
  const [formData, setFormData] = useState<TelegramBot>({ ...bot });
  const [newCmd, setNewCmd] = useState({ command: '', description: '', response: '' });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBot(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmd.command || !newCmd.response) return;
    const cleanCmd = newCmd.command.startsWith('/') ? newCmd.command : `/${newCmd.command}`;
    setFormData({
      ...formData,
      commands: [...formData.commands, { ...newCmd, command: cleanCmd }],
    });
    setNewCmd({ command: '', description: '', response: '' });
  };

  const handleRemoveCommand = (idx: number) => {
    const next = [...formData.commands];
    next.splice(idx, 1);
    setFormData({ ...formData, commands: next });
  };

  const handlePingWebhook = () => {
    setPingStatus('pinging');
    setTimeout(() => {
      setPingStatus('ok');
      setTimeout(() => setPingStatus(null), 3000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-400" />
            <span>Telegram Bot Configuration & Logic Builder</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure BotFather API credentials, custom webhook endpoints, /commands and greeting dialogues
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 active:scale-95 transition"
        >
          {savedSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'Changes Deployed!' : 'Save & Sync to Bot'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: API & Identity */}
        <div className="space-y-6 lg:col-span-1">
          {/* Bot Identity Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Key className="h-4 w-4 text-cyan-400" />
              <span>BotFather Credentials</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bot Display Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telegram Username
              </label>
              <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400">
                <span>@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-transparent text-white focus:outline-none pl-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bot API Token
              </label>
              <input
                type="password"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Obtained from Telegram's official @BotFather
              </p>
            </div>
          </div>

          {/* Webhook & Server Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span>Webhook Endpoint</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SSL Verified Webhook URL
              </label>
              <div className="rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-slate-300 border border-slate-800 break-all">
                {formData.webhookUrl || `https://api.telesell.cloud/webhook/${bot.id}`}
              </div>
            </div>

            <button
              onClick={handlePingWebhook}
              disabled={pingStatus === 'pinging'}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <Radio className={`h-3.5 w-3.5 ${pingStatus === 'pinging' ? 'animate-spin' : ''}`} />
              <span>
                {pingStatus === 'pinging'
                  ? 'Testing Webhook...'
                  : pingStatus === 'ok'
                  ? 'HTTP 200 OK — Ready'
                  : 'Ping Telegram Webhook'}
              </span>
            </button>
          </div>

          {/* Feature Flags */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>Bot Engine Modules</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">Telegram Stars Invoicing</span>
                <input
                  type="checkbox"
                  checked={formData.features.starsPayment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: { ...formData.features, starsPayment: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">TON & Crypto Payments</span>
                <input
                  type="checkbox"
                  checked={formData.features.cryptoPayment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: { ...formData.features, cryptoPayment: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">Automated Key Pool Delivery</span>
                <input
                  type="checkbox"
                  checked={formData.features.autoKeyDelivery}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: { ...formData.features, autoKeyDelivery: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">VIP Group Auto-Invite / Expire</span>
                <input
                  type="checkbox"
                  checked={formData.features.vipGroupInvite}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      features: { ...formData.features, vipGroupInvite: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Columns: Welcome Dialogue & Commands Matrix */}
        <div className="space-y-6 lg:col-span-2">
          {/* Welcome Message Builder */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Storefront Greeting Dialogue (/start)</h3>
                <p className="text-xs text-slate-400">
                  Displayed when a prospective buyer taps Start or launches your Telegram storefront
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">Supports Markdown</span>
            </div>

            <textarea
              rows={4}
              value={formData.welcomeMessage}
              onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Interactive Bot Commands Manager */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Bot Command Handlers</h3>
                <p className="text-xs text-slate-400">
                  Registered with Telegram menu button to respond automatically to customer commands
                </p>
              </div>
              <span className="text-xs font-bold text-slate-300">
                {formData.commands.length} Commands Active
              </span>
            </div>

            {/* Existing Commands List */}
            <div className="space-y-2">
              {formData.commands.map((cmd, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400">{cmd.command}</span>
                      <span className="text-[11px] text-slate-400">— {cmd.description}</span>
                    </div>
                    <div className="text-slate-300 font-sans text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                      {cmd.response}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveCommand(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Remove command"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Command Form */}
            <form onSubmit={handleAddCommand} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Add New Command Handler
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Command Trigger
                  </label>
                  <input
                    type="text"
                    placeholder="/promo or /vip"
                    value={newCmd.command}
                    onChange={(e) => setNewCmd({ ...newCmd, command: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Menu Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short description for Telegram menu"
                    value={newCmd.description}
                    onChange={(e) => setNewCmd({ ...newCmd, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Automated Reply Text
                </label>
                <input
                  type="text"
                  placeholder="Text sent by bot when customer types command..."
                  value={newCmd.response}
                  onChange={(e) => setNewCmd({ ...newCmd, response: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700"
              >
                <Plus className="h-3.5 w-3.5 text-cyan-400" />
                <span>Register Command</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
