import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

/**
 * RSR-SVC-006 — Cart data access.
 * Phase 6, Step 1: cart page (/cart) reads from carts/{uid}
 * (server-synced, not localStorage-only) — no guest checkout in V1
 * (§8.1), so every cart operation requires an authenticated uid.
 *
 * 🔒 This service NEVER writes an orders/{orderId} document or sets
 * paymentStatus: "paid" — per §8.2 / Phase 6 Step 3, only the
 * server-side paymentWebhook Cloud Function (RSR-FBS-006), after
 * signature verification, is permitted to do that. cartService's job
 * ends at "cart is ready for checkout" — initiatePayment
 * (RSR-FBS-005) takes over from there.
 */

const CARTS_COLLECTION = "carts";

export interface CartLineItem {
  productId: string;
  studioId: string;
  variantId: string | null;
  name: string;
  unitPrice: number;
  qty: number;
  imageUrl?: string;
}

export interface Cart {
  uid: string;
  lineItems: CartLineItem[];
  updatedAt: unknown;
}

export async function getCart(uid: string): Promise<Cart | null> {
  const ref = doc(db, CARTS_COLLECTION, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Cart) : null;
}

export interface AddToCartParams {
  productId: string;
  studioId: string;
  variantId: string | null;
  name: string;
  unitPrice: number;
  qty: number;
  customerId: string | null;
  imageUrl?: string;
}

/**
 * Adds (or merges quantity into) a line item. Requires customerId since
 * V1 has no guest checkout — callers (e.g. ProductDetail) are
 * responsible for redirecting unauthenticated users to /login before
 * calling this, per §8.1.
 */
export async function addToCart(params: AddToCartParams): Promise<void> {
  const { customerId, ...item } = params;
  if (!customerId) {
    throw new Error("addToCart requires an authenticated customerId — no guest checkout in V1 (§8.1).");
  }

  const ref = doc(db, CARTS_COLLECTION, customerId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists() ? (snap.data() as Cart) : { uid: customerId, lineItems: [] };

    const lineKey = (li: CartLineItem) => `${li.productId}_${li.variantId ?? "none"}`;
    const targetKey = `${item.productId}_${item.variantId ?? "none"}`;

    const lineItems = [...existing.lineItems];
    const idx = lineItems.findIndex((li) => lineKey(li) === targetKey);

    if (idx >= 0) {
      lineItems[idx] = { ...lineItems[idx], qty: lineItems[idx].qty + item.qty };
    } else {
      lineItems.push({ ...item });
    }

    tx.set(ref, {
      uid: customerId,
      lineItems,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateCartLineItemQty(
  uid: string,
  productId: string,
  variantId: string | null,
  qty: number
): Promise<void> {
  const ref = doc(db, CARTS_COLLECTION, uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const cart = snap.data() as Cart;

    const lineKey = (li: CartLineItem) => `${li.productId}_${li.variantId ?? "none"}`;
    const targetKey = `${productId}_${variantId ?? "none"}`;

    const lineItems =
      qty <= 0
        ? cart.lineItems.filter((li) => lineKey(li) !== targetKey)
        : cart.lineItems.map((li) => (lineKey(li) === targetKey ? { ...li, qty } : li));

    tx.update(ref, { lineItems, updatedAt: serverTimestamp() });
  });
}

export async function removeFromCart(
  uid: string,
  productId: string,
  variantId: string | null
): Promise<void> {
  return updateCartLineItemQty(uid, productId, variantId, 0);
}

export async function clearCart(uid: string): Promise<void> {
  const ref = doc(db, CARTS_COLLECTION, uid);
  await runTransaction(db, async (tx) => {
    tx.set(ref, { uid, lineItems: [], updatedAt: serverTimestamp() });
  });
}

/**
 * Groups a cart's line items by studioId — Phase 6 Step 1 requires the
 * multi-studio split to be shown clearly before checkout ("Your order
 * will be split into N shipments from N studios"), never sprung at
 * payment time (§7.2).
 */
export function groupLineItemsByStudio(
  lineItems: CartLineItem[]
): Record<string, CartLineItem[]> {
  return lineItems.reduce<Record<string, CartLineItem[]>>((groups, item) => {
    if (!groups[item.studioId]) groups[item.studioId] = [];
    groups[item.studioId].push(item);
    return groups;
  }, {});
}

export function calculateCartSubtotal(lineItems: CartLineItem[]): number {
  return lineItems.reduce((sum, li) => sum + li.unitPrice * li.qty, 0);
}
