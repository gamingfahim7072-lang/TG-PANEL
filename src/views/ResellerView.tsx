import React, { useState, useEffect } from 'react';
import {
  Share2,
  DollarSign,
  Users,
  Copy,
  CheckCircle,
  ExternalLink,
  Shield,
  Loader2,
  Sparkles
} from 'lucide-react';
import { User } from '../types';
import { api } from '../api';

interface ResellerViewProps {
  user: User;
}

export const ResellerView: React.FC<ResellerViewProps> = ({ user }) => {
  const [stats, setStats] = useState<{
    code: string;
    link: string;
    count: number;
    totalEarnings: number;
    referrals: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Application form state
  const [bizName, setBizName] = useState('');
  const [tgHandle, setTgHandle] = useState('');
  const [experience, setExperience] = useState('');
  const [applying, setApplying] = useState(false);
  const [appSuccess, setAppSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.getReferralStats();
      setStats(res);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim() || !tgHandle.trim()) return;

    setApplying(true);
    try {
      const res = await api.applyReseller({
        business_name: bizName.trim(),
        telegram_handle: tgHandle.trim(),
        experience_info: experience.trim()
      });
      setAppSuccess(res.message || 'Application submitted for review!');
    } catch (err: any) {
      alert(err.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const copyLink = () => {
    if (!stats?.link) return;
    navigator.clipboard.writeText(stats.link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    if (!stats?.code) return;
    navigator.clipboard.writeText(stats.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white">Reseller & Referral Partner Program</h1>
        <p className="text-xs md:text-sm text-slate-400">
          Earn recurring commissions by referring merchants to TeleSell SaaS or becoming an approved Reseller.
        </p>
      </div>

      {/* Referral Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs font-semibold text-slate-400">Total Referred Merchants</div>
          <div className="text-2xl font-black text-white mt-2">{stats?.count || 0}</div>
          <div className="text-[11px] text-cyan-400 font-semibold mt-1">Active Accounts</div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs font-semibold text-slate-400">Total Partner Earnings</div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            ${(stats?.totalEarnings || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">
            {user.reseller_commission_rate || 20}% recurring commission
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs font-semibold text-slate-400">Partner Status</div>
          <div className="text-xl font-black text-white mt-2 flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                user.role === 'RESELLER' || user.reseller_status === 'APPROVED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}
            >
              {user.role === 'RESELLER' ? 'APPROVED RESELLER' : user.reseller_status || 'STANDARD PARTNER'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Instant monthly payouts</div>
        </div>
      </div>

      {/* Referral Link & Code Box */}
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white">Your Unique Referral Credentials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Partner Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={stats?.link || ''}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono outline-none"
              />
              <button
                onClick={copyLink}
                className="px-3.5 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400 transition-colors shrink-0"
              >
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Referral Code</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={stats?.code || ''}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-cyan-400 font-bold font-mono outline-none"
              />
              <button
                onClick={copyCode}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0"
              >
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reseller Application Form (If not already approved) */}
      {user.role !== 'RESELLER' && user.reseller_status !== 'APPROVED' && (
        <div className="bg-gradient-to-br from-[#0f172a] to-indigo-950/20 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Apply for Authorized Reseller Tier</h2>
              <p className="text-xs text-slate-400">
                Unlock wholesale discounted margins, white-label client stores, and higher commission tiers.
              </p>
            </div>
          </div>

          {appSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 font-bold">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{appSuccess}</span>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Agency / Business Name</label>
                  <input
                    type="text"
                    required
                    value={bizName}
                    onChange={e => setBizName(e.target.value)}
                    placeholder="e.g. Apex Digital Growth"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Telegram Contact Handle</label>
                  <input
                    type="text"
                    required
                    value={tgHandle}
                    onChange={e => setTgHandle(e.target.value)}
                    placeholder="@apex_growth"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Audience / Experience Info
                </label>
                <textarea
                  rows={2}
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  placeholder="We run a 50k subscriber Telegram channel and manage multiple software communities..."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={applying}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>Submit Reseller Application</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
