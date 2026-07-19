/**
 * RESORA — useAuth Hook
 * Per Blueprint §16.2 (Auth lock: email/password + Google Sign-In only)
 * and §16.3 (RBAC). Build Prompt Phase 1, Step 3: "This claim is what
 * Firestore Security Rules and route guards check — never trust the
 * Firestore document's role field directly in a security rule without
 * the claim, because the document can theoretically be read before the
 * claim propagates; the claim is the actual gate."
 *
 * This hook surfaces BOTH the custom-claim role (authoritative, used for
 * all authorization decisions) and the Firestore users/{uid} document
 * (used for display data like fullName/profilePhoto) — callers must not
 * conflate the two for anything security-sensitive.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';

export type ResoraRole =
  | 'visitor'
  | 'customer'
  | 'seller'
  | 'support'
  | 'contentManager'
  | 'financeManager'
  | 'marketingManager'
  | 'founder'
  | 'superAdmin';

export interface ResoraUserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: ResoraRole;
  profilePhoto: string | null;
  status: 'active' | 'suspended' | 'deleted';
  emailVerified: boolean;
  preferredLanguage: string;
  wishlistCount: number;
  orderCount: number;
}

export interface UseAuthResult {
  user: User | null;
  profile: ResoraUserProfile | null;
  /** Authoritative role from the ID token custom claim — use this for
   *  ALL authorization decisions, never profile.role directly. */
  claimRole: ResoraRole | null;
  claimStudioId: string | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ResoraUserProfile | null>(null);
  const [claimRole, setClaimRole] = useState<ResoraRole | null>(null);
  const [claimStudioId, setClaimStudioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track auth state.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setClaimRole(null);
        setClaimStudioId(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Track ID token changes so claim updates (e.g. after seller approval)
  // are picked up without requiring a manual sign-out/sign-in.
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setClaimRole(null);
        setClaimStudioId(null);
        return;
      }
      const tokenResult = await firebaseUser.getIdTokenResult();
      setClaimRole((tokenResult.claims.role as ResoraRole) ?? 'visitor');
      setClaimStudioId((tokenResult.claims.studioId as string) ?? null);
    });
    return unsubscribe;
  }, []);

  // Live-subscribe to the user's Firestore profile document for display data.
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as ResoraUserProfile);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      throw err;
    }
  }, []);

  const registerWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      setError(null);
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);

        // users/{uid} created with role: "customer" by default (Build
        // Prompt Phase 1, Step 2) — roles other than customer/founder are
        // only ever assigned by a Founder action in a later phase.
        await setDoc(doc(db, 'users', credential.user.uid), {
          uid: credential.user.uid,
          fullName,
          email,
          phone: null,
          role: 'customer',
          profilePhoto: null,
          status: 'active',
          emailVerified: false,
          preferredLanguage: 'en',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          wishlistCount: 0,
          orderCount: 0,
          loyaltyPoints: 0,
        });

        await sendEmailVerification(credential.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed.');
        throw err;
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // First-login sync: create the users/{uid} doc if it doesn't exist
      // yet (mirrors registerWithEmail's shape) — displayName is synced
      // here per the §30.2 amendment: "reads displayName from the
      // Firestore users/{uid} document ... never directly from the
      // Firebase Auth object on every load."
      const userDocRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userDocRef,
        {
          uid: result.user.uid,
          fullName: result.user.displayName ?? '',
          email: result.user.email ?? '',
          profilePhoto: result.user.photoURL ?? null,
          emailVerified: result.user.emailVerified,
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      throw err;
    }
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
      throw err;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('No signed-in user to send verification to.');
    }
    await sendEmailVerification(auth.currentUser);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return {
    user,
    profile,
    claimRole,
    claimStudioId,
    loading,
    error,
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    sendResetEmail,
    resendVerificationEmail,
    signOut,
  };
}
