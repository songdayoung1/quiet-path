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
  반짝: '#EEF2FF',
  잔잔: '#EFF6FF',
  버팀: '#F0FDF4',
  두근: '#FFF1F2',
};

const MOOD_BG_DARK: Record<string, string> = {
  포근: 'rgba(91,33,182,0.22)',
  멍함: 'rgba(71,85,105,0.28)',
  반짝: 'rgba(67,56,202,0.24)',
  잔잔: 'rgba(30,64,175,0.22)',
  버팀: 'rgba(21,128,61,0.22)',
  두근: 'rgba(190,24,93,0.20)',
};

/* Mood → dot / accent color */
const MOOD_DOT: Record<string, string> = {
  포근: '#A78BFA',
  멍함: '#94A3B8',
  반짝: '#818CF8',
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
        <div className="grid grid-cols-7 border-b" style={{ background: palette.cardBgSoft, borderColor: palette.divider }}>
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[11px] font-bold py-3 tracking-wide"
              style={{ color: palette.mutedText }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px p-px" style={{ background: palette.divider }}>
          {calendarCells.map((cell, index) => {
            if (cell.type === 'empty') {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square"
                  style={{ background: palette.subtleCell }}
                />
              );
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
                style={{
                  backgroundColor: record && bgColor ? bgColor : record ? palette.cardBgSoft : palette.subtleCell,
                }}
                className={[
                  'aspect-square flex flex-col items-center justify-between py-1.5 px-0.5 relative transition-all duration-200',
                  record
                    ? 'cursor-pointer hover:brightness-95 active:scale-95'
                    : 'cursor-default',
                  isToday ? 'ring-2 ring-inset ring-point-400' : '',
                ].join(' ')}
              >
                {/* Date number */}
                <span
                    className={[
                      'text-[11px] font-bold leading-none',
                    record ? '' : '',
                    isToday ? 'text-point-500' : '',
                  ].join(' ')}
                  style={{ color: isToday ? undefined : record ? palette.strongText : palette.faintText }}
                >
                  {day}
                </span>

                {/* Mood label pill */}
                {moodLabel && dotColor && (
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded-full leading-none"
                    style={{ color: dotColor, backgroundColor: `${dotColor}22` }}
                  >
                    {moodLabel}
                  </span>
                )}

                {/* Photo dot indicator */}
                {record?.imageUrl && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full shadow-sm"
                    style={{ backgroundColor: dotColor || '#A78BFA' }}
                    title="사진 있음"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 opacity-80">
        <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: palette.mutedText }}>무드</span>
        {MOOD_LEGEND.map(({ code, dot }) => (
          <div key={code} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
            <span className="text-[10px] font-medium" style={{ color: palette.mutedText }}>{code}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-point-400" />
          <span className="text-[10px] font-medium" style={{ color: palette.mutedText }}>사진 있음</span>
        </div>
      </div>
    </div>
  );
};
