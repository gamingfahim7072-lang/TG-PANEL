import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  CheckCircle,
  AlertCircle,
  Key,
  Download,
  Filter,
  Eye,
  RotateCcw
} from 'lucide-react';
import { Order } from '../types';
import { api } from '../api';

interface OrdersViewProps {
  botId: string;
  onSelectOrder: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ botId, onSelectOrder }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [botId, statusFilter, search]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({
        bot_id: botId || undefined,
        status: statusFilter || undefined,
        search: search || undefined
      });
      if (res.orders) setOrders(res.orders);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white">Orders & Automated Deliveries</h1>
        <p className="text-xs md:text-sm text-slate-400">
          Track customer transactions, inspect delivered license keys, and manage refunds.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#0f172a] border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID, customer name or Telegram ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500">No matching orders found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Fulfillment</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {orders.map(order => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-cyan-400 text-[11px]">
                      #{order.id.slice(0, 10)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{order.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {order.customer_telegram_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      <div>{order.product_name}</div>
                      <div className="text-[10px] text-slate-500">Qty: {order.quantity}</div>
                    </td>
                    <td className="py-3 px-4">
                      {order.delivered_content ? (
                        <span className="font-mono text-[11px] text-slate-300 max-w-[140px] truncate block bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {order.delivered_content}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">File / Secret</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ${order.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {order.payment_provider}
                    </td>
                    <td className="py-3 px-4">
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
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
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
