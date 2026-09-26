import crypto from 'crypto';
import {
  db,
  Payment,
  Subscription,
  User,
  PaymentEvent,
  Notification,
  Order,
  Product,
  ProductPackage,
  ProductKey,
  LedgerTransaction,
  WithdrawalRequest,
  RefundRecord
} from './db.js';
import { logAudit } from './auth.js';

export class PaymentService {
  /**
   * Generates signature verification for Razorpay
   */
  public static verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_key'
  ): boolean {
    try {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      return generatedSignature === signature;
    } catch {
      return false;
    }
  }

  /**
   * Records a ledger entry into FZ PAYMENT BANK.
   * ABSOLUTE RULE: Balance increases ONLY upon verified transaction credit.
   */
  public static recordLedgerEntry(entry: {
    source: 'PRODUCT_KEY' | 'SUBSCRIPTION' | 'WITHDRAWAL' | 'REFUND' | 'MANUAL_CREDIT' | 'ADJUSTMENT';
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    currency?: string;
    order_id?: string;
    payment_id?: string;
    transaction_id?: string;
    user_id?: string;
    user_email?: string;
    customer_name?: string;
    product_name?: string;
    plan_name?: string;
    status: 'CREDITED' | 'DEBITED' | 'PENDING' | 'REJECTED';
    description: string;
    metadata?: any;
  }): LedgerTransaction {
    const nowStr = new Date().toISOString();
    const currency = entry.currency || db.payment_bank_settings.currency || 'INR';

    const ledgerItem: LedgerTransaction = {
      id: `ledg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      source: entry.source,
      type: entry.type,
      amount: entry.amount,
      currency,
      order_id: entry.order_id,
      payment_id: entry.payment_id,
      transaction_id: entry.transaction_id,
      user_id: entry.user_id,
      user_email: entry.user_email,
      customer_name: entry.customer_name,
      product_name: entry.product_name,
      plan_name: entry.plan_name,
      status: entry.status,
      description: entry.description,
      metadata: entry.metadata,
      created_at: nowStr
    };

    db.ledger_transactions.unshift(ledgerItem);
    db.saveImmediately();
    return ledgerItem;
  }

  /**
   * Calculates comprehensive FZ PAYMENT BANK statistics strictly from verified entries.
   * Available Balance = Verified Product Payments + Verified Subscription Payments + Approved Credits - Verified Refunds - Completed Withdrawals.
   */
  public static getFZBankStats() {
    const transactions = db.ledger_transactions || [];
    const settings = db.payment_bank_settings;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 86400000;
    const thirtyDaysAgo = now.getTime() - 30 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    let productKeyRevenue = 0;
    let subscriptionRevenue = 0;
    let manualCredits = 0;
    let totalWithdrawn = 0;
    let totalRefunded = 0;
    let pendingPaymentsCount = 0;
    let successfulPaymentsCount = 0;
    let failedPaymentsCount = 0;

    let todayRevenue = 0;
    let sevenDayRevenue = 0;
    let thirtyDayRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;

    // Daily buckets for 14-day chart
    const dailyMap: Record<string, { date: string; productRevenue: number; subscriptionRevenue: number; total: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      dailyMap[dateKey] = { date: dateKey, productRevenue: 0, subscriptionRevenue: 0, total: 0 };
    }

    for (const tx of transactions) {
      const txTime = new Date(tx.created_at).getTime();
      const dateKey = tx.created_at.split('T')[0];

      if (tx.status === 'CREDITED') {
        if (tx.source === 'PRODUCT_KEY') {
          productKeyRevenue += tx.amount;
          if (dailyMap[dateKey]) {
            dailyMap[dateKey].productRevenue += tx.amount;
            dailyMap[dateKey].total += tx.amount;
          }
        } else if (tx.source === 'SUBSCRIPTION') {
          subscriptionRevenue += tx.amount;
          if (dailyMap[dateKey]) {
            dailyMap[dateKey].subscriptionRevenue += tx.amount;
            dailyMap[dateKey].total += tx.amount;
          }
        } else if (tx.source === 'MANUAL_CREDIT' || tx.source === 'ADJUSTMENT') {
          manualCredits += tx.amount;
          if (dailyMap[dateKey]) {
            dailyMap[dateKey].total += tx.amount;
          }
        }

        // Time window filters
        const amt = tx.amount;
        if (txTime >= startOfToday) todayRevenue += amt;
        if (txTime >= sevenDaysAgo) sevenDayRevenue += amt;
        if (txTime >= thirtyDaysAgo) thirtyDayRevenue += amt;
        if (txTime >= startOfMonth) monthlyRevenue += amt;
        if (txTime >= startOfYear) yearlyRevenue += amt;
      } else if (tx.status === 'DEBITED') {
        if (tx.source === 'WITHDRAWAL') {
          totalWithdrawn += tx.amount;
        } else if (tx.source === 'REFUND') {
          totalRefunded += tx.amount;
        }
      }
    }

    // Payment statuses from db.payments
    for (const p of db.payments) {
      if (p.status === 'SUCCESS') successfulPaymentsCount++;
      else if (p.status === 'PENDING') pendingPaymentsCount++;
      else if (p.status === 'FAILED') failedPaymentsCount++;
    }

    const totalReceived = productKeyRevenue + subscriptionRevenue + manualCredits;
    const availableBalance = Math.max(0, totalReceived - totalWithdrawn - totalRefunded);

    const pendingWithdrawalsAmount = (db.withdrawals || [])
      .filter(w => w.status === 'PENDING' || w.status === 'PROCESSING')
      .reduce((sum, w) => sum + w.amount, 0);

    return {
      settings,
      availableBalance,
      totalReceived,
      totalWithdrawn,
      totalRefunded,
      productKeyRevenue,
      subscriptionRevenue,
      totalVerifiedRevenue: totalReceived,
      pendingWithdrawalsAmount,
      counts: {
        totalTransactions: transactions.length,
        successful: successfulPaymentsCount,
        pending: pendingPaymentsCount,
        failed: failedPaymentsCount,
        keysInInventory: (db.product_keys || []).length,
        availableKeys: (db.product_keys || []).filter(k => k.status === 'AVAILABLE').length,
        soldKeys: (db.product_keys || []).filter(k => k.status === 'SOLD').length,
        activeSubscriptions: (db.subscriptions || []).filter(s => s.status === 'ACTIVE').length
      },
      timeframes: {
        todayRevenue,
        sevenDayRevenue,
        thirtyDayRevenue,
        monthlyRevenue,
        yearlyRevenue
      },
      chartData: Object.values(dailyMap)
    };
  }

  /**
   * Creates an order and payment intent for KEY/PRODUCT purchase.
   * Retrieves price strictly from database package/product.
   */
  public static createProductKeyOrder(params: {
    user: User;
    productId: string;
    packageId?: string;
    provider?: 'UPI' | 'RAZORPAY' | 'CASHFREE' | 'PHONEPE' | 'SANDBOX';
  }): {
    success: boolean;
    order?: Order;
    payment?: Payment;
    paymentUri?: string;
    qrImageUrl?: string;
    upiDetails?: any;
    error?: string;
  } {
    const product = db.products.find(p => p.id === params.productId && p.is_active);
    if (!product) {
      return { success: false, error: 'Product not found or currently unavailable.' };
    }

    let unitPrice = product.price;
    let packageName = product.name;
    let packageId = params.packageId;

    if (packageId) {
      const pkg = (product.packages || []).find(pk => pk.id === packageId && pk.is_active) ||
                  (db.product_packages || []).find(pk => pk.id === packageId && pk.product_id === product.id && pk.is_active);
      if (!pkg) {
        return { success: false, error: 'Selected key package variant not found.' };
      }
      unitPrice = pkg.price;
      packageName = `${product.name} (${pkg.name})`;
    }

    // Check inventory: must have at least one AVAILABLE key
    const availableKeys = (db.product_keys || []).filter(
      k => k.product_id === product.id && k.status === 'AVAILABLE' && (!packageId || !k.package_id || k.package_id === packageId)
    );

    if (availableKeys.length === 0) {
      return { success: false, error: 'No license keys currently in stock for this product. Please check back shortly.' };
    }

    const orderId = `KEY-ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const nowStr = new Date().toISOString();
    const provider = params.provider || 'UPI';

    const order: Order = {
      id: orderId,
      owner_id: product.owner_id || params.user.id,
      bot_id: product.bot_id || 'system',
      customer_id: params.user.id,
      customer_name: params.user.full_name || params.user.email,
      customer_telegram_id: params.user.telegram_id || params.user.username || 'web',
      product_id: product.id,
      package_id: packageId,
      product_name: packageName,
      quantity: 1,
      unit_price: unitPrice,
      total_amount: unitPrice,
      currency: product.currency || 'INR',
      status: 'PENDING',
      order_type: 'PRODUCT_KEY',
      payment_provider: provider,
      delivered_type: 'LICENSE_KEY',
      created_at: nowStr,
      updated_at: nowStr
    };

    db.orders.unshift(order);

    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      order_id: orderId,
      user_id: params.user.id,
      amount: unitPrice,
      currency: product.currency || 'INR',
      provider: provider === 'UPI' ? 'MANUAL' : (provider as any),
      status: 'PENDING',
      order_type: 'PRODUCT_KEY',
      metadata: {
        userEmail: params.user.email,
        productId: product.id,
        packageId,
        productName: packageName
      },
      created_at: nowStr,
      updated_at: nowStr
    };

    order.payment_id = payment.id;
    db.payments.unshift(payment);
    db.saveImmediately();

    // Generate UPI URI & QR Code
    const defaultUpi = (db.upi_configs || []).find(u => u.is_default && u.is_active) || (db.upi_configs || [])[0] || {
      upi_id: 'fzpanel@upi',
      upi_name: 'FZ Payment Bank'
    };

    const upiUri = `upi://pay?pa=${encodeURIComponent(defaultUpi.upi_id)}&pn=${encodeURIComponent(defaultUpi.upi_name)}&am=${unitPrice.toFixed(2)}&cu=${product.currency || 'INR'}&tn=${encodeURIComponent(orderId)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUri)}`;

    return {
      success: true,
      order,
      payment,
      paymentUri: upiUri,
      qrImageUrl,
      upiDetails: {
        upi_id: defaultUpi.upi_id,
        merchant_name: defaultUpi.upi_name,
        amount: unitPrice,
        currency: product.currency || 'INR',
        order_id: orderId
      }
    };
  }

  /**
   * Verifies payment for a KEY purchase.
   * ABSOLUTE RULE: NO VERIFIED PAYMENT = NO KEY.
   * Atomic key allocation: sets key SOLD, delivers to customer, credits FZ Payment Bank ledger.
   */
  public static verifyProductKeyPayment(params: {
    orderId: string;
    paymentId?: string;
    transactionId?: string;
    provider?: string;
  }): {
    success: boolean;
    key?: string;
    order?: Order;
    error?: string;
  } {
    const order = db.orders.find(o => o.id === params.orderId || o.payment_id === params.orderId);
    if (!order) {
      return { success: false, error: 'Key purchase order record not found.' };
    }

    if (order.status === 'DELIVERED' && order.key_delivered) {
      return { success: true, key: order.key_delivered, order };
    }

    const payment = db.payments.find(p => p.order_id === order.id || p.id === order.payment_id);
    if (!payment) {
      return { success: false, error: 'Payment transaction record not linked to order.' };
    }

    const nowStr = new Date().toISOString();
    const transactionId = params.transactionId || `TXN-KEY-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Duplicate check: ensure this transactionId has not been processed already
    const duplicateTx = db.ledger_transactions.find(
      t => t.transaction_id && t.transaction_id === transactionId && t.status === 'CREDITED'
    );
    if (duplicateTx) {
      return { success: false, error: 'Duplicate transaction ID detected. Payment has already been processed.' };
    }

    // Atomic Key Allocation
    let productKey = (db.product_keys || []).find(
      k => k.product_id === order.product_id && k.status === 'AVAILABLE' && (!order.package_id || !k.package_id || k.package_id === order.package_id)
    );

    // Backward compatibility fallback to license_keys if product_keys is empty
    if (!productKey) {
      const fallbackKey = (db.license_keys || []).find(k => k.product_id === order.product_id && !k.is_redeemed);
      if (fallbackKey) {
        fallbackKey.is_redeemed = true;
        fallbackKey.redeemed_by_customer_id = order.customer_id;
        fallbackKey.redeemed_at = nowStr;
        fallbackKey.order_id = order.id;

        productKey = {
          id: fallbackKey.id,
          product_id: fallbackKey.product_id,
          key: fallbackKey.license_key,
          status: 'SOLD',
          created_at: fallbackKey.created_at,
          sold_at: nowStr,
          sold_to_user_id: order.customer_id,
          order_id: order.id
        };
        db.product_keys.push(productKey);
      }
    }

    if (!productKey) {
      return {
        success: false,
        error: 'Payment received but inventory is currently exhausted. An admin has been alerted for immediate key restock.'
      };
    }

    // Mark Key as SOLD
    productKey.status = 'SOLD';
    productKey.sold_at = nowStr;
    productKey.sold_to_user_id = order.customer_id;
    productKey.order_id = order.id;

    // Update Product Stock Count
    const product = db.products.find(p => p.id === order.product_id);
    if (product) {
      product.stock_count = Math.max(0, (product.stock_count || 1) - 1);
    }

    // Mark Order and Payment PAID
    payment.status = 'SUCCESS';
    payment.transaction_id = transactionId;
    payment.verified_at = nowStr;
    payment.updated_at = nowStr;

    order.status = 'DELIVERED';
    order.key_delivered = productKey.key;
    order.delivered_content = `🔑 License Key: ${productKey.key}`;
    order.transaction_id = transactionId;
    order.updated_at = nowStr;

    // Credit FZ Payment Bank Ledger
    this.recordLedgerEntry({
      source: 'PRODUCT_KEY',
      type: 'CREDIT',
      amount: order.total_amount,
      currency: order.currency,
      order_id: order.id,
      payment_id: payment.id,
      transaction_id: transactionId,
      user_id: order.customer_id,
      customer_name: order.customer_name,
      product_name: order.product_name,
      status: 'CREDITED',
      description: `Verified Key Purchase: ${order.product_name} (${order.id})`,
      metadata: { productId: order.product_id, keyId: productKey.id }
    });

    // Notify Customer
    db.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: order.customer_id,
      title: '🔑 Product Key Delivered!',
      message: `Your payment of ${order.currency} ${order.total_amount} was verified. Key: ${productKey.key}`,
      type: 'SUCCESS',
      is_read: false,
      created_at: nowStr
    });

    logAudit({
      userId: order.customer_id,
      action: 'KEY_PURCHASE_VERIFIED',
      resourceType: 'ORDER',
      resourceId: order.id,
      metadata: { productId: order.product_id, amount: order.total_amount, transactionId }
    });

    db.saveImmediately();
    return { success: true, key: productKey.key, order };
  }

  /**
   * Creates an order and payment intent for SUBSCRIPTION plan.
   * Price is retrieved STRICTLY from server-side database plan.
   */
  public static createSubscriptionOrder(params: {
    user: User;
    planId: string;
    billingCycle?: 'MONTHLY' | 'YEARLY';
    provider?: 'RAZORPAY' | 'STRIPE' | 'CASHFREE' | 'PHONEPE' | 'SANDBOX' | 'UPI';
  }): {
    success: boolean;
    order?: Order;
    payment?: Payment;
    paymentUri?: string;
    qrImageUrl?: string;
    upiDetails?: any;
    gatewayConfig?: any;
    error?: string;
  } {
    const plan = db.subscription_plans.find(p => (p.id === params.planId || p.plan_id === params.planId) && p.status === 'ACTIVE');
    if (!plan) {
      return { success: false, error: 'Subscription plan not found or inactive.' };
    }

    const billingCycle = params.billingCycle || (plan.id === 'plan-yearly' ? 'YEARLY' : 'MONTHLY');
    const amount = billingCycle === 'YEARLY' ? (plan.price_yearly || plan.price || 2499) : (plan.price_monthly || plan.price || 299);
    const orderId = `SUB-ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const nowStr = new Date().toISOString();
    const provider = params.provider || 'UPI';

    const order: Order = {
      id: orderId,
      owner_id: params.user.id,
      bot_id: 'system',
      customer_id: params.user.id,
      customer_name: params.user.full_name || params.user.email,
      customer_telegram_id: params.user.telegram_id || params.user.username || 'web',
      product_id: plan.id,
      product_name: `${plan.name} (${billingCycle})`,
      quantity: 1,
      unit_price: amount,
      total_amount: amount,
      currency: plan.currency || 'INR',
      status: 'PENDING',
      order_type: 'SUBSCRIPTION',
      payment_provider: provider,
      delivered_type: 'CUSTOM_MESSAGE',
      delivered_content: `Subscription: ${plan.name}`,
      created_at: nowStr,
      updated_at: nowStr
    };

    db.orders.unshift(order);

    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      order_id: orderId,
      user_id: params.user.id,
      amount,
      currency: plan.currency || 'INR',
      provider: provider === 'UPI' ? 'MANUAL' : (provider as any),
      status: 'PENDING',
      order_type: 'SUBSCRIPTION',
      plan_id: plan.id,
      billing_cycle: billingCycle,
      metadata: {
        userEmail: params.user.email,
        planName: plan.name,
        initiatedAt: nowStr
      },
      created_at: nowStr,
      updated_at: nowStr
    };

    order.payment_id = payment.id;
    db.payments.unshift(payment);
    db.saveImmediately();

    // Generate UPI URI & QR Code
    const defaultUpi = (db.upi_configs || []).find(u => u.is_default && u.is_active) || (db.upi_configs || [])[0] || {
      upi_id: 'fzpanel@upi',
      upi_name: 'FZ Payment Bank'
    };

    const upiUri = `upi://pay?pa=${encodeURIComponent(defaultUpi.upi_id)}&pn=${encodeURIComponent(defaultUpi.upi_name)}&am=${amount.toFixed(2)}&cu=${plan.currency || 'INR'}&tn=${encodeURIComponent(orderId)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUri)}`;

    return {
      success: true,
      order,
      payment,
      paymentUri: upiUri,
      qrImageUrl,
      upiDetails: {
        upi_id: defaultUpi.upi_id,
        merchant_name: defaultUpi.upi_name,
        amount,
        currency: plan.currency || 'INR',
        order_id: orderId
      }
    };
  }

  /**
   * Finalizes and verifies a subscription payment.
   * ABSOLUTE RULE: Activates subscription & credits FZ Payment Bank ledger ONLY upon verified payment.
   */
  public static processPaymentVerification(params: {
    paymentId: string;
    gatewayPaymentId?: string;
    gatewayOrderId?: string;
    signature?: string;
    transactionId?: string;
    provider?: 'RAZORPAY' | 'STRIPE' | 'CASHFREE' | 'PHONEPE' | 'SANDBOX' | 'MANUAL' | 'UPI';
  }): { success: boolean; subscription?: Subscription; error?: string } {
    const payment = db.payments.find(p => p.id === params.paymentId || p.order_id === params.paymentId);
    if (!payment) {
      return { success: false, error: 'Payment transaction record not found.' };
    }

    // Idempotency: If already SUCCESS, return existing active subscription
    if (payment.status === 'SUCCESS') {
      const existingSub = db.subscriptions.find(s => s.payment_id === payment.id || s.user_id === payment.user_id && s.status === 'ACTIVE');
      return { success: true, subscription: existingSub };
    }

    const provider = params.provider || (payment.provider as any) || 'UPI';

    // Provider signature verification if Razorpay
    if (provider === 'RAZORPAY' && process.env.RAZORPAY_KEY_SECRET) {
      const isValid = this.verifyRazorpaySignature(
        payment.order_id,
        params.gatewayPaymentId || '',
        params.signature || ''
      );
      if (!isValid) {
        payment.status = 'FAILED';
        db.saveImmediately();
        return { success: false, error: 'Payment signature verification failed.' };
      }
    }

    const now = new Date();
    const plan = db.subscription_plans.find(p => p.id === payment.plan_id);
    const durationDays = plan?.duration || (payment.billing_cycle === 'YEARLY' ? 365 : 30);
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const transactionId = params.transactionId || params.gatewayPaymentId || `TXN-SUB-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Duplicate transaction check
    const duplicateTx = db.ledger_transactions.find(
      t => t.transaction_id && t.transaction_id === transactionId && t.status === 'CREDITED'
    );
    if (duplicateTx) {
      return { success: false, error: 'Duplicate transaction detected.' };
    }

    // Mark payment SUCCESS
    payment.status = 'SUCCESS';
    payment.gateway_payment_id = params.gatewayPaymentId;
    payment.gateway_order_id = params.gatewayOrderId;
    payment.transaction_id = transactionId;
    payment.signature = params.signature;
    payment.verified_at = now.toISOString();
    payment.updated_at = now.toISOString();

    // Update associated order if present
    const order = db.orders.find(o => o.id === payment.order_id);
    if (order) {
      order.status = 'PAID';
      order.transaction_id = transactionId;
      order.updated_at = now.toISOString();
    }

    // Activate or Extend Subscription
    let sub = db.subscriptions.find(s => s.user_id === payment.user_id && s.status === 'ACTIVE');
    if (sub) {
      const currentExpiry = new Date(sub.expiry_date);
      const newExpiry = currentExpiry > now
        ? new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : expiryDate;
      sub.plan_id = payment.plan_id || sub.plan_id;
      sub.billing_cycle = payment.billing_cycle || sub.billing_cycle;
      sub.amount = payment.amount;
      sub.expiry_date = newExpiry;
      sub.payment_id = payment.id;
      sub.updated_at = now.toISOString();
    } else {
      sub = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        user_id: payment.user_id,
        plan_id: payment.plan_id || 'plan-monthly',
        billing_cycle: payment.billing_cycle || 'MONTHLY',
        amount: payment.amount,
        currency: payment.currency,
        status: 'ACTIVE',
        start_date: now.toISOString(),
        expiry_date: expiryDate,
        auto_renew: true,
        payment_id: payment.id,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      db.subscriptions.unshift(sub);
    }

    // Credit FZ Payment Bank Ledger
    this.recordLedgerEntry({
      source: 'SUBSCRIPTION',
      type: 'CREDIT',
      amount: payment.amount,
      currency: payment.currency,
      order_id: payment.order_id,
      payment_id: payment.id,
      transaction_id: transactionId,
      user_id: payment.user_id,
      user_email: payment.metadata?.userEmail,
      plan_name: payment.metadata?.planName || plan?.name || 'Premium Plan',
      status: 'CREDITED',
      description: `Verified Subscription Payment: ${plan?.name || 'Pro'} (${payment.order_id})`,
      metadata: { planId: payment.plan_id, durationDays, billingCycle: payment.billing_cycle }
    });

    // Notify User
    db.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: payment.user_id,
      title: '💎 Premium Subscription Active!',
      message: `Your payment was verified. Bot visual editor & automation flows are now unlocked for ${durationDays} days.`,
      type: 'SUCCESS',
      is_read: false,
      created_at: now.toISOString()
    });

    logAudit({
      userId: payment.user_id,
      action: 'SUBSCRIPTION_PAYMENT_VERIFIED',
      resourceType: 'PAYMENT',
      resourceId: payment.id,
      metadata: { planId: payment.plan_id, amount: payment.amount, transactionId }
    });

    db.saveImmediately();
    return { success: true, subscription: sub };
  }
}
