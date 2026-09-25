import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  username?: string;
  password_hash: string;
  role: 'USER' | 'CUSTOMER' | 'RESELLER' | 'ADMIN' | 'OWNER' | 'SUPER ADMIN' | string;
  full_name: string;
  telegram_username?: string;
  telegram_id?: string;
  is_email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  referral_code: string;
  referred_by?: string;
  reseller_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  reseller_commission_rate: number; // percentage (e.g. 15%)
  reseller_balance: number;
  wallet_balance?: number; // User wallet balance
  total_deposited?: number;
  total_spent?: number;
  last_login_at?: string;
  last_login_ip?: string;
  failed_login_attempts?: number;
  lockout_until?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminPermission {
  id: string;
  admin_user_id: string;
  permissions: string[]; // e.g. ['users.view', 'users.edit', 'payments.verify', 'apk.upload', 'app.update', ...]
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: string;
  user_id: string;
  user_email?: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string;
  order_id?: string;
  payment_id?: string;
  actor_id?: string;
  created_at: string;
}

export interface ApkFile {
  id: string;
  owner_id: string;
  app_name: string;
  version: string;
  version_code: number;
  file_name: string;
  stored_file_path: string;
  download_url: string;
  file_size: number;
  file_hash?: string;
  release_notes: string;
  is_active: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface AppRelease {
  id: string;
  owner_id: string;
  app_name: string;
  version_name: string;
  version_code: number;
  apk_file_id?: string;
  apk_url: string;
  release_notes: string;
  minimum_version_code: number;
  force_update: boolean;
  release_date: string;
  status: 'DRAFT' | 'TESTING' | 'PUBLISHED' | 'ARCHIVED';
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface AppConfig {
  id: string;
  owner_id: string;
  app_name: string;
  package_name?: string;
  logo_url?: string;
  support_url: string;
  telegram_channel?: string;
  support_username: string;
  payment_upi?: string;
  maintenance_mode: boolean;
  announcement?: string;
  minimum_version_code: number;
  latest_version_code: number;
  latest_version_name: string;
  download_url: string;
  force_update: boolean;
  feature_flags: Record<string, boolean>;
  github_repo?: string;
  github_branch?: string;
  github_workflow?: string;
  ci_build_status?: 'IDLE' | 'BUILDING' | 'SUCCESS' | 'FAILED';
  last_build_at?: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  user_agent?: string;
  ip_address?: string;
  expires_at: string;
  created_at: string;
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
  created_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  provider: 'RAZORPAY' | 'STRIPE' | 'CASHFREE' | 'PHONEPE' | 'MANUAL' | 'SANDBOX';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  signature?: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  plan_id?: string;
  billing_cycle?: 'MONTHLY' | 'YEARLY';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentEvent {
  id: string;
  payment_id: string;
  provider: string;
  event_type: string;
  payload: any;
  processed: boolean;
  created_at: string;
}

export interface TelegramBot {
  id: string;
  owner_id: string;
  bot_token_encrypted: string;
  bot_id: string;
  username: string;
  first_name: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  is_active: boolean;
  webhook_url?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  error_message?: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface BotMenu {
  id: string;
  bot_id: string;
  owner_id: string;
  title: string;
  slug: string;
  parent_menu_id?: string;
  message_text: string;
  banner_url?: string;
  video_url?: string;
  auto_back_button: boolean;
  auto_home_button: boolean;
  columns_per_row: number;
  created_at: string;
  updated_at: string;
}

export interface BotButton {
  id: string;
  bot_id: string;
  menu_id?: string; // id or slug of menu it belongs to, defaults to 'main'
  owner_id: string;
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
    | 'QR_PAY'
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
    | 'CALLBACK';
  target_value: string;
  target_package_id?: string;
  row_order: number;
  col_order: number;
  created_at: string;
}

export interface BotFaq {
  id: string;
  bot_id: string;
  owner_id: string;
  question: string;
  answer: string;
  order: number;
  created_at: string;
}

export interface BotCommand {
  id: string;
  bot_id: string;
  owner_id: string;
  command: string; // e.g. "/products" or "/start"
  description: string;
  trigger_type: 'TELEGRAM_COMMAND' | 'BUTTON_CLICK' | 'CALLBACK_QUERY' | 'DEEP_LINK' | 'AUTO_EVENT';
  action_type:
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
  target_id?: string;
  target_package_id?: string;
  target_name?: string;
  next_step?: string;
  custom_response_message?: string;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
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
  id: string;
  bot_id: string;
  owner_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  owner_id: string;
  bot_id?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
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
  owner_id: string;
  proof_image_url: string;
  amount: number;
  customer_note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
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
  owner_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  owner_id: string;
  bot_id: string;
  category_id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  delivery_type: 'LICENSE_KEY' | 'DIGITAL_FILE' | 'CUSTOM_MESSAGE' | 'SERIAL_KEY';
  custom_message?: string;
  is_active: boolean;
  stock_count: number;
  packages?: ProductPackage[];
  created_at: string;
  updated_at: string;
}

export interface DigitalFile {
  id: string;
  owner_id: string;
  product_id: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  download_token: string;
  created_at: string;
}

export interface LicenseKey {
  id: string;
  owner_id: string;
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
  updated_at: string;
}

export interface Order {
  id: string;
  owner_id: string;
  bot_id: string;
  customer_id: string;
  customer_name: string;
  customer_telegram_id: string;
  product_id: string;
  package_id?: string;
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
  updated_at: string;
}

export interface Coupon {
  id: string;
  owner_id: string;
  bot_id: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  max_uses: number;
  current_uses: number;
  min_order_amount: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface Broadcast {
  id: string;
  owner_id: string;
  bot_id: string;
  title: string;
  message_type: 'TEXT' | 'PHOTO' | 'DOCUMENT';
  message_text: string;
  media_url?: string;
  buttons_json?: string;
  target_audience: 'ALL' | 'ACTIVE_BUYERS' | 'ZERO_PURCHASES';
  status: 'DRAFT' | 'QUEUED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at?: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referred_user_name: string;
  referred_user_email: string;
  commission_amount: number;
  currency: string;
  status: 'PENDING' | 'PAID';
  order_id?: string;
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
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  subscription_plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  payments: Payment[];
  payment_events: PaymentEvent[];
  telegram_bots: TelegramBot[];
  bot_settings: BotSettings[];
  bot_menus: BotMenu[];
  bot_buttons: BotButton[];
  bot_faqs: BotFaq[];
  bot_commands: BotCommand[];
  bot_versions: BotVersion[];
  bot_payment_configs: BotPaymentConfig[];
  media_items: MediaItem[];
  payment_proofs: PaymentProof[];
  product_categories: ProductCategory[];
  products: Product[];
  product_packages: ProductPackage[];
  digital_files: DigitalFile[];
  license_keys: LicenseKey[];
  customers: Customer[];
  orders: Order[];
  coupons: Coupon[];
  broadcasts: Broadcast[];
  referrals: Referral[];
  reseller_applications: ResellerApplication[];
  notifications: Notification[];
  audit_logs: AuditLog[];
  system_settings: SystemSettings[];
  admin_permissions: AdminPermission[];
  balance_transactions: BalanceTransaction[];
  apk_files: ApkFile[];
  app_releases: AppRelease[];
  app_configs: AppConfig[];
}

export class Database {
  private filePath: string;
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(filePath?: string) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const uploadsDir = path.join(dataDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    this.filePath = filePath || path.join(dataDir, 'telesell.json');
    this.data = this.loadInitialData();
  }

  private loadInitialData(): DatabaseSchema {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return this.ensureSchema(parsed);
      } catch (err) {
        console.error('Error loading database file, initializing defaults:', err);
      }
    }
    const defaultData = this.getDefaultData();
    this.persistSync(defaultData);
    return defaultData;
  }

  private ensureSchema(data: any): DatabaseSchema {
    const defaultData = this.getDefaultData();
    const result: any = { ...defaultData, ...data };
    for (const key of Object.keys(defaultData) as (keyof DatabaseSchema)[]) {
      if (!Array.isArray(result[key])) {
        result[key] = defaultData[key];
      }
    }
    return result;
  }

  private getDefaultData(): DatabaseSchema {
    const now = new Date().toISOString();
    return {
      users: [],
      sessions: [],
      subscription_plans: [
        {
          id: 'plan-starter',
          name: 'Starter Tier',
          price_monthly: 499,
          price_yearly: 4990,
          currency: 'INR',
          features: [
            '1 Connected Telegram Bot',
            'Up to 15 Products & Licenses',
            '500 Broadcast Messages / mo',
            'Automated License Key Delivery',
            'Basic Analytics & CRM',
            'Community Support'
          ],
          max_bots: 1,
          max_products: 15,
          max_broadcasts_per_month: 500,
          status: 'ACTIVE',
          is_popular: false,
          created_at: now
        },
        {
          id: 'plan-pro',
          name: 'Pro Merchant',
          price_monthly: 1499,
          price_yearly: 14990,
          currency: 'INR',
          features: [
            'Up to 5 Connected Telegram Bots',
            'Unlimited Products & Files',
            '10,000 Broadcast Messages / mo',
            'Instant Digital File Delivery',
            'Advanced CRM & Customer Wallet',
            'Coupon & Discount Engine',
            'Full Reseller & Referral Engine',
            'Priority 24/7 Support'
          ],
          max_bots: 5,
          max_products: 500,
          max_broadcasts_per_month: 10000,
          status: 'ACTIVE',
          is_popular: true,
          created_at: now
        },
        {
          id: 'plan-enterprise',
          name: 'Enterprise Agency',
          price_monthly: 3999,
          price_yearly: 39990,
          currency: 'INR',
          features: [
            'Unlimited Connected Telegram Bots',
            'Unlimited Products & File Hosting',
            'Unlimited Broadcast Messaging',
            'Custom Domain & Webhook Routing',
            'White-label Bot Engine',
            'Multi-Currency & Custom Gateways',
            'Dedicated Account Manager'
          ],
          max_bots: 999,
          max_products: 99999,
          max_broadcasts_per_month: 999999,
          status: 'ACTIVE',
          is_popular: false,
          created_at: now
        }
      ],
      subscriptions: [],
      payments: [],
      payment_events: [],
      telegram_bots: [],
      bot_settings: [],
      bot_menus: [],
      bot_buttons: [],
      bot_faqs: [],
      bot_commands: [],
      bot_versions: [],
      bot_payment_configs: [],
      media_items: [],
      payment_proofs: [],
      product_categories: [],
      products: [],
      product_packages: [],
      digital_files: [],
      license_keys: [],
      customers: [],
      orders: [],
      coupons: [],
      broadcasts: [],
      referrals: [],
      reseller_applications: [],
      notifications: [],
      audit_logs: [],
      system_settings: [
        { id: 'set-1', key: 'PLATFORM_NAME', value: 'TeleSell SaaS', description: 'Public platform brand name', updated_at: now },
        { id: 'set-2', key: 'DEFAULT_CURRENCY', value: 'INR', description: 'Default system currency', updated_at: now },
        { id: 'set-3', key: 'ENABLE_REGISTRATION', value: 'true', description: 'Allow new user registration', updated_at: now },
        { id: 'set-4', key: 'RESELLER_BASE_COMMISSION', value: '15', description: 'Default reseller commission percentage', updated_at: now },
        { id: 'set-5', key: 'REFERRAL_REWARD_PERCENT', value: '10', description: 'Referral reward percentage on subscription', updated_at: now },
        { id: 'set-6', key: 'TELEGRAM_RATE_LIMIT_MS', value: '35', description: 'Delay between broadcast messages in milliseconds', updated_at: now }
      ],
      admin_permissions: [],
      balance_transactions: [],
      apk_files: [
        {
          id: 'apk-fz-engine-v2',
          owner_id: 'usr-admin-01',
          app_name: 'FZ SHOT ENGINE',
          version: '2.0.0',
          version_code: 20,
          file_name: 'FZ_Shot_Engine_v2.0.0.apk',
          stored_file_path: 'data/uploads/FZ_Shot_Engine_v2.0.0.apk',
          download_url: '/api/apk/apk-fz-engine-v2/download',
          file_size: 28456120, // ~28.4 MB
          release_notes: '• Complete new UI overhaul\n• Ultra fast response pipeline\n• Instant UPI payment system\n• Major stability & security enhancements',
          is_active: true,
          download_count: 1420,
          created_at: now,
          updated_at: now
        }
      ],
      app_releases: [
        {
          id: 'rel-200',
          owner_id: 'usr-admin-01',
          app_name: 'FZ SHOT ENGINE',
          version_name: '2.0.0',
          version_code: 20,
          apk_file_id: 'apk-fz-engine-v2',
          apk_url: '/api/apk/apk-fz-engine-v2/download',
          release_notes: '• Complete new UI overhaul\n• Ultra fast response pipeline\n• Instant UPI payment system\n• Major stability & security enhancements',
          minimum_version_code: 18,
          force_update: false,
          release_date: now,
          status: 'PUBLISHED',
          download_count: 1420,
          created_at: now,
          updated_at: now
        },
        {
          id: 'rel-190',
          owner_id: 'usr-admin-01',
          app_name: 'FZ SHOT ENGINE',
          version_name: '1.9.0',
          version_code: 19,
          apk_file_id: 'apk-fz-engine-v2',
          apk_url: '/api/apk/apk-fz-engine-v2/download',
          release_notes: '• Previous stable release with high compatibility',
          minimum_version_code: 15,
          force_update: false,
          release_date: new Date(Date.now() - 15 * 86400000).toISOString(),
          status: 'ARCHIVED',
          download_count: 4210,
          created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 15 * 86400000).toISOString()
        }
      ],
      app_configs: [
        {
          id: 'app-cfg-primary',
          owner_id: 'usr-admin-01',
          app_name: 'FZ SHOT ENGINE',
          package_name: 'com.fz.shotengine',
          logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80',
          support_url: 'https://t.me/fz_support',
          telegram_channel: 'https://t.me/fz_official',
          support_username: 'fz_support',
          payment_upi: 'merchant@upi',
          maintenance_mode: false,
          announcement: 'Welcome to FZ Shot Engine v2.0! Instant digital licenses now live.',
          minimum_version_code: 18,
          latest_version_code: 20,
          latest_version_name: '2.0.0',
          download_url: '/api/apk/apk-fz-engine-v2/download',
          force_update: false,
          feature_flags: {
            enable_instant_checkout: true,
            enable_telegram_sync: true,
            enable_sandbox_mode: true,
            enable_biometric_login: true
          },
          github_repo: 'FZ-Panel/android-engine',
          github_branch: 'main',
          github_workflow: 'build-release-apk.yml',
          ci_build_status: 'SUCCESS',
          last_build_at: now,
          updated_at: now
        }
      ]
    };
  }

  private persistSync(data: DatabaseSchema) {
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        this.persistSync(this.data);
      } catch (err) {
        console.error('Failed to persist database state:', err);
      }
    }, 50);
  }

  public saveImmediately() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.persistSync(this.data);
  }

  // Schema accessors
  public get users(): User[] { return this.data.users; }
  public set users(val: User[]) { this.data.users = val; }
  public get sessions(): Session[] { return this.data.sessions; }
  public set sessions(val: Session[]) { this.data.sessions = val; }
  public get subscription_plans(): SubscriptionPlan[] { return this.data.subscription_plans; }
  public set subscription_plans(val: SubscriptionPlan[]) { this.data.subscription_plans = val; }
  public get subscriptions(): Subscription[] { return this.data.subscriptions; }
  public set subscriptions(val: Subscription[]) { this.data.subscriptions = val; }
  public get payments(): Payment[] { return this.data.payments; }
  public set payments(val: Payment[]) { this.data.payments = val; }
  public get payment_events(): PaymentEvent[] { return this.data.payment_events; }
  public set payment_events(val: PaymentEvent[]) { this.data.payment_events = val; }
  public get telegram_bots(): TelegramBot[] { return this.data.telegram_bots; }
  public set telegram_bots(val: TelegramBot[]) { this.data.telegram_bots = val; }
  public get bot_settings(): BotSettings[] { return this.data.bot_settings; }
  public set bot_settings(val: BotSettings[]) { this.data.bot_settings = val; }
  public get bot_menus(): BotMenu[] { return this.data.bot_menus; }
  public set bot_menus(val: BotMenu[]) { this.data.bot_menus = val; }
  public get bot_buttons(): BotButton[] { return this.data.bot_buttons; }
  public set bot_buttons(val: BotButton[]) { this.data.bot_buttons = val; }
  public get bot_faqs(): BotFaq[] { return this.data.bot_faqs; }
  public set bot_faqs(val: BotFaq[]) { this.data.bot_faqs = val; }
  public get bot_commands(): BotCommand[] { return this.data.bot_commands; }
  public set bot_commands(val: BotCommand[]) { this.data.bot_commands = val; }
  public get bot_versions(): BotVersion[] { return this.data.bot_versions; }
  public set bot_versions(val: BotVersion[]) { this.data.bot_versions = val; }
  public get bot_payment_configs(): BotPaymentConfig[] { return this.data.bot_payment_configs; }
  public set bot_payment_configs(val: BotPaymentConfig[]) { this.data.bot_payment_configs = val; }
  public get media_items(): MediaItem[] { return this.data.media_items; }
  public set media_items(val: MediaItem[]) { this.data.media_items = val; }
  public get payment_proofs(): PaymentProof[] { return this.data.payment_proofs; }
  public set payment_proofs(val: PaymentProof[]) { this.data.payment_proofs = val; }
  public get product_categories(): ProductCategory[] { return this.data.product_categories; }
  public set product_categories(val: ProductCategory[]) { this.data.product_categories = val; }
  public get products(): Product[] { return this.data.products; }
  public set products(val: Product[]) { this.data.products = val; }
  public get product_packages(): ProductPackage[] { return this.data.product_packages; }
  public set product_packages(val: ProductPackage[]) { this.data.product_packages = val; }
  public get digital_files(): DigitalFile[] { return this.data.digital_files; }
  public set digital_files(val: DigitalFile[]) { this.data.digital_files = val; }
  public get license_keys(): LicenseKey[] { return this.data.license_keys; }
  public set license_keys(val: LicenseKey[]) { this.data.license_keys = val; }
  public get customers(): Customer[] { return this.data.customers; }
  public set customers(val: Customer[]) { this.data.customers = val; }
  public get orders(): Order[] { return this.data.orders; }
  public set orders(val: Order[]) { this.data.orders = val; }
  public get coupons(): Coupon[] { return this.data.coupons; }
  public set coupons(val: Coupon[]) { this.data.coupons = val; }
  public get broadcasts(): Broadcast[] { return this.data.broadcasts; }
  public set broadcasts(val: Broadcast[]) { this.data.broadcasts = val; }
  public get referrals(): Referral[] { return this.data.referrals; }
  public set referrals(val: Referral[]) { this.data.referrals = val; }
  public get reseller_applications(): ResellerApplication[] { return this.data.reseller_applications; }
  public set reseller_applications(val: ResellerApplication[]) { this.data.reseller_applications = val; }
  public get notifications(): Notification[] { return this.data.notifications; }
  public set notifications(val: Notification[]) { this.data.notifications = val; }
  public get audit_logs(): AuditLog[] { return this.data.audit_logs; }
  public set audit_logs(val: AuditLog[]) { this.data.audit_logs = val; }
  public get system_settings(): SystemSettings[] { return this.data.system_settings; }
  public set system_settings(val: SystemSettings[]) { this.data.system_settings = val; }
  public get admin_permissions(): AdminPermission[] { return this.data.admin_permissions || []; }
  public set admin_permissions(val: AdminPermission[]) { this.data.admin_permissions = val; }
  public get balance_transactions(): BalanceTransaction[] { return this.data.balance_transactions || []; }
  public set balance_transactions(val: BalanceTransaction[]) { this.data.balance_transactions = val; }
  public get apk_files(): ApkFile[] { return this.data.apk_files || []; }
  public set apk_files(val: ApkFile[]) { this.data.apk_files = val; }
  public get app_releases(): AppRelease[] { return this.data.app_releases || []; }
  public set app_releases(val: AppRelease[]) { this.data.app_releases = val; }
  public get app_configs(): AppConfig[] { return this.data.app_configs || []; }
  public set app_configs(val: AppConfig[]) { this.data.app_configs = val; }
}

export const db = new Database();
