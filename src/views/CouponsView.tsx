import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, CheckCircle2, AlertCircle, Percent, DollarSign, Copy } from 'lucide-react';
import { Coupon } from '../types';
import { api } from '../api';

interface CouponsViewProps {
  botId: string;
}

export const CouponsView: React.FC<CouponsViewProps> = ({ botId }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('20');
  const [maxUses, setMaxUses] = useState('100');
  const [minOrder, setMinOrder] = useState('0');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [botId]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.getCoupons();
      if (res.coupons) setCoupons(res.coupons);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      await api.createCoupon({
        bot_id: botId,
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        max_uses: parseInt(maxUses, 10),
        min_order_amount: parseFloat(minOrder)
      });
      setShowModal(false);
      setCode('');
      loadCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.deleteCoupon(id);
      loadCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopiedCode(c);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Promotional Coupons & Discounts</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Create percentage or fixed discount coupon codes that Telegram buyers can apply at checkout.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Coupon</span>
        </button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map(coupon => (
          <div
            key={coupon.id}
            className="bg-[#0f172a] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                  {coupon.code}
                </span>

                <button
                  onClick={() => copyCode(coupon.code)}
                  className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCode === coupon.code ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-xl font-black text-white mb-2">
                {coupon.discount_type === 'PERCENTAGE'
                  ? `${coupon.discount_value}% OFF`
                  : `$${coupon.discount_value.toFixed(2)} OFF`}
              </div>

              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Usage Redemptions:</span>
                  <span className="font-mono text-white">
                    {coupon.current_uses} / {coupon.max_uses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Min Order Amount:</span>
                  <span className="font-mono text-white">${coupon.min_order_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Active & Valid</span>
              <button
                onClick={() => handleDeleteCoupon(coupon.id)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Create Discount Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER50"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white uppercase font-mono focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Type</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="PERCENTAGE">Percent (%)</option>
                    <option value="FIXED">Fixed ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Discount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Max Allowed Uses</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
