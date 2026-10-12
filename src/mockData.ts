import { TelegramBot, DigitalProduct, Order, BroadcastCampaign, PlatformSubscriptionSettings } from './types';

export const INITIAL_BOTS: TelegramBot[] = [
  {
    id: 'bot-1',
    name: 'FINE BOTUS — KeyVault Store',
    username: 'FineBotusKeyVault_bot',
    token: '7192847291:AAF9k2_L9aZ9wV8n0PqR3tUvWxYz1234567',
    status: 'online',
    subscribersCount: 4210,
    totalOrders: 820,
    totalRevenue: 262400,
    welcomeMessage: '👋 Welcome to FINE BOTUS KeyVault! Instant 24/7 automated delivery for Windows, Office, and Developer software licenses with Dynamic UPI QR & Instant Verification. Choose a product below.',
    currency: 'INR',
    themeColor: '#0ea5e9',
    paymentAccount: {
      id: 'acc-1',
      accountName: 'KeyVault Technologies Pvt Ltd',
      upiId: 'keyvault.pay@icici',
      merchantProvider: 'Razorpay',
      merchantAccountId: 'rzp_live_merch_88192a',
      mode: 'MODE_A_PROVIDER',
      apiKeyConfigured: true,
      dynamicQrSupported: true,
      autoVerificationEnabled: true,
      manualVerificationAvailable: true,
      paymentsEnabled: true,
      isTestMode: false,
      qrExpiryMinutes: 10
    },
    features: {
      upiDynamicQr: true,
      starsPayment: true,
      cryptoPayment: true,
      autoKeyDelivery: true,
      vipGroupInvite: false,
      resellerSupport: true
    },
    commands: [
      { command: '/start', description: 'Open store main menu', response: 'Welcome to FINE BOTUS! Please select a category below.' },
      { command: '/catalog', description: 'Browse all products', response: 'Here is our full catalog with live Dynamic UPI QR prices.' },
      { command: '/orders', description: 'View previous purchases', response: 'Here are your active licenses and receipt history.' },
      { command: '/support', description: 'Contact admin support', response: 'Our team is available 24/7 at @KeyVaultAdmin.' }
    ],
    webhookUrl: 'https://api.telesell.cloud/webhook/bot-1'
  },
  {
    id: 'bot-2',
    name: 'Alpha VIP Signals',
    username: 'AlphaWhaleSignals_bot',
    token: '6829104829:AAHd81J_mNp81Kq0Rt83Lz0PkAmN2049182',
    status: 'online',
    subscribersCount: 1420,
    totalOrders: 289,
    totalRevenue: 245650,
    welcomeMessage: '⚡ Exclusive trading signals, on-chain whale trackers, and private Discord/Telegram voice calls. Subscribe below for instant invite links.',
    currency: 'INR',
    themeColor: '#0098ea',
    paymentAccount: {
      id: 'acc-2',
      accountName: 'Alpha Research Desk',
      upiId: 'alpharesearch@hdfcbank',
      merchantProvider: 'Cashfree',
      merchantAccountId: 'cf_merch_99214b',
      mode: 'MODE_A_PROVIDER',
      apiKeyConfigured: true,
      dynamicQrSupported: true,
      autoVerificationEnabled: true,
      manualVerificationAvailable: true,
      paymentsEnabled: true,
      isTestMode: false,
      qrExpiryMinutes: 15
    },
    features: {
      upiDynamicQr: true,
      starsPayment: true,
      cryptoPayment: true,
      autoKeyDelivery: false,
      vipGroupInvite: true,
      resellerSupport: false
    },
    commands: [
      { command: '/start', description: 'Start onboarding', response: 'Welcome to Alpha VIP! Choose a subscription plan.' },
      { command: '/plans', description: 'View monthly / annual tiers', response: '1 Month: ₹850 | Lifetime: ₹1500' },
      { command: '/status', description: 'Check subscription time', response: 'Your subscription status is active.' }
    ],
    vipGroupId: '-100293849182'
  },
  {
    id: 'bot-3',
    name: 'CraftUI Direct Indie Store',
    username: 'CraftUIDirect_bot',
    token: '8910293847:AAHk98_21jKq712398jklma9823nmLKQ01',
    status: 'online',
    subscribersCount: 890,
    totalOrders: 134,
    totalRevenue: 42880,
    welcomeMessage: '🎨 Figma templates, UI kits, full-stack Next.js boilerplates, and developer icons delivered directly into your Telegram inbox.',
    currency: 'INR',
    themeColor: '#eab308',
    paymentAccount: {
      id: 'acc-3',
      accountName: 'Rohan Sharma (Indie)',
      upiId: 'rohan.designer@okaxis',
      merchantProvider: 'Custom Gateway',
      merchantAccountId: '',
      mode: 'MODE_B_MANUAL_UPI',
      apiKeyConfigured: false,
      dynamicQrSupported: false,
      autoVerificationEnabled: false,
      manualVerificationAvailable: true,
      paymentsEnabled: true,
      isTestMode: false,
      qrExpiryMinutes: 30
    },
    features: {
      upiDynamicQr: true,
      starsPayment: true,
      cryptoPayment: false,
      autoKeyDelivery: true,
      vipGroupInvite: false,
      resellerSupport: true
    },
    commands: [
      { command: '/start', description: 'Browse assets', response: 'Explore premium UI kits & full-stack kits.' },
      { command: '/free', description: 'Get free sample kits', response: 'Enjoy our free starter kit!' }
    ]
  }
];

export const INITIAL_PRODUCTS: DigitalProduct[] = [
  {
    id: 'prod-1',
    botId: 'bot-1',
    title: 'Basic Product — Windows 11 Key',
    description: 'Genuine digital activation key with direct Microsoft server validation. Instant delivery.',
    type: 'license_key',
    priceInr: 320.00,
    priceUsd: 3.99,
    priceStars: 200,
    priceTon: 0.8,
    discountPercent: 0,
    taxPercent: 0,
    stockType: 'key_pool',
    availableKeys: [
      'W11P-99KJ-289A-001X',
      'W11P-77QP-882B-114M',
      'W11P-33LK-994C-552Z',
      'W11P-11AB-445D-998P'
    ],
    soldKeysCount: 312,
    badge: 'Popular',
    active: true
  },
  {
    id: 'prod-2',
    botId: 'bot-1',
    title: 'Premium Product — Office 2024 Bind',
    description: 'Lifetime binding to Microsoft account. Word, Excel, PowerPoint, Outlook, Access.',
    type: 'license_key',
    priceInr: 850.00,
    priceUsd: 10.99,
    priceStars: 550,
    priceTon: 2.2,
    discountPercent: 0,
    taxPercent: 0,
    stockType: 'key_pool',
    availableKeys: [
      'OFF24-PRO-8812-ZZ91',
      'OFF24-PRO-4421-KK72',
      'OFF24-PRO-6639-VV18'
    ],
    soldKeysCount: 184,
    badge: 'Best Seller',
    active: true
  },
  {
    id: 'prod-3',
    botId: 'bot-1',
    title: 'Advanced Product — Developer Suite Master',
    description: 'JetBrains All Products Pack + GitHub Copilot Enterprise 1-year developer pack.',
    type: 'license_key',
    priceInr: 1500.00,
    priceUsd: 18.50,
    priceStars: 950,
    priceTon: 3.9,
    discountPercent: 0,
    taxPercent: 0,
    stockType: 'key_pool',
    availableKeys: [
      'DEV-SUITE-MASTER-9912A',
      'DEV-SUITE-MASTER-4421K'
    ],
    soldKeysCount: 68,
    badge: 'Ultimate',
    active: true
  },
  {
    id: 'prod-4',
    botId: 'bot-2',
    title: 'Alpha Whale Signals — 30 Day Access',
    description: 'Real-time spot & perpetual futures calls, TP/SL alerts, automated invite link generation.',
    type: 'vip_channel',
    priceInr: 850.00,
    priceUsd: 10.50,
    priceStars: 520,
    priceTon: 2.1,
    discountPercent: 0,
    taxPercent: 0,
    stockType: 'subscription',
    availableKeys: [],
    soldKeysCount: 220,
    badge: 'Monthly Pass',
    active: true
  },
  {
    id: 'prod-5',
    botId: 'bot-3',
    title: 'SaaS Foundry — Next.js 15 Boilerplate',
    description: 'Production-ready SaaS template with Auth, Stripe, Tailwind CSS v4, and Postgres schema.',
    type: 'digital_file',
    priceInr: 320.00,
    priceUsd: 3.99,
    priceStars: 200,
    priceTon: 0.8,
    discountPercent: 0,
    taxPercent: 0,
    stockType: 'unlimited',
    availableKeys: [],
    soldKeysCount: 94,
    badge: 'Staff Pick',
    active: true
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'FB-ORD-10245',
    botId: 'bot-1',
    productId: 'prod-1',
    productTitle: 'Basic Product — Windows 11 Key',
    customerTelegramId: '984120491',
    customerUsername: 'alex_nordic',
    baseAmount: 320.00,
    discountAmount: 0,
    taxAmount: 0,
    amount: 320.00,
    currency: 'INR',
    paymentMethod: 'upi_dynamic_qr',
    qrGenerationMode: 'MODE_A_PROVIDER',
    merchantAccountRef: 'KeyVault Technologies Pvt Ltd (keyvault.pay@icici)',
    providerOrderId: 'rzp_order_FB10245_live',
    providerTxId: 'pay_rzp_992182049',
    status: 'PAYMENT_SUCCESSFUL',
    deliveredPayload: 'W11P-77A9-994K-112B',
    fulfillmentStatus: 'DELIVERED',
    createdAt: '2026-10-09T13:44:00Z',
    verificationTimestamp: '2026-10-09T13:45:10Z',
    txHash: 'UPI-RR-9921840192',
    isTestTransaction: false
  },
  {
    id: 'FB-ORD-10244',
    botId: 'bot-1',
    productId: 'prod-2',
    productTitle: 'Premium Product — Office 2024 Bind',
    customerTelegramId: '109283741',
    customerUsername: 'priya_tech',
    baseAmount: 850.00,
    discountAmount: 0,
    taxAmount: 0,
    amount: 850.00,
    currency: 'INR',
    paymentMethod: 'upi_dynamic_qr',
    qrGenerationMode: 'MODE_A_PROVIDER',
    merchantAccountRef: 'KeyVault Technologies Pvt Ltd (keyvault.pay@icici)',
    providerOrderId: 'rzp_order_FB10244_live',
    providerTxId: 'pay_rzp_881902341',
    status: 'PAYMENT_SUCCESSFUL',
    deliveredPayload: 'OFF24-PRO-1149-KK92',
    fulfillmentStatus: 'DELIVERED',
    createdAt: '2026-10-09T12:15:00Z',
    verificationTimestamp: '2026-10-09T12:16:04Z',
    txHash: 'UPI-RR-8819024810',
    isTestTransaction: false
  },
  {
    id: 'FB-ORD-10243',
    botId: 'bot-1',
    productId: 'prod-3',
    productTitle: 'Advanced Product — Developer Suite Master',
    customerTelegramId: '88729104',
    customerUsername: 'karan_singh',
    baseAmount: 1500.00,
    discountAmount: 0,
    taxAmount: 0,
    amount: 1500.00,
    currency: 'INR',
    paymentMethod: 'upi_dynamic_qr',
    qrGenerationMode: 'MODE_A_PROVIDER',
    merchantAccountRef: 'KeyVault Technologies Pvt Ltd (keyvault.pay@icici)',
    providerOrderId: 'rzp_order_FB10243_live',
    status: 'PAYMENT_PENDING',
    deliveredPayload: '',
    fulfillmentStatus: 'UNFULFILLED',
    createdAt: '2026-10-09T14:10:00Z',
    isTestTransaction: false
  }
];

export const INITIAL_BROADCASTS: BroadcastCampaign[] = [
  {
    id: 'bc-1',
    botId: 'bot-1',
    title: 'Instant UPI Dynamic QR Checkout Announcement',
    messageText: '🎉 All products now support 1-tap UPI Dynamic QR checkout via GPay, PhonePe, Paytm, and BHIM! Instant automated license delivery.',
    buttonText: '🛍 Shop with UPI QR',
    buttonUrl: 'https://t.me/FineBotusKeyVault_bot?start=upi_catalog',
    sentCount: 4210,
    deliveredPercent: 99.4,
    status: 'sent',
    sentAt: '2026-10-08T10:00:00Z'
  }
];

export const PLATFORM_SUBSCRIPTION_SETTINGS: PlatformSubscriptionSettings = {
  enabled: true,
  platformMerchantId: 'PLATFORM_FINE_BOTUS_CORP_01',
  platformUpiId: 'finebotus.platform@axisbank',
  planName: 'FINE BOTUS SaaS Pro Tier',
  planMonthlyFeeInr: 1499.00
};
