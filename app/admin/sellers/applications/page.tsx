/**
 * app/admin/sellers/applications/page.tsx
 * RSR-APP-037
 *
 * Founder review screen for seller applications (Blueprint §3.2).
 * Decision: Approve / Reject / Request more info / Hold. On Approve,
 * this triggers the 9-step automatic provisioning Cloud Function
 * (§3.3, RSR-FBS-004) — this UI only calls adminService.decideApplication;
 * it never writes studios/ or users/ documents directly.
 * Rejected/held applications never receive dashboard access — hard rule,
 * enforced server-side, not just hidden in this UI.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

type ApplicationStatus = "pending" | "approved" | "rejected" | "infoRequested" | "held";

interface SellerApplication {
  applicationId: string;
  applicantName: string;
  email: string;
  phone: string;
  studioNameProposed: string;
  category: string;
  portfolioUrls: string[];
  bio: string;
  status: ApplicationStatus;
  submittedAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";
type DecisionAction = "approve" | "reject" | "requestInfo" | "hold";

const statusLabel: Record<ApplicationStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  infoRequested: "Info Requested",
  held: "On Hold",
};

export default function SellerApplicationsPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const loadApplications = useCallback(async () => {
    setViewState("loading");
    try {
      const data = await adminService.getSellerApplications({
        status: "pending",
      });
      setApplications(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not load seller applications."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const selectedApp = applications.find((a) => a.applicationId === selectedId);

  const handleDecision = async (action: DecisionAction) => {
    if (!selectedId) return;
    if (
      (action === "reject" || action === "requestInfo" || action === "hold") &&
      !noteDraft.trim()
    ) {
      setErrorMessage(
        "Add a note explaining this decision before submitting."
      );
      return;
    }

    setDecidingId(selectedId);
    setErrorMessage("");
    try {
      // On "approve", this call triggers the atomic 9-step provisioning
      // sequence (§3.3) server-side. If any step fails it rolls back
      // entirely and alerts the Founder — this UI does not simulate or
      // pre-empt that outcome, it only reflects the resulting status.
      await adminService.decideApplication(selectedId, action, noteDraft.trim());
      setSelectedId(null);
      setNoteDraft("");
      await loadApplications();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not submit this decision."
      );
    } finally {
      setDecidingId(null);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Seller Applications
        </h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Seller Applications
        </h1>
        <ErrorState message={errorMessage} onRetry={loadApplications} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Seller Applications
        </h1>
        <EmptyState
          title="No pending applications."
          description="New seller applications will appear here for review."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-8">
        Seller Applications
      </h1>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-3">
          {applications.map((app) => (
            <button
              key={app.applicationId}
              type="button"
              onClick={() => {
                setSelectedId(app.applicationId);
                setNoteDraft("");
                setErrorMessage("");
              }}
              className={`text-left rounded-md p-4 shadow-card transition-shadow duration-base ease-luxury hover:shadow-hover ${
                selectedId === app.applicationId
                  ? "bg-gold-100 ring-1 ring-gold-500"
                  : "bg-ivory-50"
              }`}
            >
              <p className="text-body font-medium text-black-900">
                {app.studioNameProposed}
              </p>
              <p className="text-caption text-gray-500">
                {app.applicantName} · {app.category}
              </p>
              <p className="mt-1 text-micro text-gray-500">
                Submitted{" "}
                {new Date(app.submittedAt).toLocaleDateString("en-IN")}
              </p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selectedApp ? (
