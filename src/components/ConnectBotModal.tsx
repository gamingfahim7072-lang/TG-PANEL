import React, { useState } from 'react';
import { X, Bot, Key, CheckCircle, AlertCircle, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { api } from '../api';
import { TelegramBot } from '../types';

interface ConnectBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBotConnected: (bot: TelegramBot) => void;
}

export const ConnectBotModal: React.FC<ConnectBotModalProps> = ({
  isOpen,
  onClose,
  onBotConnected
}) => {
  const [token, setToken] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [supportUsername, setSupportUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please provide a valid Telegram bot token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.connectBot({
        token: token.trim(),
        display_name: displayName.trim() || undefined,
        support_username: supportUsername.trim() || undefined
      });

      if (res.bot) {
        setSuccessInfo(res.bot);
        setTimeout(() => {
          onBotConnected(res.bot);
          onClose();
          setSuccessInfo(null);
          setToken('');
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Telegram Bot.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoToken = () => {
    setToken(`demo_${Math.floor(Math.random() * 900000000 + 100000000)}:AAEjSampleProdKey_${Math.random().toString(36).substr(2, 8)}`);
    setDisplayName('CyberDigital Store Bot');
    setSupportUsername('cyber_support');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Connect Telegram Bot</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConnect} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Bot <strong>@{successInfo.username}</strong> verified and connected successfully!
              </span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Telegram Bot Token <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleUseDemoToken}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
              >
                <Sparkles className="w-3 h-3" />
                <span>Fill Demo Token</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="1234567890:ABCdefGhIJKlmnoPQRstuvwxYZ"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1">
              <span>Get your token by messaging</span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline inline-flex items-center space-x-0.5"
              >
                <span>@BotFather</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span>on Telegram.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Store Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Digital Vault Store"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Support Username (Optional)
              </label>
              <input
                type="text"
                value={supportUsername}
                onChange={e => setSupportUsername(e.target.value)}
                placeholder="e.g. my_support_handle"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Security Guarantee:</div>
            <div>• All bot tokens are encrypted via server-side AES-256-GCM.</div>
            <div>• Tokens are never exposed in HTML, client JavaScript, or browser storage.</div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating getMe...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <span>Verify & Connect</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
