import React from 'react';
import { ActiveTab } from './Sidebar';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Wallet,
  Receipt,
  Menu
} from 'lucide-react';

interface PhoneBottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  ordersCount: number;
  productsCount: number;
  onOpenMoreMenu: () => void;
}

export const PhoneBottomNav: React.FC<PhoneBottomNavProps> = ({
  activeTab,
  onTabChange,
  ordersCount,
  productsCount,
  onOpenMoreMenu,
}) => {
  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'Home', icon: LayoutDashboard },
    { id: 'simulator' as ActiveTab, label: 'Simulate', icon: MessageSquare, badge: 'UPI' },
    { id: 'products' as ActiveTab, label: 'Products', icon: Package, count: productsCount },
    { id: 'upi_account' as ActiveTab, label: 'UPI QR', icon: Wallet },
    { id: 'transactions_ledger' as ActiveTab, label: 'Ledger', icon: Receipt, count: ordersCount },
  ];

  return (
    <nav className="sticky bottom-0 z-40 flex h-16 w-full items-center justify-around border-t border-slate-800 bg-slate-900/95 px-2 backdrop-blur-md pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
              isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${isActive ? 'scale-110 text-cyan-400' : 'text-slate-400'}`} />
              {tab.badge && (
                <span className="absolute -top-1 -right-2.5 rounded-full bg-cyan-500 px-1 text-[8px] font-extrabold text-slate-950">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute -top-1 -right-2 rounded-full bg-slate-800 border border-slate-700 px-1 text-[8px] font-bold text-slate-300">
                  {tab.count}
                </span>
              )}
            </div>
            <span className="mt-1 text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenMoreMenu}
        className="flex flex-1 flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-200"
      >
        <Menu className="h-5 w-5" />
        <span className="mt-1 text-[10px] tracking-tight">More</span>
      </button>
    </nav>
  );
};
