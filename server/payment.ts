import crypto from 'crypto';
import { db, Payment, Subscription, User, PaymentEvent, Notification } from './db.js';
import { logAudit } from './auth.js';

export class PaymentService {
  /**
   * Generates Razorpay order signature verification
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
   * Creates a payment intent for a subscription plan
   * Crucial Security Rule: Price is retrieved STRICTLY from server-side database plan.
   */
  public static createSubscriptionOrder(params: {
    user: User;
    planId: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    provider: 'RAZORPAY' | 'STRIPE' | 'CASHFREE' | 'PHONEPE' | 'SANDBOX';
  }): {
    success: boolean;
    payment?: Payment;
    gatewayConfig?: any;
    error?: string;
  } {
    const plan = db.subscription_plans.find(p => p.id === params.planId && p.status === 'ACTIVE');
    if (!plan) {
      return { success: false, error: 'Subscription plan not found or inactive.' };
    }

    const amount = params.billingCycle === 'YEARLY' ? plan.price_yearly : plan.price_monthly;
    const orderId = `PAY-ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const nowStr = new Date().toISOString();
    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      order_id: orderId,
      user_id: params.user.id,
      amount,
      currency: plan.currency,
      provider: params.provider,
      status: 'PENDING',
      plan_id: plan.id,
      billing_cycle: params.billingCycle,
      metadata: {
        userEmail: params.user.email,
        planName: plan.name,
        initiatedAt: nowStr
      },
      created_at: nowStr,
      updated_at: nowStr
    };

    db.payments.unshift(payment);
    db.save();

    // Gateway-specific config payload
    let gatewayConfig: any = {
      orderId: payment.order_id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      planName: plan.name,
      billingCycle: params.billingCycle
    };

    if (params.provider === 'RAZORPAY') {
      gatewayConfig.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_public_key_telesell';
      gatewayConfig.amountPaise = amount * 100;
    } else if (params.provider === 'STRIPE') {
      gatewayConfig.publicKey = process.env.STRIPE_PUBLIC_KEY || 'pk_test_sample_telesell';
    }

    return {
      success: true,
      payment,
      gatewayConfig
    };
  }

  /**
   * Finalizes and verifies a payment, activating the subscription securely
   */
  public static processPaymentVerification(params: {
    paymentId: string;
    gatewayPaymentId: string;
    gatewayOrderId?: string;
    signature?: string;
    provider: 'RAZORPAY' | 'STRIPE' | 'CASHFREE' | 'PHONEPE' | 'SANDBOX' | 'MANUAL';
  }): { success: boolean; subscription?: Subscription; error?: string } {
    const payment = db.payments.find(p => p.id === params.paymentId || p.order_id === params.paymentId);
    if (!payment) {
      return { success: false, error: 'Payment transaction record not found.' };
    }

    // Idempotency: If already SUCCESS, return active subscription
    if (payment.status === 'SUCCESS') {
      const existingSub = db.subscriptions.find(s => s.payment_id === payment.id);
      return { success: true, subscription: existingSub };
    }

    // Provider signature verification
    if (params.provider === 'RAZORPAY' && process.env.RAZORPAY_KEY_SECRET) {
      const isValid = this.verifyRazorpaySignature(
        payment.order_id,
        params.gatewayPaymentId,
        params.signature || ''
      );
      if (!isValid) {
        payment.status = 'FAILED';
        db.save();
        return { success: false, error: 'Payment signature verification failed.' };
      }
    }

    const now = new Date();
    const durationDays = payment.billing_cycle === 'YEARLY' ? 365 : 30;
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // Mark payment SUCCESS
    payment.status = 'SUCCESS';
    payment.gateway_payment_id = params.gatewayPaymentId;
    payment.gateway_order_id = params.gatewayOrderId;
    payment.signature = params.signature;
    payment.updated_at = now.toISOString();

    // Activate or Extend Subscription
    let sub = db.subscriptions.find(s => s.user_id === payment.user_id && s.status === 'ACTIVE');
    if (sub) {
      // Extend current active subscription
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
      // Create new active subscription
      sub = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        user_id: payment.user_id,
        plan_id: payment.plan_id || 'plan-pro',
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

    // Process Referral and Reseller Commissions
    const user = db.users.find(u => u.id === payment.user_id);
    if (user && user.referred_by) {
      const referrer = db.users.find(u => u.id === user.referred_by || u.referral_code === user.referred_by);
      if (referrer && referrer.id !== user.id) {
        const commissionRate = referrer.reseller_status === 'APPROVED' ? (referrer.reseller_commission_rate || 20) : 10;
        const commissionAmount = Math.round((payment.amount * commissionRate) / 100);

        db.referrals.push({
          id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          referrer_id: referrer.id,
          referred_user_id: user.id,
          referred_user_name: user.full_name,
          referred_user_email: user.email,
          commission_amount: commissionAmount,
          currency: payment.currency,
          status: 'PAID',
          order_id: payment.order_id,
          created_at: now.toISOString()
        });

        referrer.reseller_balance = (referrer.reseller_balance || 0) + commissionAmount;

        // Notify referrer
        db.notifications.unshift({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          user_id: referrer.id,
          title: '💰 Referral Commission Received!',
          message: `You earned ${payment.currency} ${commissionAmount} (${commissionRate}%) from ${user.full_name}'s subscription.`,
          type: 'SUCCESS',
          is_read: false,
          created_at: now.toISOString()
        });
      }
    }

    // Notify User
    db.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: payment.user_id,
      title: '🎉 Subscription Activated!',
      message: `Your subscription has been successfully activated for ${durationDays} days.`,
      type: 'SUCCESS',
      is_read: false,
      created_at: now.toISOString()
    });

    // Record Event
    const event: PaymentEvent = {
      id: `ev-${Date.now()}`,
      payment_id: payment.id,
      provider: payment.provider,
      event_type: 'PAYMENT_SUCCESS_VERIFIED',
      payload: { paymentId: payment.id, amount: payment.amount, expiryDate },
      processed: true,
      created_at: now.toISOString()
    };
    db.payment_events.unshift(event);

    logAudit({
      userId: payment.user_id,
      action: 'SUBSCRIPTION_PAYMENT_SUCCESS',
      resourceType: 'PAYMENT',
      resourceId: payment.id,
      metadata: { planId: payment.plan_id, amount: payment.amount, provider: payment.provider }
    });

    db.saveImmediately();
    return { success: true, subscription: sub };
  }
}
