import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  CalendarDays,
  Repeat,
  Tag,
  X,
  Edit2,
  Info,
} from 'lucide-react';
import { YearlyScheduleItem } from '../types';

interface YearlyCalendarViewProps {
  yearlyItems: YearlyScheduleItem[];
  onAddYearlyItems: (newItems: Omit<YearlyScheduleItem, 'id'>[], targetMonths: number[]) => void;
  onUpdateYearlyItem: (item: YearlyScheduleItem) => void;
  onDeleteYearlyItem: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

const MONTH_NAMES = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

const PRESET_TAG_COLORS = [
  { name: '골드/차콜', bg: '#2D2926', text: '#FFD700', border: '#2D2926' },
  { name: '세이지 그린', bg: '#F0FAF7', text: '#0F6856', border: '#D0EAE2' },
  { name: '딥 블루', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  { name: '로즈 핑크', bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  { name: '앰버 퍼플', bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF' },
  { name: '피치 오렌지', bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' },
];

export const YearlyCalendarView: React.FC<YearlyCalendarViewProps> = ({
  yearlyItems,
  onAddYearlyItems,
  onUpdateYearlyItem,
  onDeleteYearlyItem,
  onToggleComplete,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // 일정 입력/수정 모달 state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [inputTitle, setInputTitle] = useState('');
  const [inputColorIndex, setInputColorIndex] = useState(0);

  // 반복/적용 월 선택 (1 ~ 12)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([1]);
  const [isAllMonthsRepeat, setIsAllMonthsRepeat] = useState(false);

  // 연도 이동
  const handlePrevYear = () => setSelectedYear((y) => y - 1);
  const handleNextYear = () => setSelectedYear((y) => y + 1);
  const handleThisYear = () => setSelectedYear(new Date().getFullYear());

  // 특정 월의 '일정 추가' 클릭
  const handleOpenAddForMonth = (monthNum: number) => {
    setEditingItemId(null);
    setInputTitle('');
    setInputColorIndex(0);
    setSelectedMonths([monthNum]);
    setIsAllMonthsRepeat(false);
    setIsModalOpen(true);
  };

  // '전체 연간 일정 추가' 메인 버튼 클릭
  const handleOpenAddGeneral = () => {
    setEditingItemId(null);
    setInputTitle('');
    setInputColorIndex(0);
    setSelectedMonths([1]);
    setIsAllMonthsRepeat(false);
    setIsModalOpen(true);
  };

  // 수정 버튼 클릭
  const handleOpenEdit = (item: YearlyScheduleItem) => {
    setEditingItemId(item.id);
    setInputTitle(item.title);
    
    // 색상 매칭
    const foundIdx = PRESET_TAG_COLORS.findIndex((c) => c.bg === item.color);
    setInputColorIndex(foundIdx >= 0 ? foundIdx : 0);

    setSelectedMonths([item.month]);
    setIsAllMonthsRepeat(false);
    setIsModalOpen(true);
  };

  // 매월 반복 토글
  const handleToggleAllMonthsRepeat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsAllMonthsRepeat(checked);
    if (checked) {
      setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    } else {
      setSelectedMonths([1]);
    }
  };

  // 개별 월 체크박스 토글
  const handleToggleMonthCheck = (m: number) => {
    if (isAllMonthsRepeat) {
      setIsAllMonthsRepeat(false);
    }
    setSelectedMonths((prev) => {
      if (prev.includes(m)) {
        if (prev.length === 1) return prev; // 최소 1개 유지
        return prev.filter((item) => item !== m);
      } else {
        const next = [...prev, m].sort((a, b) => a - b);
        if (next.length === 12) setIsAllMonthsRepeat(true);
        return next;
      }
    });
  };

  // 모달 저장 버튼
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    const chosenColor = PRESET_TAG_COLORS[inputColorIndex];

    if (editingItemId) {
      // 단일 항목 수정
      const targetMonth = selectedMonths[0] || 1;
      onUpdateYearlyItem({
        id: editingItemId,
        year: selectedYear,
        month: targetMonth,
        title: inputTitle.trim(),
        color: chosenColor.bg,
        textColor: chosenColor.text,
      });
    } else {
      // 신규 등록 (선택된 월 목록 전체에 일괄 등록)
      const newBaseData = {
        year: selectedYear,
        title: inputTitle.trim(),
        color: chosenColor.bg,
        textColor: chosenColor.text,
        completed: false,
      };

      onAddYearlyItems(
        selectedMonths.map((m) => ({ ...newBaseData, month: m })),
        selectedMonths
      );
    }

    setIsModalOpen(false);
  };

  // 현재 연도의 전체 연간 일정 목록
  const currentYearItems = yearlyItems.filter((it) => it.year === selectedYear);
  const completedCount = currentYearItems.filter((it) => it.completed).length;

  return (
    <div className="space-y-4 no-print">
      {/* 상단 컨트롤 헤더 */}
      <div className="lux-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-[#2563EB] shrink-0" />
          <div>
            <h2 className="text-lg md:text-xl font-serif-kr font-bold text-[#1A1A1A]">
              {selectedYear}년 년간 계획
            </h2>
            <p className="text-xs text-[#8C857E] font-sans-kr mt-0.5">
              1월부터 12월까지 각 월별 목표 및 스케줄을 자유롭게 기록해보세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 연도 네비게이션 */}
          <div className="flex items-center bg-white border border-[#E5E1DA] rounded-full p-0.5 shadow-2xs">
            <button
              onClick={handlePrevYear}
              className="px-3 py-1.5 rounded-full text-[#2D2926] hover:bg-[#F8F7F4] text-xs font-medium flex items-center gap-1 transition-colors"
              title="이전 해"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{selectedYear - 1}년</span>
            </button>
            <button
              onClick={handleThisYear}
              className="px-3.5 py-1.5 rounded-full bg-[#2563EB] text-white text-xs font-semibold transition-colors mx-0.5 shadow-2xs hover:bg-[#1D4ED8]"
            >
              올해 ({new Date().getFullYear()}년)
            </button>
            <button
              onClick={handleNextYear}
              className="px-3 py-1.5 rounded-full text-[#2D2926] hover:bg-[#F8F7F4] text-xs font-medium flex items-center gap-1 transition-colors"
              title="다음 해"
            >
              <span>{selectedYear + 1}년</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenAddGeneral}
            className="px-3.5 py-1.5 rounded-full bg-[#2D2926] hover:bg-[#1A1A1A] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>일정 추가</span>
          </button>
        </div>
      </div>

      {/* 안내 알림 바 */}
      <div className="p-3 bg-[#FAF9F7] border border-[#E5E1DA] rounded-xl flex items-center gap-2 text-xs text-[#555]">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
        <span>
          이 연간 달력은 <strong>날짜 그리드 없이 12달의 빈 공간</strong>으로 구성되며, 주간 계획표 타임테이블과 섞이지 않고 독립적으로 보존됩니다.
        </span>
      </div>

      {/* 12달 균등 카드 그리드 (4열 x 3행 / 3열 / 2열 / 1열) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const monthNum = monthIdx + 1; // 1 ~ 12
          const monthItems = currentYearItems.filter((it) => it.month === monthNum);

          return (
            <div
              key={monthName}
              className="lux-card p-4 flex flex-col justify-between min-h-[220px] hover:border-[#2D2926]/40 transition-all duration-200 shadow-2xs hover:shadow-xs bg-white"
            >
              {/* 월 카드 헤더 */}
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E5E1DA]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-serif-kr font-bold text-[#1A1A1A]">
                      {monthName}
                    </span>
                    {monthItems.length > 0 && (
                      <span className="px-2 py-0.5 bg-[#FAF9F7] border border-[#E5E1DA] text-[#2D2926] text-[10px] font-semibold rounded-full">
                        {monthItems.length}개
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenAddForMonth(monthNum)}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF9F7] hover:bg-[#2D2926] hover:text-white border border-[#E5E1DA] text-[#2D2926] transition-all flex items-center gap-1 text-xs font-medium"
                    title={`${monthName} 일정 추가`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>추가</span>
                  </button>
                </div>

                {/* 해당 월의 일정 항목들 */}
                <div className="space-y-2">
                  {monthItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 group ${
                        item.completed ? 'opacity-60 bg-[#F5F5F5] border-[#DDD]' : ''
                      }`}
                      style={{
                        backgroundColor: item.completed ? '#F5F5F5' : item.color || '#FAF9F7',
                        borderColor: item.completed ? '#E0E0E0' : item.color || '#E5E1DA',
                        color: item.textColor || '#2D2926',
                      }}
                    >
                      {/* 체크박스 & 제목 */}
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <button
                          onClick={() => onToggleComplete(item.id)}
                          className="mt-0.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                          title={item.completed ? '미완료로 변경' : '완료로 표시'}
                        >
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-[#0F6856]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#2D2926]" />
                          )}
                        </button>

                        <span
                          className={`text-xs md:text-sm font-gothic font-medium leading-snug break-words ${
                            item.completed ? 'line-through text-[#888]' : ''
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      {/* 수정 & 삭제 버튼 */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 hover:bg-black/10 rounded-md transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteYearlyItem(item.id)}
                          className="p-1 hover:bg-black/10 rounded-md text-[#C94A4A] transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 빈 칸일 때 안내 박스 */}
                  {monthItems.length === 0 && (
                    <button
                      onClick={() => handleOpenAddForMonth(monthNum)}
                      className="w-full py-6 border border-dashed border-[#E5E1DA] hover:border-[#2D2926] rounded-xl text-center text-xs text-[#8C857E] hover:text-[#2D2926] hover:bg-[#FAF9F7]/50 transition-all flex flex-col items-center justify-center gap-1 group cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[#8C857E] group-hover:text-[#2D2926] transition-colors" />
                      <span>{monthName} 일정 입력하기</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 하단 미니 상태 */}
              <div className="mt-3 pt-2 border-t border-[#F0ECE1] text-[11px] text-[#8C857E] flex items-center justify-between">
                <span>{selectedYear}년 {monthName}</span>
                <span>{monthItems.filter((i) => i.completed).length}/{monthItems.length} 완료</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 일정 추가 / 수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveModal}
            className="bg-white rounded-2xl border border-[#E5E1DA] shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E1DA]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2D2926] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#FFD700]" />
                </div>
                <div>
                  <h3 className="font-serif-kr font-bold text-base text-[#1A1A1A]">
                    {editingItemId ? '연간 일정 수정' : '새 연간 일정 입력'}
                  </h3>
                  <p className="text-[11px] text-[#8C857E]">
                    {selectedYear}년도 월별 일정 (주간 계획표와 별도 보관)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF9F7] text-[#8C857E] hover:text-[#2D2926] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 일정 제목 입력 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2926] flex items-center gap-1">
                <span>일정 내용 / 목표</span>
                <span className="text-[#C94A4A]">*</span>
              </label>
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="예: 상반기 매출 점검, 자동차 보험 갱신, 헬스장 재등록 등"
                className="w-full px-3 py-2 text-xs md:text-sm font-gothic font-medium border border-[#E5E1DA] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D2926] bg-[#FAF9F7]"
                autoFocus
                required
              />
            </div>

            {/* 라벨 태그 색상 선택 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2926] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#2D2926]" />
                <span>라벨 스타일</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_TAG_COLORS.map((clr, idx) => (
                  <button
                    key={clr.name}
                    type="button"
                    onClick={() => setInputColorIndex(idx)}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all text-center truncate ${
                      inputColorIndex === idx ? 'ring-2 ring-[#2D2926] font-bold shadow-2xs' : 'opacity-80'
                    }`}
                    style={{
                      backgroundColor: clr.bg,
                      color: clr.text,
                      borderColor: clr.border,
                    }}
                  >
                    {clr.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 적용월 및 반복 설정 */}
            {!editingItemId && (
              <div className="space-y-2 pt-2 border-t border-[#E5E1DA]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2D2926] flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5 text-[#0F6856]" />
                    <span>적용 월 및 반복 설정</span>
                  </label>

                  {/* 매월 반복 체크박스 */}
                  <label className="flex items-center gap-1.5 text-xs text-[#0F6856] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllMonthsRepeat}
                      onChange={handleToggleAllMonthsRepeat}
                      className="rounded text-[#0F6856] focus:ring-[#0F6856]"
                    />
                    <span>매월 반복 (1~12월 전체)</span>
                  </label>
                </div>

                {/* 1월 ~ 12월 체크박스 그리드 */}
                <div className="grid grid-cols-6 gap-1.5 bg-[#FAF9F7] p-2.5 rounded-xl border border-[#E5E1DA]">
                  {MONTH_NAMES.map((mName, idx) => {
                    const mNum = idx + 1;
                    const isChecked = selectedMonths.includes(mNum);
                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => handleToggleMonthCheck(mNum)}
                        className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                          isChecked
                            ? 'bg-[#2D2926] text-white border-[#2D2926] shadow-2xs'
                            : 'bg-white text-[#8C857E] border-[#E5E1DA] hover:bg-[#F0ECE1]'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#8C857E]">
                  선택한 모든 월의 빈 칸에 이 일정이 동일하게 등록됩니다.
                </p>
              </div>
            )}

            {/* 모달 하단 버튼 */}
            <div className="pt-3 border-t border-[#E5E1DA] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#8C857E] hover:bg-[#FAF9F7] rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#2D2926] hover:bg-[#1A1A1A] text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
              >
                {editingItemId ? '수정 완료' : `${selectedMonths.length}개 월에 저장`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
