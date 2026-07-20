/**
 * services/productService.ts
 * Product data access layer
 */

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  limit,
  orderBy,
  documentId,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { Product, ProductSummary, Category, Collection } from '@/types/schema';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'categories';
const COLLECTIONS_COLLECTION = 'collections';

function toProduct(id: string, data: any): Product {
  return {
    id,
    productId: data.productId || id,
    studioId: data.studioId || '',
    name: data.name || '',
    slug: data.slug || '',
    description: data.description || '',
    category: data.category || '',
    price: data.price || 0,
    salePrice: data.salePrice || null,
    heroImageUrl: data.heroImageUrl || null,
    images: data.images || [],
    videos: data.videos || [],
    inventoryMode: data.inventoryMode || 'unlimited',
    inventoryCount: data.inventoryCount || 0,
    status: data.status || 'draft',
    rating: data.rating || 0,
    reviewCount: data.reviewCount || 0,
    createdAt: data.createdAt?.toDate?.().getTime() || 0,
    updatedAt: data.updatedAt?.toDate?.().getTime() || 0,
  };
}

function toProductSummary(id: string, data: any): ProductSummary {
  return {
    id,
    name: data.name || '',
    slug: data.slug || '',
    price: data.price || 0,
    heroImageUrl: data.heroImageUrl || null,
  };
}

function toCategory(id: string, data: any): Category {
  return {
    id,
    slug: data.slug || '',
    name: data.name || '',
    description: data.description || null,
  };
}

function toCollection(id: string, data: any): Collection {
  return {
    id,
    slug: data.slug || '',
    title: data.title || '',
    description: data.description || null,
    productIds: data.productIds || [],
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toProduct(snap.docs[0].id, snap.docs[0].data());
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const q = query(collection(db, CATEGORIES_COLLECTION), where('slug', '==', slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toCategory(snap.docs[0].id, snap.docs[0].data());
}

export async function listProductsByCategory(categorySlug: string): Promise<ProductSummary[]> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('category', '==', categorySlug),
    where('status', '==', 'published')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toProductSummary(d.id, d.data()));
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const q = query(collection(db, COLLECTIONS_COLLECTION), where('slug', '==', slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toCollection(snap.docs[0].id, snap.docs[0].data());
}

export async function listProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (ids.length === 0) return [];
  
  const CHUNK_SIZE = 10;
  const results = new Map<string, ProductSummary>();
  
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where(documentId(), 'in', chunk),
      where('status', '==', 'published')
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.set(d.id, toProductSummary(d.id, d.data())));
  }
  
  return ids.map((id) => results.get(id)).filter((p): p is ProductSummary => Boolean(p));
}

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return toProduct(snap.id, snap.data());
}
