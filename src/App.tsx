import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { TimetableGrid } from './components/TimetableGrid';
import { ScheduleModal } from './components/ScheduleModal';
import { ColorManagerModal } from './components/ColorManagerModal';
import { MonthCalendarAndCategory } from './components/MonthCalendarAndCategory';
import { YearlyCalendarView } from './components/YearlyCalendarView';
import { LongTermPlannerView } from './components/LongTermPlannerView';
import { UserAccountBar } from './components/UserAccountBar';
import { AuthModal } from './components/AuthModal';
import { ScheduleItem, UserProfile, DailyEvents, YearlyScheduleItem, LongTermPlannerData, CategoryItem } from './types';
import { getMonday, getTwoWeekDays, formatDateKey, parseDateKey, formatKoreanDateShort } from './utils/dateUtils';
import { DEFAULT_USER, INITIAL_CATEGORIES } from './utils/constants';
import { generateSampleData } from './utils/sampleData';
import {
  auth,
  onAuthStateChanged,
  subscribeToUserPlanner,
  saveUserDataToFirestore,
  logoutUser,
} from './lib/authService';

const STORAGE_KEYS = {
  PROFILE: 'lux_life_planner_profile_v2',
  ITEMS: 'lux_life_planner_items_v2',
  YEARLY_ITEMS: 'lux_life_planner_yearly_items_v2',
  LONG_TERM_PLANNER: 'lux_life_planner_long_term_v2',
  CATEGORIES: 'lux_life_planner_categories_v2',
  COLOR_MAP: 'lux_life_planner_color_map_v2',
  DAILY_EVENTS: 'lux_life_planner_daily_events_v2',
};

function getPlannerDataCache(): any {
  try {
    const raw = localStorage.getItem('plannerData');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  // Auth & Sync state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const isRemoteUpdatingRef = useRef(false);
  const isSnapshotReadyRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>('');

  // 1. 상태 정의 (LocalStorage plannerData 캐시 또는 기존 백업 키 / Remote)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const cache = getPlannerDataCache();
      if (cache?.userProfile) return cache.userProfile;
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name === '김서연' || parsed.name === 'OOO의' || parsed.name === 'OOO') {
          parsed.name = '';
        }
        if (parsed.motto) {
          parsed.motto = parsed.motto.replace(/우아하고/g, '활기차고');
        }
        return parsed;
      }
      return DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [items, setItems] = useState<ScheduleItem[]>(() => {
    try {
      const cache = getPlannerDataCache();
      if (cache?.items && Array.isArray(cache.items)) {
        return cache.items.filter((item: ScheduleItem) => !item.id.startsWith('sample-'));
      }
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any sample items
          const filtered = parsed.filter(item => !item.id.startsWith('sample-'));
          return filtered;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const cache = getPlannerDataCache();
      if (cache?.categories && Array.isArray(cache.categories)) return cache.categories;
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) return JSON.parse(saved);
      return INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [dailyEvents, setDailyEvents] = useState<DailyEvents>(() => {
    try {
      const cache = getPlannerDataCache();
      if (cache?.dailyEvents) return cache.dailyEvents;
      const saved = localStorage.getItem(STORAGE_KEYS.DAILY_EVENTS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [yearlyItems, setYearlyItems] = useState<YearlyScheduleItem[]>(() => {
    try {
      const cache = getPlannerDataCache();
      if (cache?.yearlyItems && Array.isArray(cache.yearlyItems)) return cache.yearlyItems;
      const saved = localStorage.getItem(STORAGE_KEYS.YEARLY_ITEMS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [longTermPlanner, setLongTermPlanner] = useState<LongTermPlannerData | undefined>(() => {
    try {
      const cache = getPlannerDataCache();
      if (cache?.longTermPlanner) return cache.longTermPlanner;
      const saved = localStorage.getItem(STORAGE_KEYS.LONG_TERM_PLANNER);
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  });

  // 2주 시작 월요일 기준일
  const [baseMonday, setBaseMonday] = useState<Date>(() => getMonday(new Date()));
  const [viewMode, setViewMode] = useState<'twoWeekHorizontal' | 'splitCalendar' | 'yearlyCalendar' | 'longTermPlanner'>('splitCalendar');

  // 모달 제어 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColorManagerOpen, setIsColorManagerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');
  const [modalDefaultStartHour, setModalDefaultStartHour] = useState<number>(9);
  const [modalDefaultStartMinute, setModalDefaultStartMinute] = useState<number>(0);
  const [modalDefaultDuration, setModalDefaultDuration] = useState<number>(4); // 4 = 1시간

  const [activeDocId, setActiveDocId] = useState<string>(() => localStorage.getItem('lux_active_phone_docId') || '');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [isFirestoreLoaded, setIsFirestoreLoaded] = useState<boolean>(false);

  // 클립보드 복사된 하루 일정 상태
  const [copiedDayItems, setCopiedDayItems] = useState<ScheduleItem[] | null>(null);
  const [copiedSourceDateStr, setCopiedSourceDateStr] = useState<string>('');

  // 상단 알림 메시지 토스트 state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Auth Listener & Realtime Firestore Sync with Persistent Session Restoration
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        console.log("현재 연동된 유저 UID:", user.uid);
        const docId = user.uid;
        const accountName = user.email
          ? `${user.displayName || user.email.split('@')[0]} (${user.email})`
          : user.displayName || 'Google 계정';

        setCurrentUserPhone(accountName);
        setActiveDocId(docId);
        setIsDataLoading(true);
        localStorage.setItem('lux_active_phone_docId', docId);
        localStorage.setItem('lux_active_phone', accountName);

        setUserProfile((prev) => ({
          ...prev,
          name: user.displayName || prev.name,
          avatarUrl: user.photoURL || prev.avatarUrl || '',
        }));
      } else {
        console.log('[Auth] 로그아웃 상태');
        setCurrentUserPhone(null);
        setActiveDocId('');
        setIsDataLoading(false);
        setIsFirestoreLoaded(false);
        isSnapshotReadyRef.current = false;

        // Clear local storage cache completely on logout
        localStorage.removeItem('plannerData');
        localStorage.removeItem('lux_active_phone_docId');
        localStorage.removeItem('lux_active_phone');
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
        localStorage.removeItem(STORAGE_KEYS.ITEMS);
        localStorage.removeItem(STORAGE_KEYS.YEARLY_ITEMS);
        localStorage.removeItem(STORAGE_KEYS.LONG_TERM_PLANNER);
        localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
        localStorage.removeItem(STORAGE_KEYS.DAILY_EVENTS);

        // Safety reset state on logout
        setUserProfile(DEFAULT_USER);
        setItems([]);
        setYearlyItems([]);
        setCategories(INITIAL_CATEGORIES);
        setDailyEvents({});
        setLongTermPlanner(undefined);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleAuthSuccess = (
    docId: string,
    phone: string,
    userInfo?: { name: string; email: string; avatarUrl: string }
  ) => {
    isRemoteUpdatingRef.current = true;
    setActiveDocId(docId);
    setCurrentUserPhone(phone);
    setIsDataLoading(true);
    localStorage.setItem('lux_active_phone_docId', docId);
    localStorage.setItem('lux_active_phone', phone);

    if (userInfo) {
      setUserProfile((prev) => ({
        ...prev,
        name: userInfo.name || prev.name,
        avatarUrl: userInfo.avatarUrl || prev.avatarUrl || '',
      }));
    }

    setTimeout(() => {
      isRemoteUpdatingRef.current = false;
    }, 1000);
  };

  const handleLogout = async () => {
    isRemoteUpdatingRef.current = true;
    isSnapshotReadyRef.current = false;
    hasReceivedInitialSnapshotRef.current = false;
    setIsFirestoreLoaded(false);

    // Clear all LocalStorage keys completely
    localStorage.removeItem('plannerData');
    localStorage.removeItem('lux_active_phone_docId');
    localStorage.removeItem('lux_active_phone');
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.ITEMS);
    localStorage.removeItem(STORAGE_KEYS.YEARLY_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.LONG_TERM_PLANNER);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.DAILY_EVENTS);

    // 1. Sign out from Firebase Auth first to terminate session
    await logoutUser();

    // 2. Clear Auth/User state
    setActiveDocId('');
    setCurrentUserPhone(null);
    setCurrentUser(null);

    // 3. Reset UI data state
    setUserProfile(DEFAULT_USER);
    setItems([]);
    setYearlyItems([]);
    setCategories(INITIAL_CATEGORIES);
    setDailyEvents({});
    setLongTermPlanner(undefined);
    setIsDataLoading(false);

    setTimeout(() => {
      isRemoteUpdatingRef.current = false;
    }, 500);
  };

  const pendingSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasReceivedInitialSnapshotRef = useRef<boolean>(false);
  const isUserEditingRef = useRef<boolean>(false);
  const saveRequestIdRef = useRef<number>(0);

  // Helper: Create normalized canonical payload string for accurate equality checks
  const createNormalizedPayloadString = (data: {
    userProfile?: any;
    items?: any[];
    yearlyItems?: any[];
    longTermPlanner?: any;
    categories?: any[];
    dailyEvents?: any;
  }) => {
    return JSON.stringify({
      userProfile: data.userProfile || DEFAULT_USER,
      items: Array.isArray(data.items) ? data.items : [],
      yearlyItems: Array.isArray(data.yearlyItems) ? data.yearlyItems : [],
      longTermPlanner: data.longTermPlanner || null,
      categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : INITIAL_CATEGORIES,
      dailyEvents: data.dailyEvents && typeof data.dailyEvents === 'object' ? data.dailyEvents : {},
    });
  };

  // 1. LocalStorage Auto-Save Effect (Runs on local state change ONLY when logged in and snapshot is ready)
  useEffect(() => {
    if (!currentUser || !isFirestoreLoaded || !isSnapshotReadyRef.current) return;

    try {
      const nowIso = new Date().toISOString();
      const fullData = {
        userProfile,
        items,
        yearlyItems,
        categories,
        dailyEvents,
        longTermPlanner,
        updatedAt: nowIso,
      };
      localStorage.setItem('plannerData', JSON.stringify(fullData));
      localStorage.setItem('lux_last_updated_at', nowIso);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile));
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      localStorage.setItem(STORAGE_KEYS.YEARLY_ITEMS, JSON.stringify(yearlyItems));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      localStorage.setItem(STORAGE_KEYS.DAILY_EVENTS, JSON.stringify(dailyEvents));
      if (longTermPlanner) {
        localStorage.setItem(STORAGE_KEYS.LONG_TERM_PLANNER, JSON.stringify(longTermPlanner));
      }
      console.log('[LocalStorage] 로컬 데이터 캐싱 완료 (plannerData, items:', items.length, ')');
    } catch (e) {
      console.error('[LocalStorage] 로컬 데이터 저장 실패:', e);
    }
  }, [userProfile, items, yearlyItems, categories, dailyEvents, longTermPlanner, currentUser, isFirestoreLoaded]);

  // Subscribe to user Firestore planner document when logged in
  useEffect(() => {
    const currentDocId = currentUser?.uid;
    if (!currentDocId) {
      console.log('[Sync] 로그인 정보가 없어 Firestore 실시간 구독을 대기합니다.');
      isSnapshotReadyRef.current = false;
      hasReceivedInitialSnapshotRef.current = false;
      setIsDataLoading(false);
      setIsFirestoreLoaded(false);
      return;
    }

    console.log('[Sync] Firestore 구독 시작. UID:', currentDocId);
    hasReceivedInitialSnapshotRef.current = false;

    const unsubscribeDoc = subscribeToUserPlanner(currentDocId, (data, exists) => {
      // Invalidate any in-flight or scheduled auto-save request by incrementing request ID version
      saveRequestIdRef.current += 1;
      isUserEditingRef.current = false;

      // 1. Check local storage cache or current state for conflict resolution
      let localCache: any = null;
      try {
        const raw = localStorage.getItem('plannerData');
        localCache = raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('LocalStorage plannerData parse error:', e);
      }

      const localItems = Array.isArray(localCache?.items) && localCache.items.length > 0
        ? localCache.items
        : items;
      
      const localUpdatedAtStr = localCache?.updatedAt || localStorage.getItem('lux_last_updated_at');
      const localUpdatedAt = localUpdatedAtStr ? new Date(localUpdatedAtStr).getTime() : 0;

      const remoteItems = Array.isArray(data?.items) ? data.items : [];
      const remoteUpdatedAtStr = data?.updatedAt;
      const remoteUpdatedAt = remoteUpdatedAtStr ? new Date(remoteUpdatedAtStr).getTime() : 0;

      console.log(`[Sync Conflict Check] Local items: ${localItems.length} (updatedAt: ${localUpdatedAtStr || 'none'})`);
      console.log(`[Sync Conflict Check] Remote exists: ${exists}, items: ${remoteItems.length} (updatedAt: ${remoteUpdatedAtStr || 'none'})`);

      // Conflict Resolution Logic:
      // If remote doc does not exist, OR local items exist while remote items are empty, OR local data timestamp is distinctly newer:
      const shouldPushLocal =
        !exists ||
        (localItems.length > 0 && remoteItems.length === 0) ||
        (localUpdatedAt > 0 && remoteUpdatedAt > 0 && localUpdatedAt > remoteUpdatedAt);

      if (shouldPushLocal && localItems.length > 0) {
        console.log(`[Sync Resolution] 로컬 데이터가 더 최신이거나 서버 데이터가 비어있습니다. 로컬 데이터(${localItems.length}개)를 Firestore로 업로드합니다.`);
        
        const localPayload = {
          userProfile: localCache?.userProfile || userProfile,
          items: localItems,
          yearlyItems: localCache?.yearlyItems || yearlyItems,
          longTermPlanner: localCache?.longTermPlanner || longTermPlanner,
          categories: localCache?.categories || categories,
          dailyEvents: localCache?.dailyEvents || dailyEvents,
        };

        const currentPayload = createNormalizedPayloadString(localPayload);
        lastSavedPayloadRef.current = currentPayload;

        saveUserDataToFirestore(currentDocId, currentUserPhone || '', localPayload)
          .then(() => {
            isSnapshotReadyRef.current = true;
            hasReceivedInitialSnapshotRef.current = true;
            setIsFirestoreLoaded(true);
            setIsDataLoading(false);
          })
          .catch((err) => {
            console.error('[Sync] Firestore 로컬 데이터 동기화 업로드 실패:', err);
            isSnapshotReadyRef.current = true;
            hasReceivedInitialSnapshotRef.current = true;
            setIsFirestoreLoaded(true);
            setIsDataLoading(false);
          });
        return;
      }

      // Check if incoming remote payload is identical to our last saved/received payload
      const receivedItems = remoteItems;
      const receivedYearlyItems = Array.isArray(data.yearlyItems) ? data.yearlyItems : [];
      const receivedCategories = Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : INITIAL_CATEGORIES;
      const receivedDailyEvents = data.dailyEvents && typeof data.dailyEvents === 'object' ? data.dailyEvents : {};
      const receivedLongTermPlanner = data.longTermPlanner || undefined;

      const incomingPayload = createNormalizedPayloadString({
        userProfile: data.userProfile || DEFAULT_USER,
        items: receivedItems,
        yearlyItems: receivedYearlyItems,
        longTermPlanner: receivedLongTermPlanner,
        categories: receivedCategories,
        dailyEvents: receivedDailyEvents,
      });

      // 2. Equality Guard: If remote data matches our current active state, skip setState & avoid triggering auto-save
      if (lastSavedPayloadRef.current === incomingPayload) {
        console.log("[Sync Resolution] 수신된 원격 데이터가 현재 앱 상태와 동일합니다. setState 업데이트를 스킵합니다.");
        isSnapshotReadyRef.current = true;
        hasReceivedInitialSnapshotRef.current = true;
        setIsFirestoreLoaded(true);
        setIsDataLoading(false);
        return;
      }

      // 3. Remote Update Active: Cancel any pending local auto-save timer immediately
      if (pendingSaveTimerRef.current) {
        console.log('[Sync Resolution] 원격 스냅샷 수신 -> 대기 중인 로컬 자동 저장 타이머를 즉시 취소합니다.');
        clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }

      console.log("[Sync Resolution] Firestore 원격 데이터 적용. 불러온 items 개수:", remoteItems.length);
      isRemoteUpdatingRef.current = true;
      lastSavedPayloadRef.current = incomingPayload;

      if (data.phoneNumber) {
        setCurrentUserPhone(data.phoneNumber);
        localStorage.setItem('lux_active_phone', data.phoneNumber);
      }
      if (data.userProfile) {
        const cleanProfile = { ...data.userProfile };
        if (cleanProfile.name === 'OOO의' || cleanProfile.name === 'OOO' || cleanProfile.name === '김서연') {
          cleanProfile.name = '';
        }
        setUserProfile(cleanProfile);
      } else {
        setUserProfile(DEFAULT_USER);
      }

      setItems(receivedItems);
      setYearlyItems(receivedYearlyItems);
      setLongTermPlanner(receivedLongTermPlanner);
      setCategories(receivedCategories);
      setDailyEvents(receivedDailyEvents);

      console.log("UI 상태 업데이트 완료, 적용된 items 개수:", receivedItems.length);

      // Save raw snapshot data into LocalStorage cache
      try {
        const nowIso = data.updatedAt || new Date().toISOString();
        const cachePayload = {
          userProfile: data.userProfile || DEFAULT_USER,
          items: receivedItems,
          yearlyItems: receivedYearlyItems,
          categories: receivedCategories,
          dailyEvents: receivedDailyEvents,
          longTermPlanner: receivedLongTermPlanner,
          updatedAt: nowIso,
        };
        localStorage.setItem('plannerData', JSON.stringify(cachePayload));
        localStorage.setItem('lux_last_updated_at', nowIso);
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data.userProfile || DEFAULT_USER));
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(receivedItems));
        localStorage.setItem(STORAGE_KEYS.YEARLY_ITEMS, JSON.stringify(receivedYearlyItems));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(receivedCategories));
        localStorage.setItem(STORAGE_KEYS.DAILY_EVENTS, JSON.stringify(receivedDailyEvents));
        if (receivedLongTermPlanner) {
          localStorage.setItem(STORAGE_KEYS.LONG_TERM_PLANNER, JSON.stringify(receivedLongTermPlanner));
        }
      } catch (e) {
        console.error('[LocalStorage] plannerData 캐시 저장 실패:', e);
      }

      setLastSyncedAt(new Date().toLocaleTimeString());
      isSnapshotReadyRef.current = true;
      hasReceivedInitialSnapshotRef.current = true;
      setIsFirestoreLoaded(true);
      setIsDataLoading(false);

      // Release remote updating flag on next tick after React state flush
      setTimeout(() => {
        isRemoteUpdatingRef.current = false;
      }, 0);
    });

    return () => {
      console.log('[Sync] Firestore 구독 해제 (UID:', currentDocId, ')');
      if (typeof unsubscribeDoc === 'function') {
        unsubscribeDoc();
      }
      isSnapshotReadyRef.current = false;
      hasReceivedInitialSnapshotRef.current = false;
      setIsFirestoreLoaded(false);
    };
  }, [currentUser?.uid]);

  // Sync data to Firestore on local changes (if logged in) with debouncing & payload check
  useEffect(() => {
    // Guard 0: Absolute block during app/sync initialization
    if (!hasReceivedInitialSnapshotRef.current) {
      setIsSyncing(false);
      return;
    }

    // Guard 1: Must be logged in via auth.currentUser and state, and initial Firestore data must be loaded
    if (!auth.currentUser || !currentUser || !isFirestoreLoaded || !isSnapshotReadyRef.current) {
      if (!auth.currentUser || !currentUser) {
        console.log("비로그인 상태이므로 Firestore 저장을 건너띕니다.");
      }
      setIsSyncing(false);
      return;
    }

    // Guard 2: Skip auto-save if state update was triggered by receiving remote data
    if (isRemoteUpdatingRef.current) {
      console.log('[Sync AutoSave Guard] 원격 스냅샷 업데이트 진행 중 - 자동 저장을 차단합니다.');
      setIsSyncing(false);
      return;
    }

    // Guard 3: CRITICAL EXPLICIT USER EDIT GUARD - MUST BE TRUE TO AUTO-SAVE!
    if (!isUserEditingRef.current) {
      console.log('[Sync AutoSave Guard] 사용자 직접 변경이 아니므로(isUserEditingRef=false) 자동 저장을 건너띕니다.');
      setIsSyncing(false);
      return;
    }

    const currentDocId = currentUser?.uid || activeDocId;

    if (!currentDocId || !isSnapshotReadyRef.current) {
      setIsSyncing(false);
      return;
    }

    const payloadObj = {
      userProfile,
      items,
      yearlyItems,
      longTermPlanner,
      categories,
      dailyEvents,
    };

    const currentPayload = createNormalizedPayloadString(payloadObj);

    // Guard 4: If payload has not changed since last saved/received, do nothing
    if (lastSavedPayloadRef.current === currentPayload) {
      setIsSyncing(false);
      return;
    }

    // Cancel previous pending save timer if user made new local edit
    if (pendingSaveTimerRef.current) {
      clearTimeout(pendingSaveTimerRef.current);
      pendingSaveTimerRef.current = null;
    }

    // Capture current save request ID
    const thisSaveRequestId = ++saveRequestIdRef.current;

    console.log(`[Sync AutoSave] ⚡ [실제 사용자 변경 감지] 400ms 후 자동 저장 예약 (Request ID: ${thisSaveRequestId})`);

    pendingSaveTimerRef.current = setTimeout(async () => {
      // Re-verify ALL flags right before actual network call to ensure no remote update occurred during debounce wait
      if (
        thisSaveRequestId !== saveRequestIdRef.current ||
        !hasReceivedInitialSnapshotRef.current ||
        isRemoteUpdatingRef.current ||
        !isUserEditingRef.current ||
        !isFirestoreLoaded ||
        !currentUser ||
        !auth.currentUser
      ) {
        console.log(`[Sync AutoSave Abort] 🛑 저장이 차단/취소되었습니다 (Request ID: ${thisSaveRequestId}, Current ID: ${saveRequestIdRef.current}, UserEdit: ${isUserEditingRef.current}, RemoteUpdating: ${isRemoteUpdatingRef.current})`);
        setIsSyncing(false);
        return;
      }

      setIsSyncing(true);
      console.log(`[Sync AutoSave Execute] 🚀 [실제 사용자 변경] Firestore 저장을 실행합니다... (Request ID: ${thisSaveRequestId}, items: ${items.length}개)`);

      try {
        await saveUserDataToFirestore(currentDocId, currentUserPhone || '', payloadObj);

        // Final verification after async network write completes
        if (thisSaveRequestId === saveRequestIdRef.current) {
          lastSavedPayloadRef.current = currentPayload;
          isUserEditingRef.current = false; // Reset user edit flag after successful save
          setLastSyncedAt(new Date().toLocaleTimeString());
          console.log(`[Sync AutoSave Success] ✅ [실제 사용자 변경] Firestore 저장 성공! (Request ID: ${thisSaveRequestId}, items: ${items.length}개)`);
        } else {
          console.log(`[Sync AutoSave Notice] ⚠️ 저장 완료 후 요청 ID가 변경되어 상태 업데이트를 무효화합니다 (Req ID: ${thisSaveRequestId}, Current ID: ${saveRequestIdRef.current})`);
        }
      } catch (err) {
        console.error('[Sync AutoSave Error] Firestore 자동 저장 중 실패:', err);
      } finally {
        setIsSyncing(false);
        pendingSaveTimerRef.current = null;
      }
    }, 400);

    return () => {
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
    };
  }, [userProfile, items, yearlyItems, longTermPlanner, categories, dailyEvents, currentUser, currentUserPhone, activeDocId, isFirestoreLoaded]);

  const handleUpdateDailyEvent = (dateStr: string, text: string) => {
    isUserEditingRef.current = true;
    setDailyEvents((prev) => ({
      ...prev,
      [dateStr]: text,
    }));
  };

  // 연간 달력 일정 C.R.U.D 핸들러
  const handleAddYearlyItems = (newItemsData: Omit<YearlyScheduleItem, 'id'>[]) => {
    isUserEditingRef.current = true;
    const newItems: YearlyScheduleItem[] = newItemsData.map((data, idx) => ({
      ...data,
      id: `yearly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
    }));
    setYearlyItems((prev) => [...prev, ...newItems]);
  };

  const handleUpdateYearlyItem = (updatedItem: YearlyScheduleItem) => {
    isUserEditingRef.current = true;
    setYearlyItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleDeleteYearlyItem = (id: string) => {
    isUserEditingRef.current = true;
    setYearlyItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleYearlyComplete = (id: string) => {
    isUserEditingRef.current = true;
    setYearlyItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // 3. 2주 날짜 배열 구하기 (14일)
  const twoWeekDays = getTwoWeekDays(baseMonday);

  // 4. 주차 이동 헬퍼 (1주 = 7일 단위 이동)
  const handlePrevWeek = () => {
    const prev = new Date(baseMonday);
    prev.setDate(prev.getDate() - 7);
    setBaseMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(baseMonday);
    next.setDate(next.getDate() + 7);
    setBaseMonday(next);
  };

  const handleGoToday = () => {
    setBaseMonday(getMonday(new Date()));
  };

  const handleSelectCalendarDate = (selectedDate: Date) => {
    setBaseMonday(getMonday(selectedDate));
  };

  // 5. 모달 열기 핸들러
  const handleOpenAddModal = () => {
    setSelectedItem(null);
    setModalDefaultDate(formatDateKey(twoWeekDays[0]));
    setModalDefaultStartHour(9);
    setModalDefaultStartMinute(0);
    setModalDefaultDuration(4);
    setIsModalOpen(true);
  };

  const handleSelectSlotToCreate = (
    dateStr: string,
    startHour: number,
    startMinute: number = 0,
    durationSlots: number = 4
  ) => {
    setSelectedItem(null);
    setModalDefaultDate(dateStr);
    setModalDefaultStartHour(startHour);
    setModalDefaultStartMinute(startMinute);
    setModalDefaultDuration(durationSlots);
    setIsModalOpen(true);
  };

  const handleOpenScheduleModalWithDate = (dateStr: string) => {
    setSelectedItem(null);
    setModalDefaultDate(dateStr);
    setModalDefaultStartHour(9);
    setModalDefaultStartMinute(0);
    setModalDefaultDuration(4);
    setIsModalOpen(true);
  };

  const handleSelectItem = (item: ScheduleItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // 반복 일정 연관 항목 찾기 (그룹 ID 우선, 없으면 제목/시간 기반 폴백)
  const findRecurringGroupItems = (targetItem: ScheduleItem, allItems: ScheduleItem[]): ScheduleItem[] => {
    if (targetItem.recurringGroupId) {
      return allItems.filter((it) => it.recurringGroupId === targetItem.recurringGroupId);
    }
    // 레거시 반복 일정 (groupId 미지정) 폴백
    const matches = allItems.filter(
      (it) =>
        it.title.trim() === targetItem.title.trim() &&
        it.startHour === targetItem.startHour &&
        (it.startMinute || 0) === (targetItem.startMinute || 0) &&
        (it.duration || 4) === (targetItem.duration || 4)
    );
    return matches.length > 1 ? matches : [targetItem];
  };

  // 6. 일정 저장 (자동 색상 기억, 15분 단위 및 반복 일정 처리)
  const handleSaveSchedule = (
    itemData: Partial<ScheduleItem>,
    recurringOptions?: {
      isRecurring: boolean;
      type: 'daily' | 'weekly';
      days: number[];
      updateScope?: 'single' | 'all' | 'convertToRecurring';
    }
  ) => {
    isRemoteUpdatingRef.current = false;
    isUserEditingRef.current = true;
    if (!itemData.title || !itemData.date) return;

    if (itemData.id) {
      // 기존 일정 수정
      const targetItem = items.find((it) => it.id === itemData.id);
      if (!targetItem) return;

      const scope = recurringOptions?.updateScope || 'single';

      if (scope === 'all' && targetItem) {
        // 그룹 전체 수정
        const groupItems = findRecurringGroupItems(targetItem, items);
        const groupIds = new Set(groupItems.map((it) => it.id));
        const groupId =
          targetItem.recurringGroupId ||
          `recgroup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        if (recurringOptions?.isRecurring) {
          // 반복 속성 유지/수정: 그룹 내 항목 전체 내용 갱신
          setItems((prev) => {
            const updated = prev.map((it) => {
              if (groupIds.has(it.id)) {
                return {
                  ...it,
                  title: itemData.title!.trim(),
                  startHour: itemData.startHour ?? it.startHour,
                  startMinute: itemData.startMinute ?? it.startMinute,
                  duration: itemData.duration ?? it.duration,
                  color: itemData.color ?? it.color,
                  textColor: itemData.textColor ?? it.textColor,
                  isRecurring: true,
                  recurringGroupId: groupId,
                  recurringType: recurringOptions.type,
                  recurringDays: recurringOptions.days,
                };
              }
              return it;
            });

            // 주간 반복에서 요일 변경 시 제외된 요일 항목 정리
            if (recurringOptions.type === 'weekly' && recurringOptions.days.length > 0) {
              return updated.filter((it) => {
                if (groupIds.has(it.id)) {
                  const dayNum = parseDateKey(it.date).getDay();
                  return recurringOptions.days.includes(dayNum);
                }
                return true;
              });
            }
            return updated;
          });
        } else {
          // 반복 해제: 모두 일반 일정으로 변경
          setItems((prev) =>
            prev.map((it) => {
              if (groupIds.has(it.id)) {
                const copy = { ...it };
                delete copy.isRecurring;
                delete copy.recurringGroupId;
                delete copy.recurringType;
                delete copy.recurringDays;
                return {
                  ...copy,
                  title: itemData.title!.trim(),
                  startHour: itemData.startHour ?? it.startHour,
                  startMinute: itemData.startMinute ?? it.startMinute,
                  duration: itemData.duration ?? it.duration,
                  color: itemData.color ?? it.color,
                  textColor: itemData.textColor ?? it.textColor,
                };
              }
              return it;
            })
          );
        }
      } else if (scope === 'convertToRecurring') {
        // 단일 일정을 반복 일정으로 새로 확장 생성 (8주간 56일)
        const groupId = `recgroup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const baseDateObj = parseDateKey(itemData.date);
        const newItems: ScheduleItem[] = [];

        for (let i = 0; i < 56; i++) {
          const d = new Date(baseDateObj);
          d.setDate(baseDateObj.getDate() + i);
          const dateStr = formatDateKey(d);
          const dayNum = d.getDay();

          let shouldCreate = false;
          if (recurringOptions?.type === 'daily') {
            shouldCreate = true;
          } else if (recurringOptions?.type === 'weekly') {
            shouldCreate = (recurringOptions.days || []).includes(dayNum);
          }

          if (shouldCreate) {
            if (i === 0) {
              newItems.push({
                ...targetItem,
                title: itemData.title!.trim(),
                date: dateStr,
                startHour: itemData.startHour ?? targetItem.startHour,
                startMinute: itemData.startMinute ?? targetItem.startMinute,
                duration: itemData.duration ?? targetItem.duration,
                color: itemData.color ?? targetItem.color,
                textColor: itemData.textColor ?? targetItem.textColor,
                isRecurring: true,
                recurringGroupId: groupId,
                recurringType: recurringOptions?.type,
                recurringDays: recurringOptions?.days,
              });
            } else {
              newItems.push({
                id: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
                title: itemData.title!.trim(),
                date: dateStr,
                startHour: itemData.startHour ?? targetItem.startHour,
                startMinute: itemData.startMinute ?? targetItem.startMinute,
                duration: itemData.duration ?? targetItem.duration,
                color: itemData.color ?? targetItem.color,
                textColor: itemData.textColor ?? targetItem.textColor,
                isRecurring: true,
                recurringGroupId: groupId,
                recurringType: recurringOptions?.type,
                recurringDays: recurringOptions?.days,
              });
            }
          }
        }

        setItems((prev) => [...prev.filter((it) => it.id !== targetItem.id), ...newItems]);
      } else {
        // 단일 항목 수정 (독립적인 단일 일정으로 개별 반영)
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === itemData.id) {
              const updatedItem: ScheduleItem = {
                ...it,
                ...itemData,
                title: itemData.title!.trim(),
              };
              if (!recurringOptions?.isRecurring) {
                delete updatedItem.isRecurring;
                delete updatedItem.recurringGroupId;
                delete updatedItem.recurringType;
                delete updatedItem.recurringDays;
              } else if (scope === 'single' && it.recurringGroupId) {
                // 단일 개별 수정 시 그룹 ID 해제하여 독자 일정으로 분리
                delete updatedItem.recurringGroupId;
              }
              return updatedItem;
            }
            return it;
          })
        );
      }
    } else {
      // 신규 일정 생성
      if (recurringOptions?.isRecurring) {
        const groupId = `recgroup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newItems: ScheduleItem[] = [];
        const baseDateObj = parseDateKey(itemData.date);

        for (let i = 0; i < 56; i++) {
          const d = new Date(baseDateObj);
          d.setDate(baseDateObj.getDate() + i);
          const dateStr = formatDateKey(d);
          const dayNum = d.getDay();

          let shouldCreate = false;
          if (recurringOptions.type === 'daily') {
            shouldCreate = true;
          } else if (recurringOptions.type === 'weekly') {
            shouldCreate = recurringOptions.days.includes(dayNum);
          }

          if (shouldCreate) {
            newItems.push({
              id: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
              title: itemData.title!.trim(),
              date: dateStr,
              startHour: itemData.startHour || 9,
              startMinute: itemData.startMinute || 0,
              duration: itemData.duration || 4,
              color: itemData.color || '#F5F5F4',
              textColor: itemData.textColor || '#2D2926',
              isRecurring: true,
              recurringGroupId: groupId,
              recurringType: recurringOptions.type,
              recurringDays: recurringOptions.days,
            });
          }
        }

        setItems((prev) => [...prev, ...newItems]);
      } else {
        const newItem: ScheduleItem = {
          id: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: itemData.title!.trim(),
          date: itemData.date!,
          startHour: itemData.startHour || 9,
          startMinute: itemData.startMinute || 0,
          duration: itemData.duration || 4,
          color: itemData.color || '#F5F5F4',
          textColor: itemData.textColor || '#2D2926',
        };

        setItems((prev) => [...prev, newItem]);
      }
    }
  };

  // 7. 일정 삭제
  const handleDeleteItem = (id: string, deleteScope: 'single' | 'all' = 'single') => {
    isRemoteUpdatingRef.current = false;
    isUserEditingRef.current = true;
    const targetItem = items.find((it) => it.id === id);
    if (!targetItem) return;

    if (deleteScope === 'all') {
      const groupItems = findRecurringGroupItems(targetItem, items);
      const groupIds = new Set(groupItems.map((it) => it.id));
      setItems((prev) => prev.filter((it) => !groupIds.has(it.id)));
    } else {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  // 7-1. 특정 날짜 하루 전체 일정 삭제
  const handleDeleteDayItems = (dateStr: string) => {
    const dayItems = items.filter((it) => it.date === dateStr);
    if (dayItems.length === 0) {
      showToast('삭제할 일정이 없습니다.');
      return;
    }

    const [year, month, day] = dateStr.split('-');
    const formattedDateStr = `${Number(month)}월 ${Number(day)}일`;
    if (window.confirm(`${formattedDateStr}의 모든 일정(${dayItems.length}개)을 삭제하시겠습니까?`)) {
      isUserEditingRef.current = true;
      setItems((prev) => prev.filter((it) => it.date !== dateStr));
      showToast(`${formattedDateStr}의 모든 일정이 삭제되었습니다.`);
    }
  };

  // 7-2. 하루 일정 복사
  const handleCopyDayItems = (dateStr: string) => {
    const dayItems = items.filter((it) => it.date === dateStr);
    if (dayItems.length === 0) {
      showToast('복사할 일정이 없습니다.');
      return;
    }
    const [year, month, day] = dateStr.split('-');
    const formattedDateStr = `${Number(month)}월 ${Number(day)}일`;
    setCopiedDayItems(dayItems);
    setCopiedSourceDateStr(formattedDateStr);
    showToast(`${formattedDateStr} 일정(${dayItems.length}개)이 복사되었습니다.`);
  };

  // 7-3. 하루 일정 붙여넣기
  const handlePasteDayItems = (targetDateStr: string) => {
    if (!copiedDayItems || copiedDayItems.length === 0) {
      showToast('복사된 일정이 없습니다. 먼저 일정을 복사해 주세요.');
      return;
    }
    const [year, month, day] = targetDateStr.split('-');
    const formattedDateStr = `${Number(month)}월 ${Number(day)}일`;

    const newItemsToAppend: ScheduleItem[] = copiedDayItems.map((item) => ({
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: targetDateStr,
      createdAt: new Date().toISOString(),
    }));

    isUserEditingRef.current = true;
    setItems((prev) => [...prev, ...newItemsToAppend]);
    showToast(`${copiedSourceDateStr}의 일정 ${copiedDayItems.length}개를 ${formattedDateStr}로 붙여넣었습니다.`);
  };

  // 7-4. 드래그앤드롭으로 일정 위치(날짜/시간) 이동
  const handleMoveItem = (id: string, targetDateStr: string, startHour: number, startMinute: number) => {
    const targetItem = items.find((it) => it.id === id);
    if (!targetItem) return;

    if (
      targetItem.date === targetDateStr &&
      targetItem.startHour === startHour &&
      (targetItem.startMinute || 0) === startMinute
    ) {
      return;
    }

    isUserEditingRef.current = true;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            date: targetDateStr,
            startHour,
            startMinute,
          };
        }
        return it;
      })
    );

    const [year, month, day] = targetDateStr.split('-');
    const formattedDateStr = `${Number(month)}월 ${Number(day)}일`;
    const timeStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    showToast(`'${targetItem.title}' 일정을 ${formattedDateStr} ${timeStr}(으)로 이동했습니다.`);
  };

  // 8. 15분 단위 셀 시간 늘리기/줄이기
  const handleAdjustDuration = (id: string, deltaSlots: number) => {
    isUserEditingRef.current = true;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const newDuration = Math.max(1, (it.duration || 4) + deltaSlots);
          return { ...it, duration: newDuration };
        }
        return it;
      })
    );
  };

  // 9. 샘플 데이터 복원
  const handleResetData = () => {
    if (window.confirm('현재 등록된 일정을 초기화하고 샘플 데이터로 복원하시겠습니까?')) {
      const samples = generateSampleData();
      isUserEditingRef.current = true;
      setItems(samples);
      setCategories(INITIAL_CATEGORIES);
      setUserProfile(DEFAULT_USER);
    }
  };

  const handleUpdateProfile = (newProfile: UserProfile) => {
    isUserEditingRef.current = true;
    setUserProfile(newProfile);
  };

  const handleUpdateCategories = (newCategories: CategoryItem[]) => {
    isUserEditingRef.current = true;
    setCategories(newCategories);
  };

  const handleUpdateLongTermPlanner = (data: LongTermPlannerData) => {
    isUserEditingRef.current = true;
    setLongTermPlanner(data);
  };

  const handleManualSync = async () => {
    const docId = activeDocId || localStorage.getItem('lux_active_phone_docId') || currentUser?.uid;
    if (!docId) return;
    setIsSyncing(true);
    try {
      await saveUserDataToFirestore(docId, currentUserPhone || '', {
        userProfile,
        items,
        yearlyItems,
        longTermPlanner,
        categories,
        dailyEvents,
      });
      setLastSyncedAt(new Date().toLocaleTimeString());
      showToast('☁️ 클라우드 동기화가 즉시 완료되었습니다.');
    } catch (e) {
      console.error('Manual sync failed:', e);
      showToast('❌ 클라우드 동기화에 실패했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isAuthLoading || (currentUser && (!isFirestoreLoaded || isDataLoading))) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center p-6 font-sans-kr text-[#2D2926]">
        <div className="flex flex-col items-center gap-4 p-8 bg-white/90 rounded-3xl border border-[#E5E1DA] shadow-lg backdrop-blur-xs max-w-sm w-full text-center">
          <div className="w-10 h-10 border-3 border-[#20487C] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#2D2926]">
              {currentUser ? 'Firestore 실시간 동기화 중' : '로그인 세션 확인 중'}
            </h3>
            <p className="text-xs text-[#777]">
              {currentUser ? '최신 플래너 데이터를 안전하게 불러오는 중입니다...' : 'Firebase 인증 상태를 확인하고 있습니다...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] font-sans-kr text-[#2D2926]">
      {/* 전화번호 로그인 & 실시간 동기화 상태 바 */}
      <UserAccountBar
        currentUserPhone={currentUserPhone}
        currentUserAvatar={userProfile?.avatarUrl}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onManualSync={handleManualSync}
      />

      <div className="py-6 px-4 md:px-8 max-w-7xl mx-auto">
        {/* 럭셔리 헤더 */}
        <Header
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          twoWeekDays={twoWeekDays}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onGoToday={handleGoToday}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* 토스트 메세지 배너 */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#20487C] text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/20 text-xs font-semibold font-sans-kr flex items-center gap-2 animate-bounce">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 뷰 모드별 주요 컨텐츠 레이아웃 */}
        {viewMode === 'longTermPlanner' ? (
          /* 보기 옵션 4: 10년 이상 장기 계획 표 형식 플래너 (상단 한 줄 고정) */
          <LongTermPlannerView
            data={longTermPlanner}
            onChangeData={handleUpdateLongTermPlanner}
          />
        ) : viewMode === 'yearlyCalendar' ? (
          /* 보기 옵션 3: 한 화면에서 1년 12달을 다 볼 수 있는 년간 달력 보기 (날짜 없이 월만 있는 독립 달력) */
          <YearlyCalendarView
            yearlyItems={yearlyItems}
            onAddYearlyItems={handleAddYearlyItems}
            onUpdateYearlyItem={handleUpdateYearlyItem}
            onDeleteYearlyItem={handleDeleteYearlyItem}
            onToggleComplete={handleToggleYearlyComplete}
          />
        ) : viewMode === 'splitCalendar' ? (
          /* 보기 옵션 2: 왼쪽에 월별 달력과 색상별 카테고리 안내, 오른쪽에 1주치 계획표 */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <div className="lg:col-span-1">
              <MonthCalendarAndCategory
                currentWeekStartDate={baseMonday}
                onSelectDate={handleSelectCalendarDate}
                categories={categories}
                onOpenColorManager={() => setIsColorManagerOpen(true)}
              />
            </div>
            <div className="lg:col-span-3">
              <TimetableGrid
                twoWeekDays={twoWeekDays}
                baseMonday={baseMonday}
                items={items}
                dailyEvents={dailyEvents}
                onUpdateDailyEvent={handleUpdateDailyEvent}
                viewMode="splitCalendar"
                onSelectItem={handleSelectItem}
                onSelectSlotToCreate={handleSelectSlotToCreate}
                onAdjustDuration={handleAdjustDuration}
                onDeleteItem={handleDeleteItem}
                onDeleteDayItems={handleDeleteDayItems}
                onCopyDayItems={handleCopyDayItems}
                onPasteDayItems={handlePasteDayItems}
                canPasteDay={Boolean(copiedDayItems && copiedDayItems.length > 0)}
                onMoveItem={handleMoveItem}
              />
            </div>
          </div>
        ) : (
          /* 보기 옵션 1 (기본값): 스와이프하며 과거/미래 일정을 연속으로 보기 */
          <TimetableGrid
            twoWeekDays={twoWeekDays}
            baseMonday={baseMonday}
            items={items}
            dailyEvents={dailyEvents}
            onUpdateDailyEvent={handleUpdateDailyEvent}
            viewMode={viewMode}
            onSelectItem={handleSelectItem}
            onSelectSlotToCreate={handleSelectSlotToCreate}
            onAdjustDuration={handleAdjustDuration}
            onDeleteItem={handleDeleteItem}
            onDeleteDayItems={handleDeleteDayItems}
            onCopyDayItems={handleCopyDayItems}
            onPasteDayItems={handlePasteDayItems}
            canPasteDay={Boolean(copiedDayItems && copiedDayItems.length > 0)}
            onMoveItem={handleMoveItem}
          />
        )}

        {/* 일정 추가 / 수정 모달 */}
        <ScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialItem={selectedItem}
          defaultDate={modalDefaultDate}
          defaultStartHour={modalDefaultStartHour}
          defaultStartMinute={modalDefaultStartMinute}
          defaultDuration={modalDefaultDuration}
          twoWeekDays={twoWeekDays}
          allItems={items}
          onSave={handleSaveSchedule}
          onDelete={handleDeleteItem}
        />

        {/* 카테고리 색상 관리 모달 */}
        <ColorManagerModal
          isOpen={isColorManagerOpen}
          onClose={() => setIsColorManagerOpen(false)}
          categories={categories}
          onUpdateCategories={handleUpdateCategories}
        />

        {/* 전화번호 로그인 / 회원가입 모달 */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          currentData={{
            userProfile,
            items,
            categories,
            dailyEvents,
          }}
        />

        {/* 푸터 */}
        <footer className="mt-8 text-center text-xs text-[#8C857E] font-serif-kr no-print py-4 border-t border-[#E5E1DA]">
          <p>Professional Polish Life Planner • Created by 다세랑 • 모바일 &amp; PC 실시간 동기화 지원</p>
        </footer>
      </div>
    </div>
  );
}
