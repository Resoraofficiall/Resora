/**
 * services/customOrderService.ts
 * RSR-SVC-008 — Custom order request → quote → payment workflow.
 */

import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebaseClient";

export interface CustomOrderRequest {
  id: string;
  uid: string;
  studioId: string | null;
  category: string;
  description: string;
  budgetRange: string;
  timeline: string;
  status: "requested" | "quoted" | "accepted" | "in_production" | "completed" | "declined";
  quotedPriceInPaise: number | null;
  createdAt: number;
}

const CUSTOM_ORDERS_COLLECTION = "customOrderRequests";

function toRequest(id: string, data: Record<string, unknown>): CustomOrderRequest {
  return {
    id,
    uid: String(data.uid ?? ""),
    studioId: (data.studioId as string | undefined) ?? null,
    category: String(data.category ?? ""),
    description: String(data.description ?? ""),
    budgetRange: String(data.budgetRange ?? ""),
    timeline: String(data.timeline ?? ""),
    status: (data.status as CustomOrderRequest["status"]) ?? "requested",
    quotedPriceInPaise: (data.quotedPriceInPaise as number | undefined) ?? null,
    createdAt: Number(data.createdAt ?? 0),
  };
}

export interface CustomOrderRequestInput {
  uid: string;
  category: string;
  description: string;
  budgetRange: string;
  timeline: string;
}

export async function submitCustomOrderRequest(input: CustomOrderRequestInput): Promise<string> {
  const ref = doc(collection(db, CUSTOM_ORDERS_COLLECTION));
  await setDoc(ref, { ...input, studioId: null, status: "requested", quotedPriceInPaise: null, createdAt: Date.now() });
  return ref.id;
}

export async function listCustomOrdersForBuyer(uid: string): Promise<CustomOrderRequest[]> {
  const q = query(collection(db, CUSTOM_ORDERS_COLLECTION), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRequest(d.id, d.data()));
}

export async function listCustomOrdersForStudio(studioId: string): Promise<CustomOrderRequest[]> {
  const q = query(collection(db, CUSTOM_ORDERS_COLLECTION), where("studioId", "==", studioId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRequest(d.id, d.data()));
}

export async function getCustomOrderById(id: string): Promise<CustomOrderRequest | null> {
  const snap = await getDoc(doc(db, CUSTOM_ORDERS_COLLECTION, id));
  if (!snap.exists()) return null;
  return toRequest(snap.id, snap.data());
}

export async function sendQuote(requestId: string, quotedPriceInPaise: number): Promise<void> {
  await updateDoc(doc(db, CUSTOM_ORDERS_COLLECTION, requestId), { status: "quoted", quotedPriceInPaise });
}

/** Payment initiation is server-side (Global Rule 4) — this only calls the Cloud Function. */
export async function acceptCustomOrderQuote(requestId: string): Promise<{ checkoutUrl: string }> {
  const callable = httpsCallable<{ requestId: string }, { checkoutUrl: string }>(
    functions,
    "initiatePayment"
  );
  const result = await callable({ requestId });
  return result.data;
}

export const customOrderService = {
  submitCustomOrderRequest,
  listCustomOrdersForBuyer,
  listCustomOrdersForStudio,
  getCustomOrderById,
  sendQuote,
  acceptCustomOrderQuote,
};
