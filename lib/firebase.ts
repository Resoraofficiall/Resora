// lib/firebase.ts
//
// Firebase configuration placeholder for the Resora platform.
// Replace the values below with your Firebase project credentials,
// ideally sourced from environment variables (see .env.example).
//
// This file is safe to import anywhere in the app. Firebase is
// initialized once and reused across the application (singleton
// pattern) to avoid re-initialization errors during hot reload.

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

// Only initialize Firebase if a project ID has actually been provided.
// This keeps the Resora Demo runnable out-of-the-box with no Firebase
// project configured, while remaining production-ready once real
// credentials are added to .env.local / Vercel environment variables.
const isConfigured = Boolean(firebaseConfig.projectId);

if (isConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage, isConfigured, firebaseConfig };
