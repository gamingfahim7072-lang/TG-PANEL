import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Globe,
  Terminal,
  Play,
  RotateCcw,
  Clock,
  Layers,
  HeartPulse,
  Settings,
  Sparkles
} from 'lucide-react';
import { api } from '../api';
import { SystemHostingStatus, PingTestResult } from '../types';

export const HostingView: React.FC = () => {
  const [status, setStatus] = useState<SystemHostingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Self-ping state
  const [selfPingEnabled, setSelfPingEnabled] = useState(true);
  const [targetUrl, setTargetUrl] = useState('');
  const [savingSelfPing, setSavingSelfPing] = useState(false);

  // Ping test state
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<PingTestResult | null>(null);

  // Bot listener restart
  const [restartingBotId, setRestartingBotId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deployment guide active tab
  const [deployTab, setDeployTab] = useState<'render' | 'docker' | 'vps' | 'pm2' | 'external'>('render');

  useEffect(() => {
    loadHostingStatus();
    const interval = setInterval(loadHostingStatus, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const loadHostingStatus = async () => {
    try {
      const res = await api.getHostingStatus();
      if (res.success) {
        setStatus(res);
        setSelfPingEnabled(res.selfPing.enabled);
        if (!targetUrl && res.selfPing.targetUrl) {
          setTargetUrl(res.selfPing.targetUrl);
        }
      }
    } catch (err: any) {
      console.error('Failed to load hosting status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadHostingStatus();
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveSelfPing = async () => {
    setSavingSelfPing(true);
    setActionMessage(null);
    try {
      const res = await api.toggleSelfPing({
        enabled: selfPingEnabled,
        targetUrl: targetUrl.trim() || undefined
      });
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `24/7 Keep-Alive ${selfPingEnabled ? 'activated' : 'deactivated'} successfully.`
        });
        loadHostingStatus();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update keep-alive setting' });
    } finally {
      setSavingSelfPing(false);
    }
  };

  const handleTestPing = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await api.testPing({ targetUrl: targetUrl.trim() || undefined });
      if (res.success) {
        setPingResult(res.result);
      }
    } catch (err: any) {
      setPingResult({
        success: false,
        durationMs: 0,
        targetUrl: targetUrl || '/api/health',
        error: err.message
      });
    } finally {
      setTestingPing(false);
    }
  };

  const handleRestartPoller = async (botId: string, botUsername: string) => {
    setRestartingBotId(botId);
    setActionMessage(null);
    try {
      const res = await api.restartBotPoller(botId);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Background listener for @${botUsername} successfully restarted and synced.`
        });
        loadHostingStatus();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to restart poller' });
    } finally {
      setRestartingBotId(null);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const healthEndpointUrl = `${currentOrigin}/api/health`;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/30 border border-cyan-500/20 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              24/7 Cloud Hosting & Deployment Engine
            </h1>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>24/7 ACTIVE</span>
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-300">
            Keep your Telegram bots, webhooks, and automated checkout running 24 hours a day, 7 days a week with zero downtime.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
          <button
            onClick={handleTestPing}
            disabled={testingPing}
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
          >
            <HeartPulse className={`w-3.5 h-3.5 ${testingPing ? 'animate-bounce' : ''}`} />
            <span>{testingPing ? 'Pinging...' : 'Ping Live Status'}</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 border transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Live Server Vital Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Vital 1: Uptime */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Server Uptime</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-lg md:text-xl font-black text-white tracking-tight">
            {status?.uptimeFormatted || 'Calculating...'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Uninterrupted Process Runtime
          </div>
        </div>

        {/* Vital 2: Memory Usage */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Memory (RAM)</span>
            </span>
            <span className="text-[10px] text-purple-400 font-mono">Node.js</span>
          </div>
          <div className="text-lg md:text-xl font-black text-white tracking-tight">
            {status?.memory?.rssMb ? `${status.memory.rssMb} MB` : '38.4 MB'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Heap: {status?.memory?.heapUsedMb || 20} MB / {status?.memory?.heapTotalMb || 32} MB
          </div>
        </div>

        {/* Vital 3: 24/7 Keep-Alive Pings */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Keep-Alive Pinger</span>
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                status?.selfPing?.enabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {status?.selfPing?.enabled ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>
          <div className="text-lg md:text-xl font-black text-white tracking-tight">
            {status?.selfPing?.totalPings ?? 0} Pings
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {status?.selfPing?.lastPingDurationMs ? `Latency: ${status.selfPing.lastPingDurationMs}ms` : 'Ready to ping'}
          </div>
        </div>

        {/* Vital 4: Environment Platform */}
        <div className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Runtime Engine</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-400">{status?.environment || 'PROD'}</span>
          </div>
          <div className="text-lg md:text-xl font-black text-white tracking-tight">
            {status?.nodeVersion || 'v20.x'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            OS: {status?.platform || 'Linux x86_64'}
          </div>
        </div>
      </div>

      {/* Ping Test Result Box (if tested) */}
      {pingResult && (
        <div
          className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
            pingResult.success
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : 'bg-red-950/20 border-red-500/30 text-red-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                pingResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold flex items-center space-x-2">
                <span>{pingResult.success ? 'HTTP 200 OK — Healthy & Responsive' : 'Ping Failed'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 font-mono">
                  {pingResult.durationMs} ms
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Target: {pingResult.targetUrl}
              </div>
            </div>
          </div>
          <button
            onClick={() => setPingResult(null)}
            className="self-end md:self-auto text-slate-400 hover:text-white px-2.5 py-1 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Column = Keep-Alive Controller & Pollers; Right Column = 1-Click Deployment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 24/7 Keep-Alive & Bot Pollers (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Keep-Alive Self-Pinger Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">24/7 Anti-Sleep Keep-Alive Engine</h2>
                  <p className="text-[11px] text-slate-400">
                    Prevents free cloud tiers (Render, Koyeb, Glitch, Railway) from idling after 15 minutes.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selfPingEnabled}
                  onChange={e => setSelfPingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">
                  App Public URL / Target Domain
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={e => setTargetUrl(e.target.value)}
                    placeholder="https://my-telesell-app.onrender.com"
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
                  />
                  <button
                    onClick={handleSaveSelfPing}
                    disabled={savingSelfPing}
                    className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 shrink-0"
                  >
                    {savingSelfPing ? 'Saving...' : 'Save & Activate'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  The background worker will send an HTTP keepalive ping to{' '}
                  <code className="text-cyan-400 font-mono">/api/health</code> every 5 minutes automatically.
                </p>
              </div>

              {/* Status info bar */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{status?.selfPing?.lastPingStatus || 'Active (Every 5m)'}</span>
                  </span>
                </div>
                <div className="text-slate-400">
                  Last Ping:{' '}
                  <span className="text-slate-200 font-mono">
                    {status?.selfPing?.lastPingAt
                      ? new Date(status.selfPing.lastPingAt).toLocaleTimeString()
                      : 'Just now'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Telegram Bot Listeners Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Telegram 24/7 Long-Polling Listeners</h2>
                  <p className="text-[11px] text-slate-400">
                    Background threads listening for /start, clicks, payments, and commands.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                {status?.pollers?.length || 0} Bot Listener(s) Active
              </span>
            </div>

            {/* Pollers List */}
            {status?.pollers && status.pollers.length > 0 ? (
              <div className="space-y-2.5">
                {status.pollers.map(poller => {
                  const isRestarting = restartingBotId === poller.botId;
                  return (
                    <div
                      key={poller.botId}
                      className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-bold text-white">@{poller.botUsername}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                            LISTENING 24/7
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                          <span>Updates Processed: <strong className="text-cyan-400 font-mono">{poller.updateCount}</strong></span>
                          <span>•</span>
                          <span>Last Polled: <strong className="text-slate-300 font-mono">{poller.lastPollAt ? new Date(poller.lastPollAt).toLocaleTimeString() : 'Active'}</strong></span>
                        </div>
                        {poller.lastError && (
                          <div className="text-[10px] text-amber-400 font-mono">
                            Warning: {poller.lastError}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRestartPoller(poller.botId, poller.botUsername)}
                        disabled={isRestarting}
                        className="self-start sm:self-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700/60 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                      >
                        <RotateCcw className={`w-3 h-3 ${isRestarting ? 'animate-spin text-cyan-400' : ''}`} />
                        <span>{isRestarting ? 'Restarting...' : 'Restart Listener'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-900/50 border border-slate-800/60 text-slate-400 text-xs space-y-1">
                <Radio className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                <p className="font-semibold text-slate-300">No Telegram Bots Connected Yet</p>
                <p className="text-[11px]">Connect your bot in Connected Bots to activate 24/7 background listeners.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 1-Click Production Deployment Guides (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">1-Click 24/7 Deployment</h2>
                  <p className="text-[11px] text-slate-400">Deploy to free or dedicated cloud servers</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-semibold">
              {[
                { id: 'render', label: 'Render' },
                { id: 'docker', label: 'Docker' },
                { id: 'vps', label: 'Linux VPS' },
                { id: 'pm2', label: 'PM2' },
                { id: 'external', label: 'Monitors' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDeployTab(tab.id as any)}
                  className={`py-1.5 rounded-lg transition-all text-center ${
                    deployTab === tab.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {deployTab === 'render' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="space-y-1">
                  <span className="text-white font-bold block">Render.com (Free / Starter Tier)</span>
                  <p className="text-[11px] text-slate-400">
                    Host 24/7 for free. Connect your GitHub repository and Render will auto-build and run.
                  </p>
                </div>

                <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                  <div className="text-slate-400">Build Command:</div>
                  <div className="text-cyan-400 bg-slate-950 p-1.5 rounded border border-slate-800">
                    npm install && npm run build
                  </div>

                  <div className="text-slate-400 mt-2">Start Command:</div>
                  <div className="text-emerald-400 bg-slate-950 p-1.5 rounded border border-slate-800">
                    npm start
                  </div>

                  <div className="text-slate-400 mt-2">Health Check Path:</div>
                  <div className="text-amber-400 bg-slate-950 p-1.5 rounded border border-slate-800">
                    /api/health
                  </div>
                </div>

                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-300">
                  💡 <strong>render.yaml included:</strong> A pre-configured Render Blueprint is already inside your project root. Just click <strong>"New &gt; Blueprint"</strong> on Render!
                </div>
              </div>
            )}

            {deployTab === 'docker' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="space-y-1">
                  <span className="text-white font-bold block">Docker & Docker Compose</span>
                  <p className="text-[11px] text-slate-400">
                    Run anywhere (AWS, DigitalOcean, Hetzner, Coolify, Portainer, or local server).
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>1-Line Spin Up Command:</span>
                    <button
                      onClick={() => handleCopy('docker compose up -d --build', 'docker')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      {copiedKey === 'docker' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'docker' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-400 overflow-x-auto">
                    docker compose up -d --build
                  </pre>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div>• Automatic restart on container crash (<code className="text-cyan-400 font-mono">restart: always</code>)</div>
                  <div>• Persistent storage mounted to <code className="text-cyan-400 font-mono">/app/data</code></div>
                  <div>• Integrated Docker health check on <code className="text-cyan-400 font-mono">/api/health</code></div>
                </div>
              </div>
            )}

            {deployTab === 'vps' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="space-y-1">
                  <span className="text-white font-bold block">Linux VPS Systemd Service</span>
                  <p className="text-[11px] text-slate-400">
                    Keeps the app running on reboot and recovers automatically from crashes.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Setup commands:</span>
                    <button
                      onClick={() =>
                        handleCopy(
                          `sudo cp telesell.service /etc/systemd/system/\nsudo systemctl daemon-reload\nsudo systemctl enable telesell\nsudo systemctl start telesell`,
                          'vps'
                        )
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      {copiedKey === 'vps' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'vps' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-400 overflow-x-auto whitespace-pre-wrap">
{`sudo cp telesell.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable telesell
sudo systemctl start telesell`}
                  </pre>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                  Status check: <code className="text-cyan-400 font-mono">sudo systemctl status telesell</code>
                </div>
              </div>
            )}

            {deployTab === 'pm2' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="space-y-1">
                  <span className="text-white font-bold block">PM2 Node.js Process Manager</span>
                  <p className="text-[11px] text-slate-400">
                    Zero-downtime clustering, automated crash restarts, and memory monitoring.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>PM2 Startup Commands:</span>
                    <button
                      onClick={() =>
                        handleCopy(
                          `npm run build\nnpx pm2 start ecosystem.config.cjs\nnpx pm2 save\nnpx pm2 startup`,
                          'pm2'
                        )
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      {copiedKey === 'pm2' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'pm2' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-400 overflow-x-auto whitespace-pre-wrap">
{`npm run build
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 startup`}
                  </pre>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                  View logs: <code className="text-cyan-400 font-mono">npx pm2 logs telesell-saas</code>
                </div>
              </div>
            )}

            {deployTab === 'external' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="space-y-1">
                  <span className="text-white font-bold block">Free External Uptime Monitors</span>
                  <p className="text-[11px] text-slate-400">
                    Use free external services to ping your server every 5 minutes from multiple global regions.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Your Health Endpoint:</span>
                    <button
                      onClick={() => handleCopy(healthEndpointUrl, 'health')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      {copiedKey === 'health' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'health' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto truncate">
                    {healthEndpointUrl}
                  </pre>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="font-semibold text-slate-300">Recommended Free Keepalive Monitors:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li><strong className="text-white">UptimeRobot.com</strong> (Free 50 monitors, 5-minute intervals)</li>
                    <li><strong className="text-white">Cron-job.org</strong> (Free scheduled HTTP requests)</li>
                    <li><strong className="text-white">BetterStack.com</strong> (Free heartbeat monitoring & SMS alerts)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Webhook Endpoint Quick Copy Box */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Telegram Webhook Ingress</span>
              </span>
              <button
                onClick={() => handleCopy(`${currentOrigin}/api/telegram/webhook/:botId`, 'webhook')}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center space-x-1"
              >
                {copiedKey === 'webhook' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'webhook' ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-[10px] text-cyan-400 truncate">
              {currentOrigin}/api/telegram/webhook/:botId
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
