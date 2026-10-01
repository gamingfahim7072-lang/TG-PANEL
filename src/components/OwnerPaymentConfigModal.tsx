import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  CreditCard,
  Building,
  Save,
  Check
} from 'lucide-react';
import { api } from '../api';

interface OwnerPaymentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export const OwnerPaymentConfigModal: React.FC<OwnerPaymentConfigModalProps> = ({
  isOpen,
  onClose,
  userRole
}) => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: string;
    message: string;
    details?: any;
  } | null>(null);

  const [selectedProvider, setSelectedProvider] = useState('UPI');
  const [merchantVpa, setMerchantVpa] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [environment, setEnvironment] = useState<'TEST' | 'LIVE'>('LIVE');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = userRole === 'OWNER' || userRole === 'SUPER ADMIN' || userRole === 'ADMIN';

  const loadConfig = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.getOwnerPaymentConfig();
      if (res.success && res.config) {
        setConfig(res.config);
        setSelectedProvider(res.config.provider || 'UPI');
        setMerchantVpa(res.config.raw_vpa || '');
        setMerchantId(res.config.merchant_account || '');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load payment provider configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setErrorMessage('');
      const res = await api.testOwnerPaymentConnection(selectedProvider);
      if (res.success && res.result) {
        setTestResult(res.result);
        if (config) {
          setConfig({
            ...config,
            status: res.result.status
          });
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'FAILED',
        message: err.message || 'Connection test failed. Check network or server configuration.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage('');
      setSaveSuccess(false);
      const res = await api.updateOwnerPaymentConfig({
        provider: selectedProvider,
        merchantVpa: merchantVpa.trim(),
        merchantId: merchantId.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        apiSecret: apiSecret.trim() || undefined,
        environment
      });
      if (res.success) {
        setConfig(res.config);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update payment provider configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            PENDING
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <AlertCircle className="w-3.5 h-3.5" />
            SUSPENDED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 border border-slate-500/30 text-slate-400">
            NOT_CONFIGURED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#131b2e] to-[#0c101c] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Neon Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  OWNER CONTROLS
                </span>
                <span className="text-xs text-slate-400">Restricted Access</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">FZ PAY Payment Provider</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {!isOwner ? (
            <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-center text-red-300 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
              <p className="font-bold">Access Restricted</p>
              <p className="text-xs text-red-300/80">Only system Owners and Super Administrators can inspect or configure payment gateway provider credentials.</p>
            </div>
          ) : loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <p className="text-xs font-medium">Fetching verified payment provider infrastructure...</p>
            </div>
          ) : (
            <>
              {/* Status & Overview Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Rail</p>
                    <p className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                      <span>{config?.provider_name || config?.provider || 'Official UPI Rail'}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Provider Status</p>
                    {getStatusBadge(config?.status || 'NOT_CONFIGURED')}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Merchant / Account:</span>
                    <span className="font-mono text-slate-200 bg-slate-950/60 px-2 py-1 rounded border border-slate-800 block">
                      {config?.merchant_account || '********'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">VPA / UPI Destination:</span>
                    <span className="font-mono text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/40 block">
                      {config?.vpa_upi || '********@provider'}
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons: TEST CONNECTION & REFRESH STATUS */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>TEST CONNECTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={loadConfig}
                    disabled={loading}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>REFRESH STATUS</span>
                  </button>
                </div>

                {/* Live Test Result Banner */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      testResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.details && (
                      <pre className="text-[11px] font-mono bg-black/40 p-2 rounded text-slate-300 overflow-x-auto">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Edit Provider Configuration Form */}
              <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
                <div className="border-t border-slate-800 pt-4">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-400" />
                    <span>Configure Payment Rail & Destination</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Selected Provider
                    </label>
                    <select
                      value={selectedProvider}
                      onChange={e => setSelectedProvider(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="UPI">Official UPI Merchant Gateway (Recommended)</option>
                      <option value="RAZORPAY">Razorpay PG (Live / Webhook)</option>
                      <option value="SANDBOX">Sandbox / Simulator Rail (Testing)</option>
                    </select>
                  </div>

                  {/* Environment */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Environment
                    </label>
                    <select
                      value={environment}
                      onChange={e => setEnvironment(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="LIVE">Live Production</option>
                      <option value="TEST">Sandbox / Test Mode</option>
                    </select>
                  </div>

                  {/* Merchant VPA / Payable Destination */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Official Merchant VPA / UPI ID (Payment Destination)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={merchantVpa}
                        onChange={e => setMerchantVpa(e.target.value)}
                        placeholder="e.g. fzpay.merchant@icici or merchant@okaxis"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Must be a valid bank/PSP registered VPA. Customer QR codes and UPI links will direct settlements to this verified destination.
                    </p>
                  </div>

                  {/* Razorpay specific fields */}
                  {selectedProvider === 'RAZORPAY' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Razorpay Key ID
                        </label>
                        <input
                          type="text"
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="rzp_live_..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Razorpay Key Secret
                        </label>
                        <input
                          type="password"
                          value={apiSecret}
                          onChange={e => setApiSecret(e.target.value)}
                          placeholder="Enter secret (kept server-side)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Success Banner */}
                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Payment provider configuration updated and secured successfully.</span>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Settings</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
