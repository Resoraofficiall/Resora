'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '@/services/notificationService';

// ---------------------------------------------------------------------------
// RSR-CMP-014 — components/NotificationCenter.tsx
// Blueprint §13.4. V1 notification channels are in-app + transactional
// email only (no SMS/WhatsApp/push) — this component is the in-app half.
// Reads via a live subscription so a new order/order-status/message
// notification appears without a manual refresh. Every data operation goes
// through notificationService (§18.2) — no direct Firestore access here.
// ---------------------------------------------------------------------------

export function NotificationCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        setError(null);
      },
      (err) => setError(err instanceof Error ? err.message : 'Failed to load notifications.')
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const handleOpenNotification = async (n: Notification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch {
        // Non-critical — the badge will simply stay accurate on next sync.
      }
    }
    if (n.linkHref) {
      window.location.href = n.linkHref;
    }
  };

  if (!user) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-full)] text-[var(--color-black-900)] hover:bg-[var(--color-gray-100)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-error)] px-1 text-[length:var(--text-micro)] text-[var(--color-ivory-50)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-[var(--radius-lg)] border border-[var(--color-gray-300)] bg-[var(--color-ivory-50)] shadow-[var(--shadow-modal)]">
          <div className="flex items-center justify-between border-b border-[var(--color-gray-100)] px-4 py-3">
            <p className="text-[length:var(--text-body)] font-medium text-[var(--color-black-900)]">Notifications</p>
            {unreadCount > 0 && (
              <button
                className="text-[length:var(--text-caption)] text-[var(--color-gold-600)] hover:underline"
                onClick={() => markAllNotificationsRead(user.uid)}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <div className="p-4">
                <ErrorState title="Couldn't load notifications" message={error} />
              </div>
            ) : notifications === null ? (
              <div className="p-4">
                <LoadingSkeleton rows={3} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4">
                <EmptyState title="You're all caught up" message="New order and message updates will appear here." />
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleOpenNotification(n)}
                      className={`w-full border-b border-[var(--color-gray-100)] px-4 py-3 text-left text-[length:var(--text-caption)] hover:bg-[var(--color-gold-100)]/40 ${
                        n.read ? 'text-[var(--color-gray-500)]' : 'text-[var(--color-black-900)]'
                      }`}
                    >
                      <p className={n.read ? 'font-normal' : 'font-medium'}>{n.title}</p>
                      <p className="mt-1 text-[var(--color-gray-500)]">{n.body}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
