import React, { useState, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, User, Edit3, Camera, LayoutGrid, Columns, CalendarDays, Table } from 'lucide-react';
import { UserProfile } from '../types';
import { formatKoreanDateShort } from '../utils/dateUtils';

interface HeaderProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  twoWeekDays: Date[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToday: () => void;
  viewMode: 'twoWeekHorizontal' | 'splitCalendar' | 'yearlyCalendar' | 'longTermPlanner';
  onViewModeChange: (mode: 'twoWeekHorizontal' | 'splitCalendar' | 'yearlyCalendar' | 'longTermPlanner') => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  onUpdateProfile,
  twoWeekDays,
  onPrevWeek,
  onNextWeek,
  onGoToday,
  viewMode,
  onViewModeChange,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [mottoInput, setMottoInput] = useState(userProfile.motto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startDate = twoWeekDays[0];
  const endDate = twoWeekDays[twoWeekDays.length - 1];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateProfile({ ...userProfile, name: nameInput.trim(), motto: mottoInput.trim() });
      setIsEditingName(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onUpdateProfile({ ...userProfile, avatarUrl: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="lux-card px-4 py-3 md:px-5 md:py-3.5 mb-3.5 no-print">
      {/* 상단 프로필 & 타이틀 영역 */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E5E1DA] pb-2.5">
        <div className="flex items-center gap-3">
          {/* 프로필 사진 아바타 영역 */}
          <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="클릭하여 프로필 사진 변경">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt="Profile Avatar"
                className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border-2 border-[#2563EB] shadow-2xs group-hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#EBF5FF] border-2 border-[#2563EB]/40 flex items-center justify-center text-[#2563EB] shadow-2xs group-hover:bg-[#DBEAFE] transition-colors">
                <User className="w-5 h-5 text-[#2563EB]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          <div>
            {isEditingName ? (
              <form onSubmit={handleSaveProfile} className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-2 py-0.5 text-base font-serif-kr font-normal border border-[#E5E1DA] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB]/40 bg-white text-[#2D2926]"
                  placeholder="이름 입력"
                  autoFocus
                />
                <input
                  type="text"
                  value={mottoInput}
                  onChange={(e) => setMottoInput(e.target.value)}
                  className="px-2 py-0.5 text-xs border border-[#E5E1DA] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB]/40 bg-white text-[#2D2926]"
                  placeholder="다짐/좌우명 입력"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 text-xs bg-[#2563EB] text-white rounded-md hover:bg-[#1D4ED8] transition-colors"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-1.5 py-0.5 text-xs text-[#8C857E] hover:underline"
                >
                  취소
                </button>
              </form>
            ) : (
              <div className="group cursor-pointer flex items-center gap-1.5" onClick={() => setIsEditingName(true)}>
                <h1 className="text-xl md:text-2xl font-dajeong font-bold text-[#1E3A8A] tracking-wide">
                  {userProfile.name} 라이프 플래너
                </h1>
                <Edit3 className="w-3.5 h-3.5 text-[#8C857E] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <p className="text-xs text-[#8C857E] font-sans-kr flex items-center gap-1">
              <span>{userProfile.motto || '우아하고 가치 있는 삶을 위한 주간 기록'}</span>
            </p>
          </div>
        </div>

        {/* 우측 상단 공간 */}
        <div className="flex items-center gap-2" />
      </div>

      {/* 하단 주 단위 컨트롤 & 뷰 모드 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2.5">
        {/* 날짜 범위 및 주차 이동 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-[#E5E1DA] rounded-full p-0.5 shadow-2xs">
            <button
              onClick={onPrevWeek}
              className="px-2.5 py-1 rounded-full text-[#2D2926] hover:bg-[#F8F7F4] text-xs font-medium flex items-center gap-0.5 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>지난 주</span>
            </button>
            <button
              onClick={onGoToday}
              className="px-3 py-1 rounded-full bg-[#2563EB] text-white text-xs font-bold transition-colors mx-0.5 shadow-2xs hover:bg-[#1D4ED8]"
            >
              오늘
            </button>
            <button
              onClick={onNextWeek}
              className="px-2.5 py-1 rounded-full text-[#2D2926] hover:bg-[#F8F7F4] text-xs font-medium flex items-center gap-0.5 transition-colors"
            >
              <span>다음 주</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-3 py-1 bg-[#FAF9F7] rounded-full border border-[#E5E1DA] text-[#2D2926] text-xs font-serif-kr font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#8C857E]" />
            <span>
              {startDate ? formatKoreanDateShort(startDate) : ''} ~ {endDate ? formatKoreanDateShort(endDate) : ''}
            </span>
          </div>
        </div>

        {/* 뷰 모드 탭 (현재 위치를 나타내는 색상: 검정 -> 파랑 bg-[#2563EB]) */}
        <div className="flex items-center bg-white border border-[#E5E1DA] rounded-full p-0.5 self-start sm:self-auto shadow-2xs flex-wrap">
          <button
            onClick={() => onViewModeChange('twoWeekHorizontal')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'twoWeekHorizontal'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#8C857E] hover:text-[#2563EB] hover:bg-[#F0F6FF]'
            }`}
            title="2주치 일정을 한 화면에서 넓게 보기"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>2주 보기</span>
          </button>

          <button
            onClick={() => onViewModeChange('splitCalendar')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'splitCalendar'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#8C857E] hover:text-[#2563EB] hover:bg-[#F0F6FF]'
            }`}
            title="월별 달력과 주간 시간표를 함께 보기"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>주간 계획</span>
          </button>

          <button
            onClick={() => onViewModeChange('yearlyCalendar')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'yearlyCalendar'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#8C857E] hover:text-[#2563EB] hover:bg-[#F0F6FF]'
            }`}
            title="한 화면에서 12개월 연간 계획 보기"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>년간 계획</span>
          </button>

          <button
            onClick={() => onViewModeChange('longTermPlanner')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'longTermPlanner'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#8C857E] hover:text-[#2563EB] hover:bg-[#F0F6FF]'
            }`}
            title="10년 이상 장기 비전 계획 표 보기"
          >
            <Table className="w-3.5 h-3.5" />
            <span>장기 계획</span>
          </button>
        </div>
      </div>
    </header>
  );
};

