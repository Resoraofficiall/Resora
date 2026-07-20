/**
 * services/campaignService.ts
 * Campaign data access
 */

import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { Campaign } from '@/types/schema';

const CAMPAIGNS_COLLECTION = 'campaigns';

function toCampaign(id: string, data: any): Campaign {
  return {
    id,
    slug: data.slug || '',
    title: data.title || '',
    description: data.description || '',
    bannerImageUrl: data.bannerImageUrl || '',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    status: data.status || 'scheduled',
    landingPageEnabled: data.landingPageEnabled || false,
    associatedProductIds: Array.isArray(data.associatedProductIds) ? data.associatedProductIds : [],
    associatedStudioIds: Array.isArray(data.associatedStudioIds) ? data.associatedStudioIds : [],
    createdAt: data.createdAt?.toDate?.().getTime() || Date.now(),
    updatedAt: data.updatedAt?.toDate?.().getTime() || Date.now(),
  };
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  try {
    const q = query(
      collection(db, CAMPAIGNS_COLLECTION),
      where('slug', '==', slug),
      where('landingPageEnabled', '==', true),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return toCampaign(snap.docs[0].id, snap.docs[0].data());
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return null;
  }
}

export async function listActiveCampaigns(): Promise<Campaign[]> {
  try {
    const q = query(
      collection(db, CAMPAIGNS_COLLECTION),
      where('status', '==', 'active'),
      where('landingPageEnabled', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toCampaign(d.id, d.data()));
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
}
