/**
 * app/studio-admin/products/new/page.tsx
 * RSR-APP-031
 *
 * New Product form for a Seller's Studio Dashboard. Writes go through
 * productService only (Blueprint §18.2 — no direct Firestore calls in
 * any UI component). Category selection drives the dynamic card variant
 * (Blueprint §5.5 / §30.9.1) via categoryCardMap, so the correct card
 * presentation is set at creation time, not guessed at render time.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { productService } from "@/services/productService";
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

export default function NewProductPage() {
  useRouteGuard({ requiredRole: "seller" });
  const { user } = useAuth();
  const router = useRouter();

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    setImages(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const onSubmit = async (values: ProductFormValues) => {
    if (!user?.studioId) return;
    if (images.length === 0) {
      setErrorMessage("Add at least one product photo.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    try {
      const productId = await productService.createProduct(user.studioId, {
        ...values,
        images,
      });
      router.push(`/studio-admin/products/${productId}/edit`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not create this product."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-h1 text-black-900 mb-8">
        Add Product
      </h1>

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
            defaultValue=""
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
          >
            <option value="" disabled>
              Select a category
            </option>
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
            Product Photos (up to 6)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="w-full text-caption text-gray-700"
          />
          {imagePreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {imagePreviews.map((src, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-sm bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={submitting}>
            Create Product
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/studio-admin/products")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
