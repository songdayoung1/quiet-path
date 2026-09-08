import React, { useEffect, useRef, useState } from 'react';
import { Direction, Record as RecordType } from '../types';
import { PageHeader } from '../components/UI';
import { ChevronLeft } from 'lucide-react';
import { getThemePalette, useResolvedTheme } from '../theme';
import { PathDetailResponse, pathApi } from '../api/pathApi';
import { buildApiErrorMessage } from '../api/apiClient';
import { AISummaryCapsule } from '../components/AISummaryCapsule';

interface PastDirectionsViewProps {
  pastDirections: Direction[];
  records: RecordType[];
  accessToken?: string | null;
  onLoginRequired: () => void;
  onBack: () => void;
}

// ─────────────── Trail SVG ───────────────
const SLOT_H = 270;
const TRAIL_PAD = 30;
const TRAIL_ACCENT = '#C4B5FD';
const TRAIL_MID = '#A78BFA';
const CP = 88; // bezier control point amplitude
const SUMMARY_POLL_DELAYS = [2000, 3000, 5000, 8000, 12000];
const SUMMARY_POLL_MAX_ATTEMPTS = 30;

interface TrailSVGProps {
  count: number;
  totalHeight: number;
}

const getMarkerPos = (i: number) => ({
  x: i % 2 === 0 ? 70 : 330,
  y: TRAIL_PAD + i * SLOT_H + Math.round(SLOT_H / 2),
});

const TrailSVG: React.FC<TrailSVGProps> = ({ count, totalHeight }) => {
  if (count === 0) return null;

  // Build bezier path — smooth S-curves between alternating markers
  let d = 'M 200 20';
  for (let i = 0; i < count; i++) {
    const m = getMarkerPos(i);
    if (i === 0) {
      // First segment: use midpoint to avoid vertical reversal
      const mid = Math.round((20 + m.y) / 2);
      d += ` C 200 ${mid - 20}, ${m.x} ${mid + 20}, ${m.x} ${m.y}`;
    } else {
      const prev = getMarkerPos(i - 1);
      d += ` C ${prev.x} ${prev.y + CP}, ${m.x} ${m.y - CP}, ${m.x} ${m.y}`;
    }
  }
  const last = getMarkerPos(count - 1);
  d += ` C ${last.x} ${last.y + CP}, 200 ${totalHeight - 20}, 200 ${totalHeight}`;

  return (
    <svg
      className="absolute inset-0 w-full pointer-events-none"
      style={{ height: totalHeight }}
      viewBox={`0 0 400 ${totalHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        {/* Absolute-coordinate gradient so fade works correctly regardless of path bounding box */}
        <linearGradient id="trailGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={totalHeight}>
          <stop offset="0%" stopColor={TRAIL_ACCENT} stopOpacity="0" />
          <stop offset="8%" stopColor={TRAIL_ACCENT} stopOpacity="0.9" />
          <stop offset="60%" stopColor={TRAIL_MID} stopOpacity="0.55" />
          <stop offset="85%" stopColor={TRAIL_MID} stopOpacity="0.18" />
          <stop offset="100%" stopColor={TRAIL_MID} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trailGlow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={totalHeight}>
          <stop offset="0%" stopColor={TRAIL_ACCENT} stopOpacity="0" />
          <stop offset="8%" stopColor={TRAIL_ACCENT} stopOpacity="0.28" />
          <stop offset="60%" stopColor={TRAIL_ACCENT} stopOpacity="0.14" />
          <stop offset="100%" stopColor={TRAIL_ACCENT} stopOpacity="0" />
        </linearGradient>
        <filter id="glowBlur" x="-25%" y="-5%" width="150%" height="110%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Glow layer */}
      <path d={d} fill="none" stroke="url(#trailGlow)" strokeWidth="12" strokeLinecap="round" filter="url(#glowBlur)" />

      {/* Main trail */}
      <path d={d} fill="none" stroke="url(#trailGrad)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0 8" />

      {/* Start anchor */}
      <circle cx="200" cy="20" r="10" fill={TRAIL_MID} fillOpacity="0.12" />
      <circle cx="200" cy="20" r="6" fill="white" stroke={TRAIL_MID} strokeWidth="2" />
      <circle cx="200" cy="20" r="2.6" fill={TRAIL_MID} />

      {/* Markers + connector lines */}
      {Array.from({ length: count }, (_, i) => {
        const m = getMarkerPos(i);
        const isLeftMarker = i % 2 === 0;
        const connectorEndX = isLeftMarker ? m.x + 18 : m.x - 18;
        return (
          <g key={i}>
            <line x1={m.x} y1={m.y} x2={connectorEndX} y2={m.y} stroke={TRAIL_ACCENT} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx={m.x} cy={m.y} r="7" fill="white" stroke={TRAIL_MID} strokeWidth="2" />
            <circle cx={m.x} cy={m.y} r="3" fill={TRAIL_MID} />
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────── Mood chip styles ───────────────
const MOOD_CHIP_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  '포근': { bg: '#FAF5FF', border: '#DDD6FE', text: '#7C3AED' },
  '멍함': { bg: '#F8FAFC', border: '#E4E7EB', text: '#616E7C' },
  '반짝': { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  '잔잔': { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  '버팀': { bg: '#ECFDF5', border: '#BBF7D0', text: '#047857' },
  '두근': { bg: '#FFF1F2', border: '#FECDD3', text: '#E11D48' },
};

// ─────────────── Main Component ───────────────
export const PastDirectionsView: React.FC<PastDirectionsViewProps> = ({
  pastDirections,
  records,
  accessToken,
  onLoginRequired,
  onBack,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [selectedPathDetail, setSelectedPathDetail] = useState<PathDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSummarySubmitting, setIsSummarySubmitting] = useState(false);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const summaryRequestInFlight = useRef(false);

  const glassCard: React.CSSProperties = theme === 'dark'
    ? { background: palette.cardBgStrong, borderColor: palette.border }
    : {
        background: 'linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 100%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(82,96,109,0.04), 0 12px 32px -16px rgba(82,96,109,0.18)',
        borderColor: 'rgba(255,255,255,0.7)',
      };

  const loadDetail = async (pathId: number, silent = false): Promise<PathDetailResponse | null> => {
    if (!accessToken) { onLoginRequired(); return null; }
    if (!silent) setIsDetailLoading(true);
    if (!silent) setDetailError(null);
    try {
      const detail = await pathApi.getDetail(accessToken, pathId);
      setSelectedPathDetail(detail);
      return detail;
    } catch (error) {
      setDetailError(buildApiErrorMessage(error, '방향 상세를 불러오지 못했어요.'));
      return null;
    } finally {
      if (!silent) setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDirection) {
      setSelectedPathDetail(null);
      setDetailError(null);
      setIsSummarySubmitting(false);
      setIsFeedbackSubmitting(false);
      summaryRequestInFlight.current = false;
      return;
    }
    const pathId = Number(selectedDirection.id);
    if (!Number.isFinite(pathId)) { setDetailError('방향 정보를 확인하지 못했어요.'); return; }
    void loadDetail(pathId);
  }, [selectedDirection, accessToken]);

  useEffect(() => {
    if (!selectedDirection || !accessToken || selectedPathDetail?.summaryStatus !== 'PROCESSING') return;
    const pathId = Number(selectedDirection.id);
    let cancelled = false;
    let attempt = 0;
    let timer: number | undefined;

    const poll = () => {
      if (cancelled) return;
      if (attempt >= SUMMARY_POLL_MAX_ATTEMPTS) {
        setDetailError('AI 회고 생성이 길어지고 있어요. 잠시 뒤 다시 확인해 주세요.');
        return;
      }

      const delay = SUMMARY_POLL_DELAYS[Math.min(attempt, SUMMARY_POLL_DELAYS.length - 1)];
      timer = window.setTimeout(async () => {
        attempt += 1;
        try {
          const nextDetail = await pathApi.getDetail(accessToken, pathId);
          if (cancelled) return;
          setSelectedPathDetail(nextDetail);
          setDetailError(null);
          if (nextDetail.summaryStatus === 'PROCESSING') poll();
        } catch (error) {
          if (cancelled) return;
          if (attempt >= SUMMARY_POLL_MAX_ATTEMPTS) {
            setDetailError(buildApiErrorMessage(error, 'AI 회고 상태를 확인하지 못했어요.'));
            return;
          }
          poll();
        }
      }, delay);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [selectedDirection, selectedPathDetail?.summaryStatus, accessToken]);

  const handleSummarize = async () => {
    if (!selectedDirection) return;
    if (!accessToken) { onLoginRequired(); return; }
    if (summaryRequestInFlight.current) return;
    const pathId = Number(selectedDirection.id);
    if (!Number.isFinite(pathId)) return;
    summaryRequestInFlight.current = true;
    setIsSummarySubmitting(true);
    setDetailError(null);
    try {
      const response = await pathApi.requestSummary(accessToken, pathId);
      setSelectedPathDetail((current) => current ? {
        ...current,
        summary: null,
        summaryStatus: response.summaryStatus,
        summaryRegenerationCount: response.regenerationCount,
        summaryRegenerationLimit: response.regenerationLimit,
        summaryRegenerationRemaining: response.regenerationRemaining,
        summaryHelpful: null,
      } : current);
    } catch (error) {
      setDetailError(buildApiErrorMessage(error, 'AI 요약 요청에 실패했어요.'));
    } finally {
      summaryRequestInFlight.current = false;
      setIsSummarySubmitting(false);
    }
  };

  const handleSummaryFeedback = async () => {
    if (!selectedDirection) return;
    if (!accessToken) { onLoginRequired(); return; }
    if (isFeedbackSubmitting) return;
    const pathId = Number(selectedDirection.id);
    if (!Number.isFinite(pathId)) return;
    const helpful = selectedPathDetail?.summaryHelpful !== true;

    setIsFeedbackSubmitting(true);
    setDetailError(null);
    try {
      const response = await pathApi.updateSummaryFeedback(accessToken, pathId, helpful);
      setSelectedPathDetail((current) => current ? {
        ...current,
        summaryHelpful: response.helpful,
      } : current);
    } catch (error) {
      setDetailError(buildApiErrorMessage(error, 'AI 회고 피드백을 저장하지 못했어요.'));
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  // ─────────────── Detail View ───────────────
  if (selectedDirection) {
    const detail = selectedPathDetail;
    const flowRecords = detail?.records ?? [];
    const startDate = detail?.createdAt
      ? new Date(`${detail.createdAt}T00:00:00`).toLocaleDateString()
      : new Date(selectedDirection.createdAt).toLocaleDateString();
    const endDate = detail?.completedAt
      ? new Date(`${detail.completedAt}T00:00:00`).toLocaleDateString()
      : selectedDirection.endedAt ? new Date(selectedDirection.endedAt).toLocaleDateString() : 'Now';
    const summaryStatus = detail?.summaryStatus ?? null;
    const summary = detail?.summary;
    const unlockDateTs = detail?.reviewAt
      ? new Date(`${detail.reviewAt}T00:00:00`).getTime()
      : selectedDirection.reviewAt ?? undefined;

    const isLocked = summaryStatus === 'LOCKED';
    const isProcessing = summaryStatus === 'PROCESSING';
    const isDone = summaryStatus === 'DONE' && !!summary;
    const isEmpty = summaryStatus === 'EMPTY';
    const canRequest = summaryStatus === 'READY' || summaryStatus === 'FAILED' || summaryStatus === 'DONE';

    let capsuleState: 'locked' | 'idle' | 'generating' | 'ready' | null = null;
    if (isLocked) capsuleState = 'locked';
    else if (isProcessing || isSummarySubmitting) capsuleState = 'generating';
    else if (isDone) capsuleState = 'ready';
    else if (canRequest) capsuleState = 'idle';

    const bgStyle: React.CSSProperties = {
      background:
        theme === 'dark'
          ? 'rgba(15,23,42,0.78)'
          : 'radial-gradient(circle at -20% -10%, rgba(194,209,255,0.44) 0%, rgba(194,209,255,0) 60%), radial-gradient(circle at 120% 110%, rgba(178,223,219,0.43) 0%, rgba(178,223,219,0) 60%), linear-gradient(180deg, #ECEFFE 0%, #E2EEEC 100%)',
      backdropFilter: theme === 'dark' ? 'blur(20px)' : undefined,
    };

    return (
      <div className="absolute inset-0 z-50 flex flex-col animate-fade-in overflow-y-auto no-scrollbar pb-24 shadow-2xl" style={bgStyle}>
        {/* Header */}
        <div
          className="sticky top-0 py-4 z-20 w-full px-4 flex items-center gap-2 border-b"
          style={{
            background: theme === 'dark' ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.40)',
            backdropFilter: 'blur(12px)',
            borderColor: palette.divider,
          }}
        >
          <button onClick={() => setSelectedDirection(null)} className="p-1.5 rounded-full" style={{ color: palette.mutedText }}>
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm font-bold ml-1" style={{ color: palette.strongText }}>나의 방향 목록</span>
        </div>

        {/* Direction title + period */}
        <div className="px-6 mt-10 mb-8 text-center">
          <p className="font-mono text-[10px] font-bold text-point-400 tracking-[0.22em] mb-3">DIRECTION</p>
          <h2 className="text-[22px] font-bold leading-snug mb-5 whitespace-pre-line px-2" style={{ color: palette.strongText }}>
            "{detail?.directionText || selectedDirection.description || selectedDirection.question}"
          </h2>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm"
            style={{ background: 'rgba(255,255,255,0.70)', borderColor: 'rgba(255,255,255,0.9)' }}
          >
            <span className="text-[10px] font-bold text-point-500 tracking-[0.22em]">PERIOD</span>
            <span className="font-mono text-[12px] font-bold text-mist-600 tabular-nums">{startDate} — {endDate}</span>
          </div>
        </div>

        {/* AI Capsule section */}
        <div className="px-5 mb-8">
          {isDetailLoading ? (
            <div className="rounded-[28px] border p-8 text-center" style={glassCard}>
              <p className="text-sm font-medium text-mist-400">방향 내용을 불러오는 중...</p>
            </div>
          ) : !detail ? (
            <div className="rounded-[28px] border p-8 text-center" style={glassCard}>
              <p className="text-[13px] text-mist-400">방향 상세를 아직 확인하지 못했어요.</p>
            </div>
          ) : isEmpty ? (
            <div className="rounded-[28px] border p-8 text-center" style={glassCard}>
              <p className="text-[14px] font-semibold text-mist-600 mb-2">아직 회고 캡슐을 만들 수 없어요</p>
              <p className="text-[13px] text-mist-400 leading-relaxed">
                이 방향에는 남겨진 기록이 없어요.<br />다음 방향에서는 한 장면만 남겨도 회고 캡슐을 만들 수 있어요.
              </p>
            </div>
          ) : capsuleState ? (
            <AISummaryCapsule
              state={capsuleState}
              unlockDate={unlockDateTs}
              recordCount={flowRecords.length}
              summary={summary ?? undefined}
              version={isDone ? `v.${(detail?.summaryRegenerationCount ?? 0) + 1} · ${startDate}` : undefined}
              failed={summaryStatus === 'FAILED'}
              regenerationRemaining={detail?.summaryRegenerationRemaining}
              submitting={isSummarySubmitting}
              feedbackSubmitting={isFeedbackSubmitting}
              liked={detail?.summaryHelpful === true}
              onLike={isDone ? handleSummaryFeedback : undefined}
              onRegenerate={isDone && (detail?.summaryRegenerationRemaining ?? 0) > 0 ? handleSummarize : undefined}
              onRequest={capsuleState === 'idle' ? handleSummarize : undefined}
            />
          ) : null}
          {detailError && (
            <div className="mt-3 p-4 rounded-2xl border" style={glassCard}>
              <p className="text-[13px] text-mist-400">{detailError}</p>
            </div>
          )}
        </div>

        {/* Recorded Flows */}
        <div className="px-5 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-[3px] h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #C4B5FD, #A78BFA)' }} />
            <span className="text-[11px] font-bold text-mist-500 uppercase tracking-[0.18em]">Recorded Flows</span>
          </div>
          <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-point-400">
            {flowRecords.length} / {flowRecords.length}
          </span>
        </div>

        <div className="px-5 flex flex-col gap-3 mb-6">
          {flowRecords.length === 0 ? (
            <div className="text-center py-10 rounded-[24px] border" style={glassCard}>
              <p className="text-sm text-mist-400">기록된 궤적이 없습니다.</p>
            </div>
          ) : (
            flowRecords.map((record, idx) => {
              const mood = record.moodText;
              const moodStyle = mood ? MOOD_CHIP_STYLE[mood] : undefined;
              return (
                <article key={record.recordId} className="rounded-[24px] border p-5" style={glassCard}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] font-bold text-mist-400 tracking-wider">
                      {new Date(`${record.date}T00:00:00`).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </span>
                    <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-point-400">
                      №{String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 mb-2">
                    {mood && moodStyle && (
                      <span
                        className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold leading-none"
                        style={{ background: moodStyle.bg, borderColor: moodStyle.border, color: moodStyle.text }}
                      >
                        {mood}
                      </span>
                    )}
                    {record.preview && (
                      <p className="text-[14px] font-semibold text-mist-600 leading-[1.65]">{record.preview}</p>
                    )}
                  </div>
                  {record.oneWordText && (
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-[9px] font-bold text-mist-400 tracking-[0.16em] uppercase">한 단어</span>
                      <span className="w-3 h-px bg-mist-200 self-center" />
                      <span className="text-[13px] font-semibold text-mist-600 italic">"{record.oneWordText}"</span>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

      </div>
    );
  }

  // ─────────────── Trail List View ───────────────
  const sortedDirections = [...pastDirections].sort((a, b) => b.createdAt - a.createdAt);
  // Height ends just below the last marker's card — no extra blank space
  const totalHeight =
    sortedDirections.length === 0
      ? 200
      : TRAIL_PAD + (sortedDirections.length - 1) * SLOT_H + Math.round(SLOT_H / 2) + 300;

  const bgStyle: React.CSSProperties = {};

  return (
    <div className="animate-fade-in pt-2 pb-0 h-full flex flex-col relative w-full">
      <div className="flex items-center gap-2 mb-2 pl-1 px-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full transition-colors active:scale-95" style={{ color: palette.faintText }}>
          <ChevronLeft size={24} />
        </button>
      </div>

      <PageHeader title="지나온 방향들" subtitle="걸어온 곡선들이 온전히 당신만의 궤적이 됩니다." />

      <div className="flex-1 overflow-y-auto no-scrollbar relative pb-4" style={{ background: 'var(--qp-outside-bg)' }}>
        {sortedDirections.length === 0 ? (
          <div className="text-center py-20 opacity-60 px-6">
            <p className="font-medium text-mist-400">아직 지나온 길(방향)이 없습니다.</p>
          </div>
        ) : (
          <div className="relative max-w-sm mx-auto w-full px-4">

            {/* "지금" label */}
            <div className="flex justify-center pt-4 pb-5 relative z-10">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-sm"
                style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.9)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-point-400" />
                <span className="font-mono text-[10px] font-bold text-point-500 tracking-[0.18em]">지금</span>
              </div>
            </div>

            {/* Trail container */}
            <div className="relative" style={{ height: totalHeight }}>
              <TrailSVG count={sortedDirections.length} totalHeight={totalHeight} />

              {sortedDirections.map((dir, index) => {
                const isLeftMarker = index % 2 === 0;
                // Center card vertically on its marker pin
                const cardTop = TRAIL_PAD + index * SLOT_H + Math.round(SLOT_H / 2) - 80;

                const flowRecords = records.filter((r) => {
                  if (r.isHidden) return false;
                  if (r.pathId && dir.id) return r.pathId === dir.id;
                  return r.directionQuestion === dir.question;
                });
                const count = flowRecords.length;
                const dayDiff = Math.max(1, Math.ceil(((dir.endedAt || Date.now()) - dir.createdAt) / (1000 * 60 * 60 * 24)));
                const moodCounts = flowRecords.reduce((acc, r) => {
                  if (r.moodCode) acc[r.moodCode] = (acc[r.moodCode] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
                const moodStyle = topMood ? MOOD_CHIP_STYLE[topMood] : undefined;
                const dirNumber = String(sortedDirections.length - index).padStart(2, '0');

                const chipBase: React.CSSProperties = theme === 'dark'
                  ? { background: palette.cardBgSoft, border: `1px solid ${palette.border}`, boxShadow: undefined }
                  : { background: 'white', border: '1px solid rgba(203,210,217,0.7)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(82,96,109,0.05)' };

                return (
                  <article
                    key={dir.id}
                    className="absolute w-[78%] cursor-pointer rounded-[26px] p-5 border transition-transform hover:scale-[1.02] active:scale-[0.99]"
                    style={{
                      top: cardTop,
                      ...(isLeftMarker ? { right: 0 } : { left: 0 }),
                      ...glassCard,
                    }}
                    onClick={() => setSelectedDirection(dir)}
                  >
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[12px] font-semibold text-mist-500 tabular-nums">
                        {new Date(dir.createdAt).toLocaleDateString()} — {dir.endedAt ? new Date(dir.endedAt).toLocaleDateString() : '현재'}
                      </span>
                      <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-point-400">№{dirNumber}</span>
                    </div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="w-[3px] h-[14px] rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #C4B5FD, #A78BFA)' }} />
                      <h3 className="text-[16px] font-bold leading-snug line-clamp-2" style={{ color: palette.strongText }}>
                        {dir.description || dir.question}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={chipBase}>
                        <span className="text-[11px] font-semibold text-mist-500">기록</span>
                        <span className="text-[14px] font-bold text-point-500 tabular-nums leading-none">{count}개</span>
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={chipBase}>
                        <span className="text-[11px] font-semibold text-mist-500">기간</span>
                        <span className="text-[14px] font-bold tabular-nums leading-none" style={{ color: palette.strongText }}>{dayDiff}일</span>
                      </span>
                      {topMood && moodStyle && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-bold leading-none"
                          style={{ background: moodStyle.bg, borderColor: moodStyle.border, color: moodStyle.text }}
                        >
                          {topMood}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
