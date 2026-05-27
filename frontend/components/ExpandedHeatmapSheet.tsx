import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { Record as RecordItem } from '../types';
import { getThemePalette, useResolvedTheme } from '../theme';
import {
  buildRecentHeatmapDays,
  buildRecordDateMap,
  countFilledHeatmapCells,
} from '../utils/heatmap';

interface ExpandedHeatmapSheetProps {
  open: boolean;
  records: RecordItem[];
  onClose: () => void;
  onGoToRecords: () => void;
}

const WEEKS = 12;
const TOTAL_CELLS = WEEKS * 7; // 84일

const MOOD_COLOR_MAP: Record<string, string> = {
  포근: 'bg-point-400',
  멍함: 'bg-mist-300',
  반짝: 'bg-lavender-400',
  잔잔: 'bg-blue-300',
  버팀: 'bg-green-400',
  두근: 'bg-rose-400',
};

const getMoodColorClass = (moodCode?: string, hasRecord?: boolean) => {
  if (!hasRecord) return '';
  if (!moodCode) return 'bg-point-300';
  return MOOD_COLOR_MAP[moodCode] || 'bg-point-300';
};

const buildSummaryCopy = (filled: number, total: number): string => {
  if (filled === 0) return '아직은 비어 있지만, 오늘부터 다시 한 줄씩.';
  const ratio = filled / total;
  if (ratio >= 0.7) return '꾸준한 결이 또렷하게 보여요.';
  if (ratio >= 0.4) return '잔잔한 흐름이 보여요.';
  if (ratio >= 0.2) return '천천히, 결이 만들어지고 있어요.';
  return '작게라도 다시 결을 만들어가요.';
};

export const ExpandedHeatmapSheet: React.FC<ExpandedHeatmapSheetProps> = ({
  open,
  records,
  onClose,
  onGoToRecords,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  const { weeks, filled } = useMemo(() => {
    const map = buildRecordDateMap(records);
    const days = buildRecentHeatmapDays(map, TOTAL_CELLS);
    const weekRows: typeof days[] = [];
    for (let i = 0; i < WEEKS; i += 1) {
      weekRows.push(days.slice(i * 7, i * 7 + 7));
    }
    return {
      weeks: weekRows,
      filled: countFilledHeatmapCells(days),
    };
  }, [records]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    background: theme === 'dark' ? 'rgba(15,23,42,0.68)' : 'rgba(99,102,120,0.24)',
    backdropFilter: 'blur(10px)',
  };

  const sheetStyle: React.CSSProperties = {
    background: palette.cardBgStrong,
    border: `1px solid ${palette.border}`,
    boxShadow:
      theme === 'dark'
        ? '0 -20px 50px -12px rgba(2,6,23,0.55)'
        : '0 -20px 50px -12px rgba(15,17,30,0.18)',
  };

  const ratio = Math.round((filled / TOTAL_CELLS) * 100);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in"
      style={overlayStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="쌓인 결"
    >
      <div
        className="w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-6 animate-slide-up"
        style={sheetStyle}
        onClick={(event) => event.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center mb-3">
          <div
            className="w-10 h-1.5 rounded-full"
            style={{ background: palette.divider }}
          />
        </div>

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-5 px-1">
          <div>
            <h2 className="text-base font-semibold" style={{ color: palette.strongText }}>
              쌓인 결
            </h2>
            <p className="text-xs mt-1" style={{ color: palette.mutedText }}>
              지난 {WEEKS}주의 흐름이에요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: palette.faintText, background: palette.cardBgSoft }}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 요약 라벨 */}
        <div className="flex items-baseline gap-2 px-1 mb-4">
          <span className="text-2xl font-bold text-point-500">{ratio}%</span>
          <span className="text-xs" style={{ color: palette.mutedText }}>
            {TOTAL_CELLS}일 중 {filled}일
          </span>
        </div>

        {/* 히트맵 그리드 (오래된 주 → 최신 주, 위에서 아래) */}
        <div className="flex flex-col gap-[5px] px-1 mb-5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-[5px]">
              {week.map((day, di) => {
                const color = getMoodColorClass(day.moodCode, day.hasRecord);
                return (
                  <div
                    key={di}
                    className={`
                      aspect-square rounded-md transition-all duration-300
                      ${day.hasRecord ? `${color} shadow-sm` : ''}
                      ${day.isToday ? 'ring-2 ring-point-300 ring-offset-1' : ''}
                    `}
                    style={{
                      backgroundColor: day.hasRecord ? undefined : palette.emptyCell,
                    }}
                    title={`${day.date.getMonth() + 1}/${day.date.getDate()}`}
                  >
                    {day.isToday && !day.hasRecord && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-point-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 카피 */}
        <p className="text-sm px-1 mb-5" style={{ color: palette.mutedText }}>
          {buildSummaryCopy(filled, TOTAL_CELLS)}
        </p>

        {/* CTA → RecordsView */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onGoToRecords();
          }}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-1.5 transition-transform active:scale-[0.99]"
          style={{
            background: palette.cardBgSoft,
            border: `1px solid ${palette.border}`,
            color: palette.strongText,
          }}
        >
          <span className="text-sm font-semibold">기록 전체 보러 가기</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
};
