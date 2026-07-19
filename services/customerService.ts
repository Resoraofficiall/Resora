/**
 * services/customerService.ts
 * RSR-SVC (Customer Dashboard — profile, addresses, saved studios,
 * recently viewed, loyalty stub per §11.2)
 *
 * Backs the /account/* surfaces. Loyalty is schema-present but
 * feature-inactive in V1 (Blueprint §6.1 "reserved but inactive") —
 * getLoyaltyStatus returns the stored ledger balance if one exists,
 * never a fabricated number.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { listProductsByIds, type ProductSummary } from "@/services/productService";

export interface CustomerProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
}

export interface Address {
  id: string;
  uid: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

export interface SavedStudioSummary {
  id: string;
  slug: string;
  name: string;
  heroImageUrl: string | null;
}

export interface LoyaltyStatus {
  uid: string;
  pointsBalance: number;
  lifetimePoints: number;
}

const USERS_COLLECTION = "users";
const ADDRESSES_COLLECTION = "addresses";
const FOLLOWERS_COLLECTION = "followers";
const STUDIOS_COLLECTION = "studios";
const RECENTLY_VIEWED_COLLECTION = "recentlyViewed";
const LOYALTY_LEDGER_COLLECTION = "loyaltyLedger";

export async function getCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: String(data.displayName ?? ""),
    email: String(data.email ?? ""),
    phone: (data.phone as string | undefined) ?? null,
    photoUrl: (data.photoUrl as string | undefined) ?? null,
  };
}

export async function updateCustomerProfile(
  uid: string,
  updates: Partial<Pick<CustomerProfile, "displayName" | "phone" | "photoUrl">>
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function listAddresses(uid: string): Promise<Address[]> {
  const q = query(collection(db, ADDRESSES_COLLECTION), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: String(data.uid),
      label: String(data.label ?? "Address"),
      fullName: String(data.fullName ?? ""),
      line1: String(data.line1 ?? ""),
      line2: (data.line2 as string | undefined) ?? null,
      city: String(data.city ?? ""),
      state: String(data.state ?? ""),
      postalCode: String(data.postalCode ?? ""),
      phone: String(data.phone ?? ""),
      isDefault: Boolean(data.isDefault ?? false),
    };
  });
}

export async function addAddress(uid: string, address: Omit<Address, "id" | "uid">): Promise<string> {
  const ref = doc(collection(db, ADDRESSES_COLLECTION));
  await setDoc(ref, {
    uid,
    ...address,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAddress(addressId: string, updates: Partial<Omit<Address, "id" | "uid">>): Promise<void> {
  await updateDoc(doc(db, ADDRESSES_COLLECTION, addressId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAddress(addressId: string): Promise<void> {
  await deleteDoc(doc(db, ADDRESSES_COLLECTION, addressId));
}

export async function listSavedStudios(uid: string): Promise<SavedStudioSummary[]> {
  const followQuery = query(collection(db, FOLLOWERS_COLLECTION), where("uid", "==", uid));
  const followSnap = await getDocs(followQuery);
  const studioIds = followSnap.docs.map((d) => String(d.data().studioId));
  if (studioIds.length === 0) return [];

  const results = await Promise.all(
    studioIds.map(async (studioId) => {
      const studioSnap = await getDoc(doc(db, STUDIOS_COLLECTION, studioId));
      if (!studioSnap.exists()) return null;
      const data = studioSnap.data();
      return {
        id: studioSnap.id,
        slug: String(data.slug ?? ""),
        name: String(data.name ?? ""),
        heroImageUrl: (data.heroImageUrl as string | undefined) ?? null,
      } satisfies SavedStudioSummary;
    })
  );

  return results.filter((s): s is SavedStudioSummary => s !== null);
}

export async function listRecentlyViewed(uid: string, max = 20): Promise<ProductSummary[]> {
  const q = query(
    collection(db, RECENTLY_VIEWED_COLLECTION, uid, "items"),
    orderBy("viewedAt", "desc")
  );
  const snap = await getDocs(q);
  const productIds = snap.docs.slice(0, max).map((d) => String(d.data().productId));
  return listProductsByIds(productIds);
}

export async function recordRecentlyViewed(uid: string, productId: string): Promise<void> {
  await setDoc(doc(db, RECENTLY_VIEWED_COLLECTION, uid, "items", productId), {
    productId,
    viewedAt: serverTimestamp(),
  });
}

export async function getLoyaltyStatus(uid: string): Promise<LoyaltyStatus> {
  const snap = await getDoc(doc(db, LOYALTY_LEDGER_COLLECTION, uid));
  if (!snap.exists()) {
    return { uid, pointsBalance: 0, lifetimePoints: 0 };
  }
  const data = snap.data();
  return {
    uid,
    pointsBalance: Number(data.pointsBalance ?? 0),
    lifetimePoints: Number(data.lifetimePoints ?? 0),
  };
}
