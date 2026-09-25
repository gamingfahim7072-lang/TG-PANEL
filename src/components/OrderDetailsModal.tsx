import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  User,
  CreditCard,
  Key,
  Download,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy
} from 'lucide-react';
import { Order } from '../types';
import { api } from '../api';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderRefunded: (updatedOrder: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderRefunded
}) => {
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handleRefund = async () => {
    if (!confirm('Are you sure you want to refund this order and revoke the license?')) return;

    setRefunding(true);
    setError(null);

    try {
      const res = await api.refundOrder(order.id);
      if (res.order) {
        onOrderRefunded(res.order);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refund order.');
    } finally {
      setRefunding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Order Details</h2>
              <p className="text-xs text-slate-400 font-mono">#{order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Summary Card */}
          <div className="grid grid-cols-2 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Customer</div>
              <div className="text-xs font-bold text-white mt-0.5">{order.customer_name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {order.customer_telegram_id}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
              <div className="mt-0.5">
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
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {new Date(order.created_at).toLocaleString()}
              </div>
            </div>

            <div className="col-span-2 pt-2 border-t border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-300">{order.product_name}</span>
                <span className="text-xs text-slate-500 ml-1.5">(Qty: {order.quantity})</span>
              </div>
              <div className="text-sm font-black text-cyan-400">
                ${order.total_amount.toFixed(2)} {order.currency}
              </div>
            </div>
          </div>

          {/* Delivered Content Inspector */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Automated Delivered Payload</span>
              </span>
              {order.delivered_content && (
                <button
                  onClick={() => copyToClipboard(order.delivered_content || '')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy Payload'}</span>
                </button>
              )}
            </div>

            {order.delivered_content ? (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 break-all select-all">
                {order.delivered_content}
              </div>
            ) : order.download_url ? (
              <a
                href={order.download_url}
                download
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Delivered Asset</span>
              </a>
            ) : (
              <div className="text-xs text-slate-500 italic">No payload recorded for this order.</div>
            )}
          </div>

          {/* Payment Details */}
          <div className="text-xs text-slate-400 space-y-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between">
              <span>Payment Gateway:</span>
              <span className="font-semibold text-slate-200">{order.payment_provider}</span>
            </div>
            <div className="flex justify-between">
              <span>Transaction Reference:</span>
              <span className="font-mono text-slate-300">{order.payment_id || 'N/A'}</span>
            </div>
          </div>

          {/* Refund Action */}
          {order.status !== 'REFUNDED' && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleRefund}
                disabled={refunding}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                {refunding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Refund & Revoke Key</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
