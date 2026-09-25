import React, { useState } from 'react';
import { Bot, Lock, Mail, User, Shield, AlertCircle, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const res = await api.login({ email: email.trim(), password });
        if (res.user) onSuccess(res.user);
      } else {
        const res = await api.register({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          referral_code: referralCode.trim() || undefined
        });
        if (res.user) onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ email: roleEmail, password: rolePass });
      if (res.user) onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#070b14]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="p-6 text-center border-b border-slate-800 bg-gradient-to-b from-slate-900 to-[#0f172a]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/25">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">TeleSell SaaS Platform</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automate Telegram Digital Commerce & Instant Key Delivery
          </p>
        </div>

        {/* 1-Click Quick Demo Sign In Bar */}
        <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>1-Click Instant Demo Login:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@telesell.io', 'Admin123!')}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-[11px] font-bold text-cyan-400 transition-all text-center"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('merchant@telesell.io', 'Merchant123!')}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-[11px] font-bold text-emerald-400 transition-all text-center"
            >
              💼 Merchant
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('reseller@telesell.io', 'Reseller123!')}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-[11px] font-bold text-amber-400 transition-all text-center"
            >
              🤝 Reseller
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${
              isLogin ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${
              !isLogin ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Referral / Partner Code (Optional)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                placeholder="e.g. PARTNER10"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{isLogin ? 'Sign In to Dashboard' : 'Create Free Account'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
