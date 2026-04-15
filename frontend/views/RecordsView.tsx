import React, { useState, useMemo } from 'react';
import { Record as RecordType, Direction } from '../types';
import { Card, MoodSticker } from '../components/UI';
import { Globe2, Pin, Calendar, Image as ImageIcon, BookOpenText, ChevronLeft, ChevronRight } from 'lucide-react';
import { CharacterTone } from '../components/WaterDropCharacter';

import { AlbumTab } from '../components/records/AlbumTab';
import { RecordsListTab } from '../components/records/RecordsListTab';
import { CalendarTab } from '../components/records/CalendarTab';

interface RecordsViewProps {
  records: RecordType[];
  currentDirection: Direction | null;
  pastDirections: Direction[];
  onUpdateRecord: (record: RecordType) => void;
  hasLoggedToday: boolean;
  onLogClick: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  records,
  currentDirection,
  onUpdateRecord,
}) => {
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<RecordType | null>(null);
  const [activeTab, setActiveTab] = useState<'album' | 'records' | 'calendar'>('album');

  const activeRecords = useMemo(
    () => records.filter((r) => !r.isHidden).sort((a, b) => b.timestamp - a.timestamp),
    [records],
  );

  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(() => {
    const ref = activeRecords[0] ? new Date(activeRecords[0].timestamp) : new Date();
    return new Date(ref.getFullYear(), ref.getMonth(), 1);
  });

  const targetMonth = selectedMonthDate.getMonth();
  const targetYear = selectedMonthDate.getFullYear();

  const monthlyRecords = useMemo(
    () =>
      activeRecords.filter((r) => {
        const d = new Date(r.timestamp);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      }),
    [activeRecords, targetMonth, targetYear],
  );

  /* ── Stats ── */
  const moodCounts = monthlyRecords.reduce(
    (acc, r) => {
      if (r.moodCode) acc[r.moodCode] = (acc[r.moodCode] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 1);

  const photoRecords = useMemo(
    () =>
      monthlyRecords
        .filter((r) => r.imageUrl)
        .sort((a, b) => a.timestamp - b.timestamp),
    [monthlyRecords],
  );
  const displayedPhotoRecords = photoRecords.length > 12 ? photoRecords.slice(-12) : photoRecords;

  const photoCoverage =
    monthlyRecords.length > 0
      ? Math.round((photoRecords.length / monthlyRecords.length) * 100)
      : 0;

  /* ── Month navigation bounds ── */
  const firstRecordMonth = useMemo(() => {
    if (!activeRecords.length) return null;
    const d = new Date(activeRecords[activeRecords.length - 1].timestamp);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [activeRecords]);

  const latestRecordMonth = useMemo(() => {
    if (!activeRecords.length) return null;
    const d = new Date(activeRecords[0].timestamp);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [activeRecords]);

  const canGoPrevMonth = firstRecordMonth !== null && selectedMonthDate.getTime() > firstRecordMonth.getTime();
  const canGoNextMonth = latestRecordMonth !== null && selectedMonthDate.getTime() < latestRecordMonth.getTime();

  /* ── Calendar grid ── */
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(targetYear, targetMonth, 1).getDay();

  const monthlyRecordMap = useMemo(() => {
    const map = new Map<number, RecordType>();
    monthlyRecords.forEach((r) => map.set(new Date(r.timestamp).getDate(), r));
    return map;
  }, [monthlyRecords]);

  const calendarCells = useMemo(() => {
    const cells: Array<{ type: 'empty' } | { type: 'day'; day: number; record?: RecordType }> = [];
    for (let i = 0; i < firstDayOfMonth; i++) cells.push({ type: 'empty' });
    for (let day = 1; day <= daysInMonth; day++)
      cells.push({ type: 'day', day, record: monthlyRecordMap.get(day) });
    return cells;
  }, [daysInMonth, firstDayOfMonth, monthlyRecordMap]);

  /* ─────────────────────────────────────────
     DETAIL VIEW
  ───────────────────────────────────────── */
  if (selectedRecordForDetail) {
    const record = selectedRecordForDetail;
    return (
      <div className="pb-28 animate-slide-up pt-4 relative z-10 min-h-screen bg-[#F5F7FA]">
        <div className="px-4 flex justify-between items-center mb-6">
          <button
            onClick={() => setSelectedRecordForDetail(null)}
            className="text-mist-500 hover:text-mist-600 transition-colors p-2 text-sm font-bold"
          >
            닫기
          </button>
          <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest">
            {new Date(record.timestamp).toLocaleDateString()}
          </span>
          <div className="w-10" />
        </div>

        <div className="px-5 flex flex-col gap-6 max-w-md mx-auto">
          <div className="text-center">
            {record.moodCode && (
              <MoodSticker code={record.moodCode} className="mb-4 scale-125 hover:scale-125 pointer-events-none" />
            )}
            {record.action && (
              <h2 className="text-2xl font-bold text-mist-600 mt-2 break-keep">{record.action}</h2>
            )}
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-mist-400">
              {record.isShared && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 shadow-sm border border-mist-100">
                  <span className="text-point-400">●</span> 공유됨
                </span>
              )}
              {record.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 shadow-sm border border-mist-100">
                  <Pin size={12} className="text-mist-400" /> 기억할 장면
                </span>
              )}
            </div>
          </div>

          {record.imageUrl && (
            <div className="w-full rounded-3xl overflow-hidden shadow-sm border border-mist-100">
              <img src={record.imageUrl} alt="Scene" className="w-full object-cover aspect-[4/5] max-h-96" />
            </div>
          )}

          {record.oneWordText && (
            <div className="bg-white/80 p-6 rounded-3xl shadow-sm border border-white">
              <p className="text-xs text-point-500 font-bold mb-3 uppercase tracking-wide">오늘을 한 단어로 표현한다면?</p>
              <p className="text-mist-600 text-[15px] leading-relaxed whitespace-pre-line">{record.oneWordText}</p>
            </div>
          )}

          {record.tomorrowText && (
            <div className="bg-white/50 p-6 rounded-3xl shadow-sm border border-white">
              <p className="text-xs text-mist-400 font-bold mb-3 uppercase tracking-wide">내일의 한 걸음</p>
              <p className="text-mist-600 text-[14px] leading-relaxed">{record.tomorrowText}</p>
            </div>
          )}

          <div className="text-center mt-6 mb-4">
            <p className="text-[10px] text-mist-300 tracking-wide">
              이 기록은 당신의 궤적에 안전하게 보관되어 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     MONTHLY VIEW
  ───────────────────────────────────────── */
  return (
    <div className="pb-28 animate-slide-up pt-4 relative z-10 min-h-screen">

      {/* ── Header: 월간 요약 타이틀 + 월 네비게이션 ── */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-mist-600 tracking-tight">
              {targetYear}년 {targetMonth + 1}월의 궤적
            </h1>
            <p className="text-mist-400 text-sm mt-1">이번 달의 기록들을 돌아봅니다.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-2 shadow-sm border border-white/70">
            <button
              onClick={() => canGoPrevMonth && setSelectedMonthDate(new Date(targetYear, targetMonth - 1, 1))}
              disabled={!canGoPrevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-mist-500 hover:bg-mist-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-bold text-mist-500 tracking-wide min-w-[40px] text-center">
              {targetMonth + 1}월
            </span>
            <button
              onClick={() => canGoNextMonth && setSelectedMonthDate(new Date(targetYear, targetMonth + 1, 1))}
              disabled={!canGoNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-mist-500 hover:bg-mist-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {/* Records Card */}
          <div className="bg-white/70 p-4 rounded-[2rem] border border-white shadow-sm flex flex-col items-center min-h-[105px]">
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest text-center">Records</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              <span className="text-3xl font-bold text-point-500 leading-none">{monthlyRecords.length}</span>
            </div>
          </div>
          
          {/* Photos Card */}
          <div className="bg-white/70 p-4 rounded-[2rem] border border-white shadow-sm flex flex-col items-center min-h-[105px]">
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest text-center">Photos</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              <div className="relative flex items-baseline">
                <span className="text-3xl font-bold text-mist-600 leading-none">{photoRecords.length}</span>
                {photoCoverage > 0 && (
                  <span className="absolute left-full ml-1 bottom-0.5 text-[10px] text-mist-300 font-bold whitespace-nowrap">
                    {photoCoverage}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Mood Card */}
          <div className="bg-white/70 p-4 rounded-[2rem] border border-white shadow-sm flex flex-col items-center min-h-[105px]">
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest text-center">Top Mood</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              {topMoods.length > 0 ? (
                topMoods.map(([code]) => (
                  <MoodSticker key={code} code={code} className="scale-90 opacity-100" />
                ))
              ) : (
                <span className="text-sm text-mist-300">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="px-4 mb-6">
        <div className="bg-white/70 rounded-[2rem] p-1.5 border border-white shadow-sm grid grid-cols-3 gap-1">
          {(
            [
              { id: 'album', icon: <ImageIcon size={15} />, label: '앨범' },
              { id: 'records', icon: <BookOpenText size={15} />, label: '기록' },
              { id: 'calendar', icon: <Calendar size={15} />, label: '캘린더' },
            ] as const
          ).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`rounded-full px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === id
                  ? 'bg-white text-point-500 shadow-sm'
                  : 'text-mist-400 hover:text-mist-600'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'album' && (
        <AlbumTab
          photoRecords={displayedPhotoRecords}
          mascotTone={(topMoods[0]?.[0] || 'default') as CharacterTone}
          onSelectRecord={setSelectedRecordForDetail}
        />
      )}
      {activeTab === 'records' && (
        <RecordsListTab
          records={monthlyRecords}
          onSelectRecord={setSelectedRecordForDetail}
          onUpdateRecord={onUpdateRecord}
        />
      )}
      {activeTab === 'calendar' && (
        <CalendarTab
          calendarCells={calendarCells}
          targetMonth={targetMonth}
          targetYear={targetYear}
          onSelectRecord={setSelectedRecordForDetail}
        />
      )}
    </div>
  );
};
