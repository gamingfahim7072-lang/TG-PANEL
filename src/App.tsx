import React, { useState, useEffect } from 'react';
import { TelegramBot, DigitalProduct, Order, BroadcastCampaign, PlatformSubscriptionSettings } from './types';
import {
  INITIAL_BOTS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_BROADCASTS,
  PLATFORM_SUBSCRIPTION_SETTINGS,
} from './mockData';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { AnalyticsView } from './components/AnalyticsView';
import { TelegramSimulator } from './components/TelegramSimulator';
import { ProductCatalog } from './components/ProductCatalog';
import { OrdersList } from './components/OrdersList';
import { BotBuilder } from './components/BotBuilder';
import { BroadcastManager } from './components/BroadcastManager';
import { GatewaysSettings } from './components/GatewaysSettings';
import { PaymentAccountConfig } from './components/PaymentAccountConfig';
import { TransactionsLedger } from './components/TransactionsLedger';
import { AcceptanceTestsModal } from './components/AcceptanceTestsModal';
import { PhoneDeviceFrame } from './components/PhoneDeviceFrame';
import { PhoneBottomNav } from './components/PhoneBottomNav';
import { PhoneMoreDrawer } from './components/PhoneMoreDrawer';
import { sanitizeBot, sanitizeProduct } from './utils/defaults';
import {
  Plus,
  Bot,
  Key,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Monitor,
  Maximize2,
  Minimize2,
  QrCode
} from 'lucide-react';

export const App: React.FC = () => {
  // Load state from localStorage or initial with auto-hydration
  const [bots, setBots] = useState<TelegramBot[]>(() => {
    const saved = localStorage.getItem('telesell_bots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeBot);
        }
      } catch (e) {
        console.error('Failed to parse cached bots:', e);
      }
    }
    return INITIAL_BOTS.map(sanitizeBot);
  });

  const [selectedBotId, setSelectedBotId] = useState<string>(() => {
    return bots[0]?.id || 'bot-1';
  });

  const [products, setProducts] = useState<DigitalProduct[]>(() => {
    const saved = localStorage.getItem('telesell_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeProduct);
        }
      } catch (e) {
        console.error('Failed to parse cached products:', e);
      }
    }
    return INITIAL_PRODUCTS.map(sanitizeProduct);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('telesell_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [broadcasts, setBroadcasts] = useState<BroadcastCampaign[]>(() => {
    const saved = localStorage.getItem('telesell_broadcasts');
    return saved ? JSON.parse(saved) : INITIAL_BROADCASTS;
  });

  const [platformSettings] = useState<PlatformSubscriptionSettings>(PLATFORM_SUBSCRIPTION_SETTINGS);

  // Default to phone ratio mode as requested by user
  const [viewMode, setViewMode] = useState<'phone' | 'desktop'>('phone');
  const [isFramelessPhone, setIsFramelessPhone] = useState(false);
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isNewBotModalOpen, setIsNewBotModalOpen] = useState(false);
  const [isTestsModalOpen, setIsTestsModalOpen] = useState(false);

  // New Bot Form
  const [newBotName, setNewBotName] = useState('');
  const [newBotUsername, setNewBotUsername] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [newBotUpiId, setNewBotUpiId] = useState('');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('telesell_bots', JSON.stringify(bots));
  }, [bots]);

  useEffect(() => {
    localStorage.setItem('telesell_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('telesell_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('telesell_broadcasts', JSON.stringify(broadcasts));
  }, [broadcasts]);

  const currentBot = sanitizeBot(bots.find((b) => b.id === selectedBotId) || bots[0] || INITIAL_BOTS[0]);

  // Handlers
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => {
      const existingIdx = prev.findIndex((o) => o.id === newOrder.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newOrder;
        return copy;
      }
      return [newOrder, ...prev];
    });

    if (newOrder.status === 'PAYMENT_SUCCESSFUL') {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === newOrder.productId) {
            const updatedAvailable = [...p.availableKeys];
            if (p.stockType === 'key_pool' && updatedAvailable.length > 0) {
              updatedAvailable.shift();
            }
            return {
              ...p,
              availableKeys: updatedAvailable,
              soldKeysCount: p.soldKeysCount + 1,
            };
          }
          return p;
        })
      );

      setBots((prev) =>
        prev.map((b) => {
          if (b.id === newOrder.botId) {
            return {
              ...b,
              totalOrders: b.totalOrders + 1,
              totalRevenue: b.totalRevenue + newOrder.amount,
            };
          }
          return b;
        })
      );
    }
  };

  const handleManualAuditVerify = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const product = products.find((p) => p.id === o.productId);
          let keyDispatched = o.deliveredPayload;
          if (!keyDispatched && product) {
            keyDispatched = product.availableKeys[0] || `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          }

          return {
            ...o,
            status: 'PAYMENT_SUCCESSFUL',
            fulfillmentStatus: 'DELIVERED',
            deliveredPayload: keyDispatched,
            verificationTimestamp: new Date().toISOString(),
          };
        }
        return o;
      })
    );
  };

  const handleSaveProduct = (updated: DigitalProduct) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      if (exists) {
        return prev.map((p) => (p.id === updated.id ? updated : p));
      }
      return [updated, ...prev];
    });
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleAddKeys = (productId: string, newKeys: string[]) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            availableKeys: [...p.availableKeys, ...newKeys],
          };
        }
        return p;
      })
    );
  };

  const handleUpdateBot = (updatedBot: TelegramBot) => {
    setBots((prev) => prev.map((b) => (b.id === updatedBot.id ? updatedBot : b)));
  };

  const handleSendBroadcast = (campaign: BroadcastCampaign) => {
    setBroadcasts((prev) => [campaign, ...prev]);
  };

  const handleCreateNewBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim() || !newBotUsername.trim()) return;

    const cleanUsername = newBotUsername.replace('@', '').trim();
    const botId = `bot-${Date.now()}`;
    const cleanUpi = newBotUpiId.trim() || `${cleanUsername.toLowerCase()}@okhdfcbank`;

    const createdBot: TelegramBot = {
      id: botId,
      name: newBotName.trim(),
      username: cleanUsername,
      token: newBotToken.trim() || `718${Math.floor(1000000 + Math.random() * 9000000)}:AAF_test_${Math.random().toString(36).substring(2, 10)}`,
      status: 'online',
      subscribersCount: 1,
      totalOrders: 0,
      totalRevenue: 0,
      welcomeMessage: `👋 Welcome to ${newBotName.trim()}! Instant digital goods & license delivery with Dynamic UPI QR. Tap below to browse products.`,
      currency: 'INR',
      themeColor: '#0ea5e9',
      paymentAccount: {
        id: `acc-${Date.now()}`,
        accountName: newBotName.trim(),
        upiId: cleanUpi,
        merchantProvider: 'Razorpay',
        merchantAccountId: `rzp_merch_${Date.now()}`,
        mode: 'MODE_A_PROVIDER',
        apiKeyConfigured: true,
        dynamicQrSupported: true,
        autoVerificationEnabled: true,
        manualVerificationAvailable: true,
        paymentsEnabled: true,
        isTestMode: false,
        qrExpiryMinutes: 10,
      },
      features: {
        upiDynamicQr: true,
        starsPayment: true,
        cryptoPayment: true,
        autoKeyDelivery: true,
        vipGroupInvite: false,
        resellerSupport: true,
      },
      commands: [
        { command: '/start', description: 'Start store', response: 'Welcome! Choose a product from the catalog.' },
        { command: '/catalog', description: 'View items', response: 'Here are the available products in our store.' },
      ],
      webhookUrl: `https://api.telesell.cloud/webhook/${botId}`,
    };

    const sampleProduct1: DigitalProduct = {
      id: `prod-${Date.now()}-1`,
      botId: createdBot.id,
      title: `${createdBot.name} Basic Product`,
      description: 'Single-seat instant license key with automated Dynamic UPI QR dispatch.',
      type: 'license_key',
      priceInr: 320.00,
      priceUsd: 3.99,
      priceStars: 200,
      priceTon: 0.8,
      stockType: 'key_pool',
      availableKeys: [
        `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-320A`,
        `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-320B`,
      ],
      soldKeysCount: 0,
      badge: 'Basic',
      active: true,
    };

    const sampleProduct2: DigitalProduct = {
      id: `prod-${Date.now()}-2`,
      botId: createdBot.id,
      title: `${createdBot.name} Premium Product`,
      description: 'Multi-seat premium license key with instant verification.',
      type: 'license_key',
      priceInr: 850.00,
      priceUsd: 10.99,
      priceStars: 550,
      priceTon: 2.2,
      stockType: 'key_pool',
      availableKeys: [
        `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-850A`,
      ],
      soldKeysCount: 0,
      badge: 'Premium',
      active: true,
    };

    setBots((prev) => [createdBot, ...prev]);
    setProducts((prev) => [sampleProduct1, sampleProduct2, ...prev]);
    setSelectedBotId(createdBot.id);
    setIsNewBotModalOpen(false);
    setNewBotName('');
    setNewBotUsername('');
    setNewBotToken('');
    setNewBotUpiId('');
  };

  const renderActiveTabContent = () => (
    <>
      {activeTab === 'dashboard' && (
        <AnalyticsView
          bot={currentBot}
          orders={orders}
          products={products}
          onNavigateToUpi={() => setActiveTab('upi_account')}
          onNavigateToSimulator={() => setActiveTab('simulator')}
        />
      )}

      {activeTab === 'simulator' && (
        <TelegramSimulator
          bot={currentBot}
          products={products}
          onOrderCreated={handleOrderCreated}
          onClose={() => setActiveTab('dashboard')}
        />
      )}

      {activeTab === 'products' && (
        <ProductCatalog
          products={products}
          botId={currentBot.id}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onAddKeys={handleAddKeys}
          onNavigateToPaymentSettings={() => setActiveTab('upi_account')}
        />
      )}

      {activeTab === 'builder' && (
        <BotBuilder
          bot={currentBot}
          onUpdateBot={handleUpdateBot}
        />
      )}

      {activeTab === 'upi_account' && (
        <PaymentAccountConfig
          bot={currentBot}
          onUpdateBot={handleUpdateBot}
        />
      )}

      {activeTab === 'transactions_ledger' && (
        <TransactionsLedger
          orders={orders}
          bot={currentBot}
          onVerifyManualPayment={handleManualAuditVerify}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersList
          orders={orders}
          botId={currentBot.id}
        />
      )}

      {activeTab === 'broadcasts' && (
        <BroadcastManager
          bot={currentBot}
          broadcasts={broadcasts}
          onSendBroadcast={handleSendBroadcast}
        />
      )}

      {activeTab === 'gateways' && (
        <GatewaysSettings
          bot={currentBot}
          onUpdateBot={handleUpdateBot}
        />
      )}
    </>
  );

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        bots={bots}
        selectedBot={currentBot}
        onSelectBot={(bot) => setSelectedBotId(bot.id)}
        onNewBotClick={() => setIsNewBotModalOpen(true)}
        onOpenSimulator={() => setActiveTab('simulator')}
        onOpenTestsModal={() => setIsTestsModalOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* Main Container: Phone APK Ratio Mode vs Desktop Mode */}
      {viewMode === 'phone' ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 overflow-hidden relative">
          {/* Subtle Phone Ratio Switch Helper Banner */}
          <div className="hidden sm:flex items-center gap-3 py-1.5 px-4 text-xs text-slate-400 bg-slate-900/60 border-b border-slate-800/80 w-full justify-between z-10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-semibold text-slate-200">Phone APK Ratio Active (9:19.5 Mobile Frame)</span>
              <span className="text-[11px] text-slate-500">— Testing Mobile Telegram & UPI QR Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFramelessPhone(!isFramelessPhone)}
                className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white border border-slate-700"
              >
                {isFramelessPhone ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                <span>{isFramelessPhone ? 'Show Phone Bezel' : 'Edge-to-Edge Phone'}</span>
              </button>
            </div>
          </div>

          {/* Phone Shell */}
          <div className="flex-1 w-full overflow-hidden flex items-center justify-center">
            <PhoneDeviceFrame isFrameless={isFramelessPhone}>
              {/* Phone App Bar */}
              <div className="flex h-12 w-full items-center justify-between border-b border-slate-800 bg-slate-900 px-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-cyan-600/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white line-clamp-1">{currentBot.name}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">@{currentBot.username}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsTestsModalOpen(true)}
                    className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20"
                  >
                    Tests (15)
                  </button>
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="rounded bg-cyan-600 p-1.5 text-white"
                    title="Open UPI Simulator"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Phone Scrollable App Content */}
              <div className="flex-1 overflow-y-auto p-3.5 bg-slate-950">
                {renderActiveTabContent()}
              </div>

              {/* Phone APK Bottom Navigation Bar */}
              <PhoneBottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ordersCount={orders.filter((o) => o.botId === currentBot.id).length}
                productsCount={products.filter((p) => p.botId === currentBot.id).length}
                onOpenMoreMenu={() => setIsMoreDrawerOpen(true)}
              />
            </PhoneDeviceFrame>
          </div>

          {/* More Drawer inside Phone Mode */}
          {isMoreDrawerOpen && (
            <PhoneMoreDrawer
              bot={currentBot}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenTestsModal={() => setIsTestsModalOpen(true)}
              onNewBotClick={() => setIsNewBotModalOpen(true)}
              onClose={() => setIsMoreDrawerOpen(false)}
            />
          )}
        </div>
      ) : (
        /* Desktop Ratio Mode */
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            ordersCount={orders.filter((o) => o.botId === currentBot.id).length}
            productsCount={products.filter((p) => p.botId === currentBot.id).length}
            onOpenTestsModal={() => setIsTestsModalOpen(true)}
          />

          <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
            <div className="mx-auto max-w-7xl">
              {renderActiveTabContent()}
            </div>
          </main>
        </div>
      )}

      {/* Acceptance Tests Modal */}
      {isTestsModalOpen && (
        <AcceptanceTestsModal
          bot={currentBot}
          bots={bots}
          products={products}
          platformSettings={platformSettings}
          onClose={() => setIsTestsModalOpen(false)}
        />
      )}

      {/* Connect New Bot Modal */}
      {isNewBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-cyan-600/20 p-2 text-cyan-400 border border-cyan-500/30">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Telegram Bot</h3>
                  <p className="text-xs text-slate-400">Step 1 of 2: BotFather & UPI Account</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewBotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewBot} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Store or Bot Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexus Digital Store"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Telegram Bot Handle
                </label>
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400">
                  <span>@</span>
                  <input
                    type="text"
                    required
                    placeholder="NexusStore_bot"
                    value={newBotUsername}
                    onChange={(e) => setNewBotUsername(e.target.value)}
                    className="w-full bg-transparent text-white focus:outline-none pl-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Merchant UPI ID / VPA
                </label>
                <input
                  type="text"
                  placeholder="merchant@okhdfcbank"
                  value={newBotUpiId}
                  onChange={(e) => setNewBotUpiId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  BotFather API Token (Optional / Auto-generates test key)
                </label>
                <input
                  type="password"
                  placeholder="7192847291:AAF9k2_L9aZ9wV8n0PqR3t..."
                  value={newBotToken}
                  onChange={(e) => setNewBotToken(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-slate-950 p-3 text-[11px] text-slate-400 border border-slate-800">
                ⚡ Once connected, FINE BOTUS will configure the Dynamic UPI QR engine with authoritative server calculation and real-time webhook settlement.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewBotModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-600/20 active:scale-95"
                >
                  Connect Bot & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
