import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

// Fallback dummy key to prevent getAuth() from throwing "auth/invalid-api-key" error on module load if apiKey is empty
const apiKey = env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey || 'DUMMY_FIREBASE_API_KEY';

const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId || 'dappled-loader-29v0l',
  appId: env.VITE_FIREBASE_APP_ID || defaultConfig.appId || '1:853874848998:web:136096b5fbdc4337caf727',
  apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain || 'dappled-loader-29v0l.firebaseapp.com',
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId || 'ai-studio-e035b825-92e5-407e-b67b-44bfd7692f10',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
};

let app: FirebaseApp;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (err) {
  console.warn('Firebase initializeApp failed, using fallback config:', err);
  app = getApps().length > 0 ? getApp() : initializeApp({ ...firebaseConfig, apiKey: 'DUMMY_FIREBASE_API_KEY' });
}

let authInstance: Auth;
try {
  authInstance = getAuth(app);
} catch (err) {
  console.warn('Firebase getAuth failed:', err);
  authInstance = getAuth(app);
}

let dbInstance: Firestore;
try {
  dbInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (err) {
  console.warn('Firebase getFirestore failed:', err);
  dbInstance = getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;

async function testConnection() {
  try {
    if (db && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'DUMMY_FIREBASE_API_KEY') {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    // Quiet warning for connection or offline states without logging fatal errors
    console.warn('Firebase test connection status:', error instanceof Error ? error.message : error);
  }
}
testConnection();

export default app;

