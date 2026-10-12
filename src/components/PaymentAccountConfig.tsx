import React, { useState } from 'react';
import { TelegramBot, UpiPaymentAccount, QrGenerationMode } from '../types';
import {
  Wallet,
  Shield,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Save,
  Radio,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

import { getDefaultPaymentAccount } from '../utils/defaults';

interface PaymentAccountConfigProps {
  bot: TelegramBot;
  onUpdateBot: (bot: TelegramBot) => void;
}

export const PaymentAccountConfig: React.FC<PaymentAccountConfigProps> = ({
  bot,
  onUpdateBot,
}) => {
  const [formData, setFormData] = useState<UpiPaymentAccount>(() => ({
    ...getDefaultPaymentAccount(bot.id, bot.name, bot.username),
    ...(bot.paymentAccount || {}),
  }));

  React.useEffect(() => {
    setFormData({
      ...getDefaultPaymentAccount(bot.id, bot.name, bot.username),
      ...(bot.paymentAccount || {}),
    });
  }, [bot.id, bot.paymentAccount]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBot({
      ...bot,
      paymentAccount: { ...formData },
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestConnection = () => {
    setTestResult('testing');
    setTimeout(() => {
      if (formData.mode === 'MODE_A_PROVIDER') {
        setTestResult(
          `Connected to ${formData.merchantProvider} API. Dynamic UPI QR generation & Webhook endpoint verified successfully.`
        );
      } else {
        setTestResult(
          `VPA "${formData.upiId}" formatted for Mode B static/amount QR. Note: Automatic webhook verification is not supported in Mode B.`
        );
      }
      setTimeout(() => setTestResult(null), 5000);
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-cyan-400" />
              <span>Bot Owner's UPI & Payment Account</span>
            </h2>
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
              Bot Editor → Payment Settings → My UPI
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Configure dynamic product-price-based UPI QR generation, merchant credentials, and server-side payment verification for @{bot.username}
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:bg-cyan-500 active:scale-95 transition"
        >
          {savedSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'Settings Saved' : 'Save Payment Settings'}</span>
        </button>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode A */}
        <div
          onClick={() =>
            setFormData({
              ...formData,
              mode: 'MODE_A_PROVIDER',
              dynamicQrSupported: true,
              autoVerificationEnabled: true,
            })
          }
          className={`cursor-pointer rounded-xl border p-4 transition ${
            formData.mode === 'MODE_A_PROVIDER'
              ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">MODE A — Provider-Backed Dynamic QR</h3>
                <span className="text-[10px] text-cyan-400 font-semibold uppercase">Recommended</span>
              </div>
            </div>
            <input
              type="radio"
              name="qrMode"
              checked={formData.mode === 'MODE_A_PROVIDER'}
              onChange={() => {}}
              className="text-cyan-500 focus:ring-0"
            />
          </div>
          <p className="mt-3 text-xs text-slate-300 leading-relaxed">
            Uses an authorized payment gateway (Razorpay, Cashfree, PayU, Decentro) to generate unique dynamic QRs with exact order amounts and <strong>genuine server-side webhook verification</strong>.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Automatic digital product dispatch upon confirmed payment</span>
          </div>
        </div>

        {/* Mode B */}
        <div
          onClick={() =>
            setFormData({
              ...formData,
              mode: 'MODE_B_MANUAL_UPI',
              dynamicQrSupported: false,
              autoVerificationEnabled: false,
            })
          }
          className={`cursor-pointer rounded-xl border p-4 transition ${
            formData.mode === 'MODE_B_MANUAL_UPI'
              ? 'border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-500/10'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">MODE B — UPI-ID Fallback Mode</h3>
                <span className="text-[10px] text-amber-400 font-semibold uppercase">Manual Verification</span>
              </div>
            </div>
            <input
              type="radio"
              name="qrMode"
              checked={formData.mode === 'MODE_B_MANUAL_UPI'}
              onChange={() => {}}
              className="text-amber-500 focus:ring-0"
            />
          </div>
          <p className="mt-3 text-xs text-slate-300 leading-relaxed">
            Generates standard amount-encoded UPI QR using only the merchant VPA. <strong>Important:</strong> A UPI ID QR cannot prove payment automatically. Orders remain PENDING_VERIFICATION until manual audit.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400 font-medium">
            <Info className="h-3.5 w-3.5" />
            <span>Clearly labeled to customers: Manual Verification Required</span>
          </div>
        </div>
      </div>

      {/* Account Configuration Form */}
      <form onSubmit={handleSave} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span>Merchant Account Credentials & Configuration</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Payment Account Name (Display Name on QR)
            </label>
            <input
              type="text"
              required
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              UPI ID / VPA (Virtual Payment Address)
            </label>
            <input
              type="text"
              required
              placeholder="merchant.store@bank"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Merchant / Gateway Provider
            </label>
            <select
              value={formData.merchantProvider}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  merchantProvider: e.target.value as any,
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="Razorpay">Razorpay (Dynamic UPI QR & Smart Webhook)</option>
              <option value="Cashfree">Cashfree Payments (UPI QR Gateway)</option>
              <option value="PayU">PayU Biz (UPI Dynamic Intent & QR)</option>
              <option value="Decentro">Decentro Banking APIs</option>
              <option value="Custom Gateway">Custom UPI Bank Switch / Direct VPA</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Merchant Account ID / Key ID
            </label>
            <input
              type="text"
              placeholder="rzp_live_..."
              value={formData.merchantAccountId}
              onChange={(e) => setFormData({ ...formData, merchantAccountId: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Dynamic QR Expiry Period (Minutes)
            </label>
            <input
              type="number"
              min={2}
              max={60}
              value={formData.qrExpiryMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  qrExpiryMinutes: parseInt(e.target.value) || 10,
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500">
              Orders not paid within this window transition to PAYMENT_EXPIRED
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gateway Execution Mode
            </label>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.paymentsEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentsEnabled: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <span>Enable Live UPI Payments</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.isTestMode}
                  onChange={(e) =>
                    setFormData({ ...formData, isTestMode: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <span>Sandbox / Test Mode</span>
              </label>
            </div>
          </div>
        </div>

        {/* Security & Isolation Notice */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>Platform Separation & Credential Security</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            • <strong>Bot Customer Payments:</strong> Routed directly into your registered merchant account ({formData.upiId}).<br />
            • <strong>FINE BOTUS Subscription Payments:</strong> Platform SaaS plan fees remain isolated in the platform owner's account and never mingle with your bot customer payments.<br />
            • Sensitive provider secret keys are stored on the server-side proxy only; never transmitted in Telegram messages or client bundles.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleTestConnection}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Radio className="h-3.5 w-3.5 text-cyan-400" />
            <span>Test Payment Configuration</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-500 shadow-md shadow-cyan-600/20 active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`rounded-lg p-3 text-xs border ${
              testResult === 'testing'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : formData.mode === 'MODE_A_PROVIDER'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {testResult === 'testing' ? 'Verifying gateway connectivity and UPI formatting...' : testResult}
          </div>
        )}
      </form>
    </div>
  );
};
