/**
 * app/admin/custom-orders/page.tsx
 * RSR-APP-043
 *
 * Founder oversight of the Custom Order workflow (Blueprint §7.4).
 * Distinct from /studio-admin/custom-orders (seller-side). Founder's
 * role here: manual (re)assignment of unassigned requests, and stepping
 * in when the two-revision cap auto-escalates a request to a support
 * ticket / Founder notification — this UI surfaces both cases directly.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import { customOrderService } from "@/services/customOrderService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

type CustomOrderStatus =
  | "submitted"
  | "assigned"
  | "inDiscussion"
  | "quoted"
  | "accepted"
  | "paymentPending"
  | "paid"
  | "inProduction"
  | "shipped"
  | "completed"
  | "rejected"
  | "cancelled";

interface AdminCustomOrder {
  requestId: string;
  customerName: string;
  category: string;
  budgetRange: string;
  deadline: string;
  status: CustomOrderStatus;
  assignedStudioId?: string;
  assignedStudioName?: string;
  revisionCount: number;
  escalated: boolean;
  createdAt: string;
}

interface StudioOption {
  studioId: string;
  name: string;
  category: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

const REVISION_CAP = 2;

const statusLabel: Record<CustomOrderStatus, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  inDiscussion: "In Discussion",
  quoted: "Quoted",
  accepted: "Accepted",
  paymentPending: "Payment Pending",
  paid: "Paid",
  inProduction: "In Production",
  shipped: "Shipped",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function AdminCustomOrdersPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [requests, setRequests] = useState<AdminCustomOrder[]>([]);
  const [studioOptions, setStudioOptions] = useState<StudioOption[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedStudioByRequest, setSelectedStudioByRequest] = useState<
    Record<string, string>
  >({});

  const loadData = useCallback(async () => {
    setViewState("loading");
    try {
      const [requestData, studios] = await Promise.all([
        adminService.getAllCustomOrders(),
        adminService.getActiveStudiosForAssignment(),
      ]);
      setRequests(requestData);
      setStudioOptions(studios);
      setViewState(requestData.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not load custom order requests."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (requestId: string) => {
    const studioId = selectedStudioByRequest[requestId];
    if (!studioId) {
      setErrorMessage("Select a Studio to assign this request to.");
      return;
    }
    setAssigningId(requestId);
    setErrorMessage("");
    try {
      // Creates the contextual conversation thread scoped 1:1 to this
      // request (Blueprint §7.4 Step 2) — this call never opens a
      // general/open DM channel.
      await customOrderService.assignRequest(requestId, studioId);
      await loadData();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not assign this request."
      );
    } finally {
      setAssigningId(null);
    }
  };

  const unassigned = requests.filter((r) => r.status === "submitted");
  const escalated = requests.filter((r) => r.escalated);
  const active = requests.filter(
    (r) => r.status !== "submitted" && !r.escalated
  );

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Custom Orders
        </h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Custom Orders
        </h1>
        <ErrorState message={errorMessage} onRetry={loadData} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Custom Orders
        </h1>
        <EmptyState
          title="No custom order requests yet."
          description="Requests submitted by customers will appear here for assignment."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-8">
        Custom Orders
      </h1>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {escalated.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-h3 text-error mb-4">
            Needs Founder Attention ({escalated.length})
          </h2>
          <div className="flex flex-col gap-3">
            {escalated.map((req) => (
              <div
                key={req.requestId}
                className="rounded-md bg-error/5 border border-error/20 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-body text-black-900">
                    {req.customerName} — {req.category}
                  </p>
                  <span className="rounded-full bg-error/10 px-3 py-1 text-micro text-error">
                    Revision cap reached ({req.revisionCount}/{REVISION_CAP})
                  </span>
                </div>
                <p className="mt-1 text-caption text-gray-500">
                  Assigned to {req.assignedStudioName ?? "—"} · Status{" "}
                  {statusLabel[req.status]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-h3 text-black-900 mb-4">
            Unassigned Requests ({unassigned.length})
          </h2>
          <div className="flex flex-col gap-3">
            {unassigned.map((req) => (
              <div
                key={req.requestId}
                className="flex flex-wrap items-center gap-4 rounded-md bg-ivory-50 p-4 shadow-card"
              >
                <div className="min-w-[200px] flex-1">
                  <p className="text-body text-black-900">
                    {req.customerName}
                  </p>
                  <p className="text-caption text-gray-500">
                    {req.category} · Budget {req.budgetRange} · Deadline{" "}
                    {new Date(req.deadline).toLocaleDateString("en-IN")}
                  </p>
                </div>

                <select
                  value={selectedStudioByRequest[req.requestId] ?? ""}
                  onChange={(e) =>
                    setSelectedStudioByRequest((prev) => ({
                      ...prev,
                      [req.requestId]: e.target.value,
                    }))
                  }
                  className="rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select Studio</option>
                  {studioOptions
                    .filter((s) => s.category === req.category)
                    .map((s) => (
                      <option key={s.studioId} value={s.studioId}>
                        {s.name}
                      </option>
                    ))}
                </select>

                <Button
                  variant="primary"
                  loading={assigningId === req.requestId}
                  onClick={() => handleAssign(req.requestId)}
                >
                  Assign
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-h3 text-black-900 mb-4">
          Active & Completed ({active.length})
        </h2>
        <div className="overflow-hidden rounded-md bg-ivory-50 shadow-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-caption text-gray-500">
                <th className="px-4 py-3 font-normal">Customer</th>
                <th className="px-4 py-3 font-normal">Studio</th>
                <th className="px-4 py-3 font-normal">Category</th>
                <th className="px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {active.map((req) => (
                <tr key={req.requestId} className="text-body">
                  <td className="px-4 py-3 text-black-900">
                    {req.customerName}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {req.assignedStudioName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{req.category}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {statusLabel[req.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  }
