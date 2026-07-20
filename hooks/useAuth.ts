/**
 * hooks/useAuth.ts
 * Authentication hook
 * Imports from: services/authService.ts, types/schema.ts
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToAuthState, signInWithGoogle, signOutUser } from '@/services/authService';
import type { User } from '@/types/schema';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      console.error('Login error:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await signOutUser();
      setUser(null);
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      console.error('Logout error:', err);
    }
  }, [router]);

  return {
    user,
    loading,
    error,
    signInWithGoogle: login,
    signOut: logout,
  };
}
