import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Crown,
  Check,
  Zap,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Subscription, SubscriptionPlan } from '../types';
import { api } from '../api';

interface BillingViewProps {
  subscription: Subscription | null;
  onOpenCheckout: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ subscription, onOpenCheckout }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const [pRes, payRes] = await Promise.all([
        api.getPlans(),
        api.getPaymentHistory()
      ]);
      if (pRes.plans) setPlans(pRes.plans);
      if (payRes.payments) setPayments(payRes.payments);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Billing & Subscription Plans</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Manage your merchant tier, connected bot limits, and view invoice transaction history.
          </p>
        </div>

        <button
          onClick={onOpenCheckout}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 shrink-0 self-start sm:self-auto"
        >
          <Crown className="w-4 h-4" />
          <span>Change / Upgrade Plan</span>
        </button>
      </div>

      {/* Current Active Plan Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">Current Plan</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  subscription?.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {subscription?.status || 'TRIAL'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              {subscription?.plan?.name || 'Professional Merchant'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {subscription?.expiry_date
                ? `Active until ${new Date(subscription.expiry_date).toLocaleDateString()} (Auto-renew enabled)`
                : 'Unlimited lifetime sandbox testing enabled.'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-xs text-slate-400">Price</div>
              <div className="text-xl font-bold text-white">
                ${subscription?.amount || 29}
                <span className="text-xs text-slate-400 font-normal">/{subscription?.billing_cycle?.toLowerCase() || 'month'}</span>
              </div>
            </div>
            <button
              onClick={onOpenCheckout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Modify Plan
            </button>
          </div>
        </div>
      </div>

      {/* Available Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(p => {
          const isCurrent = subscription?.plan_id === p.id;
          return (
            <div
              key={p.id}
              className={`bg-[#0f172a] border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                isCurrent ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                      CURRENT
                    </span>
                  )}
                </div>

                <div className="my-3">
                  <span className="text-2xl font-black text-white">${p.price_monthly}</span>
                  <span className="text-xs text-slate-400 font-medium">/mo</span>
                </div>

                <div className="space-y-2.5 py-4 border-t border-slate-800/80">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center space-x-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onOpenCheckout}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isCurrent
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                }`}
              >
                {isCurrent ? 'Active Tier' : 'Upgrade to ' + p.name}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment History Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-2">
          <Receipt className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Invoice & Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No previous payment invoices found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {payments.map((pay, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-cyan-400 text-[11px]">{pay.id}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ${pay.amount?.toFixed(2)} {pay.currency}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{pay.provider}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {pay.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(pay.created_at).toLocaleDateString()}
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
