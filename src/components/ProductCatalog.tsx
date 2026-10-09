import React, { useState } from 'react';
import { DigitalProduct, ProductType } from '../types';
import {
  Package,
  Plus,
  Key,
  Flame,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Upload,
  AlertCircle,
  Eye,
  FileCode,
  Users
} from 'lucide-react';

interface ProductCatalogProps {
  products: DigitalProduct[];
  botId: string;
  onSaveProduct: (product: DigitalProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onAddKeys: (productId: string, keys: string[]) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  botId,
  onSaveProduct,
  onDeleteProduct,
  onAddKeys,
}) => {
  const [selectedProductForKeys, setSelectedProductForKeys] = useState<DigitalProduct | null>(null);
  const [keysInput, setKeysInput] = useState('');
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<DigitalProduct> | null>(null);

  const botProducts = products.filter((p) => p.botId === botId);

  const handleOpenAdd = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      botId,
      title: '',
      description: '',
      type: 'license_key',
      priceUsd: 19.99,
      priceStars: 1000,
      priceTon: 3.5,
      stockType: 'key_pool',
      availableKeys: [],
      soldKeysCount: 0,
      badge: 'New',
      active: true,
    });
    setIsEditingModalOpen(true);
  };

  const handleOpenEdit = (p: DigitalProduct) => {
    setEditingProduct({ ...p });
    setIsEditingModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.title) return;
    onSaveProduct(editingProduct as DigitalProduct);
    setIsEditingModalOpen(false);
    setEditingProduct(null);
  };

  const handleBulkAddKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForKeys || !keysInput.trim()) return;
    const splitKeys = keysInput
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    onAddKeys(selectedProductForKeys.id, splitKeys);
    setKeysInput('');
    setSelectedProductForKeys(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-400" />
            <span>Digital Products & Key Inventory</span>
          </h2>
          <p className="text-xs text-slate-400">
            Manage serial license key pools, subscription channels, and automated dispatch items
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-600/20 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add Digital Product
        </button>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {botProducts.map((p) => {
          const isPool = p.stockType === 'key_pool';
          const stockWarning = isPool && p.availableKeys.length <= 2;

          return (
            <div
              key={p.id}
              className={`flex flex-col justify-between rounded-xl border bg-slate-900/90 p-4 transition ${
                stockWarning
                  ? 'border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-800 p-2 text-cyan-400 border border-slate-700">
                      {p.type === 'license_key' && <Key className="h-4 w-4" />}
                      {p.type === 'vip_channel' && <Users className="h-4 w-4" />}
                      {p.type === 'digital_file' && <FileCode className="h-4 w-4" />}
                      {p.type === 'account_credential' && <Users className="h-4 w-4" />}
                    </span>
                    <div>
                      {p.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                          {p.badge}
                        </span>
                      )}
                      <h3 className="font-semibold text-sm text-slate-100 line-clamp-1">{p.title}</h3>
                    </div>
                  </div>

                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      p.active ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                    title={p.active ? 'Active on Bot' : 'Disabled'}
                  />
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-400 line-clamp-2">
                  {p.description}
                </p>

                {/* Stock Details */}
                <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Stock Status:</span>
                    {isPool ? (
                      <span
                        className={`font-mono font-bold ${
                          stockWarning ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {p.availableKeys.length} keys in pool
                      </span>
                    ) : (
                      <span className="text-sky-400 font-medium">Automatic / Unlimited</span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Delivered Total:</span>
                    <span className="text-slate-200 font-semibold">{p.soldKeysCount} sold</span>
                  </div>
                </div>

                {/* Pricing Tiers */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-semibold">
                  <div className="text-slate-200">${p.priceUsd} USD</div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Flame className="h-3 w-3" />
                    <span>{p.priceStars} Stars</span>
                  </div>
                  <div className="text-sky-400 font-mono text-[11px]">{p.priceTon} TON</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                {isPool && (
                  <button
                    onClick={() => setSelectedProductForKeys(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white border border-slate-700"
                  >
                    <Upload className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Refill Keys</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title="Edit product"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteProduct(p.id)}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-rose-400 hover:bg-rose-950/40"
                  title="Delete product"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refill Keys Modal */}
      {selectedProductForKeys && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="h-5 w-5 text-cyan-400" />
                  <span>Refill License Key Pool</span>
                </h3>
                <p className="text-xs text-slate-400">{selectedProductForKeys.title}</p>
              </div>
              <button
                onClick={() => setSelectedProductForKeys(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Current Remaining Keys:</span>
                <span className="font-bold text-emerald-400">
                  {selectedProductForKeys.availableKeys.length}
                </span>
              </div>
              {selectedProductForKeys.availableKeys.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {selectedProductForKeys.availableKeys.map((k, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-800"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleBulkAddKeys} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paste New Serial Keys (One key per line)
                </label>
                <textarea
                  rows={5}
                  value={keysInput}
                  onChange={(e) => setKeysInput(e.target.value)}
                  placeholder={`XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY\nZZZZ-ZZZZ-ZZZZ-ZZZZ`}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProductForKeys(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-600/20"
                >
                  Confirm & Append Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Add Product Modal */}
      {isEditingModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingProduct.id?.startsWith('prod-') ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.title || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Delivery Type
                  </label>
                  <select
                    value={editingProduct.type}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        type: e.target.value as ProductType,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="license_key">License Key (Pool)</option>
                    <option value="vip_channel">VIP Channel / Group Pass</option>
                    <option value="digital_file">Download Link / Archive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    value={editingProduct.badge || ''}
                    placeholder="e.g. Best Seller, 50% Off"
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, badge: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.priceUsd || 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        priceUsd: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Stars Price ⭐
                  </label>
                  <input
                    type="number"
                    value={editingProduct.priceStars || 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        priceStars: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    TON Price 💎
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.priceTon || 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        priceTon: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={editingProduct.active ?? true}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, active: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-0"
                />
                <label htmlFor="activeCheck" className="text-xs text-slate-300">
                  Publish to Telegram Bot Storefront immediately
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 shadow-md shadow-cyan-600/20"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
