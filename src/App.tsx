import React, { useState, useEffect } from 'react';
import { api } from './api';
import { User, Subscription, TelegramBot, DashboardStats, Product, Order, Wallet as WalletType } from './types';

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
import { CinematicIntro } from './components/CinematicIntro';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FzPayKycModal } from './components/FzPayKycModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PageTransition } from './components/PageTransition';

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
import { SubscriptionManagementView } from './views/SubscriptionManagementView';
import { FzPayView } from './views/FzPayView';

import {
  LayoutDashboard,
  Bot,
  Package,
  ShoppingCart,
  Users,
  Radio,
  Sliders,
  Sparkles,
  Loader2,
  Wallet,
  Settings
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\//, '');
      if (path === 'fz-pay' || path === 'fzpay') return 'fz-pay';
      if (path && ['dashboard', 'bots', 'editor', 'products', 'orders', 'customers', 'broadcasts', 'coupons', 'resellers', 'billing', 'subscriptions', 'hosting', 'admin', 'settings'].includes(path)) {
        return path;
      }
    }
    return 'dashboard';
  });
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(() => {
    return sessionStorage.getItem('fz_intro_seen') !== 'true';
  });

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const targetPath = view === 'fz-pay' ? '/fz-pay' : (view === 'dashboard' ? '/' : `/${view}`);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '');
      if (path === 'fz-pay' || path === 'fzpay') {
        setCurrentView('fz-pay');
      } else if (path) {
        setCurrentView(path);
      } else {
        setCurrentView('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentView === 'fz-pay') {
      document.title = 'FZ PAY - Internal Wallet & Payment Verification';
    } else {
      document.title = 'TeleDash SaaS Pro - Telegram Commerce & Bot Automation';
    }
  }, [currentView]);

  // Modals state
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
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

        try {
          const wRes = await api.getWallet();
          if (wRes && wRes.wallet) {
            setWallet(wRes.wallet);
          }
        } catch {}
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
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
      <>
        {showIntro && (
          <CinematicIntro
            onComplete={() => setShowIntro(false)}
            brandName="FZ PANEL"
            tagline="NEXT-GEN TELEGRAM COMMERCE & BOT AUTOMATION SAAS"
          />
        )}
        <OfflineIndicator />
        <AuthModal
          isOpen={true}
          onSuccess={loggedUser => {
            setUser(loggedUser);
            initAuth();
          }}
        />
      </>
    );
  }

  const activeBot = bots.find(b => b.id === selectedBotId) || bots[0] || null;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
      {/* In-App PWA Install Banner */}
      <PWAInstallBanner />

      {/* Cinematic Splash Screen */}
      {showIntro && (
        <CinematicIntro
          onComplete={() => setShowIntro(false)}
          brandName="FZ PAY"
          tagline="SECURE TELEGRAM COMMERCE & DIGITAL WALLET"
        />
      )}

      {/* Network Connectivity Status */}
      <OfflineIndicator />

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
        onNavigate={handleNavigate}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          user={user}
          subscription={subscription}
          onOpenConnectBot={() => setShowConnectBot(true)}
          onOpenCheckout={() => setShowCheckout(true)}
        />

        {/* View Port Content */}
        <main className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6">
          {currentView === 'dashboard' && (
            <PageTransition variant="dashboard">
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
                onNavigate={handleNavigate}
              />
            </PageTransition>
          )}

          {currentView === 'bots' && (
            <PageTransition variant="default">
              <BotsView
                bots={bots}
                selectedBotId={selectedBotId}
                onSelectBotId={setSelectedBotId}
                onOpenConnectBot={() => setShowConnectBot(true)}
                onOpenLiveSimulator={() => setShowLiveSimulator(true)}
                onNavigateToEditor={botId => {
                  setSelectedBotId(botId);
                  handleNavigate('editor');
                }}
                onRefreshBots={loadCoreData}
                onNavigate={handleNavigate}
              />
            </PageTransition>
          )}

          {currentView === 'editor' && (
            <PageTransition variant="editor">
              <BotEditorView
                bot={activeBot}
                onOpenLiveSimulator={() => setShowLiveSimulator(true)}
                user={user}
                subscription={subscription}
                onOpenCheckout={() => setShowCheckout(true)}
              />
            </PageTransition>
          )}

          {currentView === 'products' && (
            <PageTransition variant="products">
              <ProductsView
                botId={selectedBotId}
                onOpenCreateProduct={prod => {
                  setProductToEdit(prod || null);
                  setShowCreateProduct(true);
                }}
                onOpenLicensePool={prod => setLicensePoolProduct(prod)}
              />
            </PageTransition>
          )}

          {currentView === 'orders' && (
            <PageTransition variant="orders">
              <OrdersView
                botId={selectedBotId}
                onSelectOrder={setSelectedOrder}
              />
            </PageTransition>
          )}

          {currentView === 'customers' && (
            <PageTransition variant="default">
              <CustomersView botId={selectedBotId} />
            </PageTransition>
          )}

          {currentView === 'broadcasts' && (
            <PageTransition variant="default">
              <BroadcastsView
                botId={selectedBotId}
                onOpenBroadcastModal={() => setShowBroadcast(true)}
              />
            </PageTransition>
          )}

          {currentView === 'coupons' && (
            <PageTransition variant="default">
              <CouponsView botId={selectedBotId} />
            </PageTransition>
          )}

          {currentView === 'resellers' && (
            <PageTransition variant="default">
              <ResellerView user={user} />
            </PageTransition>
          )}

          {currentView === 'billing' && (
            <PageTransition variant="subscription">
              <BillingView
                subscription={subscription}
                onOpenCheckout={() => setShowCheckout(true)}
              />
            </PageTransition>
          )}

          {currentView === 'subscriptions' && (
            (user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'SUPER ADMIN') ? (
              <PageTransition variant="subscription">
                <SubscriptionManagementView
                  user={user}
                  onOpenCheckout={() => setShowCheckout(true)}
                />
              </PageTransition>
            ) : (
              <div className="p-8 text-center">
                <div className="max-w-md mx-auto p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <h3 className="text-base font-bold">Access Denied</h3>
                  <p className="text-xs text-slate-300 mt-1">Subscription plan management is strictly restricted to platform Administrators and Owners.</p>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )
          )}

          {currentView === 'hosting' && (
            <PageTransition variant="default">
              <HostingView />
            </PageTransition>
          )}

          {currentView === 'admin' && (
            (user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'SUPER ADMIN') ? (
              <PageTransition variant="default">
                <AdminView />
              </PageTransition>
            ) : (
              <div className="p-8 text-center">
                <div className="max-w-md mx-auto p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <h3 className="text-base font-bold">Access Denied</h3>
                  <p className="text-xs text-slate-300 mt-1">This console is strictly restricted to platform Administrators and Owners.</p>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )
          )}

          {currentView === 'settings' && (
            <PageTransition variant="settings">
              <SettingsView user={user} />
            </PageTransition>
          )}

          {currentView === 'fz-pay' && (
            <FzPayView
              user={user}
              onOpenCheckout={() => setShowCheckout(true)}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Requirement 27: HOME, PRODUCTS, FZ PAY, ORDERS, SETTINGS) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-slate-800 flex items-center justify-around px-2 z-40 pb-[env(safe-area-inset-bottom)] pt-1 h-[calc(3.75rem+env(safe-area-inset-bottom))]">
        {[
          { id: 'dashboard', label: 'HOME', icon: LayoutDashboard },
          { id: 'products', label: 'PRODUCTS', icon: Package },
          { id: 'fz-pay', label: 'FZ PAY', icon: Wallet },
          { id: 'orders', label: 'ORDERS', icon: ShoppingCart },
          { id: 'settings', label: 'SETTINGS', icon: Settings }
        ].map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-lg text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
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
        onNavigate={handleNavigate}
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

      <FzPayKycModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        onSuccess={unlockedWallet => {
          setWallet(unlockedWallet);
          setShowKycModal(false);
          loadCoreData();
        }}
        userFullName={user?.full_name}
        userPhone={user?.phone}
      />
    </div>
  );
}

export default App;
