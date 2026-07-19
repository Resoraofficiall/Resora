/**
 * app/admin/overview/page.tsx
 * RSR-APP-036
 *
 * Founder Admin Panel — top-level overview. Cross-cutting visibility
 * (Blueprint §3.1: Founder is the only entity with cross-cutting
 * visibility across all Studios). Reads aggregate data via services
 * only — no direct Firestore calls in this component (§18.2).
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorState from "@/components/ErrorState";

interface AdminOverviewData {
  totalRevenue: number;
  totalOrders: number;
  activeStudios: number;
  pendingSellerApplications: number;
  pendingProductApprovals: number;
  openSupportTickets: number;
  flaggedReviews: number;
  fraudSignalsCount: number;
  recentOrders: {
    orderId: string;
    studioName: string;
    customerName: string;
    total: number;
    orderStatus: string;
    createdAt: string;
  }[];
  recentApplications: {
    applicationId: string;
    applicantName: string;
    category: string;
    submittedAt: string;
  }[];
}

type ViewState = "loading" | "ready" | "error";

export default function AdminOverviewPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadOverview = useCallback(async () => {
    setViewState("loading");
    try {
      const result = await adminService.getOverview();
      setData(result);
      setViewState("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not load the admin overview."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Overview
        </h1>
        <LoadingSkeleton variant="grid" count={8} />
      </div>
    );
  }

  if (viewState === "error" || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Overview
        </h1>
        <ErrorState message={errorMessage} onRetry={loadOverview} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-8">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <StatCard
          label="Total Orders"
          value={data.totalOrders.toLocaleString("en-IN")}
        />
        <StatCard
          label="Active Studios"
          value={data.activeStudios.toLocaleString("en-IN")}
        />
        <StatCard
          label="Open Support Tickets"
          value={data.openSupportTickets.toLocaleString("en-IN")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <ActionCard
          label="Pending Seller Applications"
          count={data.pendingSellerApplications}
          href="/admin/sellers/applications"
        />
        <ActionCard
          label="Pending Product Approvals"
          count={data.pendingProductApprovals}
          href="/admin/products"
        />
        <ActionCard
          label="Flagged Reviews"
          count={data.flaggedReviews}
          href="/admin/reviews"
        />
        <ActionCard
          label="Fraud Signals"
          count={data.fraudSignalsCount}
          href="/admin/audit-logs"
          tone={data.fraudSignalsCount > 0 ? "error" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-md bg-ivory-50 shadow-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-h3 text-black-900">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
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
                <div key={order.orderId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-body text-black-900">{order.orderId}</p>
                    <p className="text-caption text-gray-500">
                      {order.studioName} · {order.customerName}
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
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md bg-ivory-50 shadow-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-h3 text-black-900">
              Recent Seller Applications
            </h2>
            <Link
              href="/admin/sellers/applications"
              className="text-caption text-gold-600 hover:text-gold-500"
            >
              View All
            </Link>
          </div>

          {data.recentApplications.length === 0 ? (
            <p className="text-body text-gray-500">No applications yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {data.recentApplications.map((app) => (
                <Link
                  key={app.applicationId}
                  href={`/admin/sellers/applications`}
                  className="flex items-center justify-between py-3 transition-colors duration-fast ease-luxury hover:bg-gray-100/50 -mx-2 px-2 rounded-sm"
                >
                  <div>
                    <p className="text-body text-black-900">
                      {app.applicantName}
                    </p>
                    <p className="text-caption text-gray-500">
                      {app.category}
                    </p>
                  </div>
                  <p className="text-caption text-gray-500">
                    {new Date(app.submittedAt).toLocaleDateString("en-IN")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
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
  tone = "neutral",
}: {
  label: string;
  count: number;
  href: string;
  tone?: "neutral" | "error";
}) {
  const toneClass = tone === "error" && count > 0 ? "text-error" : "text-black-900";
  return (
    <Link
      href={href}
      className="rounded-md bg-ivory-50 shadow-card p-5 transition-shadow duration-base ease-luxury hover:shadow-hover"
    >
      <p className="text-caption text-gray-500">{label}</p>
      <p className={`mt-1 font-display text-h2 ${toneClass}`}>{count}</p>
    </Link>
  );
}
