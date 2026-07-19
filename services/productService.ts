/**
 * services/productService.ts
 * RSR-SVC-002
 *
 * All product/category/collection reads go through this file — no
 * component calls Firestore directly (Blueprint §18.2). Only
 * status: "published" products are ever returned to public surfaces;
 * draft/archived products never leak into a public query result.
 */

import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceInPaise: number;
  currency: string;
  categorySlug: string;
  studioId: string;
  heroImageUrl: string | null;
  videoUrl: string | null;
  images: string[];
  status: "draft" | "published" | "archived";
  createdAt: number;
  updatedAt: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  priceInPaise: number;
  currency: string;
  heroImageUrl: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  productIds: string[];
}

const PRODUCTS_COLLECTION = "products";
const CATEGORIES_COLLECTION = "categories";
const COLLECTIONS_COLLECTION = "collections";

function toProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    slug: String(data.slug ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    priceInPaise: Number(data.priceInPaise ?? 0),
    currency: String(data.currency ?? "INR"),
    categorySlug: String(data.categorySlug ?? ""),
    studioId: String(data.studioId ?? ""),
    heroImageUrl: (data.heroImageUrl as string | undefined) ?? null,
    videoUrl: (data.videoUrl as string | undefined) ?? null,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    status: (data.status as Product["status"]) ?? "draft",
    createdAt: Number(data.createdAt ?? 0),
    updatedAt: Number(data.updatedAt ?? 0),
  };
}

function toProductSummary(id: string, data: Record<string, unknown>): ProductSummary {
  return {
    id,
    slug: String(data.slug ?? ""),
    title: String(data.title ?? ""),
    priceInPaise: Number(data.priceInPaise ?? 0),
    currency: String(data.currency ?? "INR"),
    heroImageUrl: (data.heroImageUrl as string | undefined) ?? null,
  };
}

function toCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    slug: String(data.slug ?? ""),
    name: String(data.name ?? ""),
    description: (data.description as string | undefined) ?? null,
  };
}

function toCollection(id: string, data: Record<string, unknown>): Collection {
  return {
    id,
    slug: String(data.slug ?? ""),
    title: String(data.title ?? ""),
    description: (data.description as string | undefined) ?? null,
    productIds: Array.isArray(data.productIds) ? (data.productIds as string[]) : [],
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("slug", "==", slug),
    where("status", "==", "published"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return toProduct(docSnap.id, docSnap.data());
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const q = query(collection(db, CATEGORIES_COLLECTION), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return toCategory(docSnap.id, docSnap.data());
}

export async function listProductsByCategory(categorySlug: string): Promise<ProductSummary[]> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("categorySlug", "==", categorySlug),
    where("status", "==", "published")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toProductSummary(d.id, d.data()));
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const q = query(collection(db, COLLECTIONS_COLLECTION), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return toCollection(docSnap.id, docSnap.data());
}

/**
 * Firestore's `in` operator is capped at 10 values per query, so
 * collection product-ID lists are fetched in chunks and merged,
 * preserving the original collection order (not Firestore's return
 * order, which is unspecified for `in` queries).
 */
export async function listProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (ids.length === 0) return [];

  const CHUNK_SIZE = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const results = new Map<string, ProductSummary>();
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where(documentId(), "in", chunk),
        where("status", "==", "published")
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => results.set(d.id, toProductSummary(d.id, d.data())));
    })
  );

  return ids.map((id) => results.get(id)).filter((p): p is ProductSummary => Boolean(p));
}

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return toProduct(snap.id, snap.data());
}
