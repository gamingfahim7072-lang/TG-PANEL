import React, { useState, useEffect } from 'react';
import { Users, DollarSign, ShoppingCart, Wallet, Search, Plus, Minus, CheckCircle, AlertCircle } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../api';

interface CustomersViewProps {
  botId: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ botId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletAction, setWalletAction] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [botId]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers(botId || undefined);
      if (res.customers) setCustomers(res.customers);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !walletAmount) return;

    const amt = parseFloat(walletAmount);
    if (isNaN(amt) || amt <= 0) return;

    setUpdating(true);
    try {
      const res = await api.adjustCustomerWallet(selectedCust.id, amt, walletAction);
      if (res.customer) {
        setCustomers(customers.map(c => (c.id === res.customer.id ? res.customer : c)));
        setSelectedCust(null);
        setWalletAmount('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust wallet balance');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = customers.filter(
    c =>
      c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.username?.toLowerCase().includes(search.toLowerCase()) ||
      c.telegram_id.includes(search)
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white">Telegram Customers CRM</h1>
        <p className="text-xs md:text-sm text-slate-400">
          Track customer engagement, lifetime spend, wallet credit balances, and order history.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0f172a] border border-slate-800 p-3 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, Telegram username or ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading customer CRM...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500">No customers found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Telegram ID</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Lifetime Spend</th>
                  <th className="py-3 px-4">Wallet Balance</th>
                  <th className="py-3 px-4">First Joined</th>
                  <th className="py-3 px-4 text-right">Wallet Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {c.first_name} {c.last_name || ''}
                      </div>
                      <div className="text-[11px] text-cyan-400 font-mono">
                        {c.username ? `@${c.username}` : 'No username'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{c.telegram_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{c.total_purchases}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ${c.total_spent.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      ${c.wallet_balance.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedCust(c)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                      >
                        <Wallet className="w-3 h-3" />
                        <span>Adjust Balance</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Adjust Wallet Balance Modal */}
      {selectedCust && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Adjust Customer Wallet</h3>
            <p className="text-xs text-slate-400">
              Customer: <strong>{selectedCust.first_name}</strong> (Current Balance: ${selectedCust.wallet_balance.toFixed(2)})
            </p>

            <form onSubmit={handleAdjustWallet} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWalletAction('ADD')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1 ${
                    walletAction === 'ADD'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Credit / Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWalletAction('DEDUCT')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1 ${
                    walletAction === 'DEDUCT'
                      ? 'bg-red-500/10 border-red-500 text-red-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Debit / Deduct</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={walletAmount}
                  onChange={e => setWalletAmount(e.target.value)}
                  placeholder="10.00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCust(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
