/**
 * services/corporateLeadService.ts
 * RSR-SVC (Corporate Gifting leads — admin side, Phase 12)
 *
 * Backs app/admin/marketing/corporate-leads/page.tsx (RSR-APP-051).
 * The public submission function (submitCorporateLead) lives in
 * cmsService.ts since it's called from app/corporate/page.tsx before
 * any admin surface exists — this file is the admin-only read/manage
 * counterpart and does not duplicate the write path.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export type CorporateLeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";

export interface CorporateLead {
  id: string;
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  estimatedQuantity: number;
  occasion: string;
  status: CorporateLeadStatus;
  notes: string | null;
  createdAt: number;
}

const CORPORATE_LEADS_COLLECTION = "corporateLeads";

function toLead(id: string, data: Record<string, unknown>): CorporateLead {
  return {
    id,
    companyName: String(data.companyName ?? ""),
    contactName: String(data.contactName ?? ""),
    workEmail: String(data.workEmail ?? ""),
    phone: String(data.phone ?? ""),
    estimatedQuantity: Number(data.estimatedQuantity ?? 0),
    occasion: String(data.occasion ?? ""),
    status: (data.status as CorporateLeadStatus) ?? "new",
    notes: (data.notes as string | undefined) ?? null,
    createdAt: Number(data.createdAt ?? 0),
  };
}

export async function listCorporateLeads(status?: CorporateLeadStatus): Promise<CorporateLead[]> {
  const q = status
    ? query(
        collection(db, CORPORATE_LEADS_COLLECTION),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      )
    : query(collection(db, CORPORATE_LEADS_COLLECTION), orderBy("createdAt", "desc"));

  const snap = await getDocs(q);
  return snap.docs.map((d) => toLead(d.id, d.data()));
}

export async function updateCorporateLeadStatus(
  leadId: string,
  status: CorporateLeadStatus
): Promise<void> {
  await updateDoc(doc(db, CORPORATE_LEADS_COLLECTION, leadId), { status });
}

export async function addCorporateLeadNote(leadId: string, notes: string): Promise<void> {
  await updateDoc(doc(db, CORPORATE_LEADS_COLLECTION, leadId), { notes });
}

export async function deleteCorporateLead(leadId: string): Promise<void> {
  await deleteDoc(doc(db, CORPORATE_LEADS_COLLECTION, leadId));
}
