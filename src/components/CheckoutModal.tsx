import React, { useState, useEffect } from 'react';
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
  Wallet,
  Plus
} from 'lucide-react';
import { SubscriptionPlan, Subscription, Wallet as WalletType } from '../types';
import { api } from '../api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionUpdated: (newSub: Subscription) => void;
  onNavigateToEditor?: () => void;
  onNavigateToBilling?: () => void;
  onNavigate?: (view: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionUpdated,
  onNavigateToEditor,
  onNavigateToBilling,
  onNavigate
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-monthly');
  const [provider, setProvider] = useState<'FZ_PAY' | 'UPI' | 'RAZORPAY' | 'CASHFREE' | 'PHONEPE'>('FZ_PAY');
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [verifiedSub, setVerifiedSub] = useState<Subscription | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      loadWallet();
      setError(null);
      setInsufficientBalance(false);
      setPaymentOrder(null);
      setVerifiedSub(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadPlans = async () => {
    try {
      const res = await api.getPlans();
      if (res.plans && res.plans.length > 0) {
        setPlans(res.plans);
        setSelectedPlanId(res.plans[0].id);
      }
    } catch {}
  };

  const loadWallet = async () => {
    setWalletLoading(true);
    try {
      const res = await api.getWalletDashboard();
      if (res.wallet) {
        setWallet(res.wallet);
      }
    } catch {}
    finally {
      setWalletLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];
  const getCurrencySymbol = (curr?: string) => curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '₹';
  const planPrice = selectedPlan
    ? (billingCycle === 'YEARLY' ? selectedPlan.price_yearly : selectedPlan.price_monthly) || selectedPlan.price || 299
    : 299;

  const handlePayWithWallet = async () => {
    setLoading(true);
    setError(null);
    setInsufficientBalance(false);
    try {
      const res = await api.paySubscriptionWithWallet({
        planId: selectedPlanId,
        billingCycle
      });

      if (res.success && res.subscription) {
        setVerifiedSub(res.subscription);
        if (res.wallet) setWallet(res.wallet);
        onSubscriptionUpdated(res.subscription);
      } else {
        if (res.code === 'INSUFFICIENT_BALANCE') {
          setInsufficientBalance(true);
        }
        throw new Error(res.error || 'Wallet payment was not confirmed.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed.');
      if (err.message && err.message.toLowerCase().includes('insufficient')) {
        setInsufficientBalance(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateOrder = async () => {
    if (provider === 'FZ_PAY') {
      return handlePayWithWallet();
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.createSubscriptionOrder({
        planId: selectedPlanId,
        billingCycle,
        provider
      });

      if (res.payment && res.order) {
        setPaymentOrder(res);
      } else {
        throw new Error('Failed to generate payment order.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVerifiedPayment = async () => {
    if (!paymentOrder) return;
    setVerifying(true);
    setError(null);
    try {
      const targetOrderId = paymentOrder.order?.id || paymentOrder.orderId;
      const targetPaymentId = paymentOrder.payment?.id || paymentOrder.paymentId;
      const verifyRes = await api.verifyPaymentOrder(targetOrderId, {
        paymentId: targetPaymentId,
        provider: 'UPI'
      });

      if (verifyRes.success && verifyRes.subscription) {
        setVerifiedSub(verifyRes.subscription);
        onSubscriptionUpdated(verifyRes.subscription);
      } else {
        setError(`❌ Payment Not Received\nPlease complete the payment using the official FZ PAY UPI ID/QR and try again.`);
      }
    } catch (err: any) {
      setError(`❌ Payment Not Received\nPlease complete the payment using the official FZ PAY UPI ID/QR and try again.`);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">💎 Premium Subscription & Plan Selector</h2>
              <p className="text-xs text-slate-400">Unlock the Bot Visual Editor, custom flows, and dynamic UPI QR delivery</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* VERIFIED SUCCESS SCREEN */}
          {verifiedSub ? (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/30 space-y-5 animate-in fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>✅ Payment Successfully Verified</span>
                  </h3>
                  <p className="text-xs text-emerald-300 font-bold mt-1">
                    🎉 Your subscription has been activated successfully.
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Your payment was verified and processed through official FZ PAY rails. Your bot visual editor is fully unlocked!
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Plan</span>
                  <span className="font-bold text-white">{selectedPlan?.name || 'Pro Tier'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Amount Paid</span>
                  <span className="font-bold text-emerald-400 font-mono">₹{paymentOrder?.payment?.amount || selectedPlan?.price_monthly || 299}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Status</span>
                  <span className="font-bold text-emerald-400">🟢 ACTIVE</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Expires On</span>
                  <span className="font-bold text-white font-mono text-[11px]">{new Date(verifiedSub.expiry_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToEditor) onNavigateToEditor();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center space-x-2 shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Open Bot Editor</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToBilling) onNavigateToBilling();
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Billing History</span>
                </button>
              </div>
            </div>
          ) : paymentOrder ? (
            /* PAYMENT SCREEN (QR + UPI) */
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Order Created: {paymentOrder.order.id}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                      ₹{paymentOrder.payment.amount}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scan the dynamic QR code with any UPI app (PhonePe, GPay, Paytm) or copy the UPI VPA to pay.
                  </p>
                </div>
                <button
                  onClick={() => setPaymentOrder(null)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Change Plan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                {/* QR Code Presentation */}
                <div className="flex flex-col items-center justify-center p-5 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
                  <div className="p-3 bg-white rounded-xl shadow-lg shadow-black/40">
                    <img
                      src={paymentOrder.qrImageUrl}
                      alt="UPI Dynamic QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-extrabold text-white">Amount: ₹{paymentOrder.payment.amount}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{paymentOrder.upiDetails?.upi_id}</div>
                  </div>
                </div>

                {/* Direct Pay Options */}
                <div className="space-y-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Pay via UPI VPA</span>
                      <button
                        onClick={() => handleCopy(paymentOrder.upiDetails?.upi_id || '')}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                      </button>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg text-xs font-mono text-cyan-400 border border-slate-800 break-all select-all">
                      {paymentOrder.upiDetails?.upi_id}
                    </div>

                    <a
                      href={paymentOrder.paymentUri}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <span>Open in UPI App (PhonePe / GPay)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold text-[11px]">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>FZ Payment Bank Automated Verification</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      After completing the payment on your device, click below to verify transaction and unlock the bot editor.
                    </p>
                    <button
                      onClick={handleConfirmVerifiedPayment}
                      disabled={verifying}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Payment with Provider...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>I Have Paid — Verify & Activate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PLAN SELECTION SCREEN */
            <>
              {/* Billing Cycle Switcher */}
              <div className="flex justify-center">
                <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MONTHLY')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billingCycle === 'MONTHLY'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('YEARLY')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      billingCycle === 'YEARLY'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Yearly VIP</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold">
                      SAVE 30%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map(plan => {
                  const isSelected = selectedPlanId === plan.id;
                  const price = plan.price !== undefined
                    ? plan.price
                    : (billingCycle === 'YEARLY' ? plan.price_yearly : plan.price_monthly) || 299;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-950/20 border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {plan.is_popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-md">
                          RECOMMENDED
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>

                        <div className="mb-4 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white font-mono">
                            {getCurrencySymbol(plan.currency)}{price}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            / {plan.duration} {plan.duration_unit?.toLowerCase() || 'days'}
                          </span>
                        </div>

                        {plan.description && (
                          <p className="text-xs text-slate-400 mb-3">{plan.description}</p>
                        )}

                        <div className="space-y-2 border-t border-slate-800/80 pt-3">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-center space-x-2 text-xs text-slate-300">
                              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>{plan.max_bots || 10} Connected Bots</span>
                        <span>Full Bot No-Code Editor</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Method Selector - FZ PAY ONLY */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300">Supported Payment Methods (FZ PAY ONLY)</div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Official FZ PAY Gateway</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* OFFICIAL FZ PAY UPI & QR SCANNER */}
                  <button
                    key="UPI"
                    type="button"
                    onClick={() => {
                      setProvider('UPI');
                      setError(null);
                      setInsufficientBalance(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      provider === 'UPI'
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-cyan-400" />
                        <span>Official FZ PAY UPI & QR</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-extrabold uppercase">
                        INSTANT UPI
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      PhonePe, Google Pay, Paytm, BHIM to Official FZ PAY
                    </div>
                  </button>

                  {/* FZ PAY INTERNAL WALLET */}
                  <button
                    key="FZ_PAY"
                    type="button"
                    onClick={() => {
                      setProvider('FZ_PAY');
                      setError(null);
                      setInsufficientBalance(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      provider === 'FZ_PAY'
                        ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span>FZ PAY Internal Wallet</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                        ZERO FEE
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      Balance: <strong className="text-emerald-400 font-mono">₹{(wallet?.balance || 0).toLocaleString()}</strong>
                    </div>
                  </button>
                </div>

                {/* FZ PAY WALLET PAYMENT DETAILS & BALANCE CHECK */}
                {provider === 'FZ_PAY' && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">FZ PAY Wallet Order Summary</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (wallet?.balance || 0) >= planPrice
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {(wallet?.balance || 0) >= planPrice ? 'READY TO PAY' : 'INSUFFICIENT BALANCE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Plan Name</span>
                        <span className="font-bold text-white">{selectedPlan?.name || 'Pro Tier'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Plan Price</span>
                        <span className="font-bold text-cyan-400 font-mono">₹{planPrice}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Duration</span>
                        <span className="font-bold text-slate-200">
                          {selectedPlan?.duration || (billingCycle === 'YEARLY' ? 365 : 30)} {selectedPlan?.duration_unit?.toLowerCase() || 'days'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Wallet Balance</span>
                        <span className={`font-bold font-mono ${(wallet?.balance || 0) >= planPrice ? 'text-emerald-400' : 'text-red-400'}`}>
                          ₹{(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Amount Required</span>
                        <span className="font-bold text-white font-mono">₹{planPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Insufficient Balance State */}
                    {(wallet?.balance || 0) < planPrice && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                        <div className="flex items-center space-x-2 text-red-400 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Insufficient FZ PAY balance. Please add money to your wallet.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            if (onNavigate) onNavigate('fz-pay');
                            else window.location.assign('/fz-pay');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Money (Shortfall: ₹{(planPrice - (wallet?.balance || 0)).toFixed(2)})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!verifiedSub && !paymentOrder && (
          <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-400 hidden sm:flex">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>FZ Payment Bank verified ledger processing.</span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {provider === 'FZ_PAY' ? (
                (wallet?.balance || 0) < planPrice ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigate) onNavigate('fz-pay');
                      else window.location.assign('/fz-pay');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Money to Wallet</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePayWithWallet}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Debiting Wallet & Activating...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        <span>Pay ₹{planPrice} with FZ PAY Wallet</span>
                      </>
                    )}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleInitiateOrder}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing Payment Order...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      <span>Proceed to Pay ₹{planPrice}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
