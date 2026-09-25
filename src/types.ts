export interface User {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  role: 'USER' | 'CUSTOMER' | 'RESELLER' | 'ADMIN' | 'OWNER' | 'SUPER ADMIN' | string;
  referral_code: string;
  reseller_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  reseller_commission_rate: number;
  reseller_balance: number;
  wallet_balance?: number;
  two_factor_enabled?: boolean;
  created_at?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_bots: number;
  max_products: number;
  max_broadcasts_per_month: number;
  status: 'ACTIVE' | 'ARCHIVED';
  is_popular?: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  amount: number;
  currency: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  start_date: string;
  expiry_date: string;
  auto_renew: boolean;
  payment_id?: string;
  plan?: SubscriptionPlan;
}

export interface BotSettings {
  id: string;
  bot_id: string;
  owner_id: string;
  display_name: string;
  description: string;
  support_username: string;
  support_url?: string;
  support_message?: string;
  currency: string;
  timezone: string;
  start_text: string;
  start_banner_url?: string;
  start_video_url?: string;
  promo_message?: string;
  business_hours?: string;
  auto_delivery: boolean;
  notify_admin_on_order: boolean;
  webhook_secret?: string;
  status?: string;
}

export interface BotMenu {
  id: string;
  bot_id: string;
  owner_id?: string;
  title: string;
  slug: string;
  parent_menu_id?: string;
  message_text: string;
  banner_url?: string;
  video_url?: string;
  auto_back_button: boolean;
  auto_home_button: boolean;
  columns_per_row: number;
  created_at?: string;
  updated_at?: string;
}

export interface BotButton {
  id: string;
  bot_id: string;
  menu_id?: string;
  label: string;
  emoji?: string;
  button_type:
    | 'OPEN_SUBMENU'
    | 'SUBMENU'
    | 'PRODUCT'
    | 'OPEN_PRODUCT'
    | 'SINGLE_PRODUCT'
    | 'PRODUCT_PACKAGE'
    | 'CATEGORY'
    | 'OPEN_CATEGORY'
    | 'PRODUCTS_LIST'
    | 'CART'
    | 'CHECKOUT'
    | 'PAYMENT'
    | 'PAYMENT_INFO'
    | 'MY_ORDERS'
    | 'MY_ACCOUNT'
    | 'SUPPORT'
    | 'SUPPORT_CONTACT'
    | 'REFERRAL'
    | 'RESELLER'
    | 'FAQ'
    | 'FAQS'
    | 'BACK'
    | 'HOME'
    | 'MAIN_MENU'
    | 'BALANCE'
    | 'URL'
    | 'EXTERNAL_URL'
    | 'CALLBACK'
    | string;
  target_value: string;
  target_package_id?: string;
  row_order: number;
  col_order: number;
}

export interface BotFaq {
  id: string;
  bot_id: string;
  owner_id?: string;
  question: string;
  answer: string;
  order: number;
  created_at?: string;
}

export type CommandTriggerType =
  | 'TELEGRAM_COMMAND'
  | 'BUTTON_CLICK'
  | 'CALLBACK_QUERY'
  | 'DEEP_LINK'
  | 'AUTO_EVENT';

export type CommandActionType =
  | 'OPEN_MENU'
  | 'OPEN_SUBMENU'
  | 'OPEN_CATEGORY'
  | 'SHOW_PRODUCTS'
  | 'OPEN_PRODUCT'
  | 'SELECT_PACKAGE'
  | 'START_WORKFLOW'
  | 'SEND_MESSAGE'
  | 'CHECKOUT'
  | 'PAYMENT_METHODS'
  | 'SHOW_QR'
  | 'MY_ORDERS'
  | 'MY_ACCOUNT'
  | 'SUPPORT'
  | 'FAQ'
  | 'REFERRAL'
  | 'RESELLER'
  | 'CUSTOM_ACTION'
  | 'CUSTOM_MESSAGE';

export interface BotCommand {
  id: string;
  bot_id: string;
  owner_id?: string;
  command: string; // e.g. "/products" or "/start"
  description: string;
  trigger_type: CommandTriggerType;
  action_type: CommandActionType;
  target_id?: string;
  target_package_id?: string;
  target_name?: string;
  next_step?: string;
  custom_response_message?: string;
  sort_order: number;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BotVersion {
  id: string;
  bot_id: string;
  owner_id: string;
  version_number: number;
  label: string;
  settings: BotSettings;
  menus?: BotMenu[];
  buttons: BotButton[];
  faqs?: BotFaq[];
  commands?: BotCommand[];
  created_at: string;
}

export interface BotPaymentConfig {
  id?: string;
  bot_id: string;
  owner_id?: string;
  enable_sandbox: boolean;
  enable_razorpay: boolean;
  enable_cashfree: boolean;
  enable_phonepe: boolean;
  enable_stripe: boolean;
  enable_manual_upi: boolean;
  upi_id?: string;
  upi_name?: string;
  business_name?: string;
  default_amount?: number;
  enable_dynamic_qr?: boolean;
  qr_data_scheme?: string;
  manual_instructions?: string;
  qr_image_url?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  razorpay_key_id?: string;
  stripe_public_key?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MediaItem {
  id: string;
  owner_id?: string;
  bot_id?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  original_name: string;
  stored_name: string;
  url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface PaymentProof {
  id: string;
  order_id: string;
  customer_id: string;
  bot_id: string;
  owner_id?: string;
  proof_image_url: string;
  amount: number;
  customer_note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface TelegramBot {
  id: string;
  owner_id: string;
  bot_id: string;
  username: string;
  first_name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  is_active: boolean;
  error_message?: string;
  settings?: BotSettings;
  productCount?: number;
  customerCount?: number;
  created_at: string;
}

export interface PollerStats {
  botId: string;
  botUsername: string;
  isRunning: boolean;
  startedAt: string;
  lastPollAt?: string;
  updateCount: number;
  consecutiveErrors: number;
  lastError?: string;
}

export interface TelegramBotStatusResponse {
  success: boolean;
  bot: {
    id: string;
    username: string;
    first_name: string;
    status: string;
    is_active: boolean;
  };
  mode: 'LONG_POLLING' | 'WEBHOOK';
  polling: PollerStats;
  telegramMe?: {
    id: number;
    username: string;
    first_name: string;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
  } | null;
  webhookInfo?: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
    ip_address?: string;
  } | null;
  appUrl?: string | null;
}

export interface ProductCategory {
  id: string;
  owner_id: string;
  bot_id: string;
  name: string;
  emoji?: string;
  description?: string;
  position?: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductPackage {
  id: string;
  product_id: string;
  bot_id: string;
  owner_id?: string;
  name: string; // e.g. "1 Day — ₹120", "30 Days — ₹850"
  duration_days?: number;
  price: number;
  currency: string;
  stock_count: number;
  delivery_type: 'LICENSE_KEY' | 'DIGITAL_FILE' | 'CUSTOM_MESSAGE' | 'SERIAL_KEY';
  custom_message?: string;
  digital_file_url?: string;
  is_active: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  owner_id: string;
  bot_id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  delivery_type: 'LICENSE_KEY' | 'DIGITAL_FILE' | 'CUSTOM_MESSAGE' | 'SERIAL_KEY';
  custom_message?: string;
  is_active: boolean;
  stock_count: number;
  keys_available?: number;
  file_name?: string;
  packages?: ProductPackage[];
  created_at: string;
}

export interface LicenseKey {
  id: string;
  product_id: string;
  license_key: string;
  is_redeemed: boolean;
  redeemed_by_customer_id?: string;
  redeemed_at?: string;
  order_id?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  owner_id: string;
  bot_id: string;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  total_purchases: number;
  total_spent: number;
  wallet_balance: number;
  last_purchase_at?: string;
  created_at: string;
}

export interface Order {
  id: string;
  owner_id: string;
  bot_id: string;
  customer_id: string;
  customer_name: string;
  customer_telegram_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'UNDER_VERIFICATION';
  payment_provider: string;
  payment_id?: string;
  delivered_type: 'LICENSE_KEY' | 'DIGITAL_FILE' | 'CUSTOM_MESSAGE' | 'SERIAL_KEY';
  delivered_content?: string;
  download_url?: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  bot_id: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  max_uses: number;
  current_uses: number;
  min_order_amount: number;
  is_active: boolean;
  created_at: string;
}

export interface Broadcast {
  id: string;
  bot_id: string;
  title: string;
  message_type: 'TEXT' | 'PHOTO' | 'DOCUMENT';
  message_text: string;
  media_url?: string;
  target_audience: 'ALL' | 'ACTIVE_BUYERS' | 'ZERO_PURCHASES';
  status: 'DRAFT' | 'QUEUED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: any;
  created_at: string;
}

export interface ResellerApplication {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  business_name: string;
  telegram_handle: string;
  experience_info: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  commission_rate: number;
  total_sales: number;
  total_earnings: number;
  balance: number;
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  successfulOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  connectedBots: number;
  totalProducts: number;
  chartData: Array<{ date: string; revenue: number; orders: number }>;
  recentOrders: Order[];
}

export interface SelfPingState {
  enabled: boolean;
  targetUrl: string;
  intervalMinutes: number;
  lastPingAt?: string;
  lastPingStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastPingDurationMs?: number;
  totalPings: number;
}

export interface SystemHostingStatus {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  uptimeFormatted: string;
  nodeVersion: string;
  platform: string;
  environment: string;
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
  };
  selfPing: SelfPingState;
  pollers: PollerStats[];
  cronStatus: {
    isRunning: boolean;
    lastRunAt?: string;
    totalRuns: number;
  };
  database: {
    usersCount: number;
    botsCount: number;
    productsCount: number;
    ordersCount: number;
    customersCount: number;
  };
  webhookIngressUrl: string;
}

export interface PingTestResult {
  success: boolean;
  statusCode?: number;
  durationMs: number;
  targetUrl: string;
  error?: string;
}

