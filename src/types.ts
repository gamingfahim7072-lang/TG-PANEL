export type BotStatus = 'online' | 'paused' | 'error' | 'deploying';

export interface TelegramBot {
  id: string;
  name: string;
  username: string;
  token: string;
  status: BotStatus;
  subscribersCount: number;
  totalOrders: number;
  totalRevenue: number;
  welcomeMessage: string;
  currency: 'USD' | 'STARS' | 'TON';
  themeColor: string;
  features: {
    starsPayment: boolean;
    cryptoPayment: boolean;
    autoKeyDelivery: boolean;
    vipGroupInvite: boolean;
    resellerSupport: boolean;
  };
  commands: { command: string; description: string; response: string }[];
  webhookUrl?: string;
  vipGroupId?: string;
}

export type ProductType = 'license_key' | 'vip_channel' | 'digital_file' | 'account_credential';

export interface DigitalProduct {
  id: string;
  botId: string;
  title: string;
  description: string;
  type: ProductType;
  priceUsd: number;
  priceStars: number;
  priceTon: number;
  stockType: 'unlimited' | 'key_pool' | 'subscription';
  availableKeys: string[];
  soldKeysCount: number;
  badge?: string;
  active: boolean;
}

export type OrderStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type PaymentMethod = 'stars' | 'ton' | 'usdt' | 'stripe';

export interface Order {
  id: string;
  botId: string;
  productId: string;
  productTitle: string;
  customerTelegramId: string;
  customerUsername: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  deliveredPayload: string;
  createdAt: string;
  txHash?: string;
}

export interface BroadcastCampaign {
  id: string;
  botId: string;
  title: string;
  messageText: string;
  buttonText?: string;
  buttonUrl?: string;
  sentCount: number;
  deliveredPercent: number;
  status: 'sent' | 'scheduled' | 'draft';
  sentAt: string;
}
