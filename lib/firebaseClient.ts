/**
 * RESORA — Firebase Client SDK Initialization
 * Per Blueprint §18.1 (Firebase Authentication, Cloud Firestore, Firebase
 * Storage, Cloud Functions). Single initialization point — no component
 * or service re-initializes the app (§18.2 layering rule extends to this:
 * one client instance, imported everywhere).
 *
 * Config values are read from environment variables, never hardcoded in
 * source (Global Rule #2 applies to secrets/config as much as CMS copy) —
 * NEXT_PUBLIC_* variables are safe to expose client-side for Firebase web
 * config specifically (this is standard Firebase practice: these values
 * identify the project, they do not grant access on their own — access
 * control is enforced entirely by Firestore/Storage Security Rules).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from 'firebase/storage';
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertConfigPresent(): void {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Firebase client config is missing required environment variables: ${missing.join(', ')}. ` +
        `Set these in .env.local (see .env.example).`
    );
  }
}

// Guard against re-initialization across Next.js hot-reloads / multiple
// module evaluations (App Router can evaluate client modules more than
// once in dev).
let app: FirebaseApp;
if (getApps().length === 0) {
  assertConfigPresent();
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const functions: Functions = getFunctions(app);

// Connect to local emulators only when explicitly enabled — never in a
// deployed environment, and never silently based on NODE_ENV alone (a
// misconfigured staging build must not accidentally point at emulators
// or, worse, a dev build accidentally hit production data because this
// check was inverted).
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

if (useEmulators && typeof window !== 'undefined') {
  // Module-level flag prevents "already connected" errors on Fast Refresh.
  const globalWithFlag = globalThis as typeof globalThis & {
    __resoraEmulatorsConnected?: boolean;
  };

  if (!globalWithFlag.__resoraEmulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    globalWithFlag.__resoraEmulatorsConnected = true;
  }
}

export { app, auth, db, storage, functions };
