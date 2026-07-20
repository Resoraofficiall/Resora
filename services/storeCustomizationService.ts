/**
 * services/storeCustomizationService.ts
 * RSR-SVC (Store/Theme Customization — admin, Phase 12)
 *
 * Backs app/admin/store-customization/page.tsx. Controls homepage
 * banner rotation, featured-block ordering, and seasonal theme
 * accents — all read by the public homepage through cmsService.ts's
 * getHomepageBlocks, never re-implemented as a second read path here.
 * This file is the admin write side only.
 */

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebaseClient";

export interface HeroBanner {
  id: string;
  imageUrl: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface StoreCustomization {
  banners: HeroBanner[];
  featuredBlockOrder: string[]; // block IDs, in display order
  seasonalAccentEnabled: boolean;
  seasonalAccentColor: string | null; // must stay within the gold/ivory/black token family if set
  updatedAt: number;
}

const SETTINGS_DOC = doc(db, "settings", "storeCustomization");

const DEFAULT_CUSTOMIZATION: StoreCustomization = {
  banners: [],
  featuredBlockOrder: [],
  seasonalAccentEnabled: false,
  seasonalAccentColor: null,
  updatedAt: 0,
};

export async function getStoreCustomization(): Promise<StoreCustomization> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) return DEFAULT_CUSTOMIZATION;
  const data = snap.data();
  return {
    banners: Array.isArray(data.banners) ? (data.banners as HeroBanner[]) : [],
    featuredBlockOrder: Array.isArray(data.featuredBlockOrder) ? (data.featuredBlockOrder as string[]) : [],
    seasonalAccentEnabled: Boolean(data.seasonalAccentEnabled ?? false),
    seasonalAccentColor: (data.seasonalAccentColor as string | undefined) ?? null,
    updatedAt: Number(data.updatedAt ?? 0),
  };
}

export async function updateStoreCustomization(updates: Partial<Omit<StoreCustomization, "updatedAt">>): Promise<void> {
  await setDoc(
    SETTINGS_DOC,
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function uploadBannerImage(file: File, bannerId: string): Promise<string> {
  const storageRef = ref(storage, `store-customization/banners/${bannerId}.jpg`);
  await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(storageRef);
}

export async function saveBanners(banners: HeroBanner[]): Promise<void> {
  await updateStoreCustomization({ banners });
}

export async function saveFeaturedBlockOrder(order: string[]): Promise<void> {
  await updateStoreCustomization({ featuredBlockOrder: order });
}
export async function getStoreCustomizationOptions() {
  return getStoreCustomization();
}

export async function addOption(banner: HeroBanner) {
  const current = await getStoreCustomization();
  await saveBanners([...current.banners, banner]);
}

export async function removeOption(bannerId: string) {
  const current = await getStoreCustomization();
  await saveBanners(current.banners.filter((b) => b.id !== bannerId));
}
