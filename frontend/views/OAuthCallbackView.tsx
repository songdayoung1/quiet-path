import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Compass } from 'lucide-react';
import { authApi } from '../api/authApi';
import { OnboardingStatus } from '../types';

type LoginResult = { token: string; onboardingStatus: OnboardingStatus };
const authCodeRequestCache = new Map<string, Promise<LoginResult>>();

const requestLoginOnce = (authCode: string) => {
  const cached = authCodeRequestCache.get(authCode);
  if (cached) {
    return cached;
  }

  const request = authApi.loginWithKakao(authCode).catch((error) => {
    // 실패한 요청은 재시도 가능하도록 캐시 제거
    authCodeRequestCache.delete(authCode);
    throw error;
  });

  authCodeRequestCache.set(authCode, request);
  return request;
};

interface OAuthCallbackViewProps {
  authCode: string;
  onSuccess: (status: OnboardingStatus, token: string) => void;
  onRetry: () => void;
}

type CallbackPhase = 'loading' | 'success' | 'error';
type SuccessKind = OnboardingStatus | null;

export const OAuthCallbackView: React.FC<OAuthCallbackViewProps> = ({ authCode, onSuccess, onRetry }) => {
  const [phase, setPhase] = useState<CallbackPhase>('loading');
  const [successKind, setSuccessKind] = useState<SuccessKind>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let successTimer: ReturnType<typeof setTimeout> | null = null;

    const processLogin = async () => {
      // 매번 진입 시 Loading 상태부터 시작
      setPhase('loading');
      setSuccessKind(null);
      setError(null);

      try {
        if (!authCode) {
          throw new Error('인가 코드가 없습니다. 다시 로그인해 주세요.');
        }

        const response = await requestLoginOnce(authCode);
        if (!mounted) return;

        // v2 디자인의 AUTHORIZED 화면을 짧게 노출한 뒤 다음 단계로 이동
        setSuccessKind(response.onboardingStatus);
        setPhase('success');
        successTimer = setTimeout(() => {
          if (mounted) onSuccess(response.onboardingStatus, response.token);
        }, 1200);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || '인증 과정에서 문제가 발생했습니다.');
        setPhase('error');
      }
    };

    processLogin();

    return () => {
      mounted = false;
      if (successTimer) clearTimeout(successTimer);
    };
  }, [authCode, onSuccess]);

  const isLoading = phase === 'loading';
  const isSuccess = phase === 'success';
  const isError = phase === 'error';
  const statusLabel = isLoading ? 'AUTHORIZING' : isError ? 'FAILED' : null;

  return (
    <div className="flex flex-col h-screen px-6 text-center animate-fade-in relative z-10 w-full">
      <style>
        {`
          @keyframes oauthRing {
            0% { transform: scale(0.4); opacity: 0.65; }
            100% { transform: scale(2.3); opacity: 0; }
          }
          .oauth-ring {
            animation: oauthRing 1.8s ease-out infinite;
          }
        `}
      </style>
      <div className="flex-1 flex flex-col justify-center items-center max-w-sm mx-auto w-full">
        <div className="relative w-[96px] h-[96px] mb-8 grid place-items-center">
          <span className="absolute inset-0 rounded-full bg-white/60 border border-white" />
          {isLoading && (
            <>
              <span className="oauth-ring absolute inset-[-3px] rounded-full border-2 border-point-200/80" />
              <span
                className="oauth-ring absolute inset-[-9px] rounded-full border-2 border-point-200/70"
                style={{ animationDelay: '0.45s' }}
              />
              <span
                className="oauth-ring absolute inset-[-15px] rounded-full border-2 border-point-100/80"
                style={{ animationDelay: '0.9s' }}
              />
              <span className="relative text-point-500">
                <Compass size={36} strokeWidth={1.5} className="animate-spin" style={{ animationDuration: '2s' }} />
              </span>
            </>
          )}
          {isSuccess && (
            <div className="relative w-[54px] h-[54px] rounded-full bg-point-100 grid place-items-center text-point-600">
              <Check size={28} strokeWidth={2.4} />
            </div>
          )}
          {isError && (
            <div className="relative w-[54px] h-[54px] rounded-full bg-rose-50 grid place-items-center text-rose-500">
              <AlertCircle size={28} strokeWidth={1.8} />
            </div>
          )}
        </div>

        {statusLabel && (
          <p className="text-[10px] font-bold tracking-[0.3em] text-point-500 mb-3">
            {statusLabel}
          </p>
        )}
        <h2 className="text-[19px] font-semibold tracking-tight text-mist-600 mb-2.5">
          {isLoading && '안전하게 들어가는 중이에요...'}
          {isSuccess && (successKind === 'EXISTING' ? '다시 돌아오셨군요.' : '환영합니다!')}
          {isError && '앗, 로그인에 실패했어요.'}
        </h2>
        <p className="text-[13px] text-mist-400 leading-relaxed whitespace-pre-line">
          {isLoading && '몇 초만 기다려주세요.'}
          {isSuccess && (successKind === 'EXISTING' ? '중단하셨던 곳으로 돌아갑니다.' : '당신의 조용한 여정을 시작할게요.')}
          {isError && (error || '네트워크 상태를 확인하시거나\n잠시 후 다시 시도해주세요.')}
        </p>

        {isError && (
            <div className="mt-8 w-full max-w-[300px] space-y-2.5">
               <button
                 onClick={onRetry}
                 className="w-full min-h-[52px] px-6 rounded-2xl text-[15px] font-bold tracking-tight text-white bg-gradient-to-br from-point-500 to-point-600 shadow-[0_8px_20px_-4px_rgba(139,92,246,0.35)] active:scale-[0.985] transition"
               >
                 다시 시도하기
               </button>
               <button
                 onClick={onRetry}
                 className="w-full min-h-[48px] px-5 rounded-xl text-[14px] font-semibold tracking-tight text-mist-500 bg-white/70 hover:bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] active:scale-[0.985] transition"
               >
                 다른 방법으로 로그인
               </button>
            </div>
        )}
      </div>
    </div>
  );
};
