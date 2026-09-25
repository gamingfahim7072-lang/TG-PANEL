import { Request, Response, NextFunction } from 'express';
import { db, User, Session, AuditLog, Subscription } from './db.js';
import { CryptoService } from './crypto.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionRecord?: Session;
  subscription?: Subscription;
}

// In-memory sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitBucket>();

export function rateLimit(options: { max: number; windowMs: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    const bucket = rateLimitStore.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: options.message || 'Too many requests. Please try again later.',
        retryAfterSeconds: retryAfter
      });
    }

    bucket.count += 1;
    next();
  };
}

/**
 * Creates an audit log record in database
 */
export function logAudit(params: {
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: any;
  req?: Request;
}) {
  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    user_id: params.userId,
    user_email: params.userEmail,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    metadata: params.metadata,
    ip_address: params.req?.ip || (params.req?.headers['x-forwarded-for'] as string) || '127.0.0.1',
    user_agent: params.req?.headers['user-agent'],
    created_at: new Date().toISOString()
  };
  db.audit_logs.unshift(audit);
  if (db.audit_logs.length > 2000) {
    db.audit_logs.pop();
  }
  db.save();
}

/**
 * Main authentication middleware
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Bearer Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check cookies
    if (!token && (req as any).cookies?.telesell_session) {
      token = (req as any).cookies.telesell_session;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in.'
      });
    }

    // Verify JWT payload
    const payload = CryptoService.verifyJwt<{ userId: string; sessionId?: string }>(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.'
      });
    }

    // Find User in DB
    const user = db.users.find(u => u.id === payload.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    // Check account status if suspended/disabled
    if (user.reseller_status === 'SUSPENDED') {
      // note: individual features might be restricted
    }

    // Fetch user's active subscription and check expiration
    const now = new Date();
    const activeSub = db.subscriptions
      .filter(s => s.user_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (activeSub && activeSub.status === 'ACTIVE') {
      if (new Date(activeSub.expiry_date) < now) {
        activeSub.status = 'EXPIRED';
        activeSub.updated_at = now.toISOString();
        db.save();
      }
    }

    req.user = user;
    req.subscription = activeSub;
    next();
  } catch (err: any) {
    console.error('Authentication error:', err);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
}

/**
 * Optional authentication middleware (for public endpoints with optional user context)
 */
export async function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if ((req as any).cookies?.telesell_session) {
      token = (req as any).cookies.telesell_session;
    }

    if (token) {
      const payload = CryptoService.verifyJwt<{ userId: string }>(token);
      if (payload && payload.userId) {
        const user = db.users.find(u => u.id === payload.userId);
        if (user) {
          req.user = user;
          req.subscription = db.subscriptions.find(s => s.user_id === user.id && s.status === 'ACTIVE');
        }
      }
    }
  } catch {
    // Continue without user
  }
  next();
}

/**
 * Role-based access control middleware
 */
export function requireRole(...allowedRoles: Array<'CUSTOMER' | 'RESELLER' | 'ADMIN' | 'SUPER ADMIN'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Super Admin has universal access
    if (req.user.role === 'SUPER ADMIN') {
      return next();
    }

    // Admin has access to ADMIN, RESELLER, CUSTOMER requirements
    if (req.user.role === 'ADMIN' && allowedRoles.includes('ADMIN')) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden. You do not have permission for this resource. Required: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

/**
 * Subscription enforcement middleware: Verifies active plan before accessing premium bot / product tools
 */
export function requireActiveSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Admins bypass subscription locks
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER ADMIN') {
    return next();
  }

  const sub = req.subscription;
  if (!sub || sub.status !== 'ACTIVE') {
    return res.status(402).json({
      success: false,
      error: 'Active subscription required. Please subscribe or renew your plan to use this feature.',
      subscriptionStatus: sub ? sub.status : 'NONE'
    });
  }

  if (new Date(sub.expiry_date) < new Date()) {
    sub.status = 'EXPIRED';
    db.save();
    return res.status(402).json({
      success: false,
      error: 'Your subscription has expired. Please renew your plan to restore full bot operations.',
      subscriptionStatus: 'EXPIRED'
    });
  }

  next();
}

/**
 * Helper to ensure a user only accesses resources they own
 */
export function assertOwnership(user: User, resourceOwnerId: string, resourceName: string = 'Resource'): boolean {
  if (user.role === 'SUPER ADMIN' || user.role === 'ADMIN') {
    return true;
  }
  return user.id === resourceOwnerId;
}

/**
 * Seeds initial production/demo accounts if database is fresh
 */
export async function seedInitialUsers() {
  if (db.users.length === 0) {
    console.log('Seeding initial production roles and demo users...');
    const now = new Date();
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const oneYearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Super Admin Account
    const adminPass = await CryptoService.hashPassword('Admin@123456');
    const adminUser: User = {
      id: 'usr-admin-01',
      email: 'admin@telesell.io',
      password_hash: adminPass,
      role: 'SUPER ADMIN',
      full_name: 'Platform Super Admin',
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: 'ADMIN2026',
      reseller_status: 'APPROVED',
      reseller_commission_rate: 25,
      reseller_balance: 12500,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    db.users.push(adminUser);

    // 2. Demo Merchant User (Customer Role)
    const userPass = await CryptoService.hashPassword('User@123456');
    const merchantUser: User = {
      id: 'usr-merchant-02',
      email: 'merchant@telesell.io',
      password_hash: userPass,
      role: 'CUSTOMER',
      full_name: 'Alex Rivera (Pro Merchant)',
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: 'ALEX778',
      reseller_status: 'NONE',
      reseller_commission_rate: 15,
      reseller_balance: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    db.users.push(merchantUser);

    // 3. Demo Reseller User
    const resellerPass = await CryptoService.hashPassword('Reseller@123456');
    const resellerUser: User = {
      id: 'usr-reseller-03',
      email: 'reseller@telesell.io',
      password_hash: resellerPass,
      role: 'RESELLER',
      full_name: 'SaaS Reseller Partner',
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: 'PARTNER99',
      reseller_status: 'APPROVED',
      reseller_commission_rate: 20,
      reseller_balance: 4800,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    db.users.push(resellerUser);

    // Give merchant an active PRO subscription
    const proSub: Subscription = {
      id: 'sub-merchant-pro',
      user_id: merchantUser.id,
      plan_id: 'plan-pro',
      billing_cycle: 'MONTHLY',
      amount: 1499,
      currency: 'INR',
      status: 'ACTIVE',
      start_date: now.toISOString(),
      expiry_date: thirtyDaysAhead,
      auto_renew: true,
      payment_id: 'pay-seed-01',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    db.subscriptions.push(proSub);

    // Seed a Connected Telegram Bot for the merchant
    const botId = 'bot-seed-01';
    const fakeBotToken = '7123456789:AAEjSampleProductionKeyEncrypted001';
    db.telegram_bots.push({
      id: botId,
      owner_id: merchantUser.id,
      bot_token_encrypted: CryptoService.encrypt(fakeBotToken),
      bot_id: '7123456789',
      username: 'AlexDigitalStoreBot',
      first_name: 'Alex Digital Store',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: true,
      is_active: true,
      status: 'CONNECTED',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    });

    db.bot_settings.push({
      id: 'set-bot-01',
      bot_id: botId,
      owner_id: merchantUser.id,
      display_name: '⚡ Alex Digital Assets Store',
      description: 'Instant automated delivery for software licenses, digital templates, and premium courses.',
      support_username: 'alex_support',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      start_text: '👋 *Welcome to Alex Digital Store!*\n\nSelect a category or browse all digital items below with instant automated Telegram delivery.',
      start_banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
      promo_message: '🔥 Use code *TELESELL10* to get 10% OFF your purchase!',
      auto_delivery: true,
      notify_admin_on_order: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    });

    // Seed Buttons for Bot
    db.bot_buttons.push(
      { id: 'btn-1', bot_id: botId, owner_id: merchantUser.id, label: '🛍️ Browse Products', button_type: 'CALLBACK', target_value: 'VIEW_PRODUCTS', row_order: 0, col_order: 0, created_at: now.toISOString() },
      { id: 'btn-2', bot_id: botId, owner_id: merchantUser.id, label: '📂 Categories', button_type: 'CATEGORY', target_value: 'ALL_CATEGORIES', row_order: 0, col_order: 1, created_at: now.toISOString() },
      { id: 'btn-3', bot_id: botId, owner_id: merchantUser.id, label: '🎁 Promo Coupons', button_type: 'CALLBACK', target_value: 'VIEW_COUPONS', row_order: 1, col_order: 0, created_at: now.toISOString() },
      { id: 'btn-4', bot_id: botId, owner_id: merchantUser.id, label: '💳 My Balance / Wallet', button_type: 'BALANCE', target_value: 'MY_BALANCE', row_order: 1, col_order: 1, created_at: now.toISOString() },
      { id: 'btn-5', bot_id: botId, owner_id: merchantUser.id, label: '💬 Live Support', button_type: 'SUPPORT', target_value: 'alex_support', row_order: 2, col_order: 0, created_at: now.toISOString() }
    );

    // Seed Categories
    const catSoftware = 'cat-soft-01';
    const catCourses = 'cat-course-02';
    db.product_categories.push(
      { id: catSoftware, owner_id: merchantUser.id, bot_id: botId, name: 'Software Licenses', description: 'Genuine developer & productivity serial keys', is_active: true, created_at: now.toISOString() },
      { id: catCourses, owner_id: merchantUser.id, bot_id: botId, name: 'Premium eBooks & Files', description: 'Direct downloadable guides and assets', is_active: true, created_at: now.toISOString() }
    );

    // Seed Products
    const prodLicense = 'prod-win11-01';
    const prodFile = 'prod-designkit-02';
    const prodCourse = 'prod-seo-03';

    db.products.push(
      {
        id: prodLicense,
        owner_id: merchantUser.id,
        bot_id: botId,
        category_id: catSoftware,
        name: 'Windows 11 Pro Retail Key (Instant)',
        description: 'Lifetime genuine 1-PC retail activation key with instant delivery.',
        price: 799,
        currency: 'INR',
        image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80',
        delivery_type: 'LICENSE_KEY',
        is_active: true,
        stock_count: 5,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: prodFile,
        owner_id: merchantUser.id,
        bot_id: botId,
        category_id: catCourses,
        name: 'Ultimate Figma SaaS UI Kit 2026',
        description: 'Over 800+ production-ready vector components, dark/light themes, and design tokens.',
        price: 1299,
        currency: 'INR',
        image_url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=600&q=80',
        delivery_type: 'DIGITAL_FILE',
        custom_message: 'Thank you for purchasing! Your download link is ready.',
        is_active: true,
        stock_count: 999,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: prodCourse,
        owner_id: merchantUser.id,
        bot_id: botId,
        category_id: catCourses,
        name: 'Telegram Bot Growth Playbook',
        description: 'Comprehensive step-by-step PDF manual on driving 50k+ monthly bot customers.',
        price: 499,
        currency: 'INR',
        image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
        delivery_type: 'CUSTOM_MESSAGE',
        custom_message: 'Access your private Notion portal here: https://notion.so/telegram-growth-vault-invite',
        is_active: true,
        stock_count: 999,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    );

    // Seed License Keys
    db.license_keys.push(
      { id: 'key-1', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-ABCD-9982-XQ71-MK01', is_redeemed: false, created_at: now.toISOString() },
      { id: 'key-2', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-EFGH-4412-PQ99-ZZ02', is_redeemed: false, created_at: now.toISOString() },
      { id: 'key-3', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-JKLM-7731-TT22-AB03', is_redeemed: false, created_at: now.toISOString() },
      { id: 'key-4', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-NPQR-1109-YY88-CD04', is_redeemed: false, created_at: now.toISOString() },
      { id: 'key-5', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-STUV-5567-EE44-EF05', is_redeemed: false, created_at: now.toISOString() }
    );

    // Seed Digital File record
    db.digital_files.push({
      id: 'df-1',
      owner_id: merchantUser.id,
      product_id: prodFile,
      original_filename: 'Figma-SaaS-UI-Kit-2026-v2.zip',
      stored_filename: 'df-figma-kit-sample.zip',
      file_size: 45200000,
      mime_type: 'application/zip',
      download_token: CryptoService.generateRandomToken(16),
      created_at: now.toISOString()
    });

    // Seed Customers
    const cust1 = 'cust-tg-98711';
    const cust2 = 'cust-tg-55421';
    db.customers.push(
      { id: cust1, owner_id: merchantUser.id, bot_id: botId, telegram_id: '98711234', username: 'dev_rahul', first_name: 'Rahul Sharma', total_purchases: 2, total_spent: 2098, wallet_balance: 150, last_purchase_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString() },
      { id: cust2, owner_id: merchantUser.id, bot_id: botId, telegram_id: '55421980', username: 'priya_codes', first_name: 'Priya Verma', total_purchases: 1, total_spent: 799, wallet_balance: 0, last_purchase_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString() }
    );

    // Seed Real Orders
    db.orders.push(
      {
        id: 'ORD-982110',
        owner_id: merchantUser.id,
        bot_id: botId,
        customer_id: cust1,
        customer_name: 'Rahul Sharma',
        customer_telegram_id: '98711234',
        product_id: prodLicense,
        product_name: 'Windows 11 Pro Retail Key (Instant)',
        quantity: 1,
        unit_price: 799,
        total_amount: 799,
        currency: 'INR',
        status: 'DELIVERED',
        payment_provider: 'RAZORPAY',
        payment_id: 'pay_rzp_98213891',
        delivered_type: 'LICENSE_KEY',
        delivered_content: 'License Key: W11P-INIT-0000-DEMO-KEY99',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'ORD-982111',
        owner_id: merchantUser.id,
        bot_id: botId,
        customer_id: cust1,
        customer_name: 'Rahul Sharma',
        customer_telegram_id: '98711234',
        product_id: prodFile,
        product_name: 'Ultimate Figma SaaS UI Kit 2026',
        quantity: 1,
        unit_price: 1299,
        total_amount: 1299,
        currency: 'INR',
        status: 'DELIVERED',
        payment_provider: 'STRIPE',
        payment_id: 'ch_stripe_sample99',
        delivered_type: 'DIGITAL_FILE',
        delivered_content: 'Download File: Figma-SaaS-UI-Kit-2026-v2.zip',
        download_url: '/api/downloads/ORD-982111/token123',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
      }
    );

    // Seed Coupon
    db.coupons.push({
      id: 'cpn-01',
      owner_id: merchantUser.id,
      bot_id: botId,
      code: 'TELESELL10',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      max_uses: 100,
      current_uses: 2,
      min_order_amount: 400,
      is_active: true,
      created_at: now.toISOString()
    });

    // Seed Audit Log
    logAudit({
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: 'SYSTEM_INITIALIZED',
      resourceType: 'PLATFORM',
      resourceId: 'telesell-core'
    });

    db.saveImmediately();
    console.log('Database seeded with complete multi-role initial data successfully.');
  }
}
