/**
 * services/studioService.ts
 * RSR-SVC-004 — Studio profile reads, seller application submission,
 * studio-admin profile management.
 */

import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export interface Studio {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  heroImageUrl: string | null;
  primaryCategory: string;
  status: "active" | "suspended";
  approved: boolean;
}

export interface StudioSummary {
  id: string;
  slug: string;
  name: string;
  heroImageUrl: string | null;
  primaryCategory: string;
}

const STUDIOS_COLLECTION = "studios";
const APPLICATIONS_COLLECTION = "studioApplications";

function toStudio(id: string, data: Record<string, unknown>): Studio {
  return {
    id,
    slug: String(data.slug ?? ""),
    name: String(data.name ?? ""),
    tagline: String(data.tagline ?? ""),
    heroImageUrl: (data.heroImageUrl as string | undefined) ?? null,
    primaryCategory: String(data.primaryCategory ?? ""),
    status: (data.status as Studio["status"]) ?? "active",
    approved: Boolean(data.approved ?? false),
  };
}

export async function getStudioBySlug(slug: string): Promise<Studio | null> {
  const q = query(collection(db, STUDIOS_COLLECTION), where("slug", "==", slug), where("approved", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toStudio(snap.docs[0].id, snap.docs[0].data());
}

export async function listActiveStudios(): Promise<StudioSummary[]> {
  const q = query(collection(db, STUDIOS_COLLECTION), where("status", "==", "active"), where("approved", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      slug: String(data.slug ?? ""),
      name: String(data.name ?? ""),
      heroImageUrl: (data.heroImageUrl as string | undefined) ?? null,
      primaryCategory: String(data.primaryCategory ?? ""),
    };
  });
}

export async function listStudiosByIds(ids: string[]): Promise<StudioSummary[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, STUDIOS_COLLECTION, id));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        slug: String(data.slug ?? ""),
        name: String(data.name ?? ""),
        heroImageUrl: (data.heroImageUrl as string | undefined) ?? null,
        primaryCategory: String(data.primaryCategory ?? ""),
      } satisfies StudioSummary;
    })
  );
  return results.filter((s): s is StudioSummary => s !== null);
}

export interface SellerApplicationInput {
  uid: string;
  businessName: string;
  primaryCategory: string;
  artistStory: string;
  yearsOfExperience: number;
  portfolioUrl?: string;
  contactPhone: string;
}

export async function submitSellerApplication(input: SellerApplicationInput): Promise<void> {
  const ref = doc(collection(db, APPLICATIONS_COLLECTION));
  await setDoc(ref, { ...input, status: "pending", submittedAt: Date.now() });
}

export async function getStudioProfile(studioId: string): Promise<Studio | null> {
  const snap = await getDoc(doc(db, STUDIOS_COLLECTION, studioId));
  if (!snap.exists()) return null;
  return toStudio(snap.id, snap.data());
}

export async function updateStudioProfile(studioId: string, updates: Partial<Studio>): Promise<void> {
  await updateDoc(doc(db, STUDIOS_COLLECTION, studioId), updates);
}

export const studioService = {
  getStudioBySlug,
  listActiveStudios,
  listStudiosByIds,
  submitSellerApplication,
  getStudioProfile,
  updateStudioProfile,
};
