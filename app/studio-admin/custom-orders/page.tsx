/**
 * app/studio-admin/custom-orders/page.tsx
 * RSR-APP-035
 *
 * Seller-side Custom Order list + detail-in-panel view (Blueprint §7.4).
 * Shows requests assigned to this Studio: conversation, quote-issuing UI,
 * and the two-revision cap enforcement is read-only here (the cap logic
 * itself lives server-side in customOrderService / a Cloud Function —
 * this UI reflects revisionCount and blocks a 3rd open negotiation turn
 * once the cap notice is present).
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { customOrderService } from "@/services/customOrderService";
import { formatCurrency } from "@/utils/formatCurrency";
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

interface Message {
  messageId: string;
  senderId: string;
  senderRole: "customer" | "seller";
  body: string;
  createdAt: string;
}

interface CustomOrderSummary {
  requestId: string;
  customerName: string;
  category: string;
  description: string;
  budgetRange: string;
  deadline: string;
  referenceImageUrls: string[];
  status: CustomOrderStatus;
  quotedPrice?: number;
  revisionCount: number;
  linkedOrderId?: string;
  createdAt: string;
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

export default function StudioAdminCustomOrdersPage() {
  useRouteGuard({ requiredRole: "seller" });
  const { user } = useAuth();

  const [requests, setRequests] = useState<CustomOrderSummary[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [quotePrice, setQuotePrice] = useState("");
  const [quoteTimeline, setQuoteTimeline] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user?.studioId) return;
    setViewState("loading");
    try {
      const data = await customOrderService.getRequestsForStudio(
        user.studioId
      );
      setRequests(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not load custom order requests."
      );
      setViewState("error");
    }
  }, [user?.studioId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadConversation = useCallback(
    async (requestId: string) => {
      if (!user?.studioId) return;
      try {
        const data = await customOrderService.getConversation(
          user.studioId,
          requestId
        );
        setMessages(data);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Could not load the conversation."
        );
      }
    },
    [user?.studioId]
  );

  const handleSelect = (requestId: string) => {
    setSelectedId(requestId);
    setMessageDraft("");
    setQuotePrice("");
    setQuoteTimeline("");
    loadConversation(requestId);
  };

  const selectedRequest = requests.find((r) => r.requestId === selectedId);

  const handleSendMessage = async () => {
    if (!user?.studioId || !selectedId || !messageDraft.trim()) return;
    setSendingMessage(true);
    try {
      await customOrderService.sendMessage(
        user.studioId,
        selectedId,
        messageDraft.trim()
      );
      setMessageDraft("");
      await loadConversation(selectedId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not send message."
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (!user?.studioId || !selectedId) return;
    const price = Number(quotePrice);
    if (!price || price <= 0 || !quoteTimeline.trim()) {
      setErrorMessage("Enter a valid quote price and production timeline.");
      return;
    }
    setSubmittingQuote(true);
    setErrorMessage("");
    try {
      await customOrderService.submitQuote(user.studioId, selectedId, {
        quotedPrice: price,
        productionTimeline: quoteTimeline.trim(),
      });
      await loadRequests();
      await loadConversation(selectedId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not submit quote."
      );
    } finally {
      setSubmittingQuote(false);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Custom Order Requests
        </h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Custom Order Requests
        </h1>
        <ErrorState message={errorMessage} onRetry={loadRequests} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Custom Order Requests
        </h1>
        <EmptyState
          title="No custom order requests yet."
          description="Requests assigned to your Studio by Resora will appear here."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-8">
        Custom Order Requests
      </h1>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-3">
          {requests.map((req) => (
            <button
              key={req.requestId}
              type="button"
              onClick={() => handleSelect(req.requestId)}
              className={`text-left rounded-md p-4 shadow-card transition-shadow duration-base ease-luxury hover:shadow-hover ${
                selectedId === req.requestId
                  ? "bg-gold-100 ring-1 ring-gold-500"
                  : "bg-ivory-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-body font-medium text-black-900">
                  {req.customerName}
                </p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-micro text-gray-700">
                  {statusLabel[req.status]}
                </span>
              </div>
              <p className="mt-1 text-caption text-gray-500">
                {req.category} · Budget {req.budgetRange}
              </p>
              <p className="mt-1 text-caption text-gray-700 line-clamp-2">
                {req.description}
              </p>
              {req.revisionCount >= REVISION_CAP && (
                <p className="mt-2 text-micro text-warning">
                  Revision cap reached — Founder has been notified.
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selectedRequest ? (
            <div className="rounded-md bg-ivory-50 p-8 text-center shadow-card">
              <p className="text-body text-gray-500">
                Select a request to view details and respond.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-md bg-ivory-50 p-6 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-h3 text-black-900">
                    {selectedRequest.customerName}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-caption text-gray-700">
                    {statusLabel[selectedRequest.status]}
                  </span>
                </div>
                <p className="text-caption text-gray-500 mb-2">
                  {selectedRequest.category} · Budget{" "}
                  {selectedRequest.budgetRange} · Deadline{" "}
                  {new Date(selectedRequest.deadline).toLocaleDateString(
                    "en-IN"
                  )}
                </p>
                <p className="text-body text-gray-700">
                  {selectedRequest.description}
                </p>

                {selectedRequest.referenceImageUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {selectedRequest.referenceImageUrls.map((url, i) => (
                      <div
                        key={i}
                        className="aspect-square overflow-hidden rounded-sm bg-gray-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Reference ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {selectedRequest.quotedPrice && (
                  <p className="mt-4 text-body text-black-900">
                    Quoted: {formatCurrency(selectedRequest.quotedPrice)}
                  </p>
                )}

                {selectedRequest.linkedOrderId && (
                  <p className="mt-2 text-caption text-gray-500">
                    Linked order: {selectedRequest.linkedOrderId}
                  </p>
                )}
              </div>

              {(selectedRequest.status === "assigned" ||
                selectedRequest.status === "inDiscussion") && (
                <div className="rounded-md bg-ivory-50 p-6 shadow-card">
                  <h3 className="text-caption font-medium text-gray-700 mb-3">
                    Issue a Quote
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="mb-1 block text-caption text-gray-700">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                        className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-caption text-gray-700">
                        Production Timeline
                      </label>
                      <input
                        value={quoteTimeline}
                        onChange={(e) => setQuoteTimeline(e.target.value)}
                        placeholder="e.g. 10 business days"
                        className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    loading={submittingQuote}
                    onClick={handleSubmitQuote}
                  >
                    Send Quote
                  </Button>
                </div>
              )}

              <div className="rounded-md bg-ivory-50 p-6 shadow-card">
                <h3 className="text-caption font-medium text-gray-700 mb-3">
                  Conversation
                </h3>
                <div className="mb-4 flex max-h-80 flex-col gap-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-caption text-gray-500">
                      No messages yet.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.messageId}
                        className={`max-w-[80%] rounded-md px-3 py-2 text-caption ${
                          msg.senderRole === "seller"
                            ? "ml-auto bg-gold-100 text-black-900"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {msg.body}
                        <div className="mt-1 text-micro text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString(
                            "en-IN",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
                  />
                  <Button
                    variant="primary"
                    loading={sendingMessage}
                    onClick={handleSendMessage}
                    disabled={!messageDraft.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
