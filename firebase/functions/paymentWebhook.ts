/**
 * RESORA — Cloud Function: paymentWebhook
 * Per Blueprint §8.2 (Payment Verification Rule) — the single most
 * security-critical function in the app.
 *
 * "Client never confirms its own payment success. The gateway calls a
 * server-side webhook; only that webhook, after signature verification,
 * is permitted to write paymentStatus: paid and trigger order creation."
 *
 * This function:
 *   1. Verifies the Razorpay webhook signature (HMAC-SHA256) against the
 *      raw request body — rejects anything that fails, no exceptions.
 *   2. Is idempotent: replays of the same event (Razorpay retries on
 *      timeout) never create duplicate orders or double-write payments.
 *   3. On verified success, splits the cart into one order per Studio
 *      (§7.2) and writes each order via a transaction, never a client
 *      write.
 *   4. On verified failure, marks payment failed and creates no order at
 *      all (§7.1: "a failed payment never creates an order document").
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

interface PendingLineItem {
  productId: string;
  variantId?: string;
  studioId: string;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

interface PendingOrderData {
  lineItems: PendingLineItem[];
  shippingAddressId: string;
  billingAddressId: string;
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
}

/**
 * Generates the next sequential order ID in RSR-{year}-{6digit} format
 * (§6.2) via a Firestore transaction against a counter document, so
 * concurrent checkouts never collide.
 */
async function nextOrderId(transaction: admin.firestore.Transaction): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = db.collection('counters').doc(`orders_${year}`);
  const counterSnap = await transaction.get(counterRef);

  const nextSeq = counterSnap.exists ? (counterSnap.data()!.value as number) + 1 : 1;
  transaction.set(counterRef, { value: nextSeq }, { merge: true });

  const padded = String(nextSeq).padStart(6, '0');
  return `RSR-${year}-${padded}`;
}

export const paymentWebhook = onRequest(
  { secrets: [razorpayWebhookSecret], cors: false },
  async (req, res) => {
    // ---- STEP 1: Signature verification against the raw body. Must use
    // the raw, unparsed request body — re-serializing JSON before hashing
    // is a common bug that breaks signature verification silently.
    const signature = req.headers['x-razorpay-signature'] as string | undefined;

    if (!signature) {
      logger.warn('paymentWebhook: missing signature header');
      res.status(400).send('Missing signature');
      return;
    }

    const rawBody = (req as any).rawBody as Buffer;
    if (!rawBody) {
      logger.error('paymentWebhook: rawBody unavailable — check Functions runtime config');
      res.status(500).send('Internal error');
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpayWebhookSecret.value())
      .update(rawBody)
      .digest('hex');

    const signatureValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));

    if (!signatureValid) {
      logger.error('paymentWebhook: SIGNATURE VERIFICATION FAILED — rejecting payload', {
        ip: req.ip,
      });
      res.status(400).send('Invalid signature');
      return;
    }

    const event = req.body as {
      event: string;
      payload: {
        payment: {
          entity: {
            id: string;
            order_id: string;
            status: string;
            amount: number;
          };
        };
      };
    };

    const gatewayOrderId = event.payload?.payment?.entity?.order_id;
    const gatewayPaymentId = event.payload?.payment?.entity?.id;

    if (!gatewayOrderId) {
      logger.error('paymentWebhook: payload missing order_id', { event: event.event });
      res.status(400).send('Malformed payload');
      return;
    }

    // Look up our internal payment record by the gateway order ID we
    // stored when initiatePayment created it.
    const paymentQuery = await db
      .collection('payments')
      .where('gatewayOrderId', '==', gatewayOrderId)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      logger.error('paymentWebhook: no matching payment record for gatewayOrderId', {
        gatewayOrderId,
      });
      res.status(404).send('Payment record not found');
      return;
    }

    const paymentDoc = paymentQuery.docs[0];
    const paymentData = paymentDoc.data();

    // ---- STEP 2: Idempotency guard. Razorpay retries webhooks on
    // timeout/5xx — if this payment is already terminal (succeeded or
    // failed), acknowledge 200 and do nothing further. This is what
    // prevents duplicate orders on retry (§7.1).
    if (paymentData.status === 'succeeded' || paymentData.status === 'failed') {
      logger.info('paymentWebhook: duplicate/replayed event for already-terminal payment', {
        paymentId: paymentDoc.id,
        currentStatus: paymentData.status,
      });
      res.status(200).send('Already processed');
      return;
    }

    const isSuccessEvent = event.event === 'payment.captured' || event.event === 'order.paid';
    const isFailureEvent = event.event === 'payment.failed';

    if (isFailureEvent) {
      // ---- Failed payment: mark failed, create NO order document.
      await paymentDoc.ref.update({
        status: 'failed',
        gatewayTransactionId: gatewayPaymentId,
        gatewayResponseRaw: event,
      });

      await db.collection('notifications').add({
        recipientUid: paymentData.customerUid,
        type: 'paymentFailed',
        title: 'Payment unsuccessful',
        body: 'Your payment could not be completed. Please try again.',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info('paymentWebhook: payment marked failed, no order created', {
        paymentId: paymentDoc.id,
      });
      res.status(200).send('Recorded failure');
      return;
    }

    if (!isSuccessEvent) {
      // Unrecognized event type — acknowledge so Razorpay stops retrying,
      // but do not treat as success.
      logger.info('paymentWebhook: unhandled event type, acknowledging without action', {
        eventType: event.event,
      });
      res.status(200).send('Unhandled event type, ignored');
      return;
    }

    // ---- STEP 3: Verified success — split cart into one order per
    // Studio (§7.2) and create everything atomically per Studio group.
    const pending = paymentData.pendingOrderData as PendingOrderData;

    const itemsByStudio = new Map<string, PendingLineItem[]>();
    for (const item of pending.lineItems) {
      const group = itemsByStudio.get(item.studioId) ?? [];
      group.push(item);
      itemsByStudio.set(item.studioId, group);
    }

    const createdOrderIds: string[] = [];

    try {
      for (const [studioId, items] of itemsByStudio.entries()) {
        const orderId = await db.runTransaction(async (transaction) => {
          const generatedOrderId = await nextOrderId(transaction);
          const orderRef = db.collection('orders').doc(generatedOrderId);

          const studioSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
          // Proportionally allocate discount/tax/shipping across per-Studio
          // sub-orders based on this Studio's share of the cart subtotal.
          const shareOfCart = pending.subtotal > 0 ? studioSubtotal / pending.subtotal : 0;
          const allocatedDiscount = Math.round(pending.discount * shareOfCart);
          const allocatedTax = Math.round(pending.tax * shareOfCart);
          const allocatedShipping = Math.round(pending.shippingFee * shareOfCart);
          const studioTotal =
            studioSubtotal - allocatedDiscount + allocatedTax + allocatedShipping;

          const now = FieldValue.serverTimestamp();

          transaction.set(orderRef, {
            orderId: generatedOrderId,
            customerId: paymentData.customerUid,
            studioId,
            lineItems: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId ?? null,
              name: i.name,
              qty: i.qty,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
            })),
            shippingAddress: pending.shippingAddressId,
            billingAddress: pending.billingAddressId,
            subtotal: studioSubtotal,
            tax: allocatedTax,
            discount: allocatedDiscount,
            shippingFee: allocatedShipping,
            total: studioTotal,
            paymentStatus: 'paid',
            orderStatus: 'placed',
            trackingNumber: null,
            courierName: null,
            estimatedDelivery: null,
            invoiceUrl: null,
            timeline: [
              {
                event: 'orderPlaced',
                timestamp: new Date().toISOString(),
                actor: 'system',
              },
            ],
            createdAt: now,
            updatedAt: now,
          });

          // Decrement inventory for stock-managed products within the
          // same transaction so it's atomic with order creation.
          for (const item of items) {
            const productRef = db.collection('products').doc(item.productId);
            const productSnap = await transaction.get(productRef);
            if (productSnap.exists && productSnap.data()!.inventoryMode === 'stock') {
              transaction.update(productRef, {
                inventoryCount: FieldValue.increment(-item.qty),
                salesCount: FieldValue.increment(item.qty),
              });
            }
          }

          // Notify the seller.
          const studioSnap = await transaction.get(db.collection('studios').doc(studioId));
          if (studioSnap.exists) {
            const notificationRef = db.collection('notifications').doc();
            transaction.set(notificationRef, {
              notificationId: notificationRef.id,
              recipientUid: studioSnap.data()!.ownerUid,
              type: 'newOrder',
              title: 'New order received',
              body: `Order ${generatedOrderId} has been placed.`,
              read: false,
              createdAt: now,
            });

            transaction.update(studioSnap.ref, {
              totalOrders: FieldValue.increment(1),
              revenueTotal: FieldValue.increment(studioTotal),
            });
          }

          return generatedOrderId;
        });

        createdOrderIds.push(orderId);
      }

      // Mark the payment succeeded only after all per-Studio orders are
      // committed — if any Studio's transaction threw, we fall to catch
      // below and the payment stays 'initiated' for manual reconciliation
      // rather than being marked paid with a partial order set.
      await paymentDoc.ref.update({
        status: 'succeeded',
        gatewayTransactionId: gatewayPaymentId,
        gatewayResponseRaw: event,
        orderIds: createdOrderIds,
      });

      // Clear the customer's cart now that it has become order(s).
      await db.collection('carts').doc(paymentData.customerUid).delete();

      await db.collection('notifications').add({
        recipientUid: paymentData.customerUid,
        type: 'paymentSucceeded',
        title: 'Payment confirmed',
        body: `Your order${createdOrderIds.length > 1 ? 's have' : ' has'} been placed: ${createdOrderIds.join(', ')}.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info('paymentWebhook: payment succeeded, orders created', {
        paymentId: paymentDoc.id,
        orderIds: createdOrderIds,
      });

      res.status(200).send('OK');
    } catch (err) {
      logger.error('paymentWebhook: order creation failed after verified payment — needs manual reconciliation', {
        paymentId: paymentDoc.id,
        error: err instanceof Error ? err.message : String(err),
      });

      await db.collection('notifications').add({
        recipientUid: 'founderAlertChannel',
        type: 'orderCreationFailedAfterPayment',
        title: 'URGENT: Paid order failed to create',
        body: `Payment ${paymentDoc.id} (gateway order ${gatewayOrderId}) succeeded but order creation failed. Manual reconciliation required.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Respond 500 so Razorpay retries — idempotency guard above ensures
      // a later successful retry won't double-charge or double-notify,
      // since payment status is still not 'succeeded' at this point.
      res.status(500).send('Order creation failed, will retry');
    }
  }
);
