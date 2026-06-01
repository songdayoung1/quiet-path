import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface AccountConnectViewProps {
  onBack: () => void;
  onStartKakao: () => void;
  // Callback equivalent to redirecting for E2E dev
  onNavigateToMockKakao: (code: string) => void;
}

export const AccountConnectView: React.FC<AccountConnectViewProps> = ({ onBack, onStartKakao, onNavigateToMockKakao }) => {
  const [startError, setStartError] = React.useState<string | null>(null);

  const handleRealKakaoLogin = async () => {
    setStartError(null);
    try {
      await onStartKakao();
    } catch (error) {
      setStartError(error instanceof Error ? error.message : '카카오 로그인을 시작하지 못했어요.');
    }
  };

  const [devOpen, setDevOpen] = React.useState(false);

  return (
    <div className="flex flex-col h-screen animate-fade-in relative z-20">
      <header className="h-16 pt-5 px-4 grid grid-cols-[44px_1fr_44px] items-center">
        <button
          onClick={onBack}
          className="w-11 h-11 grid place-items-center rounded-full text-mist-500 hover:text-mist-700 hover:bg-white/60 transition-colors"
        >
          <ArrowLeft size={22} strokeWidth={1.7} />
        </button>
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck size={14} strokeWidth={1.5} className="text-point-500" />
          <span className="text-[11px] font-bold text-mist-500 tracking-[0.28em]">QUIET PATH</span>
        </div>
        <div className="w-11 h-11" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-[92px] h-[92px] rounded-full bg-white/60 border border-white grid place-items-center mb-8 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.2)]">
          <ShieldCheck size={36} strokeWidth={1.5} className="text-point-500" />
        </div>

        <p className="text-[10px] font-bold tracking-[0.3em] text-point-500 mb-4">SIGN IN</p>
        <h2 className="text-[24px] font-bold text-mist-600 mb-3 leading-snug">
          당신의 조용한 여정을<br/>고이 간직할게요.
        </h2>
        <p className="text-[14px] text-mist-400 leading-relaxed mb-12">
          로그인하시면 어떤 기기에서든<br/>기록을 이어가고 잃어버리지 않아요.
        </p>

        <div className="w-full max-w-[320px] space-y-3">
          <button
            onClick={handleRealKakaoLogin}
            className="w-full max-w-[300px] min-h-[52px] mx-auto rounded-2xl bg-[#FEE500] text-[#181600] text-[15px] font-bold tracking-tight shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:opacity-95 active:scale-[0.985] transition-all flex justify-center items-center gap-2.5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.77 1.86 5.2 4.67 6.59-.2.7-.73 2.55-.84 2.95-.13.49.18.49.38.36.16-.1 2.55-1.74 3.58-2.44.72.1 1.46.16 2.21.16 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
            </svg>
            <span>카카오로 시작하기</span>
          </button>

          {startError && (
            <div className="w-full rounded-2xl border border-rose-100 bg-rose-50/90 px-4 py-3 text-left">
              <p className="text-[12px] font-bold text-rose-500 mb-1">로그인을 시작하지 못했어요</p>
              <p className="text-[12px] leading-relaxed text-rose-400">{startError}</p>
              {import.meta.env.DEV && (
                <p className="text-[11px] leading-relaxed text-rose-400 mt-2">
                  로컬 개발 중이면 아래 `DEV MOCK`으로 흐름을 먼저 확인할 수 있어요.
                </p>
              )}
            </div>
          )}

          <div className="pt-8">
            <button
              onClick={() => setDevOpen((prev) => !prev)}
              className="text-[10px] font-bold tracking-[0.18em] text-mist-400 hover:text-mist-500"
            >
              · DEV MOCK {devOpen ? '▲' : '▼'}
            </button>

            {devOpen && (
              <div className="mt-2 p-3 rounded-xl bg-white/70 border border-white text-left animate-fade-in">
                <p className="text-[10px] font-bold text-mist-500 tracking-[0.14em] mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-point-400 inline-block animate-pulse" />
                  E2E MOCK (import.meta.env.DEV)
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => onNavigateToMockKakao('new_user')}
                    className="py-1.5 rounded-lg text-[11px] font-bold bg-white text-mist-600 border border-mist-100 hover:bg-mist-50"
                  >
                    신규
                  </button>
                  <button
                    onClick={() => onNavigateToMockKakao('existing_user')}
                    className="py-1.5 rounded-lg text-[11px] font-bold bg-white text-mist-600 border border-mist-100 hover:bg-mist-50"
                  >
                    기존
                  </button>
                  <button
                    onClick={() => onNavigateToMockKakao('error_user')}
                    className="py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100/80"
                  >
                    에러
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="px-7 pb-8 text-[10px] text-mist-400 text-center leading-relaxed">
        로그인 시 <u className="decoration-mist-300 underline-offset-2">이용약관</u> 및 <u className="decoration-mist-300 underline-offset-2">개인정보 처리방침</u>에 동의한 것으로 간주됩니다.
      </p>
    </div>
  );
};
