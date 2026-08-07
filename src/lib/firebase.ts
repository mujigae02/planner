/**
 * Firebase Initialization & Configuration
 * 
 * [Firebase 콘솔 및 소셜 로그인 설정 방법]
 * 1. Firebase Console (https://console.firebase.google.com) 접속
 * 2. 해당 프로젝트 선택 > Authentication > Sign-in method 메뉴로 이동
 * 3. 'Google' 제공업체(Provider) 선택 후 '사용 설정' 클릭 및 프로젝트 지원 이메일 지정 후 저장
 * 4. Authentication > Settings > Authorized domains (승인된 도메인)에 도메인 등록:
 *    - localhost
 *    - 개발 및 배포 URL (예: ais-dev-...run.app, your-domain.com 등)
 * 5. .env 파일에 VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID 등 설정
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';

// Helper to resolve environment variables safely in Vite or Node environments
const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key] as string;
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch {}
  return '';
};

const apiKey = getEnv('VITE_FIREBASE_API_KEY') || defaultConfig.apiKey || 'AIzaSyAZhfDQrzP3ZozLTemgRCMYFZWU6i-Yjrs';

const firebaseConfig = {
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || defaultConfig.projectId || 'dappled-loader-29v0l',
  appId: getEnv('VITE_FIREBASE_APP_ID') || defaultConfig.appId || '1:853874848998:web:136096b5fbdc4337caf727',
  apiKey: apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || defaultConfig.authDomain || 'dappled-loader-29v0l.firebaseapp.com',
  firestoreDatabaseId: getEnv('VITE_FIREBASE_DATABASE_ID') || defaultConfig.firestoreDatabaseId || 'ai-studio-e035b825-92e5-407e-b67b-44bfd7692f10',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || defaultConfig.storageBucket || 'dappled-loader-29v0l.firebasestorage.app',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || defaultConfig.messagingSenderId || '853874848998',
};

let app: FirebaseApp;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (err) {
  console.warn('Firebase initializeApp notice:', err);
  app = getApps().length > 0 ? getApp() : initializeApp({ ...firebaseConfig, apiKey: 'DUMMY_FIREBASE_API_KEY' });
}

export const auth: Auth = getAuth(app);
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google OAuth Provider setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

async function testConnection() {
  try {
    if (db && apiKey && apiKey !== 'DUMMY_FIREBASE_API_KEY') {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    console.warn('Firebase connection notice:', error instanceof Error ? error.message : error);
  }
}
testConnection();

export default app;


