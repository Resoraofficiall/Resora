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
import type { Studio } from "@/types/schema";

/**
 * RSR-SVC-001 — Studio data access.
 * §18.2 (Layering Rule): "No UI component calls Firestore directly.
 * Every data access goes through a services/ layer." This is the only
 * file in the codebase that should import `firebase/firestore` for
 * studios/{studioId} and followers/{id} reads/writes — StudioHero,
 * FollowButton, StoreCustomizationPanel, and any future consumer call
 * through here, never `doc`/`getDoc`/`onSnapshot` directly.
 *
 * Correction note: an earlier file in this build
 * (studio/StoreCustomizationPanel.tsx) called `updateDoc` directly on
 * studios/{studioId} — that violated §18.2 and should be updated to call
 * updateStoreCustomization() below instead, once this service exists.
 */

const STUDIOS_COLLECTION = "studios";
const FOLLOWERS_COLLECTION = "followers";

export async function getStudioBySlug(slug: string): Promise<Studio | null> {
  const q = query(
    collection(db, STUDIOS_COLLECTION),
    where("slug", "==", slug),
    where("active", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Studio;
}

export async function getStudioById(studioId: string): Promise<Studio | null> {
  const ref = doc(db, STUDIOS_COLLECTION, studioId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Studio) : null;
}

export interface ListStudiosParams {
  category?: string;
  featuredFirst?: boolean;
  pageSize?: number;
}

/**
 * §30.7 / Studio Directory (Phase 5 Step 2): studios where active: true,
 * ordered featured-first, then rating, then newest — never a hardcoded
 * array, never seed/demo/example data returned in place of a real query.
 */
export async function listActiveStudios(
  params: ListStudiosParams = {}
): Promise<Studio[]> {
  const { category, pageSize = 24 } = params;

  const constraints = [
    where("active", "==", true),
    ...(category ? [where("category", "==", category)] : []),
    orderBy("featured", "desc"),
    orderBy("rating", "desc"),
    limit(pageSize),
  ];

  const q = query(collection(db, STUDIOS_COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Studio);
}

/**
 * §30.4–§30.7 Discovery Pad / Seller Selection Gallery data source:
 * studios where status: "active" and approved: true, live from
 * Firestore. Kept as a distinct function (rather than reusing
 * listActiveStudios) since the Discovery Pad's acceptance criteria
 * explicitly call out this exact filter pair.
 */
export async function getApprovedActiveStudios(
  pageSize = 12
): Promise<Studio[]> {
  const q = query(
    collection(db, STUDIOS_COLLECTION),
    where("status", "==", "active"),
    where("approved", "==", true),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Studio);
}

/**
 * §30.5 Handwriting Seller Search: recognized text is matched against
 * studios where status: "active" and approved: true only. Firestore has
 * no native fuzzy-text match, so this fetches the approved/active set
 * and matches client-side against name (case-insensitive substring) —
 * acceptable at V1 studio-count scale per §9.1's Firestore-backed search
 * decision; swap to searchService's tokenized index if this becomes a
 * bottleneck.
 */
export async function findApprovedStudioByName(
  recognizedText: string
): Promise<Studio | null> {
  const candidates = await getApprovedActiveStudios(200);
  const needle = recognizedText.trim().toLowerCase();
  if (!needle) return null;

  const exact = candidates.find((s) => s.name.toLowerCase() === needle);
  if (exact) return exact;

  return candidates.find((s) => s.name.toLowerCase().includes(needle)) ?? null;
}

export async function followStudio(uid: string, studioId: string): Promise<void> {
  const followerRef = doc(db, FOLLOWERS_COLLECTION, `${uid}_${studioId}`);
  const studioRef = doc(db, STUDIOS_COLLECTION, studioId);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(followerRef);
    if (existing.exists()) return; // already following, no-op

    tx.set(followerRef, {
      uid,
      studioId,
      createdAt: serverTimestamp(),
    });

    const studioSnap = await tx.get(studioRef);
    const currentCount = (studioSnap.data()?.followerCount as number) ?? 0;
    tx.update(studioRef, { followerCount: currentCount + 1 });
  });
}

export async function unfollowStudio(uid: string, studioId: string): Promise<void> {
  const followerRef = doc(db, FOLLOWERS_COLLECTION, `${uid}_${studioId}`);
  const studioRef = doc(db, STUDIOS_COLLECTION, studioId);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(followerRef);
    if (!existing.exists()) return; // not following, no-op

    tx.delete(followerRef);

    const studioSnap = await tx.get(studioRef);
    const currentCount = (studioSnap.data()?.followerCount as number) ?? 0;
    tx.update(studioRef, { followerCount: Math.max(0, currentCount - 1) });
  });
}

export async function isFollowingStudio(
  uid: string,
  studioId: string
): Promise<boolean> {
  const ref = doc(db, FOLLOWERS_COLLECTION, `${uid}_${studioId}`);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * §30.8.1 Store Customization: writes the seller's chosen customization
 * values onto studios/{studioId}.storeCustomization. The allowed-options
 * lookup itself lives in getStoreCustomizationOptions() below — this
 * function only persists the seller's selection, it does not validate
 * the selection against the live option list (that's a security-rules /
 * Cloud Function server-side concern, not a client service concern).
 */
export async function updateStoreCustomization(
  studioId: string,
  customization: Record<string, unknown>
): Promise<void> {
  const { updateDoc } = await import("firebase/firestore");
  const ref = doc(db, STUDIOS_COLLECTION, studioId);
  await updateDoc(ref, {
    storeCustomization: customization,
    updatedAt: serverTimestamp(),
  });
}

/**
 * §30.8.1: reads the founder-curated option lists from
 * settings/storeCustomizationOptions. StoreCustomizationPanel.tsx should
 * subscribe via this function (or its live variant, see
 * subscribeToStoreCustomizationOptions) rather than calling
 * onSnapshot(doc(db, "settings", ...)) directly, per §18.2.
 */
export async function getStoreCustomizationOptions(): Promise<Record<
  string,
  unknown
> | null> {
  const ref = doc(db, "settings", "storeCustomizationOptions");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Live subscription variant — Founder edits in /admin/store-customization
 * (Phase 10) must reflect in the seller-facing panel without a redeploy
 * (§18.2 amendment). Returns an unsubscribe function.
 */
export function subscribeToStoreCustomizationOptions(
  onChange: (options: Record<string, unknown> | null) => void,
  onError: () => void
): () => void {
  const { onSnapshot } = require("firebase/firestore");
  const ref = doc(db, "settings", "storeCustomizationOptions");
  return onSnapshot(
    ref,
    (snap: any) => onChange(snap.exists() ? snap.data() : null),
    onError
  );
}
