/**
 * services/wishlistService.ts
 * RSR-SVC-007
 *
 * Wishlist reads/writes. Document ID is deterministic (`${uid}_${productId}`)
 * so add is naturally idempotent and Firestore Security Rules can check
 * ownership from the document ID alone without an extra read.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { listProductsByIds, type ProductSummary } from "@/services/productService";

const WISHLISTS_COLLECTION = "wishlists";

export interface WishlistEntry {
  id: string;
  uid: string;
  productId: string;
  createdAt: number;
}

function wishlistDocId(uid: string, productId: string): string {
  return `${uid}_${productId}`;
}

export async function addToWishlist({ uid, productId }: { uid: string; productId: string }): Promise<void> {
  await setDoc(doc(db, WISHLISTS_COLLECTION, wishlistDocId(uid, productId)), {
    uid,
    productId,
    createdAt: serverTimestamp(),
  });
}

export async function removeFromWishlist({ uid, productId }: { uid: string; productId: string }): Promise<void> {
  await deleteDoc(doc(db, WISHLISTS_COLLECTION, wishlistDocId(uid, productId)));
}

export async function isProductWishlisted({
  uid,
  productId,
}: {
  uid: string;
  productId: string;
}): Promise<boolean> {
  const snap = await getDoc(doc(db, WISHLISTS_COLLECTION, wishlistDocId(uid, productId)));
  return snap.exists();
}

export async function listWishlistedProductIds(uid: string): Promise<string[]> {
  const q = query(collection(db, WISHLISTS_COLLECTION), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => String(d.data().productId));
}

/** Resolves the user's wishlist directly into displayable product summaries. */
export async function listWishlistProducts(uid: string): Promise<ProductSummary[]> {
  const productIds = await listWishlistedProductIds(uid);
  return listProductsByIds(productIds);
}
export const wishlistServiceAll = {
  addToWishlist,
  removeFromWishlist,
  isProductWishlisted,
  listWishlistedProductIds,
  listWishlistProducts,
};
export { wishlistServiceAll as wishlistService };
