import React, { useState, useEffect } from 'react';
import {
  Bell,
  Bot,
  Crown,
  LogOut,
  Shield,
  User as UserIcon,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Zap,
  RefreshCw,
  Server
} from 'lucide-react';
import { User, Subscription, TelegramBot, Notification } from '../types';
import { api } from '../api';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  user: User;
  subscription: Subscription | null;
  bots: TelegramBot[];
  selectedBotId: string;
  onSelectBotId: (id: string) => void;
  onOpenCheckout: () => void;
  onOpenConnectBot: () => void;
  onOpenLiveSimulator: () => void;
  onLogout: () => void;
  onSwitchRoleQuick: (role: 'SUPER ADMIN' | 'CUSTOMER' | 'RESELLER') => void;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  subscription,
  bots,
  selectedBotId,
  onSelectBotId,
  onOpenCheckout,
  onOpenConnectBot,
  onOpenLiveSimulator,
  onLogout,
  onSwitchRoleQuick,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoRoleMenu, setShowDemoRoleMenu] = useState(false);

  const activeBot = bots.find(b => b.id === selectedBotId) || bots[0];

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.notifications) setNotifications(res.notifications);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="h-16 bg-[#0f172a] border-b border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand & Tenant / Bot Selector */}
      <div className="flex items-center space-x-3 md:space-x-6">
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              FZ PANEL <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-extrabold uppercase tracking-wider">ENGINE</span>
            </span>
          </div>
        </div>

        {/* Bot / Store Switcher */}
        <div className="relative">
          {bots.length > 0 ? (
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1">
              <select
                value={selectedBotId || ''}
                onChange={e => onSelectBotId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 px-2.5 py-1.5 outline-none cursor-pointer pr-4"
              >
                {bots.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    🤖 {b.first_name} (@{b.username})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={onOpenConnectBot}
              className="hidden md:flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Connect Telegram Bot</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Native PWA Install Button */}
        <PWAInstallButton />

        {/* 24/7 Hosting Monitor */}
        <button
          onClick={() => onNavigate('hosting')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/10"
          title="24/7 Cloud Hosting & Keep-Alive Diagnostics"
        >
          <Server className="w-3.5 h-3.5" />
          <span className="hidden md:inline">24/7 Hosting</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* Live Bot Simulator button */}
        {bots.length > 0 && (
          <button
            onClick={onOpenLiveSimulator}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/10"
            title="Open real-time interactive Telegram Bot chat simulator"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Bot Tester</span>
          </button>
        )}

        {/* Subscription Status Pill */}
        <div
          onClick={onOpenCheckout}
          className="cursor-pointer flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-400 hover:border-amber-400/50 transition-colors"
        >
          <Crown className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {subscription?.status === 'ACTIVE'
              ? `${subscription.plan?.name || 'Pro'} Active`
              : 'Upgrade Plan'}
          </span>
        </div>

        {/* Quick Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDemoRoleMenu(!showDemoRoleMenu)}
            className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Quick Role Testing Switcher"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">{user.role}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showDemoRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                1-Click Account Switcher
              </div>
              <button
                onClick={() => {
                  onSwitchRoleQuick('SUPER ADMIN');
                  setShowDemoRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${user.role === 'SUPER ADMIN' ? 'text-cyan-400 font-bold' : 'text-slate-200'}`}
              >
                <span>👑 Super Admin (Full Control)</span>
                {user.role === 'SUPER ADMIN' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <button
                onClick={() => {
                  onSwitchRoleQuick('CUSTOMER');
                  setShowDemoRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${user.role === 'CUSTOMER' ? 'text-cyan-400 font-bold' : 'text-slate-200'}`}
              >
                <span>💼 Pro Merchant (Customer)</span>
                {user.role === 'CUSTOMER' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <button
                onClick={() => {
                  onSwitchRoleQuick('RESELLER');
                  setShowDemoRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${user.role === 'RESELLER' ? 'text-cyan-400 font-bold' : 'text-slate-200'}`}
              >
                <span>🤝 Reseller Partner</span>
                {user.role === 'RESELLER' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) markAllRead();
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-[10px] font-extrabold text-slate-950 flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                <span className="text-[11px] text-slate-400">{notifications.length} total</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No new notifications</div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="p-3 hover:bg-slate-800/40 transition-colors">
                      <div className="text-xs font-semibold text-slate-200">{n.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[120px] truncate">
              {user.full_name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <div className="text-xs font-bold text-white truncate">{user.full_name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                <div className="text-[10px] font-bold text-cyan-400 mt-1 uppercase">{user.role}</div>
              </div>
              <button
                onClick={() => {
                  onNavigate('settings');
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Account & Profile</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('billing');
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Billing & Subscription</span>
              </button>
              <div className="border-t border-slate-800 my-1"></div>
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
