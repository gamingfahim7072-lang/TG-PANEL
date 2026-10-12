import React from 'react';
import { TelegramBot, Order, DigitalProduct } from '../types';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  Flame,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Wallet
} from 'lucide-react';

interface AnalyticsViewProps {
  bot: TelegramBot;
  orders: Order[];
  products: DigitalProduct[];
  onNavigateToUpi?: () => void;
  onNavigateToSimulator?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  bot,
  orders,
  products,
  onNavigateToUpi,
  onNavigateToSimulator,
}) => {
  const botOrders = orders.filter((o) => o.botId === bot.id);
  const upiOrders = botOrders.filter((o) => o.paymentMethod === 'upi_dynamic_qr');
  const upiRevenue = upiOrders.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = bot.totalRevenue + upiRevenue;

  const totalKeysDelivered = products
    .filter((p) => p.botId === bot.id)
    .reduce((acc, curr) => acc + curr.soldKeysCount, 0);

  // Sparkline data
  const chartPoints = [2400, 3100, 4500, 4200, 6800, 8900, 11400, 9800, 14200, 16800, 19500, 26240];
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
            Connected to Telegram Bot API · Dynamic UPI QR Generation ({bot.paymentAccount?.mode === 'MODE_A_PROVIDER' ? 'Provider Mode A' : 'Mode B Manual'}) · VPA: {bot.paymentAccount?.upiId || 'merchant@upi'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToSimulator && (
            <button
              onClick={onNavigateToSimulator}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 active:scale-95 transition"
            >
              <QrCode className="h-4 w-4" />
              <span>Test UPI Checkout</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue INR */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Bot Revenue</span>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <IndianRupee className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">
            ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+24.8% vs last week</span>
          </div>
        </div>

        {/* Dynamic UPI Volume */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300">UPI Dynamic QR Volume</span>
            <span className="rounded-lg bg-cyan-500/20 p-2 text-cyan-400 border border-cyan-500/30">
              <QrCode className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">
            ₹{(totalRevenue * 0.78).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-cyan-400 font-medium flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>78% via GPay, PhonePe, Paytm</span>
          </div>
        </div>

        {/* Keys Delivered */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Keys Dispatched</span>
            <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
              <ShoppingCart className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">
            {totalKeysDelivered + botOrders.length}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>100% automated delivery</span>
          </div>
        </div>

        {/* Subscribers Audience */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Bot Subscribers</span>
            <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400 border border-purple-500/20">
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
              <h3 className="text-sm font-bold text-white">UPI & Multi-Currency Sales Trajectory (30 Days)</h3>
              <p className="text-xs text-slate-400">Real-time revenue settled across Dynamic UPI QR and Stars</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">+42% with Dynamic UPI</span>
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
              <polygon
                points={`0,150 ${pointsString} 500,150`}
                fill="url(#revenueGrad)"
              />
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
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <QrCode className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Dynamic UPI QR (Razorpay/Bank)</span>
                </span>
                <span className="text-white">78%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span>Telegram Stars</span>
                </span>
                <span className="text-white">16%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '16%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-400 font-mono">TON & USDT Crypto</span>
                <span className="text-white">6%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '6%' }} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-950 p-3 text-xs text-slate-400 border border-slate-800">
            ⚡ <strong>Dynamic UPI QR Advantage:</strong> Exact order-amount-encoded QRs eliminate customer entry errors and support instant banking webhooks.
          </div>
        </div>
      </div>
    </div>
  );
};
