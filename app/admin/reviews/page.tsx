/**
 * app/admin/reviews/page.tsx
 * RSR-APP-044
 *
 * Founder review moderation. Reviews have moderationStatus: enum[visible,
 * hidden, flagged] (Blueprint §6.2) — this screen surfaces flagged
 * reviews for decision and allows searching all reviews. Verified
 * purchase (orderId proof) is shown but never editable here.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

type ModerationStatus = "visible" | "hidden" | "flagged";

interface AdminReview {
  reviewId: string;
  customerName: string;
  studioName: string;
  productName: string;
  rating: number;
  title: string;
  body: string;
  imageUrls: string[];
  verifiedPurchase: boolean;
  moderationStatus: ModerationStatus;
  createdAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";
type FilterTab = "flagged" | "all";

export default function AdminReviewsPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState<FilterTab>("flagged");
  const [searchQuery, setSearchQuery] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const loadReviews = useCallback(async (activeTab: FilterTab) => {
    setViewState("loading");
    try {
      const data = await adminService.getReviews(
        activeTab === "flagged" ? { moderationStatus: "flagged" } : {}
      );
      setReviews(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load reviews."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadReviews(tab);
  }, [tab, loadReviews]);

  const handleModerate = async (
    reviewId: string,
    status: ModerationStatus
  ) => {
    setDecidingId(reviewId);
    const previous = reviews;
    setReviews((current) =>
      current.map((r) =>
        r.reviewId === reviewId ? { ...r, moderationStatus: status } : r
      )
    );
    try {
      await adminService.setReviewModerationStatus(reviewId, status);
      if (tab === "flagged") {
        setReviews((current) => current.filter((r) => r.reviewId !== reviewId));
      }
    } catch (err) {
      setReviews(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not update this review."
      );
    } finally {
      setDecidingId(null);
    }
  };

  const filteredReviews = reviews.filter(
    (r) =>
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studioName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">Reviews</h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-6">Reviews</h1>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("flagged")}
            className={`rounded-full px-4 py-1.5 text-caption transition-colors duration-fast ease-luxury ${
              tab === "flagged"
                ? "bg-black-900 text-ivory-50"
                : "bg-gray-100 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Flagged
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-full px-4 py-1.5 text-caption transition-colors duration-fast ease-luxury ${
              tab === "all"
                ? "bg-black-900 text-ivory-50"
                : "bg-gray-100 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All Reviews
          </button>
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by customer, Studio, or product"
          className="w-full sm:w-72 rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
        />
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {viewState === "error" ? (
        <ErrorState message={errorMessage} onRetry={() => loadReviews(tab)} />
      ) : viewState === "empty" ? (
        <EmptyState
          title={
            tab === "flagged" ? "Nothing flagged." : "No reviews found."
          }
          description={
            tab === "flagged"
              ? "Reviews flagged by customers or automated checks will appear here."
              : "Reviews from all Studios will appear here."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReviews.map((review) => (
            <div
              key={review.reviewId}
              className="rounded-md bg-ivory-50 p-5 shadow-card"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-body font-medium text-black-900">
                    {review.customerName}
                    {review.verifiedPurchase && (
                      <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-micro text-success">
                        Verified Purchase
                      </span>
                    )}
                  </p>
                  <p className="text-caption text-gray-500">
                    {review.studioName} · {review.productName}
                  </p>
                </div>
                <span className="text-caption text-gold-600">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
              </div>

              <p className="text-body font-medium text-black-900">
                {review.title}
              </p>
              <p className="text-body text-gray-700">{review.body}</p>

              {review.imageUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {review.imageUrls.map((url, i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden rounded-sm bg-gray-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Review image ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                {review.moderationStatus !== "visible" && (
                  <Button
                    variant="primary"
                    loading={decidingId === review.reviewId}
                    onClick={() => handleModerate(review.reviewId, "visible")}
                  >
                    Approve
                  </Button>
                )}
                {review.moderationStatus !== "hidden" && (
                  <Button
                    variant="danger"
                    loading={decidingId === review.reviewId}
                    onClick={() => handleModerate(review.reviewId, "hidden")}
                  >
                    Hide
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
