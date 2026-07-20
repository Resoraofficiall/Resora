/**
 * types/schema.ts
 * Complete type definitions for Resora platform.
 * Single source of truth for all data structures.
 */

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  role: 'customer' | 'seller' | 'admin' | 'founder';
  createdAt: number;
  updatedAt: number;
}

export interface Studio {
  id: string;
  ownerUid: string;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  category: string;
  featured: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: string;
  productId: string;
  studioId: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  salePrice: number | null;
  heroImageUrl: string | null;
  images: string[];
  videos: string[];
  inventoryMode: 'unlimited' | 'stock';
  inventoryCount: number;
  status: 'draft' | 'published' | 'archived';
  rating: number;
  reviewCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
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

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  buyerId: string;
  items: CartItem[];
  totalInPaise: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  recipientUid: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  bannerImageUrl: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'active' | 'ended';
  landingPageEnabled: boolean;
  associatedProductIds: string[];
  associatedStudioIds: string[];
}
