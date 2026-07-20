/**
 * product/ProductCard.tsx
 * Product card component
 * Imports from: types/schema.ts
 */

'use client';

import Link from 'next/link';
import type { ProductSummary } from '@/types/schema';

export interface ProductCardProps {
  product: ProductSummary;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.slug}`}>
      <div className="group cursor-pointer">
        <div className="relative w-full aspect-square rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-gray-100)] mb-3">
          {product.heroImageUrl ? (
            <img
              src={product.heroImageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-gray-500)]">
              No Image
            </div>
          )}
        </div>
        <h3 className="text-[var(--text-body)] text-[var(--color-ivory-100)] group-hover:text-[var(--color-gold-500)] transition">
          {product.name}
        </h3>
        <p className="text-[var(--text-caption)] text-[var(--color-gray-300)] mt-1">
          ₹{product.price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
