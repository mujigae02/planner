import { ScheduleItem } from '../types';
import { formatDateKey, getMonday } from './dateUtils';

export function generateSampleData(): ScheduleItem[] {
  const today = new Date();
  const startMonday = getMonday(today);

  // 날짜 계산 헬퍼
  const addDays = (days: number) => {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + days);
    return formatDateKey(d);
  };

  const day0 = addDays(0); // 월요일 (Week 1)
  const day1 = addDays(1); // 화요일

  return [
    {
      id: 'sample-1',
      title: '독서 및 명상',
      date: day0,
      startHour: 6,
      startMinute: 0,
      duration: 8, // 8개 슬롯 = 2시간
      color: '#F3E8FF',
      textColor: '#6B21A8',
    },
    {
      id: 'sample-2',
      title: '업무 프로젝트',
      date: day0,
      startHour: 9,
      startMinute: 0,
      duration: 12, // 12개 슬롯 = 3시간
      color: '#E3F2FD',
      textColor: '#0D47A1',
    },
  ];
}

export function generateSampleDailyEvents(): Record<string, string> {
  const today = new Date();
  const startMonday = getMonday(today);

  const addDays = (days: number) => {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + days);
    return formatDateKey(d);
  };

  return {
    [addDays(0)]: '주간 팀 정례회의 🏢',
    [addDays(2)]: '핵심 프로젝트 1차 발표 🚀',
    [addDays(4)]: '주간 결산 & 라이프 점검 📝',
    [addDays(5)]: '주말 가용 전시회 관람 🎨',
    [addDays(7)]: '2주차 신규 목표 세팅 🎯',
    [addDays(9)]: '클라이언트 미팅 & 저녁 약속 🤝',
  };
}
