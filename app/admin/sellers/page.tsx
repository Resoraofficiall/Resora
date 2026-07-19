/**
 * app/admin/sellers/page.tsx
 * RSR-APP-038
 *
 * Founder view of all approved Studios (post-provisioning). Distinct
 * from /admin/sellers/applications (pre-approval). Allows suspending a
 * Studio — a suspended Studio immediately loses public visibility but
 * retains its data (Blueprint §3.5); this UI never deletes a Studio.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface AdminStudio {
  studioId: string;
  name: string;
  slug: string;
  logoUrl: string;
  ownerName: string;
  ownerEmail: string;
  category: string;
  subscriptionTier: "starter" | "professional" | "premium";
  verificationBadge: "none" | "verified" | "top" | "featured" | "premiumChoice";
  totalOrders: number;
  revenueTotal: number;
  active: boolean;
  createdAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

export default function AdminSellersPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [studios, setStudios] = useState<AdminStudio[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadStudios = useCallback(async () => {
    setViewState("loading");
    try {
      const data = await adminService.getAllStudios();
      setStudios(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load Studios."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadStudios();
  }, [loadStudios]);

  const handleToggleActive = async (studio: AdminStudio) => {
    setTogglingId(studio.studioId);
    const previous = studios;
    setStudios((current) =>
      current.map((s) =>
        s.studioId === studio.studioId ? { ...s, active: !s.active } : s
      )
    );
    try {
      await adminService.setStudioActive(studio.studioId, !studio.active);
    } catch (err) {
      setStudios(previous);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not update this Studio's status."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const filteredStudios = studios.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Studios</h1>
        <LoadingSkeleton variant="list" count={5} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Studios</h1>
        <ErrorState message={errorMessage} onRetry={loadStudios} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Studios</h1>
        <EmptyState
          title="No Studios yet."
          description="Approved seller applications will appear here as live Studios."
          actionLabel="Review Applications"
          actionHref="/admin/sellers/applications"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-h1 text-black-900">Studios</h1>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Studio or owner name"
          className="w-full sm:w-72 rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
        />
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-md bg-ivory-50 shadow-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-caption text-gray-500">
              <th className="px-4 py-3 font-normal">Studio</th>
              <th className="px-4 py-3 font-normal">Owner</th>
              <th className="px-4 py-3 font-normal">Tier</th>
              <th className="px-4 py-3 font-normal">Orders</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudios.map((studio) => (
              <tr key={studio.studioId} className="text-body">
                <td className="px-4 py-3">
                  <Link
                    href={`/studio/${studio.slug}`}
                    className="flex items-center gap-3 hover:text-gold-600"
                  >
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-100">
                      <Image
                        src={studio.logoUrl}
                        alt={studio.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-black-900 line-clamp-1">
                      {studio.name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <p>{studio.ownerName}</p>
                  <p className="text-caption text-gray-500">
                    {studio.ownerEmail}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-700 capitalize">
                  {studio.subscriptionTier}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {studio.totalOrders.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-micro ${
                      studio.active
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {studio.active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(studio)}
                    disabled={togglingId === studio.studioId}
                    className="text-caption text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-error disabled:opacity-50"
                  >
                    {togglingId === studio.studioId
                      ? "Updating…"
                      : studio.active
                      ? "Suspend"
                      : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
