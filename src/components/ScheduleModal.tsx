import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Sparkles, Calendar, RefreshCw, AlertTriangle } from 'lucide-react';
import { ScheduleItem } from '../types';
import { PASTEL_COLORS, HOURS, MINUTES_15, DAY_NAMES } from '../utils/constants';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: ScheduleItem | null;
  defaultDate?: string;
  defaultStartHour?: number;
  defaultStartMinute?: number;
  defaultDuration?: number;
  twoWeekDays: Date[];
  colorMap: Record<string, { color: string; textColor: string }>;
  allItems?: ScheduleItem[];
  onSave: (
    itemData: Partial<ScheduleItem>,
    recurringOptions?: {
      isRecurring: boolean;
      type: 'daily' | 'weekly';
      days: number[];
      updateScope?: 'single' | 'all' | 'convertToRecurring';
    }
  ) => void;
  onDelete?: (id: string, deleteScope?: 'single' | 'all') => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  defaultDate,
  defaultStartHour = 9,
  defaultStartMinute = 0,
  defaultDuration = 4, // 기본 1시간 (4개 15분 슬롯)
  twoWeekDays,
  colorMap,
  allItems = [],
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || '');
  const [startHour, setStartHour] = useState(defaultStartHour);
  const [startMinute, setStartMinute] = useState(defaultStartMinute);
  const [durationSlots, setDurationSlots] = useState(defaultDuration);
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
  const [autoMatched, setAutoMatched] = useState(false);

  // 반복 일정 설정
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly'>('daily');
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 3, 5]);

  // 수정 모드 시 적용 범위 ('all': 모든 반복 일정, 'single': 이 일정만)
  const [editScope, setEditScope] = useState<'all' | 'single'>('all');

  // 삭제용 확인 카드 보이기 상태 ('none' | 'delete')
  const [confirmMode, setConfirmMode] = useState<'none' | 'delete'>('none');

  // 현재 항목이 반복 일정 그룹인지 또는 연관 반복 일정이 있는지 판단
  const recurringGroupItems = useMemo(() => {
    if (!initialItem || !allItems) return [];
    if (initialItem.recurringGroupId) {
      return allItems.filter((it) => it.recurringGroupId === initialItem.recurringGroupId);
    }
    return allItems.filter(
      (it) =>
        it.title.trim() === initialItem.title.trim() &&
        it.startHour === initialItem.startHour &&
        (it.startMinute || 0) === (initialItem.startMinute || 0) &&
        (it.duration || 4) === (initialItem.duration || 4)
    );
  }, [initialItem, allItems]);

  const isRecurringItem = useMemo(() => {
    if (!initialItem) return false;
    if (initialItem.isRecurring || initialItem.recurringGroupId) return true;
    return recurringGroupItems.length > 1;
  }, [initialItem, recurringGroupItems]);

  useEffect(() => {
    setConfirmMode('none');
    setEditScope('all');
    if (initialItem) {
      setTitle(initialItem.title);
      setDate(initialItem.date);
      setStartHour(initialItem.startHour);
      setStartMinute(initialItem.startMinute || 0);
      setDurationSlots(initialItem.duration || 4);

      const matchedColor = PASTEL_COLORS.find((c) => c.bg === initialItem.color) || PASTEL_COLORS[0];
      setSelectedColor(matchedColor);
      setAutoMatched(false);

      const isGroup =
        initialItem.isRecurring ||
        !!initialItem.recurringGroupId ||
        recurringGroupItems.length > 1;

      setIsRecurring(Boolean(isGroup));
      setRecurringType(initialItem.recurringType || 'daily');
      setRecurringDays(
        initialItem.recurringDays && initialItem.recurringDays.length > 0
          ? initialItem.recurringDays
          : [1, 3, 5]
      );
    } else {
      setTitle('');
      setDate(defaultDate || (twoWeekDays[0] ? twoWeekDays[0].toISOString().slice(0, 10) : ''));
      setStartHour(defaultStartHour);
      setStartMinute(defaultStartMinute);
      setDurationSlots(defaultDuration);
      setSelectedColor(PASTEL_COLORS[0]);
      setAutoMatched(false);
      setIsRecurring(false);
      setRecurringType('daily');
      setRecurringDays([1, 3, 5]);
    }
  }, [
    initialItem,
    defaultDate,
    defaultStartHour,
    defaultStartMinute,
    defaultDuration,
    isOpen,
    twoWeekDays,
    recurringGroupItems,
  ]);

  // 자동 색상 매핑 체크
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (newTitle.trim() && colorMap[newTitle.trim()]) {
      const savedMap = colorMap[newTitle.trim()];
      const matched = PASTEL_COLORS.find((c) => c.bg === savedMap.color);
      if (matched) {
        setSelectedColor(matched);
        setAutoMatched(true);
        return;
      }
    }
    setAutoMatched(false);
  };

  const handleToggleDay = (dayIndex: number) => {
    if (recurringDays.includes(dayIndex)) {
      setRecurringDays(recurringDays.filter((d) => d !== dayIndex));
    } else {
      setRecurringDays([...recurringDays, dayIndex]);
    }
  };

  const getSubmitData = (): Partial<ScheduleItem> => ({
    id: initialItem?.id,
    title: title.trim(),
    date,
    startHour,
    startMinute,
    duration: durationSlots,
    color: selectedColor.bg,
    textColor: selectedColor.text,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    if (initialItem) {
      // 기존 일정 수정 처리
      let updateScope: 'single' | 'all' | 'convertToRecurring' = 'single';
      if (isRecurringItem) {
        updateScope = editScope;
      } else if (isRecurring) {
        updateScope = 'convertToRecurring';
      }

      onSave(getSubmitData(), {
        isRecurring: isRecurring,
        type: recurringType,
        days: recurringDays,
        updateScope: updateScope,
      });
      onClose();
    } else {
      // 신규 일정 생성
      onSave(
        getSubmitData(),
        isRecurring ? { isRecurring: true, type: recurringType, days: recurringDays } : undefined
      );
      onClose();
    }
  };

  const handleDeleteClick = () => {
    if (!initialItem) return;
    if (isRecurringItem) {
      setConfirmMode('delete');
    } else {
      onDelete?.(initialItem.id, 'single');
      onClose();
    }
  };

  if (!isOpen) return null;

  // 슬롯 개수 -> 읽기 쉬운 시간 표현
  const formatDurationText = (slots: number) => {
    const totalMinutes = slots * 15;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs === 0) return `${mins}분`;
    if (mins === 0) return `${hrs}시간`;
    return `${hrs}시간 ${mins}분`;
  };

  // 소요 시간 옵션들 (15분 ~ 8시간)
  const durationOptions = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 32];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans-kr">
      <div className="lux-card w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="bg-[#FAF9F7] px-6 py-4 border-b border-[#E5E1DA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#8C857E]" />
            <h3 className="text-base md:text-lg font-serif-kr font-normal text-[#2D2926]">
              {initialItem ? '일정 수정' : '새 주간 일정 등록'}
            </h3>
            {isRecurringItem && (
              <span className="px-2 py-0.5 text-[11px] bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] rounded-full font-semibold flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> 반복 일정
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#E5E1DA] text-[#8C857E] hover:text-[#2D2926] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 폼 바디 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 일정 제목 입력 & 자동 색상 안내 */}
          <div>
            <label className="block text-xs font-medium text-[#2D2926] mb-1">
              일정 내용 <span className="text-[#C94A4A]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={handleTitleChange}
              placeholder="예: 독서, 프로젝트 회의, 운동, 전공 강의"
              className="w-full px-4 py-3 rounded-xl border border-[#E5E1DA] bg-[#FAF9F7] text-base font-gothic font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 text-[#2D2926]"
            />
            {autoMatched && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#0F6856] font-medium bg-[#F0FAF7] p-2 rounded-lg border border-[#D0EAE2]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>이전에 사용하신 파스텔 색상이 자동으로 매핑되었습니다!</span>
              </div>
            )}
          </div>

          {/* 날짜 / 시간 (15분 단위) 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-[#2D2926] mb-1">날짜</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-[#E5E1DA] bg-[#FAF9F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 text-[#2D2926]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2D2926] mb-1">시작 시</label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl border border-[#E5E1DA] bg-[#FAF9F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 text-[#2D2926]"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}시
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2D2926] mb-1">시작 분</label>
              <select
                value={startMinute}
                onChange={(e) => setStartMinute(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl border border-[#E5E1DA] bg-[#FAF9F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 text-[#2D2926]"
              >
                {MINUTES_15.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}분
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2D2926] mb-1">소요 시간</label>
              <select
                value={durationSlots}
                onChange={(e) => setDurationSlots(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl border border-[#E5E1DA] bg-[#FAF9F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 text-[#2D2926]"
              >
                {durationOptions.map((slots) => (
                  <option key={slots} value={slots}>
                    {formatDurationText(slots)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 파스텔 색상 선택 */}
          <div>
            <label className="block text-xs font-medium text-[#2D2926] mb-1.5 flex items-center justify-between">
              <span>파스텔 배경 색상</span>
              <span className="text-[11px] font-normal text-[#8C857E]">
                선택 시 해당 일정 내용에 색상이 기억됩니다
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedColor(c);
                    setAutoMatched(false);
                  }}
                  className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
                    selectedColor.id === c.id
                      ? 'ring-2 ring-[#2D2926] ring-offset-1 font-bold shadow-2xs'
                      : 'hover:opacity-80 opacity-90'
                  }`}
                  style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.text }} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 반복 일정 설정 (등록 & 수정 모두 사용) */}
          <div className="p-3.5 rounded-xl bg-[#FAF9F7] border border-[#E5E1DA] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#2D2926] flex items-center gap-1.5 cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>반복 일정으로 설정</span>
              </label>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-[#2D2926] accent-[#2D2926] cursor-pointer"
              />
            </div>

            {isRecurring && (
              <div className="space-y-2 pt-2 border-t border-[#E5E1DA] animate-in fade-in duration-150">
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer font-medium text-[#2D2926]">
                    <input
                      type="radio"
                      name="recurringType"
                      checked={recurringType === 'daily'}
                      onChange={() => setRecurringType('daily')}
                      className="accent-[#2D2926]"
                    />
                    <span>매일 반복</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer font-medium text-[#2D2926]">
                    <input
                      type="radio"
                      name="recurringType"
                      checked={recurringType === 'weekly'}
                      onChange={() => setRecurringType('weekly')}
                      className="accent-[#2D2926]"
                    />
                    <span>특정 요일 반복</span>
                  </label>
                </div>

                {recurringType === 'weekly' && (
                  <div className="flex items-center gap-1 pt-1">
                    {DAY_NAMES.map((dayName, idx) => {
                      const dayNum = (idx + 1) % 7;
                      const isSelected = recurringDays.includes(dayNum);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => handleToggleDay(dayNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-[#2D2926] text-white'
                              : 'bg-white border border-[#E5E1DA] text-[#2D2926] hover:bg-[#FAF9F7]'
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 기존 일정을 수정하는 중이고, 해당 일정이 반복 일정인 경우: 수정 범위 직접 선택 */}
            {initialItem && (isRecurringItem || isRecurring) && (
              <div className="pt-2.5 mt-2 border-t border-[#E5E1DA] space-y-1.5">
                <label className="block text-[11px] font-bold text-[#2D2926]">수정 적용 범위</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      editScope === 'all'
                        ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20] font-medium'
                        : 'bg-white border border-[#E5E1DA] text-[#2D2926]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editScope"
                      checked={editScope === 'all'}
                      onChange={() => setEditScope('all')}
                      className="accent-[#2E7D32]"
                    />
                    <span>
                      모든 반복 일정 수정
                      {recurringGroupItems.length > 0 ? ` (${recurringGroupItems.length}개)` : ''}
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      editScope === 'single'
                        ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20] font-medium'
                        : 'bg-white border border-[#E5E1DA] text-[#2D2926]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editScope"
                      checked={editScope === 'single'}
                      onChange={() => setEditScope('single')}
                      className="accent-[#2E7D32]"
                    />
                    <span>이 일정만 수정</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 반복 삭제 옵션 대화상자 */}
          {confirmMode === 'delete' && (
            <div className="p-4 bg-[#FFF5F5] border border-[#F8BBD0] rounded-xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C94A4A] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#C94A4A]">반복 일정 삭제 범위 선택</h4>
                  <p className="text-[11px] text-[#666] mt-0.5">
                    이 일정은 반복 그룹에 속해 있습니다. 삭제 범위를 선택해주세요.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (initialItem) onDelete?.(initialItem.id, 'single');
                    setConfirmMode('none');
                    onClose();
                  }}
                  className="px-3 py-2 bg-white border border-[#E5E1DA] rounded-lg text-xs font-medium text-[#2D2926] hover:bg-[#FAF9F7] transition-all cursor-pointer"
                >
                  이 일정만 삭제
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (initialItem) onDelete?.(initialItem.id, 'all');
                    setConfirmMode('none');
                    onClose();
                  }}
                  className="px-3 py-2 bg-[#C94A4A] text-white rounded-lg text-xs font-medium hover:bg-[#A83838] transition-all shadow-2xs cursor-pointer"
                >
                  모든 반복 일정 삭제
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setConfirmMode('none')}
                  className="text-[11px] text-[#8C857E] hover:underline cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 하단 버튼 액션 (confirmMode가 active일 때는 비활성화/숨김) */}
          {confirmMode === 'none' && (
            <div className="pt-3 border-t border-[#E5E1DA] flex items-center justify-between">
              {initialItem && onDelete ? (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="px-3.5 py-2 rounded-xl border border-[#F8BBD0] text-[#C94A4A] hover:bg-[#FFF8F3] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>일정 삭제</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-[#E5E1DA] text-[#2D2926] hover:bg-[#FAF9F7] text-xs font-medium transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#2D2926] text-white hover:bg-[#1A1A1A] text-xs font-medium transition-all shadow-2xs cursor-pointer"
                >
                  {initialItem ? '수정 완료' : '일정 저장'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

