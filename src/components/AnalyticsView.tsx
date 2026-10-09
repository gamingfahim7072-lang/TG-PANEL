import React from 'react';
import { TelegramBot, Order, DigitalProduct } from '../types';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Flame,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface AnalyticsViewProps {
  bot: TelegramBot;
  orders: Order[];
  products: DigitalProduct[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ bot, orders, products }) => {
  const botOrders = orders.filter((o) => o.botId === bot.id);
  const totalRevenue = botOrders.reduce((acc, curr) => acc + curr.amount, 0) + bot.totalRevenue;
  const starsOrders = botOrders.filter((o) => o.paymentMethod === 'stars').length;
  const tonOrders = botOrders.filter((o) => o.paymentMethod === 'ton').length;
  const usdtOrders = botOrders.filter((o) => o.paymentMethod === 'usdt').length;

  const totalKeysDelivered = products
    .filter((p) => p.botId === bot.id)
    .reduce((acc, curr) => acc + curr.soldKeysCount, 0);

  // Sparkline data
  const chartPoints = [240, 310, 450, 420, 680, 890, 1140, 980, 1420, 1680, 1950, 2400];
  const maxVal = Math.max(...chartPoints);
  const minVal = Math.min(...chartPoints);

  const pointsString = chartPoints
    .map((val, idx) => {
      const x = (idx / (chartPoints.length - 1)) * 500;
      const y = 140 - ((val - minVal) / (maxVal - minVal)) * 110;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white">{bot.name}</h2>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              ● Online & Polling
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Connected to Telegram Bot API · Automatic digital key pool & Telegram Stars checkout active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500">Bot Handle</span>
            <div className="text-sm font-bold text-cyan-400">@{bot.username}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Bot Revenue</span>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+18.4% vs last week</span>
          </div>
        </div>

        {/* Telegram Stars Volume */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Telegram Stars Invoicing</span>
            <span className="rounded-lg bg-amber-500/20 p-2 text-amber-400 border border-amber-500/30">
              <Flame className="h-4 w-4 fill-amber-400" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">
            ⭐ {(totalRevenue * 48).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-amber-400 font-medium">
            0% fee direct in-app checkout
          </div>
        </div>

        {/* Orders / Keys Delivered */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Keys Dispatched</span>
            <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
              <ShoppingCart className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">
            {totalKeysDelivered + botOrders.length}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% automated delivery</span>
          </div>
        </div>

        {/* Subscribers Audience */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Bot Subscribers</span>
            <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">
            {bot.subscribersCount.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Available for instant broadcast
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Volume Sparkline Area */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Sales & Volume Trajectory (30 Days)</h3>
              <p className="text-xs text-slate-400">Real-time revenue settled across Stars, TON, and USDT</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">+34% this month</span>
            </div>
          </div>

          <div className="h-48 w-full pt-4">
            <svg viewBox="0 0 500 160" className="h-full w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Area */}
              <polygon
                points={`0,150 ${pointsString} 500,150`}
                fill="url(#revenueGrad)"
              />
              {/* Line */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />
            </svg>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span>Sep 10</span>
            <span>Sep 18</span>
            <span>Sep 26</span>
            <span>Oct 04</span>
            <span>Today</span>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Payment Method Distribution</h3>
          <p className="text-xs text-slate-400">Share of transactions by payment gateway</p>

          <div className="space-y-3.5 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span>Telegram Stars</span>
                </span>
                <span className="text-white">58%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '58%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-sky-400 font-mono">TON Network (The Open Network)</span>
                <span className="text-white">28%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-400 font-mono">USDT TRC20 / Stripe</span>
                <span className="text-white">14%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '14%' }} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-950 p-3 text-xs text-slate-400 border border-slate-800">
            💡 <strong>Pro Tip:</strong> Enabling Telegram Stars increases bot checkout conversions by over 45% because users pay without leaving Telegram.
          </div>
        </div>
      </div>
    </div>
  );
};
