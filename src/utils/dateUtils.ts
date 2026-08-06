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

/**
 * 연속 보기용 날짜 배열 구하기 (기준 월요일 전후 pastWeeks ~ futureWeeks 주)
 */
export function getContinuousDays(baseDate: Date, pastWeeks = 6, futureWeeks = 6): Date[] {
  const startMonday = getMonday(baseDate);
  const start = new Date(startMonday);
  start.setDate(startMonday.getDate() - pastWeeks * 7);

  const totalDays = (pastWeeks + 1 + futureWeeks) * 7;
  const days: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
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

/**
 * 한국 주요 공휴일 매핑 (양력 고정 공휴일 + 연도별 가변/대체 공휴일)
 */
export const KOREAN_HOLIDAYS_MAP: Record<string, string> = {
  // 양력 고정 공휴일 (MM-DD)
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',

  // 2024년
  '2024-02-09': '설날 연휴',
  '2024-02-10': '설날',
  '2024-02-11': '설날 연휴',
  '2024-02-12': '대체공휴일 (설날)',
  '2024-04-10': '국회의원 선거일',
  '2024-05-05': '어린이날',
  '2024-05-06': '대체공휴일 (어린이날)',
  '2024-05-15': '부처님오신날',
  '2024-09-16': '추석 연휴',
  '2024-09-17': '추석',
  '2024-09-18': '추석 연휴',

  // 2025년
  '2025-01-28': '설날 연휴',
  '2025-01-29': '설날',
  '2025-01-30': '설날 연휴',
  '2025-03-03': '대체공휴일 (삼일절)',
  '2025-05-05': '어린이날/부처님오신날',
  '2025-05-06': '대체공휴일 (어린이날/부처님오신날)',
  '2025-10-05': '추석 연휴',
  '2025-10-06': '추석',
  '2025-10-07': '추석 연휴',
  '2025-10-08': '대체공휴일 (추석)',

  // 2026년
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-02': '대체공휴일 (삼일절)',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일 (부처님오신날)',
  '2026-06-03': '지방선거일',
  '2026-08-17': '대체공휴일 (광복절)',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-09-27': '대체공휴일 (추석)',
  '2026-09-28': '대체공휴일 (추석)',
  '2026-10-05': '대체공휴일 (개천절)',

  // 2027년
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일 (설날)',
  '2027-05-13': '부처님오신날',
  '2027-08-16': '대체공휴일 (광복절)',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-04': '대체공휴일 (개천절)',
  '2027-12-19': '대통령 선거일',

  // 2028년
  '2028-01-26': '설날 연휴',
  '2028-01-27': '설날',
  '2028-01-28': '설날 연휴',
  '2028-05-02': '부처님오신날',
  '2028-10-02': '추석 연휴',
  '2028-10-03': '추석/개천절',
  '2028-10-04': '추석 연휴',
  '2028-10-05': '대체공휴일 (추석)',
};

export function getKoreanHolidayName(date: Date): string | null {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthDay = `${month}-${day}`;

  const year = date.getFullYear();
  const fullDateKey = `${year}-${monthDay}`;

  if (KOREAN_HOLIDAYS_MAP[fullDateKey]) {
    return KOREAN_HOLIDAYS_MAP[fullDateKey];
  }
  if (KOREAN_HOLIDAYS_MAP[monthDay]) {
    return KOREAN_HOLIDAYS_MAP[monthDay];
  }

  return null;
}

export function isKoreanHoliday(date: Date): boolean {
  return getKoreanHolidayName(date) !== null;
}

export function isRedDay(date: Date): boolean {
  return date.getDay() === 0 || isKoreanHoliday(date);
}

