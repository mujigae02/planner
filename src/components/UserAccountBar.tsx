import React from 'react';
import { User, RefreshCw, LogOut, Cloud } from 'lucide-react';

interface UserAccountBarProps {
  currentUserPhone: string | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onManualSync?: () => void;
}

export const UserAccountBar: React.FC<UserAccountBarProps> = ({
  currentUserPhone,
  isSyncing,
  lastSyncedAt,
  onOpenAuthModal,
  onLogout,
  onManualSync,
}) => {
  return (
    <div className="bg-[#FAF9F7] border-b border-[#E5E1DA] px-4 py-2.5 text-xs no-print">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left Status */}
        <div className="flex items-center gap-2">
          {currentUserPhone ? (
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F5E9] border border-[#C8E6C9] rounded-full font-semibold text-[#2E7D32]">
                <User className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>{currentUserPhone}</span>
              </span>

              <div className="flex items-center gap-1 text-[11px] text-[#555]">
                {isSyncing ? (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-[#2D2926] animate-spin" />
                    <span className="font-medium text-[#2D2926]">실시간 동기화 중...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onManualSync}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#A5D6A7] hover:bg-[#E8F5E9] text-[#2E7D32] font-semibold rounded-full transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="클릭 시 즉시 클라우드와 다시 동기화합니다"
                  >
                    <RefreshCw className="w-3 h-3 text-[#2E7D32]" />
                    <span>동기화 완료 (다시 동기화)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#666]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#DDD] rounded-md text-[11px] font-medium text-[#555]">
                비로그인 (단말기 임시 저장)
              </span>
              <span className="hidden sm:inline text-[11px] text-[#777]">
                구글, 네이버, 카카오, 애플 계정으로 로그인하면 스마트폰과 PC 간 데이터가 실시간 동기화됩니다.
              </span>
            </div>
          )}
        </div>

        {/* Right Action Button */}
        <div className="flex items-center gap-2">
          {currentUserPhone ? (
            <button
              onClick={() => onLogout()}
              className="px-3 py-1.5 rounded-lg border border-[#D32F2F] bg-white hover:bg-[#FFEBEE] text-[#D32F2F] transition-colors flex items-center gap-1.5 text-[11px] font-bold shadow-2xs cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 rounded-full bg-[#20487C] hover:bg-[#16355C] text-white transition-all flex items-center gap-1.5 text-[11px] font-semibold shadow-2xs cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>소셜 계정 로그인 / 동기화</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

