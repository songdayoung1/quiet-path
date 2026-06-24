import React from 'react';

export type CapsuleState = 'locked' | 'idle' | 'generating' | 'ready';

interface AISummaryCapsuleProps {
  state: CapsuleState;
  unlockDate?: number;
  recordCount?: number;
  summary?: { headline: string; body: string; perspective?: string; closing?: string; observations?: string[]; improvements?: string[]; suggestions?: string[] };
  version?: string;
  failed?: boolean;
  onRegenerate?: () => void;
  onLike?: () => void;
  liked?: boolean;
}

const cardShell = [
  'rounded-[28px] border border-white/70 backdrop-blur-md relative overflow-hidden',
  'bg-[linear-gradient(160deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.72)_100%)]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(82,96,109,0.04),0_12px_32px_-16px_rgba(82,96,109,0.18)]',
].join(' ');

export const AISummaryCapsule: React.FC<AISummaryCapsuleProps> = (props) => {
  if (props.state === 'locked') return <Locked {...props} />;
  if (props.state === 'idle') return <Idle {...props} />;
  if (props.state === 'generating') return <Generating {...props} />;
  return <Ready {...props} />;
};

const Idle: React.FC<AISummaryCapsuleProps> = ({ recordCount = 0, failed = false }) => (
  <div className={`${cardShell} p-7`}>
    <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-point-200/30 blur-2xl pointer-events-none" />
    <div className="relative flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-white/85 border border-white grid place-items-center mb-4 shadow-sm">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.7 4.8L18.5 9l-4.8 1.2L12 15l-1.7-4.8L5.5 9l4.8-1.2L12 3z" />
        </svg>
      </div>
      <p className="font-mono text-[10px] font-bold text-point-500 tracking-[0.22em] mb-2">
        AI RETROSPECT · IDLE
      </p>
      <p className="text-[14px] font-semibold text-mist-600 leading-relaxed">
        {failed ? '요약을 다시 정리할 준비가 되었어요.' : '기록을 바탕으로 회고 캡슐을 만들 수 있어요.'}
      </p>
      <p className="text-[11px] text-mist-400 mt-3">
        기록 {recordCount}개를 바탕으로 흐름을 정리합니다.
      </p>
    </div>
  </div>
);

const Locked: React.FC<AISummaryCapsuleProps> = ({ unlockDate }) => {
  const dDay = unlockDate
    ? Math.max(0, Math.ceil((unlockDate - Date.now()) / 86400000))
    : 0;
  const dateStr = unlockDate
    ? new Date(unlockDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className={`${cardShell} p-7`}>
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-mist-200/30 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-white/85 border border-white grid place-items-center mb-4 shadow-sm">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9AA5B1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
        </div>
        <p className="font-mono text-[10px] font-bold text-mist-400 tracking-[0.22em] mb-2">
          AI RETROSPECT · LOCKED
        </p>
        <p className="text-[14px] font-semibold text-mist-600 leading-relaxed">
          {dateStr} 이후에 열어볼 수 있는<br />방향 종합 리포트입니다.
        </p>
        <p className="text-[11px] text-mist-400 mt-3">지금은 아직 발걸음을 모으는 중이에요.</p>
        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mist-50 border border-mist-200">
          <span className="font-mono text-[10px] font-bold text-mist-500 tracking-wider">D-{dDay}</span>
          <span className="text-[10px] text-mist-400">남았어요</span>
        </div>
      </div>
    </div>
  );
};

const Generating: React.FC<AISummaryCapsuleProps> = ({ recordCount = 0 }) => (
  <>
    <style>{`
      @keyframes qpShimmer  { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      @keyframes qpSpinRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes qpDotBounce{ 0%,100% { transform: translateY(0); opacity:.4 } 50% { transform: translateY(-4px); opacity:1 } }
      @keyframes qpPulseBG  { 0%,100% { transform: scale(1); opacity:.7 } 50% { transform: scale(1.08); opacity:1 } }
    `}</style>
    <div className={`${cardShell} p-7`}>
      <div
        className="absolute -inset-px rounded-[28px] pointer-events-none"
        style={{
          background: 'linear-gradient(115deg, transparent 30%, rgba(196,181,253,0.25) 50%, transparent 70%)',
          backgroundSize: '240% 240%',
          animation: 'qpShimmer 2.8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-point-200/50 blur-2xl pointer-events-none"
        style={{ animation: 'qpPulseBG 3s ease-in-out infinite' }}
      />
      <div
        className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-lavender-200/45 blur-2xl pointer-events-none"
        style={{ animation: 'qpPulseBG 3.2s ease-in-out infinite reverse' }}
      />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative w-16 h-16 mb-5">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, #C4B5FD 72%, transparent 100%)',
              animation: 'qpSpinRing 1.6s linear infinite',
            }}
          />
          <div className="absolute inset-[3px] rounded-full bg-white grid place-items-center">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.7 4.8L18.5 9l-4.8 1.2L12 15l-1.7-4.8L5.5 9l4.8-1.2L12 3z" />
            </svg>
          </div>
        </div>
        <p className="font-mono text-[10px] font-bold text-point-500 tracking-[0.22em] mb-2">
          AI RETROSPECT · GENERATING
        </p>
        <p className="text-[14px] font-semibold text-mist-600 leading-relaxed">
          당신의 발걸음들을<br />가만히 엮고 있어요...
        </p>
        <div className="flex items-center gap-1.5 mt-5">
          <span className="w-2 h-2 rounded-full bg-point-400" style={{ animation: 'qpDotBounce 1.4s ease-in-out infinite' }} />
          <span className="w-2 h-2 rounded-full bg-point-300" style={{ animation: 'qpDotBounce 1.4s ease-in-out 0.18s infinite' }} />
          <span className="w-2 h-2 rounded-full bg-point-200" style={{ animation: 'qpDotBounce 1.4s ease-in-out 0.36s infinite' }} />
        </div>
        <p className="text-[10px] text-mist-400 mt-3 tracking-wide">
          기록 {recordCount}개 · 메모리 검토 중
        </p>
      </div>
    </div>
  </>
);

const Ready: React.FC<AISummaryCapsuleProps> = ({ summary, version, onRegenerate, onLike, liked }) => (
  <div className={`${cardShell} overflow-hidden`}>
    <div
      className="relative px-6 py-4"
      style={{ background: 'linear-gradient(135deg, rgba(196,181,253,0.32) 0%, rgba(167,139,250,0.18) 100%)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.7 4.8L18.5 9l-4.8 1.2L12 15l-1.7-4.8L5.5 9l4.8-1.2L12 3z" />
          </svg>
          <p className="font-mono text-[10px] font-bold text-point-600 tracking-[0.22em]">AI RETROSPECT</p>
        </div>
        {version && (
          <span className="font-mono text-[9px] font-semibold text-mist-400 tracking-wider">{version}</span>
        )}
      </div>
    </div>

    <div className="px-6 py-6 relative">
      <span className="absolute left-3 top-3 text-point-200 text-[44px] leading-none select-none" style={{ fontFamily: 'Georgia, serif' }}>"</span>
      <p className="text-[15px] text-mist-600 leading-[1.85] font-medium pl-5 pr-3 mb-2">
        {summary?.headline}
      </p>
      <p className="text-[13px] text-mist-500 leading-[1.85] pl-5 pr-3">
        {summary?.body}
      </p>
      <span className="absolute right-3 bottom-12 text-point-200 text-[44px] leading-none select-none" style={{ fontFamily: 'Georgia, serif' }}>"</span>
    </div>

    <div className="px-5 py-4 border-t border-mist-100/80 flex items-center gap-2.5 bg-white/40">
      <button
        onClick={onRegenerate}
        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-mist-200/70 text-mist-600 text-[12px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-mist-50 transition"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        다시 요약하기
      </button>
      <button
        onClick={onLike}
        aria-label="좋아요"
        className={`px-3 py-2.5 rounded-xl transition ${
          liked ? 'text-rose-500 bg-rose-50' : 'text-mist-400 hover:text-rose-400 hover:bg-rose-50'
        }`}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10v12M2 22h4V10l5-8c.5 0 1.5.5 1.5 1.5L11 10h6.5a2 2 0 0 1 2 2.3L18.2 20a2 2 0 0 1-2 1.7H7" />
        </svg>
      </button>
    </div>
  </div>
);
