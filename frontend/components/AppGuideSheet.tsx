import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, Compass, FileText, Sparkles } from 'lucide-react';
import { AppGuideVisual } from './AppGuideVisual';

type AppGuideSheetProps = {
  open: boolean;
  onClose: () => void;
  onReplayTutorial: () => void;
  themeVars: React.CSSProperties;
  theme: 'light' | 'dark';
};

const guideCardStyle: React.CSSProperties = {
  background: 'var(--qp-surface)',
  border: '1px solid var(--qp-border)',
  boxShadow: '0 14px 38px rgba(15,23,42,0.07)',
};

export const AppGuideSheet: React.FC<AppGuideSheetProps> = ({
  open,
  onClose,
  onReplayTutorial,
  themeVars,
  theme,
}) => {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quiet Path 앱 사용 가이드"
      className="fixed inset-0 z-[260] flex justify-center"
      style={{ ...themeVars, background: 'var(--qp-bg-grad-from)' }}
    >
      <div
        className="relative h-[100dvh] w-full max-w-[430px] overflow-y-auto px-6 pb-[max(44px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]"
        style={{ background: 'linear-gradient(180deg, var(--qp-bg-grad-from) 0%, var(--qp-bg-grad-to) 100%)' }}
      >
        <header className="sticky top-0 z-10 -mx-2 flex h-14 items-center justify-center rounded-[20px] px-2 backdrop-blur-xl" style={{ background: 'color-mix(in srgb, var(--qp-bg-grad-from) 84%, transparent)' }}>
          <button
            type="button"
            onClick={onClose}
            className="absolute left-2 grid h-10 w-10 place-items-center rounded-full"
            style={{ color: 'var(--qp-text-muted)' }}
            aria-label="사용 가이드 닫기"
          >
            <ArrowLeft size={21} />
          </button>
          <h1 className="text-[16px] font-bold" style={{ color: 'var(--qp-text-strong)' }}>앱 사용 가이드</h1>
        </header>

        <section className="pb-8 pt-6 text-center">
          <p className="text-[10px] font-bold tracking-[0.24em]" style={{ color: 'var(--qp-accent-text)' }}>HOW TO USE QUIET PATH</p>
          <h2 className="mt-3 break-keep text-[26px] font-extrabold leading-[1.35] tracking-[-0.03em]" style={{ color: 'var(--qp-text-strong)' }}>
            방향을 정하고, 하루를 쌓고,<br />나의 흐름을 돌아보는 방법
          </h2>
          <p className="mx-auto mt-4 max-w-[330px] break-keep text-[13px] leading-[1.75]" style={{ color: 'var(--qp-text-muted)' }}>
            Quiet Path는 하루 기록을 따로 흩어 두지 않고 하나의 방향 안에 모아, 시간이 지난 뒤 변화의 흐름까지 돌아볼 수 있도록 만든 기록 서비스입니다.
          </p>
          <button
            type="button"
            onClick={onReplayTutorial}
            className="mt-5 rounded-full px-5 py-2.5 text-[12px] font-extrabold"
            style={{
              color: 'var(--qp-accent-text)',
              background: 'var(--qp-accent-soft)',
              border: '1px solid var(--qp-border)',
            }}
          >
            3단계 튜토리얼로 보기
          </button>
        </section>

        <div className="space-y-5">
          <section className="rounded-[28px] p-5" style={guideCardStyle}>
            <AppGuideVisual type="direction" dark={theme === 'dark'} />
            <div className="mt-6 flex items-center gap-2 text-violet-500">
              <Compass size={17} />
              <p className="text-[11px] font-extrabold tracking-[0.16em]">01 · 방향 시작하기</p>
            </div>
            <h3 className="mt-3 break-keep text-[20px] font-extrabold leading-[1.4]" style={{ color: 'var(--qp-text-strong)' }}>
              방향은 기록을 담는 하나의 여정입니다
            </h3>
            <div className="mt-4 space-y-3 break-keep text-[13px] leading-[1.8]" style={{ color: 'var(--qp-text-muted)' }}>
              <p>
                먼저 지금 집중하고 싶은 목표를 정하고 회고할 날짜를 선택합니다. 자격증 준비, 운동 습관, 마음 돌보기처럼 일정 기간 이어가고 싶은 주제라면 무엇이든 방향이 될 수 있습니다.
              </p>
              <p>
                진행 중인 방향은 그 기간의 기록을 묶는 기준입니다. 한 번에 하나의 방향만 진행하며, 새 방향을 시작하려면 현재 방향을 먼저 마무리해야 합니다.
              </p>
            </div>
            <ul className="mt-5 space-y-2.5">
              {['방향 이름과 목표를 구체적으로 적기', '실제로 돌아보고 싶은 날짜를 회고일로 선택하기', '여정 화면에서 진행률과 남은 기간 확인하기'].map((text) => (
                <li key={text} className="flex items-start gap-2.5 text-[12.5px] leading-[1.6]" style={{ color: 'var(--qp-text-strong)' }}>
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: 'var(--qp-accent-soft)', color: 'var(--qp-accent-text)' }}><Check size={12} /></span>
                  {text}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[28px] p-5" style={guideCardStyle}>
            <AppGuideVisual type="records" dark={theme === 'dark'} />
            <div className="mt-6 flex items-center gap-2 text-violet-500">
              <FileText size={17} />
              <p className="text-[11px] font-extrabold tracking-[0.16em]">02 · 하루 기록하기</p>
            </div>
            <h3 className="mt-3 break-keep text-[20px] font-extrabold leading-[1.4]" style={{ color: 'var(--qp-text-strong)' }}>
              오늘의 기록은 현재 방향 안에 쌓입니다
            </h3>
            <div className="mt-4 space-y-3 break-keep text-[13px] leading-[1.8]" style={{ color: 'var(--qp-text-muted)' }}>
              <p>
                오늘 탭에서 하루의 내용과 기분을 남기고, 필요하면 사진을 더할 수 있습니다. 저장된 기록은 작성 당시의 현재 방향에 연결되므로, 나중에 그 방향을 따라가며 어떤 하루를 보냈는지 확인할 수 있습니다.
              </p>
              <p>
                기록 탭에서는 월별로 작성한 날을 살펴보고 개별 기록을 다시 열 수 있습니다. 공개한 기록은 조용한 피드에서 다른 사람들과 공유되며, 비공개 기록은 나만 볼 수 있습니다.
              </p>
              <p>
                기록이 짧아도 괜찮습니다. 매일 완벽하게 쓰기보다 그날의 기분과 기억하고 싶은 한 장면을 남기는 것이 흐름을 돌아보는 데 더 도움이 됩니다.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] p-5" style={guideCardStyle}>
            <AppGuideVisual type="ai-summary" dark={theme === 'dark'} />
            <div className="mt-6 flex items-center gap-2 text-violet-500">
              <Sparkles size={17} />
              <p className="text-[11px] font-extrabold tracking-[0.16em]">03 · AI 회고 만들기</p>
            </div>
            <h3 className="mt-3 break-keep text-[20px] font-extrabold leading-[1.4]" style={{ color: 'var(--qp-text-strong)' }}>
              방향을 마친 뒤 쌓인 기록을 함께 돌아봅니다
            </h3>
            <div className="mt-4 space-y-3 break-keep text-[13px] leading-[1.8]" style={{ color: 'var(--qp-text-muted)' }}>
              <p>
                회고일에 도달했거나 목표를 마무리하고 싶을 때 현재 방향을 종료할 수 있습니다. 방향 안에 기록이 하나 이상 쌓여 있다면, 지난 방향 상세에서 AI 회고 캡슐을 요청할 수 있습니다.
              </p>
              <p>
                AI는 기록에 나타난 반복된 생각과 감정, 달라진 흐름을 정리해 줍니다. 생성에는 잠시 시간이 걸릴 수 있으며 완료되면 지난 방향에서 다시 확인할 수 있습니다.
              </p>
              <p>
                AI 회고는 정답이나 평가가 아니라 내가 다음 방향을 정할 때 참고하는 보조 자료입니다. 실제 경험과 다르게 느껴지는 부분은 가볍게 참고하고, 나에게 의미 있었던 변화를 중심으로 활용해 주세요.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] p-5" style={guideCardStyle}>
            <p className="text-[11px] font-extrabold tracking-[0.16em]" style={{ color: 'var(--qp-accent-text)' }}>어디에서 확인하나요?</p>
            <div className="mt-4 space-y-4">
              {[
                ['오늘', '현재 방향을 확인하고 오늘의 기록을 작성함'],
                ['기록', '날짜별 기록과 사진을 다시 확인함'],
                ['둘러보기', '공개된 하루 기록을 다른 사람들과 공유함'],
                ['여정', '현재 방향의 진행 상황과 지난 방향의 AI 회고를 확인함'],
              ].map(([name, description]) => (
                <div key={name} className="flex gap-3">
                  <span className="w-14 shrink-0 text-[12.5px] font-extrabold" style={{ color: 'var(--qp-text-strong)' }}>{name}</span>
                  <p className="break-keep text-[12.5px] leading-[1.65]" style={{ color: 'var(--qp-text-muted)' }}>{description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 h-14 w-full rounded-[18px] text-[14px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', boxShadow: '0 12px 28px rgba(124,58,237,0.22)' }}
        >
          가이드 확인 완료
        </button>
      </div>
    </div>,
    document.body
  );
};
