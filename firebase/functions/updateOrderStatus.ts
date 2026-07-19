/**
 * RESORA — Cloud Function: updateOrderStatus
 * Per Blueprint §6.5 (orders never client-writable directly), §7.1
 * (canonical order lifecycle, every transition writes one immutable
 * timeline entry), §7.5 (shipping/tracking fields captured at
 * "Ready to Ship"), and §7.6 (invoice generation at payment confirmation
 * is handled separately by the webhook — this function governs every
 * status transition AFTER an order already exists).
 *
 * Callable only by: the owning Studio (seller), Founder, or Support
 * (flag-only per RBAC §16.3 — support cannot change status here).
 * Every call is validated against the canonical lifecycle graph so a
 * status can never skip or reverse illegally.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'inProduction'
  | 'qualityCheck'
  | 'packaged'
  | 'readyToShip'
  | 'shipped'
  | 'inTransit'
  | 'outForDelivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned';

// Canonical lifecycle graph (§7.1). Cancellation is reachable from any
// pre-shipment state (§7.3: "freely allowed pre-production"); returned
// is only reachable post-delivery.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['accepted', 'cancelled'],
  accepted: ['inProduction', 'cancelled'],
  inProduction: ['qualityCheck', 'cancelled'],
  qualityCheck: ['packaged', 'inProduction'],
  packaged: ['readyToShip'],
  readyToShip: ['shipped'],
  shipped: ['inTransit'],
  inTransit: ['outForDelivery'],
  outForDelivery: ['delivered'],
  delivered: ['completed', 'returned'],
  completed: [],
  cancelled: [],
  returned: [],
};

// Internal states collapse to this five-stage bar for customer display
// (§7.5) — not written here, but the enum ordering must stay consistent
// with what the tracking UI expects.
const READY_TO_SHIP_REQUIRED_FIELDS = ['trackingNumber', 'courierName', 'estimatedDelivery'] as const;

interface UpdateOrderStatusRequest {
  orderId: string;
  newStatus: OrderStatus;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string; // ISO date string
  cancellationReason?: string;
}

export const updateOrderStatus = onCall(async (request) => {
  const uid = request.auth?.uid;
  const role = request.auth?.token?.role as string | undefined;
  const callerStudioId = request.auth?.token?.studioId as string | undefined;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const data = request.data as UpdateOrderStatusRequest;
  if (!data?.orderId || !data?.newStatus) {
    throw new HttpsError('invalid-argument', 'orderId and newStatus are required.');
  }

  const orderRef = db.collection('orders').doc(data.orderId);

  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError('not-found', `Order ${data.orderId} not found.`);
    }

    const order = orderSnap.data()!;
    const currentStatus = order.orderStatus as OrderStatus;

    // ---- Authorization: owning Studio, or Founder/superAdmin. Support
    // can flag but not directly change status (RBAC §16.3) — this
    // function is not the flagging path.
    const isOwningStudio = role === 'seller' && callerStudioId === order.studioId;
    const isAdmin = role === 'founder' || role === 'superAdmin';

    if (!isOwningStudio && !isAdmin) {
      throw new HttpsError('permission-denied', 'Not authorized to update this order.');
    }

    // ---- Validate transition against the canonical lifecycle graph.
    // Founder/superAdmin may force a correction (e.g. resolving a dispute)
    // but sellers are strictly bound to the graph.
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!isAdmin && !allowedNext.includes(data.newStatus)) {
      throw new HttpsError(
        'failed-precondition',
        `Cannot transition order from "${currentStatus}" to "${data.newStatus}".`
      );
    }
    if (isAdmin && !allowedNext.includes(data.newStatus) && currentStatus !== data.newStatus) {
      logger.warn('updateOrderStatus: admin override of non-standard transition', {
        orderId: data.orderId,
        from: currentStatus,
        to: data.newStatus,
        actorUid: uid,
      });
    }

    // ---- "Ready to Ship" requires shipping fields captured (§7.5).
    if (data.newStatus === 'readyToShip') {
      const missing = READY_TO_SHIP_REQUIRED_FIELDS.filter(
        (field) => !data[field as keyof UpdateOrderStatusRequest]
      );
      if (missing.length > 0) {
        throw new HttpsError(
          'invalid-argument',
          `Missing required fields for Ready to Ship: ${missing.join(', ')}`
        );
      }
    }

    if (data.newStatus === 'cancelled' && !data.cancellationReason) {
      throw new HttpsError('invalid-argument', 'cancellationReason is required to cancel an order.');
    }

    const now = FieldValue.serverTimestamp();
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      orderStatus: data.newStatus,
      updatedAt: now,
      // Timeline is append-only (§6.2, enforced again here defensively —
      // Firestore rules already deny direct update/delete of this array
      // outside this function's own write).
      timeline: FieldValue.arrayUnion({
        event: `statusChanged:${data.newStatus}`,
        timestamp: nowIso,
        actor: isAdmin ? `admin:${uid}` : `studio:${callerStudioId}`,
      }),
    };

    if (data.newStatus === 'readyToShip') {
      updatePayload.trackingNumber = data.trackingNumber;
      updatePayload.courierName = data.courierName;
      updatePayload.estimatedDelivery = data.estimatedDelivery;
    }

    transaction.update(orderRef, updatePayload);

    // Cancellation before production: restock inventory for stock-managed
    // products (§7.3 — freely allowed pre-production).
    if (data.newStatus === 'cancelled' && ['placed', 'accepted'].includes(currentStatus)) {
      for (const item of order.lineItems as { productId: string; qty: number }[]) {
        const productRef = db.collection('products').doc(item.productId);
        const productSnap = await transaction.get(productRef);
        if (productSnap.exists && productSnap.data()!.inventoryMode === 'stock') {
          transaction.update(productRef, {
            inventoryCount: FieldValue.increment(item.qty),
            salesCount: FieldValue.increment(-item.qty),
          });
        }
      }
    }

    // Notify the customer on every transition — copy kept generic here;
    // customer-facing wording is CMS-driven per notification type in the
    // notification templates document, not hardcoded per status.
    const notificationRef = db.collection('notifications').doc();
    transaction.set(notificationRef, {
      notificationId: notificationRef.id,
      recipientUid: order.customerId,
      type: 'orderStatusChanged',
      title: 'Order update',
      body: `Order ${data.orderId} status: ${data.newStatus}.`,
      read: false,
      createdAt: now,
    });

    // Trigger review request once delivered → completed handoff happens
    // (actual review-request notification content is CMS-driven, queued
    // here as an event for a separate scheduled/triggered function to
    // pick up rather than duplicating notification-composition logic).
    if (data.newStatus === 'completed') {
      const reviewPromptRef = db.collection('notifications').doc();
      transaction.set(reviewPromptRef, {
        notificationId: reviewPromptRef.id,
        recipientUid: order.customerId,
        type: 'reviewRequested',
        title: 'How was your experience?',
        body: `Leave a review for your order ${data.orderId}.`,
        read: false,
        createdAt: now,
      });
    }

    // Audit log for every transition on financially/operationally
    // sensitive orders (all of them) — append-only per §6.5.
    const auditRef = db.collection('auditLogs').doc();
    transaction.set(auditRef, {
      logId: auditRef.id,
      actorUid: uid,
      action: 'orderStatusUpdated',
      targetType: 'order',
      targetId: data.orderId,
      previousValue: { orderStatus: currentStatus },
      newValue: { orderStatus: data.newStatus },
      timestamp: now,
    });
  });

  return { success: true, orderId: data.orderId, newStatus: data.newStatus };
});
