import { ScheduleItem } from '../types';
import { formatDateKey, getMonday } from './dateUtils';

export function generateSampleData(): ScheduleItem[] {
  return [];
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
