/**
 * hooks/useRouteGuard.ts
 * Route protection hook - enforces role-based access
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export interface UseRouteGuardOptions {
  requiredRole?: 'customer' | 'seller' | 'admin' | 'founder';
  fallbackRoute?: string;
}

export function useRouteGuard(options: UseRouteGuardOptions = {}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { requiredRole, fallbackRoute = '/login' } = options;

  useEffect(() => {
    if (loading) return; // Still loading auth state

    if (!user) {
      // Not authenticated
      router.push(fallbackRoute);
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      // Wrong role
      router.push(fallbackRoute);
    }
  }, [user, loading, requiredRole, fallbackRoute, router]);

  return { allowed: !loading && user && (!requiredRole || user.role === requiredRole) };
}
