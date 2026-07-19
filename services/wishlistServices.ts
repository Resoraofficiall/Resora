import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Product } from "@/types/schema";

/**
 * RSR-SVC-007 — Wishlist data access.
 * Ch.6.1 lists `wishlists` as an active V1 collection; Ch.6.2's
 * users/{uid} schema carries a denormalized wishlistCount. This service
 * keeps a per-customer wishlists/{uid} document (subcollection-free,
 * matching the carts/{uid} single-document pattern in cartService.ts for
 * consistency) with a productIds[] array, and keeps
 * products/{id}.wishlistCount + users/{uid}.wishlistCount in sync via
 * transaction, mirroring the follow/unfollow counter pattern in
 * studioService.ts.
 */

const WISHLISTS_COLLECTION = "wishlists";
const PRODUCTS_COLLECTION = "products";
const USERS_COLLECTION = "users";

interface WishlistDoc {
  uid: string;
  productIds: string[];
  updatedAt: unknown;
}

export async function isWishlisted(uid: string, productId: string): Promise<boolean> {
  const ref = doc(db, WISHLISTS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  return ((snap.data() as WishlistDoc).productIds ?? []).includes(productId);
}

export async function toggleWishlist(
  uid: string,
  productId: string,
  next: boolean
): Promise<void> {
  const wishlistRef = doc(db, WISHLISTS_COLLECTION, uid);
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  const userRef = doc(db, USERS_COLLECTION, uid);

  await runTransaction(db, async (tx) => {
    const wishlistSnap = await tx.get(wishlistRef);
    const existing: WishlistDoc = wishlistSnap.exists()
      ? (wishlistSnap.data() as WishlistDoc)
      : { uid, productIds: [], updatedAt: null };

    const alreadyIn = existing.productIds.includes(productId);
    if (next === alreadyIn) return; // no-op, state already matches

    const productIds = next
      ? [...existing.productIds, productId]
      : existing.productIds.filter((id) => id !== productId);

    tx.set(wishlistRef, { uid, productIds, updatedAt: serverTimestamp() });

    const productSnap = await tx.get(productRef);
    if (productSnap.exists()) {
      const current = (productSnap.data().wishlistCount as number) ?? 0;
      tx.update(productRef, {
        wishlistCount: Math.max(0, current + (next ? 1 : -1)),
      });
    }

    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      const current = (userSnap.data().wishlistCount as number) ?? 0;
      tx.update(userRef, {
        wishlistCount: Math.max(0, current + (next ? 1 : -1)),
      });
    }
  });
}

export async function getWishlistProductIds(uid: string): Promise<string[]> {
  const ref = doc(db, WISHLISTS_COLLECTION, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as WishlistDoc).productIds ?? [] : [];
}

/**
 * Resolves the customer's wishlisted product IDs into full Product
 * documents for /account/wishlist. Firestore's `in` operator caps at 30
 * values per query — chunk accordingly rather than assuming small lists.
 */
export async function getWishlistedProducts(uid: string): Promise<Product[]> {
  const productIds = await getWishlistProductIds(uid);
  if (productIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < productIds.length; i += 30) {
    chunks.push(productIds.slice(i, i + 30));
  }

  const results: Product[] = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where("productId", "in", chunk),
      where("status", "==", "published")
    );
    const snap = await getDocs(q);
    results.push(...snap.docs.map((d) => d.data() as Product));
  }
  return results;
}
