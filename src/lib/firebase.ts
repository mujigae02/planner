import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if present
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export default app;
