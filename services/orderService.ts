import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Order } from "@/types/schema";

/**
 * RSR-SVC-003 — Order data access.
 * §8.2 / Phase 6 Step 3 (🔒 most important rule in this phase): this
 * service is READ-ONLY with respect to order creation and payment
 * status. It NEVER creates an orders/{orderId} document and NEVER
 * writes paymentStatus: "paid" — that is the exclusive responsibility
 * of the paymentWebhook Cloud Function (RSR-FBS-006), after gateway
 * signature verification.
 *
 * The client-side "Confirmation" step (Phase 6 Step 3.f) must poll or
 * subscribe to the order document rather than trust its own payment SDK
 * callback — subscribeToOrder() below is what that confirmation screen
 * should call, per that exact rule.
 *
 * Order status updates after creation (accepted → inProduction →
 * shipped → delivered, etc.) also happen server-side
 * (updateOrderStatus Cloud Function, RSR-FBS-007) — this service only
 * reads. Timeline entries are append-only (Ch.11.9 / Ch.6.2), enforced
 * at the security-rules layer, not here.
 */

const ORDERS_COLLECTION = "orders";

export async function getOrderById(orderId: string): Promise<Order | null> {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Order) : null;
}

/**
 * Live subscription to a single order — used by the post-payment
 * Confirmation step to detect the moment the webhook has actually
 * created/confirmed the order, rather than assuming success from a
 * client-side gateway callback (§8.2, Phase 6 Step 3.f).
 */
export function subscribeToOrder(
  orderId: string,
  onChange: (order: Order | null) => void,
  onError: () => void
): () => void {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? (snap.data() as Order) : null),
    onError
  );
}

export interface ListCustomerOrdersParams {
  customerId: string;
  pageSize?: number;
}

export async function listCustomerOrders({
  customerId,
  pageSize = 20,
}: ListCustomerOrdersParams): Promise<Order[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Order);
}

export interface ListStudioOrdersParams {
  studioId: string;
  pageSize?: number;
}

/**
 * Seller Studio Dashboard's /orders view — scoped strictly to the
 * requesting seller's own studioId. Security rules must independently
 * enforce that a seller can only read orders where studioId matches
 * their own custom-claims studioId (§16.3 RBAC), this query param is a
 * convenience, not the security boundary.
 */
export async function listStudioOrders({
  studioId,
  pageSize = 20,
}: ListStudioOrdersParams): Promise<Order[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where("studioId", "==", studioId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Order);
}

/**
 * Maps the granular internal orderStatus enum (Ch.6.2) to the simplified
 * customer-facing tracker stages, per Phase 6/7's "collapsed to
 * Placed → Processing → Shipped → Delivered" tracker rule.
 */
export type SimplifiedOrderStage = "placed" | "processing" | "shipped" | "delivered" | "cancelled";

const STAGE_MAP: Record<Order["orderStatus"], SimplifiedOrderStage> = {
  placed: "placed",
  accepted: "processing",
  inProduction: "processing",
  qualityCheck: "processing",
  packaged: "processing",
  readyToShip: "processing",
  shipped: "shipped",
  inTransit: "shipped",
  outForDelivery: "shipped",
  delivered: "delivered",
  completed: "delivered",
  cancelled: "cancelled",
  returned: "cancelled",
};

export function toSimplifiedStage(orderStatus: Order["orderStatus"]): SimplifiedOrderStage {
  return STAGE_MAP[orderStatus] ?? "placed";
}
