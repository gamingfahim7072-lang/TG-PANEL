import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Send,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { Broadcast } from '../types';
import { api } from '../api';

interface BroadcastsViewProps {
  botId: string;
  onOpenBroadcastModal: () => void;
}

export const BroadcastsView: React.FC<BroadcastsViewProps> = ({ botId, onOpenBroadcastModal }) => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBroadcasts();
    const interval = setInterval(loadBroadcasts, 10000);
    return () => clearInterval(interval);
  }, [botId]);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await api.getBroadcasts(botId || undefined);
      if (res.broadcasts) setBroadcasts(res.broadcasts);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleCancelBroadcast = async (id: string) => {
    try {
      await api.cancelBroadcast(id);
      loadBroadcasts();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel broadcast');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Broadcast Marketing Campaigns</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Dispatch mass promotions, stock alerts, and updates to all your Telegram bot subscribers.
          </p>
        </div>

        <button
          onClick={onOpenBroadcastModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast Campaign</span>
        </button>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading && broadcasts.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading campaigns...</div>
          ) : broadcasts.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500">
              No broadcast campaigns launched yet. Click "New Broadcast Campaign" to begin.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Delivery Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {broadcasts.map(b => {
                  const progressPct = b.total_recipients > 0 ? Math.round((b.sent_count / b.total_recipients) * 100) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{b.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{b.message_text}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {b.target_audience.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {b.sent_count} / {b.total_recipients}
                      </td>
                      <td className="py-3 px-4 w-44">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-500 h-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{progressPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : b.status === 'SENDING'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                              : b.status === 'QUEUED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(b.status === 'QUEUED' || b.status === 'SENDING') && (
                          <button
                            onClick={() => handleCancelBroadcast(b.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
