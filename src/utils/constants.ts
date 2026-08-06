import { PresetColor, CategoryItem } from '../types';

export const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 to 23
export const MINUTES_15 = [0, 15, 30, 45];
export const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
export const TOTAL_SLOTS = 19 * 4; // 76 slots (05:00 ~ 23:45)
export const TOTAL_SLOTS_5MIN = 19 * 12; // 228 slots (05:00 ~ 23:55)

export function slotToTimeStr(slotIndex: number): string {
  const hour = Math.floor(slotIndex / 4) + 5;
  const minute = (slotIndex % 4) * 15;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function timeToSlot(hour: number, minute: number = 0): number {
  return (hour - 5) * 4 + Math.floor(minute / 15);
}

export const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

export const PASTEL_COLORS: PresetColor[] = [
  { id: 'mint', name: '소프트 민트', bg: '#E6F4EA', border: '#A8DADC', text: '#137333' },
  { id: 'lavender', name: '은은한 라벤더', bg: '#F3E8FF', border: '#DDD6FE', text: '#6B21A8' },
  { id: 'peach', name: '따뜻한 피치', bg: '#FFF3E0', border: '#FFE0B2', text: '#E65100' },
  { id: 'blue', name: '맑은 소프트 블루', bg: '#E3F2FD', border: '#BBDEFB', text: '#0D47A1' },
  { id: 'rose', name: '은은한 로즈', bg: '#FCE4EC', border: '#F8BBD0', text: '#880E4F' },
  { id: 'yellow', name: '클라우드 옐로우', bg: '#FEF9C3', border: '#FEF08A', text: '#713F12' },
  { id: 'sage', name: '페일 세이지', bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
  { id: 'sand', name: '엘레강스 샌드', bg: '#F5F5F4', border: '#E7E5E4', text: '#44403C' },
  { id: 'sky', name: '파스텔 하늘', bg: '#E0F2FE', border: '#BAE6FD', text: '#0369A1' },
];

export const DEFAULT_USER = {
  name: '',
  motto: '활기차고 가치 있는 삶을 위한 주간 기록',
};

export const INITIAL_COLOR_MAP: Record<string, { color: string; textColor: string }> = {
  '독서 및 명상': { color: '#F3E8FF', textColor: '#6B21A8' },
  '업무 프로젝트': { color: '#E3F2FD', textColor: '#0D47A1' },
  '운동 및 스트레칭': { color: '#E6F4EA', textColor: '#137333' },
  '개인 정돈': { color: '#FFF3E0', textColor: '#E65100' },
  '가족 시간': { color: '#FCE4EC', textColor: '#880E4F' },
  '자기계발 공부': { color: '#FEF9C3', textColor: '#713F12' },
};

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: '독서 및 명상', color: '#F3E8FF', textColor: '#6B21A8' },
  { id: 'cat-2', name: '업무 프로젝트', color: '#E3F2FD', textColor: '#0D47A1' },
  { id: 'cat-3', name: '운동 및 스트레칭', color: '#E6F4EA', textColor: '#137333' },
  { id: 'cat-4', name: '개인 정돈', color: '#FFF3E0', textColor: '#E65100' },
  { id: 'cat-5', name: '가족 시간', color: '#FCE4EC', textColor: '#880E4F' },
  { id: 'cat-6', name: '자기계발 공부', color: '#FEF9C3', textColor: '#713F12' },
];
