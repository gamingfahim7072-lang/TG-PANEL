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
 * Role-based access control helpers and middleware
 */
export function isOwner(role?: string): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'OWNER' || r === 'SUPER ADMIN';
}

export function isAdmin(role?: string): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'OWNER' || r === 'SUPER ADMIN';
}

export function isUser(role?: string): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'USER' || r === 'CUSTOMER' || r === 'RESELLER' || r === 'ADMIN' || r === 'OWNER' || r === 'SUPER ADMIN';
}

export function maskSecret(secret?: string): string {
  if (!secret) return '••••••••••••';
  if (secret.length <= 6) return '••••••';
  return '••••••••••••' + secret.slice(-4);
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    // Owner / Super Admin has absolute universal access
    if (isOwner(userRole)) {
      return next();
    }

    // Admin has access if ADMIN is in allowedRoles
    if (isAdmin(userRole) && (normalizedAllowed.includes('ADMIN') || normalizedAllowed.includes('CUSTOMER') || normalizedAllowed.includes('USER'))) {
      return next();
    }

    // Direct match
    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    // USER matches CUSTOMER / RESELLER
    if (normalizedAllowed.includes('USER') && (userRole === 'CUSTOMER' || userRole === 'RESELLER')) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden. You do not have permission for this resource. Required role: ${allowedRoles.join(' or ')}`
    });
  };
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Owner has universal access
    if (isOwner(req.user.role)) {
      return next();
    }

    // If Admin, check assigned permissions
    if (req.user.role.toUpperCase() === 'ADMIN') {
      const permRecord = db.admin_permissions.find(p => p.admin_user_id === req.user!.id);
      // Default to allowed for basic admin or check if permission is listed
      if (!permRecord || permRecord.permissions.includes(permission) || permRecord.permissions.includes('*')) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `Access denied. Missing required admin permission: "${permission}".`
      });
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin or Owner privileges required.'
    });
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
/**
 * Seeds initial production/demo accounts and migrates existing users safely
 */
export async function seedInitialUsers() {
  const now = new Date().toISOString();
  const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Ensure Owner Account exists
  let owner = db.users.find(u => u.email.toLowerCase() === 'owner@telesell.io' || u.role === 'OWNER' || u.role === 'SUPER ADMIN');
  if (!owner) {
    const ownerPass = await CryptoService.hashPassword('Owner123!');
    owner = {
      id: 'usr-owner-01',
      email: 'owner@telesell.io',
      username: 'fz_owner',
      password_hash: ownerPass,
      role: 'OWNER',
      full_name: 'FZ System Owner',
      telegram_username: 'fz_owner',
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: 'FZOWNER1',
      reseller_status: 'APPROVED',
      reseller_commission_rate: 30,
      reseller_balance: 50000,
      wallet_balance: 10000,
      total_deposited: 10000,
      total_spent: 0,
      created_at: now,
      updated_at: now
    };
    db.users.unshift(owner);
  } else {
    if (!owner.username) owner.username = 'fz_owner';
    if (owner.wallet_balance === undefined) owner.wallet_balance = 10000;
  }

  // 2. Ensure Admin Account exists
  let admin = db.users.find(u => u.email.toLowerCase() === 'admin@telesell.io');
  if (!admin) {
    const adminPass = await CryptoService.hashPassword('Admin123!');
    admin = {
      id: 'usr-admin-01',
      email: 'admin@telesell.io',
      username: 'fz_admin',
      password_hash: adminPass,
      role: 'ADMIN',
      full_name: 'Platform Administrator',
      telegram_username: 'fz_admin',
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: 'ADMIN2026',
      reseller_status: 'APPROVED',
      reseller_commission_rate: 25,
      reseller_balance: 12500,
      wallet_balance: 5000,
      total_deposited: 5000,
      total_spent: 0,
      created_at: now,
      updated_at: now
    };
    db.users.push(admin);
  } else {
    if (!admin.username) admin.username = 'fz_admin';
    if (admin.wallet_balance === undefined) admin.wallet_balance = 5000;
  }

  // Ensure Admin Permissions exist
  if (!db.admin_permissions.some(p => p.admin_user_id === admin!.id)) {
    db.admin_permissions.push({
      id: `perm-${admin.id}`,
      admin_user_id: admin.id,
      permissions: [
        'users.view',
        'users.edit',
        'payments.view',
        'payments.verify',
        'products.view',
        'products.create',
        'products.edit',
        'telegram.view',
        'telegram.connect',
        'apk.view',
        'apk.upload',
        'broadcast.send',
        'settings.view',
        'app.update',
        'security.logs'
      ],
      updated_by: owner.id,
      created_at: now,
      updated_at: now
    });
  }

  // 3. Ensure User Account exists
  let standardUser = db.users.find(u => u.email.toLowerCase() === 'user@telesell.io' || u.role === 'USER');
  if (!standardUser) {
    const userPass = await CryptoService.hashPassword('User123!');
    standardUser = {
      id: 'usr-standard-02',
      email: 'user@telesell.io',
      username: 'fz_user',
      password_hash: userPass,
      role: 'USER',
      full_name: 'FZ Client User',
      telegram_username: 'fz_client',
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: 'FZUSER77',
      reseller_status: 'NONE',
      reseller_commission_rate: 15,
      reseller_balance: 0,
      wallet_balance: 1500,
      total_deposited: 1500,
      total_spent: 350,
      created_at: now,
      updated_at: now
    };
    db.users.push(standardUser);
  } else {
    if (!standardUser.username) standardUser.username = 'fz_user';
    if (standardUser.wallet_balance === undefined) standardUser.wallet_balance = 1500;
  }

  // 4. Migrate and preserve all existing users
  for (const u of db.users) {
    if (!u.username) {
      u.username = u.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    }
    if (u.wallet_balance === undefined) {
      u.wallet_balance = u.role === 'CUSTOMER' ? 750 : 2500;
    }
    if (u.total_deposited === undefined) {
      u.total_deposited = u.wallet_balance;
    }
    if (u.total_spent === undefined) {
      u.total_spent = 0;
    }
  }

  // 5. Ensure Demo Balance Transaction exists
  if (db.balance_transactions.length === 0) {
    db.balance_transactions.push({
      id: 'tx-seed-01',
      user_id: standardUser.id,
      user_email: standardUser.email,
      type: 'CREDIT',
      amount: 1500,
      previous_balance: 0,
      new_balance: 1500,
      reason: 'Initial Wallet Welcome Deposit (UPI)',
      payment_id: 'pay-seed-upi-01',
      created_at: now
    });
  }

  // 6. Ensure default App Config and Releases exist
  if (!db.app_configs || db.app_configs.length === 0) {
    db.app_configs = [
      {
        id: 'app-cfg-primary',
        owner_id: owner.id,
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
    ];
  }

  // 7. Seed demo bot, products, and categories if bots table is empty
  if (db.telegram_bots.length === 0) {
    const botId = 'bot-seed-01';
    const fakeBotToken = '7123456789:AAEjSampleProductionKeyEncrypted001';
    const demoOwnerId = standardUser.id;
    const merchantUser = standardUser;
    const adminUser = admin;

    db.telegram_bots.push({
      id: botId,
      owner_id: demoOwnerId,
      bot_token_encrypted: CryptoService.encrypt(fakeBotToken),
      bot_id: '7123456789',
      username: 'FZShotEngineBot',
      first_name: 'FZ Shot Engine Store',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: true,
      is_active: true,
      status: 'CONNECTED',
      created_at: now,
      updated_at: now
    });

    db.bot_settings.push({
      id: 'set-bot-01',
      bot_id: botId,
      owner_id: demoOwnerId,
      display_name: '⚡ FZ Shot Engine Store',
      description: 'Instant automated delivery for software licenses, digital templates, and premium tools.',
      support_username: 'fz_support',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      start_text: '👋 *Welcome to FZ Shot Engine Store!*\n\nSelect a category or browse all digital items below with instant automated Telegram delivery.',
      start_banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
      promo_message: '🔥 Use code *TELESELL10* to get 10% OFF your purchase!',
      auto_delivery: true,
      notify_admin_on_order: true,
      created_at: now,
      updated_at: now
    });

    // Seed Buttons for Bot
    db.bot_buttons.push(
      { id: 'btn-1', bot_id: botId, owner_id: merchantUser.id, label: '🛍️ Browse Products', button_type: 'CALLBACK', target_value: 'VIEW_PRODUCTS', row_order: 0, col_order: 0, created_at: now },
      { id: 'btn-2', bot_id: botId, owner_id: merchantUser.id, label: '📂 Categories', button_type: 'CATEGORY', target_value: 'ALL_CATEGORIES', row_order: 0, col_order: 1, created_at: now },
      { id: 'btn-3', bot_id: botId, owner_id: merchantUser.id, label: '🎁 Promo Coupons', button_type: 'CALLBACK', target_value: 'VIEW_COUPONS', row_order: 1, col_order: 0, created_at: now },
      { id: 'btn-4', bot_id: botId, owner_id: merchantUser.id, label: '💳 My Balance / Wallet', button_type: 'BALANCE', target_value: 'MY_BALANCE', row_order: 1, col_order: 1, created_at: now },
      { id: 'btn-5', bot_id: botId, owner_id: merchantUser.id, label: '💬 Live Support', button_type: 'SUPPORT', target_value: 'alex_support', row_order: 2, col_order: 0, created_at: now }
    );

    // Seed Categories
    const catSoftware = 'cat-soft-01';
    const catCourses = 'cat-course-02';
    db.product_categories.push(
      { id: catSoftware, owner_id: merchantUser.id, bot_id: botId, name: 'Software Licenses', description: 'Genuine developer & productivity serial keys', is_active: true, created_at: now },
      { id: catCourses, owner_id: merchantUser.id, bot_id: botId, name: 'Premium eBooks & Files', description: 'Direct downloadable guides and assets', is_active: true, created_at: now }
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
        created_at: now,
        updated_at: now
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
        created_at: now,
        updated_at: now
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
        created_at: now,
        updated_at: now
      }
    );

    // Seed License Keys
    db.license_keys.push(
      { id: 'key-1', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-ABCD-9982-XQ71-MK01', is_redeemed: false, created_at: now },
      { id: 'key-2', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-EFGH-4412-PQ99-ZZ02', is_redeemed: false, created_at: now },
      { id: 'key-3', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-JKLM-7731-TT22-AB03', is_redeemed: false, created_at: now },
      { id: 'key-4', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-NPQR-1109-YY88-CD04', is_redeemed: false, created_at: now },
      { id: 'key-5', owner_id: merchantUser.id, product_id: prodLicense, license_key: 'W11P-STUV-5567-EE44-EF05', is_redeemed: false, created_at: now }
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
      created_at: now
    });

    // Seed Customers
    const cust1 = 'cust-tg-98711';
    const cust2 = 'cust-tg-55421';
    db.customers.push(
      { id: cust1, owner_id: merchantUser.id, bot_id: botId, telegram_id: '98711234', username: 'dev_rahul', first_name: 'Rahul Sharma', total_purchases: 2, total_spent: 2098, wallet_balance: 150, last_purchase_at: now, created_at: now, updated_at: now },
      { id: cust2, owner_id: merchantUser.id, bot_id: botId, telegram_id: '55421980', username: 'priya_codes', first_name: 'Priya Verma', total_purchases: 1, total_spent: 799, wallet_balance: 0, last_purchase_at: now, created_at: now, updated_at: now }
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
      created_at: now
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
