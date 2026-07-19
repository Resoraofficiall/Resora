import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Message } from "@/types/schema";

/**
 * RSR-SVC-011 — Messaging data access.
 * §13.3 (Messaging Scope Rule) + §7.4: the Product Detail page (Phase 5)
 * creates/opens a thread scoped to a specific context (a custom order
 * request, per §7.4's "Seller opens private conversation thread (linked
 * 1:1 to this request)"). Messaging in V1 is scoped this way — not a
 * general-purpose open DM system between any customer and any seller —
 * so every thread here is created against a specific conversationId tied
 * back to a customOrders/{requestId}.conversationId field (Ch.6.2).
 */

const MESSAGES_COLLECTION = "messages";
const CONVERSATIONS_COLLECTION = "conversations";

/**
 * Opens (or returns the existing) conversation thread for a given custom
 * order request — 1:1 linkage per §7.4. Uses the requestId as the
 * conversation document ID directly, so "does a thread already exist"
 * is a single doc read, not a query.
 */
export async function openConversationForCustomOrder(
  requestId: string,
  customerId: string,
  studioId: string
): Promise<string> {
  const ref = doc(db, CONVERSATIONS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (snap.exists()) return requestId;

  await setDoc(ref, {
    conversationId: requestId,
    context: "customOrder",
    contextId: requestId,
    customerId,
    studioId,
    createdAt: serverTimestamp(),
  });

  return requestId;
}

export interface SendMessageParams {
  conversationId: string;
  senderUid: string;
  senderRole: "customer" | "seller" | "founder";
  body: string;
  attachmentUrls?: string[];
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
  await addDoc(collection(db, MESSAGES_COLLECTION), {
    ...params,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToConversation(
  conversationId: string,
  onChange: (messages: Message[]) => void,
  onError: () => void,
  pageSize = 100
): () => void {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc"),
    limit(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as Message)),
    onError
  );
}
