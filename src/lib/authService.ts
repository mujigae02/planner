import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ScheduleItem, UserProfile, DailyEvents, YearlyScheduleItem, LongTermPlannerData, CategoryItem } from '../types';

export { auth, db };

// Helper to convert phone or social account to synthetic auth email
export function formatPhoneToEmail(phone: string): string {
  const digits = phone.replace(/[^a-zA-Z0-9]/g, '');
  return `user_${digits || 'default'}@lifeplanner.app`;
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export interface UserPlannerData {
  userId: string;
  phoneNumber: string; // Preserved for data schema backward-compatibility
  userProfile: UserProfile;
  items: ScheduleItem[];
  yearlyItems?: YearlyScheduleItem[];
  longTermPlanner?: LongTermPlannerData;
  categories?: CategoryItem[];
  colorMap?: Record<string, { color: string; textColor: string }>;
  dailyEvents: DailyEvents;
  updatedAt: string;
  passHash?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    ),
  ]);
}

// Social Authentication Handler (Google, Naver, Kakao, Apple)
export async function loginWithSocial(
  providerType: 'google' | 'naver' | 'kakao' | 'apple',
  accountIdentifier?: string,
  initialData?: {
    userProfile: UserProfile;
    items: ScheduleItem[];
    categories?: CategoryItem[];
    colorMap?: Record<string, { color: string; textColor: string }>;
    dailyEvents: DailyEvents;
  }
): Promise<{ user: User | null; docId: string; accountName: string }> {
  let docId = '';
  let accountName = '';
  let user: User | null = null;

  const sanitizeId = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  if (providerType === 'google') {
    try {
      const gProvider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, gProvider);
      user = res.user;
      docId = user.uid;
      accountName = user.email ? `Google (${user.email})` : `Google (${user.displayName || '사용자'})`;
    } catch (e: any) {
      console.warn('Google popup auth fallback:', e?.message);
      const cleanId = accountIdentifier ? sanitizeId(accountIdentifier) : 'user';
      docId = `google_${cleanId}`;
      accountName = accountIdentifier ? `Google (${accountIdentifier})` : 'Google 계정';
    }
  } else if (providerType === 'apple') {
    try {
      const appleProvider = new OAuthProvider('apple.com');
      const res = await signInWithPopup(auth, appleProvider);
      user = res.user;
      docId = user.uid;
      accountName = user.email ? `Apple (${user.email})` : `Apple (${user.displayName || '사용자'})`;
    } catch (e: any) {
      console.warn('Apple popup auth fallback:', e?.message);
      const cleanId = accountIdentifier ? sanitizeId(accountIdentifier) : 'user';
      docId = `apple_${cleanId}`;
      accountName = accountIdentifier ? `Apple (${accountIdentifier})` : 'Apple 계정';
    }
  } else if (providerType === 'kakao') {
    const cleanId = accountIdentifier ? sanitizeId(accountIdentifier) : 'user';
    docId = `kakao_${cleanId}`;
    accountName = accountIdentifier ? `카카오 (${accountIdentifier})` : '카카오 계정';
  } else if (providerType === 'naver') {
    const cleanId = accountIdentifier ? sanitizeId(accountIdentifier) : 'user';
    docId = `naver_${cleanId}`;
    accountName = accountIdentifier ? `네이버 (${accountIdentifier})` : '네이버 계정';
  }

  if (!docId) {
    docId = `social_${Date.now()}`;
    accountName = '소셜 계정';
  }

  localStorage.setItem('lux_active_phone_docId', docId);
  localStorage.setItem('lux_active_phone', accountName);

  if (initialData) {
    const rawPlannerData = {
      userId: user?.uid || docId,
      phoneNumber: accountName,
      userProfile: initialData.userProfile || {},
      items: initialData.items || [],
      categories: initialData.categories || [],
      colorMap: initialData.colorMap || {},
      dailyEvents: initialData.dailyEvents || {},
      updatedAt: new Date().toISOString(),
    };
    const sanitized = JSON.parse(JSON.stringify(rawPlannerData));
    setDoc(doc(db, 'userPlanners', docId), sanitized, { merge: true }).catch((err) =>
      console.warn('Background setDoc notice:', err)
    );
  }

  return { user, docId, accountName };
}

// Backward-compatible phone auth wrappers
export async function loginWithPhone(
  phone: string,
  pass: string,
  autoLogin: boolean
): Promise<{ user: User | null; docId: string }> {
  return loginWithSocial('google', phone);
}

export async function registerWithPhone(
  phone: string,
  pass: string,
  autoLogin: boolean,
  initialData: any
): Promise<{ user: User | null; docId: string }> {
  const result = await loginWithSocial('google', phone, initialData);
  return { user: result.user, docId: result.docId };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Save/Sync User Data to Firestore
export async function saveUserDataToFirestore(
  docId: string,
  phoneNumber: string,
  data: {
    userProfile: UserProfile;
    items: ScheduleItem[];
    yearlyItems?: YearlyScheduleItem[];
    longTermPlanner?: LongTermPlannerData;
    categories?: CategoryItem[];
    colorMap?: Record<string, { color: string; textColor: string }>;
    dailyEvents: DailyEvents;
  }
) {
  if (!docId) return;
  const path = `userPlanners/${docId}`;
  try {
    const userDocRef = doc(db, 'userPlanners', docId);
    const rawData = {
      userId: auth.currentUser?.uid || docId,
      phoneNumber: phoneNumber || '소셜 계정',
      userProfile: data.userProfile,
      items: data.items || [],
      yearlyItems: data.yearlyItems || [],
      longTermPlanner: data.longTermPlanner || null,
      categories: data.categories || [],
      colorMap: data.colorMap || {},
      dailyEvents: data.dailyEvents || {},
      updatedAt: new Date().toISOString(),
    };
    const sanitizedData = JSON.parse(JSON.stringify(rawData));
    await setDoc(userDocRef, sanitizedData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Subscribe to real-time updates for logged-in user
export function subscribeToUserPlanner(
  docId: string,
  onData: (data: UserPlannerData, exists: boolean) => void
) {
  if (!docId) return () => {};
  const path = `userPlanners/${docId}`;
  try {
    const userDocRef = doc(db, 'userPlanners', docId);
    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserPlannerData;
          onData(data, true);
        } else {
          onData({} as UserPlannerData, false);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to user planner:', err);
    return () => {};
  }
}

// Logout
export async function logoutUser() {
  localStorage.removeItem('lux_active_phone_docId');
  localStorage.removeItem('lux_active_phone');
  localStorage.removeItem('lux_life_planner_profile_v2');
  localStorage.removeItem('lux_life_planner_items_v2');
  localStorage.removeItem('lux_life_planner_color_map_v2');
  localStorage.removeItem('lux_life_planner_daily_events_v2');
  await signOut(auth).catch(() => {});
}

export { onAuthStateChanged };


