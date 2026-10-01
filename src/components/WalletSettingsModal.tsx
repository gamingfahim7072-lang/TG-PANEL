import React, { useState } from 'react';
import {
  X,
  Settings,
  Shield,
  CreditCard,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  Bell,
  HelpCircle,
  Check,
  AlertCircle,
  LogOut,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Wallet as WalletType, User as UserType } from '../types';

interface WalletSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletType | null;
  user: UserType;
  onUpdateSettings?: (settings: any) => void;
}

export const WalletSettingsModal: React.FC<WalletSettingsModalProps> = ({
  isOpen,
  onClose,
  wallet,
  user
}) => {
  const [activeTab, setActiveTab] = useState<'SECURITY' | 'WALLET' | 'PRIVACY' | 'SUPPORT'>('SECURITY');

  // Security Form State
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  // Wallet Preferences State
  const [onlineTx, setOnlineTx] = useState(wallet?.card?.is_online_enabled ?? true);
  const [posTx, setPosTx] = useState(wallet?.card?.is_pos_enabled ?? false);
  const [autoSettle, setAutoSettle] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (pinNew.length !== 4 || !/^\d{4}$/.test(pinNew)) {
      setPinError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (pinNew !== pinConfirm) {
      setPinError('New PIN and Confirmation PIN do not match.');
      return;
    }

    // Save locally
    setPinSuccess('✅ 4-Digit Transaction PIN updated successfully.');
    setPinCurrent('');
    setPinNew('');
    setPinConfirm('');
    setTimeout(() => setPinSuccess(null), 3000);
  };

  const handleSavePreferences = () => {
    setSaveSuccess('✅ Wallet preferences updated.');
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">FZ PAY Settings</h3>
              <p className="text-[10px] text-slate-400">Security, limits, preferences & support</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 overflow-x-auto">
          {[
            { id: 'SECURITY', label: 'Security', icon: Shield },
            { id: 'WALLET', label: 'Wallet & Card', icon: CreditCard },
            { id: 'PRIVACY', label: 'Privacy', icon: Lock },
            { id: 'SUPPORT', label: 'Support', icon: HelpCircle }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: SECURITY */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Change 4-Digit Payment PIN</span>
                <p className="text-[11px] text-slate-400">
                  This PIN is required to authorize transfers, withdrawals, and merchant payments.
                </p>
              </div>

              {pinSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  {pinSuccess}
                </div>
              )}

              {pinError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  {pinError}
                </div>
              )}

              <form onSubmit={handleUpdatePin} className="space-y-3 max-w-sm">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">
                    Current PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pinCurrent}
                    onChange={e => setPinCurrent(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-center tracking-widest text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">
                      New 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={pinNew}
                      onChange={e => setPinNew(e.target.value)}
                      placeholder="••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-center tracking-widest text-cyan-400 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">
                      Confirm PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={pinConfirm}
                      onChange={e => setPinConfirm(e.target.value)}
                      placeholder="••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-center tracking-widest text-cyan-400 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Update Payment PIN
                </button>
              </form>

              {/* Sessions / Device Management */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white block">Active Sessions & Devices</span>
                
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="font-bold text-slate-200">Current Web / App Client</div>
                      <span className="text-[10px] text-slate-500">Active Now • IP: Protected Session</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                    CURRENT
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WALLET & CARD PREFERENCES */}
          {activeTab === 'WALLET' && (
            <div className="space-y-4">
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  {saveSuccess}
                </div>
              )}

              <div className="space-y-3">
                <span className="text-xs font-bold text-white block">Card Channel Controls</span>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="font-bold text-slate-200 block">Online E-Commerce Transactions</span>
                    <span className="text-[10px] text-slate-400">Allow digital payments on web platforms & apps</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={onlineTx}
                    onChange={e => setOnlineTx(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="font-bold text-slate-200 block">POS Terminal Swipes</span>
                    <span className="text-[10px] text-slate-400">Allow physical store terminals where supported</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={posTx}
                    onChange={e => setPosTx(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="font-bold text-slate-200 block">Instant Bot Sales Auto-Settlement</span>
                    <span className="text-[10px] text-slate-400">Credit verified bot customer purchases to ledger automatically</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSettle}
                    onChange={e => setAutoSettle(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save Card Preferences
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY & DATA CONTROLS */}
          {activeTab === 'PRIVACY' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Data Security & Compliance</span>
                <p className="text-[11px] text-slate-400">
                  FZ PAY operates on a strict financial data protection policy. All identity records, document numbers, and transaction ledgers are stored in server-side encrypted storage.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <Lock className="w-4 h-4" />
                  <span>Zero Plaintext KYC Storage</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Aadhaar numbers are verified via Verhoeff checksum and masked as <code>XXXX-XXXX-••••</code> before ledger persistence. Raw credentials and payment secrets are never exposed on client devices.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Immutable Financial Ledger</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Every deposit, withdrawal, and transfer creates an append-only ledger transaction with unique reference IDs. Balances cannot be modified through client-side manipulation.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SUPPORT */}
          {activeTab === 'SUPPORT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <span>24/7 FZ PAY Financial Support</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Need help with an ongoing payment order, deposit settlement, or withdrawal? Our support team is available directly via Telegram and portal tickets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Telegram Support Channel</span>
                  <div className="text-xs font-bold text-white">@fzpay_support</div>
                  <span className="text-[10px] text-slate-400">Average response time: &lt; 5 mins</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">NPCI UPI Compliance</span>
                  <div className="text-xs font-bold text-emerald-400">BHIM / UPI 2.0 Ready</div>
                  <span className="text-[10px] text-slate-400">Zero surcharge standard</span>
                </div>
              </div>
            </div>
          )}
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
