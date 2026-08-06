import React, { useState, useEffect } from 'react';
import { X, Phone, Lock, LogIn, UserPlus, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginWithPhone, registerWithPhone, formatPhoneNumber } from '../lib/authService';
import { UserProfile, ScheduleItem, DailyEvents, CategoryItem } from '../types';
import { DEFAULT_USER, INITIAL_CATEGORIES } from '../utils/constants';
import { generateSampleData } from '../utils/sampleData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (docId: string, phone: string) => void;
  currentData: {
    userProfile: UserProfile;
    items: ScheduleItem[];
    categories: CategoryItem[];
    dailyEvents: DailyEvents;
  };
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, currentData }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [autoLogin, setAutoLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setPassword('');
      setPasswordConfirm('');
      setErrorMsg('');
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhoneNumber(formatPhoneNumber(raw));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('올바른 전화번호(예: 010-1234-5678)를 입력해주세요.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('비밀번호는 6자리 이상 입력해주세요.');
      return;
    }

    if (mode === 'register' && password !== passwordConfirm) {
      setErrorMsg('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { docId } = await loginWithPhone(phoneNumber, password, autoLogin);
        onSuccess(docId, formatPhoneNumber(phoneNumber));
        onClose();
      } else {
        const freshDefaultData = {
          userProfile: DEFAULT_USER,
          items: generateSampleData(),
          categories: INITIAL_CATEGORIES,
          dailyEvents: {},
        };
        const { docId } = await registerWithPhone(phoneNumber, password, autoLogin, freshDefaultData);
        onSuccess(docId, formatPhoneNumber(phoneNumber));
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMsg('전화번호 또는 비밀번호가 올바르지 않습니다.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('이미 가입된 전화번호입니다. 상단 로그인 탭으로 전환해주세요.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('비밀번호는 6자리 이상으로 입력해주세요.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('전화번호 형식이 올바르지 않습니다.');
      } else if (err.message && typeof err.message === 'string' && !err.message.includes('Firebase:')) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(mode === 'register' ? '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-xs animate-fade-in no-print">
      <div className="lux-card w-full max-w-md p-6 bg-white rounded-3xl shadow-2xl border border-[#E5E1DA] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E1DA]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F0FAF7] border border-[#E5E1DA] flex items-center justify-center text-[#2D2926]">
              <Phone className="w-4 h-4 text-[#0F6856]" />
            </div>
            <div>
              <h2 className="text-base font-serif-kr font-medium text-[#2D2926]">
                {mode === 'login' ? '전화번호 로그인' : '전화번호 회원가입'}
              </h2>
              <p className="text-[11px] text-[#8C857E]">모바일 및 다른 PC와 실시간 동기화</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C857E] hover:text-[#2D2926] rounded-full hover:bg-[#FAF9F7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-[#FAF9F7] p-1 rounded-2xl my-4 border border-[#E5E1DA]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-[#2D2926] shadow-xs border border-[#E5E1DA]/60'
                : 'text-[#8C857E] hover:text-[#2D2926]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white text-[#2D2926] shadow-xs border border-[#E5E1DA]/60'
                : 'text-[#8C857E] hover:text-[#2D2926]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>신규 회원가입</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#FFF5F5] border border-[#FEB2B2] rounded-2xl flex items-start gap-2 text-xs text-[#C94A4A] animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Phone Input */}
          <div>
            <label className="block text-xs font-medium text-[#2D2926] mb-1.5">
              전화번호
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#8C857E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="010-1234-5678"
                maxLength={13}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F7] border border-[#E5E1DA] rounded-2xl text-sm text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 transition-all placeholder:text-[#A09890]"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-medium text-[#2D2926] mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C857E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="비밀번호 6자리 이상"
                minLength={6}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F7] border border-[#E5E1DA] rounded-2xl text-sm text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 transition-all placeholder:text-[#A09890]"
              />
            </div>
          </div>

          {/* Password Confirm (Register mode) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#2D2926] mb-1.5">
                비밀번호 확인
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C857E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => {
                    setPasswordConfirm(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="비밀번호 재입력"
                  minLength={6}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F7] border border-[#E5E1DA] rounded-2xl text-sm text-[#2D2926] focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 transition-all placeholder:text-[#A09890]"
                />
              </div>
            </div>
          )}

          {/* Auto Login Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#2D2926] select-none">
              <input
                type="checkbox"
                checked={autoLogin}
                onChange={(e) => setAutoLogin(e.target.checked)}
                className="w-4 h-4 rounded-md border-[#E5E1DA] text-[#2D2926] focus:ring-0 cursor-pointer accent-[#2D2926]"
              />
              <span className="font-medium">자동 로그인 유지</span>
            </label>
            <span className="text-[11px] text-[#8C857E]">
              {autoLogin ? '기기에 로그인 정보 저장' : '브라우저 닫을 때 로그아웃'}
            </span>
          </div>

          {/* Feature Notice */}
          <div className="p-3 bg-[#F0FAF7] border border-[#D0EAE2] rounded-2xl text-[11px] text-[#0F6856] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">
              로그인 후 링크 주소를 스마트폰이나 다른 PC에서 열면 <strong>모든 스케줄과 설정이 실시간으로 동기화</strong>됩니다.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#2D2926] hover:bg-[#1A1A1A] text-white rounded-2xl text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>로그인하기</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#A7F3D0]" />
                <span>회원가입 및 내 데이터 연결</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
