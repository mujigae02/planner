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

export default function App() {
  // Auth & Sync state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const isRemoteUpdatingRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>('');

  // 1. 상태 정의 (LocalStorage / Remote)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
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
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) return JSON.parse(saved);
      return INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [dailyEvents, setDailyEvents] = useState<DailyEvents>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DAILY_EVENTS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [yearlyItems, setYearlyItems] = useState<YearlyScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.YEARLY_ITEMS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [longTermPlanner, setLongTermPlanner] = useState<LongTermPlannerData | undefined>(() => {
    try {
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

  // 상단 알림 메시지 토스트 state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Auth Listener & Realtime Firestore Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const docId = user.uid;
        const accountName = user.email
          ? `${user.displayName || user.email.split('@')[0]} (${user.email})`
          : user.displayName || 'Google 계정';

        setCurrentUserPhone(accountName);
        setActiveDocId(docId);
        localStorage.setItem('lux_active_phone_docId', docId);
        localStorage.setItem('lux_active_phone', accountName);

        setUserProfile((prev) => ({
          ...prev,
          name: user.displayName || prev.name,
          avatarUrl: user.photoURL || prev.avatarUrl || '',
        }));
      } else {
        const storedPhone = localStorage.getItem('lux_active_phone');
        const storedDocId = localStorage.getItem('lux_active_phone_docId');
        if (storedPhone && storedDocId) {
          setCurrentUserPhone(storedPhone);
          setActiveDocId(storedDocId);
        } else {
          setCurrentUserPhone(null);
          setActiveDocId('');
        }
      }
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
    localStorage.removeItem('lux_active_phone_docId');
    localStorage.removeItem('lux_active_phone');
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.YEARLY_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.LONG_TERM_PLANNER);

    await logoutUser();
    setActiveDocId('');
    setCurrentUserPhone(null);
    setCurrentUser(null);

    setUserProfile(DEFAULT_USER);
    setItems(generateSampleData());
    setYearlyItems([]);
    setCategories(INITIAL_CATEGORIES);
    setDailyEvents({});
    setLongTermPlanner(undefined);

    setTimeout(() => {
      isRemoteUpdatingRef.current = false;
    }, 1000);
  };

  // Subscribe to user Firestore planner document when logged in
  useEffect(() => {
    const currentDocId = activeDocId || localStorage.getItem('lux_active_phone_docId') || currentUser?.uid;
    if (!currentDocId) return;

    const unsubscribeDoc = subscribeToUserPlanner(currentDocId, (data, exists) => {
      if (!exists) {
        // Document does not exist in Firestore yet -> Push local data to Firestore
        const currentPayload = JSON.stringify({
          userProfile,
          items,
          yearlyItems,
          longTermPlanner,
          categories,
          dailyEvents,
        });
        lastSavedPayloadRef.current = currentPayload;
        saveUserDataToFirestore(currentDocId, currentUserPhone || '', {
          userProfile,
          items,
          yearlyItems,
          longTermPlanner,
          categories,
          dailyEvents,
        }).catch(err => console.error('Initial push error:', err));
        return;
      }

      isRemoteUpdatingRef.current = true;
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
        try { localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(cleanProfile)); } catch {}
      }

      // If Firestore has items, sync them. If Firestore has empty items but local has items, don't overwrite local with empty
      if (Array.isArray(data.items)) {
        if (data.items.length > 0 || items.length === 0) {
          setItems(data.items);
          try { localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(data.items)); } catch {}
        }
      }

      if (Array.isArray(data.yearlyItems)) {
        setYearlyItems(data.yearlyItems);
        try { localStorage.setItem(STORAGE_KEYS.YEARLY_ITEMS, JSON.stringify(data.yearlyItems)); } catch {}
      }
      if (data.longTermPlanner) {
        setLongTermPlanner(data.longTermPlanner);
        try { localStorage.setItem(STORAGE_KEYS.LONG_TERM_PLANNER, JSON.stringify(data.longTermPlanner)); } catch {}
      }
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
        try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories)); } catch {}
      }
      if (data.dailyEvents) {
        setDailyEvents(data.dailyEvents);
        try { localStorage.setItem(STORAGE_KEYS.DAILY_EVENTS, JSON.stringify(data.dailyEvents)); } catch {}
      }

      const receivedPayload = JSON.stringify({
        userProfile: data.userProfile || userProfile,
        items: (Array.isArray(data.items) && (data.items.length > 0 || items.length === 0)) ? data.items : items,
        yearlyItems: data.yearlyItems || yearlyItems,
        longTermPlanner: data.longTermPlanner || longTermPlanner,
        categories: data.categories || categories,
        dailyEvents: data.dailyEvents || dailyEvents,
      });
      lastSavedPayloadRef.current = receivedPayload;
      setLastSyncedAt(new Date().toLocaleTimeString());

      setTimeout(() => {
        isRemoteUpdatingRef.current = false;
      }, 1500);
    });

    return () => unsubscribeDoc();
  }, [activeDocId, currentUser]);

  // Sync data to Firestore on local changes (if logged in) with debouncing & payload check
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile));
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      localStorage.setItem(STORAGE_KEYS.YEARLY_ITEMS, JSON.stringify(yearlyItems));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      localStorage.setItem(STORAGE_KEYS.DAILY_EVENTS, JSON.stringify(dailyEvents));
      if (longTermPlanner) {
        localStorage.setItem(STORAGE_KEYS.LONG_TERM_PLANNER, JSON.stringify(longTermPlanner));
      }
    } catch (e) {
      console.error('Local data saving failed', e);
    }

    const currentDocId = activeDocId || localStorage.getItem('lux_active_phone_docId') || currentUser?.uid;

    if (!currentDocId) {
      setIsSyncing(false);
      return;
    }

    const currentPayload = JSON.stringify({
      userProfile,
      items,
      yearlyItems,
      longTermPlanner,
      categories,
      dailyEvents,
    });

    // If payload has not changed since last saved/received, do nothing
    if (lastSavedPayloadRef.current === currentPayload) {
      setIsSyncing(false);
      return;
    }

    if (isRemoteUpdatingRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      if (isRemoteUpdatingRef.current) return;

      setIsSyncing(true);
      try {
        await saveUserDataToFirestore(currentDocId, currentUserPhone || '', {
          userProfile,
          items,
          yearlyItems,
          longTermPlanner,
          categories,
          dailyEvents,
        });
        lastSavedPayloadRef.current = currentPayload;
        setLastSyncedAt(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Firestore sync error:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [userProfile, items, yearlyItems, longTermPlanner, categories, dailyEvents, currentUser, currentUserPhone, activeDocId]);

  const handleUpdateDailyEvent = (dateStr: string, text: string) => {
    setDailyEvents((prev) => ({
      ...prev,
      [dateStr]: text,
    }));
  };

  // 연간 달력 일정 C.R.U.D 핸들러
  const handleAddYearlyItems = (newItemsData: Omit<YearlyScheduleItem, 'id'>[]) => {
    const newItems: YearlyScheduleItem[] = newItemsData.map((data, idx) => ({
      ...data,
      id: `yearly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
    }));
    setYearlyItems((prev) => [...prev, ...newItems]);
  };

  const handleUpdateYearlyItem = (updatedItem: YearlyScheduleItem) => {
    setYearlyItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleDeleteYearlyItem = (id: string) => {
    setYearlyItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleYearlyComplete = (id: string) => {
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

  // 8. 15분 단위 셀 시간 늘리기/줄이기
  const handleAdjustDuration = (id: string, deltaSlots: number) => {
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
      setItems(samples);
      setCategories(INITIAL_CATEGORIES);
      setUserProfile(DEFAULT_USER);
    }
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
          onUpdateProfile={setUserProfile}
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
            onChangeData={setLongTermPlanner}
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
          onUpdateCategories={setCategories}
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
