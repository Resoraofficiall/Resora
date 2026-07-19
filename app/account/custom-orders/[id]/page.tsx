/**
 * app/account/custom-orders/[id]/page.tsx
 * RSR-APP-024
 *
 * Single custom order detail + tracking page. Shows the full request →
 * quote → payment → production → delivery timeline, the studio
 * conversation thread, and the quote acceptance CTA (same server-verified
 * flow as RSR-APP-023 — client never marks a quote "accepted" on its own).
 */

"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/Button";
import { SkeletonRow } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import {
  getCustomOrderById,
  acceptCustomOrderQuote,
  type CustomOrderRequest,
  type CustomOrderTimelineEntry,
} from "@/services/customOrderService";
import {
  listMessagesForThread,
  sendMessage,
  type Message,
} from "@/services/messageService";

type LoadState = "loading" | "loaded" | "error" | "not-found";

const STATUS_LABELS: Record<string, string> = {
  requested: "Awaiting Quote",
  quoted: "Quote Received",
  accepted: "Accepted — Payment Pending",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  declined: "Declined",
};

const TIMELINE_STEPS = [
  "requested",
  "quoted",
  "accepted",
  "in_production",
  "shipped",
  "delivered",
  "completed",
] as const;

export default function AccountCustomOrderDetailPage() {
  const { isAuthorized, isChecking } = useRouteGuard({ requireAuth: true });
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = React.useState<CustomOrderRequest | null>(null);
  const [timeline, setTimeline] = React.useState<CustomOrderTimelineEntry[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [draftMessage, setDraftMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    if (!user || !requestId) return;
    setState("loading");
    try {
      const data = await getCustomOrderById(requestId, user.uid);
      if (!data) {
        setState("not-found");
        return;
      }
      setRequest(data.request);
      setTimeline(data.timeline);

      const threadMessages = await listMessagesForThread(data.request.conversationId);
      setMessages(threadMessages);

      setState("loaded");
    } catch {
      setState("error");
    }
  }, [user, requestId]);

  React.useEffect(() => {
    if (isAuthorized) fetchDetail();
  }, [isAuthorized, fetchDetail]);

  const handleAcceptQuote = React.useCallback(async () => {
    if (!request) return;
    setIsAccepting(true);
    try {
      // Server verifies the quote and moves the request into a
      // payment-pending state — mirrors RSR-APP-023's flow exactly,
      // never a client-side status write.
      const { checkoutUrl } = await acceptCustomOrderQuote(request.id);
      window.location.href = checkoutUrl;
    } finally {
      setIsAccepting(false);
    }
  }, [request]);

  const handleSendMessage = React.useCallback(async () => {
    if (!request || !draftMessage.trim()) return;
    setIsSending(true);
    try {
      const sent = await sendMessage(request.conversationId, {
        body: draftMessage.trim(),
      });
      setMessages((prev) => [...prev, sent]);
      setDraftMessage("");
    } finally {
      setIsSending(false);
    }
  }, [request, draftMessage]);

  if (isChecking || !isAuthorized) return null;

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[900px]">
          {state === "loading" && (
            <div className="divide-y divide-[var(--color-charcoal-800)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          {state === "error" && (
            <ErrorState message="We couldn't load this custom order." onRetry={fetchDetail} />
          )}

          {state === "not-found" && (
            <EmptyState
              title="Custom order not found"
              description="This request may have been removed, or you may not have access to it."
              actionLabel="Back to Custom Orders"
              actionHref="/account/custom-orders"
            />
          )}

          {state === "loaded" && request && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
                    {request.category}
                  </h1>
                  <p className="mt-[var(--space-1)] text-[var(--text-caption)] text-[var(--color-gray-500)]">
                    {STATUS_LABELS[request.status] ?? request.status}
                  </p>
                </div>

                {request.status === "quoted" && request.quotedPriceInPaise != null && (
                  <Button variant="primary" isLoading={isAccepting} onClick={handleAcceptQuote}>
                    Accept {formatCurrency(request.quotedPriceInPaise, "INR")}
                  </Button>
                )}
              </div>

              {/* Timeline */}
              <section className="mt-[var(--space-7)]">
                <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
                  Progress
                </h2>
                <ol className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
                  {TIMELINE_STEPS.map((step) => {
                    const entry = timeline.find((t) => t.step === step);
                    const isComplete = Boolean(entry);
                    return (
                      <li key={step} className="flex items-center gap-[var(--space-3)]">
                        <span
                          className={`h-2.5 w-2.5 rounded-[var(--radius-full)] ${
                            isComplete
                              ? "bg-[var(--color-gold-500)]"
                              : "bg-[var(--color-gray-300)]"
                          }`}
                        />
                        <span
                          className={`text-[var(--text-body)] ${
                            isComplete
                              ? "text-[var(--color-ivory-100)]"
                              : "text-[var(--color-gray-500)]"
                          }`}
                        >
                          {STATUS_LABELS[step]}
                        </span>
                        {entry && (
                          <span className="ml-auto text-[var(--text-micro)] text-[var(--color-gray-500)]">
                            {formatDate(entry.timestamp)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* Reference images */}
              {request.referenceImageUrls?.length > 0 && (
                <section className="mt-[var(--space-7)]">
                  <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
                    Reference Images
                  </h2>
                  <div className="mt-[var(--space-3)] grid grid-cols-3 gap-[var(--space-2)]">
                    {request.referenceImageUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`Reference ${i + 1}`}
                        className="aspect-square w-full rounded-[var(--radius-md)] object-cover"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Conversation thread */}
              <section className="mt-[var(--space-7)]">
                <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
                  Conversation
                </h2>

                <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
                  {messages.length === 0 ? (
                    <p className="text-[var(--text-caption)] text-[var(--color-gray-500)]">
                      No messages yet.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`max-w-[75%] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] ${
                          msg.senderId === user?.uid
                            ? "ml-auto bg-[var(--color-gold-100)] text-[var(--color-black-900)]"
                            : "bg-[var(--color-charcoal-800)] text-[var(--color-ivory-100)]"
                        }`}
                      >
                        <p className="text-[var(--text-body)]">{msg.body}</p>
                        <p className="mt-[var(--space-1)] text-[var(--text-micro)] opacity-70">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-[var(--space-4)] flex gap-[var(--space-2)]">
                  <textarea
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    placeholder="Message the studio…"
                    rows={2}
                    className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] bg-[var(--color-ivory-50)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-body)] text-[var(--color-black-900)] outline-none focus:border-[var(--color-gold-500)]"
                  />
                  <Button
                    variant="secondary"
                    isLoading={isSending}
                    disabled={!draftMessage.trim()}
                    onClick={handleSendMessage}
                  >
                    Send
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
