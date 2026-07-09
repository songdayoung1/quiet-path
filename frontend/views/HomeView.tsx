import React, { useState } from 'react';
import { AppState } from '../types';
import { MoodSticker, SoftButton } from '../components/UI';
import { History, BookOpen } from 'lucide-react';
import { getThemePalette, useResolvedTheme } from '../theme';

// Import New Components
import { TodaysCard } from '../components/TodaysCard';
import { CurrentPathStrip } from '../components/CurrentPathStrip';
import { ProgressBand } from '../components/ProgressBand';
import { MemoryPreviewStrip } from '../components/MemoryPreviewStrip';
import { ExpandedHeatmapSheet } from '../components/ExpandedHeatmapSheet';
import { getCurrentPathRecords, getCurrentPathTodayRecord, hasLoggedTodayForCurrentPath } from '../utils/recordScope';
import {
  HeroSkeleton,
  TodaysCardSkeleton,
  CurrentPathStripSkeleton,
  ProgressBandSkeleton,
  MemoryPreviewStripSkeleton,
} from '../components/HomeSkeleton';

interface HomeViewProps {
  state: AppState;
  onLogClick: () => void;
  onStartDirectionClick: () => void;
  onHistoryClick: () => void;
  onRecordsClick: () => void;
  isHomeDataLoading?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({ state, onLogClick, onStartDirectionClick, onHistoryClick, onRecordsClick, isHomeDataLoading = false }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [isHeatmapSheetOpen, setIsHeatmapSheetOpen] = useState(false);
  const { currentDirection, records } = state;
  const hasActiveDirection = !!currentDirection;
  const sortedRecords = [...records].filter(r => !r.isHidden).sort((a, b) => b.timestamp - a.timestamp);
  const effectiveHasLoggedToday = hasActiveDirection && hasLoggedTodayForCurrentPath(records, currentDirection);
  const todayRecord = hasActiveDirection ? getCurrentPathTodayRecord(records, currentDirection) : null;
  const visibleTodayRecord = hasActiveDirection ? todayRecord : null;
  
  const lastRecord = sortedRecords[0]; // Kept for top right mood indicator

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthlyRecords = sortedRecords.filter(r => {
    const d = new Date(r.timestamp);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyRecordedDays = new Set(
    monthlyRecords.map((record) => {
      const date = new Date(record.timestamp);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    })
  ).size;
  
  const currentPathRecords = currentDirection
    ? getCurrentPathRecords(sortedRecords, currentDirection)
    : [];
  const currentPathRecordCount = currentPathRecords.length;
  const currentPathStartDate = currentDirection ? new Date(currentDirection.createdAt) : null;
  
  const today = new Date();
  
  const monthlyConsistency = monthlyRecordedDays > 0 ? Math.round((monthlyRecordedDays / daysInCurrentMonth) * 100) : 0;
  
  const currentPathConsistency = currentPathRecords.length > 0 && currentPathStartDate
    ? Math.round(
        (currentPathRecords.length /
          Math.max(
            1,
            Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(currentPathStartDate.getFullYear(), currentPathStartDate.getMonth(), currentPathStartDate.getDate()).getTime()) / (1000 * 60 * 60 * 24)) + 1
          )) *
          100
      )
    : 0;
    
  const monthlyMoodCounts = monthlyRecords.reduce((acc, record) => {
    if (record.moodCode) acc[record.moodCode] = (acc[record.moodCode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topMood = Object.entries(monthlyMoodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const handleLogClick = () => {
    if (!hasActiveDirection) {
      onStartDirectionClick();
      return;
    }
    onLogClick();
  };

  const heroTitle = !hasActiveDirection
    ? '지금은 잠시 쉬고 있어요.'
    : effectiveHasLoggedToday
      ? '오늘도 방향을 찾았네요.'
      : '오늘은 어디로 움직였나요?';

  const heroSubtitle = !hasActiveDirection
    ? '원할 때 새 방향을 시작해요.'
    : effectiveHasLoggedToday
      ? '기록이 안전하게 쌓이고 있어요.'
      : '하루를 돌아보며 방향을 만들어가요.';

  if (isHomeDataLoading) {
    return (
      <div className="flex flex-col gap-6 xl:gap-5 animate-fade-in pb-32 pt-2 relative z-10">
        <HeroSkeleton />
        <TodaysCardSkeleton />
        <div className="flex flex-col gap-4">
          <CurrentPathStripSkeleton />
          <ProgressBandSkeleton />
        </div>
        <MemoryPreviewStripSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 xl:gap-5 animate-slide-up pb-32 pt-2 relative z-10">

      {/* 0. Hero Header */}
      <div className="px-2 mt-2 xl:mt-1 flex justify-between items-start">
        <div>
          <span
            className="text-[10px] px-3 py-1 rounded-full backdrop-blur-sm shadow-sm font-medium tracking-wide"
            style={{
              background: palette.pillBg,
              border: `1px solid ${palette.pillBorder}`,
              color: palette.mutedText,
            }}
          >
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
          <h1 className="text-xl xl:text-lg font-semibold mt-3 xl:mt-2 px-1" style={{ color: palette.strongText }}>{heroTitle}</h1>
          <p className="text-sm xl:text-[13px] mt-1 px-1" style={{ color: palette.mutedText }}>
             {heroSubtitle}
          </p>
        </div>
        {hasActiveDirection && !effectiveHasLoggedToday && lastRecord?.moodCode && (
          <div className="shrink-0 flex flex-col items-center">
             <span className="text-[10px] text-mist-300 mb-1">최근 무드</span>
             <MoodSticker code={lastRecord.moodCode} className="opacity-100" />
          </div>
        )}
      </div>

      {/* Tier 1: Action (TodaysCard) */}
      <TodaysCard 
        hasLoggedToday={effectiveHasLoggedToday} 
        hasActiveDirection={hasActiveDirection}
        todayRecord={visibleTodayRecord} 
        onLogClick={handleLogClick} 
        onEditClick={handleLogClick} // Simplify for now, editing uses the same form 
      />

      {/* Tier 2: Path & Progress */}
      <div className="flex flex-col gap-4 xl:gap-3">
        {/* Condensed Path Information */}
        {hasActiveDirection && (
          <CurrentPathStrip 
            currentDirection={currentDirection} 
            currentPathConsistency={currentPathConsistency} 
            currentPathRecordCount={currentPathRecordCount} 
          />
        )}
        
        {/* Cumulative Progress Section */}
        <ProgressBand
          records={records}
          monthlyRecords={monthlyRecords}
          monthlyConsistency={monthlyConsistency}
          topMood={topMood}
          onExpandHeatmap={() => setIsHeatmapSheetOpen(true)}
        />
      </div>

      {/* Tier 3: Memory Area */}
      <MemoryPreviewStrip 
        records={records} 
        onMoreClick={onRecordsClick} 
      />

      {/* Tier 4: Utility functions */}
      <div className="grid grid-cols-2 gap-3 px-1 mt-4 xl:mt-3">
        <SoftButton variant="secondary" onClick={onRecordsClick} className="!py-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)]" style={{
          background: palette.cardBgMuted,
          border: `1px solid ${palette.border}`,
        } as React.CSSProperties}>
          <BookOpen size={16} className="text-point-400" />
          <span className="text-xs font-semibold" style={{ color: palette.strongText }}>이번 달 보기</span>
        </SoftButton>
        <SoftButton variant="secondary" onClick={onHistoryClick} className="!py-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)]" style={{
          background: palette.cardBgMuted,
          border: `1px solid ${palette.border}`,
        } as React.CSSProperties}>
          <History size={16} className="text-mist-400" />
          <span className="text-xs font-semibold" style={{ color: palette.strongText }}>지난 흐름 보기</span>
        </SoftButton>
      </div>

      <ExpandedHeatmapSheet
        open={isHeatmapSheetOpen}
        records={records}
        onClose={() => setIsHeatmapSheetOpen(false)}
        onGoToRecords={onRecordsClick}
      />
    </div>
  );
};
