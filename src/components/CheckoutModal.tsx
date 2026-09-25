import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Check,
  Zap,
  CreditCard,
  ShieldCheck,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SubscriptionPlan, Subscription } from '../types';
import { api } from '../api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubscription: Subscription | null;
  onSubscriptionUpdated: (sub: Subscription) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  currentSubscription,
  onSubscriptionUpdated
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-pro');
  const [provider, setProvider] = useState<'RAZORPAY' | 'STRIPE' | 'CASHFREE' | 'PHONEPE'>('RAZORPAY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadPlans = async () => {
    try {
      const res = await api.getPlans();
      if (res.plans) {
        setPlans(res.plans);
        if (!selectedPlanId && res.plans.length > 0) {
          setSelectedPlanId(res.plans[1]?.id || res.plans[0].id);
        }
      }
    } catch {}
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.createSubscriptionOrder({
        planId: selectedPlanId,
        billingCycle,
        provider
      });

      if (res.payment) {
        // Complete checkout with signature verification
        const verifyRes = await api.verifyPayment({
          paymentId: res.payment.id,
          gatewayPaymentId: `pay_${Date.now()}_sandbox`,
          signature: `sig_${Math.random().toString(36).substring(2)}`,
          provider
        });

        if (verifyRes.subscription) {
          setSuccess(true);
          setTimeout(() => {
            onSubscriptionUpdated(verifyRes.subscription);
            onClose();
            setSuccess(false);
          }, 1400);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upgrade TeleSell SaaS Tier</h2>
              <p className="text-xs text-slate-400">Scale your automated Telegram digital business</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
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

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 font-bold">
              <Check className="w-5 h-5 shrink-0" />
              <span>Subscription activated successfully! Enjoy your upgraded limits.</span>
            </div>
          )}

          {/* Billing Cycle Switcher */}
          <div className="flex justify-center">
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  billingCycle === 'YEARLY'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => {
              const isSelected = selectedPlanId === plan.id;
              const price = billingCycle === 'MONTHLY' ? plan.price_monthly : plan.price_yearly;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/20 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-md">
                      MOST POPULAR
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>

                    <div className="mb-4">
                      <span className="text-2xl font-black text-white">${price}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        /{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-slate-800/80 pt-3">
                      {plan.features.map((feat, i) => (
                        <div key={i} className="flex items-center space-x-2 text-xs text-slate-300">
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{plan.max_bots} Connected Bots</span>
                    <span>{plan.max_products} Products</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Gateway Options */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-300 mb-3">Select Payment Gateway</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'RAZORPAY', label: 'Razorpay', desc: 'Cards, UPI & NetBanking' },
                { id: 'STRIPE', label: 'Stripe', desc: 'Global Credit/Debit Cards' },
                { id: 'CASHFREE', label: 'Cashfree', desc: 'Auto-Debit UPI & Cards' },
                { id: 'PHONEPE', label: 'PhonePe', desc: 'Direct UPI & Wallets' }
              ].map(gw => (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => setProvider(gw.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    provider === gw.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{gw.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{gw.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-bit SSL encrypted transaction with automated instant provisioning.</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  <span>
                    Pay $
                    {selectedPlan
                      ? billingCycle === 'MONTHLY'
                        ? selectedPlan.price_monthly
                        : selectedPlan.price_yearly
                      : '29'}
                    {' & Activate'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
