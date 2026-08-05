import React from 'react';
import { Phone, RefreshCw, LogOut, Smartphone, Check, Cloud } from 'lucide-react';
import { logoutUser } from '../lib/authService';

interface UserAccountBarProps {
  currentUserPhone: string | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const UserAccountBar: React.FC<UserAccountBarProps> = ({
  currentUserPhone,
  isSyncing,
  lastSyncedAt,
  onOpenAuthModal,
  onLogout,
}) => {
  // Format masked phone number for privacy display
  const getMaskedPhone = (phone: string) => {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length >= 10) {
      return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
    }
    return phone;
  };

  return (
    <div className="bg-[#FAF9F7] border-b border-[#E5E1DA] px-4 py-2.5 text-xs no-print">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left Status */}
        <div className="flex items-center gap-2">
          {currentUserPhone ? (
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F5E9] border border-[#C8E6C9] rounded-full font-semibold text-[#2E7D32]">
                <Smartphone className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>{getMaskedPhone(currentUserPhone)} (로그인됨)</span>
              </span>

              <div className="flex items-center gap-1 text-[11px] text-[#555]">
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-[#2D2926] animate-spin" />
                    <span className="font-medium text-[#2D2926]">실시간 동기화 중...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-[#2E7D32]" />
                    <span className="text-[#2E7D32] font-medium">클라우드 동기화 완료</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#666]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#DDD] rounded-md text-[11px] font-medium text-[#555]">
                비로그인 (단말기 임시 저장)
              </span>
              <span className="hidden sm:inline text-[11px] text-[#777]">
                전화번호로 로그인하면 모바일, 다른 PC에서도 내 플래너를 불러올 수 있습니다.
              </span>
            </div>
          )}
        </div>

        {/* Right Action Button */}
        <div className="flex items-center gap-2">
          {currentUserPhone ? (
            <button
              onClick={() => onLogout()}
              className="px-3 py-1.5 rounded-lg border border-[#D32F2F] bg-white hover:bg-[#FFEBEE] text-[#D32F2F] transition-colors flex items-center gap-1.5 text-[11px] font-bold shadow-2xs"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 rounded-full bg-[#2D2926] hover:bg-[#1A1A1A] text-white transition-all flex items-center gap-1.5 text-[11px] font-semibold shadow-2xs cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>전화번호 로그인 / 회원가입</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
