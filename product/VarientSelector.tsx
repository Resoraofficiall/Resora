"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product, ProductVariant } from "@/types/schema";
import { formatCurrency } from "@/utils/formatCurrency";

/**
 * RSR-PRD-010 — Variant selector.
 *
 * Consumes products/{productId}.variants[] (Ch.6.2:
 * {id,type,value,priceModifier,inventoryCount,sku}). Groups variants by
 * `type` (e.g. "Size", "Color") and renders one selectable group per
 * type, per standard e-commerce variant-picker conventions — the
 * Blueprint does not prescribe a bespoke variant UI beyond "variant
 * selector" in the Product Detail Page step, so this follows the base
 * Button/Card design tokens (§5.1–§5.4) rather than inventing new visual
 * language.
 *
 * Emits the resolved variant (or null if the product has no variants,
 * or the combination selected has no matching variant) plus the final
 * unit price including any priceModifier, so ProductDetail.tsx never
 * has to duplicate price-resolution logic.
 */

export interface VariantSelectorProps {
  product: Product;
  onChange: (selection: {
    variant: ProductVariant | null;
    unitPrice: number;
    inStock: boolean;
  }) => void;
  className?: string;
}

export default function VariantSelector({
  product,
  onChange,
  className = "",
}: VariantSelectorProps) {
  const variants = product.variants ?? [];

  const groupedByType = useMemo(() => {
    const groups: Record<string, ProductVariant[]> = {};
    for (const v of variants) {
      if (!groups[v.type]) groups[v.type] = [];
      groups[v.type].push(v);
    }
    return groups;
  }, [variants]);

  const types = Object.keys(groupedByType);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    // Default to the first available value per type
    const initial: Record<string, string> = {};
    for (const type of types) {
      const firstInStock = groupedByType[type].find(
        (v) => (v.inventoryCount ?? 0) > 0
      );
      initial[type] = (firstInStock ?? groupedByType[type][0])?.value ?? "";
    }
    return initial;
  });

  const resolvedVariant: ProductVariant | null = useMemo(() => {
    if (types.length === 0) return null;
    // A product's true "selected variant" is the one matching every
    // selected type=value pair simultaneously. Since Ch.6.2 stores a flat
    // variants[] rather than a matrix, we resolve by matching on the
    // combination key built from all selected values.
    return (
      variants.find((v) =>
        types.every((type) => {
          const match = groupedByType[type].find((gv) => gv.type === type);
          return match ? selected[type] === v.value || v.type !== type : true;
        })
      ) ?? variants.find((v) => selected[v.type] === v.value) ?? null
    );
  }, [selected, types, variants, groupedByType]);

  const unitPrice = useMemo(() => {
    const base = typeof product.salePrice === "number" && product.salePrice > 0
      ? product.salePrice
      : product.price;
    return base + (resolvedVariant?.priceModifier ?? 0);
  }, [product.price, product.salePrice, resolvedVariant]);

  const inStock =
    product.inventoryMode !== "stock" ||
    (resolvedVariant
      ? (resolvedVariant.inventoryCount ?? 0) > 0
      : (product.inventoryCount ?? 0) > 0);

  useEffect(() => {
    onChange({ variant: resolvedVariant, unitPrice, inStock });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedVariant, unitPrice, inStock]);

  if (types.length === 0) return null;

  return (
    <div className={`space-y-5 ${className}`}>
      {types.map((type) => (
        <div key={type} className="space-y-2">
          <span className="text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--color-gray-700)]">
            {type}
          </span>
          <div className="flex flex-wrap gap-2">
            {groupedByType[type].map((v) => {
              const isSelected = selected[type] === v.value;
              const outOfStock = (v.inventoryCount ?? 0) <= 0 && product.inventoryMode === "stock";
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={outOfStock}
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelected((prev) => ({ ...prev, [type]: v.value }))
                  }
                  className={[
                    "rounded-[var(--radius-sm)] border px-4 py-2 text-[var(--text-body)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)]",
                    isSelected
                      ? "border-[var(--color-gold-500)] bg-[var(--color-gold-100)] text-[var(--color-black-900)]"
                      : "border-[var(--color-gray-300)] bg-[var(--color-ivory-50)] text-[var(--color-gray-700)] hover:border-[var(--color-gold-500)]",
                    outOfStock ? "cursor-not-allowed opacity-40 line-through" : "cursor-pointer",
                  ].join(" ")}
                >
                  {v.value}
                  {v.priceModifier ? (
                    <span className="ml-1 text-[var(--text-micro)] text-[var(--color-gray-500)]">
                      {v.priceModifier > 0 ? "+" : ""}
                      {formatCurrency(v.priceModifier)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
