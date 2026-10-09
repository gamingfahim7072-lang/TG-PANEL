import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Package,
  ShoppingCart,
  Send,
  MessageSquare,
  Settings,
  Flame,
  Radio
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'builder'
  | 'products'
  | 'orders'
  | 'simulator'
  | 'broadcasts'
  | 'gateways';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  ordersCount: number;
  productsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  ordersCount,
  productsCount,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Overview & KPIs',
      icon: LayoutDashboard,
    },
    {
      id: 'simulator' as ActiveTab,
      label: 'Live Bot Simulator',
      icon: MessageSquare,
      badge: 'Interactive',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
    },
    {
      id: 'products' as ActiveTab,
      label: 'Products & Key Pool',
      icon: Package,
      count: productsCount,
    },
    {
      id: 'orders' as ActiveTab,
      label: 'Orders & Deliveries',
      icon: ShoppingCart,
      count: ordersCount,
    },
    {
      id: 'builder' as ActiveTab,
      label: 'Bot Logic & Menus',
      icon: Bot,
    },
    {
      id: 'broadcasts' as ActiveTab,
      label: 'Broadcast Engine',
      icon: Send,
    },
    {
      id: 'gateways' as ActiveTab,
      label: 'Payments & Stars',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Store Management
          </div>
          <nav className="mt-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Telegram Stars Promotion Card */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Telegram Stars 0% Fee</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Direct in-app Stars checkout enabled. Withdraw to Fragment or convert to TON with zero merchant fees.
          </p>
        </div>
      </div>

      {/* Bot Server Status Footer */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">Telegram Bot Poller</span>
          <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
            <Radio className="h-3 w-3 animate-pulse" /> Live (22ms)
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
          <span>Worker: node-eu-central-1</span>
          <span>v2.8.4</span>
        </div>
      </div>
    </aside>
  );
};
