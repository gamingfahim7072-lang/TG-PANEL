import QRCode from 'qrcode';
import { DigitalProduct, TelegramBot, Order, PaymentStatus } from '../types';

export interface PriceCalculationResult {
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
}

/**
 * Backend Authoritative Price Calculation using strict decimal arithmetic.
 * Never trust client-supplied amounts.
 */
export function calculateOrderPrice(
  product: DigitalProduct,
  quantity = 1,
  discountPercent = 0
): PriceCalculationResult {
  const qty = Math.max(1, Math.floor(quantity));
  const itemPrice = typeof product.priceInr === 'number' ? product.priceInr : 320.00;
  const rawBase = itemPrice * qty;
  const baseAmount = Math.round(rawBase * 100) / 100;

  const appliedDiscountPercent = Math.max(0, Math.min(100, discountPercent || product.discountPercent || 0));
  const rawDiscount = (baseAmount * appliedDiscountPercent) / 100;
  const discountAmount = Math.round(rawDiscount * 100) / 100;

  const subtotal = baseAmount - discountAmount;
  const appliedTaxPercent = Math.max(0, product.taxPercent || 0);
  const rawTax = (subtotal * appliedTaxPercent) / 100;
  const taxAmount = Math.round(rawTax * 100) / 100;

  const finalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    baseAmount,
    discountAmount,
    taxAmount,
    finalAmount,
  };
}

/**
 * Generate standards-compliant UPI URI
 * upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tr={orderRef}&tn={note}
 */
export function buildUpiPayload(
  upiId: string,
  merchantName: string,
  amount: number,
  orderId: string,
  productTitle: string
): string {
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(merchantName.trim());
  const cleanAmount = amount.toFixed(2);
  const cleanOrderRef = encodeURIComponent(orderId.trim());
  const note = encodeURIComponent(`Pay for ${productTitle} (${orderId})`);

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tr=${cleanOrderRef}&tn=${note}`;
}

/**
 * Generates a high-resolution, standards-compliant QR Code Data URL.
 * Preserves the required quiet zone without distracting borders or overlays.
 */
export async function generateDynamicQrDataUrl(upiUri: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('QR generation failed:', err);
    throw new Error('Failed to render dynamic UPI QR code');
  }
}

/**
 * Server-side payment verification simulation
 */
export interface VerificationResult {
  success: boolean;
  newStatus: PaymentStatus;
  providerTxId?: string;
  message: string;
  isManualOnly?: boolean;
}

import { getDefaultPaymentAccount } from './defaults';

export function simulateServerVerification(
  order: Order,
  bot: TelegramBot,
  forceSuccess = false
): VerificationResult {
  const account = bot.paymentAccount || getDefaultPaymentAccount(bot.id, bot.name, bot.username);

  // Mode B: Manual Verification Mode
  if (account.mode === 'MODE_B_MANUAL_UPI') {
    return {
      success: false,
      newStatus: 'PENDING_VERIFICATION',
      message: 'MANUAL VERIFICATION REQUIRED — This bot operates in UPI-ID fallback mode. Automatic server-side verification is unavailable until audited by the merchant.',
      isManualOnly: true,
    };
  }

  // Check if payments are enabled
  if (!account.paymentsEnabled) {
    return {
      success: false,
      newStatus: 'PAYMENT_FAILED',
      message: 'Merchant payment gateway is currently disabled for this bot.',
    };
  }

  // Check if expired
  if (order.qrExpiresAt && new Date(order.qrExpiresAt) < new Date()) {
    return {
      success: false,
      newStatus: 'PAYMENT_EXPIRED',
      message: 'Payment request has expired. Please generate a new payment QR.',
    };
  }

  // Provider Mode A simulation
  if (forceSuccess || order.status === 'PAYMENT_SUCCESSFUL') {
    return {
      success: true,
      newStatus: 'PAYMENT_SUCCESSFUL',
      providerTxId: order.providerTxId || `pay_rzp_${Math.floor(100000000 + Math.random() * 900000000)}`,
      message: 'Payment verified successfully via provider webhook/API.',
    };
  }

  // Still pending
  return {
    success: false,
    newStatus: 'PAYMENT_PENDING',
    message: 'Payment has not been confirmed yet by the provider banking switch. Please complete payment or retry in a few seconds.',
  };
}
