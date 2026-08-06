import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { ScheduleItem, DailyEvents } from '../types';
import { DAY_NAMES, TOTAL_SLOTS } from '../utils/constants';
import {
  formatDateKey,
  formatKoreanDateShort,
  isToday,
  isRedDay,
  isKoreanHoliday,
  getKoreanHolidayName,
  getContinuousDays,
} from '../utils/dateUtils';

interface TimetableGridProps {
  twoWeekDays: Date[];
  baseMonday?: Date;
  items: ScheduleItem[];
  dailyEvents?: DailyEvents;
  onUpdateDailyEvent?: (dateStr: string, text: string) => void;
  viewMode: 'twoWeekHorizontal' | 'splitCalendar' | 'week1' | 'week2';
  onSelectItem: (item: ScheduleItem) => void;
  onSelectSlotToCreate: (dateStr: string, startHour: number, startMinute: number, durationSlots: number) => void;
  onAdjustDuration?: (id: string, deltaSlots: number) => void;
  onDeleteItem?: (id: string) => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  twoWeekDays,
  baseMonday,
  items,
  dailyEvents,
  onUpdateDailyEvent,
  viewMode,
  onSelectItem,
  onSelectSlotToCreate,
}) => {
  // 드래그 선택 관련 15분 단위 슬롯 레인지 셀렉션
  const [dragStart, setDragStart] = useState<{ date: string; slot: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 주차별 날짜 분리
  const week1Days = twoWeekDays.slice(0, 7);
  const week2Days = twoWeekDays.slice(7, 14);

  // 연속 보기용 날짜 (기준 월요일 전 26주, 후 26주 = 총 53주 / 약 1년)
  const currentBaseMonday = baseMonday || twoWeekDays[0] || new Date();
  const continuousDays = getContinuousDays(currentBaseMonday, 26, 26);

  // baseMonday 변경 시 연속 보기 가로 스크롤을 해당 기준 주 위치(월요일)가 고정 시간축 바로 옆에 오도록 정확하고 부드럽게 이동
  useEffect(() => {
    if (viewMode === 'twoWeekHorizontal' && scrollContainerRef.current) {
      const timer = setTimeout(() => {
        const targetKey = formatDateKey(currentBaseMonday);
        const targetCol = document.getElementById(`col-${targetKey}`);
        if (targetCol && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = targetCol.getBoundingClientRect();
          const timeTh = container.querySelector('th');
          const timeThWidth = timeTh ? timeTh.getBoundingClientRect().width : 60;

          const delta = targetRect.left - (containerRect.left + timeThWidth);
          const newScrollLeft = container.scrollLeft + delta;

          container.scrollTo({
            left: Math.max(0, newScrollLeft),
            behavior: 'smooth',
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [baseMonday, viewMode, currentBaseMonday]);

  // 일정의 시작 15분 슬롯 인덱스 구하기 (05:00 = 0)
  const getStartSlot = (item: ScheduleItem): number => {
    const min = item.startMinute || 0;
    return (item.startHour - 5) * 4 + Math.floor(min / 15);
  };

  // 특정 날짜 & 시작 슬롯의 ScheduleItem 탐색
  const getItemForSlot = (dateStr: string, slotIndex: number): ScheduleItem | undefined => {
    return items.find((item) => item.date === dateStr && getStartSlot(item) === slotIndex);
  };

  // 특정 슬롯이 이전 일정의 duration(15분 단위 rowSpan)으로 덮여 있는지 검사
  const isSlotCoveredBySpan = (dateStr: string, slotIndex: number): boolean => {
    return items.some((item) => {
      if (item.date !== dateStr) return false;
      const startSlot = getStartSlot(item);
      const endSlot = startSlot + (item.duration || 4);
      return slotIndex > startSlot && slotIndex < endSlot;
    });
  };

  // 15분 슬롯 그리드 렌더링 함수
  const renderGridForDays = (days: Date[], weekTitle?: string, isContinuous = false) => {
    const handleMouseDownSlot = (dateStr: string, slotIndex: number) => {
      if (isSlotCoveredBySpan(dateStr, slotIndex) || getItemForSlot(dateStr, slotIndex)) return;
      setDragStart({ date: dateStr, slot: slotIndex });
      setDragCurrent(slotIndex);
    };

    const handleMouseEnterSlot = (dateStr: string, slotIndex: number) => {
      if (!dragStart || dragStart.date !== dateStr) return;
      if (slotIndex >= dragStart.slot) {
        setDragCurrent(slotIndex);
      }
    };

    const handleMouseUpSlot = () => {
      if (dragStart && dragCurrent !== null) {
        const start = Math.min(dragStart.slot, dragCurrent);
        const end = Math.max(dragStart.slot, dragCurrent);
        const durationSlots = end - start + 1;

        const startHour = Math.floor(start / 4) + 5;
        const startMinute = (start % 4) * 15;

        onSelectSlotToCreate(dragStart.date, startHour, startMinute, durationSlots);
      }
      setDragStart(null);
      setDragCurrent(null);
    };

    return (
      <div className="lux-card mb-6" onMouseLeave={() => setDragStart(null)}>
        {weekTitle && (
          <div className="bg-[#FAF9F7] px-4 md:px-5 py-2.5 border-b border-[#E5E1DA] flex flex-wrap items-center justify-between gap-2 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#20487C]" />
              <span className="font-serif-kr font-bold text-[#1A1A1A] text-sm md:text-base">{weekTitle}</span>
            </div>
            <span className="text-xs text-[#8C857E] font-sans-kr font-medium">
              {isContinuous
                ? '좌우로 스와이프하여 일정을 자유롭게 확인해보세요'
                : `${formatKoreanDateShort(days[0])} ~ ${formatKoreanDateShort(days[days.length - 1])}`}
            </span>
          </div>
        )}

        {/* 테이블 가로 및 세로 스크롤 컨테이너 */}
        <div
          ref={isContinuous ? scrollContainerRef : undefined}
          className="overflow-auto h-[580px] min-h-[580px] rounded-b-2xl"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <table
            className="border-separate border-spacing-0"
            style={{
              width: isContinuous ? `calc((100% - 60px) / 14 * ${days.length} + 60px)` : '100%',
              minWidth: isContinuous ? '1200px' : days.length === 14 ? '1200px' : '720px',
            }}
          >
            {/* Table Header (스크롤 시 상단 고정: 1행 요일 + 2행 주요행사가 함께 sticky) */}
            <thead>
              {/* 1행: 요일 및 날짜 (top-0 sticky) */}
              <tr className="bg-[#FAF9F7]">
                <th className="sticky top-0 left-0 z-50 bg-[#FAF9F7] w-14 md:w-16 h-[54px] min-h-[54px] p-1 text-center text-xs font-bold text-[#8C857E] font-gothic border-r border-b border-[#E5E1DA] shadow-2xs">
                  시간
                </th>
                {days.map((d) => {
                  const today = isToday(d);
                  const dateKey = formatDateKey(d);
                  const dayOfWeek = d.getDay(); // 0(일) ~ 6(토)
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const redDay = isRedDay(d);
                  const holidayName = getKoreanHolidayName(d);

                  return (
                    <th
                      key={dateKey}
                      id={`col-${dateKey}`}
                      style={{ width: isContinuous ? `calc((100% - 60px) / 14)` : undefined, minWidth: isContinuous ? '80px' : undefined }}
                      className={`sticky top-0 z-30 h-[54px] min-h-[54px] p-1 text-center border-r border-b border-[#E5E1DA] transition-colors ${
                        today ? 'bg-[#F0FAF7]' : 'bg-[#FAF9F7]'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center h-full leading-tight">
                        <span
                          className={`text-xs font-bold font-sans-kr flex items-center gap-1 leading-tight ${
                            redDay
                              ? 'text-[#C94A4A]'
                              : isSaturday
                              ? 'text-[#20487C]'
                              : 'text-[#8C857E]'
                          }`}
                        >
                          {DAY_NAMES[(dayOfWeek + 6) % 7]}요일
                        </span>
                        <span
                          className={`text-xs font-serif-kr mt-0.5 leading-tight ${
                            today
                              ? 'bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-full text-[11px] font-bold shadow-2xs border border-[#BBDEFB]'
                              : redDay
                              ? 'text-[#C94A4A] font-bold'
                              : isSaturday
                              ? 'text-[#20487C] font-medium'
                              : 'text-[#2D2926] font-normal'
                          }`}
                          title={holidayName || undefined}
                        >
                          {d.getMonth() + 1}.{d.getDate()}
                        </span>
                        {holidayName && (
                          <span className="text-[9px] text-[#C94A4A] font-gothic font-medium truncate max-w-[70px] mt-0.5 leading-tight" title={holidayName}>
                            {holidayName}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* 2행: 그날의 주요 행사 기록 행 (top-[54px] sticky) */}
              <tr className="bg-[#FAF9F7]">
                <th className="sticky top-[54px] left-0 z-50 bg-[#FAF9F7] w-14 md:w-16 h-[34px] p-1 text-center border-r border-b border-[#E5E1DA] shadow-2xs">
                  <span className="text-[11px] text-[#7C6F64] font-bold whitespace-nowrap">주요 행사</span>
                </th>
                {days.map((d) => {
                  const today = isToday(d);
                  const dateKey = formatDateKey(d);
                  const eventVal = (dailyEvents && dailyEvents[dateKey]) || '';

                  return (
                    <th
                      key={`event-${dateKey}`}
                      className={`sticky top-[54px] z-30 h-[34px] p-1 border-r border-b border-[#E5E1DA] font-normal transition-colors ${
                        today ? 'bg-[#F0FAF7]' : 'bg-[#FAF9F7]'
                      }`}
                    >
                      <input
                        type="text"
                        value={eventVal}
                        onChange={(e) => onUpdateDailyEvent && onUpdateDailyEvent(dateKey, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder=""
                        className="w-full text-center text-[10px] md:text-xs font-gothic font-medium py-0.5 px-1 rounded border border-transparent hover:border-[#D5D1CA] focus:border-[#20487C] focus:bg-white focus:outline-none bg-transparent text-[#2D2926] placeholder-[#B5B0A8] transition-all truncate"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body (76개 15분 단위 슬롯) */}
            <tbody>
              {Array.from({ length: TOTAL_SLOTS }, (_, s) => {
                const isHourly = s % 4 === 0;
                const isHourEnd = (s + 1) % 4 === 0;
                const hourNum = Math.floor(s / 4) + 5;

                return (
                  <tr
                    key={s}
                    className="h-3.5 hover:bg-[#FAF9F7]/30 transition-colors"
                  >
                    {/* 시간 축 표시 (정시에만 시간 표시) - sticky left-0 z-20 align-top */}
                    <td className={`sticky left-0 z-20 bg-[#FAF9F7] text-center align-top border-r border-[#E5E1DA] select-none p-0 h-3.5 leading-none shadow-2xs ${
                      isHourEnd ? 'border-b border-b-[#D5D1CA]' : 'border-b border-b-[#E5E1DA]/30'
                    }`}>
                      {isHourly && (
                        <span className="block pt-0.5 px-0.5 font-mono font-bold text-[10px] text-[#8C857E] leading-none">
                          {String(hourNum).padStart(2, '0')}:00
                        </span>
                      )}
                    </td>

                    {/* 요일별 15분 슬롯 셀 */}
                    {days.map((d) => {
                      const dateKey = formatDateKey(d);

                      if (isSlotCoveredBySpan(dateKey, s)) {
                        return null; // 이미 이전 rowSpan 일정 영역
                      }

                      const item = getItemForSlot(dateKey, s);

                      // 드래그 선택 상태
                      const isSelectedInDrag =
                        dragStart &&
                        dragStart.date === dateKey &&
                        dragCurrent !== null &&
                        s >= Math.min(dragStart.slot, dragCurrent) &&
                        s <= Math.max(dragStart.slot, dragCurrent);

                      if (item) {
                        return (
                          <td
                            key={dateKey}
                            rowSpan={item.duration || 4}
                            className="p-0 border-r border-b border-[#E5E1DA] align-top timetable-cell relative z-0"
                            style={{ verticalAlign: 'top' }}
                          >
                            <div
                              onClick={() => onSelectItem(item)}
                              className="absolute top-[1px] bottom-[1px] left-[1px] right-[2px] z-0 rounded-xs transition-all flex flex-col justify-start p-1 border border-black/10 shadow-2xs cursor-pointer hover:shadow-md overflow-hidden"
                              style={{
                                backgroundColor: item.color || '#F8F7F4',
                                color: item.textColor || '#2D2926',
                              }}
                            >
                              {/* 일정 제목 (고딕체 폰트 적용, 줄바꿈 및 너비 초과 시 자동 줄바꿈) */}
                              <h4 className="font-gothic text-[11px] md:text-xs leading-snug font-medium tracking-tight break-words whitespace-pre-wrap w-full overflow-hidden">
                                {item.title}
                              </h4>
                            </div>
                          </td>
                        );
                      }

                      // 빈 15분 슬롯 (시간 간격 칸 높이 좁게 h-3.5)
                      return (
                        <td
                          key={dateKey}
                          onMouseDown={() => handleMouseDownSlot(dateKey, s)}
                          onMouseEnter={() => handleMouseEnterSlot(dateKey, s)}
                          onMouseUp={handleMouseUpSlot}
                          onClick={() => !dragStart && onSelectSlotToCreate(dateKey, Math.floor(s / 4) + 5, (s % 4) * 15, 4)}
                          className={`p-0 border-r border-[#E5E1DA] h-3.5 cursor-pointer timetable-cell transition-colors select-none ${
                            isHourEnd ? 'border-b border-b-[#D5D1CA]' : 'border-b border-b-[#E5E1DA]/30'
                          } ${isSelectedInDrag ? 'bg-[#E3F2FD] border-2 border-[#0D47A1]' : 'hover:bg-[#F8F7F4]'}`}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Option 1: 연속 보기 (가로 스와이프 가능한 타임테이블) */}
      {viewMode === 'twoWeekHorizontal' && renderGridForDays(continuousDays, '연속 보기', true)}

      {/* Option 2: 주간 계획 */}
      {(viewMode === 'splitCalendar' || viewMode === 'week1') && renderGridForDays(week1Days, '주간 계획')}

      {viewMode === 'week2' && renderGridForDays(week2Days, '주간 계획 (2주차)')}
    </div>
  );
};
