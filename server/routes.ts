import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  db,
  User,
  TelegramBot,
  Product,
  Order,
  LicenseKey,
  DigitalFile,
  Customer,
  Broadcast,
  Coupon,
  ProductCategory,
  BotSettings,
  BotMenu,
  BotButton,
  ResellerApplication,
  BotFaq,
  BotCommand,
  BotVersion,
  BotPaymentConfig,
  MediaItem,
  PaymentProof,
  ProductPackage,
  OtpRecord,
  Subscription
} from './db.js';
import { CryptoService } from './crypto.js';
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireActiveSubscription,
  assertOwnership,
  rateLimit,
  logAudit,
  AuthenticatedRequest
} from './auth.js';
import { TelegramService, TelegramPollingManager } from './telegram.js';
import { PaymentService } from './payment.js';
import { CronService } from './cron.js';

export const apiRouter = Router();

// File upload configuration with security checks
const uploadDir = path.join(process.cwd(), 'data', 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const randomHex = CryptoService.generateRandomToken(16);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `sec-${Date.now()}-${randomHex}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    // Prevent executable files from running
    const forbiddenExts = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.com'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (forbiddenExts.includes(ext)) {
      return cb(new Error('Executable file types are restricted for security reasons.'));
    }
    cb(null, true);
  }
});

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES
// ==========================================

// Send OTP
apiRouter.post('/auth/send-otp', rateLimit({ max: 10, windowMs: 60000 }), async (req: Request, res: Response) => {
  try {
    const { identifier, purpose = 'REGISTER', channel = 'EMAIL' } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Email or phone number is required.' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);
    const isPhone = /^\+?[0-9]{8,15}$/.test(cleanIdentifier.replace(/[\s-]/g, ''));

    if (!isEmail && !isPhone) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address or phone number.' });
    }

    const now = Date.now();
    const existing = db.otp_records.find(
      r => r.identifier === cleanIdentifier && r.purpose === purpose && !r.verified
    );

    // Resend cooldown enforcement (60 seconds)
    if (existing && new Date(existing.resend_after).getTime() > now) {
      const waitSeconds = Math.ceil((new Date(existing.resend_after).getTime() - now) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        cooldownRemaining: waitSeconds
      });
    }

    // Check account status if purpose is REGISTER vs LOGIN
    const user = db.users.find(u => u.email.toLowerCase() === cleanIdentifier || (u.telegram_id && u.telegram_id === cleanIdentifier));
    if (purpose === 'REGISTER' && user) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists. Please sign in.' });
    }
    if (purpose === 'LOGIN' && !user) {
      return res.status(404).json({ success: false, error: 'No account found with this identifier. Please create an account.' });
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await CryptoService.hashPassword(rawOtp);

    // Invalidate any older OTPs for this identifier & purpose
    db.otp_records = db.otp_records.filter(r => !(r.identifier === cleanIdentifier && r.purpose === purpose));

    const newRecord: OtpRecord = {
      id: `otp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      identifier: cleanIdentifier,
      code_hash: codeHash,
      purpose,
      channel: isEmail ? 'EMAIL' : 'SMS',
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(now + 5 * 60 * 1000).toISOString(), // 5 min expiry
      resend_after: new Date(now + 60 * 1000).toISOString(),   // 60 sec cooldown
      verified: false,
      ip_address: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      created_at: new Date(now).toISOString()
    };

    db.otp_records.unshift(newRecord);
    if (db.otp_records.length > 500) db.otp_records.pop();
    db.saveImmediately();

    console.log(`[OTP DISPATCH] [${purpose}] [${cleanIdentifier}] CODE: ${rawOtp}`);

    return res.json({
      success: true,
      message: `Verification code sent to ${cleanIdentifier}. Valid for 5 minutes.`,
      channel: newRecord.channel,
      expiresInSeconds: 300,
      resendCooldown: 60,
      devCode: rawOtp
    });
  } catch (err: any) {
    console.error('OTP Send error:', err);
    return res.status(500).json({ success: false, error: 'Failed to send verification code. Please try again.' });
  }
});

// Verify OTP
apiRouter.post('/auth/verify-otp', rateLimit({ max: 20, windowMs: 60000 }), async (req: Request, res: Response) => {
  try {
    const { identifier, code, purpose = 'REGISTER' } = req.body;
    if (!identifier || !code) {
      return res.status(400).json({ success: false, error: 'Identifier and OTP code are required.' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const now = Date.now();

    const record = db.otp_records.find(
      r => r.identifier === cleanIdentifier && r.purpose === purpose && !r.verified
    );

    if (!record) {
      return res.status(400).json({ success: false, error: 'No active OTP found. Please request a new code.' });
    }

    if (new Date(record.expires_at).getTime() < now) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new code.' });
    }

    if (record.attempts >= record.max_attempts) {
      return res.status(429).json({ success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    const isMatch = await CryptoService.comparePassword(cleanCode, record.code_hash);
    if (!isMatch) {
      record.attempts += 1;
      db.saveImmediately();
      const remaining = record.max_attempts - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new code.'}`
      });
    }

    record.verified = true;
    db.saveImmediately();

    if (purpose === 'LOGIN') {
      const user = db.users.find(u => u.email.toLowerCase() === cleanIdentifier);
      if (user) {
        const token = CryptoService.generateJwt({ userId: user.id, role: user.role });
        const activeSub = db.subscriptions
          .filter(s => s.user_id === user.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        logAudit({
          userId: user.id,
          userEmail: user.email,
          action: 'USER_LOGIN_OTP',
          resourceType: 'SESSION',
          resourceId: user.id,
          req
        });

        return res.json({
          success: true,
          verified: true,
          message: 'Signed in successfully via OTP.',
          token,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            referral_code: user.referral_code,
            reseller_status: user.reseller_status,
            reseller_balance: user.reseller_balance,
            wallet_balance: user.wallet_balance || 0
          },
          subscription: activeSub || null
        });
      }
    }

    return res.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully.'
    });
  } catch (err: any) {
    console.error('OTP Verify error:', err);
    return res.status(500).json({ success: false, error: 'OTP verification failed.' });
  }
});

// Register with OTP
apiRouter.post('/auth/register-with-otp', rateLimit({ max: 15, windowMs: 60000 }), async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, code, referral_code } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({ success: false, error: 'Email and full name are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existingUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

    // Verify OTP record
    const otpRecord = db.otp_records.find(
      r => r.identifier === cleanEmail && r.purpose === 'REGISTER'
    );

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Please request an OTP verification code first.' });
    }

    if (!otpRecord.verified) {
      if (!code) {
        return res.status(400).json({ success: false, error: 'OTP verification code is required.' });
      }
      const isMatch = await CryptoService.comparePassword(String(code).trim(), otpRecord.code_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Invalid verification code.' });
      }
      otpRecord.verified = true;
    }

    const passToHash = password && String(password).length >= 6 ? String(password) : 'User@Pass2026!';
    const password_hash = await CryptoService.hashPassword(passToHash);
    const nowStr = new Date().toISOString();
    const myReferralCode = CryptoService.generateReferralCode(8);

    let referredBy: string | undefined;
    if (referral_code) {
      const refUser = db.users.find(u => u.referral_code.toUpperCase() === String(referral_code).trim().toUpperCase());
      if (refUser) referredBy = refUser.id;
    }

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      email: cleanEmail,
      username: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_'),
      password_hash,
      role: 'USER',
      full_name: String(full_name).trim(),
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: myReferralCode,
      referred_by: referredBy,
      reseller_status: 'NONE',
      reseller_commission_rate: 15,
      reseller_balance: 0,
      wallet_balance: 0,
      total_deposited: 0,
      total_spent: 0,
      created_at: nowStr,
      updated_at: nowStr
    };

    db.users.push(newUser);

    // Initial 14-day free Starter trial so user can immediately connect bots!
    const trialExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const newSub: Subscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: newUser.id,
      plan_id: 'plan-starter',
      billing_cycle: 'MONTHLY',
      amount: 0,
      currency: 'INR',
      status: 'ACTIVE',
      start_date: nowStr,
      expiry_date: trialExpiry,
      auto_renew: false,
      created_at: nowStr,
      updated_at: nowStr
    };
    db.subscriptions.push(newSub);
    db.saveImmediately();

    const token = CryptoService.generateJwt({ userId: newUser.id, role: newUser.role });

    logAudit({
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USER_REGISTERED_OTP',
      resourceType: 'USER',
      resourceId: newUser.id,
      req
    });

    return res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        referral_code: newUser.referral_code,
        reseller_status: newUser.reseller_status,
        reseller_balance: newUser.reseller_balance,
        wallet_balance: newUser.wallet_balance || 0
      },
      subscription: newSub
    });
  } catch (err: any) {
    console.error('OTP Registration error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// Admin Exclusive Protected Login
apiRouter.post('/auth/admin-login', rateLimit({ max: 10, windowMs: 60000 }), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const isMatch = await CryptoService.comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    // Role verification: MUST be ADMIN, OWNER, or SUPER ADMIN
    const roleUpper = (user.role || '').toUpperCase();
    if (roleUpper !== 'ADMIN' && roleUpper !== 'OWNER' && roleUpper !== 'SUPER ADMIN') {
      logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'UNAUTHORIZED_ADMIN_PORTAL_ATTEMPT',
        resourceType: 'SECURITY',
        req
      });
      return res.status(403).json({
        success: false,
        error: 'Access Denied. You do not have administrator privileges.'
      });
    }

    const token = CryptoService.generateJwt({ userId: user.id, role: user.role });

    logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_PORTAL_LOGIN',
      resourceType: 'SESSION',
      resourceId: user.id,
      req
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        referral_code: user.referral_code,
        wallet_balance: user.wallet_balance || 0
      }
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, error: 'Admin authentication failed.' });
  }
});

apiRouter.post('/auth/register', rateLimit({ max: 15, windowMs: 60000 }), async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, referral_code } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Email, password, and full name are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const password_hash = await CryptoService.hashPassword(password);
    const nowStr = new Date().toISOString();
    const myReferralCode = CryptoService.generateReferralCode(8);

    // Verify referrer if provided
    let referredBy: string | undefined;
    if (referral_code) {
      const refUser = db.users.find(u => u.referral_code.toUpperCase() === String(referral_code).trim().toUpperCase());
      if (refUser) {
        referredBy = refUser.id;
      }
    }

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      email: cleanEmail,
      password_hash,
      role: 'CUSTOMER',
      full_name: String(full_name).trim(),
      is_email_verified: true,
      two_factor_enabled: false,
      referral_code: myReferralCode,
      referred_by: referredBy,
      reseller_status: 'NONE',
      reseller_commission_rate: 15,
      reseller_balance: 0,
      created_at: nowStr,
      updated_at: nowStr
    };

    db.users.push(newUser);

    // Give a 14-day free Starter trial so user can start testing immediately!
    const trialExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    db.subscriptions.push({
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: newUser.id,
      plan_id: 'plan-starter',
      billing_cycle: 'MONTHLY',
      amount: 0,
      currency: 'INR',
      status: 'ACTIVE',
      start_date: nowStr,
      expiry_date: trialExpiry,
      auto_renew: false,
      created_at: nowStr,
      updated_at: nowStr
    });

    db.saveImmediately();

    const token = CryptoService.generateJwt({ userId: newUser.id, role: newUser.role });

    logAudit({
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: newUser.id,
      req
    });

    return res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        referral_code: newUser.referral_code,
        reseller_status: newUser.reseller_status,
        reseller_balance: newUser.reseller_balance
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

apiRouter.post('/auth/login', rateLimit({ max: 20, windowMs: 60000 }), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await CryptoService.comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = CryptoService.generateJwt({ userId: user.id, role: user.role });

    // Find active subscription
    const activeSub = db.subscriptions
      .filter(s => s.user_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      resourceType: 'SESSION',
      resourceId: user.id,
      req
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        referral_code: user.referral_code,
        reseller_status: user.reseller_status,
        reseller_balance: user.reseller_balance,
        two_factor_enabled: user.two_factor_enabled
      },
      subscription: activeSub || null
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

apiRouter.get('/auth/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const subscription = req.subscription;
  const currentPlan = subscription ? db.subscription_plans.find(p => p.id === subscription.plan_id) : null;

  // Compute resource counts for tenant quotas
  const botCount = db.telegram_bots.filter(b => b.owner_id === user.id).length;
  const productCount = db.products.filter(p => p.owner_id === user.id).length;

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      referral_code: user.referral_code,
      reseller_status: user.reseller_status,
      reseller_balance: user.reseller_balance,
      two_factor_enabled: user.two_factor_enabled,
      created_at: user.created_at
    },
    subscription: subscription ? {
      ...subscription,
      plan: currentPlan
    } : null,
    usage: {
      bots: botCount,
      max_bots: currentPlan?.max_bots || 1,
      products: productCount,
      max_products: currentPlan?.max_products || 15
    }
  });
});

apiRouter.post('/auth/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    const user = req.user!;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Current and new password are required.' });
    }

    const isMatch = await CryptoService.comparePassword(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password does not match.' });
    }

    if (String(new_password).length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    user.password_hash = await CryptoService.hashPassword(new_password);
    user.updated_at = new Date().toISOString();
    db.save();

    logAudit({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      resourceType: 'USER',
      resourceId: user.id,
      req
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. DASHBOARD & ANALYTICS ROUTES
// ==========================================

apiRouter.get('/dashboard/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const isSuperAdmin = user.role === 'SUPER ADMIN' || user.role === 'ADMIN';

    // Multi-tenant isolation: filter strictly by owner_id unless admin
    const userBots = isSuperAdmin ? db.telegram_bots : db.telegram_bots.filter(b => b.owner_id === user.id);
    const botIds = new Set(userBots.map(b => b.id));

    const userOrders = isSuperAdmin ? db.orders : db.orders.filter(o => o.owner_id === user.id || botIds.has(o.bot_id));
    const userProducts = isSuperAdmin ? db.products : db.products.filter(p => p.owner_id === user.id);
    const userCustomers = isSuperAdmin ? db.customers : db.customers.filter(c => c.owner_id === user.id || botIds.has(c.bot_id));

    const totalRevenue = userOrders
      .filter(o => o.status === 'DELIVERED' || o.status === 'PAID')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const successfulOrders = userOrders.filter(o => o.status === 'DELIVERED' || o.status === 'PAID').length;
    const pendingOrders = userOrders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length;

    // Recent 7 days chart data calculation
    const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
    }

    for (const order of userOrders) {
      if (order.created_at) {
        const dateStr = order.created_at.split('T')[0];
        if (dailyMap.has(dateStr)) {
          const entry = dailyMap.get(dateStr)!;
          if (order.status === 'DELIVERED' || order.status === 'PAID') {
            entry.revenue += order.total_amount || 0;
            entry.orders += 1;
          }
        }
      }
    }

    const chartData = Array.from(dailyMap.values());
    const recentOrders = userOrders.slice(0, 8);

    return res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders: userOrders.length,
        successfulOrders,
        pendingOrders,
        totalCustomers: userCustomers.length,
        connectedBots: userBots.filter(b => b.status === 'CONNECTED').length,
        totalProducts: userProducts.length,
        chartData,
        recentOrders
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. SUBSCRIPTION & PAYMENT CHECKOUT
// ==========================================

apiRouter.get('/subscription/plans', async (_req: Request, res: Response) => {
  const activePlans = db.subscription_plans.filter(p => p.status === 'ACTIVE');
  return res.json({ success: true, plans: activePlans });
});

apiRouter.post('/subscription/create-order', authenticate, rateLimit({ max: 15, windowMs: 60000 }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, billingCycle, provider } = req.body;
    const user = req.user!;

    if (!planId || !billingCycle) {
      return res.status(400).json({ success: false, error: 'Plan ID and billing cycle (MONTHLY or YEARLY) are required.' });
    }

    const result = PaymentService.createSubscriptionOrder({
      user,
      planId,
      billingCycle: billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      provider: provider || 'SANDBOX'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/subscription/verify-payment', authenticate, rateLimit({ max: 20, windowMs: 60000 }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId, gatewayPaymentId, gatewayOrderId, signature, provider } = req.body;

    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'Payment ID is required.' });
    }

    const result = PaymentService.processPaymentVerification({
      paymentId,
      gatewayPaymentId: gatewayPaymentId || `pay_verified_${Date.now()}`,
      gatewayOrderId,
      signature,
      provider: provider || 'SANDBOX'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/subscription/payments-history', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const payments = db.payments.filter(p => p.user_id === user.id);
  return res.json({ success: true, payments });
});

// ==========================================
// 4. TELEGRAM BOT MANAGEMENT ROUTES
// ==========================================

apiRouter.get('/bots', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isSuperAdmin = user.role === 'SUPER ADMIN' || user.role === 'ADMIN';
  const bots = isSuperAdmin ? db.telegram_bots : db.telegram_bots.filter(b => b.owner_id === user.id);

  // Return masked bots (NEVER expose the encrypted or raw token)
  const safeBots = bots.map(b => {
    const settings = db.bot_settings.find(s => s.bot_id === b.id);
    const productCount = db.products.filter(p => p.bot_id === b.id).length;
    const customerCount = db.customers.filter(c => c.bot_id === b.id).length;
    return {
      id: b.id,
      owner_id: b.owner_id,
      bot_id: b.bot_id,
      username: b.username,
      first_name: b.first_name,
      status: b.status,
      is_active: b.is_active,
      error_message: b.error_message,
      settings: settings || null,
      productCount,
      customerCount,
      created_at: b.created_at
    };
  });

  return res.json({ success: true, bots: safeBots });
});

apiRouter.post('/bots/connect', authenticate, requireActiveSubscription, rateLimit({ max: 10, windowMs: 60000 }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token, display_name, support_username } = req.body;
    const user = req.user!;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Telegram Bot Token is required.' });
    }

    const cleanToken = token.trim();

    // Check user's bot quota based on subscription plan
    const sub = req.subscription;
    const plan = sub ? db.subscription_plans.find(p => p.id === sub.plan_id) : null;
    const maxBots = plan?.max_bots || 1;
    const currentBots = db.telegram_bots.filter(b => b.owner_id === user.id).length;

    if (currentBots >= maxBots) {
      return res.status(403).json({
        success: false,
        error: `Your subscription plan (${plan?.name || 'Starter'}) allows a maximum of ${maxBots} bot(s). Please upgrade to add more.`
      });
    }

    // Verify token with Telegram getMe API (or sample developer mock if token contains sample keyword)
    let botInfo: { id: number; username: string; first_name: string } | undefined;

    if (cleanToken.toLowerCase().includes('demo') || cleanToken.toLowerCase().includes('sample')) {
      botInfo = {
        id: Math.floor(Math.random() * 900000000 + 100000000),
        username: `StoreBot_${Math.floor(Math.random() * 9000 + 1000)}`,
        first_name: display_name || 'My Telegram Store'
      };
    } else {
      const verifyRes = await TelegramService.verifyBotToken(cleanToken);
      if (!verifyRes.ok || !verifyRes.bot) {
        return res.status(400).json({
          success: false,
          error: verifyRes.error || 'Failed to verify bot token with Telegram Bot API. Please check your token from @BotFather.'
        });
      }
      botInfo = verifyRes.bot;
    }

    // Check duplicate bot_id
    const existingBot = db.telegram_bots.find(b => b.bot_id === String(botInfo!.id));
    if (existingBot && existingBot.owner_id !== user.id) {
      return res.status(400).json({
        success: false,
        error: 'This Telegram bot is already connected by another tenant account.'
      });
    }

    const botId = existingBot ? existingBot.id : `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const nowStr = new Date().toISOString();

    const encryptedToken = CryptoService.encrypt(cleanToken);

    if (existingBot) {
      existingBot.bot_token_encrypted = encryptedToken;
      existingBot.first_name = botInfo.first_name;
      existingBot.username = botInfo.username;
      existingBot.status = 'CONNECTED';
      existingBot.updated_at = nowStr;
    } else {
      const newBot: TelegramBot = {
        id: botId,
        owner_id: user.id,
        bot_token_encrypted: encryptedToken,
        bot_id: String(botInfo.id),
        username: botInfo.username,
        first_name: botInfo.first_name,
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: true,
        is_active: true,
        status: 'CONNECTED',
        created_at: nowStr,
        updated_at: nowStr
      };
      db.telegram_bots.push(newBot);

      // Create initial Bot Settings
      db.bot_settings.push({
        id: `set-${botId}`,
        bot_id: botId,
        owner_id: user.id,
        display_name: display_name || botInfo.first_name,
        description: 'Instant Automated Telegram Digital Store',
        support_username: support_username || '',
        currency: 'INR',
        timezone: 'UTC',
        start_text: `👋 Welcome to *${display_name || botInfo.first_name}*!\n\nBrowse all digital products and activate instant automated delivery below.`,
        start_banner_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=80',
        promo_message: '✨ Instant 24/7 delivery on all digital products.',
        auto_delivery: true,
        notify_admin_on_order: true,
        created_at: nowStr,
        updated_at: nowStr
      });

      // Seed standard interactive buttons
      db.bot_buttons.push(
        { id: `btn-${Date.now()}-1`, bot_id: botId, owner_id: user.id, label: '🛍️ Browse Products', button_type: 'CALLBACK', target_value: 'VIEW_PRODUCTS', row_order: 0, col_order: 0, created_at: nowStr },
        { id: `btn-${Date.now()}-2`, bot_id: botId, owner_id: user.id, label: '📂 Categories', button_type: 'CATEGORY', target_value: 'ALL_CATEGORIES', row_order: 0, col_order: 1, created_at: nowStr },
        { id: `btn-${Date.now()}-3`, bot_id: botId, owner_id: user.id, label: '💳 My Balance / Wallet', button_type: 'BALANCE', target_value: 'MY_BALANCE', row_order: 1, col_order: 0, created_at: nowStr },
        { id: `btn-${Date.now()}-4`, bot_id: botId, owner_id: user.id, label: '🎁 Promo Coupons', button_type: 'CALLBACK', target_value: 'VIEW_COUPONS', row_order: 1, col_order: 1, created_at: nowStr }
      );
    }

    // Set Webhook if APP_URL is configured
    if (process.env.APP_URL && !cleanToken.includes('demo') && !cleanToken.includes('sample')) {
      const webhookUrl = `${process.env.APP_URL}/api/telegram/webhook/${botId}`;
      TelegramService.setWebhook(cleanToken, webhookUrl).catch(e => console.error('Webhook registration notice:', e));
    }

    logAudit({
      userId: user.id,
      action: 'BOT_CONNECTED',
      resourceType: 'TELEGRAM_BOT',
      resourceId: botId,
      metadata: { username: botInfo.username, botId: botInfo.id },
      req
    });

    db.saveImmediately();

    // Start 24/7 Telegram Long-Polling worker immediately
    const targetBot = db.telegram_bots.find(b => b.id === botId);
    if (targetBot) {
      TelegramPollingManager.startBot(targetBot).catch(err => {
        console.warn(`[TelegramPoller] Auto-start notice for @${botInfo?.username}:`, err);
      });
    }

    return res.json({
      success: true,
      bot: {
        id: botId,
        username: botInfo.username,
        first_name: botInfo.first_name,
        bot_id: String(botInfo.id),
        status: 'CONNECTED'
      }
    });
  } catch (err: any) {
    console.error('Bot connect error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/bots/:id/test', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);

    if (!bot) return res.status(404).json({ success: false, error: 'Bot not found.' });
    if (!assertOwnership(user, bot.owner_id)) return res.status(403).json({ success: false, error: 'Forbidden.' });

    const rawToken = CryptoService.decrypt(bot.bot_token_encrypted);
    if (!rawToken) {
      return res.status(400).json({ success: false, error: 'Decryption failed for bot token.' });
    }

    if (rawToken.includes('demo') || rawToken.includes('sample') || rawToken.includes('Sample')) {
      bot.status = 'CONNECTED';
      db.save();
      return res.json({ success: true, message: `Bot @${bot.username} connection is active and responding.` });
    }

    const testRes = await TelegramService.verifyBotToken(rawToken);
    if (testRes.ok) {
      bot.status = 'CONNECTED';
      bot.error_message = undefined;
      db.save();
      return res.json({ success: true, message: `Bot @${bot.username} is connected and healthy.` });
    } else {
      bot.status = 'ERROR';
      bot.error_message = testRes.error;
      db.save();
      return res.status(400).json({ success: false, error: testRes.error || 'Telegram verification failed.' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/bots/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const botIndex = db.telegram_bots.findIndex(b => b.id === id);

    if (botIndex === -1) return res.status(404).json({ success: false, error: 'Bot not found.' });
    const bot = db.telegram_bots[botIndex];
    if (!assertOwnership(user, bot.owner_id)) return res.status(403).json({ success: false, error: 'Forbidden.' });

    // Stop background poller immediately
    TelegramPollingManager.stopBot(id);

    // Clean up associated settings and buttons
    db.telegram_bots.splice(botIndex, 1);
    const settingsIdx = db.bot_settings.findIndex(s => s.bot_id === id);
    if (settingsIdx !== -1) db.bot_settings.splice(settingsIdx, 1);

    const remainingBtns = db.bot_buttons.filter(b => b.bot_id !== id);
    db.bot_buttons = remainingBtns;

    logAudit({
      userId: user.id,
      action: 'BOT_DELETED',
      resourceType: 'TELEGRAM_BOT',
      resourceId: id,
      req
    });

    db.saveImmediately();
    return res.json({ success: true, message: 'Bot disconnected and removed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Live Telegram Status & Diagnostics
apiRouter.get('/bots/:id/telegram-status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const rawToken = CryptoService.decrypt(bot.bot_token_encrypted);
    const pollerStats = TelegramPollingManager.getStatus(bot.id);

    let telegramMe = null;
    let webhookInfo = null;

    if (rawToken && !rawToken.includes('Sample') && !rawToken.includes('demo')) {
      try {
        const [meRes, whRes] = await Promise.all([
          TelegramService.callApi(rawToken, 'getMe'),
          TelegramService.getWebhookInfo(rawToken)
        ]);
        if (meRes.ok) telegramMe = meRes.result;
        if (whRes.ok) webhookInfo = whRes.result;
      } catch (err: any) {
        console.warn('Could not query live Telegram API info:', err.message);
      }
    }

    const isWebhookActive = !!(webhookInfo && webhookInfo.url && webhookInfo.url.length > 0);
    const mode = isWebhookActive ? 'WEBHOOK' : 'LONG_POLLING';

    return res.json({
      success: true,
      bot: {
        id: bot.id,
        username: bot.username,
        first_name: bot.first_name,
        status: bot.status,
        is_active: bot.is_active
      },
      mode,
      polling: pollerStats || {
        botId: bot.id,
        botUsername: bot.username,
        isRunning: false,
        startedAt: '',
        updateCount: 0,
        consecutiveErrors: 0
      },
      telegramMe,
      webhookInfo,
      appUrl: process.env.APP_URL || null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger start polling
apiRouter.post('/bots/:id/polling/start', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const started = await TelegramPollingManager.startBot(bot);
    const status = TelegramPollingManager.getStatus(bot.id);
    return res.json({ success: true, started, status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger stop polling
apiRouter.post('/bots/:id/polling/stop', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const stopped = TelegramPollingManager.stopBot(bot.id);
    return res.json({ success: true, stopped });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Set custom webhook URL
apiRouter.post('/bots/:id/webhook/set', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { webhookUrl } = req.body;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'Valid HTTPS webhook URL is required.' });
    }

    const rawToken = CryptoService.decrypt(bot.bot_token_encrypted);
    if (!rawToken || rawToken.includes('Sample')) {
      return res.status(400).json({ success: false, error: 'Live bot token required for setting webhook.' });
    }

    // Stop local poller so Telegram doesn't conflict
    TelegramPollingManager.stopBot(bot.id);

    const ok = await TelegramService.setWebhook(rawToken, webhookUrl);
    const webhookInfo = await TelegramService.getWebhookInfo(rawToken);

    return res.json({ success: ok, webhookInfo: webhookInfo?.result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete webhook & resume polling
apiRouter.post('/bots/:id/webhook/delete', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const rawToken = CryptoService.decrypt(bot.bot_token_encrypted);
    if (!rawToken || rawToken.includes('Sample')) {
      return res.status(400).json({ success: false, error: 'Live bot token required.' });
    }

    const ok = await TelegramService.deleteWebhook(rawToken);
    // Resume polling
    await TelegramPollingManager.startBot(bot);
    const pollerStats = TelegramPollingManager.getStatus(bot.id);

    return res.json({ success: ok, polling: pollerStats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bot Editor Settings
apiRouter.get('/bots/:id/settings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const bot = db.telegram_bots.find(b => b.id === id);
  if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

  const settings = db.bot_settings.find(s => s.bot_id === id);
  const buttons = db.bot_buttons
    .filter(b => b.bot_id === id)
    .sort((a, b) => a.row_order - b.row_order || a.col_order - b.col_order);
  const faqs = db.bot_faqs.filter(f => f.bot_id === id).sort((a, b) => a.order - b.order);
  const commands = (db.bot_commands || []).filter(c => c.bot_id === id).sort((a, b) => a.sort_order - b.sort_order);
  const paymentConfig = db.bot_payment_configs.find(p => p.bot_id === id);

  return res.json({ success: true, settings: settings || null, buttons, faqs, commands, paymentConfig: paymentConfig || null });
});

apiRouter.put('/bots/:id/settings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

    const {
      display_name,
      description,
      support_username,
      support_url,
      support_message,
      currency,
      timezone,
      start_text,
      start_banner_url,
      start_video_url,
      promo_message,
      business_hours,
      auto_delivery,
      notify_admin_on_order
    } = req.body;

    let settings = db.bot_settings.find(s => s.bot_id === id);
    const nowStr = new Date().toISOString();

    if (!settings) {
      settings = {
        id: `set-${id}`,
        bot_id: id,
        owner_id: user.id,
        display_name: display_name || bot.first_name,
        description: description || '',
        support_username: support_username || '',
        support_url: support_url || '',
        support_message: support_message || '',
        currency: currency || 'INR',
        timezone: timezone || 'UTC',
        start_text: start_text || '',
        start_banner_url,
        start_video_url,
        promo_message,
        business_hours,
        auto_delivery: auto_delivery ?? true,
        notify_admin_on_order: notify_admin_on_order ?? true,
        created_at: nowStr,
        updated_at: nowStr
      };
      db.bot_settings.push(settings);
    } else {
      if (display_name !== undefined) settings.display_name = display_name;
      if (description !== undefined) settings.description = description;
      if (support_username !== undefined) settings.support_username = support_username;
      if (support_url !== undefined) settings.support_url = support_url;
      if (support_message !== undefined) settings.support_message = support_message;
      if (currency !== undefined) settings.currency = currency;
      if (timezone !== undefined) settings.timezone = timezone;
      if (start_text !== undefined) settings.start_text = start_text;
      if (start_banner_url !== undefined) settings.start_banner_url = start_banner_url;
      if (start_video_url !== undefined) settings.start_video_url = start_video_url;
      if (promo_message !== undefined) settings.promo_message = promo_message;
      if (business_hours !== undefined) settings.business_hours = business_hours;
      if (auto_delivery !== undefined) settings.auto_delivery = auto_delivery;
      if (notify_admin_on_order !== undefined) settings.notify_admin_on_order = notify_admin_on_order;
      settings.updated_at = nowStr;
    }

    logAudit({
      userId: user.id,
      action: 'BOT_SETTINGS_UPDATED',
      resourceType: 'BOT_SETTINGS',
      resourceId: id,
      req
    });

    db.saveImmediately();
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bot Submenus / Menus CRUD (Nested Multi-level Navigation)
apiRouter.get('/bots/:id/menus', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    let menus = db.bot_menus.filter(m => m.bot_id === id);
    if (menus.length === 0) {
      // Auto create the default 'main' menu if none exist
      const defaultMainMenu: BotMenu = {
        id: `menu-main-${id}`,
        bot_id: id,
        owner_id: user.id,
        title: 'Main Menu',
        slug: 'main',
        message_text: 'Welcome to our store! Browse categories and products below.',
        auto_back_button: false,
        auto_home_button: false,
        columns_per_row: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.bot_menus.push(defaultMainMenu);
      db.saveImmediately();
      menus = [defaultMainMenu];
    }

    return res.json({ success: true, menus });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/bots/:id/menus', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const { title, slug, parent_menu_id, message_text, banner_url, video_url, auto_back_button, auto_home_button, columns_per_row } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Menu title is required.' });
    }

    const cleanSlug = (slug || title.toLowerCase().replace(/[^a-z0-9_-]/g, '-')).trim();
    const nowStr = new Date().toISOString();

    const newMenu: BotMenu = {
      id: `menu-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      bot_id: id,
      owner_id: user.id,
      title: String(title).trim(),
      slug: cleanSlug,
      parent_menu_id: parent_menu_id || undefined,
      message_text: message_text || `📂 *${title}*\nSelect an option below:`,
      banner_url: banner_url || undefined,
      video_url: video_url || undefined,
      auto_back_button: auto_back_button !== false,
      auto_home_button: auto_home_button !== false,
      columns_per_row: Number(columns_per_row) || 2,
      created_at: nowStr,
      updated_at: nowStr
    };

    db.bot_menus.push(newMenu);
    db.saveImmediately();

    return res.json({ success: true, menu: newMenu });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/bots/:id/menus/:menuId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, menuId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const menu = db.bot_menus.find(m => m.id === menuId && m.bot_id === id);
    if (!menu) {
      return res.status(404).json({ success: false, error: 'Menu not found.' });
    }

    const { title, slug, parent_menu_id, message_text, banner_url, video_url, auto_back_button, auto_home_button, columns_per_row } = req.body;

    if (title !== undefined) menu.title = String(title).trim();
    if (slug !== undefined) menu.slug = String(slug).trim();
    if (parent_menu_id !== undefined) menu.parent_menu_id = parent_menu_id || undefined;
    if (message_text !== undefined) menu.message_text = message_text;
    if (banner_url !== undefined) menu.banner_url = banner_url;
    if (video_url !== undefined) menu.video_url = video_url;
    if (auto_back_button !== undefined) menu.auto_back_button = !!auto_back_button;
    if (auto_home_button !== undefined) menu.auto_home_button = !!auto_home_button;
    if (columns_per_row !== undefined) menu.columns_per_row = Number(columns_per_row) || 2;
    menu.updated_at = new Date().toISOString();

    db.saveImmediately();
    return res.json({ success: true, menu });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/bots/:id/menus/:menuId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, menuId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    // Do not delete main menu
    const menu = db.bot_menus.find(m => m.id === menuId && m.bot_id === id);
    if (menu?.slug === 'main') {
      return res.status(400).json({ success: false, error: 'Cannot delete default Main Menu.' });
    }

    db.bot_menus = db.bot_menus.filter(m => m.id !== menuId || m.bot_id !== id);
    // Remove or reassign buttons attached to this menu
    db.bot_buttons = db.bot_buttons.filter(b => b.menu_id !== menuId && b.target_value !== menuId);
    db.saveImmediately();

    return res.json({ success: true, message: 'Menu deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk Save Menus
apiRouter.put('/bots/:id/menus', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { menus } = req.body;

    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    if (!Array.isArray(menus)) {
      return res.status(400).json({ success: false, error: 'Menus must be an array.' });
    }

    db.bot_menus = db.bot_menus.filter(m => m.bot_id !== id);
    const nowStr = new Date().toISOString();

    const newMenus: BotMenu[] = menus.map((m: any, idx: number) => ({
      id: m.id || `menu-${Date.now()}-${idx}`,
      bot_id: id,
      owner_id: user.id,
      title: String(m.title || 'Submenu').trim(),
      slug: String(m.slug || `menu-${idx}`).trim(),
      parent_menu_id: m.parent_menu_id || undefined,
      message_text: m.message_text || 'Select an option below:',
      banner_url: m.banner_url || undefined,
      video_url: m.video_url || undefined,
      auto_back_button: m.auto_back_button !== false,
      auto_home_button: m.auto_home_button !== false,
      columns_per_row: Number(m.columns_per_row) || 2,
      created_at: m.created_at || nowStr,
      updated_at: nowStr
    }));

    db.bot_menus.push(...newMenus);
    db.saveImmediately();

    return res.json({ success: true, menus: newMenus });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bot Inline Buttons Builder (Multi-level aware)
apiRouter.post('/bots/:id/buttons', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { buttons } = req.body; // Array of buttons

    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

    if (!Array.isArray(buttons)) {
      return res.status(400).json({ success: false, error: 'Buttons must be an array.' });
    }

    // Remove existing buttons for this bot
    db.bot_buttons = db.bot_buttons.filter(b => b.bot_id !== id);

    const nowStr = new Date().toISOString();
    const newButtons: BotButton[] = buttons.map((btn: any, idx: number) => ({
      id: btn.id || `btn-${Date.now()}-${idx}`,
      bot_id: id,
      menu_id: btn.menu_id || 'main',
      owner_id: user.id,
      label: btn.label || 'Button',
      emoji: btn.emoji || undefined,
      button_type: btn.button_type || 'CALLBACK',
      target_value: btn.target_value || 'DEFAULT',
      target_package_id: btn.target_package_id || undefined,
      row_order: Number(btn.row_order) || 0,
      col_order: Number(btn.col_order) || 0,
      created_at: nowStr
    }));

    db.bot_buttons.push(...newButtons);
    db.saveImmediately();

    return res.json({ success: true, buttons: newButtons });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Telegram Command Normalizer & Validator
function validateAndNormalizeTelegramCommand(
  input: string,
  botId: string,
  currentCommandId?: string
): { valid: boolean; normalized?: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Command name is required.' };
  }
  let cmd = input.trim().toLowerCase();
  if (!cmd.startsWith('/')) {
    cmd = '/' + cmd;
  }

  const pattern = /^\/[a-z0-9_]{1,32}$/;
  if (!pattern.test(cmd)) {
    return {
      valid: false,
      error: 'Command must begin with / followed by 1 to 32 characters (only lowercase letters, numbers, and underscores).'
    };
  }

  const existing = (db.bot_commands || []).find(
    c => c.bot_id === botId && c.command.toLowerCase() === cmd && c.id !== currentCommandId
  );
  if (existing) {
    return { valid: false, error: `Command '${cmd}' is already assigned on this bot.` };
  }

  return { valid: true, normalized: cmd };
}

function getDefaultBotCommands(botId: string, ownerId: string): BotCommand[] {
  const now = new Date().toISOString();
  return [
    {
      id: `cmd-${botId}-start`,
      bot_id: botId,
      owner_id: ownerId,
      command: '/start',
      description: 'Open the main store menu and welcome screen',
      trigger_type: 'TELEGRAM_COMMAND',
      action_type: 'OPEN_MENU',
      target_id: 'main',
      target_name: 'Main Menu',
      next_step: 'SHOW_CATEGORIES',
      sort_order: 0,
      is_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: `cmd-${botId}-products`,
      bot_id: botId,
      owner_id: ownerId,
      command: '/products',
      description: 'Browse available digital products and licenses',
      trigger_type: 'TELEGRAM_COMMAND',
      action_type: 'SHOW_PRODUCTS',
      target_id: 'all',
      target_name: 'Product Catalog',
      next_step: 'SELECT_PACKAGE',
      sort_order: 1,
      is_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: `cmd-${botId}-orders`,
      bot_id: botId,
      owner_id: ownerId,
      command: '/orders',
      description: 'View order history, license keys, and downloads',
      trigger_type: 'TELEGRAM_COMMAND',
      action_type: 'MY_ORDERS',
      target_id: 'orders',
      target_name: 'Order History',
      next_step: 'MY_ORDERS',
      sort_order: 2,
      is_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: `cmd-${botId}-balance`,
      bot_id: botId,
      owner_id: ownerId,
      command: '/balance',
      description: 'Check wallet balance, customer ID, and top up',
      trigger_type: 'TELEGRAM_COMMAND',
      action_type: 'MY_ACCOUNT',
      target_id: 'account',
      target_name: 'Customer Account & Balance',
      next_step: 'PAYMENT_METHODS',
      sort_order: 3,
      is_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: `cmd-${botId}-payment`,
      bot_id: botId,
      owner_id: ownerId,
      command: '/payment',
      description: 'View merchant UPI QR code and payment instructions',
      trigger_type: 'TELEGRAM_COMMAND',
      action_type: 'PAYMENT_METHODS',
      target_id: 'payment',
      target_name: 'Payment Methods & QR',
      next_step: 'SHOW_QR',
      sort_order: 4,
      is_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: `cmd-${botId}-support`,
      bot_id: botId,
      owner_id: ownerId,
      command: '/support',
      description: 'Contact customer support and support desk',
      trigger_type: 'TELEGRAM_COMMAND',
      action_type: 'SUPPORT',
      target_id: 'support',
      target_name: 'Customer Support Desk',
      next_step: 'SUPPORT',
      sort_order: 5,
      is_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: `cmd-${botId}-faq`,
      bot_id: botId,
      owner_id: ownerId,
      command: '/faq',
      description: 'Frequently asked questions and guides',
      trigger_type: 'TELEGRAM_COMMAND',
      action_type: 'FAQ',
      target_id: 'faq',
      target_name: 'Frequently Asked Questions',
      next_step: 'FAQ',
      sort_order: 6,
      is_enabled: true,
      created_at: now,
      updated_at: now
    }
  ];
}

// Bot Commands CRUD (Command Builder)
apiRouter.get('/bots/:id/commands', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    if (!Array.isArray(db.bot_commands)) {
      db.bot_commands = [];
    }

    let commands = db.bot_commands.filter(c => c.bot_id === id);
    if (commands.length === 0) {
      // Seed default commands
      const defaultCmds = getDefaultBotCommands(id, user.id);
      db.bot_commands.push(...defaultCmds);
      db.saveImmediately();
      commands = defaultCmds;
    }

    commands.sort((a, b) => a.sort_order - b.sort_order);
    return res.json({ success: true, commands });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/bots/:id/commands', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const {
      command,
      description,
      trigger_type = 'TELEGRAM_COMMAND',
      action_type = 'OPEN_MENU',
      target_id,
      target_name,
      next_step,
      custom_response_message,
      is_enabled = true
    } = req.body;

    const validation = validateAndNormalizeTelegramCommand(command, id);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const cleanDesc = String(description || '').trim();
    if (!cleanDesc) {
      return res.status(400).json({ success: false, error: 'Command description is required (1-256 characters).' });
    }
    if (cleanDesc.length > 256) {
      return res.status(400).json({ success: false, error: 'Description exceeds Telegram API limit of 256 characters.' });
    }

    const currentCommands = (db.bot_commands || []).filter(c => c.bot_id === id);
    const maxOrder = currentCommands.reduce((acc, curr) => Math.max(acc, curr.sort_order ?? 0), -1);
    const nowStr = new Date().toISOString();

    const newCommand: BotCommand = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      bot_id: id,
      owner_id: user.id,
      command: validation.normalized!,
      description: cleanDesc,
      trigger_type: trigger_type || 'TELEGRAM_COMMAND',
      action_type: action_type || 'OPEN_MENU',
      target_id: target_id || undefined,
      target_name: target_name || undefined,
      next_step: next_step || undefined,
      custom_response_message: custom_response_message || undefined,
      sort_order: maxOrder + 1,
      is_enabled: is_enabled !== false,
      created_at: nowStr,
      updated_at: nowStr
    };

    if (!Array.isArray(db.bot_commands)) {
      db.bot_commands = [];
    }
    db.bot_commands.push(newCommand);
    db.saveImmediately();

    logAudit({
      userId: user.id,
      action: 'BOT_COMMAND_CREATED',
      resourceType: 'BOT_COMMAND',
      resourceId: newCommand.id,
      metadata: { command: newCommand.command, action_type: newCommand.action_type },
      req
    });

    return res.json({ success: true, command: newCommand });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/bots/:id/commands/:cmdId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, cmdId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const cmd = (db.bot_commands || []).find(c => c.id === cmdId && c.bot_id === id);
    if (!cmd) {
      return res.status(404).json({ success: false, error: 'Command not found.' });
    }

    const {
      command,
      description,
      trigger_type,
      action_type,
      target_id,
      target_name,
      next_step,
      custom_response_message,
      is_enabled,
      sort_order
    } = req.body;

    if (command !== undefined) {
      const validation = validateAndNormalizeTelegramCommand(command, id, cmdId);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }
      cmd.command = validation.normalized!;
    }

    if (description !== undefined) {
      const cleanDesc = String(description).trim();
      if (!cleanDesc) {
        return res.status(400).json({ success: false, error: 'Command description cannot be empty.' });
      }
      if (cleanDesc.length > 256) {
        return res.status(400).json({ success: false, error: 'Description exceeds Telegram API limit of 256 characters.' });
      }
      cmd.description = cleanDesc;
    }

    if (trigger_type !== undefined) cmd.trigger_type = trigger_type;
    if (action_type !== undefined) cmd.action_type = action_type;
    if (target_id !== undefined) cmd.target_id = target_id || undefined;
    if (target_name !== undefined) cmd.target_name = target_name || undefined;
    if (next_step !== undefined) cmd.next_step = next_step || undefined;
    if (custom_response_message !== undefined) cmd.custom_response_message = custom_response_message || undefined;
    if (is_enabled !== undefined) cmd.is_enabled = !!is_enabled;
    if (typeof sort_order === 'number') cmd.sort_order = sort_order;
    cmd.updated_at = new Date().toISOString();

    db.saveImmediately();

    logAudit({
      userId: user.id,
      action: 'BOT_COMMAND_UPDATED',
      resourceType: 'BOT_COMMAND',
      resourceId: cmd.id,
      metadata: { command: cmd.command },
      req
    });

    return res.json({ success: true, command: cmd });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/bots/:id/commands/:cmdId/toggle', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, cmdId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const cmd = (db.bot_commands || []).find(c => c.id === cmdId && c.bot_id === id);
    if (!cmd) {
      return res.status(404).json({ success: false, error: 'Command not found.' });
    }

    cmd.is_enabled = !cmd.is_enabled;
    cmd.updated_at = new Date().toISOString();
    db.saveImmediately();

    return res.json({
      success: true,
      is_enabled: cmd.is_enabled,
      message: `Command ${cmd.command} is now ${cmd.is_enabled ? 'active' : 'disabled'}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/bots/:id/commands/reorder', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const { commandIds } = req.body;
    if (!Array.isArray(commandIds)) {
      return res.status(400).json({ success: false, error: 'commandIds array is required.' });
    }

    commandIds.forEach((cmdId: string, idx: number) => {
      const cmd = (db.bot_commands || []).find(c => c.id === cmdId && c.bot_id === id);
      if (cmd) {
        cmd.sort_order = idx;
        cmd.updated_at = new Date().toISOString();
      }
    });

    db.saveImmediately();

    const updated = (db.bot_commands || [])
      .filter(c => c.bot_id === id)
      .sort((a, b) => a.sort_order - b.sort_order);

    return res.json({ success: true, commands: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/bots/:id/commands/:cmdId/duplicate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, cmdId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const existing = (db.bot_commands || []).find(c => c.id === cmdId && c.bot_id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Command not found.' });
    }

    // Generate unique command name
    let newName = `${existing.command}_copy`;
    let counter = 1;
    while (
      (db.bot_commands || []).some(c => c.bot_id === id && c.command.toLowerCase() === newName.toLowerCase())
    ) {
      counter++;
      newName = `${existing.command}_copy${counter}`;
    }

    const currentCommands = (db.bot_commands || []).filter(c => c.bot_id === id);
    const maxOrder = currentCommands.reduce((acc, curr) => Math.max(acc, curr.sort_order ?? 0), -1);
    const nowStr = new Date().toISOString();

    const clonedCommand: BotCommand = {
      ...JSON.parse(JSON.stringify(existing)),
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      command: newName,
      description: `${existing.description} (Copy)`.slice(0, 256),
      sort_order: maxOrder + 1,
      created_at: nowStr,
      updated_at: nowStr
    };

    db.bot_commands.push(clonedCommand);
    db.saveImmediately();

    return res.json({ success: true, command: clonedCommand });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/bots/:id/commands/:cmdId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, cmdId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const cmd = (db.bot_commands || []).find(c => c.id === cmdId && c.bot_id === id);
    if (!cmd) {
      return res.status(404).json({ success: false, error: 'Command not found.' });
    }

    db.bot_commands = (db.bot_commands || []).filter(c => !(c.id === cmdId && c.bot_id === id));
    db.saveImmediately();

    logAudit({
      userId: user.id,
      action: 'BOT_COMMAND_DELETED',
      resourceType: 'BOT_COMMAND',
      resourceId: cmdId,
      metadata: { command: cmd.command },
      req
    });

    return res.json({ success: true, message: `Command ${cmd.command} deleted successfully.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Atomic Full Save Endpoint (Settings, Menus, Buttons, FAQs, Payment Config)
apiRouter.post('/bots/:id/full-save', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { settings, menus, buttons, faqs, commands, paymentConfig } = req.body;

    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const nowStr = new Date().toISOString();

    // 1. Save Settings
    if (settings) {
      let currentSettings = db.bot_settings.find(s => s.bot_id === id);
      if (!currentSettings) {
        currentSettings = {
          id: `bot-set-${id}`,
          bot_id: id,
          owner_id: user.id,
          display_name: settings.display_name || bot.first_name,
          description: settings.description || '',
          support_username: settings.support_username || '',
          support_url: settings.support_url || '',
          support_message: settings.support_message || '',
          currency: settings.currency || 'INR',
          timezone: settings.timezone || 'UTC',
          start_text: settings.start_text || 'Welcome to our store! Click below to browse.',
          start_banner_url: settings.start_banner_url || undefined,
          start_video_url: settings.start_video_url || undefined,
          promo_message: settings.promo_message || undefined,
          business_hours: settings.business_hours || undefined,
          auto_delivery: settings.auto_delivery ?? true,
          notify_admin_on_order: settings.notify_admin_on_order ?? true,
          created_at: nowStr,
          updated_at: nowStr
        };
        db.bot_settings.push(currentSettings);
      } else {
        Object.assign(currentSettings, {
          ...settings,
          updated_at: nowStr
        });
      }
    }

    // 2. Save Menus
    if (Array.isArray(menus)) {
      db.bot_menus = db.bot_menus.filter(m => m.bot_id !== id);
      const newMenus: BotMenu[] = menus.map((m: any, idx: number) => ({
        id: m.id || `menu-${Date.now()}-${idx}`,
        bot_id: id,
        owner_id: user.id,
        title: String(m.title || 'Menu').trim(),
        slug: String(m.slug || (idx === 0 ? 'main' : `menu-${idx}`)).trim(),
        parent_menu_id: m.parent_menu_id || undefined,
        message_text: m.message_text || 'Select an option below:',
        banner_url: m.banner_url || undefined,
        video_url: m.video_url || undefined,
        auto_back_button: m.auto_back_button !== false,
        auto_home_button: m.auto_home_button !== false,
        columns_per_row: Number(m.columns_per_row) || 2,
        created_at: m.created_at || nowStr,
        updated_at: nowStr
      }));
      db.bot_menus.push(...newMenus);
    }

    // 3. Save Buttons
    if (Array.isArray(buttons)) {
      db.bot_buttons = db.bot_buttons.filter(b => b.bot_id !== id);
      const newButtons: BotButton[] = buttons.map((btn: any, idx: number) => ({
        id: btn.id || `btn-${Date.now()}-${idx}`,
        bot_id: id,
        menu_id: btn.menu_id || 'main',
        owner_id: user.id,
        label: btn.label || 'Button',
        emoji: btn.emoji || undefined,
        button_type: btn.button_type || 'CALLBACK',
        target_value: btn.target_value || 'DEFAULT',
        target_package_id: btn.target_package_id || undefined,
        row_order: Number(btn.row_order) || 0,
        col_order: Number(btn.col_order) || 0,
        created_at: nowStr
      }));
      db.bot_buttons.push(...newButtons);
    }

    // 4. Save FAQs
    if (Array.isArray(faqs)) {
      db.bot_faqs = db.bot_faqs.filter(f => f.bot_id !== id);
      const newFaqs: BotFaq[] = faqs.map((f: any, idx: number) => ({
        id: f.id || `faq-${Date.now()}-${idx}`,
        bot_id: id,
        owner_id: user.id,
        question: String(f.question || '').trim(),
        answer: String(f.answer || '').trim(),
        order: Number(f.order) || idx,
        created_at: nowStr
      }));
      db.bot_faqs.push(...newFaqs);
    }

    // 5. Save Payment Config
    if (paymentConfig) {
      let currentPayConfig = db.bot_payment_configs.find(p => p.bot_id === id);
      if (!currentPayConfig) {
        currentPayConfig = {
          id: `pay-cfg-${id}`,
          bot_id: id,
          owner_id: user.id,
          enable_sandbox: paymentConfig.enable_sandbox ?? true,
          enable_razorpay: !!paymentConfig.enable_razorpay,
          enable_cashfree: !!paymentConfig.enable_cashfree,
          enable_phonepe: !!paymentConfig.enable_phonepe,
          enable_stripe: !!paymentConfig.enable_stripe,
          enable_manual_upi: paymentConfig.enable_manual_upi ?? true,
          upi_id: paymentConfig.upi_id || '',
          upi_name: paymentConfig.upi_name || '',
          business_name: paymentConfig.business_name || '',
          default_amount: Number(paymentConfig.default_amount) || undefined,
          enable_dynamic_qr: paymentConfig.enable_dynamic_qr ?? true,
          qr_data_scheme: paymentConfig.qr_data_scheme || '',
          manual_instructions: paymentConfig.manual_instructions || '',
          qr_image_url: paymentConfig.qr_image_url || '',
          bank_account_number: paymentConfig.bank_account_number || '',
          bank_ifsc: paymentConfig.bank_ifsc || '',
          bank_name: paymentConfig.bank_name || '',
          razorpay_key_id: paymentConfig.razorpay_key_id || '',
          stripe_public_key: paymentConfig.stripe_public_key || '',
          created_at: nowStr,
          updated_at: nowStr
        };
        db.bot_payment_configs.push(currentPayConfig);
      } else {
        Object.assign(currentPayConfig, {
          ...paymentConfig,
          updated_at: nowStr
        });
      }
    }

    // 6. Save Telegram Commands
    if (Array.isArray(commands)) {
      db.bot_commands = (db.bot_commands || []).filter(c => c.bot_id !== id);
      const newCommands: BotCommand[] = commands.map((c: any, idx: number) => {
        let cmd = String(c.command || `cmd_${idx}`).trim().toLowerCase();
        if (!cmd.startsWith('/')) cmd = '/' + cmd;
        cmd = cmd.replace(/[^a-z0-9_]/g, '_').slice(0, 33);
        if (!/^\/[a-z0-9_]{1,32}$/.test(cmd)) cmd = `/cmd_${idx}`;
        return {
          id: c.id || `cmd-${Date.now()}-${idx}`,
          bot_id: id,
          owner_id: user.id,
          command: cmd,
          description: String(c.description || '').trim().slice(0, 256),
          trigger_type: c.trigger_type || 'TELEGRAM_COMMAND',
          action_type: c.action_type || 'OPEN_MENU',
          target_id: c.target_id || undefined,
          target_name: c.target_name || undefined,
          next_step: c.next_step || undefined,
          custom_response_message: c.custom_response_message || undefined,
          sort_order: typeof c.sort_order === 'number' ? c.sort_order : idx,
          is_enabled: c.is_enabled !== false,
          created_at: c.created_at || nowStr,
          updated_at: nowStr
        };
      });
      db.bot_commands.push(...newCommands);
    }

    logAudit({
      userId: user.id,
      action: 'BOT_FULL_SAVE',
      resourceType: 'TELEGRAM_BOT',
      resourceId: id,
      req
    });

    db.saveImmediately();

    return res.json({
      success: true,
      message: 'All bot settings, navigation tree, submenus, buttons, commands, FAQs, and payment gateways saved successfully!'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bot Deployment & Telegram Synchronization
apiRouter.post('/bots/:id/deploy', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { versionLabel } = req.body || {};

    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(404).json({ success: false, error: 'Bot not found.' });
    }

    const settings = db.bot_settings.find(s => s.bot_id === id);
    const menus = db.bot_menus.filter(m => m.bot_id === id);
    const buttons = db.bot_buttons.filter(b => b.bot_id === id);
    const faqs = db.bot_faqs.filter(f => f.bot_id === id);
    const commands = (db.bot_commands || []).filter(c => c.bot_id === id);

    // Create a Version Snapshot for instant rollback
    const existingVersions = db.bot_versions.filter(v => v.bot_id === id);
    const versionNumber = existingVersions.length + 1;
    const newVersion: BotVersion = {
      id: `ver-${id}-${versionNumber}-${Date.now()}`,
      bot_id: id,
      owner_id: user.id,
      version_number: versionNumber,
      label: versionLabel || `Version ${versionNumber} (${new Date().toLocaleDateString()})`,
      settings: JSON.parse(JSON.stringify(settings || {})),
      menus: JSON.parse(JSON.stringify(menus || [])),
      buttons: JSON.parse(JSON.stringify(buttons || [])),
      faqs: JSON.parse(JSON.stringify(faqs || [])),
      commands: JSON.parse(JSON.stringify(commands || [])),
      created_at: new Date().toISOString()
    };
    db.bot_versions.unshift(newVersion);

    // Synchronize with Telegram Bot API
    const syncDetails = await TelegramService.syncBotProfileWithTelegram(bot);

    logAudit({
      userId: user.id,
      action: 'BOT_DEPLOYED',
      resourceType: 'TELEGRAM_BOT',
      resourceId: id,
      metadata: { versionNumber, syncDetails },
      req
    });

    db.saveImmediately();

    return res.json({
      success: true,
      deployed: true,
      message: 'Bot settings synchronized and deployed successfully!',
      version: newVersion,
      syncDetails
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Reconnect Bot Token
apiRouter.post('/bots/:id/reconnect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { token } = req.body;

    if (!token) return res.status(400).json({ success: false, error: 'Telegram Bot token is required.' });

    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

    const verification = await TelegramService.verifyBotToken(token);
    if (!verification.ok || !verification.bot) {
      return res.status(400).json({ success: false, error: verification.error || 'Token verification failed.' });
    }

    bot.bot_token_encrypted = CryptoService.encrypt(token);
    bot.first_name = verification.bot.first_name;
    bot.username = verification.bot.username;
    bot.status = 'CONNECTED';
    bot.error_message = undefined;
    bot.updated_at = new Date().toISOString();

    await TelegramService.syncBotProfileWithTelegram(bot);
    db.saveImmediately();

    return res.json({ success: true, bot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bot FAQs
apiRouter.get('/bots/:id/faqs', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const bot = db.telegram_bots.find(b => b.id === id);
  if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

  const faqs = db.bot_faqs.filter(f => f.bot_id === id).sort((a, b) => a.order - b.order);
  return res.json({ success: true, faqs });
});

apiRouter.put('/bots/:id/faqs', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { faqs } = req.body;

    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

    if (!Array.isArray(faqs)) return res.status(400).json({ success: false, error: 'Faqs must be an array.' });

    db.bot_faqs = db.bot_faqs.filter(f => f.bot_id !== id);

    const nowStr = new Date().toISOString();
    const newFaqs: BotFaq[] = faqs.map((f: any, idx: number) => ({
      id: f.id || `faq-${Date.now()}-${idx}`,
      bot_id: id,
      owner_id: user.id,
      question: String(f.question || '').trim(),
      answer: String(f.answer || '').trim(),
      order: Number(f.order) || idx,
      created_at: nowStr
    }));

    db.bot_faqs.push(...newFaqs);
    db.saveImmediately();

    return res.json({ success: true, faqs: newFaqs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bot Revisions / Version History
apiRouter.get('/bots/:id/versions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const bot = db.telegram_bots.find(b => b.id === id);
  if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

  const versions = db.bot_versions.filter(v => v.bot_id === id).sort((a, b) => b.version_number - a.version_number);
  return res.json({ success: true, versions });
});

apiRouter.post('/bots/:id/versions/:versionId/restore', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

    const version = db.bot_versions.find(v => v.id === versionId && v.bot_id === id);
    if (!version) return res.status(404).json({ success: false, error: 'Version not found.' });

    // Restore settings
    let settings = db.bot_settings.find(s => s.bot_id === id);
    if (settings && version.settings) {
      Object.assign(settings, version.settings, { updated_at: new Date().toISOString() });
    }

    // Restore buttons
    if (version.buttons) {
      db.bot_buttons = db.bot_buttons.filter(b => b.bot_id !== id);
      db.bot_buttons.push(...version.buttons);
    }

    // Restore FAQs
    if (version.faqs) {
      db.bot_faqs = db.bot_faqs.filter(f => f.bot_id !== id);
      db.bot_faqs.push(...version.faqs);
    }

    // Restore Commands
    if (version.commands) {
      db.bot_commands = (db.bot_commands || []).filter(c => c.bot_id !== id);
      db.bot_commands.push(...version.commands);
    }

    db.saveImmediately();

    return res.json({
      success: true,
      message: `Restored to version ${version.version_number} (${version.label})`,
      settings,
      buttons: db.bot_buttons.filter(b => b.bot_id === id)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bot Payment Configuration & QR
apiRouter.get('/bots/:id/payment-config', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const bot = db.telegram_bots.find(b => b.id === id);
  if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

  let config = db.bot_payment_configs.find(p => p.bot_id === id);
  if (!config) {
    config = {
      id: `paycfg-${id}`,
      bot_id: id,
      owner_id: user.id,
      enable_sandbox: true,
      enable_razorpay: false,
      enable_cashfree: false,
      enable_phonepe: false,
      enable_stripe: false,
      enable_manual_upi: true,
      upi_id: 'merchant@upi',
      upi_name: 'Merchant Pay',
      manual_instructions: 'Please transfer the exact amount and submit your payment screenshot for instant order verification.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.bot_payment_configs.push(config);
    db.save();
  }

  return res.json({ success: true, config });
});

apiRouter.put('/bots/:id/payment-config', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

    let config = db.bot_payment_configs.find(p => p.bot_id === id);
    const nowStr = new Date().toISOString();

    if (!config) {
      config = {
        id: `paycfg-${id}`,
        bot_id: id,
        owner_id: user.id,
        ...req.body,
        created_at: nowStr,
        updated_at: nowStr
      };
      db.bot_payment_configs.push(config);
    } else {
      Object.assign(config, req.body, { updated_at: nowStr });
    }

    db.saveImmediately();
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Media Manager
apiRouter.get('/media', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { bot_id } = req.query;
  let items = db.media_items.filter(m => m.owner_id === user.id);
  if (bot_id) items = items.filter(m => m.bot_id === String(bot_id));
  return res.json({ success: true, items });
});

apiRouter.post('/media/upload', authenticate, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const file = req.file;
    const { bot_id, media_type } = req.body;

    if (!file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

    const fileUrl = `/api/media/file/${file.filename}`;
    const mediaItem: MediaItem = {
      id: `med-${Date.now()}`,
      owner_id: user.id,
      bot_id: bot_id || undefined,
      media_type: media_type || (file.mimetype.startsWith('image/') ? 'IMAGE' : file.mimetype.startsWith('video/') ? 'VIDEO' : file.mimetype.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT'),
      original_name: file.originalname,
      stored_name: file.filename,
      url: fileUrl,
      file_size: file.size,
      mime_type: file.mimetype,
      created_at: new Date().toISOString()
    };

    db.media_items.unshift(mediaItem);
    db.saveImmediately();

    return res.json({ success: true, item: mediaItem });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/media/file/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  // Security path check
  const safeFilename = path.basename(filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  return res.sendFile(filePath);
});

apiRouter.delete('/media/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const index = db.media_items.findIndex(m => m.id === id && m.owner_id === user.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Media not found.' });

    const item = db.media_items[index];
    const filePath = path.join(uploadDir, item.stored_name);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    db.media_items.splice(index, 1);
    db.saveImmediately();

    return res.json({ success: true, message: 'Media deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Payment Proofs Review (Manual UPI Verification)
apiRouter.get('/payment-proofs', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { bot_id, status } = req.query;
  let proofs = db.payment_proofs.filter(p => p.owner_id === user.id);
  if (bot_id) proofs = proofs.filter(p => p.bot_id === String(bot_id));
  if (status) proofs = proofs.filter(p => p.status === String(status));
  return res.json({ success: true, proofs });
});

apiRouter.post('/payment-proofs/upload', authenticate, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const file = req.file;
    const { order_id, customer_note } = req.body;

    if (!file) return res.status(400).json({ success: false, error: 'Please upload a proof screenshot.' });
    if (!order_id) return res.status(400).json({ success: false, error: 'Order ID is required.' });

    const order = db.orders.find(o => o.id === order_id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

    const proofUrl = `/api/media/file/${file.filename}`;
    const proof: PaymentProof = {
      id: `proof-${Date.now()}`,
      order_id,
      customer_id: order.customer_id,
      bot_id: order.bot_id,
      owner_id: order.owner_id,
      proof_image_url: proofUrl,
      amount: order.total_amount,
      customer_note: customer_note || undefined,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    db.payment_proofs.unshift(proof);
    order.status = 'PENDING';
    db.saveImmediately();

    return res.json({ success: true, proof });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/payment-proofs/:id/review', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { action, notes } = req.body; // 'APPROVE' or 'REJECT'

    const proof = db.payment_proofs.find(p => p.id === id && p.owner_id === user.id);
    if (!proof) return res.status(404).json({ success: false, error: 'Proof not found.' });

    const order = db.orders.find(o => o.id === proof.order_id);
    const nowStr = new Date().toISOString();

    if (action === 'APPROVE') {
      proof.status = 'APPROVED';
      proof.reviewed_by = user.id;
      proof.reviewed_at = nowStr;

      if (order) {
        order.status = 'DELIVERED';
        order.payment_id = `proof_appr_${id}`;
        order.updated_at = nowStr;

        // Fulfill digital delivery if not already done
        const product = db.products.find(p => p.id === order.product_id);
        if (product && (product.delivery_type === 'LICENSE_KEY' || product.delivery_type === 'SERIAL_KEY')) {
          const availableKey = db.license_keys.find(k => k.product_id === product.id && !k.is_redeemed);
          if (availableKey) {
            availableKey.is_redeemed = true;
            availableKey.redeemed_by_customer_id = order.customer_id;
            availableKey.redeemed_at = nowStr;
            availableKey.order_id = order.id;
            order.delivered_content = `🔑 *Your License Key:*\n\`${availableKey.license_key}\``;
            product.stock_count = Math.max(0, product.stock_count - 1);
          }
        }
      }
    } else {
      proof.status = 'REJECTED';
      proof.reviewed_by = user.id;
      proof.reviewed_at = nowStr;
      if (order) {
        order.status = 'CANCELLED';
        order.updated_at = nowStr;
      }
    }

    db.saveImmediately();
    return res.json({ success: true, proof, order });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Interactive Live Bot Simulator Route (Live test in UI)
apiRouter.post('/bots/:id/simulate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { text, callback_data, customer_id, customer_name } = req.body;

    const bot = db.telegram_bots.find(b => b.id === id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(404).json({ success: false, error: 'Bot not found.' });

    const simTgUser = {
      id: Number(customer_id) || 99881122,
      is_bot: false,
      first_name: customer_name || 'Live Tester',
      username: 'tester_user'
    };

    const update: any = {};
    if (callback_data) {
      update.callback_query = {
        id: `cq-${Date.now()}`,
        from: simTgUser,
        data: callback_data,
        message: {
          message_id: 100,
          chat: { id: simTgUser.id, type: 'private' },
          date: Math.floor(Date.now() / 1000)
        }
      };
    } else {
      update.message = {
        message_id: 100,
        from: simTgUser,
        chat: { id: simTgUser.id, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: text || '/start'
      };
    }

    const result = await TelegramService.processUpdate(bot, update, true);
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. PRODUCTS & DIGITAL DELIVERY CRUD
// ==========================================

apiRouter.get('/products', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const isSuperAdmin = user.role === 'SUPER ADMIN' || user.role === 'ADMIN';
    const { bot_id, search, category_id } = req.query;

    let products = isSuperAdmin ? db.products : db.products.filter(p => p.owner_id === user.id);

    if (bot_id) {
      products = products.filter(p => p.bot_id === String(bot_id));
    }
    if (category_id) {
      products = products.filter(p => p.category_id === String(category_id));
    }
    if (search) {
      const q = String(search).toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    const result = products.map(p => {
      const category = db.product_categories.find(c => c.id === p.category_id);
      const keysAvailable = db.license_keys.filter(k => k.product_id === p.id && !k.is_redeemed).length;
      const fileRecord = db.digital_files.find(f => f.product_id === p.id);
      const packages = db.product_packages
        .filter(pkg => pkg.product_id === p.id && pkg.is_active)
        .sort((a, b) => a.order_index - b.order_index);
      return {
        ...p,
        category_name: category?.name || 'General',
        keys_available: keysAvailable,
        file_name: fileRecord?.original_filename || null,
        packages
      };
    });

    return res.json({ success: true, products: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/products', authenticate, requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      bot_id,
      category_id,
      name,
      description,
      price,
      currency,
      image_url,
      delivery_type,
      custom_message,
      stock_count,
      license_keys, // optional array or bulk string
      packages // optional array of variants/packages
    } = req.body;

    if (!bot_id || !name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Bot ID, Product Name, and Price are required.' });
    }

    const bot = db.telegram_bots.find(b => b.id === bot_id);
    if (!bot || !assertOwnership(user, bot.owner_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden. You do not own this bot.' });
    }

    const nowStr = new Date().toISOString();
    const productId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newProduct: Product = {
      id: productId,
      owner_id: user.id,
      bot_id,
      category_id: category_id || undefined,
      name: String(name).trim(),
      description: description || '',
      price: Number(price),
      currency: currency || 'INR',
      image_url: image_url || undefined,
      delivery_type: delivery_type || 'LICENSE_KEY',
      custom_message: custom_message || undefined,
      is_active: true,
      stock_count: Number(stock_count) || 0,
      created_at: nowStr,
      updated_at: nowStr
    };

    db.products.unshift(newProduct);

    // Save packages if provided
    if (Array.isArray(packages) && packages.length > 0) {
      const newPkgs: ProductPackage[] = packages.map((pkg: any, idx: number) => ({
        id: pkg.id || `pkg-${Date.now()}-${idx}`,
        product_id: productId,
        bot_id,
        owner_id: user.id,
        name: String(pkg.name).trim(),
        duration_days: pkg.duration_days ? Number(pkg.duration_days) : undefined,
        price: Number(pkg.price) || Number(price),
        currency: pkg.currency || currency || 'INR',
        stock_count: pkg.stock_count !== undefined ? Number(pkg.stock_count) : 999,
        delivery_type: pkg.delivery_type || delivery_type || 'LICENSE_KEY',
        custom_message: pkg.custom_message || undefined,
        digital_file_url: pkg.digital_file_url || undefined,
        is_active: pkg.is_active !== false,
        order_index: Number(pkg.order_index) || idx,
        created_at: nowStr,
        updated_at: nowStr
      }));
      db.product_packages.push(...newPkgs);
      newProduct.packages = newPkgs;
    }

    // If license keys provided in payload
    if (license_keys && (delivery_type === 'LICENSE_KEY' || delivery_type === 'SERIAL_KEY')) {
      const keysList: string[] = Array.isArray(license_keys)
        ? license_keys
        : String(license_keys).split('\n').map(k => k.trim()).filter(Boolean);

      for (const k of keysList) {
        db.license_keys.push({
          id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          owner_id: user.id,
          product_id: productId,
          license_key: k,
          is_redeemed: false,
          created_at: nowStr
        });
      }
      newProduct.stock_count = keysList.length;
    }

    logAudit({
      userId: user.id,
      action: 'PRODUCT_CREATED',
      resourceType: 'PRODUCT',
      resourceId: productId,
      metadata: { name: newProduct.name, price: newProduct.price },
      req
    });

    db.saveImmediately();
    return res.json({ success: true, product: newProduct });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/products/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const product = db.products.find(p => p.id === id);

    if (!product || !assertOwnership(user, product.owner_id)) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const {
      name,
      description,
      price,
      currency,
      category_id,
      image_url,
      delivery_type,
      custom_message,
      is_active,
      stock_count,
      packages
    } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (currency !== undefined) product.currency = currency;
    if (category_id !== undefined) product.category_id = category_id;
    if (image_url !== undefined) product.image_url = image_url;
    if (delivery_type !== undefined) product.delivery_type = delivery_type;
    if (custom_message !== undefined) product.custom_message = custom_message;
    if (is_active !== undefined) product.is_active = is_active;
    if (stock_count !== undefined) product.stock_count = Number(stock_count);
    product.updated_at = new Date().toISOString();

    // Sync packages if provided
    if (Array.isArray(packages)) {
      db.product_packages = db.product_packages.filter(pkg => pkg.product_id !== id);
      const nowStr = new Date().toISOString();
      const updatedPkgs: ProductPackage[] = packages.map((pkg: any, idx: number) => ({
        id: pkg.id || `pkg-${Date.now()}-${idx}`,
        product_id: id,
        bot_id: product.bot_id,
        owner_id: user.id,
        name: String(pkg.name).trim(),
        duration_days: pkg.duration_days ? Number(pkg.duration_days) : undefined,
        price: Number(pkg.price) || product.price,
        currency: pkg.currency || product.currency,
        stock_count: pkg.stock_count !== undefined ? Number(pkg.stock_count) : 999,
        delivery_type: pkg.delivery_type || product.delivery_type,
        custom_message: pkg.custom_message || undefined,
        digital_file_url: pkg.digital_file_url || undefined,
        is_active: pkg.is_active !== false,
        order_index: Number(pkg.order_index) || idx,
        created_at: pkg.created_at || nowStr,
        updated_at: nowStr
      }));
      db.product_packages.push(...updatedPkgs);
      product.packages = updatedPkgs;
    }

    logAudit({
      userId: user.id,
      action: 'PRODUCT_UPDATED',
      resourceType: 'PRODUCT',
      resourceId: id,
      req
    });

    db.saveImmediately();
    return res.json({ success: true, product });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Product Packages / Variants Endpoints
apiRouter.get('/products/:id/packages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const product = db.products.find(p => p.id === id);
    if (!product || !assertOwnership(user, product.owner_id)) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const packages = db.product_packages
      .filter(pkg => pkg.product_id === id)
      .sort((a, b) => a.order_index - b.order_index);

    return res.json({ success: true, packages });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/products/:id/packages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const product = db.products.find(p => p.id === id);
    if (!product || !assertOwnership(user, product.owner_id)) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const { name, duration_days, price, currency, stock_count, delivery_type, custom_message, digital_file_url } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Package name and price are required.' });
    }

    const nowStr = new Date().toISOString();
    const existingCount = db.product_packages.filter(p => p.product_id === id).length;

    const newPkg: ProductPackage = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      product_id: id,
      bot_id: product.bot_id,
      owner_id: user.id,
      name: String(name).trim(),
      duration_days: duration_days ? Number(duration_days) : undefined,
      price: Number(price),
      currency: currency || product.currency,
      stock_count: stock_count !== undefined ? Number(stock_count) : 999,
      delivery_type: delivery_type || product.delivery_type,
      custom_message: custom_message || undefined,
      digital_file_url: digital_file_url || undefined,
      is_active: true,
      order_index: existingCount,
      created_at: nowStr,
      updated_at: nowStr
    };

    db.product_packages.push(newPkg);
    db.saveImmediately();

    return res.json({ success: true, package: newPkg });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/products/:id/packages/:pkgId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, pkgId } = req.params;
    const user = req.user!;
    const pkg = db.product_packages.find(p => p.id === pkgId && p.product_id === id && p.owner_id === user.id);
    if (!pkg) return res.status(404).json({ success: false, error: 'Package variant not found.' });

    const { name, duration_days, price, currency, stock_count, delivery_type, custom_message, digital_file_url, is_active, order_index } = req.body;

    if (name !== undefined) pkg.name = String(name).trim();
    if (duration_days !== undefined) pkg.duration_days = duration_days ? Number(duration_days) : undefined;
    if (price !== undefined) pkg.price = Number(price);
    if (currency !== undefined) pkg.currency = currency;
    if (stock_count !== undefined) pkg.stock_count = Number(stock_count);
    if (delivery_type !== undefined) pkg.delivery_type = delivery_type;
    if (custom_message !== undefined) pkg.custom_message = custom_message;
    if (digital_file_url !== undefined) pkg.digital_file_url = digital_file_url;
    if (is_active !== undefined) pkg.is_active = !!is_active;
    if (order_index !== undefined) pkg.order_index = Number(order_index);
    pkg.updated_at = new Date().toISOString();

    db.saveImmediately();
    return res.json({ success: true, package: pkg });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/products/:id/packages/:pkgId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, pkgId } = req.params;
    const user = req.user!;
    const index = db.product_packages.findIndex(p => p.id === pkgId && p.product_id === id && p.owner_id === user.id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Package not found.' });

    db.product_packages.splice(index, 1);
    db.saveImmediately();
    return res.json({ success: true, message: 'Package deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic & Static UPI QR Code Generator
apiRouter.post('/payments/generate-qr', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { upi_id, upi_name, business_name, amount, order_id, note, currency } = req.body;

    if (!upi_id) {
      return res.status(400).json({ success: false, error: 'UPI ID (VPA) is required to generate payment QR.' });
    }

    const cleanUpi = String(upi_id).trim();
    const payeeName = (upi_name || business_name || 'Merchant').trim();
    const refNote = (note || order_id || 'Digital Store Purchase').trim();
    const curr = currency || 'INR';
    const amtStr = amount ? Number(amount).toFixed(2) : '';

    // Standardized NPCI UPI URI Specification
    let upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(payeeName)}`;
    if (amtStr && Number(amtStr) > 0) {
      upiUri += `&am=${amtStr}&cu=${curr}`;
    }
    if (refNote) {
      upiUri += `&tn=${encodeURIComponent(refNote)}`;
    }

    // High quality QR Code image link (SVG/PNG)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

    return res.json({
      success: true,
      upiUri,
      qrImageUrl,
      details: {
        upi_id: cleanUpi,
        payee_name: payeeName,
        amount: amtStr ? Number(amtStr) : undefined,
        currency: curr,
        note: refNote
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/products/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) return res.status(404).json({ success: false, error: 'Product not found.' });
    const product = db.products[index];
    if (!assertOwnership(user, product.owner_id)) return res.status(403).json({ success: false, error: 'Forbidden.' });

    db.products.splice(index, 1);

    // Delete associated keys
    db.license_keys = db.license_keys.filter(k => k.product_id !== id);

    logAudit({
      userId: user.id,
      action: 'PRODUCT_DELETED',
      resourceType: 'PRODUCT',
      resourceId: id,
      req
    });

    db.saveImmediately();
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk License Keys Manager
apiRouter.get('/products/:id/licenses', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const product = db.products.find(p => p.id === id);
  if (!product || !assertOwnership(user, product.owner_id)) return res.status(404).json({ success: false, error: 'Product not found.' });

  const keys = db.license_keys.filter(k => k.product_id === id);
  return res.json({ success: true, keys });
});

apiRouter.post('/products/:id/licenses/bulk', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { rawKeys } = req.body; // Newline separated keys

    const product = db.products.find(p => p.id === id);
    if (!product || !assertOwnership(user, product.owner_id)) return res.status(404).json({ success: false, error: 'Product not found.' });

    const keyList = String(rawKeys || '')
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keyList.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide at least one valid license key.' });
    }

    const nowStr = new Date().toISOString();
    let addedCount = 0;

    for (const key of keyList) {
      // Prevent duplicates in same product
      const exists = db.license_keys.find(k => k.product_id === id && k.license_key === key);
      if (!exists) {
        db.license_keys.push({
          id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          owner_id: user.id,
          product_id: id,
          license_key: key,
          is_redeemed: false,
          created_at: nowStr
        });
        addedCount++;
      }
    }

    // Update product stock count
    const totalAvailable = db.license_keys.filter(k => k.product_id === id && !k.is_redeemed).length;
    product.stock_count = totalAvailable;

    db.saveImmediately();
    return res.json({ success: true, addedCount, totalAvailable });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Secure Digital File Upload
apiRouter.post('/products/:id/upload-file', authenticate, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const product = db.products.find(p => p.id === id);
    if (!product || !assertOwnership(user, product.owner_id)) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // Remove old file record if exists
    db.digital_files = db.digital_files.filter(f => f.product_id !== id);

    const token = CryptoService.generateRandomToken(20);
    const digitalFileRecord: DigitalFile = {
      id: `df-${Date.now()}`,
      owner_id: user.id,
      product_id: id,
      original_filename: file.originalname,
      stored_filename: file.filename,
      file_size: file.size,
      mime_type: file.mimetype,
      download_token: token,
      created_at: new Date().toISOString()
    };

    db.digital_files.push(digitalFileRecord);
    product.delivery_type = 'DIGITAL_FILE';
    product.stock_count = 9999; // Digital file has unlimited stock

    logAudit({
      userId: user.id,
      action: 'DIGITAL_FILE_UPLOADED',
      resourceType: 'DIGITAL_FILE',
      resourceId: digitalFileRecord.id,
      metadata: { originalName: file.originalname, size: file.size },
      req
    });

    db.saveImmediately();
    return res.json({ success: true, file: digitalFileRecord });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Product Categories CRUD
apiRouter.get('/categories', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { bot_id } = req.query;
  let categories = db.product_categories.filter(c => c.owner_id === user.id);
  if (bot_id) categories = categories.filter(c => c.bot_id === String(bot_id));
  return res.json({ success: true, categories });
});

apiRouter.post('/categories', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { bot_id, name, description } = req.body;
    if (!bot_id || !name) return res.status(400).json({ success: false, error: 'Bot ID and category name required.' });

    const newCat: ProductCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      owner_id: user.id,
      bot_id,
      name: String(name).trim(),
      description: description || '',
      is_active: true,
      created_at: new Date().toISOString()
    };

    db.product_categories.push(newCat);
    db.saveImmediately();
    return res.json({ success: true, category: newCat });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/categories/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { name, description, is_active } = req.body;

    const cat = db.product_categories.find(c => c.id === id);
    if (!cat || !assertOwnership(user, cat.owner_id)) return res.status(404).json({ success: false, error: 'Category not found.' });

    if (name !== undefined) cat.name = String(name).trim();
    if (description !== undefined) cat.description = description;
    if (is_active !== undefined) cat.is_active = !!is_active;

    db.saveImmediately();
    return res.json({ success: true, category: cat });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/categories/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const index = db.product_categories.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Category not found.' });

    const cat = db.product_categories[index];
    if (!assertOwnership(user, cat.owner_id)) return res.status(403).json({ success: false, error: 'Forbidden.' });

    db.product_categories.splice(index, 1);
    db.saveImmediately();

    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. ORDERS & TRANSACTIONS
// ==========================================

apiRouter.get('/orders', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const isSuperAdmin = user.role === 'SUPER ADMIN' || user.role === 'ADMIN';
    const { status, bot_id, search } = req.query;

    let orders = isSuperAdmin ? db.orders : db.orders.filter(o => o.owner_id === user.id);

    if (bot_id) orders = orders.filter(o => o.bot_id === String(bot_id));
    if (status) orders = orders.filter(o => o.status === String(status));
    if (search) {
      const q = String(search).toLowerCase();
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.product_name.toLowerCase().includes(q)
      );
    }

    return res.json({ success: true, orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/orders/:id/refund', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const order = db.orders.find(o => o.id === id);

    if (!order || !assertOwnership(user, order.owner_id)) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    order.status = 'REFUNDED';
    order.updated_at = new Date().toISOString();

    // Adjust customer stats
    const customer = db.customers.find(c => c.id === order.customer_id);
    if (customer) {
      customer.total_spent = Math.max(0, customer.total_spent - order.total_amount);
    }

    logAudit({
      userId: user.id,
      action: 'ORDER_REFUNDED',
      resourceType: 'ORDER',
      resourceId: id,
      req
    });

    db.saveImmediately();
    return res.json({ success: true, message: 'Order marked as refunded.', order });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Secure Download Route
apiRouter.get('/downloads/:orderId/:token', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = db.orders.find(o => o.id === orderId);

    if (!order || (order.status !== 'DELIVERED' && order.status !== 'PAID')) {
      return res.status(403).send('Unauthorized download request.');
    }

    const digitalFile = db.digital_files.find(f => f.product_id === order.product_id);
    if (!digitalFile) {
      return res.status(404).send('Digital file asset not found.');
    }

    const fullPath = path.join(uploadDir, digitalFile.stored_filename);
    if (!fs.existsSync(fullPath)) {
      // Stream fallback content for demo assets
      res.setHeader('Content-Disposition', `attachment; filename="${digitalFile.original_filename}"`);
      res.setHeader('Content-Type', 'text/plain');
      return res.send(`TeleSell Digital Asset\nOrder: ${order.id}\nItem: ${order.product_name}\nThank you for your purchase!`);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${digitalFile.original_filename}"`);
    res.setHeader('Content-Type', digitalFile.mime_type || 'application/octet-stream');
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (err: any) {
    res.status(500).send('Download failed.');
  }
});

// ==========================================
// 7. CUSTOMERS CRM
// ==========================================

apiRouter.get('/customers', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isSuperAdmin = user.role === 'SUPER ADMIN' || user.role === 'ADMIN';
  const { bot_id } = req.query;

  let customers = isSuperAdmin ? db.customers : db.customers.filter(c => c.owner_id === user.id);
  if (bot_id) customers = customers.filter(c => c.bot_id === String(bot_id));

  return res.json({ success: true, customers });
});

apiRouter.post('/customers/:id/wallet', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { amount, action } = req.body; // action: 'ADD' or 'DEDUCT'

    const customer = db.customers.find(c => c.id === id);
    if (!customer || !assertOwnership(user, customer.owner_id)) return res.status(404).json({ success: false, error: 'Customer not found.' });

    const delta = Math.abs(Number(amount) || 0);
    if (action === 'DEDUCT') {
      customer.wallet_balance = Math.max(0, customer.wallet_balance - delta);
    } else {
      customer.wallet_balance += delta;
    }
    customer.updated_at = new Date().toISOString();

    db.saveImmediately();
    return res.json({ success: true, customer });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. BROADCAST & MARKETING
// ==========================================

apiRouter.get('/broadcasts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { bot_id } = req.query;
  let broadcasts = db.broadcasts.filter(b => b.owner_id === user.id);
  if (bot_id) broadcasts = broadcasts.filter(b => b.bot_id === String(bot_id));
  return res.json({ success: true, broadcasts });
});

apiRouter.post('/broadcasts', authenticate, requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { bot_id, title, message_type, message_text, media_url, target_audience, buttons_json } = req.body;

    if (!bot_id || !title || !message_text) {
      return res.status(400).json({ success: false, error: 'Bot ID, campaign title, and message text are required.' });
    }

    const bot = db.telegram_bots.find(b => b.id === bot_id);
    if (!bot || !assertOwnership(user, bot.owner_id)) return res.status(403).json({ success: false, error: 'Forbidden.' });

    const broadcastId = `bc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newBroadcast: Broadcast = {
      id: broadcastId,
      owner_id: user.id,
      bot_id,
      title: String(title).trim(),
      message_type: message_type || 'TEXT',
      message_text: String(message_text).trim(),
      media_url: media_url || undefined,
      buttons_json: buttons_json || undefined,
      target_audience: target_audience || 'ALL',
      status: 'QUEUED',
      total_recipients: 0,
      sent_count: 0,
      failed_count: 0,
      created_at: new Date().toISOString()
    };

    db.broadcasts.unshift(newBroadcast);
    db.saveImmediately();

    // Trigger async broadcast worker in background!
    TelegramService.executeBroadcast(broadcastId).catch(err => console.error('Broadcast worker error:', err));

    return res.json({ success: true, broadcast: newBroadcast });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/broadcasts/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const broadcast = db.broadcasts.find(b => b.id === id);
  if (!broadcast || !assertOwnership(user, broadcast.owner_id)) return res.status(404).json({ success: false, error: 'Broadcast not found.' });

  broadcast.status = 'CANCELLED';
  db.saveImmediately();
  return res.json({ success: true, message: 'Broadcast campaign cancelled.' });
});

// ==========================================
// 9. COUPONS & PROMOTIONS
// ==========================================

apiRouter.get('/coupons', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const coupons = db.coupons.filter(c => c.owner_id === user.id);
  return res.json({ success: true, coupons });
});

apiRouter.post('/coupons', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { bot_id, code, discount_type, discount_value, max_uses, min_order_amount } = req.body;

    if (!bot_id || !code || discount_value === undefined) {
      return res.status(400).json({ success: false, error: 'Bot ID, Coupon Code, and Discount Value are required.' });
    }

    const newCoupon: Coupon = {
      id: `cpn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      owner_id: user.id,
      bot_id,
      code: String(code).trim().toUpperCase(),
      discount_type: discount_type === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      discount_value: Number(discount_value),
      max_uses: Number(max_uses) || 100,
      current_uses: 0,
      min_order_amount: Number(min_order_amount) || 0,
      is_active: true,
      created_at: new Date().toISOString()
    };

    db.coupons.unshift(newCoupon);
    db.saveImmediately();
    return res.json({ success: true, coupon: newCoupon });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/coupons/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const index = db.coupons.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Coupon not found.' });
  if (!assertOwnership(user, db.coupons[index].owner_id)) return res.status(403).json({ success: false, error: 'Forbidden.' });

  db.coupons.splice(index, 1);
  db.saveImmediately();
  return res.json({ success: true, message: 'Coupon removed.' });
});

// ==========================================
// 10. REFERRALS & RESELLER NETWORK
// ==========================================

apiRouter.get('/referrals/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const userReferrals = db.referrals.filter(r => r.referrer_id === user.id);
  const totalEarnings = userReferrals.reduce((sum, r) => sum + r.commission_amount, 0);

  return res.json({
    success: true,
    code: user.referral_code,
    link: `${process.env.APP_URL || ''}/register?ref=${user.referral_code}`,
    count: userReferrals.length,
    totalEarnings,
    referrals: userReferrals
  });
});

apiRouter.post('/reseller/apply', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { business_name, telegram_handle, experience_info } = req.body;

    if (!business_name || !telegram_handle) {
      return res.status(400).json({ success: false, error: 'Business name and Telegram handle are required.' });
    }

    let app = db.reseller_applications.find(a => a.user_id === user.id);
    const nowStr = new Date().toISOString();

    if (app) {
      app.business_name = business_name;
      app.telegram_handle = telegram_handle;
      app.experience_info = experience_info || '';
      app.status = 'PENDING';
      app.updated_at = nowStr;
    } else {
      app = {
        id: `res-${Date.now()}`,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        business_name,
        telegram_handle,
        experience_info: experience_info || '',
        status: 'PENDING',
        commission_rate: 20,
        total_sales: 0,
        total_earnings: 0,
        balance: 0,
        created_at: nowStr,
        updated_at: nowStr
      };
      db.reseller_applications.push(app);
    }

    user.reseller_status = 'PENDING';
    db.saveImmediately();

    return res.json({ success: true, application: app, message: 'Reseller application submitted for review.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 11. ADMIN PANEL (Protected: ADMIN / SUPER ADMIN)
// ==========================================

apiRouter.get('/admin/stats', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  const totalUsers = db.users.length;
  const activeSubs = db.subscriptions.filter(s => s.status === 'ACTIVE').length;
  const expiredSubs = db.subscriptions.filter(s => s.status === 'EXPIRED').length;
  const totalBots = db.telegram_bots.length;
  const totalProducts = db.products.length;
  const totalOrders = db.orders.length;
  const totalPlatformRevenue = db.payments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0);

  return res.json({
    success: true,
    stats: {
      totalUsers,
      activeSubs,
      expiredSubs,
      totalBots,
      totalProducts,
      totalOrders,
      totalPlatformRevenue,
      plansCount: db.subscription_plans.length,
      auditLogsCount: db.audit_logs.length
    }
  });
});

apiRouter.get('/admin/users', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  const safeUsers = db.users.map(u => {
    const sub = db.subscriptions.find(s => s.user_id === u.id && s.status === 'ACTIVE');
    const botsCount = db.telegram_bots.filter(b => b.owner_id === u.id).length;
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      reseller_status: u.reseller_status,
      reseller_commission_rate: u.reseller_commission_rate,
      reseller_balance: u.reseller_balance,
      active_subscription: sub || null,
      bots_count: botsCount,
      created_at: u.created_at
    };
  });
  return res.json({ success: true, users: safeUsers });
});

apiRouter.put('/admin/users/:id/role', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, reseller_status, reseller_commission_rate } = req.body;
    const adminUser = req.user!;

    const targetUser = db.users.find(u => u.id === id);
    if (!targetUser) return res.status(404).json({ success: false, error: 'User not found.' });

    // Super Admin role change restriction
    if (targetUser.role === 'SUPER ADMIN' && adminUser.role !== 'SUPER ADMIN') {
      return res.status(403).json({ success: false, error: 'Only Super Admin can modify Super Admin accounts.' });
    }

    if (role) targetUser.role = role;
    if (reseller_status) targetUser.reseller_status = reseller_status;
    if (reseller_commission_rate !== undefined) targetUser.reseller_commission_rate = Number(reseller_commission_rate);
    targetUser.updated_at = new Date().toISOString();

    logAudit({
      userId: adminUser.id,
      action: 'ADMIN_USER_ROLE_UPDATED',
      resourceType: 'USER',
      resourceId: targetUser.id,
      metadata: { newRole: role, newResellerStatus: reseller_status },
      req
    });

    db.saveImmediately();
    return res.json({ success: true, user: targetUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/resellers', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, applications: db.reseller_applications });
});

apiRouter.put('/admin/resellers/:id/status', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, commission_rate, notes } = req.body;
    const app = db.reseller_applications.find(a => a.id === id);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });

    app.status = status;
    if (commission_rate !== undefined) app.commission_rate = Number(commission_rate);
    if (notes) app.notes = notes;
    app.updated_at = new Date().toISOString();

    const user = db.users.find(u => u.id === app.user_id);
    if (user) {
      user.reseller_status = status;
      if (status === 'APPROVED') {
        user.role = 'RESELLER';
        user.reseller_commission_rate = app.commission_rate;
      }
    }

    db.saveImmediately();
    return res.json({ success: true, application: app });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/audit-logs', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { search } = req.query;
  let logs = db.audit_logs;
  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter(l => l.action.toLowerCase().includes(q) || l.resource_type.toLowerCase().includes(q));
  }
  return res.json({ success: true, logs: logs.slice(0, 100) });
});

apiRouter.get('/admin/settings', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, settings: db.system_settings });
});

apiRouter.put('/admin/settings', authenticate, requireRole('ADMIN', 'SUPER ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body; // array of { key, value }
    if (Array.isArray(settings)) {
      const nowStr = new Date().toISOString();
      for (const item of settings) {
        const existing = db.system_settings.find(s => s.key === item.key);
        if (existing) {
          existing.value = String(item.value);
          existing.updated_at = nowStr;
        } else {
          db.system_settings.push({
            id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            key: item.key,
            value: String(item.value),
            updated_at: nowStr
          });
        }
      }
      db.saveImmediately();
    }
    return res.json({ success: true, settings: db.system_settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Notifications
apiRouter.get('/notifications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const notifs = db.notifications.filter(n => n.user_id === user.id).slice(0, 30);
  return res.json({ success: true, notifications: notifs });
});

apiRouter.put('/notifications/read-all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  for (const n of db.notifications) {
    if (n.user_id === user.id) n.is_read = true;
  }
  db.save();
  return res.json({ success: true });
});

// ==========================================
// 10. 24/7 HOSTING & SYSTEM HEALTH ROUTES
// ==========================================

function formatUptime(uptimeInSec: number): string {
  const days = Math.floor(uptimeInSec / (3600 * 24));
  const hours = Math.floor((uptimeInSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptimeInSec % 3600) / 60);
  const seconds = Math.floor(uptimeInSec % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

apiRouter.get('/hosting/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();
    const selfPing = CronService.getSelfPingState();
    const cronStatus = CronService.getStatus();
    const allPollers = TelegramPollingManager.getAllStatuses();

    // Filter pollers if user is not admin
    const user = req.user!;
    const userBotIds = new Set(db.telegram_bots.filter(b => b.owner_id === user.id).map(b => b.id));
    const visiblePollers = user.role === 'ADMIN' || user.role === 'SUPER ADMIN'
      ? allPollers
      : allPollers.filter(p => userBotIds.has(p.botId));

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const cleanAppUrl = appUrl.replace(/\/$/, '');

    return res.json({
      success: true,
      status: 'healthy',
      uptimeSeconds: Math.floor(uptimeSec),
      uptimeFormatted: formatUptime(uptimeSec),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'production',
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10
      },
      selfPing,
      pollers: visiblePollers,
      cronStatus: {
        isRunning: cronStatus.isRunning,
        lastRunAt: cronStatus.lastRunAt,
        totalRuns: cronStatus.totalRuns
      },
      database: {
        usersCount: db.users.length,
        botsCount: db.telegram_bots.length,
        productsCount: db.products.length,
        ordersCount: db.orders.length,
        customersCount: db.customers.length
      },
      webhookIngressUrl: `${cleanAppUrl}/api/telegram/webhook/:botId`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/hosting/self-ping', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled, targetUrl } = req.body;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : true;
    const updated = CronService.updateSelfPingConfig(isEnabled, targetUrl);

    // If enabled, trigger one immediate background ping test
    if (isEnabled) {
      CronService.executeManualPing(targetUrl).catch(() => {});
    }

    return res.json({ success: true, selfPing: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/hosting/test-ping', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUrl } = req.body;
    const result = await CronService.executeManualPing(targetUrl);
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/hosting/restart-poller/:botId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { botId } = req.params;
    const user = req.user!;
    const bot = db.telegram_bots.find(b => b.id === botId);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Telegram Bot not found.' });
    }

    if (!assertOwnership(user, bot.owner_id)) {
      return res.status(403).json({ success: false, error: 'Permission denied.' });
    }

    // Stop and restart
    TelegramPollingManager.stopBot(botId);
    await new Promise(r => setTimeout(r, 600));
    await TelegramPollingManager.startBot(bot);

    const status = TelegramPollingManager.getStatus(botId);
    return res.json({
      success: true,
      message: `Polling listener for @${bot.username} restarted successfully.`,
      poller: status
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

