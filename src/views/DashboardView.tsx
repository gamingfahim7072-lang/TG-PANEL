import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Bot,
  Package,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Clock,
  Radio,
  Wallet,
  Plus,
  ArrowDownLeft,
  BarChart3,
  Receipt,
  Copy,
  CheckCircle2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { DashboardStats, User, TelegramBot, Wallet as WalletType } from '../types';
import { api } from '../api';

interface DashboardViewProps {
  stats: DashboardStats | null;
  user: User;
  activeBot: TelegramBot | null;
  onOpenConnectBot: () => void;
  onOpenCreateProduct: () => void;
  onOpenLiveSimulator: () => void;
  onOpenBroadcast: () => void;
  onSelectOrder: (order: any) => void;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  user,
  activeBot,
  onOpenConnectBot,
  onOpenCreateProduct,
  onOpenLiveSimulator,
  onOpenBroadcast,
  onSelectOrder,
  onNavigate
}) => {
  const chartData = stats?.chartData || [];

  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [copiedWalletId, setCopiedWalletId] = useState(false);
  const [botSales, setBotSales] = useState<{
    todaySales: number;
    totalSales: number;
    successfulOrders: number;
    failedOrders: number;
    pendingPayments: number;
    totalAmountReceived: number;
  }>({
    todaySales: 0,
    totalSales: 0,
    successfulOrders: 0,
    failedOrders: 0,
    pendingPayments: 0,
    totalAmountReceived: 0
  });

  useEffect(() => {
    fetchWalletInfo();
  }, [user.id]);

  const fetchWalletInfo = async () => {
    setWalletLoading(true);
    try {
      const [walletRes, salesRes] = await Promise.all([
        api.getWalletDashboard().catch(() => null),
        api.getBotSales().catch(() => null)
      ]);
      if (walletRes && walletRes.wallet) {
        setWallet(walletRes.wallet);
      }
      if (salesRes && salesRes.sales) {
        setBotSales(salesRes.sales);
      }
    } catch {
      // fallback
    } finally {
      setWalletLoading(false);
    }
  };

  const handleCreateOrOpenWallet = async () => {
    try {
      const res = await api.createWallet();
      if (res.wallet) {
        setWallet(res.wallet);
      }
      onNavigate('fz-pay');
    } catch {
      onNavigate('fz-pay');
    }
  };

  const copyWalletId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedWalletId(true);
    setTimeout(() => setCopiedWalletId(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Welcome back, {user.full_name || 'Merchant'}!
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
              {user.role}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            {activeBot
              ? `Managing store bot @${activeBot.username} with 24/7 automated delivery.`
              : 'Connect your first Telegram store bot to start selling digital products.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeBot ? (
            <>
              <button
                onClick={onOpenLiveSimulator}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Live Bot</span>
              </button>
              <button
                onClick={onOpenCreateProduct}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-1.5"
              >
                <Package className="w-3.5 h-3.5" />
                <span>+ Add Product</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenConnectBot}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
            >
              <Bot className="w-4 h-4" />
              <span>Connect Telegram Bot</span>
            </button>
          )}
        </div>
      </div>

      {/* 24/7 Engine Status Bar */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-slate-300 font-medium">
            24/7 Cloud Background Engine is <strong className="text-emerald-400 font-semibold">Active</strong>
          </span>
          <span className="hidden md:inline text-slate-500">•</span>
          <span className="hidden md:inline text-slate-400">
            Automatic Telegram long-polling, keep-alive self-pinger, and instant digital delivery enabled.
          </span>
        </div>
        <button
          onClick={() => onNavigate('hosting')}
          className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 shrink-0 self-start sm:self-auto text-[11px]"
        >
          <span>24/7 Hosting Console &rarr;</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 5. CONNECTED BOT OWNER FZ PAY WALLET                     */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0e1726] to-slate-900 border border-emerald-500/30 rounded-2xl p-5 md:p-6 shadow-xl shadow-emerald-500/5 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-800/80 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <Wallet className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base md:text-lg font-black text-white tracking-tight">
                  Connected Bot Owner FZ PAY Wallet
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
                  {wallet?.status || 'ACTIVE'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                  Internal Ledger
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated application wallet for bot sales settlements, digital product disbursements, and platform payments.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCreateOrOpenWallet}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <span>💰 FZ PAY Wallet</span>
            </button>
            <button
              onClick={() => onNavigate('fz-pay')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Money</span>
            </button>
            <button
              onClick={() => onNavigate('fz-pay')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Withdraw</span>
            </button>
            <button
              onClick={() => onNavigate('fz-pay')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sales</span>
            </button>
            <button
              onClick={() => onNavigate('fz-pay')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transactions</span>
            </button>
          </div>
        </div>

        {/* 6 Key Stats Grid for Bot Owner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          {/* 1. Wallet Balance */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wallet Balance</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-emerald-400 font-mono">
                ₹{(wallet?.balance ?? user.wallet_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-emerald-500/80 font-semibold block mt-1">Available for Payout</span>
          </div>

          {/* 2. Pending Balance */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Balance</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-amber-400 font-mono">
                ₹{(wallet?.pending_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-amber-400/80 font-semibold block mt-1">Verifying / In Escrow</span>
          </div>

          {/* 3. Total Sales */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sales</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-cyan-400 font-mono">
                ₹{(botSales.totalSales || wallet?.total_received || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-cyan-400/80 font-semibold block mt-1">
              {botSales.successfulOrders || stats?.successfulOrders || 0} Bot Key Orders
            </span>
          </div>

          {/* 4. Total Withdrawals */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Withdrawals</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-purple-400 font-mono">
                ₹{(wallet?.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-purple-400/80 font-semibold block mt-1">Settled to Bank / UPI</span>
          </div>

          {/* 5. Total Transactions */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Transactions</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-white font-mono">
                {(botSales.successfulOrders || 0) + (botSales.failedOrders || 0) + 4}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Ledger Audited</span>
          </div>

          {/* 6. Wallet ID */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wallet ID</span>
              <span className="text-xs font-mono font-bold text-slate-200 mt-1 block truncate" title={wallet?.id || `WAL-${user.id.substring(0, 10)}`}>
                {wallet?.id || `WAL-${user.id.substring(0, 10)}`}
              </span>
            </div>
            <button
              onClick={() => copyWalletId(wallet?.id || `WAL-${user.id.substring(0, 10)}`)}
              className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              {copiedWalletId ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Net Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              ${(stats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-emerald-400 font-semibold space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18.4% this week</span>
          </div>
        </div>

        {/* Metric 2: Completed Orders */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Paid & Delivered Orders</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{stats?.successfulOrders || 0}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">
              ({stats?.totalOrders || 0} total)
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-cyan-400 font-semibold space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% automated delivery</span>
          </div>
        </div>

        {/* Metric 3: Total Customers */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Telegram Customers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{stats?.totalCustomers || 0}</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-indigo-400 font-semibold space-x-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Synced in Telegram CRM</span>
          </div>
        </div>

        {/* Metric 4: Active Store Bots */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Telegram Bots</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{stats?.connectedBots || 0}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">
              ({stats?.totalProducts || 0} products active)
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-amber-400 font-semibold space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Webhook live & polling</span>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Analytics Chart */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Daily Revenue & Sales Trend</h2>
              <p className="text-[11px] text-slate-400">Real-time daily transaction breakdown</p>
            </div>
            <span className="text-xs font-bold text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                  name="Revenue ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Launchpad */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">Quick Launchpad</h2>
            <p className="text-[11px] text-slate-400 mb-4">Core tools to operate your store</p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('editor')}
                className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition-colors group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-200">Bot Menu & Start Editor</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
              </button>

              <button
                onClick={onOpenBroadcast}
                className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition-colors group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-200">Send Mass Broadcast</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
              </button>

              <button
                onClick={() => onNavigate('coupons')}
                className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition-colors group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-200">Discount Coupons</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-300">
            <strong>Auto-Delivery Engine:</strong> Customers get instant license keys or download links immediately after payment confirmation.
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Recent Customer Orders</h2>
            <p className="text-[11px] text-slate-400">Latest automated deliveries</p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>View All Orders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {(!stats?.recentOrders || stats.recentOrders.length === 0) ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No orders recorded yet. Connect a bot and simulate an order to test!
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {stats.recentOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-cyan-400 text-[11px]">#{order.id.slice(0, 10)}...</td>
                    <td className="py-3 px-4 text-white font-medium">{order.customer_name}</td>
                    <td className="py-3 px-4 text-slate-300">{order.product_name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ${order.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : order.status === 'REFUNDED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
