import React from 'react';
import { Record as RecordType } from '../../types';
import { WaterDropCharacter } from '../WaterDropCharacter';

interface CalendarTabProps {
  calendarCells: Array<{ type: 'empty' } | { type: 'day'; day: number; record?: RecordType }>;
  targetMonth: number;
  targetYear: number;
  onSelectRecord: (record: RecordType) => void;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/* Mood → background tint (subtle fill for the cell) */
const MOOD_BG: Record<string, string> = {
  포근: '#F5F3FF',
  멍함: '#F1F5F9',
  반짝: '#EEF2FF',
  잔잔: '#EFF6FF',
  버팀: '#F0FDF4',
  두근: '#FFF1F2',
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

const EmptyCalendar: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
    <WaterDropCharacter size={78} mood="neutral" tone="default" animate={false} className="mb-1" />
    <p className="text-sm font-bold text-mist-600 mb-2 mt-2">이번 달 기록이 없어요</p>
    <p className="text-[12px] text-mist-400 leading-relaxed">
      기록을 시작하면 달력에서<br />무드와 흐름을 한눈에 볼 수 있어요.
    </p>
  </div>
);

export const CalendarTab: React.FC<CalendarTabProps> = ({
  calendarCells,
  targetMonth,
  targetYear,
  onSelectRecord,
}) => {
  const today = new Date();
  const hasAnyRecord = calendarCells.some(
    (c) => c.type === 'day' && c.record,
  );

  if (!hasAnyRecord) return <EmptyCalendar />;

  return (
    <div className="px-4 pb-6">
      {/* Calendar grid */}
      <div className="bg-white/80 rounded-[2rem] border border-white/70 shadow-sm overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 bg-mist-50/60 border-b border-mist-100/50">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[11px] font-bold text-mist-400 py-3 tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-mist-100/30 p-px">
          {calendarCells.map((cell, index) => {
            if (cell.type === 'empty') {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square bg-white/40"
                />
              );
            }

            const { day, record } = cell;
            const isToday =
              day === today.getDate() &&
              targetMonth === today.getMonth() &&
              targetYear === today.getFullYear();

            const moodCode = record?.moodCode;
            const bgColor = moodCode ? MOOD_BG[moodCode] : undefined;
            const dotColor = moodCode ? MOOD_DOT[moodCode] : undefined;
            const moodLabel = moodCode ? MOOD_LABEL[moodCode] : undefined;

            return (
              <button
                key={`day-${day}`}
                type="button"
                disabled={!record}
                onClick={() => record && onSelectRecord(record)}
                style={record && bgColor ? { backgroundColor: bgColor } : undefined}
                className={[
                  'aspect-square flex flex-col items-center justify-between py-1.5 px-0.5 relative transition-all duration-200',
                  record
                    ? 'cursor-pointer hover:brightness-95 active:scale-95'
                    : 'bg-white/70 cursor-default',
                  isToday ? 'ring-2 ring-inset ring-point-400' : '',
                ].join(' ')}
              >
                {/* Date number */}
                <span
                  className={[
                    'text-[11px] font-bold leading-none',
                    record ? 'text-mist-700' : 'text-mist-300',
                    isToday ? 'text-point-500' : '',
                  ].join(' ')}
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
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        <span className="text-[10px] text-mist-400 font-bold uppercase tracking-widest mr-1">무드</span>
        {MOOD_LEGEND.map(({ code, dot }) => (
          <div key={code} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
            <span className="text-[10px] text-mist-500 font-medium">{code}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-point-400" />
          <span className="text-[10px] text-mist-500 font-medium">사진 있음</span>
        </div>
      </div>

      <p className="text-[10px] text-mist-300 mt-3 px-1 tracking-wide">
        날짜를 탭하면 해당 기록을 바로 열어볼 수 있어요.
      </p>
    </div>
  );
};
