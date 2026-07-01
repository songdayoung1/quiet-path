import React from 'react';
import { Record as RecordType } from '../../types';
import { getThemePalette, useResolvedTheme } from '../../theme';

interface CalendarTabProps {
  calendarCells: Array<{ type: 'empty' } | { type: 'day'; day: number; record?: RecordType }>;
  targetMonth: number;
  targetYear: number;
  onSelectRecord: (record: RecordType) => void;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];


/* Mood → dot / accent color */
const MOOD_DOT: Record<string, string> = {
  포근: '#A78BFA',
  멍함: '#94A3B8',
  반짝: '#FBBF24',
  잔잔: '#60A5FA',
  버팀: '#34D399',
  두근: '#FB7185',
};

/* Mood → short display label */
const MOOD_LABEL: Record<string, string> = {
  포근: '포근',
  멍함: '멍함',
  반짝: '반짝',
  잔잔: '잔잔',
  버팀: '버팀',
  두근: '두근',
};

const MOOD_LEGEND = [
  { code: '포근', dot: MOOD_DOT['포근'] },
  { code: '반짝', dot: MOOD_DOT['반짝'] },
  { code: '잔잔', dot: MOOD_DOT['잔잔'] },
  { code: '버팀', dot: MOOD_DOT['버팀'] },
  { code: '두근', dot: MOOD_DOT['두근'] },
  { code: '멍함', dot: MOOD_DOT['멍함'] },
];

const CalendarGuide: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="flex flex-col items-center justify-center py-5 px-6 text-center animate-fade-in">
      <p className="text-[11px] font-bold mb-1.5 opacity-90 tracking-wide uppercase" style={{ color: palette.mutedText }}>Monthly Calendar</p>
      <p className="text-[10px] leading-relaxed tracking-wide font-medium" style={{ color: palette.mutedText }}>
        한 달의 기록 흐름을 날짜별로 차분히 살펴볼 수 있어요.
      </p>
    </div>
  );
};

export const CalendarTab: React.FC<CalendarTabProps> = ({
  calendarCells,
  targetMonth,
  targetYear,
  onSelectRecord,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const today = new Date();

  return (
    <div className="px-4 pb-12">
      <CalendarGuide />
      
      {/* Calendar grid */}
      <div className="rounded-[2rem] border shadow-sm overflow-hidden mb-6" style={{ background: palette.cardBg, borderColor: palette.border }}>
        {/* Weekday header */}
        <div className="grid grid-cols-7 pt-5 pb-2 px-3">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={label} className="text-center">
              <span
                className="text-[10px] font-bold tracking-wide"
                style={{ color: i === 0 ? '#F87171' : i === 6 ? '#60A5FA' : palette.faintText }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Subtle divider */}
        <div className="mx-4 mb-1" style={{ height: 1, background: palette.divider }} />

        {/* Day cells — number on top, mood dot below, no overlap */}
        <div className="grid grid-cols-7 px-3 pb-5">
          {calendarCells.map((cell, index) => {
            if (cell.type === 'empty') {
              return <div key={`empty-${index}`} className="h-14" />;
            }

            const { day, record } = cell;
            const isToday =
              day === today.getDate() &&
              targetMonth === today.getMonth() &&
              targetYear === today.getFullYear();

            const moodCode = record?.moodCode;
            const dotColor = moodCode ? MOOD_DOT[moodCode] : undefined;
            const moodLabel = moodCode ? MOOD_LABEL[moodCode] : undefined;

            return (
              <button
                key={`day-${day}`}
                type="button"
                disabled={!record}
                onClick={() => record && onSelectRecord(record)}
                className="flex flex-col items-center justify-center h-14 gap-1 relative active:scale-90 transition-transform duration-150"
              >
                {/* Date number — today gets filled circle, others plain */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center relative"
                  style={{
                    background: isToday ? (dotColor || '#A78BFA') : 'transparent',
                    boxShadow: isToday ? `0 2px 8px ${(dotColor || '#A78BFA')}55` : undefined,
                  }}
                >
                  <span
                    className="text-[13px] leading-none tabular-nums select-none"
                    style={{
                      fontWeight: record || isToday ? 700 : 400,
                      color: isToday
                        ? 'white'
                        : record
                          ? palette.strongText
                          : palette.faintText,
                    }}
                  >
                    {day}
                  </span>

                  {/* Photo dot */}
                  {record?.imageUrl && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-white"
                      style={{ backgroundColor: dotColor || '#A78BFA' }}
                    />
                  )}
                </div>

                {/* Mood indicator — colored dot + label below number */}
                {moodLabel && dotColor ? (
                  <div className="flex items-center gap-0.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span
                      className="text-[8px] font-bold leading-none"
                      style={{ color: dotColor }}
                    >
                      {moodLabel}
                    </span>
                  </div>
                ) : (
                  <div className="h-3" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 opacity-80">
        <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: palette.mutedText }}>무드</span>
        {MOOD_LEGEND.map(({ code, dot }) => (
          <div key={code} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
            <span className="text-[10px] font-medium" style={{ color: palette.mutedText }}>{code}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-point-400" />
          <span className="text-[10px] font-medium" style={{ color: palette.mutedText }}>사진 있음</span>
        </div>
      </div>
    </div>
  );
};
