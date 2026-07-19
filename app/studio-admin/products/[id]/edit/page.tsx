/**
 * app/studio-admin/products/[id]/edit/page.tsx
 * RSR-APP-032
 *
 * Edit Product form. Loads the existing product via productService,
 * allows updating fields and managing photos, and supports archiving
 * (soft delete only — Blueprint §3.5: products are never hard-deleted).
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { productService } from "@/services/productService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

const CATEGORIES = [
  "Trays",
  "Wall Clocks",
  "Bookmarks",
  "Keychains",
  "Wall Art",
  "Coasters",
  "Jewellery",
  "Home Décor",
] as const;

const productSchema = z.object({
  name: z.string().min(3, "Enter a product name."),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: "Select a category." }),
  }),
  description: z.string().min(20, "Description should be at least 20 characters."),
  price: z.coerce.number().positive("Enter a valid price."),
  stock: z.coerce.number().int().nonnegative("Enter a valid stock count."),
  sku: z.string().min(1, "Enter a SKU."),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ExistingProduct extends ProductFormValues {
  productId: string;
  imageUrls: string[];
  status: "draft" | "pendingApproval" | "active" | "archived";
}

type ViewState = "loading" | "ready" | "error";

export default function EditProductPage() {
  useRouteGuard({ requiredRole: "seller" });
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<ExistingProduct | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const loadProduct = useCallback(async () => {
    if (!user?.studioId || !productId) return;
    setViewState("loading");
    try {
      const data = await productService.getProductForEdit(
        user.studioId,
        productId
      );
      setProduct(data);
      reset({
        name: data.name,
        category: data.category,
        description: data.description,
        price: data.price,
        stock: data.stock,
        sku: data.sku,
      });
      setViewState("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this product."
      );
      setViewState("error");
    }
  }, [user?.studioId, productId, reset]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    setNewImages(files);
    setNewImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const onSubmit = async (values: ProductFormValues) => {
    if (!user?.studioId || !productId) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      await productService.updateProduct(user.studioId, productId, {
        ...values,
        newImages: newImages.length > 0 ? newImages : undefined,
      });
      await loadProduct();
      setNewImages([]);
      setNewImagePreviews([]);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save changes."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!user?.studioId || !productId) return;
    setArchiving(true);
    try {
      await productService.archiveProduct(user.studioId, productId);
      router.push("/studio-admin/products");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not archive this product."
      );
      setArchiving(false);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Edit Product
        </h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  if (viewState === "error" || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Edit Product
        </h1>
        <ErrorState message={errorMessage} onRetry={loadProduct} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-h1 text-black-900">Edit Product</h1>
        {product.status === "archived" && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-caption text-gray-500">
            Archived
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-md bg-ivory-50 p-6 shadow-card"
      >
        <div className="mb-5">
          <label className="mb-1 block text-caption text-gray-700">
            Product Name
          </label>
          <input
            {...register("name")}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1 text-micro text-error">{errors.name.message}</p>
          )}
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-caption text-gray-700">
            Category
          </label>
          <select
            {...register("category")}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-micro text-error">
              {errors.category.message}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-caption text-gray-700">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={5}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
          />
          {errors.description && (
            <p className="mt-1 text-micro text-error">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-caption text-gray-700">
              Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("price")}
              className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
            />
            {errors.price && (
              <p className="mt-1 text-micro text-error">
                {errors.price.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-caption text-gray-700">
              Stock
            </label>
            <input
              type="number"
              {...register("stock")}
              className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
            />
            {errors.stock && (
              <p className="mt-1 text-micro text-error">
                {errors.stock.message}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-caption text-gray-700">SKU</label>
          <input
            {...register("sku")}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
          />
          {errors.sku && (
            <p className="mt-1 text-micro text-error">{errors.sku.message}</p>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-caption text-gray-700">
            Current Photos
          </label>
          <div className="grid grid-cols-6 gap-2">
            {product.imageUrls.map((url, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-sm bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          <label className="mb-1 mt-4 block text-caption text-gray-700">
            Replace Photos (optional, up to 6)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="w-full text-caption text-gray-700"
          />
          {newImagePreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {newImagePreviews.map((src, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-sm bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`New preview ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" loading={submitting}>
            Save Changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/studio-admin/products")}
          >
            Back to Products
          </Button>
          {product.status !== "archived" && (
            <Button
              type="button"
              variant="danger"
              loading={archiving}
              onClick={handleArchive}
              className="ml-auto"
            >
              Archive Product
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
