import React from 'react';
import { Record as RecordType } from '../../types';
import { WaterDropCharacter } from '../WaterDropCharacter';
import { getThemePalette, useResolvedTheme } from '../../theme';

interface CalendarTabProps {
  calendarCells: Array<{ type: 'empty' } | { type: 'day'; day: number; record?: RecordType }>;
  targetMonth: number;
  targetYear: number;
  onSelectRecord: (record: RecordType) => void;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const MOOD_BG_LIGHT: Record<string, string> = {
  포근: '#F5F3FF',
  멍함: '#F1F5F9',
  반짝: '#FFFBEB',
  잔잔: '#EFF6FF',
  버팀: '#F0FDF4',
  두근: '#FFF1F2',
};

const MOOD_BG_DARK: Record<string, string> = {
  포근: 'rgba(91,33,182,0.22)',
  멍함: 'rgba(71,85,105,0.28)',
  반짝: 'rgba(180,83,9,0.18)',
  잔잔: 'rgba(30,64,175,0.22)',
  버팀: 'rgba(21,128,61,0.22)',
  두근: 'rgba(190,24,93,0.20)',
};

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

const NoRecordsGuide: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="flex flex-col items-center justify-center py-6 px-6 text-center animate-fade-in">
      <p className="text-sm font-bold mb-1.5 mt-2 tracking-tight" style={{ color: palette.strongText }}>이번 달 기록이 아직 없어요</p>
      <p className="text-[11px] leading-[1.6] opacity-80 font-medium" style={{ color: palette.mutedText }}>
        기록을 시작하면 이곳에서 당신의 무드와 흐름을<br />한눈에 매일매일 확인할 수 있습니다.
      </p>
    </div>
  );
};

const TapGuide: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="flex flex-col items-center justify-center py-5 px-6 text-center animate-fade-in">
      <p className="text-[11px] font-bold mb-1.5 opacity-90 tracking-wide uppercase" style={{ color: palette.mutedText }}>Your Mood Journey</p>
      <p className="text-[10px] leading-relaxed tracking-wide font-medium" style={{ color: palette.mutedText }}>
        날짜를 탭하면 해당 기록을 바로 열어볼 수 있어요.
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
  const moodBgMap = theme === 'dark' ? MOOD_BG_DARK : MOOD_BG_LIGHT;
  const today = new Date();
  const hasAnyRecord = calendarCells.some(
    (c) => c.type === 'day' && c.record,
  );

  return (
    <div className="px-4 pb-12">
      {hasAnyRecord ? <TapGuide /> : <NoRecordsGuide />}
      
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

        {/* Day cells — circle-based, no grid lines */}
        <div className="grid grid-cols-7 px-3 pb-5 gap-y-0.5">
          {calendarCells.map((cell, index) => {
            if (cell.type === 'empty') {
              return <div key={`empty-${index}`} className="h-12" />;
            }

            const { day, record } = cell;
            const isToday =
              day === today.getDate() &&
              targetMonth === today.getMonth() &&
              targetYear === today.getFullYear();

            const moodCode = record?.moodCode;
            const bgColor = moodCode ? moodBgMap[moodCode] : undefined;
            const dotColor = moodCode ? MOOD_DOT[moodCode] : undefined;
            const moodLabel = moodCode ? MOOD_LABEL[moodCode] : undefined;

            return (
              <button
                key={`day-${day}`}
                type="button"
                disabled={!record}
                onClick={() => record && onSelectRecord(record)}
                className="flex flex-col items-center gap-0.5 h-12 justify-center relative"
              >
                {/* Circle indicator */}
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center relative transition-all duration-200',
                    record ? 'active:scale-90' : '',
                    isToday && !record ? 'ring-[1.5px] ring-point-400' : '',
                  ].join(' ')}
                  style={{
                    background: record && bgColor ? bgColor : 'transparent',
                    boxShadow: isToday && record ? `0 0 0 2px ${dotColor || '#A78BFA'}` : undefined,
                  }}
                >
                  <span
                    className="text-[13px] leading-none tabular-nums select-none"
                    style={{
                      fontWeight: record || isToday ? 700 : 400,
                      color: record
                        ? dotColor || palette.strongText
                        : isToday
                          ? '#7C3AED'
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

                {/* Mood label */}
                {moodLabel && dotColor && (
                  <span
                    className="text-[8px] font-bold leading-none tracking-wide"
                    style={{ color: dotColor }}
                  >
                    {moodLabel}
                  </span>
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
