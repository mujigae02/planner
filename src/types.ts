/**
 * 라이프 플래너 데이터 타입 정의
 */

export interface ScheduleItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startHour: number; // 5 ~ 23
  startMinute?: number; // 0, 15, 30, 45 (기본값 0)
  duration: number; // 15분 단위 개수 (1 = 15분, 2 = 30분, 4 = 1시간 등)
  color: string; // 배경 파스텔 색상
  textColor: string; // 글자 색상
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly';
  recurringDays?: number[]; // 0(일) ~ 6(토)
}

export interface DailyEvents {
  [dateStr: string]: string; // YYYY-MM-DD -> 중요 행사 메모
}

export interface UserProfile {
  name: string;
  motto: string;
  avatarUrl?: string;
}

export interface ColorMapping {
  [title: string]: {
    color: string;
    textColor: string;
  };
}

export interface PresetColor {
  id: string;
  name: string;
  bg: string;
  border: string;
  text: string;
}

export interface YearlyScheduleItem {
  id: string;
  year: number; // e.g. 2026
  month: number; // 1 ~ 12
  title: string;
  color?: string;
  textColor?: string;
  completed?: boolean;
}

export interface LongTermPlannerData {
  startYear: number;
  yearCount: number;
  columns: string[];
  cells: Record<string, string>; // e.g. "2026_0": "매출 1억 달성"
  cellColors?: Record<string, string>; // e.g. "2026_0": "#2563EB" (글자색)
}
