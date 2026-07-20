/**
 * services/messagingService.ts
 * RSR-SVC — Support ticketing (contextual, never open DM — see
 * Blueprint's messaging rules).
 */

import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export interface SupportTicketInput {
  uid: string;
  subject: string;
  category: string;
  message: string;
}

export async function createSupportTicket(input: SupportTicketInput): Promise<string> {
  const ref = doc(collection(db, "supportTickets"));
  await setDoc(ref, { ...input, status: "open", createdAt: serverTimestamp() });
  return ref.id;
}

export const messagingService = { createSupportTicket };
