import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Key,
  UploadCloud,
  MessageSquare,
  Search,
  Tag,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Boxes
} from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { api } from '../api';

interface ProductsViewProps {
  botId: string;
  onOpenCreateProduct: (productToEdit?: Product | null) => void;
  onOpenLicensePool: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  botId,
  onOpenCreateProduct,
  onOpenLicensePool
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [botId, selectedCategory, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts({ bot_id: botId || undefined, category_id: selectedCategory || undefined, search: search || undefined }),
        api.getCategories(botId || undefined)
      ]);
      if (prodRes.products) setProducts(prodRes.products);
      if (catRes.categories) setCategories(catRes.categories);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({ bot_id: botId, name: newCatName.trim() });
      setNewCatName('');
      setShowCatModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Digital Products & Inventory</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Fulfill orders with automated single-use license keys, downloadable files, or custom guides.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowCatModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            <span>+ Category</span>
          </button>

          <button
            onClick={() => onOpenCreateProduct(null)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Digital Product</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#0f172a] border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products by title or description..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading product catalog...</div>
      ) : products.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Products In Store</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add your first software license, digital file, or secret guide to start selling.
            </p>
          </div>
          <button
            onClick={() => onOpenCreateProduct(null)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Digital Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div
              key={p.id}
              className="bg-[#0f172a] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-colors relative"
            >
              <div>
                {/* Type Pill & Category */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {p.category_name || 'General'}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                      p.delivery_type === 'LICENSE_KEY'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : p.delivery_type === 'DIGITAL_FILE'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {p.delivery_type === 'LICENSE_KEY' && <Key className="w-3 h-3" />}
                    {p.delivery_type === 'DIGITAL_FILE' && <UploadCloud className="w-3 h-3" />}
                    {p.delivery_type === 'CUSTOM_MESSAGE' && <MessageSquare className="w-3 h-3" />}
                    <span>{p.delivery_type.replace('_', ' ')}</span>
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-sm font-bold text-white mb-1 truncate">{p.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {p.description || 'Automated 24/7 delivery.'}
                </p>
              </div>

              {/* Pricing & Stock Card */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block">Price</span>
                    <span className="text-base font-black text-white">
                      ${p.price.toFixed(2)} <span className="text-xs font-normal text-slate-400">{p.currency}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block">Inventory</span>
                    {p.delivery_type === 'LICENSE_KEY' ? (
                      <span
                        className={`text-xs font-bold ${
                          (p.keys_available || 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {p.keys_available ?? p.stock_count} keys ready
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-cyan-400">Unlimited stock</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {p.delivery_type === 'LICENSE_KEY' ? (
                    <button
                      onClick={() => onOpenLicensePool(p)}
                      className="py-1.5 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center space-x-1"
                    >
                      <Key className="w-3 h-3" />
                      <span>Manage Keys</span>
                    </button>
                  ) : (
                    <div className="py-1.5 px-2.5 text-center text-[10px] text-slate-500 border border-slate-800 rounded-lg flex items-center justify-center">
                      Auto-Fulfill
                    </div>
                  )}

                  <div className="flex items-center space-x-1 justify-end">
                    <button
                      onClick={() => onOpenCreateProduct(p)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Creation Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Create New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <input
                type="text"
                required
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Antivirus & VPNs"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
