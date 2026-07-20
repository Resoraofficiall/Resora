/**
 * hooks/useAuth.ts
 * Authentication hook - manages auth state and operations
 */

import { useEffect, useState } from 'react';
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

  const login = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOutUser();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    }
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle: login,
    signOut: logout,
  };
}
