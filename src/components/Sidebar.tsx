import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Sliders,
  Package,
  ShoppingCart,
  Users,
  Radio,
  Tag,
  Share2,
  CreditCard,
  ShieldCheck,
  Settings,
  Server,
  Sparkles,
  Zap,
  ExternalLink
} from 'lucide-react';
import { User, Subscription } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: User;
  subscription: Subscription | null;
  onOpenConnectBot: () => void;
  onOpenCheckout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  user,
  subscription,
  onOpenConnectBot,
  onOpenCheckout
}) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'bots', label: 'Connected Bots', icon: Bot, badge: null },
    { id: 'editor', label: 'Bot Visual Editor', icon: Sliders, badge: 'PRO' },
    { id: 'products', label: 'Products & Licenses', icon: Package, badge: null },
    { id: 'orders', label: 'Orders & Deliveries', icon: ShoppingCart, badge: null },
    { id: 'customers', label: 'Customers CRM', icon: Users, badge: null },
    { id: 'broadcasts', label: 'Broadcast Center', icon: Radio, badge: null },
    { id: 'coupons', label: 'Coupons & Promos', icon: Tag, badge: null },
    { id: 'resellers', label: 'Reseller & Referrals', icon: Share2, badge: 'EARN' },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard, badge: null },
    { id: 'hosting', label: '24/7 Cloud Hosting', icon: Server, badge: '24/7' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Console', icon: ShieldCheck, badge: 'ROOT' }] : []),
    { id: 'settings', label: 'Settings & Security', icon: Settings, badge: null }
  ];

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 flex flex-col justify-between hidden md:flex shrink-0 select-none">
      {/* Navigation List */}
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Management Portal
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    item.badge === 'ROOT'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : item.badge === 'EARN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Promo / Subscription Card */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center space-x-2 text-amber-400 mb-1.5">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {subscription?.status === 'ACTIVE' ? (subscription.plan?.name || 'Pro Tier') : 'Starter Trial'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-2.5 line-clamp-2">
            Automated Telegram digital commerce, instant license keys, and CRM.
          </p>
          <button
            onClick={onOpenCheckout}
            className="w-full py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center space-x-1.5"
          >
            <span>{subscription?.status === 'ACTIVE' ? 'Manage Plan' : 'Upgrade Plan'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
