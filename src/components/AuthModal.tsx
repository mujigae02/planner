import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginWithGoogleSocial } from '../lib/authService';
import { UserProfile, ScheduleItem, DailyEvents, CategoryItem } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    docId: string,
    accountName: string,
    userInfo?: { name: string; email: string; avatarUrl: string }
  ) => void;
  currentData: {
    userProfile: UserProfile;
    items: ScheduleItem[];
    categories: CategoryItem[];
    dailyEvents: DailyEvents;
  };
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentData,
}) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const parseAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/popup-closed-by-user':
        return '로그인 팝업 창이 닫혔습니다. 다시 시도해 주세요.';
      case 'auth/popup-blocked':
        return '브라우저 팝업이 차단되었습니다. 주소창 주변에서 팝업 허용 후 다시 시도해 주세요.';
      case 'auth/cancelled-popup-request':
        return '이전 로그인 진행 중입니다. 잠시 후 다시 눌러주세요.';
      case 'auth/unauthorized-domain':
        return 'Firebase Console > Authentication > Settings > Authorized domains 에 현재 도메인이 등록되어 있지 않습니다.';
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid-please-pass-a-valid-api-key':
        return 'Firebase API 키가 유효하지 않거나 설정되지 않았습니다. .env 설정을 확인해 주세요.';
      case 'auth/operation-not-allowed':
        return 'Firebase Console에서 Google 인증 제공업체가 활성화되지 않았습니다.';
      case 'auth/network-request-failed':
        return '네트워크 연결 장애가 발생했습니다. 인터넷 연결을 확인해주세요.';
      default:
        return err?.message || 'Google 로그인 진행 중 오류가 발생했습니다.';
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await loginWithGoogleSocial(currentData);
      onSuccess(res.docId, res.accountName, res.userInfo);
      onClose();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in no-print">
      <div className="w-full max-w-sm p-6 bg-white rounded-3xl shadow-2xl border border-[#E5E1DA] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E1DA]">
          <div>
            <h2 className="text-base font-serif-kr font-bold text-[#2D2926]">
              Google 계정 로그인
            </h2>
            <p className="text-[11px] text-[#8C857E]">스마트폰과 PC 간 데이터 실시간 동기화</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-[#8C857E] hover:text-[#2D2926] rounded-full hover:bg-[#FAF9F7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mt-3 p-3 bg-[#FFF5F5] border border-[#FEB2B2] rounded-2xl flex items-start gap-2 text-xs text-[#C94A4A] leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="py-5 space-y-3">
          {/* Real Google Auth Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-white hover:bg-[#F8F9FA] active:bg-[#F1F3F4] text-[#3C4043] border border-[#DADCE0] rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#4285F4] border-t-transparent" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>{loading ? 'Google 인증 진행 중...' : 'Google 계정으로 계속하기'}</span>
          </button>

          {/* Sync & Security Information */}
          <div className="p-3.5 bg-[#F0FAF7] border border-[#D0EAE2] rounded-2xl text-[11px] text-[#0F6856] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#0F6856]" />
            <div className="space-y-1">
              <p className="font-semibold text-[#0B4F41]">안전한 Firebase 클라우드 연동</p>
              <p className="leading-snug text-[10.5px] text-[#137A65]">
                Google 로그인 시 주간 스케줄, 카테고리, 연간 목표 및 장기 플래너가 모든 기기에서 실시간 동기화됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


