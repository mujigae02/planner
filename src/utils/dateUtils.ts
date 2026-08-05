/**
 * 날짜 관련 유틸리티 함수
 */

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 주어진 날짜가 포함된 주차의 월요일 구하기
 */
export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // 일요일(0)이면 -6, 월요일(1)이면 0, 화요일(2)이면 -1 ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * 2주 단위 (14일) 날짜 배열 구하기
 */
export function getTwoWeekDays(startDate: Date): Date[] {
  const startMonday = getMonday(startDate);
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    days.push(d);
  }
  return days;
}

export function formatKoreanDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}

export function formatKoreanDateShort(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}.${day}(${dayName})`;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
