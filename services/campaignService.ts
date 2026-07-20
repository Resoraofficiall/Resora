/**
 * services/campaignService.ts
 * RSR-SVC (Marketing & SEO — Campaigns, Phase 12)
 *
 * Backs app/admin/marketing/campaigns/page.tsx (RSR-APP-050) and the
 * public app/campaign/[slug]/page.tsx (RSR-APP-054). Campaign
 * activation/deactivation writes are restricted to founder-role users
 * by Firestore Security Rules — this service performs the writes but
 * does not itself decide authorization (Global Rule 4).
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

export type CampaignStatus = "draft" | "scheduled" | "active" | "ended";

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  heroImageUrl: string | null;
  status: CampaignStatus;
  startsAt: number;
  endsAt: number;
  productIds: string[];
  couponCode: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CampaignInput {
  slug: string;
  title: string;
  description: string;
  heroImageUrl?: string | null;
  startsAt: number;
  endsAt: number;
  productIds: string[];
  couponCode?: string | null;
}

const CAMPAIGNS_COLLECTION = "campaigns";

function toCampaign(id: string, data: Record<string, unknown>): Campaign {
  return {
    id,
    slug: String(data.slug ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    heroImageUrl: (data.heroImageUrl as string | undefined) ?? null,
    status: (data.status as CampaignStatus) ?? "draft",
    startsAt: Number(data.startsAt ?? 0),
    endsAt: Number(data.endsAt ?? 0),
    productIds: Array.isArray(data.productIds) ? (data.productIds as string[]) : [],
    couponCode: (data.couponCode as string | undefined) ?? null,
    createdAt: Number(data.createdAt ?? 0),
    updatedAt: Number(data.updatedAt ?? 0),
  };
}

/** Admin list — every campaign regardless of status, newest first. */
export async function listCampaigns(): Promise<Campaign[]> {
  const q = query(collection(db, CAMPAIGNS_COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCampaign(d.id, d.data()));
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const snap = await getDoc(doc(db, CAMPAIGNS_COLLECTION, id));
  if (!snap.exists()) return null;
  return toCampaign(snap.id, snap.data());
}

/** Public lookup for app/campaign/[slug]/page.tsx — only ever returns an active campaign. */
export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  const q = query(
    collection(db, CAMPAIGNS_COLLECTION),
    where("slug", "==", slug),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return toCampaign(docSnap.id, docSnap.data());
}

export async function createCampaign(input: CampaignInput): Promise<string> {
  const ref = doc(collection(db, CAMPAIGNS_COLLECTION));
  await setDoc(ref, {
    ...input,
    heroImageUrl: input.heroImageUrl ?? null,
    couponCode: input.couponCode ?? null,
    status: "draft" satisfies CampaignStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCampaign(id: string, updates: Partial<CampaignInput>): Promise<void> {
  await updateDoc(doc(db, CAMPAIGNS_COLLECTION, id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function setCampaignStatus(id: string, status: CampaignStatus): Promise<void> {
  await updateDoc(doc(db, CAMPAIGNS_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, id));
}
export async function archiveCampaign(id: string): Promise<void> {
  return setCampaignStatus(id, "ended");
}
