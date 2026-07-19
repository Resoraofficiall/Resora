/**
 * services/adminService.ts
 * RSR-SVC (Founder Admin Panel — seller approval, product moderation,
 * order oversight, role management, audit logs, Phase 10)
 *
 * Every mutation here is security-critical (approving a seller sets a
 * custom claim, changing a role grants elevated access) and MUST be
 * backed by Firestore Security Rules restricting these collections to
 * founder-role writers, and in the seller-approval case, actually
 * performed via a Cloud Function callable (RSR-FBS-004
 * onSellerApproved) rather than a direct client write — this service
 * calls that callable rather than writing the approval fields itself
 * (Global Rule 4).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebaseClient";

export interface SellerApplication {
  id: string;
  uid: string;
  businessName: string;
  primaryCategory: string;
  artistStory: string;
  yearsOfExperience: number;
  portfolioUrl: string | null;
  contactPhone: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
}

export interface AdminProductRow {
  id: string;
  title: string;
  studioId: string;
  status: "draft" | "published" | "archived";
  flagged: boolean;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  buyerId: string;
  status: string;
  totalInPaise: number;
  currency: string;
  createdAt: number;
}

export interface ReviewModerationRow {
  id: string;
  productId: string;
  authorUid: string;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  action: string;
  targetId: string;
  targetType: string;
  createdAt: number;
  metadata: Record<string, unknown>;
}

const SELLER_APPLICATIONS_COLLECTION = "studioApplications";
const PRODUCTS_COLLECTION = "products";
const ORDERS_COLLECTION = "orders";
const REVIEWS_COLLECTION = "reviews";
const AUDIT_LOGS_COLLECTION = "auditLogs";
const USERS_COLLECTION = "users";

export async function listSellerApplications(
  status: SellerApplication["status"] = "pending"
): Promise<SellerApplication[]> {
  const q = query(
    collection(db, SELLER_APPLICATIONS_COLLECTION),
    where("status", "==", status),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: String(data.uid ?? ""),
      businessName: String(data.businessName ?? ""),
      primaryCategory: String(data.primaryCategory ?? ""),
      artistStory: String(data.artistStory ?? ""),
      yearsOfExperience: Number(data.yearsOfExperience ?? 0),
      portfolioUrl: (data.portfolioUrl as string | undefined) ?? null,
      contactPhone: String(data.contactPhone ?? ""),
      status: (data.status as SellerApplication["status"]) ?? "pending",
      submittedAt: Number(data.submittedAt ?? 0),
    };
  });
}

/**
 * Approving a seller is NOT a direct Firestore write from this service —
 * it invokes the onSellerApproved Cloud Function callable, which
 * performs the full 9-step provisioning (Blueprint §3.3: set custom
 * claim, create studio doc, etc.) atomically server-side.
 */
export async function approveSellerApplication(applicationId: string): Promise<void> {
  const callable = httpsCallable<{ applicationId: string }, { success: boolean }>(
    functions,
    "onSellerApproved"
  );
  await callable({ applicationId });
}

export async function rejectSellerApplication(applicationId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, SELLER_APPLICATIONS_COLLECTION, applicationId), {
    status: "rejected",
    rejectionReason: reason,
  });
}

export async function listAllProducts(): Promise<AdminProductRow[]> {
  const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: String(data.title ?? ""),
      studioId: String(data.studioId ?? ""),
      status: (data.status as AdminProductRow["status"]) ?? "draft",
      flagged: Boolean(data.flagged ?? false),
    };
  });
}

export async function moderateProduct(
  productId: string,
  action: "publish" | "unpublish" | "archive"
): Promise<void> {
  const statusMap: Record<typeof action, AdminProductRow["status"]> = {
    publish: "published",
    unpublish: "draft",
    archive: "archived",
  };
  await updateDoc(doc(db, PRODUCTS_COLLECTION, productId), { status: statusMap[action] });
}

export async function listAllOrders(max = 100): Promise<AdminOrderRow[]> {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orderNumber: String(data.orderNumber ?? ""),
      buyerId: String(data.buyerId ?? ""),
      status: String(data.status ?? ""),
      totalInPaise: Number(data.totalInPaise ?? 0),
      currency: String(data.currency ?? "INR"),
      createdAt: Number(data.createdAt ?? 0),
    };
  });
}

export async function listReviewsForModeration(
  status: ReviewModerationRow["status"] = "pending"
): Promise<ReviewModerationRow[]> {
  const q = query(collection(db, REVIEWS_COLLECTION), where("status", "==", status));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      productId: String(data.productId ?? ""),
      authorUid: String(data.authorUid ?? ""),
      rating: Number(data.rating ?? 0),
      body: String(data.body ?? ""),
      status: (data.status as ReviewModerationRow["status"]) ?? "pending",
    };
  });
}

export async function moderateReview(
  reviewId: string,
  decision: "approved" | "rejected"
): Promise<void> {
  await updateDoc(doc(db, REVIEWS_COLLECTION, reviewId), { status: decision });
}

/** Assigns a role via a Cloud Function callable so the custom claim is set server-side, never client-side (Global Rule 4). */
export async function assignRole(uid: string, role: "customer" | "seller" | "founder" | "admin"): Promise<void> {
  const callable = httpsCallable<{ uid: string; role: string }, { success: boolean }>(
    functions,
    "setCustomClaims"
  );
  await callable({ uid, role });
}

export async function getUserRole(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return String(snap.data().role ?? "customer");
}

export async function listAuditLogs(max = 100): Promise<AuditLogEntry[]> {
  const q = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy("createdAt", "desc"), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      actorUid: String(data.actorUid ?? ""),
      action: String(data.action ?? ""),
      targetId: String(data.targetId ?? ""),
      targetType: String(data.targetType ?? ""),
      createdAt: Number(data.createdAt ?? 0),
      metadata: (data.metadata as Record<string, unknown>) ?? {},
    };
  });
}
