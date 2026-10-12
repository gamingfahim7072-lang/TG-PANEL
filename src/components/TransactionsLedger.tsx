import React, { useState } from 'react';
import { Order, PaymentStatus, TelegramBot } from '../types';
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  QrCode,
  Filter
} from 'lucide-react';

interface TransactionsLedgerProps {
  orders: Order[];
  bot: TelegramBot;
  onVerifyManualPayment?: (orderId: string) => void;
}

export const TransactionsLedger: React.FC<TransactionsLedgerProps> = ({
  orders,
  bot,
  onVerifyManualPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const botOrders = orders.filter((o) => o.botId === bot.id);

  const filteredOrders = botOrders.filter((o) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'PAYMENT_SUCCESSFUL' && o.status !== 'PAYMENT_SUCCESSFUL') return false;
      if (statusFilter === 'PAYMENT_PENDING' && o.status !== 'PAYMENT_PENDING') return false;
      if (statusFilter === 'VERIFYING_PAYMENT' && o.status !== 'VERIFYING_PAYMENT') return false;
      if (statusFilter === 'PAYMENT_FAILED' && o.status !== 'PAYMENT_FAILED') return false;
      if (statusFilter === 'PAYMENT_EXPIRED' && o.status !== 'PAYMENT_EXPIRED') return false;
      if (statusFilter === 'PENDING_VERIFICATION' && o.status !== 'PENDING_VERIFICATION') return false;
      if (statusFilter === 'REFUNDED' && o.status !== 'REFUNDED') return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.id.toLowerCase().includes(term) ||
      o.productTitle.toLowerCase().includes(term) ||
      o.customerUsername.toLowerCase().includes(term) ||
      o.customerTelegramId.includes(term) ||
      (o.providerOrderId && o.providerOrderId.toLowerCase().includes(term)) ||
      (o.providerTxId && o.providerTxId.toLowerCase().includes(term))
    );
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAYMENT_SUCCESSFUL':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> VERIFIED
          </span>
        );
      case 'PAYMENT_PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> PAYMENT_PENDING
          </span>
        );
      case 'VERIFYING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold text-cyan-400 border border-cyan-500/20">
            <Clock className="h-3 w-3 animate-spin" /> VERIFYING
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-400 border border-purple-500/20">
            <AlertTriangle className="h-3 w-3" /> MANUAL_AUDIT
          </span>
        );
      case 'PAYMENT_EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-400 border border-slate-700">
            <XCircle className="h-3 w-3" /> EXPIRED
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" /> FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-cyan-400" />
              <span>Dynamic UPI QR Transactions Ledger</span>
            </h2>
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
              Bot Editor → Payment Settings → Transactions
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Audited transaction ledger for @{bot.username} showing provider references, exact amounts, verification timestamps, and fulfillment status
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order, TX, Provider ID..."
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
            <option value="all">All Transactions ({botOrders.length})</option>
            <option value="PAYMENT_SUCCESSFUL">Verified / Paid</option>
            <option value="PAYMENT_PENDING">Pending Payment</option>
            <option value="PENDING_VERIFICATION">Manual Audit Required</option>
            <option value="PAYMENT_EXPIRED">Expired</option>
            <option value="PAYMENT_FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Amount & Method</th>
                <th className="py-3 px-4">Provider References</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions match the selected filter criteria.
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
                      {o.isTestTransaction && (
                        <span className="mt-1 inline-block rounded bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-400 border border-amber-500/20">
                          TEST MODE
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">@{o.customerUsername}</div>
                      <div className="text-[10px] font-mono text-slate-400">ID: {o.customerTelegramId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 max-w-[150px] truncate">
                        {o.productTitle}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-sm text-white">
                        ₹{o.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {o.qrGenerationMode === 'MODE_A_PROVIDER'
                          ? 'Dynamic QR (Gateway)'
                          : 'UPI ID Fallback'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono text-[10px] text-slate-300">
                          Ref: {o.providerOrderId || 'N/A'}
                        </div>
                        {o.providerTxId && (
                          <div className="font-mono text-[10px] text-emerald-400">
                            TX: {o.providerTxId}
                          </div>
                        )}
                        <div className="text-[9px] text-slate-500 truncate max-w-[160px]">
                          {o.merchantAccountRef}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {renderStatusBadge(o.status)}
                        {o.verificationTimestamp && (
                          <div className="text-[9px] text-slate-500">
                            Verified: {new Date(o.verificationTimestamp).toLocaleTimeString()}
                          </div>
                        )}
                        {o.status === 'PENDING_VERIFICATION' && onVerifyManualPayment && (
                          <button
                            onClick={() => onVerifyManualPayment(o.id)}
                            className="block rounded bg-purple-600/20 px-2 py-1 text-[10px] font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-600/30"
                          >
                            Authorize Manual Audit
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {o.fulfillmentStatus === 'DELIVERED' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Dispatched
                          </span>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-400 max-w-[120px] truncate">
                              {o.deliveredPayload}
                            </span>
                            <button
                              onClick={() => copyToClipboard(o.deliveredPayload, o.id)}
                              className="text-slate-400 hover:text-white"
                              title="Copy payload"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">
                          {o.status === 'PAYMENT_SUCCESSFUL' ? 'Fulfilling...' : 'Pending Payment'}
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
