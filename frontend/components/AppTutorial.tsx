import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AppGuideVisual } from './AppGuideVisual';

type AppTutorialProps = {
  open: boolean;
  theme: 'light' | 'dark';
  hasActiveDirection: boolean;
  onComplete: () => void;
  onPrimaryAction: () => void;
};

const TUTORIAL_STEPS = [
  {
    eyebrow: 'STEP 01 · 방향',
    title: '먼저, 이어가고 싶은 방향을 정해요',
    description:
      '이루고 싶은 목표와 회고할 날짜를 정해 주세요. 시작한 방향은 그동안 남길 기록들을 한곳에 모아주는 하나의 여정이 됩니다.',
    visual: 'direction' as const,
  },
  {
    eyebrow: 'STEP 02 · 기록',
    title: '방향을 정했다면 오늘을 하나 기록해요',
    description:
      '하루의 내용과 기분, 사진을 기록하면 현재 진행 중인 방향에 연결됩니다. 기록 화면에서 날짜별로 다시 보고, 내가 걸어온 흐름을 확인할 수 있어요.',
    visual: 'records' as const,
  },
  {
    eyebrow: 'STEP 03 · AI 회고',
    title: '기록이 쌓이면 변화의 흐름을 돌아봐요',
    description:
      '회고일이 지나 방향을 마무리하면, 쌓인 기록을 바탕으로 AI 회고를 만들 수 있어요. 반복된 생각과 변화의 흐름을 정리해 다음 방향을 세우는 데 활용해 보세요.',
    visual: 'ai-summary' as const,
  },
] as const;

export const AppTutorial: React.FC<AppTutorialProps> = ({
  open,
  theme,
  hasActiveDirection,
  onComplete,
  onPrimaryAction,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete();
      if (event.key === 'ArrowLeft') setStepIndex(Math.max(0, stepIndex - 1));
      if (event.key === 'ArrowRight') {
        if (stepIndex === TUTORIAL_STEPS.length - 1) onComplete();
        else setStepIndex(stepIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onComplete, stepIndex]);

  const colors = useMemo(() => (
    theme === 'dark'
      ? {
          background: '#101827',
          surface: '#1E293B',
          text: '#E2E8F0',
          muted: '#A5B4C7',
          faint: '#64748B',
          border: 'rgba(148,163,184,0.2)',
        }
      : {
          background: '#F1F3FD',
          surface: '#FFFFFF',
          text: '#334155',
          muted: '#64748B',
          faint: '#94A3B8',
          border: 'rgba(226,232,240,0.95)',
        }
  ), [theme]);

  if (!open) return null;

  const step = TUTORIAL_STEPS[stepIndex];
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quiet Path 시작 가이드"
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: theme === 'dark' ? '#080D17' : 'rgba(226,232,240,0.92)' }}
    >
      <div
        className="relative flex w-full max-w-[430px] flex-col overflow-hidden px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]"
        style={{
          height: 'min(100dvh, 880px)',
          background:
            theme === 'dark'
              ? 'radial-gradient(circle at 10% 0%, rgba(91,76,179,0.2), transparent 42%), linear-gradient(180deg, #111827 0%, #0F172A 100%)'
              : 'radial-gradient(circle at 10% 0%, rgba(196,181,253,0.46), transparent 42%), linear-gradient(180deg, #F4F2FF 0%, #E7F1F0 100%)',
        }}
      >
        <header className="flex h-12 items-center justify-between">
          <p className="text-[11px] font-bold tracking-[0.24em]" style={{ color: colors.faint }}>
            QUIET PATH GUIDE
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{ color: colors.muted, background: theme === 'dark' ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.72)' }}
            aria-label="가이드 닫기"
          >
            <X size={20} />
          </button>
        </header>

        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <div style={{ boxShadow: '0 20px 50px rgba(86,76,134,0.1)' }}>
            <AppGuideVisual type={step.visual} dark={theme === 'dark'} />
          </div>

          <div className="mt-8 px-1">
            <p className="text-[11px] font-bold tracking-[0.18em] text-violet-500">{step.eyebrow}</p>
            <h2 className="mt-3 break-keep text-[24px] font-extrabold leading-[1.35] tracking-[-0.025em]" style={{ color: colors.text }}>
              {step.title}
            </h2>
            <p className="mt-4 break-keep text-[14px] font-medium leading-[1.8]" style={{ color: colors.muted }}>
              {step.description}
            </p>
          </div>
        </div>

        <footer className="mt-7">
          <div className="mb-5 flex justify-center gap-2" aria-label={`${stepIndex + 1} / ${TUTORIAL_STEPS.length}`}>
            {TUTORIAL_STEPS.map((item, index) => (
              <span
                key={item.eyebrow}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: index === stepIndex ? 28 : 6,
                  background: index === stepIndex ? '#8B5CF6' : colors.border,
                }}
              />
            ))}
          </div>
          <div className="flex gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((index) => index - 1)}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]"
                style={{ color: colors.muted, background: colors.surface, border: `1px solid ${colors.border}` }}
                aria-label="이전 안내"
              >
                <ChevronLeft size={21} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onPrimaryAction();
                else setStepIndex((index) => index + 1);
              }}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] text-[14px] font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', boxShadow: '0 12px 28px rgba(124,58,237,0.25)' }}
            >
              {isLast ? (hasActiveDirection ? '첫 기록 남기기' : '방향 시작하기') : '다음'}
              {!isLast && <ChevronRight size={18} />}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
};
