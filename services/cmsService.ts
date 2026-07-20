/**
 * services/cmsService.ts
 * RSR-SVC-010 — CMS content: homepage blocks, footer, categories,
 * collections, corporate leads intake. Full replacement — consolidates
 * every export referenced across app/page.tsx, components/Footer.tsx,
 * app/corporate/page.tsx, app/admin/cms, app/admin/categories,
 * app/admin/collections.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export interface HomepageBlock {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  order: number;
  data: Record<string, unknown>;
}

export interface FooterLink {
  label: string;
  href: string;
}
export interface FooterLinkGroup {
  id: string;
  title: string;
  links: FooterLink[];
}
export interface FooterContent {
  linkGroups: FooterLinkGroup[];
  newsletter: { heading: string; subtext: string; placeholder: string; ctaLabel: string } | null;
  social: { label: string; href: string }[];
  legalText: string;
}

export interface CmsCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}
export interface CmsCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  productIds: string[];
}

const CMS_COLLECTION = "cms";
const CATEGORIES_COLLECTION = "categories";
const COLLECTIONS_COLLECTION = "collections";
const CORPORATE_LEADS_COLLECTION = "corporateLeads";

export async function getCmsDocument(docId: string): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, CMS_COLLECTION, docId));
  return snap.exists() ? snap.data() : null;
}

export async function updateCmsDocument(docId: string, updates: Record<string, unknown>): Promise<void> {
  await setDoc(
    doc(db, CMS_COLLECTION, docId),
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getOrderedEnabledBlocks(): Promise<HomepageBlock[]> {
  const data = await getCmsDocument("home");
  const blocks = (data?.blocks as HomepageBlock[] | undefined) ?? [];
  return blocks.filter((b) => b.enabled).sort((a, b) => a.order - b.order);
}

/** Alias kept for pages that call getHomepageBlocks directly. */
export async function getHomepageBlocks(): Promise<HomepageBlock[]> {
  return getOrderedEnabledBlocks();
}

export async function toggleHomepageBlock(blockId: string, enabled: boolean): Promise<void> {
  const data = await getCmsDocument("home");
  const blocks = (data?.blocks as HomepageBlock[] | undefined) ?? [];
  const updated = blocks.map((b) => (b.id === blockId ? { ...b, enabled } : b));
  await updateCmsDocument("home", { blocks: updated });
}

export async function reorderHomepageBlocks(orderedBlockIds: string[]): Promise<void> {
  const data = await getCmsDocument("home");
  const blocks = (data?.blocks as HomepageBlock[] | undefined) ?? [];
  const updated = blocks.map((b) => ({
    ...b,
    order: orderedBlockIds.indexOf(b.id) === -1 ? b.order : orderedBlockIds.indexOf(b.id),
  }));
  await updateCmsDocument("home", { blocks: updated });
}

export async function getFooterContent(): Promise<FooterContent> {
  const data = await getCmsDocument("footer");
  return {
    linkGroups: (data?.linkGroups as FooterLinkGroup[] | undefined) ?? [],
    newsletter: (data?.newsletter as FooterContent["newsletter"]) ?? null,
    social: (data?.social as FooterContent["social"]) ?? [],
    legalText: String(data?.legalText ?? "© Resora"),
  };
}

export async function updateFooterContent(updates: Partial<FooterContent>): Promise<void> {
  await updateCmsDocument("footer", updates);
}

export async function listCategories(): Promise<CmsCategory[]> {
  const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      slug: String(data.slug ?? ""),
      name: String(data.name ?? ""),
      description: (data.description as string | undefined) ?? null,
    };
  });
}

export async function createCategory(input: Omit<CmsCategory, "id">): Promise<string> {
  const ref = doc(collection(db, CATEGORIES_COLLECTION));
  await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateCategory(id: string, updates: Partial<Omit<CmsCategory, "id">>): Promise<void> {
  await updateDoc(doc(db, CATEGORIES_COLLECTION, id), updates);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
}

export async function listCollections(): Promise<CmsCollection[]> {
  const snap = await getDocs(collection(db, COLLECTIONS_COLLECTION));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      slug: String(data.slug ?? ""),
      title: String(data.title ?? ""),
      description: (data.description as string | undefined) ?? null,
      productIds: Array.isArray(data.productIds) ? (data.productIds as string[]) : [],
    };
  });
}

export async function createCollection(input: Omit<CmsCollection, "id">): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS_COLLECTION));
  await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateCollection(id: string, updates: Partial<Omit<CmsCollection, "id">>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS_COLLECTION, id), updates);
}

export async function deleteCollection(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS_COLLECTION, id));
}

export interface CorporateLeadInput {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  estimatedQuantity: number;
  occasion: string;
}

export async function submitCorporateLead(input: CorporateLeadInput): Promise<void> {
  const ref = doc(collection(db, CORPORATE_LEADS_COLLECTION));
  await setDoc(ref, { ...input, status: "new", createdAt: serverTimestamp() });
}

/** Namespace object — some admin pages import `cmsService` as a whole. */
export const cmsService = {
  getCmsDocument,
  updateCmsDocument,
  getOrderedEnabledBlocks,
  getHomepageBlocks,
  toggleHomepageBlock,
  reorderHomepageBlocks,
  getFooterContent,
  updateFooterContent,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  submitCorporateLead,
};
