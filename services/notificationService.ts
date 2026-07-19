import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Notification } from "@/types/schema";

/**
 * RSR-SVC-008 — Notification data access.
 * §13.4 (Notification Channels — V1 Lock): email + in-app notifications
 * only in V1, no SMS/push/WhatsApp — this service is scoped to the
 * in-app notifications/{id} collection only; email dispatch is a
 * server-side Cloud Function concern triggered on the relevant write
 * (order created, quote issued, etc.), not called from here.
 *
 * Feeds NotificationCenter.tsx (RSR-CMP-014).
 */

const NOTIFICATIONS_COLLECTION = "notifications";

export function subscribeToNotifications(
  uid: string,
  onChange: (notifications: Notification[]) => void,
  onError: () => void,
  pageSize = 30
): () => void {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("recipientUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as Notification)),
    onError
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  await updateDoc(ref, { read: true, readAt: new Date().toISOString() });
}

/** Marks every unread notification for a user as read in one batch write. */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("recipientUid", "==", uid),
    where("read", "==", false),
    limit(500) // Firestore batch write cap
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { read: true, readAt: new Date().toISOString() });
  });
  await batch.commit();
}

export async function getUnreadNotificationCount(uid: string): Promise<number> {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("recipientUid", "==", uid),
    where("read", "==", false),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.size;
}
