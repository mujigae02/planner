import React, { useState } from 'react';
import { RotateCcw, Copy, ClipboardCheck, Sparkles, AlertTriangle, X } from 'lucide-react';
import { formatKoreanDateShort } from '../utils/dateUtils';

interface WeeklyActionControlsProps {
  twoWeekDays: Date[];
  onResetWeek: (startDate: Date) => void;
  onCopyWeek: (startDate: Date) => void;
  onPasteWeek: (targetStartDate: Date) => void;
  copiedWeekRangeStr: string | null;
}

export const WeeklyActionControls: React.FC<WeeklyActionControlsProps> = ({
  twoWeekDays,
  onResetWeek,
  onCopyWeek,
  onPasteWeek,
  copiedWeekRangeStr,
}) => {
  const [resetConfirmTarget, setResetConfirmTarget] = useState<{
    startDate: Date;
    weekName: string;
    label: string;
  } | null>(null);

  if (!twoWeekDays || twoWeekDays.length < 14) return null;

  const week1Start = twoWeekDays[0];
  const week1End = twoWeekDays[6];
  const week2Start = twoWeekDays[7];
  const week2End = twoWeekDays[13];

  const week1Label = `${formatKoreanDateShort(week1Start)} ~ ${formatKoreanDateShort(week1End)}`;
  const week2Label = `${formatKoreanDateShort(week2Start)} ~ ${formatKoreanDateShort(week2End)}`;

  const handleExecuteReset = () => {
    if (resetConfirmTarget) {
      onResetWeek(resetConfirmTarget.startDate);
      setResetConfirmTarget(null);
    }
  };

  return (
    <>
      <div className="lux-card p-3 mb-3.5 bg-white border border-[#E5E1DA] rounded-2xl shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-sans-kr">
          {/* Left info badge */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#F0FAF7] border border-[#C8E6C9] flex items-center justify-center text-[#2E7D32]">
              <Sparkles className="w-4 h-4 text-[#2E7D32]" />
            </div>
            <div>
              <span className="font-bold text-[#2D2926]">주단위 일괄 편집 도구</span>
              <p className="text-[11px] text-[#8C857E]">반복일정을 포함하여 주단위로 일정을 리셋하거나 복사 &amp; 붙여넣기 할 수 있습니다.</p>
            </div>
          </div>

          {/* Action button groups for Week 1 & Week 2 */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            {/* 1주차 액션 그룹 */}
            <div className="flex items-center gap-1 bg-[#FAF9F7] p-1 rounded-xl border border-[#E5E1DA]">
              <span className="px-1.5 text-[11px] font-bold text-[#2563EB]">1주차</span>
              <button
                onClick={() => setResetConfirmTarget({ startDate: week1Start, weekName: '1주차', label: week1Label })}
                className="px-2 py-1 bg-white hover:bg-[#FFF1F2] hover:text-[#C94A4A] text-[#555] rounded-lg border border-[#E5E1DA] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                title="1주차 모든 일정 및 행사 리셋"
              >
                <RotateCcw className="w-3 h-3 text-[#C94A4A]" />
                <span>리셋</span>
              </button>
              <button
                onClick={() => onCopyWeek(week1Start)}
                className="px-2 py-1 bg-white hover:bg-[#F0F6FF] hover:text-[#2563EB] text-[#555] rounded-lg border border-[#E5E1DA] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                title="1주차 일정 복사"
              >
                <Copy className="w-3 h-3 text-[#2563EB]" />
                <span>복사</span>
              </button>
              <button
                onClick={() => onPasteWeek(week1Start)}
                disabled={!copiedWeekRangeStr}
                className={`px-2 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1 shadow-2xs ${
                  copiedWeekRangeStr
                    ? 'bg-[#2563EB] text-white border-[#2563EB] hover:bg-[#1D4ED8]'
                    : 'bg-[#F5F5F5] text-[#AAA] border-[#E5E1DA] cursor-not-allowed'
                }`}
                title="복사한 일정을 1주차에 붙여넣기"
              >
                <ClipboardCheck className="w-3 h-3" />
                <span>붙여넣기</span>
              </button>
            </div>

            {/* 2주차 액션 그룹 */}
            <div className="flex items-center gap-1 bg-[#FAF9F7] p-1 rounded-xl border border-[#E5E1DA]">
              <span className="px-1.5 text-[11px] font-bold text-[#7C3AED]">2주차</span>
              <button
                onClick={() => setResetConfirmTarget({ startDate: week2Start, weekName: '2주차', label: week2Label })}
                className="px-2 py-1 bg-white hover:bg-[#FFF1F2] hover:text-[#C94A4A] text-[#555] rounded-lg border border-[#E5E1DA] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                title="2주차 모든 일정 및 행사 리셋"
              >
                <RotateCcw className="w-3 h-3 text-[#C94A4A]" />
                <span>리셋</span>
              </button>
              <button
                onClick={() => onCopyWeek(week2Start)}
                className="px-2 py-1 bg-white hover:bg-[#F0F6FF] hover:text-[#2563EB] text-[#555] rounded-lg border border-[#E5E1DA] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                title="2주차 일정 복사"
              >
                <Copy className="w-3 h-3 text-[#2563EB]" />
                <span>복사</span>
              </button>
              <button
                onClick={() => onPasteWeek(week2Start)}
                disabled={!copiedWeekRangeStr}
                className={`px-2 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1 shadow-2xs ${
                  copiedWeekRangeStr
                    ? 'bg-[#7C3AED] text-white border-[#7C3AED] hover:bg-[#6D28D9]'
                    : 'bg-[#F5F5F5] text-[#AAA] border-[#E5E1DA] cursor-not-allowed'
                }`}
                title="복사한 일정을 2주차에 붙여넣기"
              >
                <ClipboardCheck className="w-3 h-3" />
                <span>붙여넣기</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 리셋 확인 리액트 모달 */}
      {resetConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in font-sans-kr">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#E5E1DA]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#C94A4A]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-[#2D2926]">
                  {resetConfirmTarget.weekName} 일정 리셋 확인
                </h3>
              </div>
              <button
                onClick={() => setResetConfirmTarget(null)}
                className="text-[#8C857E] hover:text-[#2D2926] p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#555] leading-relaxed mb-6">
              <strong className="text-[#2D2926]">{resetConfirmTarget.weekName} ({resetConfirmTarget.label})</strong> 의 모든 일정 및 행사 메모를 리셋하시겠습니까?
              <br />
              <span className="text-[#C94A4A] text-[11px] block mt-1">
                ※ 반복 일정을 포함하여 해당 주차의 모든 스케줄이 삭제됩니다.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setResetConfirmTarget(null)}
                className="px-4 py-2 bg-[#F5F4F0] hover:bg-[#EAE8E3] text-[#555] rounded-xl text-xs font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleExecuteReset}
                className="px-4 py-2 bg-[#C94A4A] hover:bg-[#B33E3E] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>리셋하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
