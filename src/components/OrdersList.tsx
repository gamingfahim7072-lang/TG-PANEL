import React, { useState } from 'react';
import { Order, PaymentStatus } from '../types';
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Flame,
  Key,
  IndianRupee,
  RotateCcw
} from 'lucide-react';

interface OrdersListProps {
  orders: Order[];
  botId: string;
}

export const OrdersList: React.FC<OrdersListProps> = ({ orders, botId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredOrders = orders
    .filter((o) => o.botId === botId)
    .filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        o.id.toLowerCase().includes(term) ||
        o.productTitle.toLowerCase().includes(term) ||
        o.customerUsername.toLowerCase().includes(term) ||
        o.customerTelegramId.includes(term)
      );
    });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-cyan-400" />
            <span>Orders & Key Delivery Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time ledger of completed Telegram in-app purchases, transaction hashes, and delivered assets
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, username, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="PAYMENT_SUCCESSFUL">Delivered / Paid</option>
            <option value="PAYMENT_PENDING">Pending</option>
            <option value="PAYMENT_FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Amount & Method</th>
                <th className="py-3 px-4">Delivered Payload</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No transactions match your search query. Run a test purchase in the Live Simulator!
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-200">{o.id}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">@{o.customerUsername}</div>
                      <div className="text-[10px] font-mono text-slate-400">ID: {o.customerTelegramId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{o.productTitle}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-100">
                        {o.paymentMethod === 'upi_dynamic_qr' && (
                          <span className="flex items-center gap-0.5 text-cyan-400 font-mono">
                            <IndianRupee className="h-3 w-3" />
                            {o.amount.toFixed(2)}
                          </span>
                        )}
                        {o.paymentMethod === 'stars' && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Flame className="h-3.5 w-3.5" /> {o.amount} Stars
                          </span>
                        )}
                        {o.paymentMethod === 'ton' && (
                          <span className="text-sky-400 font-mono">{o.amount} TON</span>
                        )}
                        {o.paymentMethod === 'usdt' && (
                          <span className="text-emerald-400 font-mono">${o.amount} USDT</span>
                        )}
                      </div>
                      {o.providerTxId && (
                        <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                          {o.providerTxId}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="max-w-[200px] truncate rounded bg-slate-950 px-2 py-1 font-mono text-[11px] text-emerald-400 border border-slate-800">
                          {o.deliveredPayload || 'Awaiting Payment'}
                        </span>
                        {o.deliveredPayload && (
                          <button
                            onClick={() => copyToClipboard(o.deliveredPayload, o.id)}
                            className="text-slate-400 hover:text-white"
                            title="Copy delivered key"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {copiedId === o.id && (
                        <span className="text-[10px] text-emerald-400">Copied!</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {o.status === 'PAYMENT_SUCCESSFUL' && (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                        </span>
                      )}
                      {o.status === 'PAYMENT_PENDING' && (
                        <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                      {o.status === 'PAYMENT_FAILED' && (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                      {o.status === 'PENDING_VERIFICATION' && (
                        <span className="inline-flex items-center gap-1 text-purple-400 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5" /> Manual Audit
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
