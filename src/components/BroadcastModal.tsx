import React, { useState } from 'react';
import { X, Radio, Send, Users, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api';
import { Broadcast } from '../types';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  onBroadcastCreated: (broadcast: Broadcast) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  botId,
  onBroadcastCreated
}) => {
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'ACTIVE_BUYERS' | 'ZERO_PURCHASES'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !messageText.trim()) {
      setError('Title and message text are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createBroadcast({
        bot_id: botId,
        title: title.trim(),
        message_text: messageText.trim(),
        media_url: mediaUrl.trim() || undefined,
        message_type: mediaUrl.trim() ? 'PHOTO' : 'TEXT',
        target_audience: targetAudience
      });

      if (res.broadcast) {
        onBroadcastCreated(res.broadcast);
        onClose();
        setTitle('');
        setMessageText('');
        setMediaUrl('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch broadcast campaign.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Create Broadcast Campaign</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Campaign Internal Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekend Flash Sale 50% Off"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Target Audience Segment
            </label>
            <select
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Telegram Subscribers</option>
              <option value="ACTIVE_BUYERS">Active Paying Customers (1+ Purchases)</option>
              <option value="ZERO_PURCHASES">Leads with 0 Purchases</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Broadcast Message Content (Markdown Supported) <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              required
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="🚀 *FLASH SALE IS LIVE!*&#10;&#10;Use promo code `WEEKEND50` to get 50% discount on all digital licenses!&#10;&#10;Tap /products to order now."
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Media Image URL (Optional)
            </label>
            <input
              type="url"
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              placeholder="https://example.com/promo-banner.jpg"
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>

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
                  <span>Dispatching Queue...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Launch Broadcast</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
