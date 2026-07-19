/**
 * app/admin/orders/page.tsx
 * RSR-APP-042
 *
 * Founder cross-Studio order view (Blueprint §3.1: Founder is the only
 * entity with cross-cutting visibility). Read-only status view + search/
 * filter across all Studios — status transitions remain the Studio's
 * own action (Phase 7 seller Kanban), not duplicated here.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
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

interface AdminOrderRow {
  orderId: string;
  studioName: string;
  customerName: string;
  total: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "partiallyRefunded";
  orderStatus: OrderStatus;
  createdAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

const STATUS_FILTERS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "inProduction", label: "In Production" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

export default function AdminOrdersPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = useCallback(async () => {
    setViewState("loading");
    try {
      const data = await adminService.getAllOrders();
      setOrders(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load orders."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "all" || order.orderStatus === statusFilter;
    const matchesSearch =
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.studioName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Orders</h1>
        <LoadingSkeleton variant="list" count={6} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Orders</h1>
        <ErrorState message={errorMessage} onRetry={loadOrders} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Orders</h1>
        <EmptyState
          title="No orders yet."
          description="Orders placed across all Studios will appear here."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-6">Orders</h1>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-4 py-1.5 text-caption transition-colors duration-fast ease-luxury ${
                statusFilter === filter.value
                  ? "bg-black-900 text-ivory-50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search order ID, customer, or Studio"
          className="w-full sm:w-72 rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-md bg-ivory-50 shadow-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-caption text-gray-500">
              <th className="px-4 py-3 font-normal">Order</th>
              <th className="px-4 py-3 font-normal">Studio</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Total</th>
              <th className="px-4 py-3 font-normal">Payment</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map((order) => (
              <tr key={order.orderId} className="text-body">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.orderId}`}
                    className="text-black-900 hover:text-gold-600"
                  >
                    {order.orderId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{order.studioName}</td>
                <td className="px-4 py-3 text-gray-700">
                  {order.customerName}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatCurrency(order.total)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-micro capitalize ${
                      order.paymentStatus === "paid"
                        ? "bg-success/10 text-success"
                        : order.paymentStatus === "failed"
                        ? "bg-error/10 text-error"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 capitalize">
                  {order.orderStatus.replace(/([A-Z])/g, " $1").trim()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
