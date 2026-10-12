export type BotStatus = 'online' | 'paused' | 'error' | 'deploying';

export type QrGenerationMode = 'MODE_A_PROVIDER' | 'MODE_B_MANUAL_UPI';

export interface UpiPaymentAccount {
  id: string;
  accountName: string;
  upiId: string;
  merchantProvider: 'Razorpay' | 'Cashfree' | 'PayU' | 'Decentro' | 'Custom Gateway';
  merchantAccountId: string;
  mode: QrGenerationMode;
  apiKeyConfigured: boolean;
  dynamicQrSupported: boolean;
  autoVerificationEnabled: boolean;
  manualVerificationAvailable: boolean;
  paymentsEnabled: boolean;
  isTestMode: boolean;
  qrExpiryMinutes: number;
}

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
  currency: 'INR' | 'USD' | 'STARS' | 'TON';
  themeColor: string;
  paymentAccount: UpiPaymentAccount;
  features: {
    upiDynamicQr: boolean;
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
  priceInr: number;
  priceUsd: number;
  priceStars: number;
  priceTon: number;
  discountPercent?: number;
  taxPercent?: number;
  stockType: 'unlimited' | 'key_pool' | 'subscription';
  availableKeys: string[];
  soldKeysCount: number;
  badge?: string;
  active: boolean;
}

export type PaymentStatus =
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_PENDING'
  | 'VERIFYING_PAYMENT'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_EXPIRED'
  | 'PENDING_VERIFICATION'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentMethod = 'upi_dynamic_qr' | 'upi_manual' | 'stars' | 'ton' | 'usdt' | 'stripe';

export interface Order {
  id: string;
  botId: string;
  productId: string;
  productTitle: string;
  customerTelegramId: string;
  customerUsername: string;
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  amount: number;
  currency: 'INR' | 'USD' | 'STARS' | 'TON';
  paymentMethod: PaymentMethod;
  qrGenerationMode: QrGenerationMode;
  merchantAccountRef: string;
  providerOrderId: string;
  providerTxId?: string;
  status: PaymentStatus;
  qrPayload?: string;
  qrExpiresAt?: string;
  deliveredPayload: string;
  fulfillmentStatus: 'UNFULFILLED' | 'DELIVERY_PENDING' | 'DELIVERED' | 'FAILED_RETRYING';
  createdAt: string;
  verificationTimestamp?: string;
  txHash?: string;
  isTestTransaction?: boolean;
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

export interface PlatformSubscriptionSettings {
  enabled: boolean;
  platformMerchantId: string;
  platformUpiId: string;
  planName: string;
  planMonthlyFeeInr: number;
}

export interface AuthSession {
  phoneNumber: string;
  name: string;
  token: string;
  verifiedAt: string;
  verified: boolean;
  role: 'Merchant Owner' | 'Store Admin';
}

