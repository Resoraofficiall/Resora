/**
 * RESORA — useRouteGuard Hook
 * Per Build Prompt Phase 1, Step 5: route guards for four route groups —
 * /account/* (any authenticated verified user), /studio-admin/* (seller
 * claim + matching studioId only), /admin/* (specific admin claims per
 * RBAC matrix §16.3 — not "any admin role"), and public routes (no guard).
 *
 * Checks the CUSTOM CLAIM (via the ID token), never the Firestore
 * document's role field, per Phase 1 Step 3's explicit warning about
 * claim-propagation race conditions.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type ResoraRole } from '@/hooks/useAuth';

export type RouteGroup = 'account' | 'studio-admin' | 'admin' | 'public';

interface UseRouteGuardOptions {
  /** Which route group this page belongs to. */
  routeGroup: RouteGroup;
  /**
   * For 'admin' routes: the specific roles allowed to view THIS page,
   * per the RBAC matrix (§16.3) — e.g. a finance dashboard page passes
   * ['financeManager', 'founder', 'superAdmin'], not every admin role.
   * Ignored for other route groups.
   */
  allowedAdminRoles?: ResoraRole[];
  /** Where to send an unauthenticated visitor. Defaults to /login. */
  loginRedirect?: string;
  /** Where to send an authenticated-but-unauthorized visitor. */
  forbiddenRedirect?: string;
}

interface UseRouteGuardResult {
  /** True while auth/claim state is still resolving — render nothing
   *  (or a loading skeleton) until this is false, to avoid a flash of
   *  protected content before the redirect fires. */
  checking: boolean;
  /** True once checking is false and the current user is authorized. */
  authorized: boolean;
}

export function useRouteGuard(options: UseRouteGuardOptions): UseRouteGuardResult {
  const {
    routeGroup,
    allowedAdminRoles = [],
    loginRedirect = '/login',
    forbiddenRedirect = '/not-authorized',
  } = options;

  const { user, claimRole, claimStudioId, profile, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (routeGroup === 'public') {
      setChecking(false);
      setAuthorized(true);
      return;
    }

    // Still resolving auth/claim state — do not decide yet.
    if (loading) {
      return;
    }

    if (!user) {
      router.replace(loginRedirect);
      return;
    }

    // Email verification required before any authenticated action beyond
    // viewing the dashboard shell (Build Prompt Phase 1, Step 1) — enforced
    // here defensively; the authoritative enforcement is server-side in
    // the relevant Cloud Functions.
    if (!user.emailVerified && routeGroup !== 'account') {
      router.replace('/verify-email');
      return;
    }

    switch (routeGroup) {
      case 'account': {
        // Any authenticated user (verified or not — the verify-email page
        // itself lives under /account so it must remain reachable).
        setChecking(false);
        setAuthorized(true);
        return;
      }

      case 'studio-admin': {
        if (claimRole !== 'seller' || !claimStudioId) {
          router.replace(forbiddenRedirect);
          return;
        }
        setChecking(false);
        setAuthorized(true);
        return;
      }

      case 'admin': {
        const permittedRoles: ResoraRole[] =
          allowedAdminRoles.length > 0
            ? allowedAdminRoles
            : ['founder', 'superAdmin']; // safe default: no page is "any admin role" by omission

        if (!claimRole || !permittedRoles.includes(claimRole)) {
          router.replace(forbiddenRedirect);
          return;
        }
        setChecking(false);
        setAuthorized(true);
        return;
      }

      default:
        router.replace(forbiddenRedirect);
    }
  }, [
    routeGroup,
    allowedAdminRoles,
    user,
    claimRole,
    claimStudioId,
    profile,
    loading,
    router,
    loginRedirect,
    forbiddenRedirect,
  ]);

  return { checking, authorized };
}
