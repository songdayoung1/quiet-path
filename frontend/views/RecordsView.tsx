import React, { useState, useMemo } from 'react';
import { Record as RecordType, Direction } from '../types';
import { MoodSticker } from '../components/UI';
import { Calendar, Image as ImageIcon, BookOpenText, ChevronLeft, ChevronRight } from 'lucide-react';
import { CharacterTone } from '../components/WaterDropCharacter';
import { RecordDetailDiary } from '../components/RecordDetailDiary';

import { AlbumTab } from '../components/records/AlbumTab';
import { RecordsListTab } from '../components/records/RecordsListTab';
import { CalendarTab } from '../components/records/CalendarTab';
import { getThemePalette, useResolvedTheme } from '../theme';

interface RecordsViewProps {
  records: RecordType[];
  currentDirection: Direction | null;
  pastDirections: Direction[];
  onUpdateRecord: (record: RecordType) => void;
  hasLoggedToday: boolean;
  onLogClick: () => void;
  accessToken?: string | null;
  onLoginRequired: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  records,
  currentDirection,
  onUpdateRecord,
  accessToken,
  onLoginRequired,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
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
    const pageNumber = activeRecords.findIndex((r) => r.id === record.id) + 1;
    return (
      <div className="relative min-h-screen">
        <RecordDetailDiary
          record={record}
          pageNumber={pageNumber > 0 ? pageNumber : 1}
          onClose={() => setSelectedRecordForDetail(null)}
          onHide={() => {
            onUpdateRecord({ ...record, isHidden: true });
            setSelectedRecordForDetail(null);
          }}
        />
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
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: palette.strongText }}>
              {targetYear}년 {targetMonth + 1}월의 궤적
            </h1>
            <p className="text-sm mt-1" style={{ color: palette.mutedText }}>이번 달의 기록들을 돌아봅니다.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full px-2 py-2 shadow-sm border" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
            <button
              onClick={() => canGoPrevMonth && setSelectedMonthDate(new Date(targetYear, targetMonth - 1, 1))}
              disabled={!canGoPrevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: palette.mutedText }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-bold tracking-wide min-w-[40px] text-center" style={{ color: palette.mutedText }}>
              {targetMonth + 1}월
            </span>
            <button
              onClick={() => canGoNextMonth && setSelectedMonthDate(new Date(targetYear, targetMonth + 1, 1))}
              disabled={!canGoNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: palette.mutedText }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {/* Records Card */}
          <div className="p-4 rounded-[2rem] border shadow-sm flex flex-col items-center min-h-[105px]" style={{ background: palette.cardBgSoft, borderColor: palette.border }}>
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: palette.faintText }}>Records</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              <span className="text-3xl font-bold text-point-500 leading-none">{monthlyRecords.length}</span>
            </div>
          </div>
          
          {/* Photos Card */}
          <div className="p-4 rounded-[2rem] border shadow-sm flex flex-col items-center min-h-[105px]" style={{ background: palette.cardBgSoft, borderColor: palette.border }}>
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: palette.faintText }}>Photos</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              <div className="relative flex items-baseline">
                <span className="text-3xl font-bold leading-none" style={{ color: palette.strongText }}>{photoRecords.length}</span>
                {photoCoverage > 0 && (
                  <span className="absolute left-full ml-1 bottom-0.5 text-[10px] font-bold whitespace-nowrap" style={{ color: palette.faintText }}>
                    {photoCoverage}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Mood Card */}
          <div className="p-4 rounded-[2rem] border shadow-sm flex flex-col items-center min-h-[105px]" style={{ background: palette.cardBgSoft, borderColor: palette.border }}>
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: palette.faintText }}>Top Mood</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              {topMoods.length > 0 ? (
                topMoods.map(([code]) => (
                  <MoodSticker key={code} code={code} className="scale-90 opacity-100" />
                ))
              ) : (
                <span className="text-sm" style={{ color: palette.faintText }}>-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="px-4 mb-6">
        <div className="rounded-[2rem] p-1.5 border shadow-sm grid grid-cols-3 gap-1" style={{ background: palette.tabBg, borderColor: palette.border }}>
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
              className="rounded-full px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-1.5"
              style={{
                background: activeTab === id ? palette.activeTabBg : 'transparent',
                color: activeTab === id ? palette.activeTabText : palette.mutedText,
                boxShadow: activeTab === id ? palette.shadow : 'none',
              }}
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
          accessToken={accessToken}
          onLoginRequired={onLoginRequired}
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
