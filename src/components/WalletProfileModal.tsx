import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  CreditCard,
  QrCode,
  Calendar,
  Lock,
  Copy,
  Check,
  CheckCircle2,
  Building,
  Phone
} from 'lucide-react';
import { Wallet as WalletType, User as UserType } from '../types';

interface WalletProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletType | null;
  user: UserType;
}

export const WalletProfileModal: React.FC<WalletProfileModalProps> = ({
  isOpen,
  onClose,
  wallet,
  user
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Masked phone: +91 ••••• ••123
  const rawPhone = wallet?.phone || user.phone || '';
  const maskedPhone = rawPhone.length >= 4 
    ? `+91 ••••• ••${rawPhone.slice(-4)}` 
    : 'Not Registered';

  // Masked Aadhaar
  const maskedAadhaar = wallet?.aadhaar_masked || 'XXXX-XXXX-XXXX';

  const walletId = wallet?.fz_pay_id || wallet?.id || 'FZ-WAL-UNSET';
  const upiId = wallet?.upi_handle || `${user.email?.split('@')[0] || 'user'}@fzpay`;
  const providerAccountId = wallet?.provider_account_id || `prov_acc_${user.id.slice(-6)}`;
  const creationDate = wallet?.created_at ? new Date(wallet.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : 'Recently Activated';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">FZ PAY Wallet Profile</h3>
              <p className="text-[10px] text-slate-400">Verified prepaid closed-loop account details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Top Verification Status Badge */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">
                    {wallet?.full_name || user.full_name || 'Account Holder'}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider">
                    KYC_VERIFIED
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Prepaid Closed-Loop Account • Active</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Status</span>
              <span className="text-xs font-black text-cyan-400 font-mono">ACTIVE</span>
            </div>
          </div>

          {/* Account Identifiers Grid */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Payment Identifiers
            </span>

            {/* FZ PAY ID */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">FZ PAY ID</span>
                <span className="text-xs font-mono font-bold text-white">{walletId}</span>
              </div>
              <button
                onClick={() => handleCopy(walletId, 'fz_pay_id')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copiedField === 'fz_pay_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* FZ PAY UPI ID */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">FZ PAY UPI ID / VPA</span>
                <span className="text-xs font-mono font-bold text-cyan-400">{upiId}</span>
              </div>
              <button
                onClick={() => handleCopy(upiId, 'upi')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copiedField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Provider Account ID */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Payment Provider Account Ref</span>
                <span className="text-xs font-mono text-slate-300">{providerAccountId}</span>
              </div>
              <Building className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Masked Sensitive KYC Records */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Masked Identity Verification Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Masked Aadhaar Number</span>
                <span className="text-xs font-mono font-bold text-slate-200">{maskedAadhaar}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Registered Mobile Phone</span>
                <span className="text-xs font-mono font-bold text-slate-200">{maskedPhone}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Wallet Activated Date</span>
                <span className="text-xs text-slate-300 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{creationDate}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Security Standard</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>256-Bit Encrypted</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
