import React, { useState, useRef, useEffect } from 'react';
import { TelegramBot, DigitalProduct, Order } from '../types';
import {
  Send,
  Sparkles,
  RefreshCw,
  CheckCircle,
  Copy,
  ExternalLink,
  Shield,
  CreditCard,
  Key,
  Flame,
  ArrowLeft
} from 'lucide-react';

interface TelegramSimulatorProps {
  bot: TelegramBot;
  products: DigitalProduct[];
  onOrderCreated: (order: Order) => void;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  time: string;
  inlineButtons?: { text: string; action: () => void; variant?: 'primary' | 'stars' | 'ton' }[][];
  invoice?: {
    product: DigitalProduct;
    price: number;
    currency: string;
    method: 'stars' | 'ton' | 'usdt';
  };
  delivery?: {
    payload: string;
    type: string;
    productTitle: string;
  };
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  bot,
  products,
  onOrderCreated,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getNowTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Initialize with /start simulation
  useEffect(() => {
    sendBotWelcome();
  }, [bot.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, paymentProcessing]);

  const sendBotWelcome = () => {
    const initialUserMsg: ChatMessage = {
      id: 'm-init-user',
      sender: 'user',
      text: '/start',
      time: getNowTime(),
    };

    const initialBotMsg: ChatMessage = {
      id: 'm-init-bot',
      sender: 'bot',
      text: bot.welcomeMessage,
      time: getNowTime(),
      inlineButtons: [
        [
          { text: '🛍 Browse Catalog', action: () => handleShowCatalog(), variant: 'primary' },
          { text: '📦 My Orders & Keys', action: () => handleShowOrders() }
        ],
        [
          { text: '⭐ Pay with Stars (0% Fee)', action: () => handleShowCatalog('stars'), variant: 'stars' },
          { text: '💬 Support & FAQ', action: () => handleSupport() }
        ]
      ]
    };

    setMessages([initialUserMsg, initialBotMsg]);
  };

  const handleShowCatalog = (preferredPayment?: 'stars') => {
    const activeProducts = products.filter(p => p.active);
    
    const botReply: ChatMessage = {
      id: `m-cat-${Date.now()}`,
      sender: 'bot',
      text: `🛒 *${bot.name} Product Catalog*\n\nChoose an item below to check real-time stock and checkout instantly:`,
      time: getNowTime(),
      inlineButtons: activeProducts.map(prod => [
        {
          text: `${prod.badge ? `[${prod.badge}] ` : ''}${prod.title} — $${prod.priceUsd}`,
          action: () => handleSelectProduct(prod, preferredPayment)
        }
      ])
    };

    setMessages(prev => [...prev, botReply]);
  };

  const handleSelectProduct = (product: DigitalProduct, preferredPayment?: 'stars') => {
    const stockInfo = product.stockType === 'key_pool'
      ? `🔑 Available in pool: *${product.availableKeys.length} keys*`
      : '⚡ Instant digital access';

    const reply: ChatMessage = {
      id: `m-prod-${Date.now()}`,
      sender: 'bot',
      text: `📦 *${product.title}*\n\n${product.description}\n\n${stockInfo}\n\n*Pricing:*\n• USD: $${product.priceUsd}\n• Telegram Stars: ⭐ ${product.priceStars}\n• TON: 💎 ${product.priceTon} TON`,
      time: getNowTime(),
      inlineButtons: [
        [
          {
            text: `⭐ Buy with Stars (${product.priceStars} Stars)`,
            action: () => handleCreateInvoice(product, 'stars'),
            variant: 'stars'
          }
        ],
        [
          {
            text: `💎 Buy with TON (${product.priceTon} TON)`,
            action: () => handleCreateInvoice(product, 'ton'),
            variant: 'ton'
          },
          {
            text: `💵 USDT TRC20 ($${product.priceUsd})`,
            action: () => handleCreateInvoice(product, 'usdt')
          }
        ],
        [
          { text: '« Back to Catalog', action: () => handleShowCatalog() }
        ]
      ]
    };

    setMessages(prev => [...prev, reply]);
  };

  const handleCreateInvoice = (product: DigitalProduct, method: 'stars' | 'ton' | 'usdt') => {
    const invoiceMsg: ChatMessage = {
      id: `m-inv-${Date.now()}`,
      sender: 'bot',
      text: `🧾 *Telegram In-App Invoice Generated*\n\nItem: ${product.title}\nDelivery Method: Instant Bot Automated Dispatch`,
      time: getNowTime(),
      invoice: {
        product,
        price: method === 'stars' ? product.priceStars : (method === 'ton' ? product.priceTon : product.priceUsd),
        currency: method === 'stars' ? 'Stars' : (method === 'ton' ? 'TON' : 'USDT'),
        method
      }
    };

    setMessages(prev => [...prev, invoiceMsg]);
  };

  const executePayment = (product: DigitalProduct, method: 'stars' | 'ton' | 'usdt') => {
    setPaymentProcessing(true);

    setTimeout(() => {
      setPaymentProcessing(false);

      // Pick key or generate invite link
      let deliveredContent = '';
      if (product.type === 'license_key') {
        deliveredContent = product.availableKeys[0] || `LIC-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      } else if (product.type === 'vip_channel') {
        deliveredContent = `https://t.me/+VIP_Invite_${Math.random().toString(36).substring(2, 10)}`;
      } else {
        deliveredContent = `https://downloads.telesell.cloud/deliveries/vault-${Date.now()}.zip`;
      }

      const newOrder: Order = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        botId: bot.id,
        productId: product.id,
        productTitle: product.title,
        customerTelegramId: '849201948',
        customerUsername: 'demo_user_telegram',
        amount: product.priceUsd,
        currency: method === 'stars' ? 'STARS' : (method === 'ton' ? 'TON' : 'USD'),
        paymentMethod: method,
        status: 'completed',
        deliveredPayload: deliveredContent,
        createdAt: new Date().toISOString(),
        txHash: method === 'stars' ? `STARS-TX-${Math.floor(100000 + Math.random() * 900000)}` : `0x${Math.random().toString(16).substring(2, 10)}...`
      };

      onOrderCreated(newOrder);

      const successMsg: ChatMessage = {
        id: `m-paid-${Date.now()}`,
        sender: 'bot',
        text: `🎉 *Payment Successful!*\n\nThank you for purchasing *${product.title}* via ${method.toUpperCase()}.\nOrder ID: \`${newOrder.id}\`\n\nYour digital asset has been dispatched below:`,
        time: getNowTime(),
        delivery: {
          payload: deliveredContent,
          type: product.type,
          productTitle: product.title
        },
        inlineButtons: [
          [
            { text: '🛍 Buy Another Item', action: () => handleShowCatalog() },
            { text: '⭐️ Rate Bot (5/5)', action: () => handleRate() }
          ]
        ]
      };

      setMessages(prev => [...prev, successMsg]);
    }, 1200);
  };

  const handleShowOrders = () => {
    const ordersReply: ChatMessage = {
      id: `m-orders-${Date.now()}`,
      sender: 'bot',
      text: `📋 *Your Active TeleSell Purchases:*\n\n1. Windows 11 Pro Key: \`W11P-77A9-994K-112B\`\n2. Alpha Whale Telegram: Active (Expires in 28 days)\n\nAll past license keys remain permanently accessible in this chat.`,
      time: getNowTime(),
      inlineButtons: [
        [{ text: '« Back to Main Menu', action: () => sendBotWelcome() }]
      ]
    };
    setMessages(prev => [...prev, ordersReply]);
  };

  const handleSupport = () => {
    const supportReply: ChatMessage = {
      id: `m-sup-${Date.now()}`,
      sender: 'bot',
      text: `💬 *TeleSell 24/7 Automated Support*\n\nIf your license key failed to activate, or you require help joining the private Telegram community, please message @TeleSellSupportDesk or type your issue here.`,
      time: getNowTime(),
      inlineButtons: [
        [{ text: '« Back to Main Menu', action: () => sendBotWelcome() }]
      ]
    };
    setMessages(prev => [...prev, supportReply]);
  };

  const handleRate = () => {
    const rateReply: ChatMessage = {
      id: `m-rate-${Date.now()}`,
      sender: 'bot',
      text: `⭐ Thank you for your 5-star rating! Your feedback helps us maintain premium uptime and instant key delivery.`,
      time: getNowTime()
    };
    setMessages(prev => [...prev, rateReply]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    const userMsg: ChatMessage = {
      id: `m-user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: getNowTime()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Process Bot Response
    setTimeout(() => {
      const lower = trimmed.toLowerCase();
      if (lower === '/start' || lower === 'start') {
        sendBotWelcome();
      } else if (lower === '/catalog' || lower.includes('buy') || lower.includes('catalog')) {
        handleShowCatalog();
      } else if (lower === '/orders' || lower.includes('order') || lower.includes('license')) {
        handleShowOrders();
      } else if (lower === '/support' || lower.includes('help')) {
        handleSupport();
      } else {
        const foundCommand = bot.commands.find(c => c.command.toLowerCase() === lower);
        const replyText = foundCommand
          ? foundCommand.response
          : `🤖 Echo: Received "${trimmed}". Use /start to open the interactive storefront.`;

        const fallbackReply: ChatMessage = {
          id: `m-bot-${Date.now()}`,
          sender: 'bot',
          text: replyText,
          time: getNowTime(),
          inlineButtons: [
            [{ text: '🛍 Open Catalog', action: () => handleShowCatalog() }]
          ]
        };
        setMessages(prev => [...prev, fallbackReply]);
      }
    }, 400);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-4 sm:p-6 overflow-hidden">
      {/* Top Banner */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Interactive Telegram Bot Client</span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                Live Simulation
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Test end-to-end checkout, Telegram Stars invoicing, and real-time serial key dispatch
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([]);
            sendBotWelcome();
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reset Chat Session
        </button>
      </div>

      {/* Simulator Device Frame */}
      <div className="mx-auto flex h-[620px] w-full max-w-xl flex-col rounded-2xl border border-slate-800 bg-[#17212b] shadow-2xl overflow-hidden">
        {/* Telegram Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#242f3d] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-white shadow">
              {bot.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight">{bot.name}</span>
                <span className="rounded bg-sky-500/20 px-1 text-[10px] font-bold text-sky-400">
                  BOT
                </span>
              </div>
              <span className="text-[11px] text-[#708499]">@{bot.username} · bot</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#708499]">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Verified</span>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-[#0e1621] bg-opacity-95 text-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#2b5278] text-white rounded-br-none'
                    : 'bg-[#182533] text-slate-200 border border-slate-700/40 rounded-bl-none'
                }`}
              >
                {msg.text && (
                  <div className="whitespace-pre-line font-sans">
                    {msg.text}
                  </div>
                )}

                {/* In-App Invoice Card */}
                {msg.invoice && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-slate-100">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Flame className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span>Telegram In-App Invoice</span>
                      </div>
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        Instant Delivery
                      </span>
                    </div>

                    <div className="my-2 space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Total Due:</span>
                        <span className="font-extrabold text-white text-xs">
                          {msg.invoice.method === 'stars' && '⭐ '}
                          {msg.invoice.method === 'ton' && '💎 '}
                          {msg.invoice.price} {msg.invoice.currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Merchant:</span>
                        <span>{bot.name}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => executePayment(msg.invoice!.product, msg.invoice!.method)}
                      disabled={paymentProcessing}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-xs font-bold text-slate-950 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                    >
                      {paymentProcessing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Simulating Telegram Stars Ledger...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>
                            Pay {msg.invoice.price} {msg.invoice.currency} Now
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Digital Delivery Box */}
                {msg.delivery && (
                  <div className="mt-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Delivered Digital Asset:
                      </div>
                      <span className="text-[10px] uppercase text-emerald-500">
                        {msg.delivery.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-emerald-300">
                      <span className="truncate pr-2">{msg.delivery.payload}</span>
                      <button
                        onClick={() => copyToClipboard(msg.delivery!.payload)}
                        className="text-slate-400 hover:text-white"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {copiedKey && (
                      <p className="mt-1 text-[10px] text-emerald-400">Copied to clipboard!</p>
                    )}
                  </div>
                )}

                <div className="mt-1 text-right text-[10px] text-slate-400/80">
                  {msg.time}
                </div>
              </div>

              {/* Inline Telegram Keyboard Buttons */}
              {msg.inlineButtons && msg.inlineButtons.length > 0 && (
                <div className="mt-2 w-full max-w-[85%] space-y-1.5">
                  {msg.inlineButtons.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-1.5">
                      {row.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={btn.action}
                          className={`flex-1 rounded-xl px-3 py-2 text-center text-xs font-semibold shadow transition active:scale-95 ${
                            btn.variant === 'stars'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : btn.variant === 'ton'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                              : btn.variant === 'primary'
                              ? 'bg-[#2b5278] text-white hover:bg-[#34628f]'
                              : 'bg-[#242f3d] text-slate-200 border border-slate-700/40 hover:bg-[#2c394a]'
                          }`}
                        >
                          {btn.text}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {paymentProcessing && (
            <div className="flex items-center gap-2 text-xs text-amber-400 italic">
              <Sparkles className="h-3.5 w-3.5 animate-spin" /> Verifying blockchain signature / Stars authorization...
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 border-t border-slate-700/60 bg-[#17212b] p-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message or /command (/start, /catalog, /orders)..."
            className="flex-1 rounded-xl border border-slate-700/50 bg-[#0e1621] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white transition hover:bg-cyan-500 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
