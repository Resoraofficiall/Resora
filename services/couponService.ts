/**
 * services/couponService.ts
 * RSR-SVC (Coupons — admin management, Phase 12)
 *
 * Backs app/admin/marketing/coupons/page.tsx. Coupon VALIDATION at
 * checkout time is intentionally NOT performed by this file — that
 * happens server-side inside the checkout Cloud Function so a coupon
 * can never be forged or double-applied from the client (Global Rule
 * 4). This service only covers admin CRUD.
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

export type CouponDiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number; // percentage (0-100) or paise, per discountType
  minOrderValueInPaise: number;
  maxRedemptions: number | null;
  redemptionsCount: number;
  active: boolean;
  startsAt: number;
  endsAt: number | null;
  createdAt: number;
}

export interface CouponInput {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValueInPaise: number;
  maxRedemptions: number | null;
  startsAt: number;
  endsAt: number | null;
}

const COUPONS_COLLECTION = "coupons";

function toCoupon(id: string, data: Record<string, unknown>): Coupon {
  return {
    id,
    code: String(data.code ?? ""),
    discountType: (data.discountType as CouponDiscountType) ?? "percentage",
    discountValue: Number(data.discountValue ?? 0),
    minOrderValueInPaise: Number(data.minOrderValueInPaise ?? 0),
    maxRedemptions: (data.maxRedemptions as number | null) ?? null,
    redemptionsCount: Number(data.redemptionsCount ?? 0),
    active: Boolean(data.active ?? false),
    startsAt: Number(data.startsAt ?? 0),
    endsAt: (data.endsAt as number | null) ?? null,
    createdAt: Number(data.createdAt ?? 0),
  };
}

export async function listCoupons(): Promise<Coupon[]> {
  const q = query(collection(db, COUPONS_COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCoupon(d.id, d.data()));
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const q = query(
    collection(db, COUPONS_COLLECTION),
    where("code", "==", code.toUpperCase()),
    where("active", "==", true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return toCoupon(docSnap.id, docSnap.data());
}

export async function createCoupon(input: CouponInput): Promise<string> {
  const ref = doc(collection(db, COUPONS_COLLECTION));
  await setDoc(ref, {
    ...input,
    code: input.code.toUpperCase(),
    redemptionsCount: 0,
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCoupon(couponId: string, updates: Partial<CouponInput>): Promise<void> {
  const normalized = updates.code ? { ...updates, code: updates.code.toUpperCase() } : updates;
  await updateDoc(doc(db, COUPONS_COLLECTION, couponId), normalized);
}

export async function setCouponActive(couponId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, COUPONS_COLLECTION, couponId), { active });
}

export async function deleteCoupon(couponId: string): Promise<void> {
  await deleteDoc(doc(db, COUPONS_COLLECTION, couponId));
}

export async function getCouponById(couponId: string): Promise<Coupon | null> {
  const snap = await getDoc(doc(db, COUPONS_COLLECTION, couponId));
  if (!snap.exists()) return null;
  return toCoupon(snap.id, snap.data());
}
