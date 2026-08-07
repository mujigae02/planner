import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { loginWithSocial } from '../lib/authService';
import { UserProfile, ScheduleItem, DailyEvents, CategoryItem } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (docId: string, accountName: string) => void;
  currentData: {
    userProfile: UserProfile;
    items: ScheduleItem[];
    categories: CategoryItem[];
    dailyEvents: DailyEvents;
  };
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, currentData }) => {
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'naver' | 'kakao' | 'apple' | null>(null);
  const [accountInput, setAccountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSocialSelect = async (provider: 'google' | 'naver' | 'kakao' | 'apple') => {
    setErrorMsg('');
    if (provider === 'naver' || provider === 'kakao') {
      setSelectedProvider(provider);
      setAccountInput('');
      return;
    }

    // Direct Google or Apple auth flow
    setLoading(true);
    try {
      const res = await loginWithSocial(provider, undefined, currentData);
      onSuccess(res.docId, res.accountName);
      onClose();
    } catch (err: any) {
      console.error('Social Auth Error:', err);
      setErrorMsg('로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await loginWithSocial(selectedProvider, accountInput.trim() || undefined, currentData);
      onSuccess(res.docId, res.accountName);
      onClose();
    } catch (err: any) {
      console.error('Custom Social Auth Error:', err);
      setErrorMsg('계정 연결 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in no-print">
      <div className="w-full max-w-sm p-6 bg-white rounded-3xl shadow-2xl border border-[#E5E1DA] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E1DA]">
          <div>
            <h2 className="text-base font-serif-kr font-bold text-[#2D2926]">
              {selectedProvider ? `${selectedProvider === 'naver' ? '네이버' : '카카오'} 계정 연동` : '소셜 계정 로그인'}
            </h2>
            <p className="text-[11px] text-[#8C857E]">스마트폰과 PC 간 실시간 자동 동기화</p>
          </div>
          <button
            onClick={() => {
              if (selectedProvider) {
                setSelectedProvider(null);
              } else {
                onClose();
              }
            }}
            className="p-1.5 text-[#8C857E] hover:text-[#2D2926] rounded-full hover:bg-[#FAF9F7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-[#FFF5F5] border border-[#FEB2B2] rounded-2xl flex items-start gap-2 text-xs text-[#C94A4A]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body: Step 1 (Social Buttons) */}
        {!selectedProvider ? (
          <div className="py-4 space-y-2.5">
            {/* Google */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialSelect('google')}
              className="w-full py-3 px-4 bg-white hover:bg-[#F8F9FA] active:bg-[#F1F3F4] text-[#3C4043] border border-[#DADCE0] rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google 계정으로 계속하기</span>
            </button>

            {/* Kakao */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialSelect('kakao')}
              className="w-full py-3 px-4 bg-[#FEE500] hover:bg-[#F7DC00] active:bg-[#EED300] text-[#191919] rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M12 3C6.477 3 2 6.477 2 10.773c0 2.784 1.874 5.223 4.701 6.643-.205.753-.746 2.731-.855 3.156-.135.531.195.524.41.381.168-.112 2.684-1.82 3.771-2.556.634.093 1.295.143 1.973.143 5.523 0 10-3.477 10-7.773S17.523 3 12 3z" />
              </svg>
              <span>카카오 계정으로 계속하기</span>
            </button>

            {/* Naver */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialSelect('naver')}
              className="w-full py-3 px-4 bg-[#03CF5D] hover:bg-[#02B852] active:bg-[#02A349] text-white rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
              </svg>
              <span>네이버 계정으로 계속하기</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialSelect('apple')}
              className="w-full py-3 px-4 bg-[#000000] hover:bg-[#1A1A1A] active:bg-[#2A2A2A] text-white rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.62-.75 1.04-1.8 1.04-2.82 0-.14-.01-.28-.04-.42-1 .04-2.2.67-2.92 1.51-.58.67-1.09 1.74-1.09 2.78 0 .15.02.3.04.41 1.13.09 2.26-.58 2.97-1.46z" />
              </svg>
              <span>Apple 계정으로 계속하기</span>
            </button>

            {/* Sync Notice Banner */}
            <div className="mt-4 p-3 bg-[#F0FAF7] border border-[#D0EAE2] rounded-2xl text-[11px] text-[#0F6856] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-snug">
                로그인 후 모바일 기기나 다른 PC에서 접속하면 <strong>모든 스케줄, 연간 및 장기 계획이 자동으로 연결</strong>됩니다.
              </p>
            </div>
          </div>
        ) : (
          /* Step 2 (Optional Custom ID/Email for Kakao/Naver) */
          <form onSubmit={handleCustomAccountSubmit} className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2D2926] mb-1.5">
                {selectedProvider === 'naver' ? '네이버' : '카카오'} 계정 이메일 또는 ID (선택)
              </label>
              <input
                type="text"
                value={accountInput}
                onChange={(e) => setAccountInput(e.target.value)}
                placeholder="예: myaccount@naver.com 또는 사용자ID"
                className="w-full px-4 py-2.5 bg-[#FAF9F7] border border-[#E5E1DA] rounded-2xl text-xs text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 placeholder:text-[#A09890]"
                autoFocus
              />
              <p className="text-[10px] text-[#8C857E] mt-1">
                미입력 시 기본 대표 {selectedProvider === 'naver' ? '네이버' : '카카오'} 계정으로 즉시 연동됩니다.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="flex-1 py-2.5 border border-[#E5E1DA] bg-white text-[#2D2926] rounded-2xl text-xs font-bold hover:bg-[#FAF9F7] transition-all"
              >
                이전으로
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-2.5 text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                  selectedProvider === 'naver'
                    ? 'bg-[#03CF5D] text-white hover:bg-[#02B852]'
                    : 'bg-[#FEE500] text-[#191919] hover:bg-[#F7DC00]'
                }`}
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>계정 연결하기</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

