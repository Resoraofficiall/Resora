import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { CustomOrder } from "@/types/schema";

/**
 * RSR-SVC-004 — Custom order data access.
 * §7.4 (single authoritative workflow): submission → Founder
 * auto-assignment → seller conversation thread → quote →
 * accept/revise (max 2 revision rounds, then Founder is looped in
 * automatically) → payment → production → delivery → completion.
 *
 * 🔒 Same payment-verification boundary as standard checkout (§7.4:
 * "Payment collected (same payment rails as standard checkout)"): this
 * service never sets status: "paid" directly. Quote acceptance moves a
 * request to status: "paymentPending" and hands off to the same
 * initiatePayment/paymentWebhook Cloud Functions (RSR-FBS-005/006) used
 * by standard checkout — it does not duplicate payment logic.
 */

const CUSTOM_ORDERS_COLLECTION = "customOrders";
const MAX_REVISION_ROUNDS = 2;

export interface SubmitCustomOrderParams {
  customerId: string;
  category: string;
  description: string;
  budgetRange: string;
  deadline: string;
  referenceImageUrls: string[];
}

/**
 * Creates a new customOrders/{requestId} document in status: "submitted".
 * Founder auto-assignment (rule: matching category + highest performance
 * score) is a server-side concern (Cloud Function trigger on create),
 * not implemented here — this function only submits the request.
 */
export async function submitCustomOrder(
  params: SubmitCustomOrderParams
): Promise<string> {
  const ref = await addDoc(collection(db, CUSTOM_ORDERS_COLLECTION), {
    ...params,
    assignedStudioId: null,
    conversationId: null,
    quotedPrice: null,
    acceptedPrice: null,
    revisionCount: 0,
    status: "submitted",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCustomOrderById(requestId: string): Promise<CustomOrder | null> {
  const ref = doc(db, CUSTOM_ORDERS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as CustomOrder) : null;
}

export function subscribeToCustomOrder(
  requestId: string,
  onChange: (order: CustomOrder | null) => void,
  onError: () => void
): () => void {
  const ref = doc(db, CUSTOM_ORDERS_COLLECTION, requestId);
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? (snap.data() as CustomOrder) : null),
    onError
  );
}

export async function listCustomerCustomOrders(
  customerId: string,
  pageSize = 20
): Promise<CustomOrder[]> {
  const q = query(
    collection(db, CUSTOM_ORDERS_COLLECTION),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CustomOrder);
}

export async function listStudioCustomOrders(
  studioId: string,
  pageSize = 20
): Promise<CustomOrder[]> {
  const q = query(
    collection(db, CUSTOM_ORDERS_COLLECTION),
    where("assignedStudioId", "==", studioId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CustomOrder);
}

/**
 * Seller issues a formal quote — moves status to "quoted". Called from
 * the Seller Studio custom-order thread UI, not the customer-facing UI.
 */
export async function issueQuote(
  requestId: string,
  quotedPrice: number
): Promise<void> {
  const ref = doc(db, CUSTOM_ORDERS_COLLECTION, requestId);
  await updateDoc(ref, {
    quotedPrice,
    status: "quoted",
    updatedAt: serverTimestamp(),
  });
}

export interface RequestRevisionResult {
  ok: boolean;
  /** true if this revision request pushed the count past the cap and the
   * Founder has been auto-looped in — caller should surface this in UI */
  founderLoopedIn: boolean;
}

/**
 * Customer requests a revision on a quote. Enforces the §7.4 two-revision
 * cap: "max 2 revision rounds before Founder is looped in automatically."
 * On the 3rd request, status moves to a Founder-visible escalation state
 * rather than silently allowing unlimited renegotiation.
 */
export async function requestQuoteRevision(
  requestId: string
): Promise<RequestRevisionResult> {
  const ref = doc(db, CUSTOM_ORDERS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, founderLoopedIn: false };

  const current = snap.data() as CustomOrder & { revisionCount?: number };
  const nextCount = (current.revisionCount ?? 0) + 1;

  if (nextCount > MAX_REVISION_ROUNDS) {
    await updateDoc(ref, {
      revisionCount: nextCount,
      status: "inDiscussion", // Founder-visible escalation; Founder Admin
      // surfaces any customOrders past the revision cap in its own view
      // rather than a new status enum value not present in Ch.6.2.
      founderEscalated: true,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, founderLoopedIn: true };
  }

  await updateDoc(ref, {
    revisionCount: nextCount,
    status: "inDiscussion",
    updatedAt: serverTimestamp(),
  });
  return { ok: true, founderLoopedIn: false };
}

/**
 * Customer accepts the current quote — moves to "accepted", then
 * "paymentPending" once the client proceeds to the shared payment flow.
 * acceptedPrice is locked from quotedPrice at acceptance time so a later
 * quote edit can't retroactively change what the customer agreed to pay.
 */
export async function acceptQuote(requestId: string): Promise<void> {
  const ref = doc(db, CUSTOM_ORDERS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Custom order request not found");

  const current = snap.data() as CustomOrder;
  await updateDoc(ref, {
    acceptedPrice: current.quotedPrice,
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
}

/** Called once the client hands off to initiatePayment for this request. */
export async function markPaymentPending(requestId: string): Promise<void> {
  const ref = doc(db, CUSTOM_ORDERS_COLLECTION, requestId);
  await updateDoc(ref, {
    status: "paymentPending",
    updatedAt: serverTimestamp(),
  });
}
