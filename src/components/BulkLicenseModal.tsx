import React, { useState, useEffect } from 'react';
import { X, Key, Plus, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react';
import { LicenseKey, Product } from '../types';
import { api } from '../api';

interface BulkLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onStockUpdated: () => void;
}

export const BulkLicenseModal: React.FC<BulkLicenseModalProps> = ({
  isOpen,
  onClose,
  product,
  onStockUpdated
}) => {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [rawKeys, setRawKeys] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      loadKeys();
      setRawKeys('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await api.getProductLicenses(product.id);
      if (res.keys) setKeys(res.keys);
    } catch (err: any) {
      setError(err.message || 'Failed to load license keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawKeys.trim()) return;

    setAdding(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.addBulkLicenses(product.id, rawKeys.trim());
      setSuccessMsg(`Successfully added ${res.addedCount} new license keys.`);
      setRawKeys('');
      await loadKeys();
      onStockUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to add keys.');
    } finally {
      setAdding(false);
    }
  };

  const availableCount = keys.filter(k => !k.is_redeemed).length;
  const redeemedCount = keys.filter(k => k.is_redeemed).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">License Key Inventory</h2>
              <p className="text-xs text-slate-400 font-mono truncate max-w-sm">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Keys</div>
              <div className="text-lg font-bold text-white mt-0.5">{keys.length}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Available Stock</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{availableCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-500">Redeemed / Sold</div>
              <div className="text-lg font-bold text-slate-400 mt-0.5">{redeemedCount}</div>
            </div>
          </div>

          {/* Add Bulk Keys Form */}
          <form onSubmit={handleAddBulk} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Import Bulk Keys to Pool</span>
              <span className="text-[10px] text-slate-400">
                {rawKeys.split('\n').filter(k => k.trim()).length} keys entered
              </span>
            </div>
            <textarea
              rows={4}
              value={rawKeys}
              onChange={e => setRawKeys(e.target.value)}
              placeholder="Paste license keys here (one key per line)...&#10;KEY-AAAA-BBBB-CCCC&#10;KEY-DDDD-EEEE-FFFF"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:border-cyan-500 outline-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={adding || !rawKeys.trim()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-40 flex items-center space-x-1.5"
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Keys to Pool</span>
              </button>
            </div>
          </form>

          {/* Existing Keys Table */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2">Current Key Pool</div>
            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading pool...</div>
              ) : keys.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No keys added yet. Add some above.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">License Key</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Added Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {keys.map(k => (
                      <tr key={k.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-200">{k.license_key}</td>
                        <td className="py-2 px-3">
                          {k.is_redeemed ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-sans">
                              Redeemed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-sans font-bold">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-sans text-[10px]">
                          {new Date(k.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
