/**
 * types/schema.ts
 * SINGLE SOURCE OF TRUTH for all TypeScript types
 * Every data structure in the app is defined here
 */

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: 'customer' | 'seller' | 'admin' | 'founder';
  createdAt: number;
  updatedAt: number;
}

export interface Studio {
  id: string;
  studioId?: string;
  ownerUid: string;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  category: string;
  featured: boolean;
  active: boolean;
  verificationBadge: 'none' | 'verified' | 'top' | 'featured';
  rating: number;
  reviewCount: number;
  followerCount: number;
  totalOrders: number;
  revenueTotal: number;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: string;
  productId?: string;
  studioId: string;
  name: string;
  slug: string;
  title?: string;
  description: string;
  shortDescription?: string;
  category: string;
  categorySlug?: string;
  price: number;
  priceInPaise?: number;
  salePrice: number | null;
  currency: string;
  heroImageUrl: string | null;
  images: string[];
  videos: string[];
  materials?: string;
  dimensions?: string;
  weight?: string;
  productionTimeDays?: number;
  shippingTimeDays?: number;
  story?: string;
  inventoryMode: 'unlimited' | 'stock';
  inventoryCount: number;
  status: 'draft' | 'published' | 'archived';
  rating: number;
  reviewCount: number;
  collectionIds?: string[];
  flagged?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  title?: string;
  slug: string;
  price: number;
  priceInPaise?: number;
  heroImageUrl: string | null;
  description?: string;
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
  createdAt?: number;
  updatedAt?: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  name?: string;
  studioId?: string;
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
  readAt?: string;
  createdAt: number;
}

export interface Address {
  id: string;
  uid: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Review {
  id: string;
  productId: string;
  authorUid: string;
  rating: number;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
