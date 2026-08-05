import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Minus,
  Trash2,
  Info,
  CheckCircle2,
  Table,
  Palette,
} from 'lucide-react';
import { LongTermPlannerData } from '../types';

interface LongTermPlannerViewProps {
  data?: LongTermPlannerData;
  onChangeData: (newData: LongTermPlannerData) => void;
}

const DEFAULT_COLUMNS = [
  '커리어 / 업무',
  '자산 / 재정',
  '건강 / 운동',
  '가족 / 관계',
  '개인 / 자기계발',
];

const DEFAULT_START_YEAR = 2026;
const DEFAULT_YEAR_COUNT = 10;

// 선택 가능한 글자색 옵션 목록
const TEXT_COLOR_OPTIONS = [
  { id: 'default', name: '기본 검정', color: '#2D2926' },
  { id: 'blue', name: '파랑', color: '#2563EB' },
  { id: 'red', name: '빨강', color: '#C94A4A' },
  { id: 'green', name: '초록', color: '#0F6856' },
  { id: 'purple', name: '보라', color: '#7C3AED' },
  { id: 'orange', name: '주황', color: '#EA580C' },
];

export const LongTermPlannerView: React.FC<LongTermPlannerViewProps> = ({
  data,
  onChangeData,
}) => {
  // 현재 데이터 또는 기본값
  const startYear = data?.startYear ?? DEFAULT_START_YEAR;
  const yearCount = data?.yearCount ?? DEFAULT_YEAR_COUNT;
  const columns = data?.columns && data.columns.length > 0 ? data.columns : DEFAULT_COLUMNS;
  const cells = data?.cells ?? {};
  const cellColors = data?.cellColors ?? {};

  // 컬럼 제목 수정 모드 state
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);
  const [colTitleInput, setColTitleInput] = useState('');

  // 현재 포커스된 셀 키
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);

  // 연도 배열 생성
  const yearList = Array.from({ length: yearCount }, (_, i) => startYear + i);

  // 셀 내용 변경
  const handleCellChange = (year: number, colIdx: number, value: string) => {
    const key = `${year}_${colIdx}`;
    const newCells = { ...cells, [key]: value };
    onChangeData({
      startYear,
      yearCount,
      columns,
      cells: newCells,
      cellColors,
    });
  };

  // 셀 글자색 변경
  const handleCellColorChange = (year: number, colIdx: number, color: string) => {
    const key = `${year}_${colIdx}`;
    const newCellColors = { ...cellColors, [key]: color };
    onChangeData({
      startYear,
      yearCount,
      columns,
      cells,
      cellColors: newCellColors,
    });
  };

  // 컬럼 제목 수정 시작
  const handleStartEditCol = (colIdx: number) => {
    setEditingColIdx(colIdx);
    setColTitleInput(columns[colIdx] || '');
  };

  // 컬럼 제목 수정 저장
  const handleSaveColTitle = (colIdx: number) => {
    if (!colTitleInput.trim()) {
      setEditingColIdx(null);
      return;
    }
    const newCols = [...columns];
    newCols[colIdx] = colTitleInput.trim();
    onChangeData({
      startYear,
      yearCount,
      columns: newCols,
      cells,
    });
    setEditingColIdx(null);
  };

  // 컬럼 추가 (최대 8개)
  const handleAddColumn = () => {
    if (columns.length >= 8) return;
    const newCols = [...columns, `목표 ${columns.length + 1}`];
    onChangeData({
      startYear,
      yearCount,
      columns: newCols,
      cells,
    });
  };

  // 컬럼 삭제 (최소 1개)
  const handleDeleteColumn = (colIdx: number) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((_, idx) => idx !== colIdx);

    // 삭제된 컬럼 이후의 인덱스 재정렬
    const newCells: Record<string, string> = {};
    (Object.entries(cells) as [string, string][]).forEach(([key, val]) => {
      const [yStr, cStr] = key.split('_');
      const c = parseInt(cStr, 10);
      if (c < colIdx) {
        newCells[key] = val;
      } else if (c > colIdx) {
        newCells[`${yStr}_${c - 1}`] = val;
      }
    });

    onChangeData({
      startYear,
      yearCount,
      columns: newCols,
      cells: newCells,
    });
  };

  // 연도 수 변경
  const handleYearCountChange = (count: number) => {
    onChangeData({
      startYear,
      yearCount: count,
      columns,
      cells,
    });
  };

  // 시작 연도 변경
  const handleStartYearChange = (sYear: number) => {
    onChangeData({
      startYear: sYear,
      yearCount,
      columns,
      cells,
    });
  };

  return (
    <div className="space-y-4 no-print">
      {/* 상단 옵션 패널 (다른 옵션 화면들과 통일된 헤더 스타일) */}
      <div className="lux-card p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Table className="w-5 h-5 md:w-6 md:h-6 text-[#2563EB] shrink-0" />
          <div>
            <h2 className="text-lg md:text-xl font-serif-kr font-bold text-[#1A1A1A]">
              장기 계획
            </h2>
            <p className="text-xs text-[#8C857E] font-sans-kr mt-0.5">
              10년 이상의 장기 비전과 영역별 목표를 표로 한눈에 정리해보세요.
            </p>
          </div>
        </div>

        {/* 대화형 조작 컨트롤 */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          {/* 셀 글자색 선택 툴바 (깔끔하게 상단 레벨로 이동) */}
          <div className="flex items-center gap-2 bg-[#FAF9F7] px-3 py-1.5 rounded-xl border border-[#E5E1DA] text-xs">
            <div className="flex items-center gap-1 font-bold text-[#2D2926]">
              <Palette className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>글자색:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {TEXT_COLOR_OPTIONS.map((opt) => {
                const activeColor = activeCellKey ? cellColors[activeCellKey] || '#2D2926' : null;
                const isSelected = activeColor === opt.color;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // 포커스 해제 방지
                      if (activeCellKey) {
                        const [y, c] = activeCellKey.split('_').map(Number);
                        handleCellColorChange(y, c, opt.color);
                      }
                    }}
                    className={`w-4 h-4 rounded-full transition-all transform hover:scale-125 ${
                      isSelected
                        ? 'ring-2 ring-[#2563EB] ring-offset-1 scale-110 shadow-2xs'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.color }}
                    title={
                      activeCellKey
                        ? `선택된 셀 글자색을 ${opt.name}(으)로 변경`
                        : '셀을 클릭한 후 원하는 글자색을 누르세요'
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* 시작 연도 설정 */}
          <div className="flex items-center gap-1.5 bg-[#FAF9F7] px-3 py-1.5 rounded-xl border border-[#E5E1DA] text-xs">
            <span className="font-bold text-[#2D2926]">시작:</span>
            <select
              value={startYear}
              onChange={(e) => handleStartYearChange(parseInt(e.target.value, 10))}
              className="bg-white border border-[#E5E1DA] rounded-lg px-2 py-1 font-semibold text-[#2D2926] focus:outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </div>

          {/* 기간 설정 버튼 그룹 (현재 위치 파란색 #2563EB) */}
          <div className="flex items-center bg-white border border-[#E5E1DA] rounded-xl p-0.5 shadow-2xs text-xs font-semibold">
            {[10, 15, 20, 30].map((cnt) => (
              <button
                key={cnt}
                onClick={() => handleYearCountChange(cnt)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  yearCount === cnt
                    ? 'bg-[#2563EB] text-white shadow-2xs font-bold'
                    : 'text-[#8C857E] hover:text-[#2563EB] hover:bg-[#F0F6FF]'
                }`}
              >
                {cnt}년
              </button>
            ))}
          </div>

          {/* 열 추가 */}
          <button
            onClick={handleAddColumn}
            disabled={columns.length >= 8}
            className="px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#2563EB] hover:text-white border border-[#E5E1DA] text-[#2D2926] rounded-xl text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-40"
            title="목표 분야 열 추가"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>열 추가 ({columns.length}/8)</span>
          </button>

          {/* 열 삭제 */}
          <button
            onClick={() => handleDeleteColumn(columns.length - 1)}
            disabled={columns.length <= 1}
            className="px-3 py-1.5 bg-[#FAF9F7] hover:bg-[#FFF1F2] hover:text-[#C94A4A] border border-[#E5E1DA] text-[#2D2926] rounded-xl text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-40"
            title="마지막 열 삭제"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>열 삭제</span>
          </button>
        </div>
      </div>

      {/* 안내 패널 */}
      <div className="p-3 bg-[#FAF9F7] border border-[#E5E1DA] rounded-xl flex items-center justify-between gap-2 text-xs text-[#555]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>
            <strong>팁:</strong> 각 열 제목(컬럼명)을 클릭하여 분야명을 수정할 수 있으며, 입력 셀을 선택(클릭)한 후 상단 툴바의 <strong>글자색(검정, 파랑, 빨강, 초록, 보라, 주황)</strong> 버튼을 누르면 깔끔하게 지정됩니다.
          </span>
        </div>
      </div>

      {/* 표 형식의 장기 플래너 카드 (주간계획표와 동일한 테마, 폰트 및 스타일 통일) */}
      <div className="lux-card overflow-hidden bg-white border border-[#E5E1DA] shadow-xs rounded-2xl">
        {/* 스크롤 영역: max-h 지정을 통해 수직 스크롤 시 sticky thead가 상단에 고정됨 */}
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh] custom-scrollbar relative">
          <table className="w-full border-collapse text-left min-w-[700px]">
            {/* 상단 고정 헤더 (주간계획표와 동일한 #FAF9F7 베이지 헤더) */}
            <thead className="sticky top-0 z-20 bg-[#FAF9F7] border-b border-[#E5E1DA] shadow-xs">
              <tr className="border-b border-[#E5E1DA]">
                {/* 1번째 열: 년도 (주간계획표 시간 헤더 스타일) */}
                <th className="w-28 md:w-36 p-3 md:p-3.5 bg-[#FAF9F7] text-[#2D2926] font-sans-kr font-bold text-xs md:text-sm tracking-wider text-center border-r border-[#E5E1DA] sticky left-0 z-30">
                  <div className="flex items-center justify-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#2563EB]" />
                    <span>년도</span>
                  </div>
                </th>

                {/* 나머지 열들: 분야 헤더 (고딕 폰트 적용) */}
                {columns.map((colName, colIdx) => (
                  <th
                    key={colIdx}
                    className="p-3 md:p-3.5 bg-[#FAF9F7] text-[#2D2926] font-sans-kr font-bold text-xs md:text-sm border-r border-[#E5E1DA] last:border-r-0 min-w-[150px] group transition-colors relative"
                  >
                    {editingColIdx === colIdx ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={colTitleInput}
                          onChange={(e) => setColTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveColTitle(colIdx);
                            if (e.key === 'Escape') setEditingColIdx(null);
                          }}
                          className="w-full px-2 py-1 text-xs bg-white border border-[#2563EB] text-[#2D2926] rounded-md font-bold focus:outline-none"
                          autoFocus
                          onBlur={() => handleSaveColTitle(colIdx)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <span
                          onClick={() => handleStartEditCol(colIdx)}
                          className="cursor-pointer hover:text-[#2563EB] hover:underline decoration-dotted underline-offset-4 flex-1 truncate"
                          title="클릭하여 열 이름 수정"
                        >
                          {colName}
                        </span>

                        {/* 열 삭제 버튼 (Hover 시 노출) */}
                        {columns.length > 1 && (
                          <button
                            onClick={() => handleDeleteColumn(colIdx)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#F0ECE1] text-[#C94A4A] rounded-md transition-opacity"
                            title="이 열 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {/* 표 본문 행들 (행 높이 h-16 고정) */}
            <tbody className="divide-y divide-[#E5E1DA]">
              {yearList.map((year, yearIdx) => {
                const isEven = yearIdx % 2 === 0;
                return (
                  <tr
                    key={year}
                    className={`h-16 transition-colors hover:bg-[#FAF9F7] ${
                      isEven ? 'bg-white' : 'bg-[#FAF9F7]/40'
                    }`}
                  >
                    {/* 년도 셀 (좌측 sticky 고정) */}
                    <td className="w-28 md:w-36 p-2 font-serif-kr font-bold text-xs md:text-sm text-[#2D2926] bg-[#FAF9F7] border-r border-[#E5E1DA] text-center sticky left-0 z-10 shadow-xs h-16">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[#2D2926] font-bold tracking-tight">
                          {year}년
                        </span>
                        <span className="text-[10px] text-[#8C857E] font-sans font-normal mt-0.5">
                          {yearIdx === 0 ? 'Start' : `+${yearIdx}년`}
                        </span>
                      </div>
                    </td>

                    {/* 각 카테고리 분야 셀 (높이 h-16 고정, resize-none) */}
                    {columns.map((_, colIdx) => {
                      const cellKey = `${year}_${colIdx}`;
                      const cellValue = cells[cellKey] || '';
                      const cellColor = cellColors[cellKey] || '#2D2926';

                      return (
                        <td
                          key={colIdx}
                          className="p-1.5 border-r border-[#E5E1DA] last:border-r-0 align-top relative h-16"
                        >
                          <textarea
                            value={cellValue}
                            onChange={(e) => handleCellChange(year, colIdx, e.target.value)}
                            onFocus={() => setActiveCellKey(cellKey)}
                            onBlur={() => {
                              // 약간의 지연 후 activeCellKey 초기화 (상단 버튼 클릭 이벤트 처리 보장)
                              setTimeout(() => setActiveCellKey(null), 200);
                            }}
                            placeholder={`${year}년 ${columns[colIdx]}...`}
                            rows={2}
                            className="w-full h-full min-h-[50px] max-h-[50px] p-1.5 text-xs md:text-sm font-gothic font-medium bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none transition-all resize-none leading-relaxed placeholder:text-[#BBB4A9] overflow-y-auto"
                            style={{
                              color: cellColor,
                              backgroundImage:
                                'linear-gradient(transparent, transparent 23px, #E5E1DA 24px)',
                              backgroundSize: '100% 24px',
                              lineHeight: '24px',
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 표 하단 요약 바 */}
        <div className="p-3 bg-[#FAF9F7] border-t border-[#E5E1DA] flex items-center justify-between text-xs text-[#555] font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
            <span>
              총 <strong>{yearCount}개 년도</strong> ({startYear}년 ~ {startYear + yearCount - 1}년) 장기 계획이 기록 중입니다.
            </span>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] text-xs font-bold transition-all shadow-2xs"
          >
            🖨️ 인쇄 / PDF 저장
          </button>
        </div>
      </div>
    </div>
  );
};
