import { TelegramBot, DigitalProduct, UpiPaymentAccount, Order } from '../types';

export function getDefaultPaymentAccount(botId: string, botName: string, username: string): UpiPaymentAccount {
  const cleanUser = (username || 'merchant').replace('@', '').toLowerCase();
  return {
    id: `acc-${botId}`,
    accountName: botName || 'Merchant Desk',
    upiId: `${cleanUser}@okhdfcbank`,
    merchantProvider: 'Razorpay',
    merchantAccountId: `rzp_live_${botId.replace('-', '')}`,
    mode: 'MODE_A_PROVIDER',
    apiKeyConfigured: true,
    dynamicQrSupported: true,
    autoVerificationEnabled: true,
    manualVerificationAvailable: true,
    paymentsEnabled: true,
    isTestMode: false,
    qrExpiryMinutes: 10,
  };
}

export function sanitizeBot(rawBot: Partial<TelegramBot>): TelegramBot {
  const id = rawBot.id || `bot-${Date.now()}`;
  const name = rawBot.name || 'Telegram Store Bot';
  const username = rawBot.username || 'store_bot';

  const paymentAccount: UpiPaymentAccount = rawBot.paymentAccount
    ? {
        ...getDefaultPaymentAccount(id, name, username),
        ...rawBot.paymentAccount,
      }
    : getDefaultPaymentAccount(id, name, username);

  const features = {
    upiDynamicQr: true,
    starsPayment: true,
    cryptoPayment: true,
    autoKeyDelivery: true,
    vipGroupInvite: false,
    resellerSupport: true,
    ...(rawBot.features || {}),
  };

  return {
    id,
    name,
    username,
    token: rawBot.token || '7192847291:AAF9k2_L9aZ9wV8n0PqR3tUvWxYz1234567',
    status: rawBot.status || 'online',
    subscribersCount: rawBot.subscribersCount ?? 1200,
    totalOrders: rawBot.totalOrders ?? 0,
    totalRevenue: rawBot.totalRevenue ?? 0,
    welcomeMessage:
      rawBot.welcomeMessage ||
      `👋 Welcome to ${name}! Instant 24/7 automated delivery with Dynamic UPI QR & Instant Verification. Choose a product below.`,
    currency: rawBot.currency || 'INR',
    themeColor: rawBot.themeColor || '#0ea5e9',
    paymentAccount,
    features,
    commands: rawBot.commands || [
      { command: '/start', description: 'Open store main menu', response: 'Welcome! Choose a product below.' },
      { command: '/catalog', description: 'Browse all products', response: 'Here is our full catalog with live Dynamic UPI QR prices.' },
      { command: '/orders', description: 'View previous purchases', response: 'Here are your active licenses and receipt history.' },
      { command: '/support', description: 'Contact admin support', response: 'Our team is available 24/7.' }
    ],
    webhookUrl: rawBot.webhookUrl || `https://api.telesell.cloud/webhook/${id}`,
    vipGroupId: rawBot.vipGroupId,
  };
}

export function sanitizeProduct(rawProd: Partial<DigitalProduct>): DigitalProduct {
  const priceInr = typeof rawProd.priceInr === 'number'
    ? rawProd.priceInr
    : typeof rawProd.priceUsd === 'number'
    ? Math.round(rawProd.priceUsd * 80)
    : 320.00;

  return {
    id: rawProd.id || `prod-${Date.now()}`,
    botId: rawProd.botId || 'bot-1',
    title: rawProd.title || 'Digital Product',
    description: rawProd.description || 'Instant digital license delivery.',
    type: rawProd.type || 'license_key',
    priceInr: Number(priceInr.toFixed(2)),
    priceUsd: rawProd.priceUsd ?? 3.99,
    priceStars: rawProd.priceStars ?? 200,
    priceTon: rawProd.priceTon ?? 0.8,
    discountPercent: rawProd.discountPercent ?? 0,
    taxPercent: rawProd.taxPercent ?? 0,
    stockType: rawProd.stockType || 'key_pool',
    availableKeys: Array.isArray(rawProd.availableKeys) ? rawProd.availableKeys : [],
    soldKeysCount: rawProd.soldKeysCount ?? 0,
    badge: rawProd.badge,
    active: rawProd.active ?? true,
  };
}
