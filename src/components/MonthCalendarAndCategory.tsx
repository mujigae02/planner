import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Palette, Settings } from 'lucide-react';
import { CategoryItem } from '../types';
import { formatDateKey } from '../utils/dateUtils';

interface MonthCalendarAndCategoryProps {
  currentWeekStartDate: Date;
  onSelectDate: (date: Date) => void;
  categories: CategoryItem[];
  onOpenColorManager: () => void;
}

export const MonthCalendarAndCategory: React.FC<MonthCalendarAndCategoryProps> = ({
  currentWeekStartDate,
  onSelectDate,
  categories,
  onOpenColorManager,
}) => {
  // 달력 표시용 년/월 state
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date(currentWeekStartDate));

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  // 이전/다음 월 이동
  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  // 월별 달력 날짜 생성
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // 달력 첫 주의 시작 요일 (0: 일요일 ~ 6: 토요일)
  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // 선택된 주(Week)의 7일 날짜 Key 목록
  const activeWeekKeys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStartDate);
    d.setDate(currentWeekStartDate.getDate() + i);
    activeWeekKeys.add(formatDateKey(d));
  }

  // 오늘 날짜 Key
  const todayKey = formatDateKey(new Date());

  // 달력에 채울 날짜 배열
  const calendarCells: (Date | null)[] = [];
  // 이전 달 빈 셀
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }
  // 현재 달 셀
  for (let day = 1; day <= totalDaysInMonth; day++) {
    calendarCells.push(new Date(year, month, day));
  }

  return (
    <div className="space-y-5 no-print">
      {/* 1. 월별 달력 카드 */}
      <div className="lux-card p-4">
        {/* 달력 헤더 */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E1DA]">
          <h3 className="text-sm font-serif-kr font-medium text-[#2D2926]">
            {year}년 {month + 1}월
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-full hover:bg-[#FAF9F7] text-[#8C857E] transition-colors"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-full hover:bg-[#FAF9F7] text-[#8C857E] transition-colors"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 요일 헤더 (일~토) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <span
              key={day}
              className={`text-[11px] font-medium ${
                idx === 0 ? 'text-[#C94A4A]' : idx === 6 ? 'text-[#3B82F6]' : 'text-[#8C857E]'
              }`}
            >
              {day}
            </span>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {calendarCells.map((cellDate, idx) => {
            if (!cellDate) {
              return <div key={`empty-${idx}`} className="h-7" />;
            }

            const dateKey = formatDateKey(cellDate);
            const isToday = dateKey === todayKey;
            const isInActiveWeek = activeWeekKeys.has(dateKey);
            const dayOfWeek = cellDate.getDay();

            return (
              <button
                key={dateKey}
                onClick={() => onSelectDate(cellDate)}
                className={`h-7 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center relative ${
                  isInActiveWeek
                    ? 'bg-[#E3F2FD] text-[#0D47A1] border border-[#BBDEFB] font-bold shadow-2xs'
                    : isToday
                    ? 'bg-[#F0FAF7] text-[#0F6856] border border-[#D0EAE2] font-semibold'
                    : 'hover:bg-[#FAF9F7] text-[#2D2926]'
                } ${
                  !isInActiveWeek && dayOfWeek === 0
                    ? 'text-[#C94A4A]'
                    : !isInActiveWeek && dayOfWeek === 6
                    ? 'text-[#2563EB]'
                    : ''
                }`}
                title={`${cellDate.getMonth() + 1}월 ${cellDate.getDate()}일 계획표 보기`}
              >
                <span>{cellDate.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 색상 카테고리 안내 카드 */}
      <div className="lux-card p-4">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#E5E1DA]">
          <div className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#8C857E]" />
            <h3 className="text-sm font-gothic font-semibold text-[#2D2926]">
              카테고리 색상 안내
            </h3>
          </div>
          <button
            onClick={onOpenColorManager}
            className="px-2.5 py-1 rounded-full bg-[#FAF9F7] border border-[#E5E1DA] hover:bg-[#F0FAF7] text-[#2D2926] text-xs font-gothic font-medium transition-colors flex items-center gap-1 shadow-2xs"
            title="카테고리 설정 및 관리"
          >
            <Settings className="w-3 h-3 text-[#2563EB]" />
            <span>카테고리 설정</span>
          </button>
        </div>

        <p className="text-[11px] font-gothic text-[#8C857E] mb-3 leading-snug">
          사용자가 직접 설정한 카테고리 색상 범례 목록입니다.
        </p>

        {/* 카테고리 태그 목록 */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <p className="text-xs text-[#8C857E] text-center py-3">설정된 카테고리가 없습니다.</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs transition-colors"
                style={{
                  backgroundColor: cat.color,
                  borderColor: `${cat.color}DD`,
                  color: cat.textColor,
                }}
              >
                <span className="font-gothic font-medium text-[11px] truncate">{cat.name}</span>
                <span className="w-2 h-2 rounded-full opacity-70" style={{ backgroundColor: cat.textColor }} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
