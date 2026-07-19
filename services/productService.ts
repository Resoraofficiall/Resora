import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Product } from "@/types/schema";
import type { ProductSort } from "@/category/CategoryGrid";

/**
 * RSR-SVC-002 — Product data access.
 * §18.2: sole owner of Firestore reads/writes against products/{id}.
 * ProductDetail.tsx, CategoryGrid.tsx, CollectionGrid.tsx all call
 * through here rather than importing firebase/firestore directly.
 *
 * Only `status: "published"` products are ever returned to public-facing
 * callers (draft/pendingReview/hidden/archived/suspended are excluded),
 * per the products status enum in Ch.6.2.
 */

const PRODUCTS_COLLECTION = "products";
const PUBLISHED = "published" as const;

function applySort(baseQuery: any, sort: ProductSort) {
  switch (sort) {
    case "newest":
      return query(baseQuery, orderBy("createdAt", "desc"));
    case "priceLowHigh":
      return query(baseQuery, orderBy("price", "asc"));
    case "priceHighLow":
      return query(baseQuery, orderBy("price", "desc"));
    case "rating":
      return query(baseQuery, orderBy("rating", "desc"));
    case "featured":
    default:
      return query(baseQuery, orderBy("featured", "desc"), orderBy("salesCount", "desc"));
  }
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("slug", "==", slug),
    where("status", "==", PUBLISHED),
    fsLimit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Product;
}

export async function getProductById(productId: string): Promise<Product | null> {
  const ref = doc(db, PRODUCTS_COLLECTION, productId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as Product) : null;
  return data && data.status === PUBLISHED ? data : null;
}

export interface GetProductsByCategoryParams {
  categorySlug: string;
  sort: ProductSort;
  page: number;
  pageSize: number;
}

export async function getProductsByCategory({
  categorySlug,
  sort,
  page,
  pageSize,
}: GetProductsByCategoryParams): Promise<PaginatedResult<Product>> {
  let base = query(
    collection(db, PRODUCTS_COLLECTION),
    where("category", "==", categorySlug),
    where("status", "==", PUBLISHED)
  );
  base = applySort(base, sort);
  base = query(base, fsLimit(pageSize * page));

  const snap = await getDocs(base);
  const all = snap.docs.map((d) => d.data() as Product);
  const items = all.slice((page - 1) * pageSize, page * pageSize);

  return { items, hasMore: all.length === pageSize * page };
}

export interface GetProductsByCollectionParams {
  collectionId: string;
  sort: ProductSort;
  page: number;
  pageSize: number;
}

export async function getProductsByCollection({
  collectionId,
  sort,
  page,
  pageSize,
}: GetProductsByCollectionParams): Promise<PaginatedResult<Product>> {
  let base = query(
    collection(db, PRODUCTS_COLLECTION),
    where("collectionIds", "array-contains", collectionId),
    where("status", "==", PUBLISHED)
  );
  base = applySort(base, sort);
  base = query(base, fsLimit(pageSize * page));

  const snap = await getDocs(base);
  const all = snap.docs.map((d) => d.data() as Product);
  const items = all.slice((page - 1) * pageSize, page * pageSize);

  return { items, hasMore: all.length === pageSize * page };
}

export interface GetRelatedProductsParams {
  productId: string;
  category: string;
  collectionIds: string[];
  studioId: string;
  limit: number;
}

/**
 * Rule-based related products per Blueprint §14 ("rule-based, not ML").
 * Priority: same collection > same category, same studio > same
 * category, any studio. Never recommends the product itself.
 */
export async function getRelatedProducts({
  productId,
  category,
  collectionIds,
  studioId,
  limit: maxResults,
}: GetRelatedProductsParams): Promise<Product[]> {
  const results: Product[] = [];
  const seen = new Set<string>([productId]);

  async function fill(q: ReturnType<typeof query>) {
    if (results.length >= maxResults) return;
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const p = d.data() as Product;
      if (seen.has(p.productId)) continue;
      seen.add(p.productId);
      results.push(p);
      if (results.length >= maxResults) return;
    }
  }

  if (collectionIds.length > 0) {
    await fill(
      query(
        collection(db, PRODUCTS_COLLECTION),
        where("collectionIds", "array-contains-any", collectionIds.slice(0, 10)),
        where("status", "==", PUBLISHED),
        fsLimit(maxResults * 2)
      )
    );
  }

  if (results.length < maxResults) {
    await fill(
      query(
        collection(db, PRODUCTS_COLLECTION),
        where("category", "==", category),
        where("studioId", "==", studioId),
        where("status", "==", PUBLISHED),
        fsLimit(maxResults * 2)
      )
    );
  }

  if (results.length < maxResults) {
    await fill(
      query(
        collection(db, PRODUCTS_COLLECTION),
        where("category", "==", category),
        where("status", "==", PUBLISHED),
        fsLimit(maxResults * 2)
      )
    );
  }

  return results.slice(0, maxResults);
}

/**
 * Increments viewCount — called by ProductDetail on mount. Fire-and-forget
 * semantics are acceptable here (view counts are a soft metric, not a
 * source of truth for anything financial), unlike inventory decrements
 * which must go through the server-verified order webhook only.
 */
export async function incrementProductView(productId: string): Promise<void> {
  const { updateDoc, increment } = await import("firebase/firestore");
  const ref = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(ref, { viewCount: increment(1) }).catch(() => {
    // best-effort — a failed view-count increment should never surface
    // to the user or block page render
  });
}
