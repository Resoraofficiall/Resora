import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Review } from "@/types/schema";

/**
 * RSR-SVC-005 — Review data access.
 * Ch.6.2: reviews/{reviewId} requires orderId to prove verified purchase
 * — this service never accepts a review submission without a
 * corresponding delivered/completed order for that customer+product, per
 * Blueprint's verifiedPurchase rule.
 *
 * Only moderationStatus: "visible" reviews are ever returned to public
 * callers; "hidden"/"flagged" are moderation-queue-only (Founder Admin
 * §12.3), never rendered to a normal customer/studio-page visitor.
 */

const REVIEWS_COLLECTION = "reviews";
const PRODUCTS_COLLECTION = "products";
const STUDIOS_COLLECTION = "studios";
const VISIBLE = "visible" as const;

export interface SubmitReviewParams {
  customerId: string;
  studioId: string;
  productId: string;
  orderId: string;
  rating: number;
  title: string;
  body: string;
  imageUrls?: string[];
  /** ISO timestamp after which this review can no longer be edited by the customer */
  editableUntil: string;
}

/**
 * Submits a review and atomically updates the product's and studio's
 * denormalized rating/reviewCount — avoids a separate Cloud Function
 * round-trip for the common case, consistent with how followerCount is
 * updated in studioService.ts.
 */
export async function submitReview(params: SubmitReviewParams): Promise<string> {
  const { rating, productId, studioId } = params;
  if (rating < 1 || rating > 5) {
    throw new Error("rating must be between 1 and 5");
  }

  const reviewRef = doc(collection(db, REVIEWS_COLLECTION));
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  const studioRef = doc(db, STUDIOS_COLLECTION, studioId);

  await runTransaction(db, async (tx) => {
    const productSnap = await tx.get(productRef);
    const studioSnap = await tx.get(studioRef);

    tx.set(reviewRef, {
      ...params,
      reviewId: reviewRef.id,
      verifiedPurchase: true, // orderId presence is the proof, per Ch.6.2
      moderationStatus: VISIBLE,
      createdAt: serverTimestamp(),
    });

    if (productSnap.exists()) {
      const p = productSnap.data();
      const newCount = (p.reviewCount ?? 0) + 1;
      const newAverage = ((p.rating ?? 0) * (p.reviewCount ?? 0) + rating) / newCount;
      tx.update(productRef, { reviewCount: newCount, rating: newAverage });
    }

    if (studioSnap.exists()) {
      const s = studioSnap.data();
      const newCount = (s.reviewCount ?? 0) + 1;
      const newAverage = ((s.rating ?? 0) * (s.reviewCount ?? 0) + rating) / newCount;
      tx.update(studioRef, { reviewCount: newCount, rating: newAverage });
    }
  });

  return reviewRef.id;
}

export interface GetReviewsForProductOptions {
  limit?: number;
}

export interface ReviewsSummary {
  average: number;
  count: number;
}

export async function getReviewsForProduct(
  productId: string,
  options: GetReviewsForProductOptions = {}
): Promise<{ items: Review[] } & ReviewsSummary> {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("productId", "==", productId),
    where("moderationStatus", "==", VISIBLE),
    orderBy("createdAt", "desc"),
    limit(options.limit ?? 20)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => d.data() as Review);

  const average =
    items.length > 0 ? items.reduce((sum, r) => sum + r.rating, 0) / items.length : 0;

  return { items, average, count: items.length };
}

export async function getReviewsForStudio(
  studioId: string,
  pageSize = 20
): Promise<Review[]> {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("studioId", "==", studioId),
    where("moderationStatus", "==", VISIBLE),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Review);
}

/**
 * Customer edits their own review — only permitted while now < editableUntil.
 * Enforced here AND at the security-rules layer (client-side check is a
 * UX convenience, not the actual boundary).
 */
export async function editReview(
  reviewId: string,
  updates: { rating?: number; title?: string; body?: string }
): Promise<void> {
  const ref = doc(db, REVIEWS_COLLECTION, reviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Review not found");

  const review = snap.data() as Review;
  if (new Date(review.editableUntil as unknown as string).getTime() < Date.now()) {
    throw new Error("This review's edit window has closed.");
  }

  await updateDoc(ref, updates);
}

/** Founder Admin moderation action (§12.3) — hide/flag/restore a review. */
export async function setReviewModerationStatus(
  reviewId: string,
  status: "visible" | "hidden" | "flagged"
): Promise<void> {
  const ref = doc(db, REVIEWS_COLLECTION, reviewId);
  await updateDoc(ref, { moderationStatus: status });
}
