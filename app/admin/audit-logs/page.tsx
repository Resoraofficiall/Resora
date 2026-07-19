/**
 * app/admin/audit-logs/page.tsx
 * RSR-APP-046
 *
 * Founder view of auditLogs/{logId} — append-only, no update/delete
 * (Blueprint §6.2, §6.5). This UI is strictly read-only: no edit or
 * delete action exists anywhere on this page, matching the security
 * rule that denies those operations server-side. Also surfaces fraud
 * signals (§16.4) since both are audit-trail read views for the Founder.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface AuditLogEntry {
  logId: string;
  event: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, string | number | boolean>;
  timestamp: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

const EVENT_FILTERS = [
  "all",
  "sellerApproved",
  "sellerRejected",
  "studioSuspended",
  "productApproved",
  "productRejected",
  "reviewModerated",
  "roleChanged",
  "fraudSignal",
] as const;

type EventFilter = (typeof EVENT_FILTERS)[number];

export default function AdminAuditLogsPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadLogs = useCallback(async (filter: EventFilter) => {
    setViewState("loading");
    try {
      const data = await adminService.getAuditLogs(
        filter === "all" ? {} : { event: filter }
      );
      setLogs(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load audit logs."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadLogs(eventFilter);
  }, [eventFilter, loadLogs]);

  const filteredLogs = logs.filter(
    (log) =>
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Audit Logs
        </h1>
        <LoadingSkeleton variant="list" count={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-2">
        Audit Logs
      </h1>
      <p className="text-caption text-gray-500 mb-6">
        Read-only, append-only record. Entries are never edited or removed.
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value as EventFilter)}
          className="rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
        >
          {EVENT_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {filter === "all"
                ? "All Events"
                : filter.replace(/([A-Z])/g, " $1").trim()}
            </option>
          ))}
        </select>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by actor or target ID"
          className="w-full sm:w-72 rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
        />
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {viewState === "error" ? (
        <ErrorState message={errorMessage} onRetry={() => loadLogs(eventFilter)} />
      ) : viewState === "empty" ? (
        <EmptyState
          title="No audit log entries."
          description="System and admin actions will be recorded here permanently."
        />
      ) : (
        <div className="overflow-hidden rounded-md bg-ivory-50 shadow-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-caption text-gray-500">
                <th className="px-4 py-3 font-normal">Timestamp</th>
                <th className="px-4 py-3 font-normal">Event</th>
                <th className="px-4 py-3 font-normal">Actor</th>
                <th className="px-4 py-3 font-normal">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.logId} className="text-body align-top">
                  <td className="px-4 py-3 text-caption text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-black-900">
                    {log.event.replace(/([A-Z])/g, " $1").trim()}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.actorName}
                    <span className="block text-caption text-gray-500 capitalize">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.targetType}: {log.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
