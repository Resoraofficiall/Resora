"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { studioService } from "@/services/studioService";
import { orderService } from "@/services/orderService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorState from "@/components/ErrorState";

interface StudioOverviewData {
  studioName: string;
  active: boolean;
  verificationBadge: "none" | "verified" | "top" | "featured" | "premiumChoice";
  followerCount: number;
  rating: number;
  reviewCount: number;
  totalOrders: number;
  revenueTotal: number;
  pendingOrdersCount: number;
  pendingCustomOrdersCount: number;
  lowStockProductsCount: number;
  recentOrders: {
    orderId: string;
    customerName: string;
    total: number;
    orderStatus: string;
    createdAt: string;
  }[];
}

type ViewState = "loading" | "ready" | "error";

export default function StudioAdminOverviewPage() {
  useRouteGuard({ requiredRole: "seller" });
  const { user } = useAuth();

  const [data, setData] = useState<StudioOverviewData | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadOverview = useCallback(async () => {
    if (!user?.studioId) return;
    setViewState("loading");
    try {
      const [studioSummary, recentOrders] = await Promise.all([
        studioService.getDashboardSummary(user.studioId),
        orderService.getRecentOrdersForStudio(user.studioId, 5),
      ]);
      setData({ ...studioSummary, recentOrders });
      setViewState("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not load your Studio overview."
      );
      setViewState("error");
    }
  }, [user?.studioId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Studio Overview
        </h1>
        <LoadingSkeleton variant="grid" count={4} />
      </div>
    );
  }

  if (viewState === "error" || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Studio Overview
        </h1>
        <ErrorState message={errorMessage} onRetry={loadOverview} />
      </div>
    );
  }

  const badgeLabel: Record<StudioOverviewData["verificationBadge"], string> = {
    none: "",
    verified: "Verified",
    top: "Top Rated",
    featured: "Featured",
    premiumChoice: "Premium Choice",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-h1 text-black-900">
          {data.studioName}
        </h1>
        {data.verificationBadge !== "none" && (
          <span className="rounded-full bg-gold-100 px-3 py-1 text-caption text-gold-600">
            {badgeLabel[data.verificationBadge]}
          </span>
        )}
        {!data.active && (
          <span className="rounded-full bg-warning/10 px-3 py-1 text-caption text-warning">
            Temporarily Unavailable
          </span>
        )}
      </div>

      {!data.active && (
        <div className="mb-8 rounded-md bg-warning/10 px-4 py-3 text-caption text-warning">
          Your Studio is currently suspended from public visibility.
          Contact Resora Support if you believe this is unexpected.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Orders" value={data.totalOrders.toLocaleString("en-IN")} />
        <StatCard label="Revenue" value={formatCurrency(data.revenueTotal)} />
        <StatCard
          label="Rating"
          value={`${data.rating.toFixed(1)} (${data.reviewCount})`}
        />
        <StatCard
          label="Followers"
          value={data.followerCount.toLocaleString("en-IN")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <ActionCard
          label="Pending Orders"
          count={data.pendingOrdersCount}
          href="/studio-admin/orders"
          tone={data.pendingOrdersCount > 0 ? "warning" : "neutral"}
        />
        <ActionCard
          label="Custom Order Requests"
          count={data.pendingCustomOrdersCount}
          href="/studio-admin/custom-orders"
          tone={data.pendingCustomOrdersCount > 0 ? "warning" : "neutral"}
        />
        <ActionCard
          label="Low Stock Products"
          count={data.lowStockProductsCount}
          href="/studio-admin/products"
          tone={data.lowStockProductsCount > 0 ? "error" : "neutral"}
        />
      </div>

      <div className="rounded-md bg-ivory-50 shadow-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-h3 text-black-900">
            Recent Orders
          </h2>
          <Link
            href="/studio-admin/orders"
            className="text-caption text-gold-600 hover:text-gold-500"
          >
            View All
          </Link>
        </div>

        {data.recentOrders.length === 0 ? (
          <p className="text-body text-gray-500">No orders yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {data.recentOrders.map((order) => (
              <Link
                key={order.orderId}
                href={`/studio-admin/orders/${order.orderId}`}
                className="flex items-center justify-between py-3 transition-colors duration-fast ease-luxury hover:bg-gray-100/50 -mx-2 px-2 rounded-sm"
              >
                <div>
                  <p className="text-body text-black-900">{order.orderId}</p>
                  <p className="text-caption text-gray-500">
                    {order.customerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-body text-black-900">
                    {formatCurrency(order.total)}
                  </p>
                  <p className="text-caption text-gray-500 capitalize">
                    {order.orderStatus.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ivory-50 shadow-card p-5">
      <p className="text-caption text-gray-500">{label}</p>
      <p className="mt-1 font-display text-h2 text-black-900">{value}</p>
    </div>
  );
}

function ActionCard({
  label,
  count,
  href,
  tone,
}: {
  label: string;
  count: number;
  href: string;
  tone: "neutral" | "warning" | "error";
}) {
  const toneClasses: Record<typeof tone, string> = {
    neutral: "text-gray-700",
    warning: "text-warning",
    error: "text-error",
  };

  return (
    <Link
      href={href}
      className="rounded-md bg-ivory-50 shadow-card p-5 transition-shadow duration-base ease-luxury hover:shadow-hover"
    >
      <p className="text-caption text-gray-500">{label}</p>
      <p className={`mt-1 font-display text-h2 ${toneClasses[tone]}`}>
        {count}
      </p>
    </Link>
  );
}
