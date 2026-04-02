import React from 'react';
import { AppState } from '../types';
import { MoodSticker, SoftButton } from '../components/UI';
import { History, BookOpen } from 'lucide-react';

// Import New Components
import { TodaysCard } from '../components/TodaysCard';
import { CurrentPathStrip } from '../components/CurrentPathStrip';
import { ProgressBand } from '../components/ProgressBand';
import { MemoryPreviewStrip } from '../components/MemoryPreviewStrip';

interface HomeViewProps {
  state: AppState;
  onLogClick: () => void;
  onHistoryClick: () => void;
  onRecordsClick: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ state, onLogClick, onHistoryClick, onRecordsClick }) => {
  const { currentDirection, records, hasLoggedToday } = state;
  const sortedRecords = [...records].filter(r => !r.isHidden).sort((a, b) => b.timestamp - a.timestamp);
  
  // Find today's record accurately matching local date
  const todayDateStr = new Date().toLocaleDateString('ko-KR');
  const todayRecord = sortedRecords.find(r => 
    new Date(r.timestamp).toLocaleDateString('ko-KR') === todayDateStr
  ) || null;
  
  const lastRecord = sortedRecords[0]; // Kept for top right mood indicator

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRecords = sortedRecords.filter(r => {
    const d = new Date(r.timestamp);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const currentPathRecords = currentDirection
    ? sortedRecords.filter(r => r.directionQuestion === currentDirection.question)
    : [];
  const currentPathRecordCount = currentPathRecords.length;
  const currentPathStartDate = currentDirection ? new Date(currentDirection.createdAt) : null;
  
  const today = new Date();
  
  const monthlyEligibleDays = Math.max(1, today.getDate());
  const monthlyConsistency = monthlyRecords.length > 0 ? Math.round((monthlyRecords.length / monthlyEligibleDays) * 100) : 0;
  
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

  return (
    <div className="flex flex-col gap-6 animate-slide-up pb-32 pt-2 relative z-10">
      
      {/* 0. Hero Header */}
      <div className="px-2 mt-2 flex justify-between items-start">
        <div>
          <span className="text-[10px] px-3 py-1 bg-white/40 rounded-full text-mist-500 backdrop-blur-sm border border-white/40 shadow-sm font-medium tracking-wide">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
          {/* Header text changes based on logging state */}
          <h1 className="text-xl font-semibold text-mist-600 mt-3 px-1">
            {hasLoggedToday ? '오늘도 방향을 찾았네요.' : '오늘은 어디로 움직였나요?'}
          </h1>
          <p className="text-sm text-mist-400 mt-1 px-1">
             {hasLoggedToday ? '기록이 안전하게 쌓이고 있어요.' : '하루를 돌아보며 방향을 만들어가요.'}
          </p>
        </div>
        {!hasLoggedToday && lastRecord?.moodCode && (
          <div className="shrink-0 flex flex-col items-center">
             <span className="text-[10px] text-mist-300 mb-1">최근 무드</span>
             <MoodSticker code={lastRecord.moodCode} className="opacity-100" />
          </div>
        )}
      </div>

      {/* Tier 1: Action (TodaysCard) */}
      <TodaysCard 
        hasLoggedToday={hasLoggedToday} 
        todayRecord={todayRecord} 
        onLogClick={onLogClick} 
        onEditClick={onLogClick} // Simplify for now, editing uses the same form 
      />

      {/* Tier 2: Path & Progress */}
      <div className="flex flex-col gap-4">
        {/* Condensed Path Information */}
        <CurrentPathStrip 
          currentDirection={currentDirection} 
          currentPathConsistency={currentPathConsistency} 
          currentPathRecordCount={currentPathRecordCount} 
        />
        
        {/* Cumulative Progress Section */}
        <ProgressBand 
          records={records} 
          monthlyRecords={monthlyRecords} 
          monthlyConsistency={monthlyConsistency} 
          topMood={topMood} 
        />
      </div>

      {/* Tier 3: Memory Area */}
      <MemoryPreviewStrip 
        records={records} 
        onMoreClick={onRecordsClick} 
      />

      {/* Tier 4: Utility functions */}
      <div className="grid grid-cols-2 gap-3 px-1 mt-4">
        <SoftButton variant="secondary" onClick={onRecordsClick} className="!py-4 bg-white/70 hover:bg-white shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-white/50">
          <BookOpen size={16} className="text-point-400" />
          <span className="text-mist-600 text-xs font-semibold">이번 달 보기</span>
        </SoftButton>
        <SoftButton variant="secondary" onClick={onHistoryClick} className="!py-4 bg-white/70 hover:bg-white shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-white/50">
          <History size={16} className="text-mist-400" />
          <span className="text-mist-600 text-xs font-semibold">지난 흐름 보기</span>
        </SoftButton>
      </div>

    </div>
  );
};
