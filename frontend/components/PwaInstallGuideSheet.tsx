import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, MoreVertical, Share2, Smartphone } from 'lucide-react';
import { isStandaloneApp } from '../services/pwa';

type PwaInstallGuideSheetProps = {
  open: boolean;
  onClose: () => void;
  themeVars: React.CSSProperties;
};

const steps = {
  ios: [
    'Safari에서 qpathlog.com을 열어주세요.',
    '화면 아래의 공유 버튼을 눌러주세요.',
    '홈 화면에 추가를 선택하고, 웹 앱으로 열기를 켠 뒤 추가해주세요.',
  ],
  android: [
    'Chrome에서 qpathlog.com을 열어주세요.',
    '주소창 옆의 더보기(⋮) 메뉴를 눌러주세요.',
    '홈 화면에 추가 또는 앱 설치를 선택한 뒤 설치해주세요.',
  ],
};

const GuideCard: React.FC<{
  label: string;
  title: string;
  icon: React.ReactNode;
  items: string[];
}> = ({ label, title, icon, items }) => (
  <section
    className="rounded-[24px] p-5"
    style={{
      background: 'var(--qp-surface)',
      border: '1px solid var(--qp-border)',
      boxShadow: '0 12px 32px rgba(15,23,42,0.06)',
    }}
  >
    <div className="flex items-center gap-3">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px]"
        style={{ background: 'var(--qp-accent-soft)', color: 'var(--qp-accent-text)' }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-extrabold tracking-[0.18em]" style={{ color: 'var(--qp-accent-text)' }}>
          {label}
        </p>
        <h2 className="mt-1 text-[17px] font-extrabold" style={{ color: 'var(--qp-text-strong)' }}>
          {title}
        </h2>
      </div>
    </div>
    <ol className="mt-5 space-y-3.5">
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-3">
          <span
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold"
            style={{ background: 'var(--qp-accent-soft)', color: 'var(--qp-accent-text)' }}
          >
            {index + 1}
          </span>
          <p className="break-keep text-[13px] leading-[1.7]" style={{ color: 'var(--qp-text-muted)' }}>
            {item}
          </p>
        </li>
      ))}
    </ol>
  </section>
);

export const PwaInstallGuideSheet: React.FC<PwaInstallGuideSheetProps> = ({
  open,
  onClose,
  themeVars,
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
  const standalone = isStandaloneApp();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quiet Path 홈 화면 추가 안내"
      className="fixed inset-0 z-[260] flex justify-center"
      style={{ ...themeVars, background: 'var(--qp-bg-grad-from)' }}
    >
      <div
        className="relative h-[100dvh] w-full max-w-[430px] overflow-y-auto px-6 pb-[max(44px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]"
        style={{ background: 'linear-gradient(180deg, var(--qp-bg-grad-from) 0%, var(--qp-bg-grad-to) 100%)' }}
      >
        <header
          className="sticky top-0 z-10 -mx-2 flex h-14 items-center justify-center rounded-[20px] px-2 backdrop-blur-xl"
          style={{ background: 'color-mix(in srgb, var(--qp-bg-grad-from) 84%, transparent)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute left-2 grid h-10 w-10 place-items-center rounded-full"
            style={{ color: 'var(--qp-text-muted)' }}
            aria-label="홈 화면 추가 안내 닫기"
          >
            <ArrowLeft size={21} />
          </button>
          <h1 className="text-[16px] font-bold" style={{ color: 'var(--qp-text-strong)' }}>홈 화면에 추가</h1>
        </header>

        <section className="pb-7 pt-6 text-center">
          <span
            className="mx-auto grid h-16 w-16 place-items-center rounded-[22px]"
            style={{ background: 'var(--qp-accent-soft)', color: 'var(--qp-accent-text)' }}
            aria-hidden="true"
          >
            {standalone ? <Check size={28} /> : <Smartphone size={28} />}
          </span>
          <p className="mt-4 text-[10px] font-bold tracking-[0.22em]" style={{ color: 'var(--qp-accent-text)' }}>
            QUIET PATH WEB APP
          </p>
          <h2 className="mt-3 break-keep text-[24px] font-extrabold leading-[1.35] tracking-[-0.03em]" style={{ color: 'var(--qp-text-strong)' }}>
            {standalone ? '홈 화면에서 실행 중이에요' : '앱처럼 바로 열어보세요'}
          </h2>
          <p className="mx-auto mt-3 max-w-[330px] break-keep text-[13px] leading-[1.75]" style={{ color: 'var(--qp-text-muted)' }}>
            별도 앱 설치 없이 홈 화면에 Quiet Path 아이콘을 추가할 수 있습니다. 아이콘으로 실행하면 브라우저 주소창 없이 독립된 화면으로 열립니다.
          </p>
        </section>

        <div className="space-y-4">
          <GuideCard label="IPHONE · IPAD" title="Safari에서 추가" icon={<Share2 size={20} />} items={steps.ios} />
          <GuideCard label="ANDROID" title="Chrome에서 추가" icon={<MoreVertical size={21} />} items={steps.android} />
        </div>

        <p className="mt-5 break-keep px-2 text-center text-[11.5px] leading-[1.7]" style={{ color: 'var(--qp-text-faint)' }}>
          카카오톡 같은 인앱 브라우저에서는 설치 메뉴가 보이지 않을 수 있습니다. Safari 또는 Chrome에서 다시 열어 진행해주세요.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 h-14 w-full rounded-[18px] text-[14px] font-extrabold text-white"
          style={{
            background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
            boxShadow: '0 12px 28px rgba(124,58,237,0.22)',
          }}
        >
          확인
        </button>
      </div>
    </div>,
    document.body
  );
};
