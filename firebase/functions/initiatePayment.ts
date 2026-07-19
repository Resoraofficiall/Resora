/**
 * RESORA — Cloud Function: initiatePayment
 * Per Blueprint §8.2 (Payment Verification Rule) and §18.1 (Razorpay).
 * Client never confirms its own payment success — this function only
 * creates a gateway order and returns the ID needed for the client-side
 * checkout widget. It never marks any order as paid; that is exclusively
 * paymentWebhook.ts's job, after signature verification.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Razorpay from 'razorpay';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

interface InitiatePaymentRequest {
  cartId: string;
  shippingAddressId: string;
  billingAddressId: string;
  couponCode?: string;
}

interface CartLineItem {
  productId: string;
  variantId?: string;
  studioId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

/**
 * V1 checkout splits a multi-studio cart into one order per Studio
 * (§7.2) — but payment itself is a single gateway charge for the whole
 * cart total; per-studio order documents are created by the webhook
 * after payment succeeds, all referencing the same paymentId.
 */
export const initiatePayment = onCall(
  { secrets: [razorpayKeyId, razorpayKeySecret] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in required to initiate payment.');
    }

    const data = request.data as InitiatePaymentRequest;
    if (!data?.cartId || !data?.shippingAddressId || !data?.billingAddressId) {
      throw new HttpsError('invalid-argument', 'cartId, shippingAddressId, and billingAddressId are required.');
    }

    // Server recomputes totals from the authoritative cart + live product
    // prices — the client-submitted total is never trusted (§6.5 field-level
    // allow-list principle extends to "never trust client math").
    const cartSnap = await db.collection('carts').doc(uid).get();
    if (!cartSnap.exists) {
      throw new HttpsError('failed-precondition', 'Cart not found or empty.');
    }
    const cart = cartSnap.data() as { lineItems: CartLineItem[] };
    if (!cart.lineItems?.length) {
      throw new HttpsError('failed-precondition', 'Cart is empty.');
    }

    let subtotal = 0;
    const validatedLineItems: (CartLineItem & { subtotal: number })[] = [];

    for (const item of cart.lineItems) {
      const productSnap = await db.collection('products').doc(item.productId).get();
      if (!productSnap.exists) {
        throw new HttpsError('failed-precondition', `Product ${item.productId} no longer exists.`);
      }
      const product = productSnap.data()!;
      if (product.status !== 'published') {
        throw new HttpsError('failed-precondition', `Product ${item.productId} is not available for purchase.`);
      }

      const unitPrice = product.salePrice ?? product.price;
      const lineSubtotal = unitPrice * item.qty;
      subtotal += lineSubtotal;

      validatedLineItems.push({
        ...item,
        unitPrice,
        subtotal: lineSubtotal,
      });
    }

    let discount = 0;
    if (data.couponCode) {
      const couponSnap = await db
        .collection('coupons')
        .where('code', '==', data.couponCode)
        .where('active', '==', true)
        .limit(1)
        .get();
      if (!couponSnap.empty) {
        const coupon = couponSnap.docs[0].data();
        discount =
          coupon.type === 'percentage'
            ? Math.round((subtotal * coupon.value) / 100)
            : coupon.value;
        discount = Math.min(discount, subtotal);
      }
    }

    // Shipping fee and tax calculation are configurable platform settings
    // (§7.7) — read from Firestore, never hardcoded.
    const settingsSnap = await db.collection('settings').doc('financeConfig').get();
    const financeConfig = settingsSnap.exists
      ? settingsSnap.data()!
      : { flatShippingFee: 0, taxRatePercent: 0 };

    const shippingFee = financeConfig.flatShippingFee ?? 0;
    const taxableAmount = subtotal - discount;
    const tax = Math.round((taxableAmount * (financeConfig.taxRatePercent ?? 0)) / 100);
    const total = taxableAmount + tax + shippingFee;

    if (total <= 0) {
      throw new HttpsError('failed-precondition', 'Computed order total must be greater than zero.');
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId.value(),
      key_secret: razorpayKeySecret.value(),
    });

    // Razorpay amounts are in the smallest currency unit (paise for INR).
    const gatewayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `pending_${uid}_${Date.now()}`,
      notes: {
        uid,
        cartId: data.cartId,
      },
    });

    // Create the payments/{paymentId} record in 'initiated' status. This is
    // the only client-triggerable payment write, and it never sets
    // status: 'succeeded' — only the webhook can do that.
    const paymentRef = db.collection('payments').doc();
    await paymentRef.set({
      paymentId: paymentRef.id,
      gateway: 'razorpay',
      gatewayOrderId: gatewayOrder.id,
      amount: total,
      currency: 'INR',
      status: 'initiated',
      gatewayTransactionId: null,
      gatewayResponseRaw: null,
      customerUid: uid,
      pendingOrderData: {
        lineItems: validatedLineItems,
        shippingAddressId: data.shippingAddressId,
        billingAddressId: data.billingAddressId,
        subtotal,
        discount,
        tax,
        shippingFee,
        total,
        couponCode: data.couponCode ?? null,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      paymentId: paymentRef.id,
      razorpayOrderId: gatewayOrder.id,
      razorpayKeyId: razorpayKeyId.value(),
      amount: total,
      currency: 'INR',
    };
  }
);
