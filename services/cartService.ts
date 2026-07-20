/**
 * services/cartService.ts
 * RSR-SVC-006 — Cart line-item management. Cart is stored per-session
 * under carts/{uid}/items — anonymous carts (no uid) fall back to a
 * device-local cart id stored in-memory by the caller; this service
 * assumes an already-resolved owner key is provided by useAuth.
 */

import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebaseClient";

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  priceInPaise: number;
  currency: string;
  quantity: number;
}

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("[cartService] No signed-in user for cart operation.");
  return uid;
}

export async function getCart(): Promise<CartItem[]> {
  const uid = requireUid();
  const snap = await getDocs(collection(db, "carts", uid, "items"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      productId: String(data.productId ?? ""),
      title: String(data.title ?? ""),
      imageUrl: (data.imageUrl as string | undefined) ?? null,
      priceInPaise: Number(data.priceInPaise ?? 0),
      currency: String(data.currency ?? "INR"),
      quantity: Number(data.quantity ?? 1),
    };
  });
}

export async function addToCart(input: { productId: string; quantity: number }): Promise<void> {
  const uid = requireUid();
  await setDoc(
    doc(db, "carts", uid, "items", input.productId),
    { productId: input.productId, quantity: input.quantity, addedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem[]> {
  const uid = requireUid();
  await updateDoc(doc(db, "carts", uid, "items", itemId), { quantity });
  return getCart();
}

export async function removeCartItem(itemId: string): Promise<CartItem[]> {
  const uid = requireUid();
  await deleteDoc(doc(db, "carts", uid, "items", itemId));
  return getCart();
}

export const cartService = { getCart, addToCart, updateCartItemQuantity, removeCartItem };
