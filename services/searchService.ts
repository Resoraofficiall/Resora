import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Product } from "@/types/schema";

/**
 * RSR-SVC-009 — Search + recently-viewed data access.
 * §9.1: "Firestore-backed search reading a pre-tokenized index field
 * written by a Cloud Function on every product create/update (name,
 * studio, category, collection, tags, material, lowercased and
 * tokenized)." Abstracted behind this service per §18.1 so a future
 * Algolia/Meilisearch swap only touches this file, never the Search page
 * component (Phase 5, Step 6).
 *
 * Targets: <150ms search suggestions, <500ms full results (§9.1/§18.4).
 */

const PRODUCTS_COLLECTION = "products";
const RECENTLY_VIEWED_COLLECTION = "recentlyViewed";

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Full search results — matches against the searchIndex[] field a Cloud
 * Function writes on every product create/update (Ch.9.1). Uses
 * array-contains-any against the query's tokens as the V1 Firestore-native
 * approximation of full-text search.
 */
export async function searchProducts(
  queryText: string,
  pageSize = 40
): Promise<Product[]> {
  const tokens = tokenize(queryText).slice(0, 10); // array-contains-any caps at 10 values
  if (tokens.length === 0) return [];

  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("searchIndex", "array-contains-any", tokens),
    where("status", "==", "published"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Product);
}

/** As-you-type suggestions — same index, smaller result set, prefix-biased. */
export async function getSearchSuggestions(
  queryText: string,
  maxResults = 6
): Promise<Product[]> {
  if (queryText.trim().length < 2) return [];
  const results = await searchProducts(queryText, maxResults * 3);
  return results.slice(0, maxResults);
}

/**
 * Phase 5, Step 7 — Recently Viewed. Server-synced for signed-in users
 * (visible across devices); anonymous visitors get localStorage-only,
 * since there's no account to sync to. Capped at last 20 per the spec.
 */
export function trackRecentlyViewed(productId: string, uid: string | null): void {
  if (uid) {
    void trackRecentlyViewedServer(uid, productId);
  } else if (typeof window !== "undefined") {
    trackRecentlyViewedLocal(productId);
  }
}

async function trackRecentlyViewedServer(uid: string, productId: string): Promise<void> {
  const ref = doc(db, RECENTLY_VIEWED_COLLECTION, uid);
  const snap = await getDoc(ref);
  const existing: string[] = snap.exists() ? (snap.data().productIds as string[]) ?? [] : [];

  const next = [productId, ...existing.filter((id) => id !== productId)].slice(0, 20);
  await setDoc(ref, { uid, productIds: next, updatedAt: serverTimestamp() });
}

const LOCAL_STORAGE_KEY = "resora_recently_viewed";

function trackRecentlyViewedLocal(productId: string): void {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    const next = [productId, ...existing.filter((id) => id !== productId)].slice(0, 20);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, etc.) — fail silently,
    // recently-viewed is a soft feature, never blocking.
  }
}

export async function getRecentlyViewedProductIds(uid: string | null): Promise<string[]> {
  if (uid) {
    const ref = doc(db, RECENTLY_VIEWED_COLLECTION, uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data().productIds as string[]) ?? [] : [];
  }
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
