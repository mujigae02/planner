import {
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { ScheduleItem, UserProfile, DailyEvents, YearlyScheduleItem, LongTermPlannerData, CategoryItem } from '../types';

export { auth, db };

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
}

// Real Google OAuth Authentication Handler using Firebase signInWithPopup
export async function loginWithGoogleSocial(initialData?: {
  userProfile: UserProfile;
  items: ScheduleItem[];
  categories?: CategoryItem[];
  colorMap?: Record<string, { color: string; textColor: string }>;
  dailyEvents: DailyEvents;
}): Promise<{
  user: User;
  docId: string;
  accountName: string;
  userInfo: { name: string; email: string; avatarUrl: string };
}> {
  // Ensure browser local persistence is explicitly set before auth popup
  await setPersistence(auth, browserLocalPersistence).catch(() => {});

  // Execute real OAuth popup with GoogleAuthProvider
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const docId = user.uid;
  const accountName = user.email || user.displayName || 'Google 계정';
  const userInfo = {
    name: user.displayName || user.email?.split('@')[0] || 'Google 사용자',
    email: user.email || '',
    avatarUrl: user.photoURL || '',
  };

  localStorage.setItem('lux_active_phone_docId', docId);
  localStorage.setItem('lux_active_phone', accountName);

  // 중요: 여기서 initialData(로그인 "직전"의 로컬 상태, 보통 빈 값)를 Firestore에
  // 곧바로 setDoc 하지 않습니다. 과거에는 이 로직이 로그인할 때마다 서버에 저장된
  // 기존 일정을 로그인 전 상태(주로 빈 배열)로 덮어써서 "로그아웃 후 재로그인하면
  // 일정이 사라지는" 버그의 직접적인 원인이었습니다.
  // 신규 사용자의 초기 데이터 업로드는 App.tsx의 Firestore 구독 로직에서
  // "서버에 문서가 존재하지 않을 때만" 안전하게 처리하도록 위임합니다.

  return { user, docId, accountName, userInfo };
}

// Backward compatible wrapper
export async function loginWithSocial(
  providerType: 'google' | 'naver' | 'kakao' | 'apple',
  accountIdentifier?: string,
  initialData?: any
): Promise<{ user: User | null; docId: string; accountName: string; userInfo?: { name: string; email: string; avatarUrl: string } }> {
  if (providerType === 'google') {
    const res = await loginWithGoogleSocial(initialData);
    return { user: res.user, docId: res.docId, accountName: res.accountName, userInfo: res.userInfo };
  }
  // Fallback handler if needed
  const res = await loginWithGoogleSocial(initialData);
  return { user: res.user, docId: res.docId, accountName: res.accountName, userInfo: res.userInfo };
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

export interface SaveUserDataOptions {
  reason?: 'auto-save' | 'manual-user-sync' | 'initial-new-user-creation' | 'unspecified';
  isUserEditing?: boolean;
  hasReceivedInitialSnapshot?: boolean;
  isRemoteUpdating?: boolean;
  requestId?: number;
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
  },
  options?: SaveUserDataOptions
) {
  const reason = options?.reason || 'unspecified';
  const isInitialized = options?.hasReceivedInitialSnapshot ?? true;
  const isRemoteUpdating = options?.isRemoteUpdating ?? false;
  const isUserEditing = options?.isUserEditing ?? true;
  const requestId = options?.requestId ?? 0;

  console.log('[Firestore Save Attempt]', {
    reason,
    isInitialized,
    isRemoteUpdating,
    isUserEditing,
    requestId,
  });

  if (!auth.currentUser) {
    console.log("[Firestore Save Blocked] 비로그인 상태이므로 Firestore 저장을 건너띕니다.");
    return;
  }

  // Final Guard: Block auto-saves that were not triggered by an explicit user edit or after initial sync
  if (reason === 'auto-save') {
    if (!isInitialized) {
      console.log(`[Firestore Save Blocked] 🛑 (reason=${reason}) 최초 snapshot 수신 전이므로 저장을 차단합니다.`);
      return;
    }
    if (isRemoteUpdating) {
      console.log(`[Firestore Save Blocked] 🛑 (reason=${reason}) 원격 데이터 적용 중이므로 저장을 차단합니다.`);
      return;
    }
    if (!isUserEditing) {
      console.log(`[Firestore Save Blocked] 🛑 (reason=${reason}) 사용자에 의한 직접 변경이 아니므로(isUserEditing=false) 저장을 차단합니다.`);
      return;
    }
  }

  const targetUid = docId || auth.currentUser.uid;
  if (!targetUid) return;
  const path = `userPlanners/${targetUid}`;
  try {
    const userDocRef = doc(db, 'userPlanners', targetUid);
    const rawData = {
      userId: targetUid,
      phoneNumber: phoneNumber || '소셜 계정',
      userProfile: data.userProfile || {},
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
    console.log(`[Firestore Save Executed] ✅ Firestore 저장 완료 (reason: ${reason}, Req ID: ${requestId}, items: ${sanitizedData.items?.length || 0})`);
  } catch (error) {
    console.error('[Firestore] 데이터 저장 실패:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Subscribe to real-time updates for logged-in user
export function subscribeToUserPlanner(
  docId: string,
  onData: (data: UserPlannerData, exists: boolean) => void,
  onError?: (error: unknown) => void
) {
  const targetUid = docId || auth.currentUser?.uid;
  if (!targetUid) return () => {};
  const path = `userPlanners/${targetUid}`;
  console.log('[Firestore] 실시간 구독 시작:', path);
  try {
    const userDocRef = doc(db, 'userPlanners', targetUid);
    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserPlannerData;
          console.log("Firestore 실시간 데이터 수신 성공:", data);
          console.log("불러온 items 개수:", data?.items?.length || 0);
          onData(data, true);
        } else {
          console.log('[Firestore] 실시간 구독: 문서가 존재하지 않음', targetUid);
          onData({} as UserPlannerData, false);
        }
      },
      (error) => {
        // 중요: 이전에는 이 에러가 콘솔에만 기록되고 App 쪽으로 전달되지 않아,
        // 구독이 실패해도 앱이 "동기화 중..." 로딩 화면에서 영원히 멈춰있는 원인이었습니다.
        // (권한 부족, 잘못된 Firestore 데이터베이스 ID, 네트워크 차단 등)
        console.error('Firestore 동기화 실패:', error);
        handleFirestoreError(error, OperationType.GET, path);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('[Firestore] 구독 설정 중 예외 발생:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Real Firebase Logout
export async function logoutUser() {
  localStorage.removeItem('plannerData');
  localStorage.removeItem('lux_active_phone_docId');
  localStorage.removeItem('lux_active_phone');
  localStorage.removeItem('lux_life_planner_profile_v2');
  localStorage.removeItem('lux_life_planner_items_v2');
  localStorage.removeItem('lux_life_planner_yearly_items_v2');
  localStorage.removeItem('lux_life_planner_long_term_v2');
  localStorage.removeItem('lux_life_planner_categories_v2');
  localStorage.removeItem('lux_life_planner_color_map_v2');
  localStorage.removeItem('lux_life_planner_daily_events_v2');
  await signOut(auth).catch(() => {});
}

export { onAuthStateChanged };
