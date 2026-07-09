import React from 'react';
import { Record as RecordType } from '../../types';
import { getThemePalette, useResolvedTheme } from '../../theme';
import { WaterDropCharacter, type CharacterMood } from '../WaterDropCharacter';

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

const MOOD_LEGEND = [
  { code: '포근', dot: MOOD_DOT['포근'] },
  { code: '반짝', dot: MOOD_DOT['반짝'] },
  { code: '잔잔', dot: MOOD_DOT['잔잔'] },
  { code: '버팀', dot: MOOD_DOT['버팀'] },
  { code: '두근', dot: MOOD_DOT['두근'] },
  { code: '멍함', dot: MOOD_DOT['멍함'] },
];

const resolveCharacterMood = (mood?: string): CharacterMood => {
  switch (mood) {
    case '잔잔':
      return 'CALM';
    case '반짝':
      return 'SPARKLE';
    case '두근':
      return 'EXCITED';
    case '버팀':
      return 'HOLDING';
    case '멍함':
      return 'BLANK';
    case '포근':
    default:
      return 'COZY';
  }
};

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
  const paddedCalendarCells = [...calendarCells];

  while (paddedCalendarCells.length % 7 !== 0) {
    paddedCalendarCells.push({ type: 'empty' });
  }

  const rowCount = paddedCalendarCells.length / 7;

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

        {/* Day cells */}
        <div className="mx-3 mb-5 mt-1 overflow-hidden rounded-[1.35rem]">
          <div className="grid grid-cols-7">
          {paddedCalendarCells.map((cell, index) => {
            const colIndex = index % 7;
            const rowIndex = Math.floor(index / 7);
            const isLastCol = colIndex === 6;
            const isLastRow = rowIndex === rowCount - 1;
            const cellBorderStyle: React.CSSProperties = {
              background: palette.cardBg,
              borderRight: isLastCol ? 'none' : `1px solid ${palette.divider}`,
              borderBottom: isLastRow ? 'none' : `1px solid ${palette.divider}`,
            };

            if (cell.type === 'empty') {
              return <div key={`empty-${index}`} className="h-[62px]" style={cellBorderStyle} />;
            }

            const { day, record } = cell;
            const isToday =
              day === today.getDate() &&
              targetMonth === today.getMonth() &&
              targetYear === today.getFullYear();

            const moodCode = record?.moodCode;
            const dotColor = moodCode ? MOOD_DOT[moodCode] : undefined;
            const mascotMood = moodCode ? resolveCharacterMood(moodCode) : undefined;
            const showMascot = !!record && !!mascotMood;
            const isTodayRecord = isToday && showMascot;

            return (
              <div key={`day-${day}`} className="relative h-[62px]" style={cellBorderStyle}>
                <button
                  type="button"
                  disabled={!record}
                  onClick={() => record && onSelectRecord(record)}
                  aria-label={record ? `${targetMonth + 1}월 ${day}일 ${moodCode ?? ''} 기록 보기` : `${targetMonth + 1}월 ${day}일`}
                  className="group absolute inset-0 transition-all duration-200 active:scale-95 disabled:cursor-default"
                >
                  {isToday && (
                    <div
                      aria-hidden
                      className="absolute inset-0 border-[1.5px]"
                      style={{
                        borderColor: dotColor || '#A78BFA',
                        boxShadow: `inset 0 0 0 1px ${(dotColor || '#A78BFA')}22`,
                      }}
                    />
                  )}

                  <span
                    className="absolute left-1.5 top-1.5 z-20 text-[9px] font-bold leading-none tabular-nums transition-opacity duration-200 group-hover:opacity-100"
                    style={{
                      color: isToday
                        ? showMascot
                          ? '#334155'
                          : '#334155'
                        : showMascot
                          ? palette.strongText
                          : palette.faintText,
                      opacity: isToday ? 1 : showMascot ? 0.78 : 0.9,
                    }}
                  >
                    {day}
                  </span>

                  {showMascot ? (
                    <>
                      <div
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: isTodayRecord ? 42 : 40,
                            height: isTodayRecord ? 42 : 40,
                            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.92) 0%, ${dotColor}20 58%, ${dotColor}10 100%)`,
                            boxShadow: `0 6px 14px ${dotColor}18`,
                          }}
                        />
                        <WaterDropCharacter
                          size={isTodayRecord ? 34 : isToday ? 38 : 36}
                          mood={mascotMood}
                          animate={false}
                          className={isTodayRecord ? '' : 'scale-105'}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="sr-only">
                      {record ? `${day}일 기록 있음` : `${day}일`}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 opacity-80">
        <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: palette.mutedText }}>무드</span>
        {MOOD_LEGEND.map(({ code }) => (
          <div key={code} className="flex items-center gap-1">
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <WaterDropCharacter size={16} mood={resolveCharacterMood(code)} animate={false} />
            </span>
            <span className="text-[10px] font-medium" style={{ color: palette.mutedText }}>{code}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
