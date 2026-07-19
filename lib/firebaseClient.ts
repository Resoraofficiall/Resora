/**
 * lib/firebaseClient.ts
 * RSR-LIB-001
 *
 * Single source of truth for the Firebase client SDK instance.
 * No component or service outside this file may call
 * `initializeApp` / `getAuth` / `getFirestore` / `getStorage` directly —
 * everything imports the singletons exported here (Blueprint §18.2).
 *
 * All values are read from environment variables (gitignored .env files
 * per Phase 0 / Blueprint §18, three separate Firebase projects for
 * development / staging / production). Nothing is hardcoded in source.
 */

import { type FirebaseApp, type FirebaseOptions, getApps, getApp, initializeApp } from "firebase/app";
import { type Auth, getAuth, connectAuthEmulator } from "firebase/auth";
import { type Firestore, getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { type FirebaseStorage, getStorage, connectStorageEmulator } from "firebase/storage";
import { type Functions, getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { type Analytics, isSupported as analyticsIsSupported, getAnalytics } from "firebase/analytics";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[firebaseClient] Missing required environment variable "${key}". ` +
        `Check your .env.local / .env.development / .env.staging / .env.production file — ` +
        `Firebase config must never be hardcoded in source (Blueprint §18).`
    );
  }
  return value;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional
};

// Guards against re-initialization during Next.js Fast Refresh / SSR re-imports.
export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
export const storage: FirebaseStorage = getStorage(firebaseApp);
export const functions: Functions = getFunctions(firebaseApp);

// Analytics is browser-only and conditionally supported (SSR has no window).
let _analytics: Analytics | null = null;
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (_analytics) return _analytics;
  const supported = await analyticsIsSupported().catch(() => false);
  if (!supported) return null;
  _analytics = getAnalytics(firebaseApp);
  return _analytics;
}

/**
 * Local emulator wiring for development only. Controlled by an explicit
 * env flag rather than NODE_ENV so a developer must opt in — prevents an
 * accidental emulator connection attempt in a deployed environment.
 */
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

let emulatorsConnected = false;
if (USE_EMULATORS && typeof window !== "undefined" && !emulatorsConnected) {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  connectFunctionsEmulator(functions, host, 5001);
  emulatorsConnected = true;
}
