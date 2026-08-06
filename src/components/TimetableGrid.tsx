import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { ScheduleItem, DailyEvents } from '../types';
import { DAY_NAMES, TOTAL_SLOTS } from '../utils/constants';
import { formatDateKey, formatKoreanDateShort, isToday } from '../utils/dateUtils';

interface TimetableGridProps {
  twoWeekDays: Date[];
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

  // 주차별 날짜 분리
  const week1Days = twoWeekDays.slice(0, 7);
  const week2Days = twoWeekDays.slice(7, 14);

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
  const renderGridForDays = (days: Date[], weekTitle?: string) => {
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

    const is14DayView = days.length === 14;

    return (
      <div className="lux-card mb-6" onMouseLeave={() => setDragStart(null)}>
        {weekTitle && (
          <div className="bg-[#FAF9F7] px-5 py-2.5 border-b border-[#E5E1DA] flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2563EB]" />
              <span className="font-serif-kr font-bold text-[#1A1A1A] text-sm md:text-base">{weekTitle}</span>
            </div>
            <span className="text-xs text-[#8C857E] font-sans-kr font-medium">
              {formatKoreanDateShort(days[0])} ~ {formatKoreanDateShort(days[days.length - 1])}
            </span>
          </div>
        )}

        {/* 테이블 가로 및 세로 스크롤 컨테이너 (한 번에 9시간 분량 스케줄 조회가 가능하도록 580px 세로 높이 설정) */}
        <div className="overflow-auto h-[580px] min-h-[580px] rounded-b-2xl">
          <table className={`w-full border-collapse ${is14DayView ? 'min-w-[1100px]' : 'min-w-[650px]'}`}>
            {/* Table Header (스크롤 시 상단 고정) */}
            <thead className="sticky top-0 z-20 bg-[#FAF9F7] border-b border-[#E5E1DA] shadow-xs">
              {/* 1행: 요일 및 날짜 */}
              <tr className="bg-[#FAF9F7] border-b border-[#E5E1DA]">
                <th className="sticky top-0 z-20 bg-[#FAF9F7] w-12 md:w-14 p-1.5 text-center text-[11px] font-medium text-[#8C857E] font-serif-kr border-r border-[#E5E1DA]">
                  시간
                </th>
                {days.map((d) => {
                  const today = isToday(d);
                  const dateKey = formatDateKey(d);
                  const dayOfWeek = d.getDay(); // 0(일) ~ 6(토)
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isWeekend = isSunday || isSaturday;

                  return (
                    <th
                      key={dateKey}
                      style={{ width: isWeekend ? (is14DayView ? '4.16%' : '8.33%') : (is14DayView ? '8.33%' : '16.66%') }}
                      className={`sticky top-0 z-20 p-1.5 text-center border-r border-[#E5E1DA] last:border-r-0 transition-colors ${
                        today ? 'bg-[#F0FAF7]' : 'bg-[#FAF9F7]'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-[11px] font-medium font-sans-kr ${
                            isSunday
                              ? 'text-[#C94A4A]'
                              : isSaturday
                              ? 'text-[#2563EB]'
                              : 'text-[#8C857E]'
                          }`}
                        >
                          {DAY_NAMES[(dayOfWeek + 6) % 7]}요일
                        </span>
                        <span
                          className={`text-xs font-serif-kr mt-0.5 ${
                            today
                              ? 'bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-full text-[11px] font-bold shadow-2xs border border-[#BBDEFB]'
                              : isSaturday
                              ? 'text-[#2563EB] font-normal'
                              : isSunday
                              ? 'text-[#C94A4A] font-normal'
                              : 'text-[#2D2926] font-normal'
                          }`}
                        >
                          {d.getDate()}일
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* 2행: 그날의 주요 행사 기록 행 */}
              <tr className="bg-[#FAF9F7] border-b border-[#E5E1DA]">
                <th className="p-1 text-center border-r border-[#E5E1DA] bg-[#FAF9F7]">
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span className="text-[10px] text-[#7C6F64] font-semibold">주요</span>
                    <span className="text-[10px] text-[#7C6F64] font-medium">행사</span>
                  </div>
                </th>
                {days.map((d) => {
                  const today = isToday(d);
                  const dateKey = formatDateKey(d);
                  const eventVal = (dailyEvents && dailyEvents[dateKey]) || '';

                  return (
                    <th
                      key={`event-${dateKey}`}
                      className={`p-1 border-r border-[#E5E1DA] last:border-r-0 font-normal transition-colors ${
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
                        className="w-full text-center text-[10px] md:text-xs font-gothic font-medium py-0.5 px-1 rounded border border-transparent hover:border-[#D5D1CA] focus:border-[#4A6B82] focus:bg-white focus:outline-none bg-transparent text-[#2D2926] placeholder-[#B5B0A8] transition-all truncate"
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
                const hourNum = Math.floor(s / 4) + 5;

                return (
                  <tr
                    key={s}
                    className={`h-3.5 ${
                      isHourly ? 'border-t border-[#D5D1CA]' : 'border-t border-[#E5E1DA]/30'
                    } hover:bg-[#FAF9F7]/30 transition-colors`}
                  >
                    {/* 시간 축 표시 (정시에만 시간 표시) */}
                    <td className="text-center text-[9px] font-mono font-medium text-[#8C857E] bg-[#FAF9F7] border-r border-[#E5E1DA] select-none p-0 h-3.5 leading-none">
                      {isHourly && (
                        <span className="block -mt-1.5 bg-[#FAF9F7] px-0.5 font-mono font-bold text-[9px] text-[#555]">
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
                            className="p-0 border-r border-[#E5E1DA] last:border-r-0 align-top timetable-cell relative"
                            style={{ verticalAlign: 'top' }}
                          >
                            <div
                              onClick={() => onSelectItem(item)}
                              className="absolute inset-0 transition-all flex flex-col justify-start p-1 border border-black/10 shadow-2xs cursor-pointer hover:shadow-md overflow-hidden"
                              style={{
                                backgroundColor: item.color || '#F8F7F4',
                                color: item.textColor || '#2D2926',
                              }}
                            >
                              {/* 일정 제목 (고딕체 폰트 적용 및 가독성 개선) */}
                              <h4
                                className="font-gothic text-[11px] md:text-xs leading-tight font-medium tracking-tight break-keep whitespace-normal w-full overflow-hidden"
                              >
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
                          className={`p-0 border-r border-[#E5E1DA] last:border-r-0 h-3.5 cursor-pointer timetable-cell transition-colors select-none ${
                            isSelectedInDrag ? 'bg-[#E3F2FD] border-2 border-[#0D47A1]' : 'hover:bg-[#F8F7F4]'
                          }`}
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
      {/* Option 1: 2주 보기 */}
      {viewMode === 'twoWeekHorizontal' && renderGridForDays(twoWeekDays, '2주 보기')}

      {/* Option 2: 주간 계획 */}
      {(viewMode === 'splitCalendar' || viewMode === 'week1') &&
        renderGridForDays(week1Days, '주간 계획')}

      {viewMode === 'week2' && renderGridForDays(week2Days, '주간 계획 (2주차)')}
    </div>
  );
};
