import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

/**
 * RSR-SVC-010 — CMS data access.
 * §6.2: cms/{docId} — one document per editable surface (homepage,
 * navigation, footer, theme, announcementBar), each a JSON tree of
 * ordered, typed blocks so BlockRenderer (Phase 5) can render generically.
 * Also owns settings/canvasEngineFrames (§30.9.1) and
 * settings/storeCustomizationOptions (§30.8.1) reads, since both are
 * Founder-editable config documents of the same "live, no-redeploy-needed"
 * shape as the cms/ documents.
 *
 * Correction from earlier in this build: product/CanvasFramePreview.tsx
 * and studio/StoreCustomizationPanel.tsx both called
 * onSnapshot(doc(db, "settings", ...)) directly, which violates §18.2's
 * "no UI component calls Firestore directly" rule now that this service
 * exists. Both should be updated to call
 * subscribeToCanvasEngineFrames() / subscribeToStoreCustomizationOptions()
 * below instead of importing firebase/firestore themselves.
 */

const CMS_COLLECTION = "cms";
const SETTINGS_COLLECTION = "settings";
const CACHE_TTL_MS = 60_000; // §12.2: 60s TTL for CMS content propagation

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

async function getCmsDocument<T>(docId: string): Promise<T | null> {
  const cached = cache.get(docId) as CacheEntry<T> | undefined;
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const ref = doc(db, CMS_COLLECTION, docId);
  const snap = await getDoc(ref);
  const value = snap.exists() ? (snap.data() as T) : null;

  if (value !== null) {
    cache.set(docId, { value, fetchedAt: Date.now() });
  }
  return value;
}

export interface CmsBlock {
  type: string;
  order: number;
  visible: boolean;
  data: Record<string, unknown>;
}

export interface CmsHomepageDoc {
  blocks: CmsBlock[];
}

/**
 * Phase 5, Step 1: reads cms/homepage with a short CDN/ISR-equivalent
 * cache (60s TTL per §12.2) — a Founder edit propagates within that
 * window without requiring a redeploy.
 */
export async function getHomepageCms(): Promise<CmsHomepageDoc | null> {
  return getCmsDocument<CmsHomepageDoc>("homepage");
}

export async function getNavigationCms(): Promise<Record<string, unknown> | null> {
  return getCmsDocument("navigation");
}

export async function getFooterCms(): Promise<Record<string, unknown> | null> {
  return getCmsDocument("footer");
}

export async function getThemeCms(): Promise<Record<string, unknown> | null> {
  return getCmsDocument("theme");
}

export async function getAnnouncementBarCms(): Promise<Record<string, unknown> | null> {
  return getCmsDocument("announcementBar");
}

/** §30.9.1: category → frame preset config, Founder-editable via /admin/canvas-engine. */
export async function getCanvasEngineFrames(): Promise<Record<string, unknown> | null> {
  const ref = doc(db, SETTINGS_COLLECTION, "canvasEngineFrames");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export function subscribeToCanvasEngineFrames(
  onChange: (data: Record<string, unknown> | null) => void,
  onError: () => void
): () => void {
  const ref = doc(db, SETTINGS_COLLECTION, "canvasEngineFrames");
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? snap.data() : null),
    onError
  );
}

/** §30.8.1: founder-curated store customization option lists. */
export async function getStoreCustomizationOptions(): Promise<Record<string, unknown> | null> {
  const ref = doc(db, SETTINGS_COLLECTION, "storeCustomizationOptions");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export function subscribeToStoreCustomizationOptions(
  onChange: (data: Record<string, unknown> | null) => void,
  onError: () => void
): () => void {
  const ref = doc(db, SETTINGS_COLLECTION, "storeCustomizationOptions");
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? snap.data() : null),
    onError
  );
}

/** Invalidates the in-memory CMS cache — useful after an admin save in the same session. */
export function invalidateCmsCache(docId?: string): void {
  if (docId) {
    cache.delete(docId);
  } else {
    cache.clear();
  }
}
