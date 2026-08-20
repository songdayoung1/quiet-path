import React from 'react';
import { CalendarDays, Compass, FileText, Lightbulb, PenLine, Sparkles, TrendingUp } from 'lucide-react';

type AppGuideVisualProps = {
  type: 'direction' | 'records' | 'ai-summary';
  dark?: boolean;
};

const recordDays = [false, true, false, true, true, false, false, true, false, true, true, true, false, true];

export const AppGuideVisual: React.FC<AppGuideVisualProps> = ({ type, dark = false }) => {
  const palette = dark
    ? {
        canvas: '#172033',
        surface: '#202C42',
        surfaceSoft: '#29364D',
        text: '#E2E8F0',
        muted: '#A5B4C7',
        faint: '#718096',
        border: 'rgba(148,163,184,0.18)',
        accent: '#A78BFA',
        accentSoft: 'rgba(167,139,250,0.16)',
      }
    : {
        canvas: '#F5F6FC',
        surface: '#FFFFFF',
        surfaceSoft: '#F1F3F9',
        text: '#334155',
        muted: '#64748B',
        faint: '#94A3B8',
        border: 'rgba(226,232,240,0.96)',
        accent: '#8B5CF6',
        accentSoft: '#F0EAFE',
      };

  const frameStyle: React.CSSProperties = {
    background: palette.canvas,
    border: `1px solid ${palette.border}`,
  };

  if (type === 'direction') {
    return (
      <div
        role="img"
        aria-label="현재 방향과 진행률을 보여주는 예시 화면"
        className="aspect-[4/3] overflow-hidden rounded-[24px] p-5"
        style={frameStyle}
      >
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-extrabold tracking-[0.22em]" style={{ color: palette.faint }}>CURRENT PATH</p>
          <span className="rounded-full px-2.5 py-1 text-[9px] font-bold" style={{ color: palette.accent, background: palette.accentSoft }}>진행 중</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px]" style={{ color: palette.accent, background: palette.accentSoft }}>
            <Compass size={21} />
          </span>
          <div>
            <p className="text-[10px] font-bold" style={{ color: palette.muted }}>나의 방향</p>
            <p className="mt-1 text-[16px] font-extrabold" style={{ color: palette.text }}>매일 조금씩 이어가기</p>
          </div>
        </div>
        <div className="mt-6 rounded-[18px] p-4" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-bold tracking-[0.14em]" style={{ color: palette.faint }}>PATH RATE</p>
              <p className="mt-1 text-[22px] font-extrabold" style={{ color: palette.accent }}>42%</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: palette.muted }}>
              <CalendarDays size={13} />
              회고일까지 12일
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: palette.surfaceSoft }}>
            <div className="h-full w-[42%] rounded-full" style={{ background: palette.accent }} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'records') {
    return (
      <div
        role="img"
        aria-label="하루 기록이 날짜별로 쌓이는 예시 화면"
        className="aspect-[4/3] overflow-hidden rounded-[24px] p-5"
        style={frameStyle}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-extrabold tracking-[0.2em]" style={{ color: palette.faint }}>DAILY RECORDS</p>
            <p className="mt-1 text-[16px] font-extrabold" style={{ color: palette.text }}>8월의 기록</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-[14px]" style={{ color: palette.accent, background: palette.accentSoft }}>
            <PenLine size={18} />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {recordDays.map((active, index) => (
            <span
              key={index}
              className="aspect-square rounded-[7px]"
              style={{
                background: active ? palette.accentSoft : palette.surfaceSoft,
                border: active ? `1px solid ${palette.accent}` : `1px solid ${palette.border}`,
              }}
            />
          ))}
        </div>
        <div className="mt-5 rounded-[18px] p-4" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px]" style={{ color: palette.accent, background: palette.accentSoft }}>
              <FileText size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold" style={{ color: palette.faint }}>오늘의 기록</p>
              <p className="mt-1 truncate text-[12px] font-bold" style={{ color: palette.text }}>계획한 일을 차분하게 이어간 하루</p>
            </div>
            <span className="rounded-full px-2 py-1 text-[9px] font-bold" style={{ color: palette.accent, background: palette.accentSoft }}>잔잔</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="AI 회고에서 확인할 수 있는 내용의 예시 화면"
      className="aspect-[4/3] overflow-hidden rounded-[24px] p-4"
      style={frameStyle}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} style={{ color: palette.accent }} />
        <p className="text-[9px] font-extrabold tracking-[0.2em]" style={{ color: palette.faint }}>AI REVIEW</p>
      </div>
      <h4 className="mt-2 text-[16px] font-extrabold leading-[1.35]" style={{ color: palette.text }}>기록에서 발견한 흐름</h4>
      <p className="mt-0.5 text-[9px]" style={{ color: palette.muted }}>방향을 마친 뒤 직접 요청할 수 있어요</p>
      <div className="mt-3 space-y-2">
        {[
          { icon: TrendingUp, label: '반복된 흐름', description: '자주 등장한 생각과 행동' },
          { icon: Sparkles, label: '감정 변화', description: '기간 동안 달라진 기분' },
          { icon: Lightbulb, label: '다음 방향 힌트', description: '다음 여정을 위한 참고점' },
        ].map(({ icon: Icon, label, description }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-[12px] px-3 py-1.5" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px]" style={{ color: palette.accent, background: palette.accentSoft }}>
              <Icon size={13} />
            </span>
            <div>
              <p className="text-[10px] font-extrabold" style={{ color: palette.text }}>{label}</p>
              <p className="text-[8.5px]" style={{ color: palette.muted }}>{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
