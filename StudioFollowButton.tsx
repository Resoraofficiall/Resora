"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { followStudio, unfollowStudio } from "@/services/studioService";

/**
 * RSR-STU-005 — Follow button.
 * Toggles a customer's follow relationship with a studio (followers
 * collection, §6.1), optimistically updating and reverting on failure —
 * same pattern as the wishlist toggle in ProductCard/ProductDetail for
 * consistency across the app.
 *
 * Unauthenticated visitors are routed to sign-in rather than silently
 * failing, matching ProductDetail's wishlist-click behavior.
 */

export interface FollowButtonProps {
  studioId: string;
  isFollowing: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function FollowButton({
  studioId,
  isFollowing,
  onChange,
  disabled = false,
  className = "",
}: FollowButtonProps) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (pending || disabled) return;

    const next = !isFollowing;
    setPending(true);
    onChange(next);

    try {
      if (next) {
        await followStudio(user.uid, studioId);
      } else {
        await unfollowStudio(user.uid, studioId);
      }
    } catch {
      onChange(!next); // revert on failure
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      aria-pressed={isFollowing}
      className={[
        "rounded-[var(--radius-sm)] px-5 py-2.5 text-[var(--text-body)] font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)] disabled:opacity-50",
        isFollowing
          ? "border border-[var(--color-ivory-50)]/40 bg-transparent text-[var(--color-ivory-50)] hover:bg-[var(--color-ivory-50)]/10"
          : "bg-[var(--color-gold-500)] text-[var(--color-black-900)] hover:bg-[var(--color-gold-600)] hover:shadow-[var(--shadow-gold-glow)]",
        className,
      ].join(" ")}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
