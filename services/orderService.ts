/**
 * services/orderService.ts
 * RSR-SVC-003 — Order reads for customer + studio-admin surfaces.
 * Order creation/payment confirmation is never done here (Global Rule
 * 4) — initiateCheckoutPayment only calls the Cloud Function that
 * starts the payment intent.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebaseClient";

export interface OrderItem {
  productId: string;
  title: string;
  imageUrl: string | null;
  priceInPaise: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  studioId: string;
  items: OrderItem[];
  status: string;
  paymentStatus: "pending" | "confirmed" | "failed";
  totalInPaise: number;
  currency: string;
  shippingAddress: ShippingAddress | null;
  createdAt: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalInPaise: number;
  currency: string;
  createdAt: number;
}

const ORDERS_COLLECTION = "orders";

function toOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    orderNumber: String(data.orderNumber ?? ""),
    buyerId: String(data.buyerId ?? ""),
    studioId: String(data.studioId ?? ""),
    items: Array.isArray(data.items) ? (data.items as OrderItem[]) : [],
    status: String(data.status ?? "pending"),
    paymentStatus: (data.paymentStatus as Order["paymentStatus"]) ?? "pending",
    totalInPaise: Number(data.totalInPaise ?? 0),
    currency: String(data.currency ?? "INR"),
    shippingAddress: (data.shippingAddress as ShippingAddress | undefined) ?? null,
    createdAt: Number(data.createdAt ?? 0),
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, ORDERS_COLLECTION, id));
  if (!snap.exists()) return null;
  return toOrder(snap.id, snap.data());
}

export async function listOrdersForBuyer(uid: string): Promise<OrderSummary[]> {
  const q = query(collection(db, ORDERS_COLLECTION), where("buyerId", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orderNumber: String(data.orderNumber ?? ""),
      status: String(data.status ?? ""),
      totalInPaise: Number(data.totalInPaise ?? 0),
      currency: String(data.currency ?? "INR"),
      createdAt: Number(data.createdAt ?? 0),
    };
  });
}

export async function listOrdersForStudio(studioId: string): Promise<OrderSummary[]> {
  const q = query(collection(db, ORDERS_COLLECTION), where("studioId", "==", studioId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orderNumber: String(data.orderNumber ?? ""),
      status: String(data.status ?? ""),
      totalInPaise: Number(data.totalInPaise ?? 0),
      currency: String(data.currency ?? "INR"),
      createdAt: Number(data.createdAt ?? 0),
    };
  });
}

/** Status transitions always go through the Cloud Function (Global Rule 4). */
export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const callable = httpsCallable<{ orderId: string; status: string }, { success: boolean }>(
    functions,
    "updateOrderStatus"
  );
  await callable({ orderId, status });
}

export async function initiateCheckoutPayment(input: {
  uid: string;
  shippingAddress: ShippingAddress;
}): Promise<{ checkoutUrl: string }> {
  const callable = httpsCallable<typeof input, { checkoutUrl: string }>(functions, "initiatePayment");
  const result = await callable(input);
  return result.data;
}

export const orderService = {
  getOrderById,
  listOrdersForBuyer,
  listOrdersForStudio,
  updateOrderStatus,
  initiateCheckoutPayment,
};
