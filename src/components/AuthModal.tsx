import React, { useState, useEffect } from 'react';
import {
  Bot,
  Lock,
  Mail,
  User,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RotateCw,
  KeyRound,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { api } from '../api';
import { User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'admin'>('signin');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

  // Form Fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(300);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  if (!isOpen) return null;

  // Handle Send OTP
  const handleSendOtp = async (purpose: 'REGISTER' | 'LOGIN') => {
    if (!emailOrPhone.trim()) {
      setError('Please enter your email address or phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.sendOtp({
        identifier: emailOrPhone.trim(),
        purpose,
        channel: emailOrPhone.includes('@') ? 'EMAIL' : 'SMS'
      });

      setOtpSent(true);
      setOtpCooldown(res.resendCooldown || 60);
      setOtpExpiry(res.expiresInSeconds || 300);
      setSuccessMessage(res.message || 'Verification code sent successfully.');
      if (res.devCode) {
        setDevCodeHint(res.devCode);
        // Pre-fill for ultra smooth testing
        setOtpCode(res.devCode);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle User Registration with OTP
  const handleRegisterWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !emailOrPhone.trim()) {
      setError('Please provide your full name and email.');
      return;
    }
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.registerWithOtp({
        email: emailOrPhone.trim(),
        full_name: fullName.trim(),
        code: otpCode.trim(),
        password: password.trim() || undefined,
        referral_code: referralCode.trim() || undefined
      });

      if (res.user) {
        setSuccessMessage('Account created successfully! Welcome to FZ Panel.');
        setTimeout(() => onSuccess(res.user), 600);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle User Sign In (Password or OTP)
  const handleUserSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      setError('Email or username is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (loginMethod === 'otp') {
        if (!otpCode.trim()) {
          setError('Please enter the verification code.');
          setLoading(false);
          return;
        }
        const res = await api.verifyOtp({
          identifier: emailOrPhone.trim(),
          code: otpCode.trim(),
          purpose: 'LOGIN'
        });
        if (res.user) {
          onSuccess(res.user);
        }
      } else {
        if (!password) {
          setError('Password is required.');
          setLoading(false);
          return;
        }
        const res = await api.login({
          email: emailOrPhone.trim(),
          password
        });
        if (res.user) {
          onSuccess(res.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Protected Admin/Owner Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password) {
      setError('Administrator credentials are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.adminLogin({
        email: emailOrPhone.trim(),
        password
      });
      if (res.user) {
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Administrator authentication denied.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060a12]/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="p-6 text-center border-b border-slate-800 bg-gradient-to-b from-slate-900 to-[#0f172a] relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/25">
            <span className="text-xl font-black tracking-tighter text-white">FZ</span>
          </div>

          <h1 className="text-xl font-black text-white tracking-tight">
            {mode === 'admin' ? 'FZ PANEL — ADMIN ENCLAVE' : 'FZ PANEL'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'admin'
              ? 'Authorized Administrator & Owner Access Only'
              : 'Automated Telegram Bot SaaS & Key Delivery Engine'}
          </p>
        </div>

        {/* User Navigation Tabs (Only visible in User Mode) */}
        {mode !== 'admin' && (
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Admin Header Bar when in Admin mode */}
        {mode === 'admin' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300 font-semibold">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Restricted Root Management Portal</span>
            </div>
            <button
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
            >
              Back to User Login
            </button>
          </div>
        )}

        {/* Alerts & Messages */}
        <div className="px-6 pt-4 space-y-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {devCodeHint && (
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
              <span className="font-mono">Security OTP Code: <strong className="text-white text-sm">{devCodeHint}</strong></span>
              <span className="text-[10px] text-slate-400">Valid 5 min</span>
            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* MODE: CREATE ACCOUNT (SIGN UP WITH OTP)   */}
        {/* ========================================= */}
        {mode === 'signup' && (
          <form onSubmit={handleRegisterWithOtp} className="p-6 space-y-4">
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
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address or Phone</label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    placeholder="user@example.com or +123456789"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || otpCooldown > 0 || !emailOrPhone.trim()}
                  onClick={() => handleSendOtp('REGISTER')}
                  className="px-3.5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 disabled:opacity-50 text-cyan-400 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  {otpCooldown > 0 ? `${otpCooldown}s` : otpSent ? 'Resend' : 'Send OTP'}
                </button>
              </div>
            </div>

            {/* OTP Code Input */}
            {otpSent && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-cyan-400">Enter 6-Digit OTP</label>
                  <span className="text-[10px] text-slate-400">One-time code</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-cyan-500/50 rounded-xl text-xs text-white tracking-widest font-mono text-center font-bold focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Account Password (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters (or use OTP sign-in)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Referral Code (Optional)</label>
              <input
                type="text"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                placeholder="FZUSER..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !otpSent}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-[#070b14] font-black rounded-xl text-xs tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying & Creating...</span>
                </>
              ) : (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================= */}
        {/* MODE: SIGN IN (PASSWORD OR OTP)          */}
        {/* ========================================= */}
        {mode === 'signin' && (
          <form onSubmit={handleUserSignIn} className="p-6 space-y-4">
            {/* Method Toggle: Password vs OTP */}
            <div className="flex items-center justify-center p-1 bg-slate-900 rounded-xl border border-slate-800 space-x-1">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  loginMethod === 'password'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('otp');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  loginMethod === 'otp'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Instant OTP Login
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                {loginMethod === 'otp' ? 'Email or Mobile Number' : 'Email Address / Username'}
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                  />
                </div>
                {loginMethod === 'otp' && (
                  <button
                    type="button"
                    disabled={loading || otpCooldown > 0 || !emailOrPhone.trim()}
                    onClick={() => handleSendOtp('LOGIN')}
                    className="px-3.5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 disabled:opacity-50 text-cyan-400 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    {otpCooldown > 0 ? `${otpCooldown}s` : otpSent ? 'Resend' : 'Send Code'}
                  </button>
                )}
              </div>
            </div>

            {loginMethod === 'password' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('otp')}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-cyan-400 mb-1 block">6-Digit OTP Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter code"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-cyan-500/50 rounded-xl text-xs text-white tracking-widest font-mono text-center font-bold focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (loginMethod === 'otp' && !otpCode.trim())}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-[#070b14] font-black rounded-xl text-xs tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================= */}
        {/* MODE: ADMIN & OWNER EXCLUSIVE PORTAL     */}
        {/* ========================================= */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Admin Email / Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  placeholder="admin@telesell.io or owner@telesell.io"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Master Admin Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Authenticating Privileges...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Verify Administrator Access</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer with Discreet Portal Access */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>FZ Panel v2.0 • Secured by SHA-256</span>
          {mode !== 'admin' ? (
            <button
              type="button"
              onClick={() => {
                setMode('admin');
                setError(null);
                setSuccessMessage(null);
                setEmailOrPhone('');
                setPassword('');
              }}
              className="text-slate-500 hover:text-amber-400 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Administrator and Owner Access"
            >
              <Shield className="w-3 h-3 text-amber-500/70" />
              <span>Admin Portal</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              User Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
