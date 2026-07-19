/**
 * app/admin/support/page.tsx
 * RSR-APP-047
 *
 * Founder/support ticketing inbox. Includes tickets auto-created by the
 * two-revision-cap escalation on custom orders (Blueprint §7.4) so those
 * cases surface here as well as on /admin/custom-orders.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

type TicketStatus = "open" | "inProgress" | "resolved" | "closed";
type TicketSource =
  | "customer"
  | "seller"
  | "customOrderEscalation"
  | "system";

interface SupportTicket {
  ticketId: string;
  subject: string;
  requesterName: string;
  requesterRole: "customer" | "seller";
  source: TicketSource;
  status: TicketStatus;
  priority: "low" | "medium" | "high";
  createdAt: string;
  lastUpdatedAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

const statusToneClass: Record<TicketStatus, string> = {
  open: "bg-error/10 text-error",
  inProgress: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  closed: "bg-gray-100 text-gray-500",
};

const sourceLabel: Record<TicketSource, string> = {
  customer: "Customer",
  seller: "Seller",
  customOrderEscalation: "Custom Order Escalation",
  system: "System",
};

export default function AdminSupportPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>(
    "open"
  );

  const loadTickets = useCallback(async (filter: "all" | TicketStatus) => {
    setViewState("loading");
    try {
      const data = await adminService.getSupportTickets(
        filter === "all" ? {} : { status: filter }
      );
      setTickets(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load support tickets."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadTickets(statusFilter);
  }, [statusFilter, loadTickets]);

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Support Tickets
        </h1>
        <LoadingSkeleton variant="list" count={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-6">
        Support Tickets
      </h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["open", "inProgress", "resolved", "closed", "all"] as const).map(
          (status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-1.5 text-caption transition-colors duration-fast ease-luxury ${
                statusFilter === status
                  ? "bg-black-900 text-ivory-50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status === "all"
                ? "All"
                : status.replace(/([A-Z])/g, " $1").trim()}
            </button>
          )
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {viewState === "error" ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => loadTickets(statusFilter)}
        />
      ) : viewState === "empty" ? (
        <EmptyState
          title="No tickets here."
          description="Support requests from customers and sellers, plus auto-escalated custom order disputes, will appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.ticketId}
              href={`/admin/support/${ticket.ticketId}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-ivory-50 p-4 shadow-card transition-shadow duration-base ease-luxury hover:shadow-hover"
            >
              <div className="min-w-[200px] flex-1">
                <p className="text-body text-black-900">{ticket.subject}</p>
                <p className="text-caption text-gray-500">
                  {ticket.requesterName} ({ticket.requesterRole}) ·{" "}
                  {sourceLabel[ticket.source]}
                </p>
              </div>

              {ticket.priority === "high" && (
                <span className="rounded-full bg-error/10 px-2.5 py-1 text-micro text-error">
                  High Priority
                </span>
              )}

              <span
                className={`rounded-full px-2.5 py-1 text-micro ${statusToneClass[ticket.status]}`}
              >
                {ticket.status.replace(/([A-Z])/g, " $1").trim()}
              </span>

              <span className="text-caption text-gray-500 whitespace-nowrap">
                {new Date(ticket.lastUpdatedAt).toLocaleDateString("en-IN")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
