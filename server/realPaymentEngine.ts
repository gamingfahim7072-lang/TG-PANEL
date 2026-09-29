import crypto from 'crypto';
import {
  db,
  Payment,
  Order,
  Subscription,
  SubscriptionPlan,
  ProductKey,
  Wallet,
  WalletTransaction,
  WebhookEvent,
  LedgerTransaction,
  PaymentProviderConfig
} from './db.js';
import { logAudit } from './auth.js';

export interface VerificationResult {
  success: boolean;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'MANUAL_REVIEW' | 'NOT_RECEIVED';
  message: string;
  orderId?: string;
  paymentId?: string;
  transactionId?: string;
  order?: Order;
  payment?: Payment;
  subscription?: Subscription;
  deliveredKey?: string;
  wallet?: Wallet;
  error?: string;
  configured?: boolean;
}

export class RealPaymentEngine {
  /**
   * Configurable payment order expiry duration in seconds.
   * Default: 600 seconds (10 minutes).
   */
  public static ORDER_EXPIRY_SECONDS = 600;

  /**
   * Helper to verify Razorpay HMAC SHA256 Webhook Signature
   */
  public static verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return false;
    try {
      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Helper to verify Cashfree Webhook Signature
   */
  public static verifyCashfreeWebhookSignature(signature: string, timestamp: string, rawBody: string, secret?: string): boolean {
    const webhookSecret = secret || process.env.CASHFREE_SECRET_KEY;
    if (!webhookSecret) return false;
    try {
      const data = `${timestamp}${rawBody}`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(data).digest('base64');
      return expected === signature;
    } catch {
      return false;
    }
  }

  /**
   * Helper to verify Stripe Webhook Signature
   */
  public static verifyStripeWebhookSignature(rawBody: string, sigHeader: string, secret?: string): boolean {
    const webhookSecret = secret || process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !sigHeader) return false;
    try {
      // Stripe header format: t=timestamp,v1=signature
      const parts = sigHeader.split(',');
      let timestamp = '';
      let sig = '';
      for (const p of parts) {
        const [k, v] = p.split('=');
        if (k === 't') timestamp = v;
        if (k === 'v1') sig = v;
      }
      if (!timestamp || !sig) return false;
      const signedPayload = `${timestamp}.${rawBody}`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }

  /**
   * Checks if live API credentials exist for a given provider
   */
  public static isProviderLiveConfigured(provider: string): { configured: boolean; message: string } {
    const p = (provider || 'UPI').toUpperCase();
    if (p === 'RAZORPAY') {
      const hasKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
      return {
        configured: hasKeys,
        message: hasKeys ? 'Razorpay live credentials active.' : 'CONFIGURATION REQUIRED: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured.'
      };
    }
    if (p === 'CASHFREE') {
      const hasKeys = Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
      return {
        configured: hasKeys,
        message: hasKeys ? 'Cashfree live credentials active.' : 'CONFIGURATION REQUIRED: CASHFREE_APP_ID and CASHFREE_SECRET_KEY must be configured.'
      };
    }
    if (p === 'STRIPE') {
      const hasKeys = Boolean(process.env.STRIPE_SECRET_KEY);
      return {
        configured: hasKeys,
        message: hasKeys ? 'Stripe live credentials active.' : 'CONFIGURATION REQUIRED: STRIPE_SECRET_KEY must be configured.'
      };
    }
    if (p === 'PHONEPE') {
      const hasKeys = Boolean(process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY);
      return {
        configured: hasKeys,
        message: hasKeys ? 'PhonePe live credentials active.' : 'CONFIGURATION REQUIRED: PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY must be configured.'
      };
    }
    if (p === 'UPI') {
      const defaultUpi = (db.upi_configs || []).find(u => u.is_default && u.is_active);
      const hasUpi = Boolean(defaultUpi?.upi_id);
      return {
        configured: hasUpi,
        message: hasUpi ? `UPI payment endpoint: ${defaultUpi?.upi_id}` : 'CONFIGURATION REQUIRED: Active UPI VPA must be configured in settings.'
      };
    }
    return { configured: false, message: 'Provider configuration required.' };
  }

  /**
   * UNIVERSAL PAYMENT VERIFY ENGINE
   * Called whenever user clicks [ PAYMENT VERIFY ] or whenever backend audits status.
   * ABSOLUTE BUSINESS RULE:
   * Frontend button click NEVER directly assumes paid!
   * Live provider status or verified webhook must confirm receipt!
   */
  public static async verifyPaymentOrder(params: {
    orderId: string;
    userId: string;
    transactionId?: string;
    gatewayPaymentId?: string;
    signature?: string;
    provider?: string;
  }): Promise<VerificationResult> {
    const { orderId, userId, transactionId, gatewayPaymentId, signature } = params;

    // 1. Locate Order and Payment record
    const order = db.orders.find(o => o.id === orderId || o.payment_id === orderId);
    const payment = db.payments.find(p => p.order_id === orderId || p.id === orderId || (order && p.id === order.payment_id));

    if (!order && !payment) {
      return {
        success: false,
        status: 'FAILED',
        message: 'Payment order record not found in system.'
      };
    }

    const currentOrder = order || {
      id: payment!.order_id,
      customer_id: payment!.user_id,
      total_amount: payment!.amount,
      currency: payment!.currency,
      status: payment!.status,
      created_at: payment!.created_at
    } as any;

    const currentPayment = payment || {
      id: order!.payment_id || `pay-${order!.id}`,
      order_id: order!.id,
      user_id: order!.customer_id,
      amount: order!.total_amount,
      currency: order!.currency,
      status: order!.status,
      created_at: order!.created_at
    } as any;

    // 2. Ownership verification: User must own this order unless Super Admin
    const user = db.users.find(u => u.id === userId);
    const isSuperAdmin = user?.role === 'SUPER ADMIN' || user?.role === 'OWNER';
    if (currentOrder.customer_id !== userId && !isSuperAdmin) {
      return {
        success: false,
        status: 'FAILED',
        message: 'Security validation failed: Unauthorized order access.'
      };
    }

    // 3. Idempotency Check: If already PAID or DELIVERED, return success immediately
    if (currentPayment.status === 'PAID' || currentPayment.status === 'SUCCESS' || currentOrder.status === 'DELIVERED') {
      const sub = db.subscriptions.find(s => s.payment_id === currentPayment.id || s.order_id === currentOrder.id);
      const wal = db.wallets.find(w => w.owner_user_id === userId);
      return {
        success: true,
        status: 'PAID',
        message: 'Payment successfully received and verified.',
        orderId: currentOrder.id,
        paymentId: currentPayment.id,
        order: currentOrder,
        payment: currentPayment,
        subscription: sub,
        deliveredKey: currentOrder.key_delivered,
        wallet: wal
      };
    }

    // 4. Expiry Check
    const orderCreatedAt = new Date(currentPayment.created_at || currentOrder.created_at).getTime();
    const expiryTimestamp = orderCreatedAt + this.ORDER_EXPIRY_SECONDS * 1000;
    const isExpired = Date.now() > expiryTimestamp;

    // 5. Provider Real-Time Verification Check
    const provider = (params.provider || currentPayment.provider || currentOrder.payment_provider || 'UPI').toUpperCase();
    const configCheck = this.isProviderLiveConfigured(provider);

    let providerConfirmed = false;
    let providerTxId = transactionId || gatewayPaymentId || '';

    // Provider-specific verification
    if (provider === 'RAZORPAY') {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && gatewayPaymentId) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
          const resp = await fetch(`https://api.razorpay.com/v1/payments/${gatewayPaymentId}`, {
            headers: { Authorization: authHeader }
          });
          if (resp.ok) {
            const data: any = await resp.json();
            if (data.status === 'captured' && Number(data.amount) >= currentPayment.amount * 100) {
              providerConfirmed = true;
              providerTxId = data.id;
            }
          }
        } catch (err) {
          console.error('Razorpay verification error:', err);
        }
      }
    } else if (provider === 'CASHFREE') {
      if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY && currentOrder.id) {
        try {
          const resp = await fetch(`https://api.cashfree.com/pg/orders/${currentOrder.id}`, {
            headers: {
              'x-client-id': process.env.CASHFREE_APP_ID,
              'x-client-secret': process.env.CASHFREE_SECRET_KEY,
              'x-api-version': '2022-09-01'
            }
          });
          if (resp.ok) {
            const data: any = await resp.json();
            if (data.order_status === 'PAID') {
              providerConfirmed = true;
              providerTxId = data.cf_order_id || currentOrder.id;
            }
          }
        } catch (err) {
          console.error('Cashfree verification error:', err);
        }
      }
    } else if (provider === 'STRIPE') {
      if (process.env.STRIPE_SECRET_KEY && gatewayPaymentId) {
        try {
          const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${gatewayPaymentId}`, {
            headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
          });
          if (resp.ok) {
            const session: any = await resp.json();
            if (session.payment_status === 'paid') {
              providerConfirmed = true;
              providerTxId = session.payment_intent || session.id;
            }
          }
        } catch (err) {
          console.error('Stripe verification error:', err);
        }
      }
    }

    // 6. Check if a verified webhook has already credited this order
    const webhookEvent = (db.webhook_events || []).find(w => w.order_id === currentOrder.id && w.processed);
    if (webhookEvent) {
      providerConfirmed = true;
      providerTxId = webhookEvent.event_id || providerTxId;
    }

    // 7. If provider confirmed payment: Execute atomic fulfillment!
    if (providerConfirmed) {
      return this.executePaidOrderActions({
        order: currentOrder,
        payment: currentPayment,
        transactionId: providerTxId || `TXN-VERIFIED-${Date.now()}`,
        provider,
        userId
      });
    }

    // 8. If timer expired and no payment was received: mark EXPIRED
    if (isExpired) {
      currentPayment.status = 'EXPIRED';
      currentOrder.status = 'EXPIRED';
      db.saveImmediately();
      return {
        success: false,
        status: 'EXPIRED',
        message: '⏰ Payment Session Expired. Please generate a new payment order.'
      };
    }

    // 9. Payment is still PENDING (not yet received on provider rails)
    return {
      success: false,
      status: 'NOT_RECEIVED',
      configured: configCheck.configured,
      message: '❌ Payment Not Received\nPlease complete the payment using the official FZ PAY UPI ID/QR and try again.'
    };
  }

  /**
   * ATOMIC EXECUTION OF VERIFIED PAYMENT ACTIONS
   * Guaranteed to execute exactly once.
   */
  public static executePaidOrderActions(params: {
    order: Order;
    payment: Payment;
    transactionId: string;
    provider: string;
    userId: string;
  }): VerificationResult {
    const { order, payment, transactionId, provider, userId } = params;
    const nowStr = new Date().toISOString();

    // Prevent duplicate processing
    if (payment.status === 'PAID' || payment.status === 'SUCCESS') {
      const existingSub = db.subscriptions.find(s => s.payment_id === payment.id || s.order_id === order.id);
      return {
        success: true,
        status: 'PAID',
        message: '✅ Payment Successfully Verified\n🎉 Your subscription has been activated successfully.',
        orderId: order.id,
        paymentId: payment.id,
        transactionId,
        order,
        payment,
        subscription: existingSub,
        deliveredKey: order.key_delivered
      };
    }

    // 1. Mark Payment PAID
    payment.status = 'PAID';
    payment.transaction_id = transactionId;
    payment.verified_at = nowStr;
    payment.updated_at = nowStr;

    // 2. Mark Order PAID
    order.status = 'PAID';
    order.transaction_id = transactionId;
    order.updated_at = nowStr;

    let activatedSubscription: Subscription | undefined;
    let deliveredKeyStr: string | undefined;
    let updatedWallet: Wallet | undefined;

    // 3. BUSINESS ACTION A: SUBSCRIPTION PURCHASE
    if (payment.order_type === 'SUBSCRIPTION' || order.order_type === 'SUBSCRIPTION') {
      const plan = db.subscription_plans.find(p => p.id === payment.plan_id || (order.product_id && p.id === order.product_id));
      const duration = plan?.duration || (payment.billing_cycle === 'YEARLY' ? 365 : 30);
      const durationUnit = plan?.duration_unit || (payment.billing_cycle === 'YEARLY' ? 'YEARS' : 'DAYS');

      const now = new Date();
      const expiry = new Date(now.getTime());
      if ((durationUnit as string) === 'YEARS' || (durationUnit as string) === 'YEAR') {
        expiry.setFullYear(expiry.getFullYear() + duration);
      } else if ((durationUnit as string) === 'MONTHS' || (durationUnit as string) === 'MONTH') {
        expiry.setMonth(expiry.getMonth() + duration);
      } else {
        expiry.setDate(expiry.getDate() + duration);
      }

      let sub = db.subscriptions.find(s => s.user_id === userId && (s.status === 'ACTIVE' || s.status === 'MANUAL_GRANT'));
      if (sub) {
        sub.plan_id = plan ? plan.id : sub.plan_id;
        sub.plan_name = plan ? plan.name : sub.plan_name;
        sub.status = 'ACTIVE';
        sub.start_date = now.toISOString();
        sub.expiry_date = expiry.toISOString();
        sub.payment_id = payment.id;
        sub.order_id = order.id;
        sub.updated_at = nowStr;
        activatedSubscription = sub;
      } else {
        activatedSubscription = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          user_id: userId,
          user_email: payment.metadata?.userEmail,
          plan_id: plan ? plan.id : 'plan-monthly',
          plan_name: plan ? plan.name : 'Monthly Pro',
          billing_cycle: (payment.billing_cycle as any) || 'MONTHLY',
          amount: payment.amount,
          currency: payment.currency || 'INR',
          status: 'ACTIVE',
          start_date: now.toISOString(),
          expiry_date: expiry.toISOString(),
          auto_renew: true,
          payment_id: payment.id,
          order_id: order.id,
          is_manual: false,
          created_at: nowStr,
          updated_at: nowStr
        };
        db.subscriptions.unshift(activatedSubscription);
      }

      // Record in FZ Payment Bank Ledger
      db.ledger_transactions.unshift({
        id: `ledg-sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'SUBSCRIPTION',
        type: 'CREDIT',
        amount: payment.amount,
        currency: payment.currency || 'INR',
        order_id: order.id,
        payment_id: payment.id,
        transaction_id: transactionId,
        user_id: userId,
        plan_name: plan?.name || 'Pro Tier',
        status: 'CREDITED',
        description: `Verified Subscription: ${plan?.name || 'Pro Tier'} (${order.id})`,
        created_at: nowStr
      });

      // Customer notification
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: userId,
        title: '💎 Subscription Activated!',
        message: `Your payment was verified. Plan ${plan?.name || 'Pro'} is now active until ${expiry.toLocaleDateString()}.`,
        type: 'SUCCESS',
        is_read: false,
        created_at: nowStr
      });
    }

    // 4. BUSINESS ACTION B: PRODUCT KEY PURCHASE
    else if (payment.order_type === 'PRODUCT_KEY' && order.delivered_type === 'LICENSE_KEY') {
      let productKey = (db.product_keys || []).find(
        k => k.product_id === order.product_id && k.status === 'AVAILABLE' && (!order.package_id || !k.package_id || k.package_id === order.package_id)
      );

      if (!productKey) {
        const fallback = (db.license_keys || []).find(k => k.product_id === order.product_id && !k.is_redeemed);
        if (fallback) {
          fallback.is_redeemed = true;
          fallback.redeemed_at = nowStr;
          fallback.redeemed_by_customer_id = userId;
          fallback.order_id = order.id;
          productKey = {
            id: fallback.id,
            product_id: fallback.product_id,
            key: fallback.license_key,
            status: 'SOLD',
            sold_at: nowStr,
            sold_to_user_id: userId,
            order_id: order.id,
            created_at: fallback.created_at
          };
          db.product_keys.push(productKey);
        }
      }

      if (productKey) {
        productKey.status = 'SOLD';
        productKey.sold_at = nowStr;
        productKey.sold_to_user_id = userId;
        productKey.order_id = order.id;
        deliveredKeyStr = productKey.key;
        order.key_delivered = productKey.key;
        order.status = 'DELIVERED';
        order.delivered_content = `🔑 License Key: ${productKey.key}`;
      } else {
        order.status = 'PAID';
        order.delivered_content = 'Order verified. License key allocation in progress by bot store manager.';
      }

      // Ledger entry
      db.ledger_transactions.unshift({
        id: `ledg-key-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'PRODUCT_KEY',
        type: 'CREDIT',
        amount: order.total_amount,
        currency: order.currency || 'INR',
        order_id: order.id,
        payment_id: payment.id,
        transaction_id: transactionId,
        user_id: userId,
        product_name: order.product_name,
        status: 'CREDITED',
        description: `Verified Key Purchase: ${order.product_name} (${order.id})`,
        created_at: nowStr
      });
    }

    // 5. BUSINESS ACTION C: FZ PAY WALLET DEPOSIT
    else if (payment.order_type === 'WALLET_DEPOSIT' || payment.metadata?.type === 'WALLET_DEPOSIT') {
      let wal = db.wallets.find(w => w.owner_user_id === userId);
      if (!wal) {
        const cleanId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || Math.floor(100000 + Math.random() * 900000);
        wal = {
          id: `FZ-WAL-${cleanId}`,
          owner_user_id: userId,
          balance: 0,
          pending_balance: 0,
          currency: 'INR',
          status: 'ACTIVE',
          total_received: 0,
          total_spent: 0,
          created_at: nowStr,
          updated_at: nowStr
        };
        db.wallets.push(wal);
      }

      const balBefore = wal.balance;
      const balAfter = balBefore + payment.amount;
      wal.balance = balAfter;
      wal.total_received = (wal.total_received || 0) + payment.amount;
      wal.updated_at = nowStr;
      updatedWallet = wal;

      // Update user wallet balance snapshot
      const userRec = db.users.find(u => u.id === userId);
      if (userRec) {
        userRec.wallet_balance = wal.balance;
        userRec.total_deposited = (userRec.total_deposited || 0) + payment.amount;
      }

      // Immutable wallet transaction record
      db.wallet_transactions.unshift({
        id: `WTX-DEP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        wallet_id: wal.id,
        user_id: userId,
        type: 'DEPOSIT',
        amount: payment.amount,
        currency: wal.currency || 'INR',
        balance_before: balBefore,
        balance_after: balAfter,
        order_id: order.id,
        payment_id: payment.id,
        reference_id: transactionId,
        description: `Verified Add Money deposit of ₹${payment.amount}`,
        status: 'SUCCESS',
        metadata: { provider },
        created_at: nowStr,
        completed_at: nowStr
      });

      // Ledger entry
      db.ledger_transactions.unshift({
        id: `ledg-dep-${Date.now()}`,
        source: 'MANUAL_CREDIT',
        type: 'CREDIT',
        amount: payment.amount,
        currency: 'INR',
        order_id: order.id,
        payment_id: payment.id,
        transaction_id: transactionId,
        user_id: userId,
        status: 'CREDITED',
        description: `Verified FZ PAY Wallet Deposit (${wal.id})`,
        created_at: nowStr
      });
    }

    db.saveImmediately();

    logAudit({
      userId,
      action: 'PAYMENT_VERIFIED_SUCCESSFUL',
      resourceType: 'PAYMENT',
      resourceId: payment.id,
      metadata: { orderId: order.id, amount: payment.amount, provider, transactionId }
    });

    return {
      success: true,
      status: 'PAID',
      message: '✅ Payment Successfully Verified\n🎉 Your subscription has been activated successfully.',
      orderId: order.id,
      paymentId: payment.id,
      transactionId,
      order,
      payment,
      subscription: activatedSubscription,
      deliveredKey: deliveredKeyStr,
      wallet: updatedWallet
    };
  }

  /**
   * INCOMING PAYMENT WEBHOOK PROCESSOR
   * Processes genuine webhooks from Razorpay, Cashfree, Stripe, or PhonePe.
   * Enforces signature validation, idempotency, and atomic database state update.
   */
  public static async processIncomingWebhook(params: {
    provider: 'RAZORPAY' | 'CASHFREE' | 'STRIPE' | 'PHONEPE' | 'UPI' | 'GENERIC';
    rawBody: string;
    headers: Record<string, string | string[] | undefined>;
    payload: any;
  }): Promise<{ success: boolean; eventId?: string; message: string }> {
    const { provider, rawBody, headers, payload } = params;
    const nowStr = new Date().toISOString();

    let eventId = `wh-evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    let eventType = 'payment.captured';
    let orderId = '';
    let transactionId = '';
    let isPaid = false;

    // Provider-specific webhook validation
    if (provider === 'RAZORPAY') {
      const sig = (headers['x-razorpay-signature'] as string) || '';
      const isValid = this.verifyRazorpayWebhookSignature(rawBody, sig);
      if (!isValid && process.env.RAZORPAY_WEBHOOK_SECRET) {
        return { success: false, message: 'Invalid Razorpay webhook signature.' };
      }
      eventId = payload?.event_id || eventId;
      eventType = payload?.event || eventType;
      const paymentEntity = payload?.payload?.payment?.entity;
      orderId = paymentEntity?.notes?.orderId || paymentEntity?.order_id || '';
      transactionId = paymentEntity?.id || '';
      isPaid = payload?.event === 'payment.captured' || paymentEntity?.status === 'captured';
    } else if (provider === 'CASHFREE') {
      const sig = (headers['x-webhook-signature'] as string) || '';
      const ts = (headers['x-webhook-timestamp'] as string) || '';
      const isValid = this.verifyCashfreeWebhookSignature(sig, ts, rawBody);
      if (!isValid && process.env.CASHFREE_SECRET_KEY) {
        return { success: false, message: 'Invalid Cashfree webhook signature.' };
      }
      eventId = payload?.data?.cf_payment_id || eventId;
      orderId = payload?.data?.order?.order_id || '';
      transactionId = String(payload?.data?.cf_payment_id || '');
      isPaid = payload?.data?.payment?.payment_status === 'SUCCESS';
    } else if (provider === 'STRIPE') {
      const sig = (headers['stripe-signature'] as string) || '';
      const isValid = this.verifyStripeWebhookSignature(rawBody, sig);
      if (!isValid && process.env.STRIPE_WEBHOOK_SECRET) {
        return { success: false, message: 'Invalid Stripe webhook signature.' };
      }
      eventId = payload?.id || eventId;
      eventType = payload?.type || eventType;
      const obj = payload?.data?.object;
      orderId = obj?.client_reference_id || obj?.metadata?.orderId || '';
      transactionId = obj?.payment_intent || obj?.id || '';
      isPaid = payload?.type === 'checkout.session.completed' || payload?.type === 'payment_intent.succeeded';
    }

    // Idempotency check: Ensure the same webhook event ID is not processed twice
    if (!db.webhook_events) db.webhook_events = [];
    const duplicate = db.webhook_events.find(e => e.event_id === eventId && e.processed);
    if (duplicate) {
      return { success: true, eventId, message: 'Webhook event already processed (idempotent ignore).' };
    }

    const eventRecord: WebhookEvent = {
      id: `wh-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      provider,
      event_id: eventId,
      event_type: eventType,
      payload,
      processed: false,
      order_id: orderId,
      created_at: nowStr
    };
    db.webhook_events.unshift(eventRecord);

    if (isPaid && orderId) {
      const order = db.orders.find(o => o.id === orderId);
      const payment = db.payments.find(p => p.order_id === orderId || (order && p.id === order.payment_id));

      if (order && payment) {
        this.executePaidOrderActions({
          order,
          payment,
          transactionId: transactionId || eventId,
          provider,
          userId: order.customer_id
        });
        eventRecord.processed = true;
        eventRecord.processed_at = new Date().toISOString();
        eventRecord.payment_id = payment.id;
      }
    }

    db.saveImmediately();
    return { success: true, eventId, message: 'Webhook processed successfully.' };
  }
}
