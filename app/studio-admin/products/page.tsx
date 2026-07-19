"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { productService } from "@/services/productService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

interface StudioProduct {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string;
  category: string;
  price: number;
  stock: number;
  status: "draft" | "pendingApproval" | "active" | "archived";
  updatedAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";
type StatusFilter = "all" | StudioProduct["status"];

const statusLabel: Record<StudioProduct["status"], string> = {
  draft: "Draft",
  pendingApproval: "Pending Approval",
  active: "Active",
  archived: "Archived",
};

const statusToneClass: Record<StudioProduct["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  pendingApproval: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  archived: "bg-gray-100 text-gray-500",
};

export default function StudioAdminProductsPage() {
  useRouteGuard({ requiredRole: "seller" });
  const { user } = useAuth();

  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!user?.studioId) return;
    setViewState("loading");
    try {
      const data = await productService.getProductsForStudio(user.studioId);
      setProducts(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load your products."
      );
      setViewState("error");
    }
  }, [user?.studioId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleArchive = async (productId: string) => {
    if (!user?.studioId) return;
    setArchivingId(productId);
    const previous = products;
    setProducts((current) =>
      current.map((p) =>
        p.productId === productId ? { ...p, status: "archived" } : p
      )
    );
    try {
      // Products are never hard-deleted (Blueprint §3.5) — this archives
      // (soft-deletes) the product while preserving its audit trail.
      await productService.archiveProduct(user.studioId, productId);
    } catch (err) {
      setProducts(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not archive this product."
      );
    } finally {
      setArchivingId(null);
    }
  };

  const filteredProducts =
    statusFilter === "all"
      ? products
      : products.filter((p) => p.status === statusFilter);

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

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Products
        </h1>
        <ErrorState message={errorMessage} onRetry={loadProducts} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-h1 text-black-900">Products</h1>
          <Link href="/studio-admin/products/new">
            <Button variant="primary">Add Product</Button>
          </Link>
        </div>
        <EmptyState
          title="No products yet."
          description="Add your first product to bring your Studio to life."
          actionLabel="Add Product"
          actionHref="/studio-admin/products/new"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-h1 text-black-900">Products</h1>
        <Link href="/studio-admin/products/new">
          <Button variant="primary">Add Product</Button>
        </Link>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "active", "pendingApproval", "draft", "archived"] as StatusFilter[]).map(
          (filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-4 py-1.5 text-caption transition-colors duration-fast ease-luxury ${
                statusFilter === filter
                  ? "bg-black-900 text-ivory-50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {filter === "all" ? "All" : statusLabel[filter]}
            </button>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-md bg-ivory-50 shadow-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-caption text-gray-500">
              <th className="px-4 py-3 font-normal">Product</th>
              <th className="px-4 py-3 font-normal">Category</th>
              <th className="px-4 py-3 font-normal">Price</th>
              <th className="px-4 py-3 font-normal">Stock</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <tr key={product.productId} className="text-body">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm bg-gray-100">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-black-900 line-clamp-1">
                      {product.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {product.category}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatCurrency(product.price)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {product.stock <= 5 && product.stock > 0 ? (
                    <span className="text-warning">{product.stock} left</span>
                  ) : product.stock === 0 ? (
                    <span className="text-error">Out of stock</span>
                  ) : (
                    product.stock
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-micro ${statusToneClass[product.status]}`}
                  >
                    {statusLabel[product.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-4 text-caption">
                    <Link
                      href={`/studio-admin/products/${product.productId}/edit`}
                      className="text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gold-600"
                    >
                      Edit
                    </Link>
                    {product.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleArchive(product.productId)}
                        disabled={archivingId === product.productId}
                        className="text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-error disabled:opacity-50"
                      >
                        {archivingId === product.productId
                          ? "Archiving…"
                          : "Archive"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
