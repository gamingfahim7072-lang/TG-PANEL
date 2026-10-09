import { TelegramBot, DigitalProduct, Order, BroadcastCampaign } from './types';

export const INITIAL_BOTS: TelegramBot[] = [
  {
    id: 'bot-1',
    name: 'KeyVault Software Bot',
    username: 'KeyVaultSales_bot',
    token: '7192847291:AAF9k2_L9aZ9wV8n0PqR3tUvWxYz1234567',
    status: 'online',
    subscribersCount: 3840,
    totalOrders: 642,
    totalRevenue: 14890,
    welcomeMessage: '👋 Welcome to KeyVault! Instant 24/7 automated delivery for Windows, Office, and Developer license keys. Select a category below to get started.',
    currency: 'USD',
    themeColor: '#0ea5e9',
    features: {
      starsPayment: true,
      cryptoPayment: true,
      autoKeyDelivery: true,
      vipGroupInvite: false,
      resellerSupport: true
    },
    commands: [
      { command: '/start', description: 'Open store main menu', response: 'Welcome to KeyVault! Please select a category below.' },
      { command: '/catalog', description: 'Browse all products', response: 'Here is our full catalog with live stock.' },
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
    totalRevenue: 28450,
    welcomeMessage: '⚡ Exclusive trading signals, on-chain whale trackers, and private Discord/Telegram voice calls. Subscribe below for instant invite links.',
    currency: 'TON',
    themeColor: '#0098ea',
    features: {
      starsPayment: true,
      cryptoPayment: true,
      autoKeyDelivery: false,
      vipGroupInvite: true,
      resellerSupport: false
    },
    commands: [
      { command: '/start', description: 'Start onboarding', response: 'Welcome to Alpha VIP! Choose a subscription plan.' },
      { command: '/plans', description: 'View monthly / annual tiers', response: '1 Month: 15 TON | Lifetime: 75 TON' },
      { command: '/status', description: 'Check subscription time', response: 'Your subscription status is active.' }
    ],
    vipGroupId: '-100293849182'
  },
  {
    id: 'bot-3',
    name: 'CodeStack Premium Assets',
    username: 'CodeStackStore_bot',
    token: '8910293847:AAHk98_21jKq712398jklma9823nmLKQ01',
    status: 'online',
    subscribersCount: 890,
    totalOrders: 134,
    totalRevenue: 4920,
    welcomeMessage: '🎨 Figma templates, UI kits, full-stack Next.js boilerplates, and developer icons delivered directly into your Telegram inbox.',
    currency: 'STARS',
    themeColor: '#eab308',
    features: {
      starsPayment: true,
      cryptoPayment: true,
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
    title: 'Windows 11 Pro Retail License (1 PC)',
    description: 'Genuine digital activation key with direct Microsoft server validation. Instant delivery.',
    type: 'license_key',
    priceUsd: 14.99,
    priceStars: 750,
    priceTon: 2.8,
    stockType: 'key_pool',
    availableKeys: [
      'W11P-99KJ-289A-001X',
      'W11P-77QP-882B-114M',
      'W11P-33LK-994C-552Z',
      'W11P-11AB-445D-998P'
    ],
    soldKeysCount: 312,
    badge: 'Best Seller',
    active: true
  },
  {
    id: 'prod-2',
    botId: 'bot-1',
    title: 'Office 2024 Professional Plus Bind Key',
    description: 'Lifetime binding to Microsoft account. Word, Excel, PowerPoint, Outlook, Access.',
    type: 'license_key',
    priceUsd: 29.99,
    priceStars: 1500,
    priceTon: 5.6,
    stockType: 'key_pool',
    availableKeys: [
      'OFF24-PRO-8812-ZZ91',
      'OFF24-PRO-4421-KK72',
      'OFF24-PRO-6639-VV18'
    ],
    soldKeysCount: 184,
    badge: 'Popular',
    active: true
  },
  {
    id: 'prod-3',
    botId: 'bot-2',
    title: 'Alpha Whale Signals - 30 Day Access',
    description: 'Real-time spot & perpetual futures calls, TP/SL alerts, automated invite link generation.',
    type: 'vip_channel',
    priceUsd: 49.00,
    priceStars: 2450,
    priceTon: 9.5,
    stockType: 'subscription',
    availableKeys: [],
    soldKeysCount: 220,
    badge: 'Monthly Pass',
    active: true
  },
  {
    id: 'prod-4',
    botId: 'bot-2',
    title: 'Lifetime Whale Inner Circle Pass',
    description: 'Permanent private channel membership + weekly Zoom strategy and on-chain intelligence.',
    type: 'vip_channel',
    priceUsd: 299.00,
    priceStars: 14950,
    priceTon: 58.0,
    stockType: 'unlimited',
    availableKeys: [],
    soldKeysCount: 69,
    badge: 'VIP Lifetime',
    active: true
  },
  {
    id: 'prod-5',
    botId: 'bot-3',
    title: 'SaaS Foundry - Next.js 15 Boilerplate',
    description: 'Production-ready SaaS template with Auth, Stripe, Tailwind CSS v4, and Postgres schema.',
    type: 'digital_file',
    priceUsd: 39.00,
    priceStars: 1950,
    priceTon: 7.5,
    stockType: 'unlimited',
    availableKeys: [],
    soldKeysCount: 94,
    badge: 'Staff Pick',
    active: true
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-9841',
    botId: 'bot-1',
    productId: 'prod-1',
    productTitle: 'Windows 11 Pro Retail License (1 PC)',
    customerTelegramId: '984120491',
    customerUsername: 'alex_nordic',
    amount: 14.99,
    currency: 'USD',
    paymentMethod: 'stars',
    status: 'completed',
    deliveredPayload: 'W11P-77A9-994K-112B',
    createdAt: '2026-10-09T12:44:00Z',
    txHash: 'STARS-TX-998240'
  },
  {
    id: 'ORD-9840',
    botId: 'bot-2',
    productId: 'prod-3',
    productTitle: 'Alpha Whale Signals - 30 Day Access',
    customerTelegramId: '109283741',
    customerUsername: 'crypto_marco',
    amount: 49.00,
    currency: 'TON',
    paymentMethod: 'ton',
    status: 'completed',
    deliveredPayload: 'https://t.me/+AbX9Z1kLq00aBcDe (Valid 1-use)',
    createdAt: '2026-10-09T11:15:00Z',
    txHash: '0x3f7b9...882c1'
  },
  {
    id: 'ORD-9839',
    botId: 'bot-1',
    productId: 'prod-2',
    productTitle: 'Office 2024 Professional Plus Bind Key',
    customerTelegramId: '88729104',
    customerUsername: 'sarah_dev99',
    amount: 29.99,
    currency: 'USD',
    paymentMethod: 'usdt',
    status: 'completed',
    deliveredPayload: 'OFF24-PRO-1149-KK92',
    createdAt: '2026-10-09T09:30:00Z',
    txHash: '0x99a...442d'
  },
  {
    id: 'ORD-9838',
    botId: 'bot-3',
    productId: 'prod-5',
    productTitle: 'SaaS Foundry - Next.js 15 Boilerplate',
    customerTelegramId: '44512998',
    customerUsername: 'kenji_tokyo',
    amount: 39.00,
    currency: 'STARS',
    paymentMethod: 'stars',
    status: 'completed',
    deliveredPayload: 'https://github.com/telesell-vault/saas-foundry-invite/token_882',
    createdAt: '2026-10-08T22:10:00Z',
    txHash: 'STARS-TX-881290'
  },
  {
    id: 'ORD-9837',
    botId: 'bot-2',
    productId: 'prod-4',
    productTitle: 'Lifetime Whale Inner Circle Pass',
    customerTelegramId: '77281944',
    customerUsername: 'vitaly_defi',
    amount: 299.00,
    currency: 'TON',
    paymentMethod: 'ton',
    status: 'completed',
    deliveredPayload: 'https://t.me/+WhaleLifetimeInviteVIP9',
    createdAt: '2026-10-08T18:04:00Z',
    txHash: '0x88f...102a'
  }
];

export const INITIAL_BROADCASTS: BroadcastCampaign[] = [
  {
    id: 'bc-1',
    botId: 'bot-1',
    title: 'Weekend 25% Flash Sale Announcement',
    messageText: '🎉 Weekend Flash Sale! Use promo code WEEKEND25 for instant 25% off all Windows and Office retail licenses.',
    buttonText: '🛍 Open Discount Store',
    buttonUrl: 'https://t.me/KeyVaultSales_bot?start=flash25',
    sentCount: 3840,
    deliveredPercent: 99.2,
    status: 'sent',
    sentAt: '2026-10-07T14:00:00Z'
  },
  {
    id: 'bc-2',
    botId: 'bot-2',
    title: 'October On-Chain Market Report Released',
    messageText: '🚨 Free preview of the October On-Chain Intelligence dossier is out. Read the key liquidity clusters now.',
    buttonText: '📊 Read Free Report',
    buttonUrl: 'https://t.me/AlphaWhaleSignals_bot?start=report_oct',
    sentCount: 1420,
    deliveredPercent: 98.6,
    status: 'sent',
    sentAt: '2026-10-06T10:30:00Z'
  }
];
