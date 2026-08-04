import React, { useEffect, useState } from 'react';
import { SoftButton, Card, CategoryIcon } from '../components/UI';
import { ArrowRight, Check, Compass } from 'lucide-react';
import { DirectionSetupForm } from '../components/DirectionSetupForm';
import { Direction } from '../types';
import { createDirectionId } from '../storage';
import { CATEGORIES } from '../constants';
import { getThemePalette, useResolvedTheme } from '../theme';

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface OnboardingViewProps {
  onComplete: (initialDirection: Direction) => void | Promise<void>;
  onStartAuth: () => void;
  onStartGuest: () => void;
  initialStep?: number;
}

const Wordmark: React.FC = () => (
  <div className="flex items-center gap-2">
    <Compass size={14} strokeWidth={1.5} className="text-point-500" />
    <span className="text-[11px] font-bold text-mist-500 tracking-[0.28em]">QUIET PATH</span>
  </div>
);

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onComplete,
  onStartAuth,
  onStartGuest,
  initialStep = 0,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [step, setStep] = useState(initialStep);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  // 방향 설정 상태 (DirectionView와 동일한 구조)
  const [customTitle, setCustomTitle] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [customReviewDate, setCustomReviewDate] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const minReviewDateStr = formatDateInputValue(tomorrow);

  const getReviewAt = () => {
    if (customReviewDate) {
      const selected = new Date(customReviewDate + 'T00:00:00');
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (selected <= todayStart) return undefined;
      return selected.getTime();
    }
    if (durationDays) { const d = new Date(); d.setDate(d.getDate() + durationDays); return d.getTime(); }
    return undefined;
  };
  const reviewDateDisplay = (() => {
    const ts = getReviewAt();
    return ts ? new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : null;
  })();
  const isTitleMissing = !customTitle.trim();
  const canStart = !isTitleMissing && !!getReviewAt();

  // --- STEP 0: 시작 화면 ---
  if (step === 0) {
    return (
      <div className="flex flex-col h-screen animate-fade-in relative z-10">
        <header className="h-16 pt-5 px-6 flex items-center justify-center">
          <Wordmark />
        </header>

        <div className="flex-1 flex flex-col justify-center items-center px-6 text-center max-w-sm mx-auto">
          <div className="relative mb-8">
            <div className="w-[92px] h-[92px] rounded-full bg-white/60 border border-white grid place-items-center shadow-sm">
              <Compass
                size={34}
                strokeWidth={1.5}
                className="text-point-500 animate-spin"
                style={{ animationDuration: '12s' }}
              />
            </div>
            <span className="pointer-events-none absolute inset-0 rounded-full border border-point-200/70 animate-pulse-slow" />
          </div>

          <p className="text-[10px] font-bold tracking-[0.3em] text-point-500 mb-4">WELCOME</p>
          <h2 className="text-2xl font-semibold text-mist-600 mb-4 leading-snug">
            지금, 어떤 방향을<br />세우고 계신가요?
          </h2>
          <p className="text-mist-400 text-sm font-normal leading-relaxed">
            요즘 가장 신경 쓰이는<br />한 가지만 고르면 됩니다.
          </p>
        </div>

        <div className="w-full max-w-xs mx-auto px-6 pb-10 pt-4 space-y-3">
          <button
            onClick={onStartAuth}
            className="w-full min-h-[54px] px-6 rounded-2xl text-[15px] font-bold tracking-tight text-white bg-gradient-to-br from-point-500 to-point-600 shadow-[0_8px_20px_-4px_rgba(139,92,246,0.35)] active:scale-[0.985] transition"
          >
            계정으로 시작하기
          </button>
          <button
            onClick={onStartGuest}
            className="w-full min-h-[48px] px-5 rounded-xl text-[14px] font-semibold tracking-tight text-mist-500 bg-white/70 hover:bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] active:scale-[0.985] transition"
          >
            게스트로 먼저 둘러보기 →
          </button>
          <p className="text-[11px] text-mist-400 text-center leading-relaxed pt-1">
            로그인 없이 둘러볼 수 있고, <span className="text-mist-500 font-medium">기록 저장은 로그인 후</span> 가능해요.
          </p>
        </div>
      </div>
    );
  }

  // --- STEP 1: 카테고리 선택 (DirectionView와 동일한 디자인) ---
  if (step === 1) {
    return (
      <div className="flex flex-col h-screen px-5 pt-12 pb-8 animate-slide-up z-10 relative">
        <div className="mb-6 shrink-0">
          <p className="text-[11px] font-bold text-point-500 uppercase tracking-[0.18em] mb-2">Step 1</p>
          <h2 className="text-[28px] font-bold text-mist-600 leading-[1.25] tracking-[-0.01em]">
            지금 가장 집중하고 싶은<br />영역을 선택해주세요
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          <div className="flex flex-col gap-3">
            {CATEGORIES.map((cat) => (
              <Card
                key={cat.id}
                onClick={() => { setSelectedCategory(cat); setStep(2); }}
                withSurfaceOverlay={false}
                className="group !p-4 cursor-pointer active:scale-[0.99] transition-all duration-300 hover:shadow-md hover:!border-point-200"
                style={{ background: palette.cardBgStrong, borderColor: palette.border }}
              >
                <div className="flex items-center gap-4">
                  <CategoryIcon categoryId={cat.id} size="md" />
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-0.5" style={{ color: palette.strongText }}>{cat.label}</h3>
                    <p className="text-xs" style={{ color: palette.mutedText }}>{cat.desc}</p>
                  </div>
                  <ArrowRight size={16} className="text-mist-300 shrink-0 transition-colors group-hover:text-point-400" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 2: 앱 철학 소개 ---
  if (step === 2) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center animate-fade-in z-10 relative">
        <div className="flex-1 flex flex-col justify-center items-center max-w-sm gap-8">
          {/* 선택된 카테고리 뱃지 */}
          {selectedCategory && (
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-sm border"
              style={{ background: palette.cardBgStrong, borderColor: 'rgba(139,92,246,0.28)' }}
            >
              <CategoryIcon categoryId={selectedCategory.id} size="sm" />
              <span className="font-bold text-sm" style={{ color: palette.strongText }}>{selectedCategory.label}</span>
              <Check size={13} className="text-point-500" strokeWidth={2.4} />
            </div>
          )}
          <h2 className="text-[26px] font-semibold text-mist-600 leading-[1.35] tracking-[-0.01em]">
            목표를 재촉하기보다<br/>흐름을 함께 돌아봐요.
          </h2>
          <p className="text-mist-400 text-[15px] leading-7">
            매일 완벽하지 않아도 괜찮아요.<br/>
            이 방향으로 <span className="font-medium text-mist-500">조금씩 움직였는지</span>를<br/>나중에 다시 꺼내볼 거예요.
          </p>
        </div>
        <div className="w-full max-w-xs mb-16">
          <SoftButton onClick={() => setStep(3)} className="shadow-lg shadow-lavender-200/40">
            새 방향 만들기
          </SoftButton>
        </div>
      </div>
    );
  }

  // --- STEP 3: 방향 설정 (DirectionView와 동일한 폼 구조) ---
  if (step === 3 && selectedCategory) {
    const handleStart = () => {
      const reviewAt = getReviewAt();
      if (!customTitle.trim() || !reviewAt) return;
      const initialDirection: Direction = {
        id: createDirectionId(),
        question: customQuestion.trim() || '이 방향으로 나는 어떻게 걸어가고 있을까?',
        description: customTitle,
        categoryId: selectedCategory.id,
        categoryLabel: selectedCategory.label,
        createdAt: Date.now(),
        reviewAt,
        isActive: true,
      };
      onComplete(initialDirection);
    };

    return (
      <div className="flex flex-col h-screen px-5 pt-10 pb-8 animate-slide-up overflow-y-auto no-scrollbar z-10 relative">
        <div className="mb-5 shrink-0">
          <p className="text-[11px] font-bold text-point-500 uppercase tracking-[0.18em] mb-2">Step 2</p>
          <h2 className="text-[30px] font-bold text-mist-600 leading-[1.2] tracking-[-0.02em]">새 방향 만들기</h2>
        </div>

        <div className="flex-1">
          <DirectionSetupForm
            selectedCategory={selectedCategory}
            directionName={customTitle}
            directionText={customQuestion}
            durationDays={durationDays}
            customReviewDate={customReviewDate}
            showDateInput={showDateInput}
            todayStr={minReviewDateStr}
            reviewDateDisplay={reviewDateDisplay}
            isNameMissing={isTitleMissing}
            hasReviewAt={!!getReviewAt()}
            submitDisabled={!canStart}
            onDirectionNameChange={setCustomTitle}
            onDirectionTextChange={setCustomQuestion}
            onSelectDuration={(days) => {
              setDurationDays(days);
              setCustomReviewDate('');
              setShowDateInput(false);
            }}
            onToggleDateInput={() => {
              setShowDateInput((prev) => {
                const willOpen = !prev;
                if (willOpen && (!customReviewDate || customReviewDate < minReviewDateStr)) {
                  setCustomReviewDate(minReviewDateStr);
                }
                return willOpen;
              });
              setDurationDays(null);
            }}
            onReviewDateChange={(value) => {
              setCustomReviewDate(value < minReviewDateStr ? minReviewDateStr : value);
              setDurationDays(null);
            }}
            onSubmit={handleStart}
          />
        </div>
      </div>
    );
  }

  return null;
};
