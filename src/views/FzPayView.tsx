import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
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
  Filter,
  Search,
  Crown,
  ShoppingBag,
  Smartphone,
  UserCheck,
  CreditCard,
  Sliders,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Flame,
  Gift,
  Share2,
  ChevronRight,
  Zap,
  Info,
  ShieldCheck,
  Radio,
  ScanLine,
  User as UserIcon,
  Settings as SettingsIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  KeyRound,
  Building,
  Calendar
} from 'lucide-react';
import { User, Wallet as WalletType, WalletTransaction, Order, Subscription } from '../types';
import { api } from '../api';
import { FzPayKycModal } from '../components/FzPayKycModal';

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
  const [copiedTag, setCopiedTag] = useState(false);
  const [copiedCardNum, setCopiedCardNum] = useState(false);
  const [activeTab, setActiveTab] = useState<'passbook' | 'card' | 'sales' | 'admin'>('passbook');

  // FamCard Display Controls
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [cardActionLoading, setCardActionLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState<number>(25000);

  // Rewards State (Like FamPay Scratch Cards!)
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [rewardWon, setRewardWon] = useState<{ cashback: number; coinsWon: number; message: string } | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);

  // Scan & Pay Modal State
  const [showScanPayModal, setShowScanPayModal] = useState(false);
  const [scanPayee, setScanPayee] = useState('');
  const [scanAmount, setScanAmount] = useState<number>(150);
  const [scanNote, setScanNote] = useState('');
  const [scanPin, setScanPin] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Filter State
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');

  // Modals
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showReceiveMoney, setShowReceiveMoney] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings & PIN State
  const [userPin, setUserPin] = useState('1234');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);

  // Add Money Timer & State
  const [depositTimer, setDepositTimer] = useState(600);

  // Add Money Form State
  const [depositAmount, setDepositAmount] = useState<number>(500);
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
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (showAddMoney && depositOrder && depositTimer > 0) {
      interval = setInterval(() => {
        setDepositTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showAddMoney, depositOrder, depositTimer]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const res = await api.getWalletDashboard();
      if (res && res.wallet_created && res.wallet) {
        setWallet(res.wallet);
        setTransactions(res.transactions || []);
        if (res.botSales) setBotSales(res.botSales);
        if (res.purchases) setPurchases(res.purchases);
        if (res.withdrawals) setWithdrawals(res.withdrawals);
        if (res.wallet.card?.daily_limit) {
          setNewLimit(res.wallet.card.daily_limit);
        }
      } else {
        setWallet(null);
      }
      if (isAdmin) {
        loadAdminData();
      }
    } catch (err) {
      console.error('Failed to load wallet dashboard', err);
      setWallet(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const res = await api.getAdminWalletOverview();
      if (res.overview) {
        setAdminOverview(res.overview);
      }
    } catch {}
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const handleCopyTag = () => {
    if (!wallet?.upi_handle) return;
    navigator.clipboard.writeText(wallet.upi_handle);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  const handleCopyCard = () => {
    if (!wallet?.card?.card_number) return;
    navigator.clipboard.writeText(wallet.card.card_number.replace(/\s+/g, ''));
    setCopiedCardNum(true);
    setTimeout(() => setCopiedCardNum(false), 2000);
  };

  // Card Controls
  const handleToggleFreeze = async () => {
    setCardActionLoading(true);
    try {
      const res = await api.toggleCardFreeze();
      if (res.success && res.wallet) {
        setWallet(res.wallet);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle card freeze.');
    } finally {
      setCardActionLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    setCardActionLoading(true);
    try {
      const res = await api.toggleOnlineTx();
      if (res.success && res.wallet) {
        setWallet(res.wallet);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle online transactions.');
    } finally {
      setCardActionLoading(false);
    }
  };

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardActionLoading(true);
    try {
      const res = await api.setCardDailyLimit(newLimit);
      if (res.success && res.wallet) {
        setWallet(res.wallet);
        setShowLimitModal(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to set daily limit.');
    } finally {
      setCardActionLoading(false);
    }
  };

  // Rewards: FamPay Mystery Scratch Card
  const handleScratchReward = async () => {
    setRewardLoading(true);
    try {
      const res = await api.scratchReward();
      if (res.success && res.wallet) {
        setRewardWon({
          cashback: res.cashback,
          coinsWon: res.coinsWon,
          message: res.message
        });
        setScratched(true);
        setWallet(res.wallet);
        loadWalletData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to claim reward.');
    } finally {
      setRewardLoading(false);
    }
  };

  // Scan & Pay Execution
  const handleScanPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    setScanSuccess(null);

    if (!scanAmount || scanAmount <= 0) {
      setScanError('Please enter a valid amount.');
      return;
    }

    if ((wallet?.balance || 0) < scanAmount) {
      setScanError(`Insufficient FZ PAY balance. Available: ₹${wallet?.balance || 0}`);
      return;
    }

    if (scanPin.length !== 4) {
      setScanError('Please enter your 4-digit FZ PAY security PIN (e.g. 1234).');
      return;
    }

    setScanLoading(true);
    try {
      const res = await api.scanAndPay({
        upiUri: `upi://pay?pa=${encodeURIComponent(scanPayee || 'merchant@upi')}&am=${scanAmount}`,
        amount: scanAmount,
        payeeName: scanPayee || 'Verified Merchant',
        note: scanNote
      });

      if (res.success && res.wallet) {
        setScanSuccess(res.message);
        setWallet(res.wallet);
        loadWalletData();
        setTimeout(() => {
          setShowScanPayModal(false);
          setScanSuccess(null);
          setScanPayee('');
          setScanAmount(150);
          setScanPin('');
          setScanNote('');
        }, 2200);
      } else {
        setScanError(res.message || 'Payment failed.');
      }
    } catch (err: any) {
      setScanError(err.message || 'Scan & Pay transaction failed.');
    } finally {
      setScanLoading(false);
    }
  };

  // Add Money (Deposit)
  const handleInitiateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);
    setDepositLoading(true);

    try {
      const res = await api.addMoneyToWallet({
        amount: depositAmount,
        provider: 'UPI'
      });

      if (res.success) {
        setDepositOrder(res);
      } else {
        setDepositError('Failed to initiate deposit.');
      }
    } catch (err: any) {
      setDepositError(err.message || 'Deposit initiation failed.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleVerifyDeposit = async () => {
    if (!depositOrder) return;
    setDepositError(null);
    setDepositSuccess(null);
    setDepositVerifying(true);

    try {
      const res = await api.verifyDeposit({
        orderId: depositOrder.orderId,
        paymentId: depositOrder.paymentId,
        transactionId: depositUtr.trim() || undefined,
        provider: 'UPI'
      });

      if (res.success && res.wallet) {
        setDepositSuccess(`✅ Success! ₹${depositOrder.amount} added to your FZ PAY wallet.`);
        setWallet(res.wallet);
        loadWalletData();
        setTimeout(() => {
          setShowAddMoney(false);
          setDepositOrder(null);
          setDepositUtr('');
          setDepositSuccess(null);
        }, 2000);
      } else {
        setDepositError(res.message || 'Payment not verified. Please complete transfer.');
      }
    } catch (err: any) {
      setDepositError(err.message || 'Deposit verification failed.');
    } finally {
      setDepositVerifying(false);
    }
  };

  // P2P Send Money
  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    if (!sendRecipientId.trim()) {
      setSendError('Please enter recipient FZ PAY @tag, phone number, or wallet ID.');
      return;
    }

    if (!sendAmount || sendAmount <= 0) {
      setSendError('Please enter a valid transfer amount.');
      return;
    }

    if ((wallet?.balance || 0) < sendAmount) {
      setSendError(`Insufficient balance. You have ₹${wallet?.balance || 0} available.`);
      return;
    }

    setSendLoading(true);
    try {
      const res = await api.sendMoney({
        recipientWalletId: sendRecipientId.trim(),
        amount: sendAmount,
        note: sendNote.trim() || undefined
      });

      if (res.success) {
        setSendSuccess(`🎉 ₹${sendAmount} sent successfully to ${sendRecipientId}!`);
        if (res.senderWallet) setWallet(res.senderWallet);
        loadWalletData();
        setTimeout(() => {
          setShowSendMoney(false);
          setSendRecipientId('');
          setSendAmount(100);
          setSendNote('');
          setSendSuccess(null);
        }, 2000);
      } else {
        setSendError(res.message || 'Transfer failed.');
      }
    } catch (err: any) {
      setSendError(err.message || 'Transfer failed. Check recipient details.');
    } finally {
      setSendLoading(false);
    }
  };

  // Withdraw
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    if (!withdrawAmount || withdrawAmount < 100) {
      setWithdrawError('Minimum withdrawal amount is ₹100.');
      return;
    }

    if ((wallet?.balance || 0) < withdrawAmount) {
      setWithdrawError(`Insufficient balance. Available: ₹${wallet?.balance || 0}`);
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await api.withdrawMoney({
        amount: withdrawAmount,
        method: withdrawMethod,
        upiId: withdrawMethod === 'UPI' ? withdrawUpiId : undefined,
        bankName: withdrawMethod === 'BANK_TRANSFER' ? withdrawBankName : undefined,
        accountNumber: withdrawMethod === 'BANK_TRANSFER' ? withdrawAccount : undefined,
        ifsc: withdrawMethod === 'BANK_TRANSFER' ? withdrawIfsc : undefined,
        notes: withdrawNotes
      });

      if (res.success) {
        setWithdrawSuccess('✅ Payout request submitted! Funds will settle to your destination.');
        if (res.wallet) setWallet(res.wallet);
        loadWalletData();
        setTimeout(() => {
          setShowWithdraw(false);
          setWithdrawSuccess(null);
        }, 2000);
      } else {
        setWithdrawError(res.message || 'Withdrawal failed.');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal request failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const isWalletActive = Boolean(wallet && wallet.status === 'ACTIVE' && wallet.kyc_status === 'KYC_VERIFIED');
  const isWalletLocked = !isWalletActive;

  const filteredTransactions = transactions.filter(tx => {
    if (txTypeFilter === 'ALL') return true;
    if (txTypeFilter === 'SEND' && tx.type === 'SEND') return true;
    if (txTypeFilter === 'RECEIVE' && tx.type === 'RECEIVE') return true;
    if (txTypeFilter === 'DEPOSIT' && tx.type === 'DEPOSIT') return true;
    if (txTypeFilter === 'STORE' && (tx.type === 'BOT_PRODUCT_PURCHASE' || tx.type === 'PREMIUM_PURCHASE')) return true;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. INITIAL STATE: NEW PANEL USER MUST NOT HAVE AN FZ PAY WALLET */}
      {!isWalletActive ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto space-y-6 shadow-2xl animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/10">
            <CreditCard className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-mono tracking-widest text-cyan-400 font-bold block">
              💳 FZ PAY
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Wallet not created
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Your normal panel account and FZ PAY wallet are separate. To activate your prepaid closed-loop wallet and virtual RuPay card, complete the verified KYC onboarding flow.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowKycModal(true)}
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black rounded-2xl text-xs sm:text-sm transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2.5 mx-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>CREATE FZ PAY WALLET</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>No Real Bank Link Required</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5 text-cyan-400 font-semibold">
              <Lock className="w-4 h-4" />
              <span>FamPay Closed-Loop</span>
            </div>
          </div>
        </div>
      ) : (
        /* 2. AFTER KYC: COMPLETE 💳 FZ PAY ACTIVE DASHBOARD */
        <div className="space-y-6">
          {/* Top Identity & Account Identifier Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">FZ PAY ID:</span>
                <span className="font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {wallet.fz_pay_id || wallet.id}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">FZ PAY UPI ID:</span>
                <span className="font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
                  <span>{wallet.upi_handle}</span>
                  <button onClick={handleCopyTag} className="text-slate-400 hover:text-white cursor-pointer">
                    {copiedTag ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">KYC:</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  KYC_VERIFIED
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Wallet:</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  ACTIVE
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setShowProfileModal(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>FZ PAY Profile</span>
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-slate-300" />
                <span>FZ PAY Settings</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

      {/* TOP SECTION: VIRTUAL FAMPAY CARD + BALANCE & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: THE FAMCARD / VIRTUAL FZ CARD (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>Virtual FZ Card</span>
            </span>
            <button
              onClick={() => setShowCardDetails(!showCardDetails)}
              className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              {showCardDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showCardDetails ? 'Hide Details' : 'Show Details'}</span>
            </button>
          </div>

          {/* FAMCARD VISUAL */}
          <div className={`relative w-full aspect-[1.586/1] rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 overflow-hidden select-none border ${
            wallet?.card?.is_frozen
              ? 'bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border-blue-400/40 opacity-90'
              : 'bg-gradient-to-br from-[#070b14] via-[#0f172a] to-[#1e1b4b] border-cyan-500/40 shadow-cyan-500/10'
          }`}>
            {/* Holographic Sheen / Background Shapes */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/10 via-transparent to-transparent pointer-events-none" />

            {/* Frozen Card Overlay Banner */}
            {wallet?.card?.is_frozen && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-white tracking-widest uppercase">
                  CARD TEMPORARILY FROZEN
                </span>
                <button
                  onClick={handleToggleFreeze}
                  disabled={cardActionLoading}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-[11px] rounded-lg transition-all"
                >
                  Unfreeze Card
                </button>
              </div>
            )}

            <div className="relative h-full flex flex-col justify-between z-0">
              {/* Card Top: Chip + Contactless + Brand */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* EMV Metallic Chip */}
                  <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-200 border border-amber-200/60 shadow-inner flex items-center justify-center p-1">
                    <div className="w-full h-full border border-amber-600/40 rounded-[2px] grid grid-cols-2" />
                  </div>
                  {/* Contactless waves */}
                  <Radio className="w-5 h-5 text-cyan-400/80 -rotate-90" />
                </div>

                <div className="text-right">
                  <span className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300 font-mono">
                    FZ PAY
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block tracking-widest">
                    FAMCARD NEO
                  </span>
                </div>
              </div>

              {/* Card Center: 16-Digit Number */}
              <div className="my-auto pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base sm:text-lg font-black tracking-widest text-white drop-shadow">
                    {showCardDetails
                      ? wallet?.card?.card_number || '5399 2810 4912 3084'
                      : wallet?.card?.card_number_masked || '5399 •••• •••• 3084'}
                  </span>
                  {showCardDetails && (
                    <button
                      onClick={handleCopyCard}
                      className="text-slate-400 hover:text-cyan-400 p-1 transition-colors cursor-pointer"
                    >
                      {copiedCardNum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* CVV & Expiry */}
                {showCardDetails && (
                  <div className="flex items-center space-x-4 text-[10px] font-mono mt-1 text-slate-300">
                    <div>
                      <span className="text-slate-500 uppercase mr-1">EXP:</span>
                      <strong className="text-cyan-300">{wallet?.card?.expiry || '09/31'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase mr-1">CVV:</span>
                      <strong className="text-amber-300">{wallet?.card?.cvv || '742'}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom: Holder Name + RuPay / FZ Logo */}
              <div className="flex items-end justify-between text-xs pt-2">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest block font-bold">
                    CARDHOLDER
                  </span>
                  <span className="font-bold text-slate-200 tracking-wider font-mono uppercase truncate max-w-[170px] block">
                    {wallet?.full_name || user.full_name || 'FZ MEMBER'}
                  </span>
                </div>

                <div className="text-right flex items-center space-x-1.5">
                  <div className="font-mono text-xs font-black italic tracking-tighter text-emerald-400">
                    RuPay
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">PREPAID</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Card Controls Drawer */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={handleToggleFreeze}
              disabled={cardActionLoading || isWalletLocked}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                wallet?.card?.is_frozen
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">
                {wallet?.card?.is_frozen ? 'Unfreeze' : 'Freeze Card'}
              </span>
            </button>

            <button
              onClick={handleToggleOnline}
              disabled={cardActionLoading || isWalletLocked}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                wallet?.card?.online_transactions_enabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Online Tx</span>
            </button>

            <button
              onClick={() => setShowLimitModal(true)}
              disabled={cardActionLoading || isWalletLocked}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Daily Limit</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: BALANCE, FAMPAY ACTIONS, REWARDS (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* BALANCE & UPI HANDLE CARD */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Available FZ PAY Balance
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                    ₹{(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-mono text-slate-400">INR</span>
                </div>
              </div>

              {/* Personalized @fzpay Handle */}
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between sm:justify-start space-x-3">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-mono font-bold block">
                    Your FZ UPI Tag
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {wallet?.upi_handle || `${user.email.split('@')[0]}@fzpay`}
                  </span>
                </div>
                <button
                  onClick={handleCopyTag}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedTag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* FAMPAY 4-CORE QUICK ACTION BUTTONS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {/* 1. SCAN & PAY */}
              <button
                type="button"
                onClick={() => setShowScanPayModal(true)}
                disabled={isWalletLocked}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-slate-950 to-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-left transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ScanLine className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="text-xs font-black text-white">Scan & Pay</div>
                <div className="text-[10px] text-slate-400">Any UPI QR</div>
              </button>

              {/* 2. SEND MONEY */}
              <button
                type="button"
                onClick={() => setShowSendMoney(true)}
                disabled={isWalletLocked}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-slate-950 to-slate-950 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Send className="w-4 h-4" />
                </div>
                <div className="text-xs font-black text-white">Pay to @tag</div>
                <div className="text-[10px] text-slate-400">Zero fee P2P</div>
              </button>

              {/* 3. RECEIVE / QR */}
              <button
                type="button"
                onClick={() => setShowReceiveMoney(true)}
                disabled={isWalletLocked}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-slate-950 to-slate-950 border border-indigo-500/30 hover:border-indigo-400 text-left transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-xs font-black text-white">My QR Code</div>
                <div className="text-[10px] text-slate-400">Receive funds</div>
              </button>

              {/* 4. ADD MONEY */}
              <button
                type="button"
                onClick={() => setShowAddMoney(true)}
                disabled={isWalletLocked}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/30 hover:border-amber-400 text-left transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-xs font-black text-white">Add Money</div>
                <div className="text-[10px] text-slate-400">UPI Top-up</div>
              </button>
            </div>
          </div>

          {/* FAMPAY STREAKS & REWARDS STRIP */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Flame className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white">
                    {wallet?.rewards?.streak_days || 5} Days Payment Streak
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    🔥 HOT
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {wallet?.rewards?.coins || 350} FZ Coins • Earned ₹{wallet?.rewards?.total_cashback_earned || 65} Cashback
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setScratched(false);
                setRewardWon(null);
                setShowRewardModal(true);
              }}
              disabled={isWalletLocked}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Scratch Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. FINANCIAL INDICATORS (STRICTLY FROM DATABASE LEDGER) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Database Financial Ledger Indicators</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">100% REAL-TIME LEDGER DERIVED</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Available Balance */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>💰</span> Available Balance
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-cyan-400">
              ₹{(wallet?.available_balance ?? wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">Ready for spend/transfer</span>
          </div>

          {/* 2. Total Balance */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>📊</span> Total Balance
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-white">
              ₹{(wallet?.total_balance ?? wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">Available + pending reserve</span>
          </div>

          {/* 3. Total Deposit */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>➕</span> Total Deposit
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
              ₹{(wallet?.total_deposit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">Verified top-ups</span>
          </div>

          {/* 4. Total Withdrawal */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>📤</span> Total Withdrawal
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-amber-400">
              ₹{(wallet?.total_withdrawal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">Settled payouts</span>
          </div>

          {/* 5. Total Sent */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>💸</span> Total Sent
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-rose-400">
              ₹{(wallet?.total_sent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">P2P transfers sent</span>
          </div>

          {/* 6. Total Received */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>📥</span> Total Received
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-teal-400">
              ₹{(wallet?.total_received ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">Inbound P2P & bot sales</span>
          </div>

          {/* 7. Total Refund */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>↩️</span> Total Refund
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-indigo-400">
              ₹{(wallet?.total_refund ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">Refunded transactions</span>
          </div>

          {/* 8. Transaction History */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span>📜</span> Transaction History
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-white">
              {transactions.length}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block">Ledger entries recorded</span>
          </div>
        </div>
      </div>

      {/* 5. COMPLETE FZ PAY FEATURES ACTION BAR */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>FZ PAY Core Functionalities</span>
          <span className="text-[10px] text-cyan-400 font-mono">ALL ACTIONS CONNECTED TO BACKEND</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {/* 1. Add Money */}
          <button
            type="button"
            onClick={() => setShowAddMoney(true)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Add Money</span>
          </button>

          {/* 2. Withdraw */}
          <button
            type="button"
            onClick={() => setShowWithdraw(true)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Withdraw</span>
          </button>

          {/* 3. Send Money */}
          <button
            type="button"
            onClick={() => setShowSendMoney(true)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Send className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Send Money</span>
          </button>

          {/* 4. Receive Money */}
          <button
            type="button"
            onClick={() => setShowReceiveMoney(true)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Receive</span>
          </button>

          {/* 5. Scan / QR */}
          <button
            type="button"
            onClick={() => setShowScanPayModal(true)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ScanLine className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Scan & Pay</span>
          </button>

          {/* 6. Transaction History */}
          <button
            type="button"
            onClick={() => setActiveTab('passbook')}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">History</span>
          </button>

          {/* 7. FZ PAY Profile */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Profile</span>
          </button>

          {/* 8. FZ PAY Settings */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-500/50 hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-1.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white">Settings</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS: PASSBOOK / BOT SALES / ADMIN */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('passbook')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'passbook'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Passbook Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Connected Bot Sales</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Settlement Hub</span>
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={isWalletLocked || (wallet?.balance || 0) < 100}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdraw Payout</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: PASSBOOK */}
      {activeTab === 'passbook' && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 text-[11px] font-bold uppercase">Filter:</span>
            {['ALL', 'SEND', 'RECEIVE', 'DEPOSIT', 'STORE'].map(type => (
              <button
                key={type}
                onClick={() => setTxTypeFilter(type)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs font-semibold ${
                  txTypeFilter === type
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No transactions found in this category.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredTransactions.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center space-x-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'RECEIVE' || tx.type === 'DEPOSIT'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {tx.type === 'RECEIVE' || tx.type === 'DEPOSIT' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{tx.description}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {tx.reference_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(tx.created_at).toLocaleString()} • Bal: ₹{tx.balance_after?.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-black font-mono ${
                        tx.type === 'RECEIVE' || tx.type === 'DEPOSIT'
                          ? 'text-emerald-400'
                          : 'text-white'
                      }`}>
                        {tx.type === 'RECEIVE' || tx.type === 'DEPOSIT' ? '+' : '-'}₹{tx.amount}
                      </span>
                      <span className="text-[10px] block text-emerald-400 font-bold uppercase">
                        SUCCESS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CONNECTED BOT SALES */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Today's Sales</span>
              <div className="text-xl font-black font-mono text-cyan-400 mt-1">₹{botSales.todaySales}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Sales</span>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">₹{botSales.totalSales}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Delivered Orders</span>
              <div className="text-xl font-black font-mono text-white mt-1">{botSales.successfulOrders}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Pending Verify</span>
              <div className="text-xl font-black font-mono text-amber-400 mt-1">{botSales.pendingPayments}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
            {botSales.orders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No orders processed by connected bots yet.
              </div>
            ) : (
              botSales.orders.map(o => (
                <div key={o.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{o.product_name}</div>
                    <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                      Order: {o.id} • Buyer: {o.customer_name || 'Guest'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 font-mono block">₹{o.total_amount}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">{o.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ADMIN SETTLEMENT HUB */}
      {isAdmin && activeTab === 'admin' && adminOverview && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Wallets Created</span>
              <div className="text-xl font-black font-mono text-white mt-1">{adminOverview.totalWallets}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">System Total Reserves</span>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">₹{adminOverview.totalSystemBalance}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Pending Withdrawal Payouts</span>
              <div className="text-xl font-black font-mono text-amber-400 mt-1">₹{adminOverview.totalPendingPayouts}</div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* MODAL 1: SCAN & PAY (FAMPAY INSTANT QR / UPI SCANNER) */}
      {showScanPayModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <ScanLine className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white">Scan & Pay via FZ PAY</h3>
              </div>
              <button onClick={() => setShowScanPayModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScanPaySubmit} className="p-6 space-y-4 text-xs">
              {scanError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  {scanError}
                </div>
              )}
              {scanSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  {scanSuccess}
                </div>
              )}

              {/* Simulated QR Viewfinder */}
              <div className="relative aspect-video rounded-2xl bg-slate-950 border border-dashed border-cyan-500/40 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
                <QrCode className="w-12 h-12 text-cyan-400 mb-2 relative z-10" />
                <span className="text-[11px] text-slate-300 relative z-10 font-bold">
                  Camera / QR Scanner Active
                </span>
                <span className="text-[10px] text-slate-500 relative z-10">
                  Auto-detecting NPCI UPI merchant codes
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">
                  Payee UPI VPA / Merchant Name
                </label>
                <input
                  type="text"
                  required
                  value={scanPayee}
                  onChange={e => setScanPayee(e.target.value)}
                  placeholder="e.g. coffeehouse@upi or Merchant Name"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={scanAmount}
                  onChange={e => setScanAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-bold text-cyan-400 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">
                  4-Digit FZ PAY Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={scanPin}
                  onChange={e => setScanPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono text-xl tracking-widest text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={scanLoading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {scanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Authorize & Pay ₹{scanAmount}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND MONEY TO @TAG / P2P */}
      {showSendMoney && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-emerald-500/30 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Transfer to @tag / Friend</h3>
              </div>
              <button onClick={() => setShowSendMoney(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMoney} className="p-6 space-y-4 text-xs">
              {sendError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  {sendError}
                </div>
              )}
              {sendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  {sendSuccess}
                </div>
              )}

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">
                  Recipient @fzpay Tag, Phone, or Wallet ID
                </label>
                <input
                  type="text"
                  required
                  value={sendRecipientId}
                  onChange={e => setSendRecipientId(e.target.value)}
                  placeholder="e.g. rahul@fzpay, 9876543210, or FZ-WAL-..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={sendAmount}
                  onChange={e => setSendAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={sendNote}
                  onChange={e => setSendNote(e.target.value)}
                  placeholder="e.g. Dinner split, Gaming pass"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={sendLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send ₹{sendAmount} (0% Fees)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECEIVE / PERSONAL QR CODE */}
      {showReceiveMoney && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-indigo-500/30 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-wider font-mono">
                MY FZ PAY QR CODE
              </span>
              <button onClick={() => setShowReceiveMoney(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl shadow-xl mx-auto w-fit">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=${encodeURIComponent(wallet?.upi_handle || 'user@fzpay')}&pn=${encodeURIComponent(wallet?.full_name || 'FZ User')}`}
                alt="Personal UPI QR"
                className="w-52 h-52 object-contain"
              />
            </div>

            <div className="space-y-1">
              <span className="text-sm font-black text-white">{wallet?.full_name || user.full_name}</span>
              <div className="text-xs font-mono font-bold text-cyan-400">{wallet?.upi_handle}</div>
            </div>

            <p className="text-[10px] text-slate-400">
              Scan with any UPI app (GPay, PhonePe, Paytm) to deposit directly into your FZ PAY internal wallet.
            </p>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD MONEY TO WALLET */}
      {showAddMoney && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-amber-500/30 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">Add Money to FZ PAY</h3>
              </div>
              <button onClick={() => setShowAddMoney(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {depositError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  {depositError}
                </div>
              )}
              {depositSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  {depositSuccess}
                </div>
              )}

              {!depositOrder ? (
                <form onSubmit={handleInitiateDeposit} className="space-y-4">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">
                      Top-up Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      value={depositAmount}
                      onChange={e => setDepositAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-bold text-amber-400 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    {[100, 500, 1000, 2000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDepositAmount(val)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:border-amber-500/50"
                      >
                        +₹{val}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={depositLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {depositLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    <span>Generate Official FZ PAY QR</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-white rounded-2xl shadow-xl mx-auto w-fit">
                    <img
                      src={depositOrder.qrImageUrl}
                      alt="Deposit QR"
                      className="w-48 h-48 object-contain"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-white">Amount: ₹{depositOrder.amount}</span>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Pay to: {depositOrder.upiDetails?.upi_id || 'fzpanel@upi'}
                    </div>
                  </div>

                  <div className="text-left space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold">12-Digit UPI UTR (Optional)</label>
                    <input
                      type="text"
                      value={depositUtr}
                      onChange={e => setDepositUtr(e.target.value)}
                      placeholder="e.g. 308412984102"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-400 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyDeposit}
                    disabled={depositVerifying}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {depositVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>[ PAYMENT VERIFY ]</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FAMPAY MYSTERY SCRATCH CARD */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-amber-500/40 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono">
                🎁 FAMPAY MYSTERY REWARD
              </span>
              <button onClick={() => setShowRewardModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {scratched && rewardWon ? (
              <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/20 to-transparent border border-amber-500/40 space-y-3 animate-in zoom-in-95">
                <div className="text-3xl">🎉</div>
                <h3 className="text-lg font-black text-white">CONGRATULATIONS!</h3>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  +₹{rewardWon.cashback} CASHBACK
                </div>
                <div className="text-xs font-bold text-amber-300">
                  +{rewardWon.coinsWon} FZ Coins
                </div>
                <p className="text-[11px] text-slate-300">{rewardWon.message}</p>
                <button
                  onClick={() => setShowRewardModal(false)}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all"
                >
                  Awesome!
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  onClick={handleScratchReward}
                  className="aspect-square rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex flex-col items-center justify-center p-6 text-slate-950 cursor-pointer shadow-xl hover:scale-102 transition-transform select-none"
                >
                  {rewardLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-10 h-10 mb-2" />
                      <span className="font-black text-sm uppercase">Tap to Scratch</span>
                      <span className="text-[10px] font-bold mt-1">Win up to ₹25 Instant Cashback</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Daily rewards available for active FZ PAY members. Refreshes every 24 hours!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: SET CARD DAILY LIMIT */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-white">Set Daily Card Limit</span>
              <button onClick={() => setShowLimitModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLimit} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Daily Spending Ceiling (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  value={newLimit}
                  onChange={e => setNewLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-bold text-cyan-400 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={cardActionLoading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all"
              >
                Save Daily Limit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: WITHDRAWAL FORM */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white">Withdraw Funds</h3>
              <button onClick={() => setShowWithdraw(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="p-6 space-y-4 text-xs">
              {withdrawError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">{withdrawError}</div>}
              {withdrawSuccess && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">{withdrawSuccess}</div>}

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Amount to Withdraw (₹)</label>
                <input
                  type="number"
                  min="100"
                  required
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Destination UPI ID</label>
                <input
                  type="text"
                  required
                  value={withdrawUpiId}
                  onChange={e => setWithdrawUpiId(e.target.value)}
                  placeholder="yourname@okhdfcbank"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full py-2.5 bg-slate-200 hover:bg-white text-slate-950 font-black rounded-xl transition-all"
              >
                {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Withdrawal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE KYC ONBOARDING MODAL */}
      <FzPayKycModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        onSuccess={(unlockedWallet) => {
          setWallet(unlockedWallet);
          loadWalletData();
        }}
        userFullName={user.full_name}
        userPhone={user.phone}
      />
    </div>
  );
};
