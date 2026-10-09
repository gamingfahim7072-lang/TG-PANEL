import React, { useState, useEffect } from 'react';
import { TelegramBot, DigitalProduct, Order, BroadcastCampaign } from './types';
import {
  INITIAL_BOTS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_BROADCASTS,
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
import { Plus, Bot, Key, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  // Load state from localStorage or initial
  const [bots, setBots] = useState<TelegramBot[]>(() => {
    const saved = localStorage.getItem('telesell_bots');
    return saved ? JSON.parse(saved) : INITIAL_BOTS;
  });

  const [selectedBotId, setSelectedBotId] = useState<string>(() => {
    return bots[0]?.id || 'bot-1';
  });

  const [products, setProducts] = useState<DigitalProduct[]>(() => {
    const saved = localStorage.getItem('telesell_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('telesell_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [broadcasts, setBroadcasts] = useState<BroadcastCampaign[]>(() => {
    const saved = localStorage.getItem('telesell_broadcasts');
    return saved ? JSON.parse(saved) : INITIAL_BROADCASTS;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isNewBotModalOpen, setIsNewBotModalOpen] = useState(false);

  // New Bot Form
  const [newBotName, setNewBotName] = useState('');
  const [newBotUsername, setNewBotUsername] = useState('');
  const [newBotToken, setNewBotToken] = useState('');

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

  const currentBot = bots.find((b) => b.id === selectedBotId) || bots[0];

  // Handlers
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);

    // Decrement stock if license key pool
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

    // Update bot revenue metrics
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
    const createdBot: TelegramBot = {
      id: `bot-${Date.now()}`,
      name: newBotName.trim(),
      username: cleanUsername,
      token: newBotToken.trim() || `718${Math.floor(1000000 + Math.random() * 9000000)}:AAF_test_${Math.random().toString(36).substring(2, 10)}`,
      status: 'online',
      subscribersCount: 1,
      totalOrders: 0,
      totalRevenue: 0,
      welcomeMessage: `👋 Welcome to ${newBotName.trim()}! Instant digital goods & license delivery. Tap below to browse products.`,
      currency: 'USD',
      themeColor: '#0ea5e9',
      features: {
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
      webhookUrl: `https://api.telesell.cloud/webhook/bot-${Date.now()}`,
    };

    // Add a default sample product for this new bot
    const sampleProduct: DigitalProduct = {
      id: `prod-${Date.now()}`,
      botId: createdBot.id,
      title: `${createdBot.name} Starter License Key`,
      description: 'Single-seat instant license key with automated dispatch.',
      type: 'license_key',
      priceUsd: 9.99,
      priceStars: 500,
      priceTon: 1.8,
      stockType: 'key_pool',
      availableKeys: [
        `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-110`,
        `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-220`,
      ],
      soldKeysCount: 0,
      badge: 'Starter',
      active: true,
    };

    setBots((prev) => [createdBot, ...prev]);
    setProducts((prev) => [sampleProduct, ...prev]);
    setSelectedBotId(createdBot.id);
    setIsNewBotModalOpen(false);
    setNewBotName('');
    setNewBotUsername('');
    setNewBotToken('');
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        bots={bots}
        selectedBot={currentBot}
        onSelectBot={(bot) => setSelectedBotId(bot.id)}
        onNewBotClick={() => setIsNewBotModalOpen(true)}
        onOpenSimulator={() => setActiveTab('simulator')}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ordersCount={orders.filter((o) => o.botId === currentBot.id).length}
          productsCount={products.filter((p) => p.botId === currentBot.id).length}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          <div className="mx-auto max-w-7xl">
            {activeTab === 'dashboard' && (
              <AnalyticsView
                bot={currentBot}
                orders={orders}
                products={products}
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
              />
            )}

            {activeTab === 'orders' && (
              <OrdersList
                orders={orders}
                botId={currentBot.id}
              />
            )}

            {activeTab === 'builder' && (
              <BotBuilder
                bot={currentBot}
                onUpdateBot={handleUpdateBot}
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
          </div>
        </main>
      </div>

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
                  <p className="text-xs text-slate-400">Step 1 of 2: BotFather Credentials</p>
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
                ⚡ Once connected, TeleSell will initialize the webhook and populate an interactive storefront with Telegram Stars and instant digital delivery.
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
