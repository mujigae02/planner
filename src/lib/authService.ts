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
export async function loginWithPhone(
  phone: string,
  pass: string,
  autoLogin: boolean
): Promise<{ user: User | null; docId: string }> {
  const digits = phone.replace(/[^0-9]/g, '');
  const email = formatPhoneToEmail(phone);
  const formattedPhone = formatPhoneNumber(phone);

  const persistence = autoLogin ? browserLocalPersistence : browserSessionPersistence;
  try {
    await setPersistence(auth, persistence);
  } catch (e) {
    console.warn('Set persistence warning:', e);
  }

  // 1. Try standard Firebase Auth first
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    localStorage.setItem('lux_active_phone_docId', user.uid);
    localStorage.setItem('lux_active_phone', formattedPhone);
    return { user, docId: user.uid };
  } catch (err: any) {
    console.log('signInWithEmailAndPassword error:', err?.code, err?.message);

    // If explicit wrong password error on Firebase Auth account
    if (err.code === 'auth/wrong-password') {
      const customErr: any = new Error('비밀번호가 올바르지 않습니다.');
      customErr.code = 'auth/wrong-password';
      throw customErr;
    }

    // 2. Try phone doc fallback in Firestore
    const phoneDocId = `phone_${digits}`;
    try {
      const docSnap = await getDoc(doc(db, 'userPlanners', phoneDocId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && (data.passHash === pass || !data.passHash)) {
          let user = auth.currentUser;
          try {
            if (!user) {
              const anonCred = await signInAnonymously(auth);
              user = anonCred.user;
            }
          } catch (e) {
            console.warn('Anonymous auth failed on login fallback:', e);
          }
          localStorage.setItem('lux_active_phone_docId', phoneDocId);
          localStorage.setItem('lux_active_phone', formattedPhone);
          return { user, docId: phoneDocId };
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
      if (dbErr.code === 'auth/wrong-password' || dbErr.code === 'auth/user-not-found') {
        throw dbErr;
      }
    }

    const customErr: any = new Error('전화번호 또는 비밀번호가 올바르지 않습니다.');
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

  const persistence = autoLogin ? browserLocalPersistence : browserSessionPersistence;
  try {
    await setPersistence(auth, persistence);
  } catch (e) {
    console.warn('Set persistence warning:', e);
  }

  let user: User | null = null;
  let docId: string = '';

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    user = userCredential.user;
    docId = user.uid;
  } catch (err: any) {
    console.log('createUserWithEmailAndPassword fallback triggered:', err?.code, err?.message);

    if (err.code === 'auth/email-already-in-use') {
      const customErr: any = new Error('이미 가입된 전화번호입니다. 로그인으로 전환해주세요.');
      customErr.code = 'auth/email-already-in-use';
      throw customErr;
    }

    if (err.code === 'auth/weak-password') {
      const customErr: any = new Error('비밀번호는 6자리 이상으로 입력해주세요.');
      customErr.code = 'auth/weak-password';
      throw customErr;
    }

    // Fallback: Use phone document ID in Firestore
    docId = `phone_${digits}`;

    // Check if user document already exists
    try {
      const existingDoc = await getDoc(doc(db, 'userPlanners', docId));
      if (existingDoc.exists()) {
        const customErr: any = new Error('이미 가입된 전화번호입니다. 로그인으로 전환해주세요.');
        customErr.code = 'auth/email-already-in-use';
        throw customErr;
      }
    } catch (dbErr: any) {
      if (dbErr.code === 'auth/email-already-in-use') throw dbErr;
      console.warn('Error checking existing doc:', dbErr);
    }

    // Try anonymous sign in if not logged in
    try {
      if (!auth.currentUser) {
        const anonCred = await signInAnonymously(auth);
        user = anonCred.user;
      } else {
        user = auth.currentUser;
      }
    } catch (anonErr) {
      console.warn('Anonymous auth failed during registration:', anonErr);
      user = auth.currentUser;
    }
  }

  const plannerData: UserPlannerData = {
    userId: user?.uid || docId,
    phoneNumber: formattedPhone,
    userProfile: {
      ...initialData.userProfile,
      name: initialData.userProfile.name || '사용자',
    },
    items: initialData.items || [],
    colorMap: initialData.colorMap || {},
    dailyEvents: initialData.dailyEvents || {},
    updatedAt: new Date().toISOString(),
    passHash: pass,
  };

  await setDoc(doc(db, 'userPlanners', docId), plannerData);

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

