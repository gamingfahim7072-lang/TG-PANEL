import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Crown,
  Sparkles,
  ShieldCheck,
  Loader2,
  AlertCircle,
  QrCode,
  ArrowRight,
  ExternalLink,
  Copy,
  Sliders,
  FileText,
  Clock,
  Wallet,
  Key,
  ShoppingBag,
  RotateCcw,
  Plus
} from 'lucide-react';
import { Subscription, Wallet as WalletType, Order } from '../types';
import { api } from '../api';

export interface UniversalCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutType: 'SUBSCRIPTION' | 'BOT_EDITOR' | 'PRODUCT_KEY' | 'WALLET_DEPOSIT';
  itemTitle: string;
  itemDescription?: string;
  amount: number;
  currency?: string;
  planId?: string;
  billingCycle?: 'MONTHLY' | 'YEARLY';
  productId?: string;
  packageId?: string;
  onSuccess: (data: {
    orderId: string;
    subscription?: Subscription;
    deliveredKey?: string;
    wallet?: WalletType;
    order?: Order;
  }) => void;
  onNavigateToEditor?: () => void;
  onNavigateToWallet?: () => void;
}

export const UniversalPaymentCheckoutModal: React.FC<UniversalCheckoutProps> = ({
  isOpen,
  onClose,
  checkoutType,
  itemTitle,
  itemDescription,
  amount,
  currency = 'INR',
  planId,
  billingCycle = 'MONTHLY',
  productId,
  packageId,
  onSuccess,
  onNavigateToEditor,
  onNavigateToWallet
}) => {
  const [provider, setProvider] = useState<'UPI' | 'RAZORPAY' | 'CASHFREE' | 'STRIPE' | 'PHONEPE' | 'FZ_PAY'>('UPI');
  const [orderId, setOrderId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [paymentUri, setPaymentUri] = useState<string>('');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [upiDetails, setUpiDetails] = useState<any>(null);

  // States
  const [orderLoading, setOrderLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'>('CREATED');
  const [verifyMessage, setVerifyMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Timer: 10 minutes countdown (600 seconds)
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result payload after genuine backend verification
  const [verifiedResult, setVerifiedResult] = useState<{
    subscription?: Subscription;
    deliveredKey?: string;
    wallet?: WalletType;
  } | null>(null);

  // User wallet state for FZ_PAY flow
  const [wallet, setWallet] = useState<WalletType | null>(null);

  useEffect(() => {
    if (isOpen) {
      resetState();
      loadWallet();
      createPaymentOrder();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, planId, billingCycle, productId, packageId, checkoutType]);

  // Countdown timer effect
  useEffect(() => {
    if (isOpen && paymentStatus === 'PENDING' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setPaymentStatus('EXPIRED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, paymentStatus]);

  if (!isOpen) return null;

  const resetState = () => {
    setTimeLeft(600);
    setPaymentStatus('CREATED');
    setVerifyMessage(null);
    setVerifiedResult(null);
    setOrderId('');
    setPaymentId('');
    setPaymentUri('');
    setQrImageUrl('');
    setUpiDetails(null);
  };

  const loadWallet = async () => {
    try {
      const res = await api.getWalletDashboard();
      if (res.wallet) {
        setWallet(res.wallet);
      }
    } catch {}
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Step 1: Create real order & payment intent on server
  const createPaymentOrder = async () => {
    setOrderLoading(true);
    setVerifyMessage(null);
    try {
      let res: any;

      if (checkoutType === 'SUBSCRIPTION' || checkoutType === 'BOT_EDITOR') {
        res = await api.createSubscriptionOrder({
          planId: planId || 'plan-monthly',
          billingCycle: (billingCycle as 'MONTHLY' | 'YEARLY') || 'MONTHLY',
          provider: provider === 'FZ_PAY' ? 'UPI' : provider
        });
      } else if (checkoutType === 'PRODUCT_KEY') {
        res = await api.createKeyOrder({
          productId: productId || '',
          packageId,
          provider: provider === 'FZ_PAY' ? 'UPI' : provider
        });
      } else if (checkoutType === 'WALLET_DEPOSIT') {
        res = await api.addMoney({
          amount,
          provider: provider === 'FZ_PAY' ? 'UPI' : provider
        });
      }

      if (res && (res.order || res.orderId)) {
        const oId = res.order?.id || res.orderId;
        const pId = res.payment?.id || res.paymentId;
        setOrderId(oId);
        setPaymentId(pId);
        setPaymentUri(res.paymentUri || '');
        setQrImageUrl(res.qrImageUrl || '');
        setUpiDetails(res.upiDetails || null);
        setPaymentStatus('PENDING');
        setTimeLeft(600);
      } else {
        throw new Error(res?.error || 'Failed to initialize payment order on server.');
      }
    } catch (err: any) {
      setVerifyMessage({
        text: err.message || 'Payment initiation failed. Please check network connection.',
        isSuccess: false
      });
      setPaymentStatus('FAILED');
    } finally {
      setOrderLoading(false);
    }
  };

  // Step 2: Pay with FZ PAY Internal Wallet (Atomic server-side check)
  const handlePayWithWallet = async () => {
    setVerifying(true);
    setVerifyMessage(null);
    try {
      let res: any;
      if (checkoutType === 'SUBSCRIPTION' || checkoutType === 'BOT_EDITOR') {
        res = await api.paySubscriptionWithWallet({
          planId: planId || 'plan-monthly',
          billingCycle: (billingCycle as 'MONTHLY' | 'YEARLY') || 'MONTHLY'
        });
      } else if (checkoutType === 'PRODUCT_KEY') {
        res = await api.payProductWithWallet({
          productId: productId || '',
          packageId
        });
      }

      if (res && res.success) {
        setPaymentStatus('PAID');
        setVerifiedResult({
          subscription: res.subscription,
          deliveredKey: res.key || res.order?.key_delivered,
          wallet: res.wallet
        });
        setVerifyMessage({
          text: 'Payment successfully received and verified.',
          isSuccess: true
        });
        onSuccess({
          orderId: res.order?.id || res.subscription?.order_id || orderId,
          subscription: res.subscription,
          deliveredKey: res.key || res.order?.key_delivered,
          wallet: res.wallet,
          order: res.order
        });
      } else {
        throw new Error(res?.error || 'Insufficient FZ PAY balance. Please add money to your wallet.');
      }
    } catch (err: any) {
      setVerifyMessage({
        text: err.message || 'Payment Unsuccessful: Insufficient wallet balance.',
        isSuccess: false
      });
    } finally {
      setVerifying(false);
    }
  };

  // Step 3: Real Server-Side Payment Verification (Verify Button)
  const handlePaymentVerify = async () => {
    if (!orderId) return;
    if (paymentStatus === 'EXPIRED') {
      setVerifyMessage({
        text: '⏰ Payment session expired. Please generate a fresh payment order.',
        isSuccess: false
      });
      return;
    }

    setVerifying(true);
    setVerifyMessage(null);

    try {
      const res = await api.verifyPaymentOrder(orderId, {
        paymentId,
        provider
      });

      if (res.success && (res.status === 'PAID' || res.status === 'SUCCESS')) {
        setPaymentStatus('PAID');
        setVerifiedResult({
          subscription: res.subscription,
          deliveredKey: res.deliveredKey,
          wallet: res.wallet
        });
        setVerifyMessage({
          text: '✅ Payment Successfully Verified\n🎉 Your subscription has been activated successfully.',
          isSuccess: true
        });
        onSuccess({
          orderId: res.orderId || orderId,
          subscription: res.subscription,
          deliveredKey: res.deliveredKey,
          wallet: res.wallet,
          order: res.order
        });
      } else {
        // Legitimate rule: Do NOT assume paid! Return professional pending/failure notice
        setVerifyMessage({
          text: '❌ Payment Not Received\nPlease complete the payment using the official FZ PAY UPI ID/QR and try again.',
          isSuccess: false
        });
        setPaymentStatus(res.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING');
      }
    } catch (err: any) {
      setVerifyMessage({
        text: '❌ Payment Not Received\nPlease complete the payment using the official FZ PAY UPI ID/QR and try again.',
        isSuccess: false
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyUpi = () => {
    if (!upiDetails?.upi_id) return;
    navigator.clipboard.writeText(upiDetails.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              checkoutType === 'SUBSCRIPTION' || checkoutType === 'BOT_EDITOR'
                ? 'bg-amber-500/20 text-amber-400'
                : checkoutType === 'PRODUCT_KEY'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {checkoutType === 'SUBSCRIPTION' || checkoutType === 'BOT_EDITOR' ? (
                <Crown className="w-4 h-4" />
              ) : checkoutType === 'PRODUCT_KEY' ? (
                <Key className="w-4 h-4" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{itemTitle}</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  ₹{amount}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {itemDescription || 'Universal server-side payment verification & instant fulfillment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Notification Alert Box */}
          {verifyMessage && (
            <div className={`p-4 rounded-xl text-xs flex items-center space-x-2.5 animate-in fade-in ${
              verifyMessage.isSuccess
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}>
              {verifyMessage.isSuccess ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="font-semibold">{verifyMessage.text}</span>
            </div>
          )}

          {/* VERIFIED SUCCESS SCREEN */}
          {paymentStatus === 'PAID' && verifiedResult ? (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/30 space-y-5 animate-in fade-in text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2">
                    <span>PAYMENT VERIFIED</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                      PAID ✅
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {checkoutType === 'SUBSCRIPTION' || checkoutType === 'BOT_EDITOR'
                      ? '💎 Subscription Activated. Bot editor & premium features unlocked.'
                      : checkoutType === 'PRODUCT_KEY'
                      ? '🔑 License Key Generated & Delivered Successfully.'
                      : '💰 Wallet Credited Successfully via Verified Ledger.'}
                  </p>
                </div>
              </div>

              {/* Delivered Key Box if Product Key */}
              {verifiedResult.deliveredKey && (
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                  <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center justify-between">
                    <span>Your License Key</span>
                    <button
                      onClick={() => handleCopyKey(verifiedResult.deliveredKey!)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg text-sm sm:text-base font-mono font-bold text-cyan-300 border border-slate-800 break-all select-all">
                    {verifiedResult.deliveredKey}
                  </div>
                </div>
              )}

              {/* Order Fulfillment Summary Grid */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Item</span>
                  <span className="font-bold text-white truncate block">{itemTitle}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Amount Paid</span>
                  <span className="font-bold text-emerald-400 font-mono">₹{amount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Order ID</span>
                  <span className="font-mono text-slate-300 truncate block">{orderId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Status</span>
                  <span className="font-bold text-emerald-400">🟢 PAID & DELIVERED</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {(checkoutType === 'SUBSCRIPTION' || checkoutType === 'BOT_EDITOR') && onNavigateToEditor && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToEditor();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center space-x-2 shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Open Bot Visual Editor</span>
                  </button>
                )}
                {checkoutType === 'WALLET_DEPOSIT' && onNavigateToWallet && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToWallet();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center space-x-2 shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>View FZ PAY Wallet</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Close Checkout
                </button>
              </div>
            </div>
          ) : (
            /* PAYMENT IN-PROGRESS SCREEN */
            <div className="space-y-5">
              {/* Payment Details & Timer Banner */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">Order:</span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{orderId || 'Generating...'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                      paymentStatus === 'EXPIRED'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {paymentStatus === 'EXPIRED' ? 'EXPIRED' : 'PENDING'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
                    <span>Amount:</span>
                    <strong className="text-white text-xs font-mono">₹{amount} {currency}</strong>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className={`px-4 py-2 rounded-xl border flex items-center space-x-2 self-start sm:self-auto ${
                  paymentStatus === 'EXPIRED'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : timeLeft < 120
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                }`}>
                  <Clock className="w-4 h-4 shrink-0 animate-pulse" />
                  <div className="text-right">
                    <div className="text-[9px] uppercase font-bold tracking-wider">
                      {paymentStatus === 'EXPIRED' ? 'Session' : 'Expires In'}
                    </div>
                    <div className="text-sm font-black font-mono">
                      {paymentStatus === 'EXPIRED' ? '00:00' : formatTimer(timeLeft)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector - FZ PAY ONLY */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">Supported Payment Methods (FZ PAY ONLY)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setProvider('UPI')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      provider === 'UPI'
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Official FZ PAY UPI & Dynamic QR</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">PhonePe, GPay, Paytm, BHIM</div>
                  </button>

                  {/* FZ PAY Wallet (Only if not deposit and wallet has balance) */}
                  {checkoutType !== 'WALLET_DEPOSIT' && (
                    <button
                      type="button"
                      onClick={() => setProvider('FZ_PAY')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        provider === 'FZ_PAY'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>FZ PAY Internal Wallet</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Bal: <strong className="text-emerald-400 font-mono">₹{(wallet?.balance || 0).toLocaleString()}</strong>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* FZ PAY WALLET SELECTION */}
              {provider === 'FZ_PAY' ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">FZ PAY Wallet Instant Settlement</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                      Zero Fees
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Wallet Balance</span>
                      <span className={`text-base font-black font-mono ${(wallet?.balance || 0) >= amount ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Amount to Deduct</span>
                      <span className="text-base font-black font-mono text-white">
                        ₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {(wallet?.balance || 0) < amount ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-2 text-red-400 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Insufficient FZ PAY balance. Please add money to your wallet.</span>
                      </div>
                      {onNavigateToWallet && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToWallet();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Money (Shortfall: ₹{(amount - (wallet?.balance || 0)).toFixed(2)})</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePayWithWallet}
                      disabled={verifying}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Debiting Wallet & Verifying Order...</span>
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4" />
                          <span>Pay ₹{amount} from FZ PAY Wallet</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                /* EXTERNAL PAYMENT (UPI QR / GATEWAY) */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* QR Presentation */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2.5">
                    {orderLoading ? (
                      <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span className="text-xs">Generating dynamic QR...</span>
                      </div>
                    ) : qrImageUrl ? (
                      <div className="p-2.5 bg-white rounded-xl shadow-lg shadow-black/40">
                        <img
                          src={qrImageUrl}
                          alt="UPI Dynamic QR Code"
                          className="w-40 h-40 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-500">
                        QR Unavailable
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-xs font-black text-white">Amount: ₹{amount}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                        {upiDetails?.upi_id || 'fzpanel@upi'}
                      </div>
                    </div>
                  </div>

                  {/* Direct UPI App / Details */}
                  <div className="space-y-3">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Pay via UPI ID</span>
                        <button
                          onClick={handleCopyUpi}
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                        </button>
                      </div>
                      <div className="p-2 bg-slate-900 rounded-lg text-xs font-mono text-cyan-400 border border-slate-800 break-all select-all">
                        {upiDetails?.upi_id || 'fzpanel@upi'}
                      </div>

                      {paymentUri && (
                        <a
                          href={paymentUri}
                          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20"
                        >
                          <span>Open in UPI App (GPay / PhonePe)</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Server-Side Payment Verification</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        After completing the transfer in your payment app, tap the verify button below. Our server will query the provider to confirm receipt before activating.
                      </p>

                      {/* 🔎 [ PAYMENT VERIFY ] BUTTON */}
                      {paymentStatus === 'EXPIRED' ? (
                        <button
                          type="button"
                          onClick={createPaymentOrder}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Session Expired — Regenerate Order</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePaymentVerify}
                          disabled={verifying || orderLoading}
                          className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                        >
                          {verifying ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Querying Payment Provider...</span>
                            </>
                          ) : (
                            <>
                              <span>🔎 PAYMENT VERIFY</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {paymentStatus !== 'PAID' && (
          <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Ledger Processing • Zero Fake Activations</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
