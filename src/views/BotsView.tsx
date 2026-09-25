import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Sliders,
  Copy,
  Radio,
  Loader2,
  Activity,
  Check,
  Zap,
  Globe,
  X,
  ShieldCheck,
  Send,
  MessageSquare
} from 'lucide-react';
import { TelegramBot, TelegramBotStatusResponse } from '../types';
import { api } from '../api';

interface BotsViewProps {
  bots: TelegramBot[];
  selectedBotId: string;
  onSelectBotId: (id: string) => void;
  onOpenConnectBot: () => void;
  onOpenLiveSimulator: () => void;
  onNavigateToEditor: (botId: string) => void;
  onRefreshBots: () => void;
}

export const BotsView: React.FC<BotsViewProps> = ({
  bots,
  selectedBotId,
  onSelectBotId,
  onOpenConnectBot,
  onOpenLiveSimulator,
  onNavigateToEditor,
  onRefreshBots
}) => {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; msg: string; success: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Diagnostics Modal State
  const [diagnosticsBot, setDiagnosticsBot] = useState<TelegramBot | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<TelegramBotStatusResponse | null>(null);
  const [customWebhookUrl, setCustomWebhookUrl] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [diagnosticsMsg, setDiagnosticsMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleTestConnection = async (botId: string) => {
    setTestingId(botId);
    setTestResult(null);
    try {
      const res = await api.testBotConnection(botId);
      setTestResult({ id: botId, msg: res.message || 'Bot online and responsive!', success: true });
    } catch (err: any) {
      setTestResult({ id: botId, msg: err.message || 'Connection test failed', success: false });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to disconnect and delete this bot?')) return;
    setDeletingId(botId);
    try {
      await api.deleteBot(botId);
      onRefreshBots();
    } catch (err: any) {
      alert(err.message || 'Failed to delete bot');
    } finally {
      setDeletingId(null);
    }
  };

  const copyWebhookUrl = (botId: string) => {
    const url = `${window.location.origin}/api/telegram/webhook/${botId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(botId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenDiagnostics = async (bot: TelegramBot) => {
    setDiagnosticsBot(bot);
    setDiagnosticsLoading(true);
    setDiagnosticsData(null);
    setDiagnosticsMsg(null);
    try {
      const res = await api.getBotTelegramStatus(bot.id);
      setDiagnosticsData(res);
      if (res.webhookInfo?.url) {
        setCustomWebhookUrl(res.webhookInfo.url);
      } else {
        setCustomWebhookUrl(`${window.location.origin}/api/telegram/webhook/${bot.id}`);
      }
    } catch (err: any) {
      setDiagnosticsMsg({ text: err.message || 'Failed to fetch Telegram status', isError: true });
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleRestartPolling = async () => {
    if (!diagnosticsBot) return;
    setActionLoading(true);
    setDiagnosticsMsg(null);
    try {
      await api.startBotPolling(diagnosticsBot.id);
      const res = await api.getBotTelegramStatus(diagnosticsBot.id);
      setDiagnosticsData(res);
      setDiagnosticsMsg({ text: '⚡ Telegram Long-Polling engine restarted successfully!', isError: false });
    } catch (err: any) {
      setDiagnosticsMsg({ text: err.message || 'Failed to restart polling', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetWebhook = async () => {
    if (!diagnosticsBot || !customWebhookUrl) return;
    setActionLoading(true);
    setDiagnosticsMsg(null);
    try {
      await api.setBotWebhook(diagnosticsBot.id, customWebhookUrl);
      const res = await api.getBotTelegramStatus(diagnosticsBot.id);
      setDiagnosticsData(res);
      setDiagnosticsMsg({ text: `🌐 Webhook registered with Telegram!`, isError: false });
    } catch (err: any) {
      setDiagnosticsMsg({ text: err.message || 'Failed to set webhook', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWebhook = async () => {
    if (!diagnosticsBot) return;
    setActionLoading(true);
    setDiagnosticsMsg(null);
    try {
      await api.deleteBotWebhook(diagnosticsBot.id);
      const res = await api.getBotTelegramStatus(diagnosticsBot.id);
      setDiagnosticsData(res);
      setDiagnosticsMsg({ text: 'Webhook removed. Resumed 24/7 Long Polling!', isError: false });
    } catch (err: any) {
      setDiagnosticsMsg({ text: err.message || 'Failed to delete webhook', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Connected Telegram Store Bots</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Real Telegram bots running 24/7 with instant automated delivery, UPI payments, and interactive commands.
          </p>
        </div>
        <button
          onClick={onOpenConnectBot}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Telegram Bot</span>
        </button>
      </div>

      {/* Bots Grid */}
      {bots.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Telegram Bots Connected</h3>
            <p className="text-xs text-slate-400 mt-1">
              Connect your first bot in less than 30 seconds using your @BotFather token.
            </p>
          </div>
          <button
            onClick={onOpenConnectBot}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Telegram Bot</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map(bot => {
            const isSelected = bot.id === selectedBotId;
            const telegramLink = `https://t.me/${bot.username.replace('@', '')}`;
            return (
              <div
                key={bot.id}
                className={`bg-[#0f172a] border rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                  isSelected ? 'border-cyan-500 ring-1 ring-cyan-500 shadow-lg shadow-cyan-500/5' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Status Pill & Identity */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                        <span>{bot.first_name}</span>
                      </h3>
                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 font-mono hover:underline inline-flex items-center space-x-1"
                        title="Open bot profile on Telegram"
                      >
                        <span>@{bot.username}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ONLINE</span>
                  </span>
                </div>

                {/* Direct Telegram Action Card */}
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30 border border-blue-500/30 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/30 text-blue-300 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        Chat in Real Telegram
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Tap to start /start on Telegram
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </a>

                {/* Details */}
                <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telegram Bot ID:</span>
                    <span className="font-mono text-slate-300">{bot.bot_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Engine Mode:</span>
                    <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      <span>24/7 Polling Active</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Connected Since:</span>
                    <span>{new Date(bot.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Test Feedback banner */}
                {testResult && testResult.id === bot.id && (
                  <div
                    className={`mt-3 p-2.5 rounded-xl text-xs flex items-center space-x-1.5 ${
                      testResult.success
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{testResult.msg}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onSelectBotId(bot.id);
                        onNavigateToEditor(bot.id);
                      }}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Configure Bot</span>
                    </button>

                    <button
                      onClick={() => handleOpenDiagnostics(bot)}
                      className="py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Live Status</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleTestConnection(bot.id)}
                      disabled={testingId === bot.id}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${testingId === bot.id ? 'animate-spin' : ''}`} />
                      <span>Ping getMe</span>
                    </button>

                    <button
                      onClick={() => copyWebhookUrl(bot.id)}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === bot.id ? 'Copied!' : 'Copy Webhook'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteBot(bot.id)}
                      disabled={deletingId === bot.id}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Telegram Diagnostics & Live Controls Modal */}
      {diagnosticsBot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Telegram Engine Status</span>
                    <span className="text-xs font-mono text-cyan-400">@{diagnosticsBot.username}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time verification, 24/7 background polling, and webhook routing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiagnosticsBot(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {diagnosticsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <p className="text-xs text-slate-400">Querying Telegram Bot API & Poller Engine...</p>
                </div>
              ) : (
                <>
                  {/* Notification Feedback */}
                  {diagnosticsMsg && (
                    <div
                      className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 font-medium ${
                        diagnosticsMsg.isError
                          ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {diagnosticsMsg.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      <span>{diagnosticsMsg.text}</span>
                    </div>
                  )}

                  {/* 1. Live Telegram Bot Status Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Telegram Identity</span>
                      </div>
                      <div className="text-sm font-bold text-white">
                        {diagnosticsData?.telegramMe?.first_name || diagnosticsBot.first_name}
                      </div>
                      <div className="text-xs font-mono text-cyan-400">
                        @{diagnosticsData?.telegramMe?.username || diagnosticsBot.username}
                      </div>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
                        <span>Bot ID:</span>
                        <span className="font-mono text-slate-300">{diagnosticsBot.bot_id}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Background Poller</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${diagnosticsData?.polling?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        <span className="text-sm font-bold text-white">
                          {diagnosticsData?.polling?.isRunning ? 'Active & Receiving' : 'Idle / Webhook Mode'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Updates processed: <span className="font-bold text-cyan-400">{diagnosticsData?.polling?.updateCount ?? 0}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
                        <span>Last Poll:</span>
                        <span>{diagnosticsData?.polling?.lastPollAt ? new Date(diagnosticsData.polling.lastPollAt).toLocaleTimeString() : 'Just now'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Direct Telegram Launch Action */}
                  <div className="bg-gradient-to-r from-blue-600/10 via-cyan-600/10 to-emerald-600/10 border border-cyan-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span>Test Directly in Telegram App</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Open @{diagnosticsBot.username} and send <code className="text-cyan-300 font-mono">/start</code> to verify menus, catalogs, and payments.
                      </p>
                    </div>
                    <a
                      href={`https://t.me/${diagnosticsBot.username.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center space-x-1.5 transition-colors shrink-0 shadow-md shadow-cyan-500/20"
                    >
                      <span>Open in Telegram</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* 3. Engine Mode & Webhook Switcher */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span>Webhook vs Long Polling</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Current: {diagnosticsData?.mode || 'LONG_POLLING'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      By default, TeleSell operates via high-speed <strong>Long Polling</strong> so your bot works anywhere without requiring a public HTTPS domain. If you have a custom HTTPS domain or proxy, you can bind a webhook below.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="text"
                        value={customWebhookUrl}
                        onChange={e => setCustomWebhookUrl(e.target.value)}
                        placeholder="https://yourdomain.com/api/telegram/webhook/..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSetWebhook}
                          disabled={actionLoading || !customWebhookUrl}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          Set Webhook
                        </button>
                        <button
                          onClick={handleDeleteWebhook}
                          disabled={actionLoading}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          Reset to Polling
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4. Troubleshooting & Bot Testing Checklist */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
                    <div className="font-bold text-white text-[11px] uppercase tracking-wider text-slate-400">
                      Telegram Bot Interaction Checklist
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-400">
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Send <code className="text-cyan-300">/start</code> to view welcome message, banner photo, and interactive buttons.</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Send <code className="text-cyan-300">/products</code> to view product catalog, stock counts, and prices.</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Send <code className="text-cyan-300">/orders</code> or <code className="text-cyan-300">/balance</code> to view customer wallet and purchase history.</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>UPI Payment Flow: Generate QR code, submit 12-digit UTR, and receive instant digital delivery.</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <button
                onClick={handleRestartPolling}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Restart Polling Worker</span>
              </button>

              <button
                onClick={() => setDiagnosticsBot(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

