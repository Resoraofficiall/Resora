/**
 * app/studio-admin/orders/[id]/page.tsx
 * RSR-APP-034
 *
 * Seller-side single order detail view: line items, customer/shipping
 * info, append-only timeline (Blueprint §6.2/§7.1 — never edited,
 * only new entries added), tracking number entry, and status controls.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { orderService } from "@/services/orderService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

interface LineItem {
  productId: string;
  name: string;
  variantId?: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

interface TimelineEntry {
  event: string;
  timestamp: string;
  actor: string;
}

interface OrderDetail {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  lineItems: LineItem[];
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  subtotal: number;
  tax: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "partiallyRefunded";
  orderStatus: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string;
  timeline: TimelineEntry[];
}

type ViewState = "loading" | "ready" | "error";

export default function StudioOrderDetailPage() {
  useRouteGuard({ requiredRole: "seller" });
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!user?.studioId || !orderId) return;
    setViewState("loading");
    try {
      const data = await orderService.getOrderForStudio(
        user.studioId,
        orderId
      );
      setOrder(data);
      setTrackingNumber(data.trackingNumber ?? "");
      setCourierName(data.courierName ?? "");
      setViewState("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this order."
      );
      setViewState("error");
    }
  }, [user?.studioId, orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleSaveTracking = async () => {
    if (!user?.studioId || !orderId) return;
    setSavingTracking(true);
    try {
      // Writes a new append-only timeline entry server-side — this UI
      // never mutates order.timeline directly (Blueprint §7.1/§6.5).
      await orderService.updateShippingDetails(user.studioId, orderId, {
        trackingNumber,
        courierName,
      });
      await loadOrder();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save tracking details."
      );
    } finally {
      setSavingTracking(false);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <LoadingSkeleton variant="list" count={5} />
      </div>
    );
  }

  if (viewState === "error" || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState message={errorMessage} onRetry={loadOrder} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-h1 text-black-900">
          {order.orderId}
        </h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-caption capitalize text-gray-700">
          {order.orderStatus.replace(/([A-Z])/g, " $1").trim()}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-caption capitalize ${
            order.paymentStatus === "paid"
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          }`}
        >
          {order.paymentStatus}
        </span>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="rounded-md bg-ivory-50 p-6 shadow-card">
            <h2 className="font-display text-h3 text-black-900 mb-4">
              Items
            </h2>
            <div className="flex flex-col divide-y divide-gray-100">
              {order.lineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-body text-black-900">{item.name}</p>
                    <p className="text-caption text-gray-500">
                      Qty {item.qty} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-body text-black-900">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-4 text-caption text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-body font-medium text-black-900 pt-1">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-ivory-50 p-6 shadow-card">
            <h2 className="font-display text-h3 text-black-900 mb-4">
              Shipping & Tracking
            </h2>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-caption text-gray-700">
                  Courier Name
                </label>
                <input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-caption text-gray-700">
                  Tracking Number
                </label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              loading={savingTracking}
              onClick={handleSaveTracking}
            >
              Save Tracking Details
            </Button>
          </div>

          <div className="rounded-md bg-ivory-50 p-6 shadow-card">
            <h2 className="font-display text-h3 text-black-900 mb-4">
              Timeline
            </h2>
            <div className="flex flex-col gap-3">
              {order.timeline.map((entry, i) => (
                <div key={i} className="flex gap-3 text-caption">
                  <span className="w-32 flex-shrink-0 text-gray-500">
                    {new Date(entry.timestamp).toLocaleString("en-IN")}
                  </span>
                  <span className="text-black-900">
                    {entry.event}
                    <span className="text-gray-500"> — {entry.actor}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md bg-ivory-50 p-6 shadow-card h-fit">
          <h2 className="font-display text-h3 text-black-900 mb-4">
            Customer
          </h2>
          <p className="text-body text-black-900">{order.customerName}</p>
          <p className="text-caption text-gray-500">{order.customerEmail}</p>
          <p className="text-caption text-gray-500">{order.customerPhone}</p>

          <h3 className="mt-6 mb-2 text-caption font-medium text-gray-700">
            Shipping Address
          </h3>
          <p className="text-caption text-gray-700">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
            {order.shippingAddress.pincode}
            <br />
            {order.shippingAddress.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
