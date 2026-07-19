/**
 * RESORA — Firestore Schema Type Definitions
 * Per Blueprint §6.1 (Collection List) and §6.2 (Core Schemas).
 * This is the single authoritative type reference for every Firestore
 * document shape — services/, components/, and Cloud Functions all import
 * from here rather than redefining shapes ad hoc (§18.2 layering rule:
 * one pattern used everywhere).
 *
 * Firestore Timestamps are typed as `Timestamp` from the client SDK on
 * the client side; server-side Cloud Functions use the admin SDK's
 * equivalent type. This file uses a generic `FirestoreTimestamp` alias so
 * it can be imported by either without a hard SDK dependency in the type
 * file itself.
 */

export type FirestoreTimestamp = { seconds: number; nanoseconds: number };

// ---------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------

export type ResoraRole =
  | 'visitor'
  | 'customer'
  | 'seller'
  | 'support'
  | 'contentManager'
  | 'financeManager'
  | 'marketingManager'
  | 'founder'
  | 'superAdmin';

export type UserStatus = 'active' | 'suspended' | 'deleted';

export type SubscriptionTier = 'starter' | 'professional' | 'premium';

export type VerificationBadge = 'none' | 'verified' | 'top' | 'featured' | 'premiumChoice';

export type InventoryMode = 'stock' | 'madeToOrder' | 'unlimited';

export type ProductStatus =
  | 'draft'
  | 'pendingReview'
  | 'approved'
  | 'published'
  | 'hidden'
  | 'archived'
  | 'suspended';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partiallyRefunded';

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'inProduction'
  | 'qualityCheck'
  | 'packaged'
  | 'readyToShip'
  | 'shipped'
  | 'inTransit'
  | 'outForDelivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned';

export type CustomOrderStatus =
  | 'submitted'
  | 'assigned'
  | 'inDiscussion'
  | 'quoted'
  | 'accepted'
  | 'paymentPending'
  | 'paid'
  | 'inProduction'
  | 'shipped'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type ModerationStatus = 'visible' | 'hidden' | 'flagged';

export type GatewayPaymentStatus = 'initiated' | 'succeeded' | 'failed' | 'refunded' | 'partiallyRefunded';

// ---------------------------------------------------------------------
// users/{uid}  (§6.2)
// ---------------------------------------------------------------------

export interface ResoraUser {
  uid: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: ResoraRole;
  profilePhoto: string | null;
  status: UserStatus;
  emailVerified: boolean;
  preferredLanguage: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  lastLoginAt: FirestoreTimestamp;
  wishlistCount: number;
  orderCount: number;
  /** Reserved, always 0 in V1 (§6.1 loyaltyLedger is reserved-but-inactive). */
  loyaltyPoints: number;
}

// ---------------------------------------------------------------------
// studios/{studioId}  (§6.2)
// ---------------------------------------------------------------------

export interface StudioPolicies {
  shipping: string;
  returns: string;
  customOrderTerms: string;
}

export interface StudioSeo {
  title: string;
  description: string;
  ogImage: string | null;
}

export interface Studio {
  studioId: string;
  ownerUid: string;
  name: string;
  slug: string; // unique, permanent — editable only by Founder (§3.5)
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  galleryUrls: string[];
  category: string;
  followerCount: number;
  rating: number;
  reviewCount: number;
  totalOrders: number;
  revenueTotal: number;
  subscriptionTier: SubscriptionTier;
  verificationBadge: VerificationBadge;
  featured: boolean;
  active: boolean;
  seo: StudioSeo;
  policies: StudioPolicies;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// products/{productId}  (§6.2)
// ---------------------------------------------------------------------

export interface ProductVariant {
  id: string;
  type: string;
  value: string;
  priceModifier: number;
  inventoryCount: number;
  sku: string;
}

export interface ProductSeo {
  title: string;
  description: string;
  keywords: string[];
}

export interface Product {
  productId: string;
  studioId: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  story: string;
  category: string;
  collectionIds: string[];
  price: number;
  salePrice: number | null;
  sku: string;
  inventoryCount: number;
  inventoryMode: InventoryMode;
  images: string[];
  videos: string[];
  variants: ProductVariant[];
  materials: string;
  dimensions: string;
  weight: string;
  productionTimeDays: number;
  shippingTimeDays: number;
  status: ProductStatus;
  featured: boolean;
  viewCount: number;
  wishlistCount: number;
  salesCount: number;
  rating: number;
  reviewCount: number;
  seo: ProductSeo;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// orders/{orderId}  (§6.2, §7.1) — orderId format RSR-{year}-{6digit}
// ---------------------------------------------------------------------

export interface OrderLineItem {
  productId: string;
  variantId: string | null;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderTimelineEntry {
  event: string;
  timestamp: string; // ISO string — written client-independent, append-only
  actor: string;
}

export interface Order {
  orderId: string;
  customerId: string;
  studioId: string;
  lineItems: OrderLineItem[];
  shippingAddress: string;
  billingAddress: string;
  subtotal: number;
  tax: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber: string | null;
  courierName: string | null;
  estimatedDelivery: string | null;
  invoiceUrl: string | null;
  /** Append-only — no update/delete permitted by security rules (§6.2). */
  timeline: OrderTimelineEntry[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// customOrders/{requestId}  (§6.2, §7.4)
// ---------------------------------------------------------------------

export interface CustomOrder {
  requestId: string;
  customerId: string;
  assignedStudioId: string | null;
  category: string;
  description: string;
  budgetRange: string;
  deadline: string | null;
  referenceImageUrls: string[];
  conversationId: string | null; // → messages
  quotedPrice: number | null;
  acceptedPrice: number | null;
  status: CustomOrderStatus;
  paymentId: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// reviews/{reviewId}  (§6.2)
// ---------------------------------------------------------------------

export interface Review {
  reviewId: string;
  customerId: string;
  studioId: string;
  productId: string;
  orderId: string; // proves verified purchase
  rating: number; // 1-5
  title: string;
  body: string;
  imageUrls: string[];
  verifiedPurchase: boolean;
  moderationStatus: ModerationStatus;
  createdAt: FirestoreTimestamp;
  editableUntil: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// payments/{paymentId}  (§6.2)
// ---------------------------------------------------------------------

export interface Payment {
  paymentId: string;
  orderId: string | null;
  gateway: 'razorpay';
  amount: number;
  currency: 'INR';
  status: GatewayPaymentStatus;
  gatewayTransactionId: string | null;
  /** Internal only — never sent to client (§6.2). Present in the admin
   *  SDK type but intentionally omitted from any client-facing read
   *  surface at the security-rules layer. */
  gatewayResponseRaw: unknown | null;
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// followers/{followId}
// ---------------------------------------------------------------------

export interface Follower {
  followId: string;
  customerId: string;
  studioId: string;
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// wishlists/{wishlistId}
// ---------------------------------------------------------------------

export interface Wishlist {
  wishlistId: string;
  customerId: string;
  productIds: string[];
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// carts/{cartId}  — cartId == uid by convention
// ---------------------------------------------------------------------

export interface CartLineItem {
  productId: string;
  variantId: string | null;
  studioId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Cart {
  customerId: string;
  lineItems: CartLineItem[];
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// notifications/{notificationId}
// ---------------------------------------------------------------------

export interface ResoraNotification {
  notificationId: string;
  recipientUid: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  readAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// messages/{messageId}
// ---------------------------------------------------------------------

export interface ResoraMessage {
  messageId: string;
  conversationId: string;
  participantUids: string[];
  senderUid: string;
  body: string;
  attachmentUrls: string[];
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// supportTickets/{ticketId}
// ---------------------------------------------------------------------

export interface SupportTicketMessage {
  senderUid: string;
  body: string;
  timestamp: string;
}

export interface SupportTicket {
  ticketId: string;
  customerId: string;
  subject: string;
  status: 'open' | 'inProgress' | 'resolved' | 'closed';
  messages: SupportTicketMessage[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// payouts/{payoutId}
// ---------------------------------------------------------------------

export interface Payout {
  payoutId: string;
  studioId: string;
  amount: number;
  status: 'pending' | 'available' | 'paid';
  paidAt: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// coupons/{couponId}, campaigns/{campaignId}
// ---------------------------------------------------------------------

export interface Coupon {
  couponId: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  active: boolean;
  expiresAt: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp;
}

export interface Campaign {
  campaignId: string;
  name: string;
  active: boolean;
  startsAt: FirestoreTimestamp;
  endsAt: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// categories/{categoryId}, collections/{collectionId}
// ---------------------------------------------------------------------

export interface Category {
  categoryId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  order: number;
}

export interface ResoraCollection {
  collectionId: string;
  slug: string;
  name: string;
  productIds: string[];
  imageUrl: string | null;
}

// ---------------------------------------------------------------------
// journal/{articleId}
// ---------------------------------------------------------------------

export interface JournalArticle {
  articleId: string;
  title: string;
  slug: string;
  body: string;
  coverImageUrl: string | null;
  status: 'draft' | 'published';
  publishedAt: FirestoreTimestamp | null;
}

// ---------------------------------------------------------------------
// analytics/{studioId}
// ---------------------------------------------------------------------

export interface StudioAnalytics {
  studioId: string;
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  conversionRate: number;
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// cms/{docId}  — homepage, navigation, footer, theme, announcementBar
// ---------------------------------------------------------------------

export interface CmsBlock {
  type: string;
  order: number;
  enabled: boolean;
  data: Record<string, unknown>;
}

export interface CmsDocument {
  docId: 'homepage' | 'navigation' | 'footer' | 'theme' | 'announcementBar';
  blocks: CmsBlock[];
  updatedAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// settings/{docId}  — includes settings/canvasEngineFrames (§30.9.1),
// settings/adminAllowList, settings/financeConfig
// ---------------------------------------------------------------------

export interface FinanceConfigSettings {
  flatShippingFee: number;
  taxRatePercent: number;
}

export interface AdminAllowListSettings {
  uids: string[];
}

// ---------------------------------------------------------------------
// automationRules/{ruleId}
// ---------------------------------------------------------------------

export interface AutomationRule {
  ruleId: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
}

// ---------------------------------------------------------------------
// auditLogs/{logId}  — append-only (§6.2)
// ---------------------------------------------------------------------

export interface AuditLogEntry {
  logId: string;
  actorUid: string;
  action: string;
  targetType: string;
  targetId: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  timestamp: FirestoreTimestamp;
  ipAddress?: string;
  userAgent?: string;
}

// ---------------------------------------------------------------------
// corporateLeads/{leadId}
// ---------------------------------------------------------------------

export interface CorporateLead {
  leadId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  message: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// seo/{docId}
// ---------------------------------------------------------------------

export interface SeoDocument {
  docId: string;
  targetType: 'studio' | 'product' | 'category' | 'collection' | 'journal';
  targetId: string;
  title: string;
  description: string;
  keywords: string[];
  createdAt: FirestoreTimestamp;
}

// ---------------------------------------------------------------------
// Reserved but inactive in V1 (§6.1) — schema exists, no feature UI ships.
// ---------------------------------------------------------------------

export interface AffiliateRecord {
  affiliateId: string;
  uid: string;
  code: string;
  commissionRate: number;
}

export interface GiftCard {
  giftCardId: string;
  code: string;
  balance: number;
  issuedTo: string | null;
}

export interface LoyaltyLedgerEntry {
  entryId: string;
  uid: string;
  pointsDelta: number;
  reason: string;
}

export interface SubscriptionBillingRecord {
  billingId: string;
  studioId: string;
  tier: SubscriptionTier;
  status: 'active' | 'pastDue' | 'cancelled';
}
