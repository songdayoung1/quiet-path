import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, X, RotateCcw } from 'lucide-react';
import { Record as RecordItem } from '../types';
import { getThemePalette, useResolvedTheme } from '../theme';
import { buildRecordDateMap, toLocalDateKey } from '../utils/heatmap';

interface ExpandedHeatmapSheetProps {
  open: boolean;
  records: RecordItem[];
  onClose: () => void;
  onGoToRecords: () => void;
}

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const RECORDED_SENTINEL = '__recorded__';

const MOOD_COLOR_MAP: Record<string, string> = {
  포근: 'bg-point-300',
  멍함: 'bg-slate-400',
  반짝: 'bg-amber-300',
  잔잔: 'bg-blue-200',
  버팀: 'bg-green-300',
  두근: 'bg-rose-300',
};

// All pastel shades — use dark text for readability
const MOOD_TEXT_DARK = new Set(['포근', '멍함', '반짝', '잔잔', '버팀', '두근']);

const MOOD_LEGEND = [
  { code: '포근', color: 'bg-point-300' },
  { code: '반짝', color: 'bg-amber-300' },
  { code: '잔잔', color: 'bg-blue-200' },
  { code: '버팀', color: 'bg-green-300' },
  { code: '두근', color: 'bg-rose-300' },
  { code: '멍함', color: 'bg-slate-400' },
];

type DayCell = {
  date: Date;
  day: number;
  hasRecord: boolean;
  moodCode?: string;
  isToday: boolean;
  isFuture: boolean;
} | null;

const buildMonthGrid = (
  recordDateMap: Map<string, string>,
  year: number,
  month: number,
  todayDate: Date,
): DayCell[] => {
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toLocalDateKey(todayDate);

  const cells: DayCell[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = toLocalDateKey(date);
    const isFuture = date > todayDate;
    const rawMood = recordDateMap.get(key);
    cells.push({
      date,
      day: d,
      hasRecord: !isFuture && recordDateMap.has(key),
      moodCode: rawMood && rawMood !== RECORDED_SENTINEL ? rawMood : undefined,
      isToday: key === todayKey,
      isFuture,
    });
  }

  return cells;
};

export const ExpandedHeatmapSheet: React.FC<ExpandedHeatmapSheetProps> = ({
  open,
  records,
  onClose,
  onGoToRecords,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const emptyCellColor = theme === 'dark' ? 'rgba(51,65,85,0.92)' : 'rgba(226,232,240,0.9)';

  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

  useEffect(() => {
    if (open) {
      setSelectedYear(today.getFullYear());
      setSelectedMonth(today.getMonth());
    }
  }, [open, today]);

  const recordDateMap = useMemo(() => buildRecordDateMap(records), [records]);

  const minYear = useMemo(() => {
    const validRecords = records.filter((r) => !r.isHidden);
    if (validRecords.length === 0) return today.getFullYear();
    return Math.min(...validRecords.map((r) => new Date(r.timestamp).getFullYear()));
  }, [records, today]);

  const cells = useMemo(
    () => buildMonthGrid(recordDateMap, selectedYear, selectedMonth, today),
    [recordDateMap, selectedYear, selectedMonth, today],
  );

  const stats = useMemo(() => {
    const dayCells = cells.filter((c): c is NonNullable<DayCell> => c !== null);
    const recorded = dayCells.filter((c) => c.hasRecord).length;
    const isCurrentMonth =
      today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;
    const eligible = dayCells.length;
    const rate = eligible > 0 ? Math.round((recorded / eligible) * 100) : 0;
    return { recorded, eligible, rate, isCurrentMonth };
  }, [cells, selectedYear, selectedMonth, today]);

  const canGoPrev = !(selectedYear === minYear && selectedMonth === 0);
  const canGoNext = !(
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth()
  );

  const goPrev = useCallback(() => {
    if (selectedMonth === 0) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }, [selectedMonth]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    if (selectedMonth === 11) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }, [selectedMonth, canGoNext]);

  const goToToday = useCallback(() => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  }, [today]);

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
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, goPrev, goNext]);

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
        : '0 20px 60px -12px rgba(15,17,30,0.22)',
    maxHeight: '90vh',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center animate-fade-in"
      style={overlayStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="활동 기록"
    >
      <div
        className="w-full max-w-md md:max-w-lg rounded-t-[28px] md:rounded-[28px] flex flex-col animate-slide-up"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 px-6 pt-3">
          {/* Drag handle — mobile only */}
          <div className="flex justify-center mb-4 md:hidden">
            <div className="w-10 h-1.5 rounded-full" style={{ background: palette.divider }} />
          </div>

          {/* Title + close */}
          <div className="flex items-center justify-between mb-5 md:pt-2">
            <h2 className="text-base font-semibold" style={{ color: palette.strongText }}>
              활동 기록
            </h2>
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

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-25"
              style={{ color: palette.mutedText, background: palette.cardBgSoft }}
              aria-label="이전 달"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold tabular-nums" style={{ color: palette.strongText }}>
                {selectedYear}년 {MONTH_NAMES[selectedMonth]}
              </span>
              {!stats.isCurrentMonth && (
                <button
                  type="button"
                  onClick={goToToday}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                  style={{
                    background: 'rgba(139,92,246,0.10)',
                    border: '1px solid rgba(139,92,246,0.22)',
                    color: '#8B5CF6',
                  }}
                  aria-label="이번 달로 돌아가기"
                >
                  <RotateCcw size={9} strokeWidth={2.5} />
                  <span>현재로</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-25"
              style={{ color: palette.mutedText, background: palette.cardBgSoft }}
              aria-label="다음 달"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-point-500 tabular-nums">{stats.rate}%</span>
            <p className="text-xs font-medium" style={{ color: palette.mutedText }}>
              {stats.eligible}일 중 {stats.recorded}일 기록
            </p>
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full mb-4 overflow-hidden"
            style={{ background: emptyCellColor }}
          >
            <div
              className="h-full rounded-full bg-point-400 transition-all duration-500"
              style={{ width: `${stats.rate}%` }}
            />
          </div>

          <div style={{ borderBottom: `1px solid ${palette.divider}` }} />
        </div>

        {/* Scrollable calendar */}
        <div
          className="flex-1 overflow-y-auto px-6 pt-4 pb-4"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((label, i) => (
              <div key={label} className="text-center">
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: i === 0 ? '#F87171' : i === 6 ? '#60A5FA' : palette.faintText }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`gap-${i}`} className="aspect-square" />;

              const moodBg = cell.hasRecord
                ? (MOOD_COLOR_MAP[cell.moodCode || ''] || 'bg-point-300')
                : '';
              const textIsLight = cell.hasRecord && !MOOD_TEXT_DARK.has(cell.moodCode || '');

              return (
                <div
                  key={cell.day}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center relative
                    transition-all duration-200
                    ${cell.hasRecord ? `${moodBg} shadow-sm` : ''}
                    ${cell.isToday ? 'ring-2 ring-point-400 ring-offset-1' : ''}
                  `}
                  style={{
                    backgroundColor: cell.hasRecord
                      ? undefined
                      : cell.isFuture
                        ? 'transparent'
                        : emptyCellColor,
                    opacity: cell.isFuture ? 0.28 : 1,
                  }}
                  title={
                    `${selectedYear}년 ${selectedMonth + 1}월 ${cell.day}일` +
                    (cell.hasRecord ? ` — ${cell.moodCode || '기록됨'}` : '')
                  }
                >
                  <span
                    className="text-[11px] font-medium leading-none select-none"
                    style={{
                      color: cell.hasRecord
                        ? textIsLight
                          ? 'rgba(255,255,255,0.85)'
                          : 'rgba(30,41,59,0.7)'
                        : cell.isFuture
                          ? palette.faintText
                          : palette.mutedText,
                    }}
                  >
                    {cell.day}
                  </span>
                  {cell.isToday && !cell.hasRecord && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-point-400 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mood legend */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: emptyCellColor }} />
              <span className="text-[9px]" style={{ color: palette.faintText }}>없음</span>
            </div>
            {MOOD_LEGEND.map((m) => (
              <div key={m.code} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-sm ${m.color}`} />
                <span className="text-[9px]" style={{ color: palette.mutedText }}>{m.code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed footer CTA */}
        <div
          className="flex-shrink-0 px-6 pt-4"
          style={{
            borderTop: `1px solid ${palette.divider}`,
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          }}
        >
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
      </div>
    </div>,
    document.body,
  );
};
