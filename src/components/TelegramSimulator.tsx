import React, { useState, useRef, useEffect } from 'react';
import { TelegramBot, DigitalProduct, Order, PaymentStatus } from '../types';
import {
  calculateOrderPrice,
  buildUpiPayload,
  generateDynamicQrDataUrl,
  simulateServerVerification,
} from '../utils/upiQrService';
import {
  Send,
  RefreshCw,
  CheckCircle,
  Copy,
  ExternalLink,
  Shield,
  CreditCard,
  QrCode,
  Flame,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle
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
  inlineButtons?: { text: string; action: () => void; variant?: 'primary' | 'stars' | 'upi' | 'danger' }[][];
  upiQrCard?: {
    orderId: string;
    productTitle: string;
    amount: number;
    paymentAccountName: string;
    paymentStatus: PaymentStatus;
    qrDataUrl: string;
    upiPayload: string;
    expiresAt: string;
    isManualOnly?: boolean;
    orderRef: Order;
  };
  delivery?: {
    payload: string;
    type: string;
    productTitle: string;
    orderId: string;
  };
}

import { getDefaultPaymentAccount } from '../utils/defaults';

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  bot,
  products,
  onOrderCreated,
  onClose,
}) => {
  const paymentAccount = bot.paymentAccount || getDefaultPaymentAccount(bot.id, bot.name, bot.username);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activePendingOrder, setActivePendingOrder] = useState<Order | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getNowTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    sendBotWelcome();
  }, [bot.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isVerifying]);

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
          { text: '🛍 Browse Products (Dynamic UPI QR)', action: () => handleShowCatalog(), variant: 'upi' }
        ],
        [
          { text: '⭐ Pay with Stars (0% Fee)', action: () => handleShowCatalog('stars'), variant: 'stars' },
          { text: '📦 My Orders & Keys', action: () => handleShowOrders() }
        ],
        [
          { text: '💬 Support & FAQ', action: () => handleSupport() }
        ]
      ]
    };

    setMessages([initialUserMsg, initialBotMsg]);
  };

  const handleShowCatalog = (filterMethod?: 'stars') => {
    const activeProducts = products.filter((p) => p.botId === bot.id && p.active);

    const botReply: ChatMessage = {
      id: `m-cat-${Date.now()}`,
      sender: 'bot',
      text: `🛒 *${bot.name} Product Catalog*\n\nChoose an item below to check real-time stock and checkout with *Automatic Dynamic UPI QR*:`,
      time: getNowTime(),
      inlineButtons: activeProducts.map((prod) => [
        {
          text: `${prod.badge ? `[${prod.badge}] ` : ''}${prod.title} — ₹${(prod.priceInr ?? 320).toFixed(2)}`,
          action: () => handleSelectProduct(prod),
          variant: 'primary'
        }
      ])
    };

    setMessages((prev) => [...prev, botReply]);
  };

  const handleSelectProduct = (product: DigitalProduct) => {
    const stockInfo =
      product.stockType === 'key_pool'
        ? `🔑 Available in pool: *${product.availableKeys.length} license keys*`
        : '⚡ Instant digital access';

    const priceInrDisplay = (product.priceInr ?? 320).toFixed(2);

    const reply: ChatMessage = {
      id: `m-prod-${Date.now()}`,
      sender: 'bot',
      text: `📦 *${product.title}*\n\n${product.description}\n\n${stockInfo}\n\n*Official Pricing:*\n• UPI (India): *₹${priceInrDisplay}*\n• Telegram Stars: ⭐ ${product.priceStars}\n• TON Network: 💎 ${product.priceTon} TON\n\nApplicable Terms: Instant automated server dispatch upon verified payment confirmation.`,
      time: getNowTime(),
      inlineButtons: [
        [
          {
            text: `💳 BUY NOW — ₹${priceInrDisplay} (Dynamic UPI QR)`,
            action: () => handleInitiateDynamicUpiPurchase(product),
            variant: 'upi'
          }
        ],
        [
          {
            text: `⭐ Buy with Stars (${product.priceStars} Stars)`,
            action: () => handleLegacyCheckout(product, 'stars'),
            variant: 'stars'
          },
          {
            text: '« Back to Catalog',
            action: () => handleShowCatalog()
          }
        ]
      ]
    };

    setMessages((prev) => [...prev, reply]);
  };

  /**
   * STEP 5 to 10: Backend Authoritative Price Calculation & Dynamic QR Generation
   */
  const handleInitiateDynamicUpiPurchase = async (product: DigitalProduct) => {
    const calc = calculateOrderPrice(product, 1, 0);
    const orderId = `FB-ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const expiresAt = new Date(Date.now() + paymentAccount.qrExpiryMinutes * 60000);

    const upiUri = buildUpiPayload(
      paymentAccount.upiId,
      paymentAccount.accountName,
      calc.finalAmount,
      orderId,
      product.title
    );

    let qrDataUrl = '';
    try {
      qrDataUrl = await generateDynamicQrDataUrl(upiUri);
    } catch (e) {
      console.error(e);
    }

    const newOrder: Order = {
      id: orderId,
      botId: bot.id,
      productId: product.id,
      productTitle: product.title,
      customerTelegramId: '984120491',
      customerUsername: 'alex_nordic',
      baseAmount: calc.baseAmount,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      amount: calc.finalAmount,
      currency: 'INR',
      paymentMethod: 'upi_dynamic_qr',
      qrGenerationMode: paymentAccount.mode,
      merchantAccountRef: `${paymentAccount.accountName} (${paymentAccount.upiId})`,
      providerOrderId: `rzp_${orderId.toLowerCase()}`,
      status: 'PAYMENT_PENDING',
      qrPayload: upiUri,
      qrExpiresAt: expiresAt.toISOString(),
      deliveredPayload: '',
      fulfillmentStatus: 'UNFULFILLED',
      createdAt: new Date().toISOString(),
      isTestTransaction: paymentAccount.isTestMode,
    };

    setActivePendingOrder(newOrder);
    onOrderCreated(newOrder);

    const isManualOnly = paymentAccount.mode === 'MODE_B_MANUAL_UPI';

    const qrMsg: ChatMessage = {
      id: `m-qr-${Date.now()}`,
      sender: 'bot',
      time: getNowTime(),
      upiQrCard: {
        orderId,
        productTitle: product.title,
        amount: calc.finalAmount,
        paymentAccountName: paymentAccount.accountName,
        paymentStatus: 'PAYMENT_PENDING',
        qrDataUrl,
        upiPayload: upiUri,
        expiresAt: expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isManualOnly,
        orderRef: newOrder,
      },
      inlineButtons: [
        [
          {
            text: `💳 PAY NOW (₹${calc.finalAmount.toFixed(2)})`,
            action: () => handlePayNowIntent(upiUri),
            variant: 'upi'
          },
          {
            text: '🔄 CHECK PAYMENT STATUS',
            action: () => handleCheckPaymentStatus(newOrder, product, false),
            variant: 'primary'
          }
        ],
        [
          {
            text: '⚡ Simulate Bank Payment (Test Switch)',
            action: () => handleCheckPaymentStatus(newOrder, product, true),
            variant: 'stars'
          }
        ],
        [
          {
            text: '❌ CANCEL ORDER',
            action: () => handleCancelOrder(orderId),
            variant: 'danger'
          },
          {
            text: '💬 CONTACT SUPPORT',
            action: () => handleSupport()
          }
        ]
      ]
    };

    setMessages((prev) => [...prev, qrMsg]);
  };

  const handlePayNowIntent = (upiUri: string) => {
    // Copies upi:// link or attempts intent
    navigator.clipboard.writeText(upiUri);
    const intentMsg: ChatMessage = {
      id: `m-intent-${Date.now()}`,
      sender: 'bot',
      text: `📱 *UPI Intent Triggered:*\n\nUPI URI copied to clipboard: \`${upiUri}\`\n\nOpen Google Pay, PhonePe, Paytm, or BHIM to complete the exact payment of ₹${activePendingOrder?.amount.toFixed(2)}.`,
      time: getNowTime(),
    };
    setMessages((prev) => [...prev, intentMsg]);
  };

  /**
   * STEP 11 to 13: Backend Payment Verification Request
   * Never marks paid by itself without authenticated server-side verification!
   */
  const handleCheckPaymentStatus = (order: Order, product: DigitalProduct, forceSimulationSuccess = false) => {
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);

      const verification = simulateServerVerification(order, bot, forceSimulationSuccess);

      if (verification.success && verification.newStatus === 'PAYMENT_SUCCESSFUL') {
        // FULFILL PRODUCT DELIVERED
        let deliveredContent = '';
        if (product.type === 'license_key') {
          deliveredContent =
            product.availableKeys[0] ||
            `W11P-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-99X`;
        } else if (product.type === 'vip_channel') {
          deliveredContent = `https://t.me/+VIP_Invite_${Math.random().toString(36).substring(2, 8)}`;
        } else {
          deliveredContent = `https://downloads.telesell.cloud/deliveries/vault-${Date.now()}.zip`;
        }

        const updatedOrder: Order = {
          ...order,
          status: 'PAYMENT_SUCCESSFUL',
          providerTxId: verification.providerTxId,
          verificationTimestamp: new Date().toISOString(),
          deliveredPayload: deliveredContent,
          fulfillmentStatus: 'DELIVERED',
        };

        setActivePendingOrder(null);
        onOrderCreated(updatedOrder);

        const successMsg: ChatMessage = {
          id: `m-success-${Date.now()}`,
          sender: 'bot',
          text: `━━━━━━━━━━━━━━━━━━━━\n🎉 *PAYMENT VERIFIED & CONFIRMED*\n━━━━━━━━━━━━━━━━━━━━\n\nOrder ID: \`${order.id}\`\nAmount Received: *₹${order.amount.toFixed(2)}*\nMerchant: *${paymentAccount.accountName}*\nProvider TX ID: \`${verification.providerTxId}\`\nStatus: *PAYMENT_SUCCESSFUL*\n\nYour digital asset has been dispatched below:`,
          time: getNowTime(),
          delivery: {
            payload: deliveredContent,
            type: product.type,
            productTitle: product.title,
            orderId: order.id,
          },
          inlineButtons: [
            [
              { text: '🛍 Buy Another Item', action: () => handleShowCatalog(), variant: 'primary' },
              { text: '📦 View My Orders', action: () => handleShowOrders() }
            ]
          ]
        };

        setMessages((prev) => [...prev, successMsg]);
      } else if (verification.isManualOnly) {
        // Mode B Alert
        const alertMsg: ChatMessage = {
          id: `m-manual-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ *MANUAL VERIFICATION — AUTOMATIC CONFIRMATION UNAVAILABLE*\n\nThis bot operates in Mode B (UPI-ID fallback). Your order reference \`${order.id}\` is in status *PENDING_VERIFICATION*.\n\nPlease share your UTR / transaction ID with @KeyVaultAdmin for manual review. Product will be released after human confirmation.`,
          time: getNowTime(),
          inlineButtons: [
            [
              { text: '💬 Contact Admin for Manual Audit', action: () => handleSupport(), variant: 'primary' },
              { text: '« Back to Store', action: () => handleShowCatalog() }
            ]
          ]
        };
        setMessages((prev) => [...prev, alertMsg]);
      } else {
        // Customer Alert: Payment not yet confirmed
        const alertMsg: ChatMessage = {
          id: `m-alert-${Date.now()}`,
          sender: 'bot',
          text: `⏳ *PAYMENT NOT CONFIRMED*\n\nYour order is still awaiting payment confirmation.\n\nOrder ID: \`${order.id}\`\nAmount: *₹${order.amount.toFixed(2)} INR*\nStatus: *PAYMENT_PENDING*\n\nPlease complete your payment using the QR code above or check the status again. Your product will be delivered automatically after server-side verification.`,
          time: getNowTime(),
          inlineButtons: [
            [
              {
                text: '🔄 CHECK PAYMENT STATUS AGAIN',
                action: () => handleCheckPaymentStatus(order, product, false),
                variant: 'primary'
              },
              {
                text: '⚡ Simulate Bank Payment (Test)',
                action: () => handleCheckPaymentStatus(order, product, true),
                variant: 'stars'
              }
            ],
            [
              { text: '❌ CANCEL ORDER', action: () => handleCancelOrder(order.id), variant: 'danger' },
              { text: '💬 CONTACT SUPPORT', action: () => handleSupport() }
            ]
          ]
        };

        setMessages((prev) => [...prev, alertMsg]);
      }
    }, 800);
  };

  const handleCancelOrder = (orderId: string) => {
    setActivePendingOrder(null);
    const cancelMsg: ChatMessage = {
      id: `m-cancel-${Date.now()}`,
      sender: 'bot',
      text: `❌ *Order Cancelled*\n\nOrder \`${orderId}\` has been marked as cancelled. Any pending payment request has been invalidated.`,
      time: getNowTime(),
      inlineButtons: [
        [{ text: '🛍 Return to Catalog', action: () => handleShowCatalog() }]
      ]
    };
    setMessages((prev) => [...prev, cancelMsg]);
  };

  const handleLegacyCheckout = (product: DigitalProduct, method: 'stars') => {
    const orderId = `FB-ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: Order = {
      id: orderId,
      botId: bot.id,
      productId: product.id,
      productTitle: product.title,
      customerTelegramId: '984120491',
      customerUsername: 'alex_nordic',
      baseAmount: product.priceInr,
      discountAmount: 0,
      taxAmount: 0,
      amount: product.priceStars,
      currency: 'STARS',
      paymentMethod: 'stars',
      qrGenerationMode: 'MODE_A_PROVIDER',
      merchantAccountRef: 'Telegram Stars Merchant Desk',
      providerOrderId: `stars_${orderId}`,
      status: 'PAYMENT_SUCCESSFUL',
      deliveredPayload: product.availableKeys[0] || 'KEY-STAR-9921',
      fulfillmentStatus: 'DELIVERED',
      createdAt: new Date().toISOString(),
      verificationTimestamp: new Date().toISOString(),
    };

    onOrderCreated(newOrder);

    const successMsg: ChatMessage = {
      id: `m-paid-stars-${Date.now()}`,
      sender: 'bot',
      text: `🎉 *Telegram Stars Payment Successful!*\n\nPaid ⭐ ${product.priceStars} Stars.\nDelivered License Key: \`${newOrder.deliveredPayload}\``,
      time: getNowTime(),
      inlineButtons: [
        [{ text: '🛍 Buy Another Item', action: () => handleShowCatalog() }]
      ]
    };

    setMessages((prev) => [...prev, successMsg]);
  };

  const handleShowOrders = () => {
    const ordersReply: ChatMessage = {
      id: `m-orders-${Date.now()}`,
      sender: 'bot',
      text: `📋 *Your Active TeleDash / FINE BOTUS Purchases:*\n\n1. Basic Product (Windows 11 Key): \`W11P-77A9-994K-112B\`\n2. Office 2024 Bind Key: \`OFF24-PRO-1149-KK92\`\n\nAll purchased license keys remain permanently archived in your Telegram chat history.`,
      time: getNowTime(),
      inlineButtons: [
        [{ text: '« Back to Main Menu', action: () => sendBotWelcome() }]
      ]
    };
    setMessages((prev) => [...prev, ordersReply]);
  };

  const handleSupport = () => {
    const supportReply: ChatMessage = {
      id: `m-sup-${Date.now()}`,
      sender: 'bot',
      text: `💬 *FINE BOTUS 24/7 Automated Merchant Support*\n\nIf you experienced any issue with Dynamic UPI QR generation or payment verification for @${bot.username}, please message @KeyVaultAdmin or provide your Order ID.`,
      time: getNowTime(),
      inlineButtons: [
        [{ text: '« Back to Main Menu', action: () => sendBotWelcome() }]
      ]
    };
    setMessages((prev) => [...prev, supportReply]);
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
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>FINE BOTUS — Telegram Live Simulator</span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                Dynamic UPI QR Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Test end-to-end customer checkout, product-price-based Dynamic UPI QR generation, and server-side payment verification
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
            <span>UPI Verified</span>
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
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed ${
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

                {/* DYNAMIC UPI QR PAYMENT CARD */}
                {msg.upiQrCard && (
                  <div className="mt-3 rounded-xl border border-cyan-500/40 bg-slate-950 p-3.5 text-slate-100 shadow-xl">
                    <div className="text-center font-bold text-xs tracking-wider text-cyan-400 pb-2 border-b border-slate-800">
                      ━━━━━━━━━━━━━━━━━━━━<br />
                      💎 FINE BOTUS — SECURE PAYMENT<br />
                      ━━━━━━━━━━━━━━━━━━━━
                    </div>

                    <div className="my-2 space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">🛒 Product:</span>
                        <span className="font-bold text-white">{msg.upiQrCard.productTitle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">🆔 Order ID:</span>
                        <span className="font-mono text-cyan-300">{msg.upiQrCard.orderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">💰 Amount to Pay:</span>
                        <span className="font-extrabold text-sm text-emerald-400">
                          ₹{msg.upiQrCard.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">👤 Payment Account:</span>
                        <span className="text-slate-200 truncate max-w-[170px]">
                          {msg.upiQrCard.paymentAccountName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">📌 Payment Status:</span>
                        <span className="font-bold text-amber-400">
                          {msg.upiQrCard.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {msg.upiQrCard.isManualOnly && (
                      <div className="my-2 rounded bg-amber-500/10 p-2 text-[10px] text-amber-300 border border-amber-500/20">
                        ⚠️ <strong>MANUAL VERIFICATION MODE:</strong> Automatic payment confirmation is unavailable. Order will be marked after merchant audit.
                      </div>
                    )}

                    {/* QR Code Container */}
                    <div className="my-3 flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-inner">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-1">
                        📲 SCAN QR CODE TO PAY
                      </div>
                      {msg.upiQrCard.qrDataUrl ? (
                        <img
                          src={msg.upiQrCard.qrDataUrl}
                          alt="Dynamic UPI QR"
                          className="h-44 w-44 rounded-lg object-contain"
                        />
                      ) : (
                        <div className="h-44 w-44 flex items-center justify-center text-slate-500 text-xs">
                          Generating QR...
                        </div>
                      )}
                      <div className="mt-1 text-[10px] font-semibold text-slate-700">
                        Amount: ₹{msg.upiQrCard.amount.toFixed(2)} · Order: {msg.upiQrCard.orderId}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Expires At: {msg.upiQrCard.expiresAt}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center italic">
                      After completing the payment, press the button below to request a payment-status check.
                    </p>
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

              {/* Inline Telegram Buttons */}
              {msg.inlineButtons && msg.inlineButtons.length > 0 && (
                <div className="mt-2 w-full max-w-[88%] space-y-1.5">
                  {msg.inlineButtons.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-1.5">
                      {row.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={btn.action}
                          className={`flex-1 rounded-xl px-3 py-2 text-center text-xs font-semibold shadow transition active:scale-95 ${
                            btn.variant === 'upi'
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:brightness-110 shadow-cyan-600/20'
                              : btn.variant === 'stars'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : btn.variant === 'danger'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
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

          {isVerifying && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 italic">
              <Sparkles className="h-3.5 w-3.5 animate-spin" /> Querying authenticated provider banking webhook/API...
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!inputText.trim()) return;
            const text = inputText.trim();
            setInputText('');
            const userMsg: ChatMessage = {
              id: `m-user-${Date.now()}`,
              sender: 'user',
              text,
              time: getNowTime()
            };
            setMessages(prev => [...prev, userMsg]);
            setTimeout(() => {
              const lower = text.toLowerCase();
              if (lower === '/start' || lower === 'start') {
                sendBotWelcome();
              } else if (lower.includes('catalog') || lower.includes('buy')) {
                handleShowCatalog();
              } else if (lower.includes('order')) {
                handleShowOrders();
              } else {
                handleSupport();
              }
            }, 300);
          }}
          className="flex items-center gap-2 border-t border-slate-700/60 bg-[#17212b] p-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type /start, /catalog, or ask a question..."
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
