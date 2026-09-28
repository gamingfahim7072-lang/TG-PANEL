import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Download,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  Shield,
  QrCode,
  ExternalLink,
  X,
  ChevronRight,
  Filter,
  Search,
  Crown,
  ShoppingBag,
  Key,
  Smartphone,
  Building,
  UserCheck,
  TrendingUp,
  CreditCard,
  Sliders,
  DollarSign,
  Lock,
  Loader2
} from 'lucide-react';
import { User, Wallet as WalletType, WalletTransaction, Order, Subscription } from '../types';
import { api } from '../api';

interface FzPayViewProps {
  user: User;
  onOpenCheckout?: () => void;
  onNavigate?: (view: string) => void;
}

export const FzPayView: React.FC<FzPayViewProps> = ({ user, onOpenCheckout, onNavigate }) => {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [botSales, setBotSales] = useState<{
    todaySales: number;
    totalSales: number;
    successfulOrders: number;
    failedOrders: number;
    pendingPayments: number;
    totalAmountReceived: number;
    orders: Order[];
  }>({
    todaySales: 0,
    totalSales: 0,
    successfulOrders: 0,
    failedOrders: 0,
    pendingPayments: 0,
    totalAmountReceived: 0,
    orders: []
  });
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // Admin State
  const isAdmin = ['ADMIN', 'OWNER', 'SUPER ADMIN'].includes((user.role || '').toUpperCase());
  const [adminOverview, setAdminOverview] = useState<{
    totalWallets: number;
    totalSystemBalance: number;
    totalPendingPayouts: number;
    wallets: any[];
    transactions: WalletTransaction[];
    withdrawals: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'sales' | 'purchases' | 'withdrawals' | 'admin'>('transactions');

  // Filter State
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');

  // Modals
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showReceiveMoney, setShowReceiveMoney] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedWalletForAdj, setSelectedWalletForAdj] = useState<string>('');

  // Add Money Form State
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [depositProvider, setDepositProvider] = useState<'UPI' | 'SANDBOX'>('UPI');
  const [depositOrder, setDepositOrder] = useState<any>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositVerifying, setDepositVerifying] = useState(false);
  const [depositUtr, setDepositUtr] = useState('');
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);
  const [withdrawMethod, setWithdrawMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawIfsc, setWithdrawIfsc] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Send Money Form State
  const [sendRecipientId, setSendRecipientId] = useState('');
  const [sendAmount, setSendAmount] = useState<number>(100);
  const [sendNote, setSendNote] = useState('');
  const [sendConfirming, setSendConfirming] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Admin Adjust State
  const [adjAmount, setAdjAmount] = useState<number>(500);
  const [adjType, setAdjType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);
  const [adjSuccess, setAdjSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const res = await api.getWalletDashboard();
      if (res.wallet) {
        setWallet(res.wallet);
        setTransactions(res.transactions || []);
        if (res.botSales) setBotSales(res.botSales);
        if (res.purchases) setPurchases(res.purchases);
        if (res.withdrawals) setWithdrawals(res.withdrawals);
        if (res.subscriptions) setSubscriptions(res.subscriptions);
      }

      if (isAdmin) {
        const adminRes = await api.getAdminFzPayOverview();
        if (adminRes.success) setAdminOverview(adminRes);
      }
    } catch (err: any) {
      console.error('Failed to load FZ PAY dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const handleCopyWalletId = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Add Money: Step 1 -> Initiate
  const handleInitiateAddMoney = async () => {
    if (!depositAmount || depositAmount <= 0) {
      setDepositError('Please enter a valid amount.');
      return;
    }
    setDepositLoading(true);
    setDepositError(null);
    setDepositSuccess(null);
    try {
      const res = await api.addMoney({
        amount: depositAmount,
        provider: depositProvider
      });
      if (res.success) {
        setDepositOrder(res);
      }
    } catch (err: any) {
      setDepositError(err.message || 'Failed to initiate deposit.');
    } finally {
      setDepositLoading(false);
    }
  };

  // Add Money: Step 2 -> Verify
  const handleVerifyDeposit = async () => {
    if (!depositOrder) return;
    setDepositVerifying(true);
    setDepositError(null);
    try {
      const res = await api.verifyDeposit({
        paymentId: depositOrder.paymentId,
        orderId: depositOrder.orderId,
        transactionId: depositUtr.trim() || undefined,
        provider: depositProvider
      });
      if (res.success) {
        setDepositSuccess(res.message || 'Deposit confirmed successfully!');
        setWallet(res.wallet);
        setDepositOrder(null);
        setDepositUtr('');
        loadWalletData();
      }
    } catch (err: any) {
      setDepositError(err.message || 'Deposit verification failed. Please try again.');
    } finally {
      setDepositVerifying(false);
    }
  };

  // Withdraw Submit
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || withdrawAmount < 100) {
      setWithdrawError('Minimum withdrawal amount is ₹100.');
      return;
    }
    setWithdrawLoading(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);
    try {
      const res = await api.withdrawMoney({
        amount: withdrawAmount,
        method: withdrawMethod,
        upiId: withdrawMethod === 'UPI' ? withdrawUpiId.trim() : undefined,
        bankName: withdrawMethod === 'BANK_TRANSFER' ? withdrawBankName.trim() : undefined,
        accountNumber: withdrawMethod === 'BANK_TRANSFER' ? withdrawAccount.trim() : undefined,
        ifsc: withdrawMethod === 'BANK_TRANSFER' ? withdrawIfsc.trim() : undefined,
        notes: withdrawNotes.trim() || undefined
      });
      if (res.success) {
        setWithdrawSuccess(res.message);
        setWallet(res.wallet);
        loadWalletData();
        setTimeout(() => {
          setShowWithdraw(false);
          setWithdrawSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal request failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Send Money Submit
  const handleSendMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendRecipientId.trim() || !sendAmount || sendAmount <= 0) {
      setSendError('Please provide a valid recipient Wallet ID and amount.');
      return;
    }
    setSendLoading(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      const res = await api.sendMoney({
        recipientWalletId: sendRecipientId.trim(),
        amount: sendAmount,
        note: sendNote.trim() || undefined
      });
      if (res.success) {
        setSendSuccess(res.message);
        setWallet(res.senderWallet);
        setSendConfirming(false);
        loadWalletData();
        setTimeout(() => {
          setShowSendMoney(false);
          setSendSuccess(null);
          setSendRecipientId('');
          setSendNote('');
        }, 1500);
      }
    } catch (err: any) {
      setSendError(err.message || 'Transfer failed.');
    } finally {
      setSendLoading(false);
    }
  };

  // Admin Process Withdrawal
  const handleAdminWithdrawalAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const notes = prompt(`Optional ${action} notes / transaction ref:`) || undefined;
      const res = await api.adminProcessWithdrawal(id, {
        action,
        referenceId: action === 'APPROVE' ? `BANK-TXN-${Date.now()}` : undefined,
        adminNotes: notes
      });
      if (res.success) {
        alert(res.message);
        loadWalletData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process withdrawal.');
    }
  };

  // Admin Adjust Wallet Submit
  const handleAdminAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletForAdj || !adjAmount || !adjReason.trim()) {
      setAdjError('Wallet ID, amount, and reason are required.');
      return;
    }
    setAdjLoading(true);
    setAdjError(null);
    setAdjSuccess(null);
    try {
      const res = await api.adminAdjustWallet({
        walletId: selectedWalletForAdj,
        amount: adjAmount,
        type: adjType,
        reason: adjReason.trim()
      });
      if (res.success) {
        setAdjSuccess(res.message);
        loadWalletData();
        setTimeout(() => {
          setShowAdjustModal(false);
          setAdjSuccess(null);
          setAdjReason('');
        }, 1200);
      }
    } catch (err: any) {
      setAdjError(err.message || 'Adjustment failed.');
    } finally {
      setAdjLoading(false);
    }
  };

  // Filter transactions
  const filteredTxs = transactions.filter(t => {
    if (txTypeFilter !== 'ALL' && t.type !== txTypeFilter) return false;
    if (txStatusFilter !== 'ALL' && t.status !== txStatusFilter) return false;
    return true;
  });

  return (
    <div className="p-3 sm:p-5 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <Wallet className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                FZ PAY <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">INTERNAL WALLET</span>
              </h1>
              <p className="text-xs text-slate-400">Internal application wallet, instant key checkout & automated seller settlements</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Refresh balances & transactions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {onOpenCheckout && (
            <button
              onClick={onOpenCheckout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Upgrade Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Premium Wallet Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1427] via-[#0f172a] to-[#070d18] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 p-5 sm:p-7">
        {/* Glow backdrop effects */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Balances */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Balance</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                wallet?.status === 'ACTIVE'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                {wallet?.status || 'ACTIVE'}
              </span>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
                ₹{(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-cyan-400 font-mono">INR</span>
            </div>

            {/* Wallet Info Tags */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <div
                onClick={handleCopyWalletId}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 font-mono text-[11px] cursor-pointer transition-all group"
                title="Click to copy Wallet ID"
              >
                <span className="text-slate-400">Wallet ID:</span>
                <span className="text-cyan-400 font-bold">{wallet?.id || 'FZ-WAL-PENDING'}</span>
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                )}
              </div>

              {Boolean(wallet?.pending_balance && wallet.pending_balance > 0) && (
                <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending: ₹{wallet.pending_balance.toLocaleString('en-IN')}</span>
                </div>
              )}

              <span className="text-[10px] text-slate-400 hidden lg:inline">
                Verified Internal Financial Ledger • 100% Real-time
              </span>
            </div>
          </div>

          {/* Right: Lifetime Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0 md:min-w-[240px]">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center space-x-1">
                <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                <span>Total Received</span>
              </div>
              <div className="text-sm sm:text-base font-black text-emerald-400">
                +₹{(wallet?.total_received || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center space-x-1">
                <ArrowUpRight className="w-3 h-3 text-slate-400" />
                <span>Total Spent</span>
              </div>
              <div className="text-sm sm:text-base font-black text-slate-200">
                -₹{(wallet?.total_spent || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            onClick={() => {
              setDepositError(null);
              setDepositSuccess(null);
              setDepositOrder(null);
              setShowAddMoney(true);
            }}
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Money</span>
          </button>

          <button
            onClick={() => {
              setWithdrawError(null);
              setWithdrawSuccess(null);
              setShowWithdraw(true);
            }}
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Withdraw</span>
          </button>

          <button
            onClick={() => {
              setSendError(null);
              setSendSuccess(null);
              setSendConfirming(false);
              setShowSendMoney(true);
            }}
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Send Money</span>
          </button>

          <button
            onClick={() => setShowReceiveMoney(true)}
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Receive Money</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'transactions', label: 'Recent Transactions', badge: transactions.length },
          { id: 'sales', label: 'Bot Sales Payments', badge: botSales.orders.length },
          { id: 'purchases', label: 'My Purchases & Keys', badge: purchases.length },
          { id: 'withdrawals', label: 'Withdrawal History', badge: withdrawals.length },
          ...(isAdmin ? [{ id: 'admin', label: 'Admin Ledger Controls', badge: 'ROOT' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
              activeTab === tab.id
                ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                tab.badge === 'ROOT' ? 'bg-red-500/20 text-red-400 font-extrabold' : 'bg-slate-800 text-slate-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: RECENT TRANSACTIONS                                     */}
      {/* ============================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">Filter:</span>
              <select
                value={txTypeFilter}
                onChange={e => setTxTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
              >
                <option value="ALL">All Movement Types</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAW">Withdrawals</option>
                <option value="SEND">Sent Money</option>
                <option value="RECEIVE">Received Money</option>
                <option value="PREMIUM_PURCHASE">Premium Purchases</option>
                <option value="BOT_PRODUCT_PURCHASE">Bot Product Sales</option>
                <option value="REFUND">Refunds</option>
                <option value="ADJUSTMENT">Adjustments</option>
              </select>

              <select
                value={txStatusFilter}
                onChange={e => setTxStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredTxs.length} immutable records
            </div>
          </div>

          {/* Transactions List */}
          {filteredTxs.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Transactions Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your wallet transaction history will appear here once you deposit funds, send money, or sell products via your connected bots.
              </p>
              <button
                onClick={() => setShowAddMoney(true)}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                + Add Money to FZ PAY
              </button>
            </div>
          ) : (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
              {filteredTxs.map(tx => {
                const isCredit = ['DEPOSIT', 'RECEIVE', 'REFUND'].includes(tx.type) || (tx.type === 'BOT_PRODUCT_PURCHASE' && tx.balance_after > tx.balance_before) || (tx.type === 'ADJUSTMENT' && tx.balance_after > tx.balance_before);
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.status === 'FAILED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : tx.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : isCredit
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}>
                        {tx.type === 'DEPOSIT' && <Plus className="w-4 h-4" />}
                        {tx.type === 'WITHDRAW' && <Download className="w-4 h-4" />}
                        {tx.type === 'SEND' && <ArrowUpRight className="w-4 h-4" />}
                        {tx.type === 'RECEIVE' && <ArrowDownLeft className="w-4 h-4" />}
                        {tx.type === 'PREMIUM_PURCHASE' && <Crown className="w-4 h-4" />}
                        {tx.type === 'BOT_PRODUCT_PURCHASE' && <ShoppingBag className="w-4 h-4" />}
                        {tx.type === 'REFUND' && <RefreshCw className="w-4 h-4" />}
                        {tx.type === 'ADJUSTMENT' && <Sliders className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white truncate">{tx.description}</span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            tx.status === 'SUCCESS'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <span>{new Date(tx.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span className="text-slate-500">{tx.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div className={`text-xs sm:text-sm font-black font-mono ${
                        tx.status === 'FAILED' ? 'text-slate-500 line-through' : isCredit ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Bal: ₹{tx.balance_after?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BOT OWNER SALES                                         */}
      {/* ============================================================== */}
      {activeTab === 'sales' && (
        <div className="space-y-5">
          {/* Sales Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Sales</div>
              <div className="text-xl font-black text-cyan-400">₹{botSales.todaySales.toLocaleString('en-IN')}</div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lifetime Revenue</div>
              <div className="text-xl font-black text-emerald-400">₹{botSales.totalSales.toLocaleString('en-IN')}</div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivered Orders</div>
              <div className="text-xl font-black text-white">{botSales.successfulOrders}</div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Orders</div>
              <div className="text-xl font-black text-amber-400">{botSales.pendingPayments}</div>
            </div>
          </div>

          {/* Sales Orders Table */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Bot Customer Sales Feed</h3>
              <span className="text-xs text-slate-400 font-mono">{botSales.orders.length} orders total</span>
            </div>

            {botSales.orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No orders processed yet through your bots. Connect a Telegram bot to start receiving automated sales!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-bold">Order ID</th>
                      <th className="p-3.5 font-bold">Customer</th>
                      <th className="p-3.5 font-bold">Product / Key</th>
                      <th className="p-3.5 font-bold">Amount</th>
                      <th className="p-3.5 font-bold">Payment Method</th>
                      <th className="p-3.5 font-bold">Status</th>
                      <th className="p-3.5 font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {botSales.orders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-900/40">
                        <td className="p-3.5 font-mono text-cyan-400 font-bold">{order.id}</td>
                        <td className="p-3.5 font-medium text-white">{order.customer_name}</td>
                        <td className="p-3.5 text-slate-300 font-medium">{order.product_name}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">₹{order.total_amount}</td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">{order.payment_provider}</td>
                        <td className="p-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            order.status === 'DELIVERED' || order.status === 'PAID'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : order.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                          {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MY PURCHASES & KEYS                                     */}
      {/* ============================================================== */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-1">My Digital Purchases & License Keys</h3>
            <p className="text-xs text-slate-400">
              Keys purchased with FZ PAY are verified and delivered instantly with cryptographic validation.
            </p>
          </div>

          {purchases.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Key className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Purchases Yet</h4>
              <p className="text-xs text-slate-400">When you buy digital products or license keys, they will appear here with instant key reveal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchases.map(order => (
                <div key={order.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{order.product_name}</span>
                    <span className="text-xs font-black font-mono text-emerald-400">₹{order.total_amount}</span>
                  </div>

                  {order.key_delivered ? (
                    <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-between">
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>🔑 Key Delivered</span>
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(order.key_delivered || '');
                            alert('License key copied to clipboard!');
                          }}
                          className="text-[10px] text-cyan-400 hover:underline cursor-pointer flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Key</span>
                        </button>
                      </div>
                      <div className="font-mono text-xs text-white bg-slate-950 p-2 rounded-lg border border-slate-800 select-all font-bold">
                        {order.key_delivered}
                      </div>
                    </div>
                  ) : order.status === 'PENDING' ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-2">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>⏳ Payment Verification Pending. Key will unlock automatically upon confirmation.</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      ❌ Payment Failed / Cancelled
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                    <span>Order: {order.id}</span>
                    <span>{new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: WITHDRAWAL HISTORY                                      */}
      {/* ============================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-white">Payout Requests</h3>
              <p className="text-xs text-slate-400">Withdraw funds to your verified UPI ID or Bank Account.</p>
            </div>
            <button
              onClick={() => setShowWithdraw(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              + New Withdrawal
            </button>
          </div>

          {withdrawals.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No withdrawal requests placed yet.
            </div>
          ) : (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
              {withdrawals.map(w => (
                <div key={w.id} className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">
                        {w.method === 'UPI' ? `UPI Payout (${w.upi_id})` : `Bank Transfer (${w.bank_name} - ${w.account_number?.slice(-4)})`}
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        w.status === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : w.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}>
                        {w.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Ref: {w.id} • {new Date(w.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-white font-mono">₹{w.amount}</div>
                    {w.reference_id && (
                      <div className="text-[10px] text-emerald-400 font-mono">{w.reference_id}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: ADMIN CONTROLS (PRIVILEGED)                             */}
      {/* ============================================================== */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-5">
          {/* Admin Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase">System Active Wallets</div>
              <div className="text-2xl font-black text-white">{adminOverview?.totalWallets || 0}</div>
            </div>

            <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total User Wallet Balances</div>
              <div className="text-2xl font-black text-cyan-400">₹{(adminOverview?.totalSystemBalance || 0).toLocaleString('en-IN')}</div>
            </div>

            <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Pending Payout Obligations</div>
              <div className="text-2xl font-black text-amber-400">₹{(adminOverview?.totalPendingPayouts || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Pending Withdrawals Action Queue */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Pending User Withdrawals Queue</span>
            </h3>

            {(adminOverview?.withdrawals || []).filter(w => w.status === 'PENDING').length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No pending withdrawal requests in queue.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {(adminOverview?.withdrawals || []).filter(w => w.status === 'PENDING').map(w => (
                  <div key={w.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">
                        {w.user_name || w.user_email} — ₹{w.amount}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {w.method === 'UPI' ? `UPI: ${w.upi_id}` : `Bank: ${w.bank_name} / A/C: ${w.account_number} / IFSC: ${w.ifsc}`}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAdminWithdrawalAction(w.id, 'APPROVE')}
                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Approve & Pay
                      </button>
                      <button
                        onClick={() => handleAdminWithdrawalAction(w.id, 'REJECT')}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Reject & Return
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wallets Table */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">All Platform Wallets</h3>
              <span className="text-xs text-slate-400">Audited State</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-bold">Wallet ID</th>
                    <th className="p-3 font-bold">User</th>
                    <th className="p-3 font-bold">Role</th>
                    <th className="p-3 font-bold">Available Balance</th>
                    <th className="p-3 font-bold">Pending</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(adminOverview?.wallets || []).map(w => (
                    <tr key={w.id} className="hover:bg-slate-900/40">
                      <td className="p-3 font-mono font-bold text-cyan-400">{w.id}</td>
                      <td className="p-3 text-white font-medium">{w.user_name || w.user_email}</td>
                      <td className="p-3 text-slate-400">{w.user_role}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">₹{w.balance}</td>
                      <td className="p-3 font-mono text-amber-400">₹{w.pending_balance || 0}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                          {w.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedWalletForAdj(w.id);
                            setShowAdjustModal(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Manual Adjustment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD MONEY                                             */}
      {/* ============================================================== */}
      {showAddMoney && (
        <div className="fixed inset-0 bg-[#060a12]/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  ₹
                </div>
                <h3 className="text-sm font-bold text-white">Add Money to FZ PAY</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddMoney(false);
                  setDepositOrder(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {depositError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              {depositSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{depositSuccess}</span>
                </div>
              )}

              {!depositOrder ? (
                <>
                  {/* Amount Presets */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Preset Amount</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 500, 1000, 2500].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDepositAmount(amt)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            depositAmount === amt
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Custom Amount (INR)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                        ₹
                      </div>
                      <input
                        type="number"
                        min="10"
                        step="10"
                        value={depositAmount}
                        onChange={e => setDepositAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Payment Rail</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDepositProvider('UPI')}
                        className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                          depositProvider === 'UPI'
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="text-xs font-bold">Instant UPI QR</div>
                          <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDepositProvider('SANDBOX')}
                        className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                          depositProvider === 'SANDBOX'
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-xs font-bold">Instant Test Sandbox</div>
                          <div className="text-[10px] text-slate-400">Instant test simulator</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleInitiateAddMoney}
                    disabled={depositLoading || depositAmount <= 0}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {depositLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Continue to Payment (₹{depositAmount})</span>}
                  </button>
                </>
              ) : (
                /* Step 2: Confirmation / UPI QR */
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400">Order Reference:</span>
                    <div className="font-mono text-xs font-bold text-cyan-400">{depositOrder.orderId}</div>
                    <div className="text-lg font-black text-white">Amount: ₹{depositOrder.amount}</div>
                  </div>

                  {depositOrder.qrImageUrl && (
                    <div className="p-3 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg">
                      <img src={depositOrder.qrImageUrl} alt="UPI QR" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className="text-xs text-slate-300 font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    Pay to: <strong className="text-white">{depositOrder.upiDetails?.upi_id || 'fzpanel@upi'}</strong>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 text-left font-semibold">12-Digit UPI Ref / UTR Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 428198213891 (or leave empty for test)"
                      value={depositUtr}
                      onChange={e => setDepositUtr(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setDepositOrder(null)}
                      className="flex-1 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerifyDeposit}
                      disabled={depositVerifying}
                      className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      {depositVerifying ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <span>Confirm Payment</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: WITHDRAW                                              */}
      {/* ============================================================== */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-[#060a12]/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Withdraw Funds</h3>
              </div>
              <button onClick={() => setShowWithdraw(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-5 space-y-4">
              {withdrawError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {withdrawSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{withdrawSuccess}</span>
                </div>
              )}

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Available to Withdraw:</span>
                <span className="font-mono font-bold text-white">₹{wallet?.balance || 0}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Withdrawal Amount (Min ₹100)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="100"
                    max={wallet?.balance || 0}
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-16 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-amber-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(wallet?.balance || 0)}
                    className="absolute inset-y-1 right-1 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Payout Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('UPI')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      withdrawMethod === 'UPI' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    UPI ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('BANK_TRANSFER')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      withdrawMethod === 'BANK_TRANSFER' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

              {withdrawMethod === 'UPI' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Your UPI ID (VPA)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mobile@upi or username@okhdfcbank"
                    value={withdrawUpiId}
                    onChange={e => setWithdrawUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-400 outline-none font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Bank / SBI"
                      value={withdrawBankName}
                      onChange={e => setWithdrawBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Account Number</label>
                    <input
                      type="text"
                      required
                      placeholder="Account number"
                      value={withdrawAccount}
                      onChange={e => setWithdrawAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-400 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      required
                      placeholder="HDFC0001234"
                      value={withdrawIfsc}
                      onChange={e => setWithdrawIfsc(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-400 outline-none font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawLoading || (wallet?.balance || 0) < withdrawAmount}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
              >
                {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Request Payout (₹{withdrawAmount})</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: SEND MONEY                                            */}
      {/* ============================================================== */}
      {showSendMoney && (
        <div className="fixed inset-0 bg-[#060a12]/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Send Money</h3>
              </div>
              <button onClick={() => setShowSendMoney(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMoneySubmit} className="p-5 space-y-4">
              {sendError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {sendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{sendSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Recipient FZ PAY Wallet ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FZ-WAL-XXXXXX"
                  value={sendRecipientId}
                  onChange={e => setSendRecipientId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-400 outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Amount (INR)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={wallet?.balance || 0}
                    value={sendAmount}
                    onChange={e => setSendAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Optional Transfer Note</label>
                <input
                  type="text"
                  placeholder="e.g. Bot subscription payment / thank you"
                  value={sendNote}
                  onChange={e => setSendNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-400 outline-none"
                />
              </div>

              {sendConfirming ? (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2 text-xs">
                  <div className="text-slate-300">Confirm sending <strong className="text-cyan-400">₹{sendAmount}</strong> to <strong className="text-white font-mono">{sendRecipientId}</strong>?</div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setSendConfirming(false)}
                      className="flex-1 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendLoading}
                      className="flex-1 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-lg text-xs font-black cursor-pointer"
                    >
                      {sendLoading ? 'Processing...' : 'Yes, Send Now'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSendConfirming(true)}
                  disabled={!sendRecipientId.trim() || sendAmount <= 0 || (wallet?.balance || 0) < sendAmount}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  Review Transfer (₹{sendAmount})
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: RECEIVE MONEY QR                                      */}
      {/* ============================================================== */}
      {showReceiveMoney && (
        <div className="fixed inset-0 bg-[#060a12]/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-center p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Receive FZ PAY Transfer</span>
              <button onClick={() => setShowReceiveMoney(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`fzpay://${wallet?.id}`)}`}
                alt="FZ PAY QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Your Unique FZ PAY Wallet ID:</span>
              <div className="font-mono text-base font-black text-cyan-400 bg-slate-900 py-2 rounded-xl border border-slate-800">
                {wallet?.id}
              </div>
            </div>

            <button
              onClick={handleCopyWalletId}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedId ? 'Copied Wallet ID!' : 'Copy Wallet ID'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: ADMIN MANUAL ADJUSTMENT                               */}
      {/* ============================================================== */}
      {showAdjustModal && isAdmin && (
        <div className="fixed inset-0 bg-[#060a12]/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-red-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-red-500/10">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">Admin Manual Ledger Adjustment</h3>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminAdjustSubmit} className="p-5 space-y-4">
              {adjError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {adjError}
                </div>
              )}

              {adjSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  {adjSuccess}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-300 block mb-1">Target Wallet ID</label>
                <input
                  type="text"
                  required
                  value={selectedWalletForAdj}
                  onChange={e => setSelectedWalletForAdj(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Adjustment Type</label>
                  <select
                    value={adjType}
                    onChange={e => setAdjType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="CREDIT">CREDIT (+)</option>
                    <option value="DEBIT">DEBIT (-)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjAmount}
                    onChange={e => setAdjAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Mandatory Audit Reason</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Correction for transaction discrepancy / refund settlement"
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={adjLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                {adjLoading ? 'Recording Adjustment...' : 'Record Audited Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
