import React, { useState } from 'react';
import {
  User as UserIcon,
  Lock,
  Key,
  Shield,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Code
} from 'lucide-react';
import { User } from '../types';
import { api } from '../api';

interface SettingsViewProps {
  user: User;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setSuccess(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white">Account & Security Settings</h1>
        <p className="text-xs md:text-sm text-slate-400">
          Manage your account profile, password, security keys, and webhook endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Merchant Profile</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Full Name</span>
              <div className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium">
                {user.full_name}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Email Address</span>
              <div className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono">
                {user.email}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block mb-1">Assigned Role</span>
                <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold text-cyan-400">
                  {user.role}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Referral Code</span>
                <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-bold font-mono text-emerald-400">
                  {user.referral_code}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Update Password</h2>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Developer Webhooks Documentation & Guide */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center space-x-2.5">
          <Code className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Developer API & Telegram Webhooks</h2>
        </div>
        <p className="text-xs text-slate-400">
          TeleSell SaaS is fully integrated with official Telegram Bot API and multi-gateway webhooks.
        </p>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs text-slate-300">
          <div>
            <span className="text-cyan-400">POST</span> /api/telegram/webhook/:botId - Telegram official update ingress
          </div>
          <div>
            <span className="text-cyan-400">POST</span> /api/payments/webhook/:provider - Payment gateway verification
          </div>
          <div>
            <span className="text-cyan-400">GET</span> /api/health - Production health & uptime check
          </div>
        </div>
      </div>
    </div>
  );
};
