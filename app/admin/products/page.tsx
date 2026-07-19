/**
 * app/admin/products/page.tsx
 * RSR-APP-039
 *
 * Founder-side product moderation. Product approval requirement is
 * configurable per Studio (Blueprint §3.2: "may require Founder product
 * approval — configurable"); this screen surfaces pendingApproval items
 * across all Studios plus a full searchable product catalog view.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

interface AdminProduct {
  productId: string;
  name: string;
  studioName: string;
  category: string;
  price: number;
  imageUrl: string;
  status: "draft" | "pendingApproval" | "active" | "archived";
  createdAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";
type FilterTab = "pendingApproval" | "all";

export default function AdminProductsPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState<FilterTab>("pendingApproval");
  const [searchQuery, setSearchQuery] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const loadProducts = useCallback(async (activeTab: FilterTab) => {
    setViewState("loading");
    try {
      const data = await adminService.getProducts(
        activeTab === "pendingApproval" ? { status: "pendingApproval" } : {}
      );
      setProducts(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load products."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadProducts(tab);
  }, [tab, loadProducts]);

  const handleApprove = async (productId: string) => {
    setDecidingId(productId);
    try {
      await adminService.approveProduct(productId);
      await loadProducts(tab);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not approve this product."
      );
    } finally {
      setDecidingId(null);
    }
  };

  const handleReject = async (productId: string) => {
    setDecidingId(productId);
    try {
      await adminService.rejectProduct(productId);
      await loadProducts(tab);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not reject this product."
      );
    } finally {
      setDecidingId(null);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studioName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Products
        </h1>
        <LoadingSkeleton variant="list" count={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-6">Products</h1>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("pendingApproval")}
            className={`rounded-full px-4 py-1.5 text-caption transition-colors duration-fast ease-luxury ${
              tab === "pendingApproval"
                ? "bg-black-900 text-ivory-50"
                : "bg-gray-100 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending Approval
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
            All Products
          </button>
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by product or Studio"
          className="w-full sm:w-72 rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
        />
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {viewState === "error" ? (
        <ErrorState message={errorMessage} onRetry={() => loadProducts(tab)} />
      ) : viewState === "empty" ? (
        <EmptyState
          title={
            tab === "pendingApproval"
              ? "Nothing pending approval."
              : "No products found."
          }
          description={
            tab === "pendingApproval"
              ? "New products submitted by sellers requiring approval will appear here."
              : "Products from all Studios will appear here."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProducts.map((product) => (
            <div
              key={product.productId}
              className="flex items-center gap-4 rounded-md bg-ivory-50 p-4 shadow-card"
            >
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-gray-100">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body text-black-900 line-clamp-1">
                  {product.name}
                </p>
                <p className="text-caption text-gray-500">
                  {product.studioName} · {product.category}
                </p>
              </div>
              <p className="text-body text-black-900">
                {formatCurrency(product.price)}
              </p>

              {product.status === "pendingApproval" ? (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    loading={decidingId === product.productId}
                    onClick={() => handleApprove(product.productId)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    loading={decidingId === product.productId}
                    onClick={() => handleReject(product.productId)}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-micro capitalize text-gray-700">
                  {product.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
