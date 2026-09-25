import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Key,
  FileText,
  UploadCloud,
  MessageSquare,
  DollarSign,
  AlertCircle,
  Loader2,
  Check,
  Plus,
  Trash2,
  Clock,
  Layers
} from 'lucide-react';
import { Product, ProductCategory, ProductPackage } from '../types';
import { api } from '../api';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  categories: ProductCategory[];
  productToEdit?: Product | null;
  onProductSaved: (product: Product) => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  botId,
  categories,
  productToEdit,
  onProductSaved
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('499');
  const [currency, setCurrency] = useState('INR');
  const [categoryId, setCategoryId] = useState('');
  const [deliveryType, setDeliveryType] = useState<'LICENSE_KEY' | 'DIGITAL_FILE' | 'CUSTOM_MESSAGE'>('LICENSE_KEY');
  const [customMessage, setCustomMessage] = useState('');
  const [initialKeys, setInitialKeys] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Duration / Package Variants Tiers
  const [packages, setPackages] = useState<Array<{ id?: string; name: string; duration_days: number; price: number; currency: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setDescription(productToEdit.description);
      setPrice(productToEdit.price.toString());
      setCurrency(productToEdit.currency || 'INR');
      setCategoryId(productToEdit.category_id || '');
      setDeliveryType((productToEdit.delivery_type as any) || 'LICENSE_KEY');
      setCustomMessage(productToEdit.custom_message || '');
      setInitialKeys('');
      setFileToUpload(null);

      // Load existing packages
      if (productToEdit.packages && productToEdit.packages.length > 0) {
        setPackages(productToEdit.packages.map(p => ({
          id: p.id,
          name: p.name,
          duration_days: p.duration_days || 30,
          price: p.price,
          currency: p.currency || productToEdit.currency || 'INR'
        })));
      } else {
        setPackages([]);
      }
    } else {
      setName('');
      setDescription('');
      setPrice('499');
      setCurrency('INR');
      setCategoryId(categories[0]?.id || '');
      setDeliveryType('LICENSE_KEY');
      setCustomMessage('');
      setInitialKeys('');
      setFileToUpload(null);
      setPackages([]);
    }
    setError(null);
  }, [productToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const handleAddPackage = () => {
    setPackages([
      ...packages,
      {
        name: `${packages.length === 0 ? '1 Month Plan' : packages.length === 1 ? '3 Months Plan' : '1 Year Plan'}`,
        duration_days: packages.length === 0 ? 30 : packages.length === 1 ? 90 : 365,
        price: parseFloat(price) || 499,
        currency
      }
    ]);
  };

  const handleUpdatePackage = (index: number, field: string, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const handleDeletePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please provide a valid non-negative price.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let savedProduct: Product;

      if (productToEdit) {
        const res = await api.updateProduct(productToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          price: numPrice,
          currency,
          category_id: categoryId || undefined,
          delivery_type: deliveryType,
          custom_message: deliveryType === 'CUSTOM_MESSAGE' ? customMessage : undefined
        });
        savedProduct = res.product;

        if (deliveryType === 'LICENSE_KEY' && initialKeys.trim()) {
          await api.addBulkLicenses(productToEdit.id, initialKeys.trim());
        }

        if (deliveryType === 'DIGITAL_FILE' && fileToUpload) {
          await api.uploadProductFile(productToEdit.id, fileToUpload);
        }
      } else {
        const res = await api.createProduct({
          bot_id: botId,
          category_id: categoryId || undefined,
          name: name.trim(),
          description: description.trim(),
          price: numPrice,
          currency,
          delivery_type: deliveryType,
          custom_message: deliveryType === 'CUSTOM_MESSAGE' ? customMessage : undefined,
          initial_keys: deliveryType === 'LICENSE_KEY' ? initialKeys : undefined
        });
        savedProduct = res.product;

        if (deliveryType === 'DIGITAL_FILE' && fileToUpload && res.product?.id) {
          await api.uploadProductFile(res.product.id, fileToUpload);
        }
      }

      // Save/create any defined package tiers for this product
      if (savedProduct?.id && packages.length > 0) {
        for (const pkg of packages) {
          if (!pkg.id) {
            await api.createProductPackage(savedProduct.id, {
              bot_id: botId,
              name: pkg.name,
              duration_days: pkg.duration_days,
              price: pkg.price,
              currency: pkg.currency || currency,
              delivery_type: deliveryType,
              custom_message: customMessage || undefined
            });
          }
        }
      }

      onProductSaved(savedProduct);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              {productToEdit ? 'Edit Digital Product' : 'Create Digital Product'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Product Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Netflix Ultra HD 4K"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="">-- No Category (General) --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Product Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Instant automated delivery upon payment. 100% genuine..."
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>

          {/* Pricing & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Base Price <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="USDT">USDT (Crypto)</option>
              </select>
            </div>
          </div>

          {/* Duration & Package Tiers Section */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Duration Tiers & Packages (Optional)</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  Allow buyers to select 1-Month, 3-Month, 1-Year or Custom Tiers.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPackage}
                className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] rounded-lg border border-cyan-500/30 flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Tier</span>
              </button>
            </div>

            {packages.length > 0 && (
              <div className="space-y-2">
                {packages.map((pkg, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={e => handleUpdatePackage(idx, 'name', e.target.value)}
                      placeholder="e.g. 1 Month"
                      className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white outline-none focus:border-cyan-500"
                    />

                    <div className="w-20 flex items-center space-x-1">
                      <input
                        type="number"
                        min="1"
                        value={pkg.duration_days}
                        onChange={e => handleUpdatePackage(idx, 'duration_days', parseInt(e.target.value) || 30)}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white outline-none focus:border-cyan-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">d</span>
                    </div>

                    <div className="w-24 flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pkg.price}
                        onChange={e => handleUpdatePackage(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-cyan-300 font-bold outline-none focus:border-cyan-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">{currency}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePackage(idx)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">
              Automated Delivery Fulfillment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType('LICENSE_KEY')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center ${
                  deliveryType === 'LICENSE_KEY'
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Key className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">License Keys</span>
                <span className="text-[9px] opacity-70">Single-use stock pool</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('DIGITAL_FILE')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center ${
                  deliveryType === 'DIGITAL_FILE'
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <UploadCloud className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">Digital File</span>
                <span className="text-[9px] opacity-70">PDF, ZIP, software</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('CUSTOM_MESSAGE')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center ${
                  deliveryType === 'CUSTOM_MESSAGE'
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <MessageSquare className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">Custom Secret</span>
                <span className="text-[9px] opacity-70">Link, credential, guide</span>
              </button>
            </div>
          </div>

          {/* Delivery Configuration Details */}
          {deliveryType === 'LICENSE_KEY' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Add Stock License Keys (One per line)
                </label>
                <span className="text-[10px] text-slate-400">
                  {initialKeys.split('\n').filter(k => k.trim()).length} keys ready
                </span>
              </div>
              <textarea
                rows={3}
                value={initialKeys}
                onChange={e => setInitialKeys(e.target.value)}
                placeholder="XXXXX-XXXXX-XXXXX-001&#10;XXXXX-XXXXX-XXXXX-002&#10;XXXXX-XXXXX-XXXXX-003"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:border-cyan-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Each key is dispensed only once and automatically marked redeemed in the database upon successful payment.
              </p>
            </div>
          )}

          {deliveryType === 'DIGITAL_FILE' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Upload Product File
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-cyan-500 transition-colors bg-slate-900/40">
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <input
                  type="file"
                  id="product-file-input"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setFileToUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="product-file-input"
                  className="cursor-pointer text-xs font-bold text-cyan-400 hover:underline block"
                >
                  {fileToUpload ? fileToUpload.name : 'Click to select file'}
                </label>
                <span className="text-[10px] text-slate-500">
                  Supports ZIP, PDF, APK, EXE, TXT, EPUB (Max 50MB)
                </span>
              </div>
            </div>
          )}

          {deliveryType === 'CUSTOM_MESSAGE' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Custom Delivery Secret Message / Link
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Thank you for your purchase! Access your VIP private channel here: https://t.me/+private_link"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{productToEdit ? 'Update Product' : 'Publish Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
