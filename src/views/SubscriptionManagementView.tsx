import React, { useState, useEffect } from 'react';
import {
  Crown,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Save,
  X,
  Check,
  RefreshCw,
  Gift,
  Settings,
  FileText,
  Copy,
  Sliders,
  DollarSign,
  TrendingUp,
  History,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { SubscriptionPlan, Subscription, SubscriptionSettings as SubSettingsType, User } from '../types';
import { api } from '../api';

interface SubscriptionManagementViewProps {
  user: User;
  onOpenCheckout?: () => void;
}

export const SubscriptionManagementView: React.FC<SubscriptionManagementViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'PLANS' | 'SUBSCRIBERS' | 'SETTINGS' | 'LOGS'>('PLANS');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SubSettingsType | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<SubscriptionPlan | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [extendingSub, setExtendingSub] = useState<Subscription | null>(null);
  const [cancellingSub, setCancellingSub] = useState<Subscription | null>(null);
  const [viewingSub, setViewingSub] = useState<Subscription | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form State for Create/Edit Plan
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number>(299);
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formDurationUnit, setFormDurationUnit] = useState<'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'>('DAYS');
  const [formDescription, setFormDescription] = useState('');
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formIsPopular, setFormIsPopular] = useState<boolean>(false);

  // Form State for Manual Grant
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPlanId, setGrantPlanId] = useState('');
  const [grantDuration, setGrantDuration] = useState<number>(30);
  const [grantDurationUnit, setGrantDurationUnit] = useState<'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'>('DAYS');
  const [grantNotes, setGrantNotes] = useState('');

  // Form State for Extend
  const [extendDays, setExtendDays] = useState<number>(30);
  const [cancelReason, setCancelReason] = useState('');

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'PLANS') {
        const res = await api.getAdminSubscriptionPlans();
        if (res.plans) setPlans(res.plans);
        if (res.settings) setSettings(res.settings);
      } else if (activeTab === 'SUBSCRIBERS') {
        const [subRes, uRes, pRes] = await Promise.all([
          api.getAdminSubscribers(),
          api.getAdminUsers(),
          api.getAdminSubscriptionPlans()
        ]);
        if (subRes.subscribers) setSubscribers(subRes.subscribers);
        if (uRes.users) setAllUsers(uRes.users);
        if (pRes.plans) setPlans(pRes.plans);
      } else if (activeTab === 'SETTINGS') {
        const res = await api.getSubscriptionSettings();
        if (res.settings) setSettings(res.settings);
      } else if (activeTab === 'LOGS') {
        const res = await api.getSubscriptionAuditLogs();
        if (res.logs) setAuditLogs(res.logs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetPlanForm = (planToEdit?: SubscriptionPlan) => {
    if (planToEdit) {
      setFormName(planToEdit.name);
      setFormPrice(planToEdit.price);
      setFormCurrency(planToEdit.currency || 'INR');
      setFormDuration(planToEdit.duration || 30);
      setFormDurationUnit(planToEdit.duration_unit || 'DAYS');
      setFormDescription(planToEdit.description || '');
      setFormFeatures([...(planToEdit.features || [])]);
      setFormStatus(planToEdit.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
      setFormDisplayOrder(planToEdit.display_order || 1);
      setFormIsPopular(!!planToEdit.is_popular);
    } else {
      setFormName('');
      setFormPrice(299);
      setFormCurrency(settings?.default_currency || 'INR');
      setFormDuration(30);
      setFormDurationUnit('DAYS');
      setFormDescription('');
      setFormFeatures([
        'Full Telegram Bot No-Code Builder',
        'Dynamic UPI & QR Automated Verification',
        'Digital License Keys Pool & Instant Delivery',
        'Multi-Tier Sub-Menus & Buttons',
        'Broadcast Campaign Dispatcher'
      ]);
      setFormStatus('ACTIVE');
      setFormDisplayOrder(plans.length + 1);
      setFormIsPopular(false);
    }
    setNewFeatureInput('');
  };

  const handleOpenCreateModal = () => {
    resetPlanForm();
    setEditingPlan(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    resetPlanForm(plan);
    setEditingPlan(plan);
    setShowCreateModal(true);
  };

  const handleAddFeature = () => {
    const trimmed = newFeatureInput.trim();
    if (trimmed && !formFeatures.includes(trimmed)) {
      setFormFeatures([...formFeatures, trimmed]);
      setNewFeatureInput('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== idx));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Plan name cannot be blank.');
      return;
    }
    if (formPrice < 0) {
      setError('Plan price must be a valid positive amount.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const payload = {
        name: formName.trim(),
        price: Number(formPrice),
        currency: formCurrency.toUpperCase(),
        duration: Number(formDuration),
        duration_unit: formDurationUnit,
        description: formDescription.trim(),
        features: formFeatures,
        status: formStatus,
        display_order: Number(formDisplayOrder),
        is_popular: formIsPopular
      };

      if (editingPlan) {
        await api.updateAdminSubscriptionPlan(editingPlan.id, payload);
        setSuccessMsg(`Plan "${payload.name}" updated successfully.`);
      } else {
        await api.createAdminSubscriptionPlan(payload);
        setSuccessMsg(`Plan "${payload.name}" created and published to live checkout.`);
      }

      setShowCreateModal(false);
      setEditingPlan(null);
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save subscription plan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    setActionLoading(true);
    setError(null);
    try {
      const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.toggleAdminSubscriptionPlanStatus(plan.id, newStatus);
      setSuccessMsg(`Plan "${plan.name}" is now ${newStatus}.`);
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle plan status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    const confirmPrompt = window.confirm(
      `Are you sure you want to delete/archive "${plan.name}"?\n\nIf it has past orders or active subscribers, it will be safely ARCHIVED to protect financial history without deleting past transactions.`
    );
    if (!confirmPrompt) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.deleteAdminSubscriptionPlan(plan.id);
      setSuccessMsg(res.message);
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete plan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId) {
      setError('Please select a target user.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.grantManualSubscription({
        targetUserId: grantUserId,
        planId: grantPlanId || undefined,
        duration: Number(grantDuration),
        duration_unit: grantDurationUnit,
        notes: grantNotes.trim() || undefined
      });

      setSuccessMsg(res.message);
      setShowGrantModal(false);
      setGrantNotes('');
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to grant subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteExtend = async () => {
    if (!extendingSub) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.extendSubscription({
        subscriptionId: extendingSub.id,
        daysToAdd: Number(extendDays)
      });
      setSuccessMsg(res.message);
      setExtendingSub(null);
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to extend subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteCancel = async () => {
    if (!cancellingSub) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.cancelSubscription({
        subscriptionId: cancellingSub.id,
        reason: cancelReason.trim() || undefined
      });
      setSuccessMsg(res.message);
      setCancellingSub(null);
      setCancelReason('');
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.updateSubscriptionSettings(settings);
      setSettings(res.settings);
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update subscription settings.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered views
  const filteredPlans = plans.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' ? true : p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredSubscribers = subscribers.filter(s => {
    const matchSearch = (s.user_email && s.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.user_name && s.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.plan_name && s.plan_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' ? true : s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate live stats
  const activeSubsCount = subscribers.filter(s => s.status === 'ACTIVE' || s.status === 'MANUAL_GRANT').length;
  const totalSubscribersCount = subscribers.length;
  const estimatedRevenue = subscribers
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                <span>Subscription Management</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold uppercase border border-amber-500/30">
                  OWNER CONSOLE
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Full dynamic control of plans, prices, durations, features, and active subscribers. Zero code edits required.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={async () => {
              const [uRes, pRes] = await Promise.all([api.getAdminUsers(), api.getAdminSubscriptionPlans()]);
              if (uRes.users) setAllUsers(uRes.users);
              if (pRes.plans) setPlans(pRes.plans);
              setShowGrantModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-md"
          >
            <Gift className="w-4 h-4 text-emerald-400" />
            <span>Manual Grant</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Plans</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {plans.filter(p => p.status === 'ACTIVE').length}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {plans.length} total tiers configured
          </span>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Subscribers</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {activeSubsCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {totalSubscribersCount} all-time records
          </span>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₹{estimatedRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Verified in FZ Payment Bank
          </span>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">System Status</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-black text-white flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ONLINE</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Dynamic checkout active
          </span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => { setActiveTab('PLANS'); setStatusFilter('ALL'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'PLANS'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Subscription Plans ({plans.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('SUBSCRIBERS'); setStatusFilter('ALL'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'SUBSCRIBERS'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Subscribers CRM ({subscribers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'SETTINGS'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Global Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'LOGS'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History</span>
          </button>
        </div>

        {/* Search & Filters */}
        {(activeTab === 'PLANS' || activeTab === 'SUBSCRIBERS') && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'PLANS' ? 'Search plans...' : 'Search email or user...'}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-44 sm:w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              {activeTab === 'PLANS' && <option value="ARCHIVED">Archived</option>}
              {activeTab === 'SUBSCRIBERS' && <option value="EXPIRED">Expired</option>}
              {activeTab === 'SUBSCRIBERS' && <option value="CANCELLED">Cancelled</option>}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: PLANS MANAGEMENT */}
      {activeTab === 'PLANS' && (
        <div className="space-y-6">
          {filteredPlans.length === 0 ? (
            <div className="p-12 text-center bg-[#0f172a] border border-slate-800 rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Subscription Plans Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No plans match your current search or filter. Create your first plan to start monetizing bot visual editing and features!
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                + Create Plan Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlans.map(plan => {
                const isArchived = plan.status === 'ARCHIVED';
                const isActive = plan.status === 'ACTIVE';

                return (
                  <div
                    key={plan.id}
                    className={`bg-[#0f172a] border rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                      isArchived
                        ? 'border-slate-800/60 opacity-60'
                        : isActive
                        ? 'border-slate-800 hover:border-amber-500/40 shadow-lg hover:shadow-amber-500/5'
                        : 'border-slate-800/80 bg-slate-900/30'
                    }`}
                  >
                    {plan.is_popular && (
                      <div className="absolute top-0 right-0 px-3 py-0.5 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-bl-xl shadow-md">
                        POPULAR TIER
                      </div>
                    )}

                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isArchived
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {plan.status}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400">
                          {plan.subscriber_count || 0} subscribers
                        </span>
                      </div>

                      {/* Plan Title & Price */}
                      <h3 className="text-lg font-black text-white">{plan.name}</h3>

                      <div className="my-3 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-white font-mono">
                          {plan.currency === 'USD' ? '$' : plan.currency === 'EUR' ? '€' : '₹'}
                          {plan.price}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          / {plan.duration} {plan.duration_unit?.toLowerCase()}
                        </span>
                      </div>

                      {plan.description && (
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{plan.description}</p>
                      )}

                      {/* Features List */}
                      <div className="space-y-2 py-3 border-t border-slate-800/80 my-2">
                        {(plan.features || []).slice(0, 5).map((f, i) => (
                          <div key={i} className="flex items-center space-x-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="line-clamp-1">{f}</span>
                          </div>
                        ))}
                        {(plan.features || []).length > 5 && (
                          <div className="text-[11px] text-slate-500 font-medium pl-5.5">
                            +{(plan.features || []).length - 5} additional features
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="pt-4 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Order: #{plan.display_order || 1}</span>
                        <span>ID: {plan.id}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <button
                          onClick={() => setViewingPlan(plan)}
                          className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(plan)}
                          disabled={actionLoading}
                          className="py-1.5 px-2 bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-transparent hover:border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          onClick={() => handleTogglePlanStatus(plan)}
                          disabled={actionLoading}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                          title={isActive ? 'Disable Plan' : 'Enable Plan'}
                        >
                          {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">{isActive ? 'Disable' : 'Enable'}</span>
                        </button>

                        <button
                          onClick={() => handleDeletePlan(plan)}
                          disabled={actionLoading}
                          className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                          title="Delete / Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBSCRIBERS CRM */}
      {activeTab === 'SUBSCRIBERS' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Active & Past Subscribers</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Records: {filteredSubscribers.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {filteredSubscribers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No subscriber records match your current criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Plan & Amount</th>
                    <th className="py-3 px-4">Origin</th>
                    <th className="py-3 px-4">Expires On</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubscribers.map(sub => {
                    const isExpired = sub.expiry_date && new Date(sub.expiry_date) < new Date();
                    const isActive = (sub.status === 'ACTIVE' || sub.status === 'MANUAL_GRANT') && !isExpired;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{sub.user_name || 'Customer'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{sub.user_email}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{sub.plan_name || 'Pro Tier'}</div>
                          <div className="text-[11px] text-emerald-400 font-mono">
                            {sub.amount > 0 ? `₹${sub.amount}` : 'Free / Granted'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {sub.is_manual ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              🎁 MANUAL GRANT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              🏦 FZ PAYMENT BANK
                            </span>
                          )}
                          {sub.order_id && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {sub.order_id}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className={isActive ? 'text-white' : 'text-red-400'}>
                            {new Date(sub.expiry_date).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(sub.expiry_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isExpired
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : sub.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setViewingSub(sub)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setExtendingSub(sub);
                                setExtendDays(30);
                              }}
                              className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Extend Subscription"
                            >
                              Extend
                            </button>

                            {isActive && (
                              <button
                                onClick={() => {
                                  setCancellingSub(sub);
                                  setCancelReason('');
                                }}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[11px] font-bold cursor-pointer"
                                title="Cancel Subscription"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <form onSubmit={handleSaveSettings} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Subscription Engine Settings</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure master switch, billing currency, grace periods, and customer page visibility.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Master Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-bold text-white">Subscription Engine ON / OFF</div>
                <div className="text-[11px] text-slate-400">Allow users to view plans and subscribe</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(s => s ? { ...s, is_enabled: !s.is_enabled } : null)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings?.is_enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings?.is_enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Customer Page Visibility */}
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-bold text-white">Customer Subscription Page Visibility</div>
                <div className="text-[11px] text-slate-400">Display plans on the public / customer checkout modal</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(s => s ? { ...s, customer_page_visible: !s.customer_page_visible } : null)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings?.customer_page_visible ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings?.customer_page_visible ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Default Currency */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Default Currency</label>
                <select
                  value={settings?.default_currency || 'INR'}
                  onChange={e => setSettings(s => s ? { ...s, default_currency: e.target.value } : null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={settings?.grace_period_days || 0}
                  onChange={e => setSettings(s => s ? { ...s, grace_period_days: Number(e.target.value) } : null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* Payment Requirement */}
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-bold text-white">Require Verified Payment to Unlock Editor</div>
                <div className="text-[11px] text-slate-400">Strict verification via UPI / gateway before activating tier</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(s => s ? { ...s, require_payment: !s.require_payment } : null)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings?.require_payment ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings?.require_payment ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{actionLoading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'LOGS' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Subscription Audit Logs</h2>
            </div>
            <span className="text-xs text-slate-500">Live records</span>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No subscription audit records yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Admin</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-900/30">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.metadata?.admin || log.user_email || 'System'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-md truncate">
                        {JSON.stringify(log.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingPlan
                      ? 'Update pricing, durations, features, and active status'
                      : 'Define a new tier that customers can purchase'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSavePlan} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Plan Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Monthly Pro, Yearly VIP, 7-Day Trial"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Price <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex">
                    <select
                      value={formCurrency}
                      onChange={e => setFormCurrency(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-r-0 border-slate-800 rounded-l-xl text-xs text-white focus:outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formPrice}
                      onChange={e => setFormPrice(Number(e.target.value))}
                      placeholder="Price"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-r-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Value & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">
                    Duration Value <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formDuration}
                    onChange={e => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Duration Unit</label>
                  <select
                    value={formDurationUnit}
                    onChange={e => setFormDurationUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="DAYS">Days</option>
                    <option value="WEEKS">Weeks</option>
                    <option value="MONTHS">Months</option>
                    <option value="YEARS">Years</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Summary of what is included in this tier..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Dynamic Features Manager */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">Plan Features & Perks</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureInput}
                    onChange={e => setNewFeatureInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Type feature (e.g. Priority Support) and press Add"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Features Chips */}
                <div className="flex flex-wrap gap-2 pt-2 max-h-36 overflow-y-auto">
                  {formFeatures.map((feat, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-center space-x-1.5"
                    >
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(i)}
                        className="text-slate-500 hover:text-red-400 ml-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="ACTIVE">Active (Visible)</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formDisplayOrder}
                    onChange={e => setFormDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center sm:pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPopular}
                      onChange={e => setFormIsPopular(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-slate-300">Mark as Popular</span>
                  </label>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Price or duration changes will instantly apply to all new checkout sessions. Existing subscriptions and past orders retain their original historical terms.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : editingPlan ? 'Save Changes' : 'Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PLAN MODAL */}
      {viewingPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">{viewingPlan.name}</h3>
              </div>
              <button onClick={() => setViewingPlan(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Price</span>
                <span className="text-white font-bold font-mono">
                  {viewingPlan.currency} {viewingPlan.price}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Duration</span>
                <span className="text-white font-bold">
                  {viewingPlan.duration} {viewingPlan.duration_unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Status</span>
                <span className="text-emerald-400 font-bold">{viewingPlan.status}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Subscribers</span>
                <span className="text-cyan-400 font-bold font-mono">{viewingPlan.subscriber_count || 0}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">Included Features</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(viewingPlan.features || []).map((f, i) => (
                  <div key={i} className="flex items-center space-x-2 text-xs text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setViewingPlan(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MANUAL GRANT MODAL */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">🎁 Grant Manual Subscription</h3>
              </div>
              <button onClick={() => setShowGrantModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteGrant} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Select Target User</label>
                <select
                  required
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="">-- Choose User --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Select Subscription Plan</label>
                <select
                  value={grantPlanId}
                  onChange={e => {
                    setGrantPlanId(e.target.value);
                    const selected = plans.find(p => p.id === e.target.value);
                    if (selected) {
                      setGrantDuration(selected.duration);
                      setGrantDurationUnit(selected.duration_unit || 'DAYS');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="">-- Custom Duration / Default --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.duration} {p.duration_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Duration Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={grantDuration}
                    onChange={e => setGrantDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Duration Unit</label>
                  <select
                    value={grantDurationUnit}
                    onChange={e => setGrantDurationUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="DAYS">Days</option>
                    <option value="WEEKS">Weeks</option>
                    <option value="MONTHS">Months</option>
                    <option value="YEARS">Years</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Internal Notes (Optional)</label>
                <input
                  type="text"
                  value={grantNotes}
                  onChange={e => setGrantNotes(e.target.value)}
                  placeholder="e.g. VIP Partner grant, Promotional trial"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] text-purple-300">
                Notice: Manual grants are recorded with status `MANUAL_GRANT` and will NOT create fake payments in FZ Payment Bank ledger.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black shadow-md cursor-pointer"
                >
                  {actionLoading ? 'Granting...' : 'Confirm Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND SUBSCRIPTION MODAL */}
      {extendingSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Extend Subscription</h3>
              <button onClick={() => setExtendingSub(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Target User: <strong className="text-white">{extendingSub.user_email}</strong>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Current Expiry: {new Date(extendingSub.expiry_date).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-white block">Add Days</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 30, 90, 365].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      extendDays === d ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    +{d}d
                  </button>
                ))}
              </div>

              <input
                type="number"
                min={1}
                value={extendDays}
                onChange={e => setExtendDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setExtendingSub(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteExtend}
                disabled={actionLoading}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs"
              >
                {actionLoading ? 'Extending...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SUBSCRIPTION MODAL */}
      {cancellingSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Cancel Subscription</span>
              </h3>
              <button onClick={() => setCancellingSub(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to cancel the subscription for{' '}
              <strong className="text-white">{cancellingSub.user_email}</strong>?
            </p>

            <div>
              <label className="text-xs font-bold text-white block mb-1">Reason for cancellation</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Optional internal reason..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingSub(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleExecuteCancel}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl text-xs"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
