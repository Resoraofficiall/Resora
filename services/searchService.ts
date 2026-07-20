/**
 * services/searchService.ts
 * RSR-SVC-009 — V1 Firestore-backed search (Blueprint §9.1). Abstracted
 * behind this file so a future Algolia/Meilisearch swap never touches
 * app/search/page.tsx.
 */

import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export interface SearchResult {
  id: string;
  type: "product" | "studio";
  title: string;
  imageUrl: string | null;
  href: string;
}

export async function search(term: string): Promise<SearchResult[]> {
  const normalized = term.toLowerCase();

  const [productsSnap, studiosSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "products"),
        where("status", "==", "published"),
        where("titleLower", ">=", normalized),
        where("titleLower", "<=", normalized + "\uf8ff"),
        limit(20)
      )
    ),
    getDocs(
      query(
        collection(db, "studios"),
        where("approved", "==", true),
        where("nameLower", ">=", normalized),
        where("nameLower", "<=", normalized + "\uf8ff"),
        limit(20)
      )
    ),
  ]);

  const productResults: SearchResult[] = productsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: "product",
      title: String(data.title ?? ""),
      imageUrl: (data.heroImageUrl as string | undefined) ?? null,
      href: `/product/${data.slug}`,
    };
  });

  const studioResults: SearchResult[] = studiosSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: "studio",
      title: String(data.name ?? ""),
      imageUrl: (data.heroImageUrl as string | undefined) ?? null,
      href: `/studio/${data.slug}`,
    };
  });

  return [...productResults, ...studioResults];
}

export const searchService = { search };
