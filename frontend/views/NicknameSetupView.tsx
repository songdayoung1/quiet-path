import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { WaterDropCharacter } from '../components/WaterDropCharacter';

interface NicknameSetupViewProps {
  onComplete: (nickname: string) => void | Promise<void>;
}

export const NICKNAME_STEMS = [
  '고요한',
  '잔잔한',
  '맑은',
  '느린',
  '따뜻한',
  '은은한',
];

const NICKNAME_SUFFIXES = [
  '물결',
  '바람',
  '숲길',
  '새벽',
  '호수',
  '달빛',
  '별빛',
  '노을',
];

const NICKNAME_REGEX = /^[A-Za-z0-9가-힣]+$/;
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 12;

export const generateNickname = () => {
  const stem = NICKNAME_STEMS[Math.floor(Math.random() * NICKNAME_STEMS.length)];
  const suffix = NICKNAME_SUFFIXES[Math.floor(Math.random() * NICKNAME_SUFFIXES.length)];
  const maybeDigits = Math.random() < 0.45 ? String(Math.floor(Math.random() * 100)).padStart(2, '0') : '';
  return `${stem}${suffix}${maybeDigits}`.slice(0, NICKNAME_MAX_LENGTH);
};

const validateNickname = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) return '닉네임을 입력해주세요.';
  if (normalized.length < NICKNAME_MIN_LENGTH || normalized.length > NICKNAME_MAX_LENGTH) {
    return '2~12자 범위로 입력해주세요.';
  }
  if (!NICKNAME_REGEX.test(normalized)) {
    return '한글·영문·숫자만 사용할 수 있어요.';
  }
  return '';
};

export const NicknameSetupView: React.FC<NicknameSetupViewProps> = ({ onComplete }) => {
  const [nickname, setNickname] = useState(generateNickname);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'checking' | 'available' | 'invalid'>('checking');
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    const message = validateNickname(nickname);
    if (message) {
      setValidationMessage(message);
      setStatus('invalid');
      return;
    }

    setValidationMessage('');
    setStatus('checking');
    const timer = setTimeout(() => setStatus('available'), 250);
    return () => clearTimeout(timer);
  }, [nickname]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setNickname(generateNickname());
    window.setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleComplete = async () => {
    if (status !== 'available' || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onComplete(nickname.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusInfo = {
    checking: {
      label: '형식 확인 중...',
      color: 'text-mist-400',
      icon: null,
    },
    available: {
      label: '사용 가능한 닉네임이에요.',
      color: 'text-emerald-500',
      icon: <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-500" />,
    },
    invalid: {
      label: validationMessage || '닉네임 형식을 다시 확인해주세요.',
      color: 'text-rose-500',
      icon: <AlertCircle size={14} strokeWidth={2} className="text-rose-500" />,
    },
  }[status];

  return (
    <div className="flex flex-col h-screen px-6 animate-fade-in z-20 relative">
      <header className="h-16 pt-5 px-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} strokeWidth={1.5} className="text-point-500" />
          <span className="text-[11px] font-bold text-mist-500 tracking-[0.28em]">QUIET PATH</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="px-3 py-1 rounded-full bg-point-50 border border-point-100 text-[10px] font-bold text-point-600 tracking-[0.12em]">
            STEP 1 / 2
          </span>
          <WaterDropCharacter mood="SPARKLE" size={34} animate={false} />
        </div>

        <h2 className="text-[28px] font-bold text-mist-600 mb-3 leading-[1.3] tracking-[-0.01em]">
          조용한 여정에 오신 것을<br/>환영합니다.
        </h2>
        <p className="text-[15px] text-mist-400 leading-relaxed mb-8">
          이곳에서는 어떤 이름으로 부를까요?<br />
          <span className="text-mist-500 font-medium">2~12자, 한글·영문·숫자</span>로 자유롭게 설정해요.
        </p>

        <div className="relative mb-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="고요한물결"
            maxLength={NICKNAME_MAX_LENGTH}
            className={`w-full bg-white/85 border rounded-[18px] px-5 py-4 text-lg font-bold text-mist-600 focus:outline-none focus:ring-4 transition-all shadow-sm pr-14 ${
              status === 'invalid'
                ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-100/60'
                : 'border-mist-200 focus:border-point-400 focus:ring-point-100/50'
            }`}
          />
          <button
             onClick={handleRefresh}
             className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-mist-300 hover:text-point-400 transition-colors"
             aria-label="닉네임 새로고침"
          >
             <RefreshCcw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className={`flex items-center gap-1.5 min-h-[20px] mb-4 ml-1 ${statusInfo.color}`}>
          {statusInfo.icon}
          <span className="text-[11px] font-semibold">{statusInfo.label}</span>
        </div>

        <div className="p-4 bg-white/65 border border-mist-100 rounded-[14px] mb-10">
          <p className="text-[10px] font-bold text-mist-400 tracking-[0.14em] mb-2">GUIDELINE</p>
                <p className="text-[11px] text-mist-500 leading-6">· 설정에서 언제든 닉네임 변경 가능</p>
                <p className="text-[11px] text-mist-500 leading-6">· 커뮤니티 표시 이름으로 사용됨</p>
                <p className="text-[11px] text-mist-500 leading-6">· 형식이 맞으면 다음 단계로 이동 가능</p>
              </div>
      </div>

      <div className="pb-8">
        <button
          onClick={handleComplete}
          disabled={status !== 'available' || isSubmitting}
          className="w-full min-h-[54px] px-6 rounded-2xl text-[15px] font-bold tracking-tight text-white bg-gradient-to-br from-point-500 to-point-600 shadow-[0_8px_20px_-4px_rgba(139,92,246,0.35)] active:scale-[0.985] transition disabled:bg-mist-200 disabled:from-mist-200 disabled:to-mist-200 disabled:shadow-none disabled:text-mist-400"
        >
          {isSubmitting ? '저장 중...' : status === 'checking' ? '확인 중...' : '이 이름으로 시작하기'}
        </button>
      </div>
    </div>
  );
};
