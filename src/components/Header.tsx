import React from 'react';
import { TelegramBot } from '../types';
import { Bot, ChevronDown, Plus, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

interface HeaderProps {
  bots: TelegramBot[];
  selectedBot: TelegramBot;
  onSelectBot: (bot: TelegramBot) => void;
  onNewBotClick: () => void;
  onOpenSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  bots,
  selectedBot,
  onSelectBot,
  onNewBotClick,
  onOpenSimulator,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 backdrop-blur">
      <div className="flex items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-lg shadow-cyan-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">TeleSell</span>
              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                PRO SAAS
              </span>
            </div>
            <p className="text-xs text-slate-400">Telegram Commerce Engine</p>
          </div>
        </div>

        {/* Bot Switcher Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-800/80 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none"
          >
            <div className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
            <span className="max-w-[140px] truncate font-semibold text-slate-100">{selectedBot.name}</span>
            <span className="text-xs text-slate-400">@{selectedBot.username}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl z-50">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Your Telegram Bots ({bots.length})
              </div>
              <div className="mt-1 space-y-1">
                {bots.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBot(b);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      b.id === selectedBot.id
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-xs text-slate-400">@{b.username}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>${b.totalRevenue.toLocaleString()}</div>
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
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Webhook Active & SSL Verified</span>
        </div>

        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition hover:brightness-110 active:scale-95"
        >
          <Zap className="h-4 w-4 fill-white" />
          <span>Live Bot Simulator</span>
        </button>

        <a
          href={`https://t.me/${selectedBot.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <span>Open in Telegram</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
};
