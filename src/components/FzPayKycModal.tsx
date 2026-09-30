import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  Smartphone,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import { Wallet } from '../types';

interface FzPayKycModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (wallet: Wallet) => void;
  userFullName?: string;
  userPhone?: string;
}

export const FzPayKycModal: React.FC<FzPayKycModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userFullName = '',
  userPhone = ''
}) => {
  const [fullName, setFullName] = useState(userFullName);
  const [aadhaar, setAadhaar] = useState('');
  const [phone, setPhone] = useState(userPhone);
  const [dob, setDob] = useState('2000-01-15');
  const [agreed, setAgreed] = useState(true);
  const [kycState, setKycState] = useState<'NOT_STARTED' | 'KYC_PENDING' | 'KYC_VERIFIED' | 'KYC_FAILED'>('NOT_STARTED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successWallet, setSuccessWallet] = useState<Wallet | null>(null);

  if (!isOpen) return null;

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    const parts = raw.match(/(\d{1,4})/g) || [];
    setAadhaar(parts.join('-'));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAadhaar = aadhaar.replace(/-/g, '');
    if (cleanAadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    if (cleanAadhaar[0] === '0' || cleanAadhaar[0] === '1') {
      setError('Invalid Aadhaar: Official Aadhaar numbers cannot begin with 0 or 1.');
      return;
    }

    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      setError('Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full legal name as per official government records.');
      return;
    }

    if (!dob) {
      setError('Please enter your Date of Birth.');
      return;
    }

    // Check age >= 18
    const birthDate = new Date(dob);
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (age < 18) {
      setError('You must be at least 18 years old to open an FZ PAY prepaid wallet.');
      return;
    }

    if (!agreed) {
      setError('Please accept the KYC terms and closed-loop prepaid wallet guidelines.');
      return;
    }

    setLoading(true);
    setKycState('KYC_PENDING');

    try {
      const res = await api.submitKyc({
        fullName: fullName.trim(),
        aadhaarNumber: cleanAadhaar,
        phone,
        dob
      });

      if (res.success && res.wallet) {
        setKycState('KYC_VERIFIED');
        setSuccessWallet(res.wallet);
        onSuccess(res.wallet);
      } else {
        setKycState('KYC_FAILED');
        setError(res.message || 'KYC verification failed.');
      }
    } catch (err: any) {
      setKycState('KYC_FAILED');
      setError(err.message || 'Failed to complete KYC verification with provider.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header with FamPay Style Banner */}
        <div className="relative p-6 bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold block">
                FZ PAY NEO-BANKING
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Create Your FZ PAY Wallet
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Fast, zero-fee digital wallet & virtual card designed like <strong>FamPay</strong>. 
            Operates on a secure internal ledger with <strong>NO connection to your personal bank account</strong>.
          </p>

          {/* FamPay Security Reassurance Pill Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>No Real Bank Link Required</span>
            </div>
            <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Encrypted Closed-Loop Ledger</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto">
          {successWallet ? (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase tracking-wider">
                  KYC_VERIFIED → FZ PAY WALLET ACTIVE
                </span>
                <h3 className="text-lg font-black text-white mt-2">FZ PAY Wallet Activated!</h3>
                <p className="text-xs text-emerald-400 font-semibold mt-1">
                  🎉 Provider KYC Verification Completed
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Your separate closed-loop wallet is active. Real UPI receiving and virtual card capabilities are enabled.
                </p>
              </div>

              {/* Provider & Wallet Account Identifiers Grid */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">FZ PAY ID</span>
                  <span className="text-xs font-bold text-white">{successWallet.fz_pay_id || successWallet.id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">FZ PAY UPI ID</span>
                  <span className="text-xs font-bold text-cyan-400">{successWallet.upi_handle}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Wallet ID</span>
                  <span className="text-xs text-slate-300">{successWallet.id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Provider Account</span>
                  <span className="text-xs text-slate-400 truncate block">{successWallet.provider_account_id || 'prov_acc_live'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">KYC Status</span>
                  <span className="text-xs font-bold text-emerald-400">KYC_VERIFIED</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Wallet Status</span>
                  <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
                </div>
              </div>

              {/* Virtual Card Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-cyan-500/40 text-left shadow-lg">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                  <span className="font-black text-cyan-400">FZ CARD</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="font-mono text-base font-bold text-white tracking-widest mb-3">
                  {successWallet.card?.card_number_masked || '5399 •••• •••• 9812'}
                </div>
                <div className="flex justify-between items-end text-[10px]">
                  <div>
                    <span className="text-slate-500 uppercase block font-semibold">Cardholder</span>
                    <span className="font-bold text-slate-200 uppercase">{successWallet.full_name || fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block font-semibold">UPI Tag</span>
                    <span className="font-mono text-cyan-400 font-bold">{successWallet.upi_handle}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Open FZ PAY Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Legal Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Full Legal Name</span>
                  <span className="text-[10px] text-slate-500 font-normal">As on official Aadhaar</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                  />
                  <UserCheck className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              {/* 12-Digit Aadhaar */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>12-Digit Aadhaar Number</span>
                  <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Masked & encrypted
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={aadhaar}
                    onChange={handleAadhaarChange}
                    placeholder="1234-5678-9012"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-400 tracking-wider placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                  />
                  <CreditCard className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Required by financial regulations to open a separate prepaid wallet.
                </p>
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Mobile Phone Number</span>
                  <span className="text-[10px] text-slate-500 font-normal">10-Digit Indian Phone</span>
                </label>
                <div className="relative flex">
                  <div className="px-3 py-2.5 bg-slate-900 border border-r-0 border-slate-800 rounded-l-xl text-xs font-bold text-slate-400 select-none">
                    +91
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-r-xl text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                  />
                  <Smartphone className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Date of Birth</span>
                  <span className="text-[10px] text-amber-400 font-normal">Must be 18+ years</span>
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>

              {/* Safe Banking Clarification Box */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-200 block mb-0.5">🔒 FamPay Architecture Guarantee:</span>
                This wallet does not debit or link to your personal savings/current bank account. Your funds remain in your internal FZ PAY prepaid balance.
              </div>

              {/* Regulatory Consent Checkbox */}
              <label className="flex items-start space-x-2.5 text-[11px] text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="leading-snug">
                  I agree to complete provider KYC verification and open an independent, closed-loop FZ PAY prepaid wallet separate from any personal bank accounts.
                </span>
              </label>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with KYC Provider (KYC_PENDING)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Verify & Create FZ PAY Wallet</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
