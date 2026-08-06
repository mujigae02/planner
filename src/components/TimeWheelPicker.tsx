import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface TimeWheelPickerProps {
  label: string;
  hour: number; // 5 ~ 24
  minute: number; // 0 ~ 55 (5분 단위)
  minHour?: number;
  maxHour?: number;
  alignRight?: boolean;
  onChange: (hour: number, minute: number) => void;
}

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({
  label,
  hour,
  minute,
  minHour = 5,
  maxHour = 24,
  alignRight = false,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 밖 영역 클릭 시 팝오버 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 시간 옵션 리스트 생성 (minHour ~ maxHour)
  const hourOptions: number[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    hourOptions.push(h);
  }

  // 24시인 경우에는 분을 0분으로 고정
  const validMinute = hour === 24 ? 0 : minute;

  // 현재 인덱스 구하기
  const currentHourIdx = hourOptions.indexOf(hour);
  const safeHourIdx = currentHourIdx !== -1 ? currentHourIdx : 0;

  // 분 인덱스 구하기 (가장 가까운 5분 단위 옵션 매칭)
  let currentMinIdx = MINUTE_OPTIONS.indexOf(validMinute);
  if (currentMinIdx === -1) {
    let minDiff = Infinity;
    currentMinIdx = 0;
    MINUTE_OPTIONS.forEach((m, idx) => {
      const diff = Math.abs(m - validMinute);
      if (diff < minDiff) {
        minDiff = diff;
        currentMinIdx = idx;
      }
    });
  }
  const safeMinIdx = currentMinIdx;

  // 시 변경
  const setHourByIdx = (idx: number) => {
    const newIdx = Math.max(0, Math.min(hourOptions.length - 1, idx));
    const newHour = hourOptions[newIdx];
    const newMin = newHour === 24 ? 0 : validMinute;
    onChange(newHour, newMin);
  };

  // 분 변경
  const setMinuteByIdx = (idx: number) => {
    if (hour === 24) {
      onChange(24, 0);
      return;
    }
    const newIdx = Math.max(0, Math.min(MINUTE_OPTIONS.length - 1, idx));
    onChange(hour, MINUTE_OPTIONS[newIdx]);
  };

  // 마우스 휠 스크롤 이벤트
  const handleHourWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      setHourByIdx(safeHourIdx + 1);
    } else if (e.deltaY < 0) {
      setHourByIdx(safeHourIdx - 1);
    }
  };

  const handleMinuteWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      setMinuteByIdx(safeMinIdx + 1);
    } else if (e.deltaY < 0) {
      setMinuteByIdx(safeMinIdx - 1);
    }
  };

  // 이전/다음 아이템 값 구하기
  const prevHour = safeHourIdx > 0 ? hourOptions[safeHourIdx - 1] : null;
  const nextHour = safeHourIdx < hourOptions.length - 1 ? hourOptions[safeHourIdx + 1] : null;

  const prevMin = safeMinIdx > 0 ? MINUTE_OPTIONS[safeMinIdx - 1] : null;
  const nextMin = safeMinIdx < MINUTE_OPTIONS.length - 1 ? MINUTE_OPTIONS[safeMinIdx + 1] : null;

  const formattedTime = `${String(hour).padStart(2, '0')}:${String(validMinute).padStart(2, '0')}`;

  return (
    <div className="relative" ref={popoverRef}>
      <label className="block text-xs font-medium text-[#2D2926] mb-1">{label}</label>

      {/* 선택 버튼 트리거 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-xl border transition-all flex items-center justify-between text-xs font-bold font-mono ${
          isOpen
            ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] ring-2 ring-[#2563EB]/20 shadow-xs'
            : 'border-[#E5E1DA] bg-[#FAF9F7] text-[#2D2926] hover:bg-[#F3EFEC]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{formattedTime}</span>
        </div>
        <div className="flex items-center text-[#8C857E]">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-[#2563EB]' : ''}`} />
        </div>
      </button>

      {/* 드럼 휠 팝오버 (폭 좁고 아담하게 컴팩트 디자인) */}
      {isOpen && (
        <div className={`absolute top-full mt-1 z-50 w-40 bg-white border border-[#E5E1DA] rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150 ${alignRight ? 'right-0' : 'left-0'}`}>
          <div className="flex items-center justify-between border-b border-[#E5E1DA] pb-1.5 mb-1.5">
            <span className="text-[11px] font-bold text-[#1E3A8A] font-sans-kr flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#2563EB]" />
              {label}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-1.5 py-0.5 bg-[#2563EB] text-white text-[10px] font-bold rounded-md hover:bg-[#1D4ED8] transition-colors flex items-center gap-0.5"
            >
              <Check className="w-2.5 h-2.5" />
              완료
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 text-center select-none">
            {/* 시(Hour) 드럼 휠 */}
            <div
              className="flex flex-col items-center bg-[#FAF9F7] rounded-lg p-1 border border-[#E5E1DA]/60"
              onWheel={handleHourWheel}
            >
              <span className="text-[9px] font-bold text-[#8C857E] mb-0.5">시</span>

              {/* 위 화살표 */}
              <button
                type="button"
                onClick={() => setHourByIdx(safeHourIdx - 1)}
                disabled={safeHourIdx === 0}
                className="p-0.5 text-[#8C857E] hover:text-[#2563EB] disabled:opacity-20 transition-colors"
                title="1시간 이전"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              {/* 이전 시 (Faded) */}
              <div
                onClick={() => setHourByIdx(safeHourIdx - 1)}
                className={`h-4 text-[10px] font-mono text-[#8C857E]/50 flex items-center justify-center cursor-pointer hover:text-[#2563EB] transition-opacity ${
                  prevHour === null ? 'invisible' : ''
                }`}
              >
                {prevHour !== null ? `${String(prevHour).padStart(2, '0')}` : ''}
              </div>

              {/* 현재 선택 시 (Highlighted) */}
              <div className="w-full h-6 bg-[#2563EB] text-white font-mono font-bold text-xs rounded-md flex items-center justify-center shadow-2xs my-0.5 transition-all">
                {String(hour).padStart(2, '0')}
              </div>

              {/* 다음 시 (Faded) */}
              <div
                onClick={() => setHourByIdx(safeHourIdx + 1)}
                className={`h-4 text-[10px] font-mono text-[#8C857E]/50 flex items-center justify-center cursor-pointer hover:text-[#2563EB] transition-opacity ${
                  nextHour === null ? 'invisible' : ''
                }`}
              >
                {nextHour !== null ? `${String(nextHour).padStart(2, '0')}` : ''}
              </div>

              {/* 아래 화살표 */}
              <button
                type="button"
                onClick={() => setHourByIdx(safeHourIdx + 1)}
                disabled={safeHourIdx === hourOptions.length - 1}
                className="p-0.5 text-[#8C857E] hover:text-[#2563EB] disabled:opacity-20 transition-colors"
                title="1시간 다음"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 분(Minute) 드럼 휠 */}
            <div
              className={`flex flex-col items-center bg-[#FAF9F7] rounded-lg p-1 border border-[#E5E1DA]/60 ${
                hour === 24 ? 'opacity-40 pointer-events-none' : ''
              }`}
              onWheel={handleMinuteWheel}
            >
              <span className="text-[9px] font-bold text-[#8C857E] mb-0.5">분</span>

              {/* 위 화살표 */}
              <button
                type="button"
                onClick={() => setMinuteByIdx(safeMinIdx - 1)}
                disabled={safeMinIdx === 0}
                className="p-0.5 text-[#8C857E] hover:text-[#2563EB] disabled:opacity-20 transition-colors"
                title="5분 이전"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              {/* 이전 분 (Faded) */}
              <div
                onClick={() => setMinuteByIdx(safeMinIdx - 1)}
                className={`h-4 text-[10px] font-mono text-[#8C857E]/50 flex items-center justify-center cursor-pointer hover:text-[#2563EB] transition-opacity ${
                  prevMin === null ? 'invisible' : ''
                }`}
              >
                {prevMin !== null ? `${String(prevMin).padStart(2, '0')}` : ''}
              </div>

              {/* 현재 선택 분 (Highlighted) */}
              <div className="w-full h-6 bg-[#2563EB] text-white font-mono font-bold text-xs rounded-md flex items-center justify-center shadow-2xs my-0.5 transition-all">
                {String(validMinute).padStart(2, '0')}
              </div>

              {/* 다음 분 (Faded) */}
              <div
                onClick={() => setMinuteByIdx(safeMinIdx + 1)}
                className={`h-4 text-[10px] font-mono text-[#8C857E]/50 flex items-center justify-center cursor-pointer hover:text-[#2563EB] transition-opacity ${
                  nextMin === null ? 'invisible' : ''
                }`}
              >
                {nextMin !== null ? `${String(nextMin).padStart(2, '0')}` : ''}
              </div>

              {/* 아래 화살표 */}
              <button
                type="button"
                onClick={() => setMinuteByIdx(safeMinIdx + 1)}
                disabled={safeMinIdx === MINUTE_OPTIONS.length - 1}
                className="p-0.5 text-[#8C857E] hover:text-[#2563EB] disabled:opacity-20 transition-colors"
                title="5분 다음"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
