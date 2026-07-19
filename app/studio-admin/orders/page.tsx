/**
 * app/studio-admin/orders/page.tsx
 * RSR-APP-033
 *
 * Seller-side order Kanban board. Reads via orderService only.
 * Columns follow the canonical order lifecycle (Blueprint §7.1).
 * Status transitions call orderService.advanceOrderStatus, which
 * writes the append-only timeline entry server-side — this UI never
 * writes orderStatus directly to Firestore.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { orderService } from "@/services/orderService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

type OrderStatus =
  | "placed"
  | "accepted"
  | "inProduction"
  | "qualityCheck"
  | "packaged"
  | "readyToShip"
  | "shipped"
  | "inTransit"
  | "outForDelivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned";

interface KanbanOrder {
  orderId: string;
  customerName: string;
  total: number;
  itemCount: number;
  orderStatus: OrderStatus;
  createdAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "New" },
  { status: "accepted", label: "Accepted" },
  { status: "inProduction", label: "In Production" },
  { status: "qualityCheck", label: "Quality Check" },
  { status: "packaged", label: "Packaged" },
  { status: "readyToShip", label: "Ready to Ship" },
  { status: "shipped", label: "Shipped" },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "inProduction",
  inProduction: "qualityCheck",
  qualityCheck: "packaged",
  packaged: "readyToShip",
  readyToShip: "shipped",
};

export default function StudioAdminOrdersPage() {
  useRouteGuard({ requiredRole: "seller" });
  const { user } = useAuth();

  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user?.studioId) return;
    setViewState("loading");
    try {
      const data = await orderService.getActiveOrdersForStudio(user.studioId);
      setOrders(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load orders."
      );
      setViewState("error");
    }
  }, [user?.studioId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleAdvance = async (order: KanbanOrder) => {
    const nextStatus = NEXT_STATUS[order.orderStatus];
    if (!nextStatus || !user?.studioId) return;

    setAdvancingId(order.orderId);
    const previous = orders;
    setOrders((current) =>
      current.map((o) =>
        o.orderId === order.orderId ? { ...o, orderStatus: nextStatus } : o
      )
    );
    try {
      await orderService.advanceOrderStatus(
        user.studioId,
        order.orderId,
        nextStatus
      );
    } catch (err) {
      setOrders(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not update this order."
      );
    } finally {
      setAdvancingId(null);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Orders</h1>
        <LoadingSkeleton variant="grid" count={7} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Orders</h1>
        <ErrorState message={errorMessage} onRetry={loadOrders} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Orders</h1>
        <EmptyState
          title="No active orders."
          description="New orders from customers will appear here as a Kanban board you can move through production."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-8">Orders</h1>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnOrders = orders.filter(
            (o) => o.orderStatus === column.status
          );
          return (
            <div
              key={column.status}
              className="w-72 flex-shrink-0 rounded-md bg-gray-100/60 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-caption font-medium text-gray-700">
                  {column.label}
                </h2>
                <span className="text-micro text-gray-500">
                  {columnOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {columnOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="rounded-md bg-ivory-50 p-3 shadow-card"
                  >
                    <Link
                      href={`/studio-admin/orders/${order.orderId}`}
                      className="block"
                    >
                      <p className="text-caption font-medium text-black-900">
                        {order.orderId}
                      </p>
                      <p className="text-micro text-gray-500">
                        {order.customerName}
                      </p>
                      <p className="mt-1 text-caption text-black-900">
                        {formatCurrency(order.total)} · {order.itemCount}{" "}
                        {order.itemCount === 1 ? "item" : "items"}
                      </p>
                    </Link>

                    {NEXT_STATUS[order.orderStatus] && (
                      <button
                        type="button"
                        onClick={() => handleAdvance(order)}
                        disabled={advancingId === order.orderId}
                        className="mt-2 w-full rounded-sm bg-black-900 py-1.5 text-micro text-ivory-50 transition-colors duration-fast ease-luxury hover:bg-charcoal-800 disabled:opacity-50"
                      >
                        {advancingId === order.orderId
                          ? "Updating…"
                          : `Move to ${
                              COLUMNS.find(
                                (c) => c.status === NEXT_STATUS[order.orderStatus]
                              )?.label ?? "Next"
                            }`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
