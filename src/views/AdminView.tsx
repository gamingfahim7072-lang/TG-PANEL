import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  DollarSign,
  Bot,
  Crown,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  FileText,
  Sliders,
  AlertCircle,
  Save,
  Check
} from 'lucide-react';
import { AuditLog, ResellerApplication } from '../types';
import { api } from '../api';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'USERS' | 'RESELLERS' | 'LOGS' | 'SETTINGS'>('STATS');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [resellers, setResellers] = useState<ResellerApplication[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLog, setSearchLog] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadTabContent();
  }, [activeTab]);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'STATS') {
        const res = await api.getAdminStats();
        if (res.stats) setStats(res.stats);
      } else if (activeTab === 'USERS') {
        const res = await api.getAdminUsers();
        if (res.users) setUsers(res.users);
      } else if (activeTab === 'RESELLERS') {
        const res = await api.getAdminResellers();
        if (res.applications) setResellers(res.applications);
      } else if (activeTab === 'LOGS') {
        const res = await api.getAdminAuditLogs(searchLog);
        if (res.logs) setLogs(res.logs);
      } else if (activeTab === 'SETTINGS') {
        const res = await api.getAdminSettings();
        if (res.settings) setSettings(res.settings);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.updateAdminUserRole(userId, { role: newRole });
      setSuccessMsg('User role updated successfully.');
      setTimeout(() => setSuccessMsg(null), 2500);
      loadTabContent();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleUpdateResellerStatus = async (appId: string, status: string, commissionRate: number) => {
    try {
      await api.updateAdminResellerStatus(appId, { status, commission_rate: commissionRate });
      setSuccessMsg(`Reseller application ${status.toLowerCase()} successfully.`);
      setTimeout(() => setSuccessMsg(null), 2500);
      loadTabContent();
    } catch (err: any) {
      alert(err.message || 'Failed to update reseller status');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings(settings);
      setSuccessMsg('System configurations saved.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-black text-white">Super Admin Management Console</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30">
              ROOT ACCESS
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            System-wide user control, tenant supervision, reseller approval, and live security audit logs.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 font-bold">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto pb-1">
        {[
          { id: 'STATS', label: 'Platform Metrics', icon: DollarSign },
          { id: 'USERS', label: 'User Directory & Roles', icon: Users },
          { id: 'RESELLERS', label: 'Reseller Approvals', icon: Shield },
          { id: 'LOGS', label: 'Security Audit Logs', icon: FileText },
          { id: 'SETTINGS', label: 'Global Platform Config', icon: Sliders }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shrink-0 transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Stats */}
      {activeTab === 'STATS' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold">Total Platform Users</div>
            <div className="text-2xl font-black text-white mt-2">{stats.totalUsers}</div>
          </div>
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold">Total Connected Store Bots</div>
            <div className="text-2xl font-black text-cyan-400 mt-2">{stats.totalBots}</div>
          </div>
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold">Total Platform GMV Revenue</div>
            <div className="text-2xl font-black text-emerald-400 mt-2">
              ${stats.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold">Active Subscriptions</div>
            <div className="text-2xl font-black text-amber-400 mt-2">{stats.activeSubscriptions}</div>
          </div>
        </div>
      )}

      {/* Tab 2: Users Directory */}
      {activeTab === 'USERS' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Reseller Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Modify Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{u.full_name}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'SUPER ADMIN'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : u.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : u.role === 'RESELLER'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">{u.reseller_status}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        onChange={e => handleUpdateRole(u.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 outline-none"
                      >
                        <option value="CUSTOMER">Customer</option>
                        <option value="RESELLER">Reseller</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER ADMIN">Super Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Resellers Approvals */}
      {activeTab === 'RESELLERS' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            {resellers.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No reseller applications submitted yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Business & Telegram</th>
                    <th className="py-3 px-4">Experience Info</th>
                    <th className="py-3 px-4">Commission</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {resellers.map(app => (
                    <tr key={app.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{app.user_name}</div>
                        <div className="text-[11px] text-slate-400">{app.user_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{app.business_name}</div>
                        <div className="text-[11px] text-cyan-400 font-mono">{app.telegram_handle}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-300 text-[11px]">
                        {app.experience_info || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400 font-mono">
                        {app.commission_rate}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : app.status === 'REJECTED'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {app.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateResellerStatus(app.id, 'APPROVED', 25)}
                              className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateResellerStatus(app.id, 'REJECTED', 0)}
                              className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 p-3 rounded-2xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchLog}
                onChange={e => {
                  setSearchLog(e.target.value);
                  api.getAdminAuditLogs(e.target.value).then(res => {
                    if (res.logs) setLogs(res.logs);
                  });
                }}
                placeholder="Search audit trail by action (LOGIN, BOT_CONNECT, ORDER_DELIVERY)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-sans">Timestamp</th>
                    <th className="py-3 px-4 font-sans">User</th>
                    <th className="py-3 px-4 font-sans">Action</th>
                    <th className="py-3 px-4 font-sans">Resource</th>
                    <th className="py-3 px-4 font-sans">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-cyan-400">{log.user_email || 'SYSTEM'}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{log.action}</td>
                      <td className="py-2.5 px-4 text-slate-300">{log.resource_type}</td>
                      <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Settings */}
      {activeTab === 'SETTINGS' && (
        <form onSubmit={handleSaveSettings} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4 max-w-xl">
          <h2 className="text-sm font-bold text-white">Global Platform Configuration</h2>
          {settings.map((s, idx) => (
            <div key={s.key}>
              <label className="text-xs font-semibold text-slate-300 mb-1 block uppercase font-mono">
                {s.key.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                value={s.value}
                onChange={e => {
                  const updated = [...settings];
                  updated[idx].value = e.target.value;
                  setSettings(updated);
                }}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>
          ))}
          <button
            type="submit"
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Configurations</span>
          </button>
        </form>
      )}
    </div>
  );
};
