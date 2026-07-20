/**
 * product/ProductCard.tsx
 * RSR-PRD-006 — Named export `ProductCard`. Dispatches to the correct
 * cardVariants/* component based on category via categoryCardMap.
 */

import { WideHorizontal } from "./cardVariants/WideHorizontal";
import { CircularFrame } from "./cardVariants/CircularFrame";
import { TallVertical } from "./cardVariants/TallVertical";
import { CompactRounded } from "./cardVariants/CompactRounded";
import { GalleryFrame } from "./cardVariants/GalleryFrame";
import type { ProductSummary } from "@/services/productService";

export type CardVariant = "wide-horizontal" | "circular-frame" | "tall-vertical" | "compact-rounded" | "gallery-frame";

export interface ProductCardProps {
  product: ProductSummary;
  variant?: CardVariant;
}

const VARIANT_MAP: Record<CardVariant, React.ComponentType<{ product: ProductSummary }>> = {
  "wide-horizontal": WideHorizontal,
  "circular-frame": CircularFrame,
  "tall-vertical": TallVertical,
  "compact-rounded": CompactRounded,
  "gallery-frame": GalleryFrame,
};

export function ProductCard({ product, variant = "tall-vertical" }: ProductCardProps) {
  const Variant = VARIANT_MAP[variant] ?? TallVertical;
  return <Variant product={product} />;
}

export default ProductCard;
