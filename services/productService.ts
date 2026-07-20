/**
 * services/productService.ts
 * Product data access layer
 * Imports from: lib/firebaseClient.ts, types/schema.ts
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
    name: data.name || data.title || '',
    slug: data.slug || '',
    title: data.title || data.name || '',
    description: data.description || '',
    category: data.category || '',
    categorySlug: data.categorySlug || data.category || '',
    price: data.price || 0,
    priceInPaise: data.priceInPaise || data.price || 0,
    salePrice: data.salePrice || null,
    currency: data.currency || 'INR',
    heroImageUrl: data.heroImageUrl || null,
    images: Array.isArray(data.images) ? data.images : [],
    videos: Array.isArray(data.videos) ? data.videos : [],
    materials: data.materials || undefined,
    dimensions: data.dimensions || undefined,
    weight: data.weight || undefined,
    productionTimeDays: data.productionTimeDays || undefined,
    shippingTimeDays: data.shippingTimeDays || undefined,
    story: data.story || undefined,
    inventoryMode: data.inventoryMode || 'unlimited',
    inventoryCount: data.inventoryCount || 0,
    status: data.status || 'draft',
    rating: data.rating || 0,
    reviewCount: data.reviewCount || 0,
    collectionIds: data.collectionIds || [],
    flagged: data.flagged || false,
    createdAt: data.createdAt?.toDate?.().getTime() || Date.now(),
    updatedAt: data.updatedAt?.toDate?.().getTime() || Date.now(),
  };
}

function toProductSummary(id: string, data: any): ProductSummary {
  return {
    id,
    name: data.name || data.title || '',
    title: data.title || data.name || '',
    slug: data.slug || '',
    price: data.price || 0,
    priceInPaise: data.priceInPaise || data.price || 0,
    heroImageUrl: data.heroImageUrl || null,
    description: data.description || undefined,
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
    productIds: Array.isArray(data.productIds) ? data.productIds : [],
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('slug', '==', slug),
      where('status', '==', 'published'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return toProduct(snap.docs[0].id, snap.docs[0].data());
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return toCategory(snap.docs[0].id, snap.docs[0].data());
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

export async function listProductsByCategory(categorySlug: string): Promise<ProductSummary[]> {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('categorySlug', '==', categorySlug),
      where('status', '==', 'published')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toProductSummary(d.id, d.data()));
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    const q = query(collection(db, COLLECTIONS_COLLECTION), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return toCollection(snap.docs[0].id, snap.docs[0].data());
  } catch (error) {
    console.error('Error fetching collection:', error);
    return null;
  }
}

export async function listProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  try {
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
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
    if (!snap.exists()) return null;
    return toProduct(snap.id, snap.data());
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
}

export async function listStudiosByIds(ids: string[]) {
  try {
    if (ids.length === 0) return [];
    const q = query(
      collection(db, 'studios'),
      where(documentId(), 'in', ids.slice(0, 10))
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching studios:', error);
    return [];
  }
}
