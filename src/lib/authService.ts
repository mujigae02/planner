import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ScheduleItem, UserProfile, DailyEvents, YearlyScheduleItem, LongTermPlannerData } from '../types';

export { auth, db };

// Helper to convert phone number (e.g. "010-1234-5678" or "01012345678") to synthetic auth email
export function formatPhoneToEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return `phone_${digits}@lifeplanner.app`;
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
  phoneNumber: string;
  userProfile: UserProfile;
  items: ScheduleItem[];
  yearlyItems?: YearlyScheduleItem[];
  longTermPlanner?: LongTermPlannerData;
  colorMap: Record<string, { color: string; textColor: string }>;
  dailyEvents: DailyEvents;
  updatedAt: string;
  passHash?: string;
}

// Phone + Password Login
function withTimeout<T>(promise: Promise<T>, ms: number = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    ),
  ]);
}

interface LocalUserData {
  phone: string;
  passHash: string;
  docId: string;
}

function getLocalUsers(): Record<string, LocalUserData> {
  try {
    const raw = localStorage.getItem('lux_local_users');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUser(digits: string, data: LocalUserData) {
  try {
    const users = getLocalUsers();
    users[digits] = data;
    localStorage.setItem('lux_local_users', JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to save local user:', e);
  }
}

export async function loginWithPhone(
  phone: string,
  pass: string,
  autoLogin: boolean
): Promise<{ user: User | null; docId: string }> {
  const digits = phone.replace(/[^0-9]/g, '');
  const email = formatPhoneToEmail(phone);
  const formattedPhone = formatPhoneNumber(phone);
  const phoneDocId = `phone_${digits}`;

  // Check local storage users first for instant login
  const localUsers = getLocalUsers();
  if (localUsers[digits]) {
    const localUser = localUsers[digits];
    if (localUser.passHash === pass) {
      localStorage.setItem('lux_active_phone_docId', localUser.docId || phoneDocId);
      localStorage.setItem('lux_active_phone', formattedPhone);
      return { user: auth.currentUser, docId: localUser.docId || phoneDocId };
    } else {
      const customErr: any = new Error('비밀번호가 올바르지 않습니다.');
      customErr.code = 'auth/wrong-password';
      throw customErr;
    }
  }

  // 1. Try standard Firebase Auth with timeout
  try {
    const persistence = autoLogin ? browserLocalPersistence : browserSessionPersistence;
    await withTimeout(setPersistence(auth, persistence), 1000).catch(() => {});
    const userCredential = await withTimeout(signInWithEmailAndPassword(auth, email, pass), 2500);
    const user = userCredential.user;
    saveLocalUser(digits, { phone: formattedPhone, passHash: pass, docId: user.uid });
    localStorage.setItem('lux_active_phone_docId', user.uid);
    localStorage.setItem('lux_active_phone', formattedPhone);
    return { user, docId: user.uid };
  } catch (err: any) {
    console.log('Firebase auth login skipped or failed:', err?.code, err?.message);

    if (err?.code === 'auth/wrong-password') {
      const customErr: any = new Error('비밀번호가 올바르지 않습니다.');
      customErr.code = 'auth/wrong-password';
      throw customErr;
    }

    // 2. Try Firestore userPlanners document fallback with timeout
    try {
      const docSnap = await withTimeout(getDoc(doc(db, 'userPlanners', phoneDocId)), 2500);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && (data.passHash === pass || !data.passHash)) {
          saveLocalUser(digits, { phone: formattedPhone, passHash: pass, docId: phoneDocId });
          localStorage.setItem('lux_active_phone_docId', phoneDocId);
          localStorage.setItem('lux_active_phone', formattedPhone);
          return { user: auth.currentUser, docId: phoneDocId };
        } else {
          const customErr: any = new Error('비밀번호가 올바르지 않습니다.');
          customErr.code = 'auth/wrong-password';
          throw customErr;
        }
      } else {
        const customErr: any = new Error('가입되지 않은 전화번호입니다. 회원가입을 해주세요.');
        customErr.code = 'auth/user-not-found';
        throw customErr;
      }
    } catch (dbErr: any) {
      if (dbErr?.code === 'auth/wrong-password' || dbErr?.code === 'auth/user-not-found') {
        throw dbErr;
      }
    }

    // Fallback: Check if local storage has registered phone with matching password
    const customErr: any = new Error('가입되지 않은 전화번호이거나 비밀번호가 올바르지 않습니다.');
    customErr.code = 'auth/user-not-found';
    throw customErr;
  }
}

// Phone + Password Signup
export async function registerWithPhone(
  phone: string,
  pass: string,
  autoLogin: boolean,
  initialData: {
    userProfile: UserProfile;
    items: ScheduleItem[];
    colorMap: Record<string, { color: string; textColor: string }>;
    dailyEvents: DailyEvents;
  }
): Promise<{ user: User | null; docId: string }> {
  const digits = phone.replace(/[^0-9]/g, '');
  const email = formatPhoneToEmail(phone);
  const formattedPhone = formatPhoneNumber(phone);
  const phoneDocId = `phone_${digits}`;

  // Check local users first
  const localUsers = getLocalUsers();
  if (localUsers[digits]) {
    const customErr: any = new Error('이미 가입된 전화번호입니다. 로그인 탭으로 이동해주세요.');
    customErr.code = 'auth/email-already-in-use';
    throw customErr;
  }

  let user: User | null = null;
  let docId: string = phoneDocId;

  // Try Firebase createUserWithEmailAndPassword with fast timeout
  try {
    const userCredential = await withTimeout(createUserWithEmailAndPassword(auth, email, pass), 2500);
    user = userCredential.user;
    docId = user.uid;
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      const customErr: any = new Error('이미 가입된 전화번호입니다. 로그인 탭으로 이동해주세요.');
      customErr.code = 'auth/email-already-in-use';
      throw customErr;
    }

    if (err?.code === 'auth/weak-password') {
      const customErr: any = new Error('비밀번호는 6자리 이상으로 입력해주세요.');
      customErr.code = 'auth/weak-password';
      throw customErr;
    }

    docId = phoneDocId;
  }

  // Save to local storage for instant offline/fast availability
  saveLocalUser(digits, { phone: formattedPhone, passHash: pass, docId });

  const plannerData: UserPlannerData = {
    userId: user?.uid || docId,
    phoneNumber: formattedPhone,
    userProfile: {
      ...initialData.userProfile,
      name: initialData.userProfile.name ?? '',
    },
    items: initialData.items || [],
    colorMap: initialData.colorMap || {},
    dailyEvents: initialData.dailyEvents || {},
    updatedAt: new Date().toISOString(),
    passHash: pass,
  };

  // Asynchronously save to Firestore without blocking UI
  withTimeout(setDoc(doc(db, 'userPlanners', docId), plannerData), 3000).catch((e) =>
    console.warn('Firestore setDoc background notice:', e)
  );

  localStorage.setItem('lux_active_phone_docId', docId);
  localStorage.setItem('lux_active_phone', formattedPhone);

  return { user, docId };
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
    colorMap: Record<string, { color: string; textColor: string }>;
    dailyEvents: DailyEvents;
  }
) {
  if (!docId) return;
  const path = `userPlanners/${docId}`;
  try {
    const userDocRef = doc(db, 'userPlanners', docId);
    const plannerData: Partial<UserPlannerData> = {
      userId: auth.currentUser?.uid || docId,
      phoneNumber: formatPhoneNumber(phoneNumber),
      userProfile: data.userProfile,
      items: data.items,
      yearlyItems: data.yearlyItems || [],
      longTermPlanner: data.longTermPlanner,
      colorMap: data.colorMap,
      dailyEvents: data.dailyEvents,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userDocRef, plannerData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to real-time updates for logged-in user
export function subscribeToUserPlanner(
  docId: string,
  onData: (data: UserPlannerData) => void
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
          onData(data);
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
  await signOut(auth);
}

export { onAuthStateChanged };

