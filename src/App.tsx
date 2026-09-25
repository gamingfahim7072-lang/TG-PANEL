import React, { useState, useEffect } from 'react';
import { api } from './api';
import { User, Subscription, TelegramBot, DashboardStats, Product, Order } from './types';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ConnectBotModal } from './components/ConnectBotModal';
import { BotTesterModal } from './components/BotTesterModal';
import { CreateProductModal } from './components/CreateProductModal';
import { BulkLicenseModal } from './components/BulkLicenseModal';
import { CheckoutModal } from './components/CheckoutModal';
import { BroadcastModal } from './components/BroadcastModal';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { AuthModal } from './components/AuthModal';

// Views
import { DashboardView } from './views/DashboardView';
import { BotsView } from './views/BotsView';
import { BotEditorView } from './views/BotEditorView';
import { ProductsView } from './views/ProductsView';
import { OrdersView } from './views/OrdersView';
import { CustomersView } from './views/CustomersView';
import { BroadcastsView } from './views/BroadcastsView';
import { CouponsView } from './views/CouponsView';
import { ResellerView } from './views/ResellerView';
import { BillingView } from './views/BillingView';
import { AdminView } from './views/AdminView';
import { SettingsView } from './views/SettingsView';
import { HostingView } from './views/HostingView';

import {
  LayoutDashboard,
  Bot,
  Package,
  ShoppingCart,
  Users,
  Radio,
  Sliders,
  Sparkles,
  Loader2
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showConnectBot, setShowConnectBot] = useState(false);
  const [showLiveSimulator, setShowLiveSimulator] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [licensePoolProduct, setLicensePoolProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    setLoading(true);
    try {
      const res = await api.getMe();
      if (res.user) {
        setUser(res.user);
        setSubscription(res.subscription);
        await loadCoreData();
      }
    } catch {
      // If not logged in, attempt quick login to demo account for instant out-of-the-box readiness
      try {
        const demoRes = await api.login({ email: 'merchant@telesell.io', password: 'Merchant123!' });
        if (demoRes.user) {
          setUser(demoRes.user);
          setSubscription(demoRes.subscription);
          await loadCoreData();
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const loadCoreData = async () => {
    try {
      const [botsRes, statsRes] = await Promise.all([
        api.getBots(),
        api.getDashboardStats()
      ]);

      if (botsRes.bots) {
        setBots(botsRes.bots);
        if (!selectedBotId && botsRes.bots.length > 0) {
          setSelectedBotId(botsRes.bots[0].id);
        }
      }

      if (statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch {}
  };

  const handleSwitchRoleQuick = async (targetRole: 'SUPER ADMIN' | 'CUSTOMER' | 'RESELLER') => {
    setLoading(true);
    try {
      let email = 'merchant@telesell.io';
      let pass = 'Merchant123!';
      if (targetRole === 'SUPER ADMIN') {
        email = 'admin@telesell.io';
        pass = 'Admin123!';
      } else if (targetRole === 'RESELLER') {
        email = 'reseller@telesell.io';
        pass = 'Reseller123!';
      }
      const res = await api.login({ email, password: pass });
      if (res.user) {
        setUser(res.user);
        setSubscription(res.subscription);
        await loadCoreData();
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setSubscription(null);
  };

  if (loading && !user) {
    return (
      <div className="h-screen w-screen bg-[#0b0f19] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-pulse">
          <Bot className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Starting TeleSell SaaS Engine...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthModal
        isOpen={true}
        onSuccess={loggedUser => {
          setUser(loggedUser);
          initAuth();
        }}
      />
    );
  }

  const activeBot = bots.find(b => b.id === selectedBotId) || bots[0] || null;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        user={user}
        subscription={subscription}
        bots={bots}
        selectedBotId={selectedBotId}
        onSelectBotId={setSelectedBotId}
        onOpenCheckout={() => setShowCheckout(true)}
        onOpenConnectBot={() => setShowConnectBot(true)}
        onOpenLiveSimulator={() => setShowLiveSimulator(true)}
        onLogout={handleLogout}
        onSwitchRoleQuick={handleSwitchRoleQuick}
        onNavigate={setCurrentView}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          user={user}
          subscription={subscription}
          onOpenConnectBot={() => setShowConnectBot(true)}
          onOpenCheckout={() => setShowCheckout(true)}
        />

        {/* View Port Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              user={user}
              activeBot={activeBot}
              onOpenConnectBot={() => setShowConnectBot(true)}
              onOpenCreateProduct={() => {
                setProductToEdit(null);
                setShowCreateProduct(true);
              }}
              onOpenLiveSimulator={() => setShowLiveSimulator(true)}
              onOpenBroadcast={() => setShowBroadcast(true)}
              onSelectOrder={setSelectedOrder}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'bots' && (
            <BotsView
              bots={bots}
              selectedBotId={selectedBotId}
              onSelectBotId={setSelectedBotId}
              onOpenConnectBot={() => setShowConnectBot(true)}
              onOpenLiveSimulator={() => setShowLiveSimulator(true)}
              onNavigateToEditor={botId => {
                setSelectedBotId(botId);
                setCurrentView('editor');
              }}
              onRefreshBots={loadCoreData}
            />
          )}

          {currentView === 'editor' && (
            <BotEditorView
              bot={activeBot}
              onOpenLiveSimulator={() => setShowLiveSimulator(true)}
            />
          )}

          {currentView === 'products' && (
            <ProductsView
              botId={selectedBotId}
              onOpenCreateProduct={prod => {
                setProductToEdit(prod || null);
                setShowCreateProduct(true);
              }}
              onOpenLicensePool={prod => setLicensePoolProduct(prod)}
            />
          )}

          {currentView === 'orders' && (
            <OrdersView
              botId={selectedBotId}
              onSelectOrder={setSelectedOrder}
            />
          )}

          {currentView === 'customers' && (
            <CustomersView botId={selectedBotId} />
          )}

          {currentView === 'broadcasts' && (
            <BroadcastsView
              botId={selectedBotId}
              onOpenBroadcastModal={() => setShowBroadcast(true)}
            />
          )}

          {currentView === 'coupons' && (
            <CouponsView botId={selectedBotId} />
          )}

          {currentView === 'resellers' && (
            <ResellerView user={user} />
          )}

          {currentView === 'billing' && (
            <BillingView
              subscription={subscription}
              onOpenCheckout={() => setShowCheckout(true)}
            />
          )}

          {currentView === 'hosting' && <HostingView />}

          {currentView === 'admin' && <AdminView />}

          {currentView === 'settings' && <SettingsView user={user} />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f172a] border-t border-slate-800 flex items-center justify-around px-2 z-40">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'bots', label: 'Bots', icon: Bot },
          { id: 'editor', label: 'Editor', icon: Sliders },
          { id: 'products', label: 'Products', icon: Package },
          { id: 'orders', label: 'Orders', icon: ShoppingCart }
        ].map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modals & Dialogs */}
      <ConnectBotModal
        isOpen={showConnectBot}
        onClose={() => setShowConnectBot(false)}
        onBotConnected={newBot => {
          setBots(prev => [newBot, ...prev]);
          setSelectedBotId(newBot.id);
          loadCoreData();
        }}
      />

      <BotTesterModal
        isOpen={showLiveSimulator}
        onClose={() => setShowLiveSimulator(false)}
        bot={activeBot}
      />

      <CreateProductModal
        isOpen={showCreateProduct}
        onClose={() => {
          setShowCreateProduct(false);
          setProductToEdit(null);
        }}
        botId={selectedBotId}
        categories={[]}
        productToEdit={productToEdit}
        onProductSaved={() => {
          loadCoreData();
        }}
      />

      <BulkLicenseModal
        isOpen={!!licensePoolProduct}
        onClose={() => setLicensePoolProduct(null)}
        product={licensePoolProduct}
        onStockUpdated={loadCoreData}
      />

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        currentSubscription={subscription}
        onSubscriptionUpdated={newSub => {
          setSubscription(newSub);
          loadCoreData();
        }}
      />

      <BroadcastModal
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        botId={selectedBotId}
        onBroadcastCreated={() => {
          loadCoreData();
        }}
      />

      <OrderDetailsModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onOrderRefunded={updated => {
          setSelectedOrder(updated);
          loadCoreData();
        }}
      />
    </div>
  );
}

export default App;
