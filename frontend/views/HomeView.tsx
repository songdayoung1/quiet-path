import React from 'react';
import { AppState } from '../types';
import { Card, SoftButton, MoodSticker, StreakHeatmap } from '../components/UI';
import { PenLine, History, BookOpen, Image as ImageIcon, Flame, Compass, ArrowRight } from 'lucide-react';

interface HomeViewProps {
  state: AppState;
  onLogClick: () => void;
  onHistoryClick: () => void;
  onRecordsClick: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ state, onLogClick, onHistoryClick, onRecordsClick }) => {
  const { currentDirection, records, hasLoggedToday } = state;
  const sortedRecords = [...records].filter(r => !r.isHidden).sort((a, b) => b.timestamp - a.timestamp);
  const lastRecord = sortedRecords[0];
  
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
  const monthStartDate = new Date(currentYear, currentMonth, 1);
  const pathWindowStart = currentPathStartDate && currentPathStartDate > monthStartDate ? currentPathStartDate : monthStartDate;
  const today = new Date();
  const monthlyEligibleDays = currentDirection
    ? Math.max(1, Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(pathWindowStart.getFullYear(), pathWindowStart.getMonth(), pathWindowStart.getDate()).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : Math.max(1, today.getDate());
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
  const monthlyPhotoPreview = monthlyRecords
    .filter(r => r.imageUrl)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 4);
  const reviewDateText = currentDirection?.reviewAt
    ? new Date(currentDirection.reviewAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : null;

  return (
    <div className="flex flex-col gap-6 animate-slide-up pb-32 pt-2 relative z-10">
      <div className="px-2 mt-2 flex justify-between items-start">
        <div>
          <span className="text-[10px] px-3 py-1 bg-white/40 rounded-full text-mist-500 backdrop-blur-sm border border-white/40 shadow-sm font-medium tracking-wide">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
          <h1 className="text-xl font-semibold text-mist-600 mt-3 px-1">
            오늘은 어디로 움직였나요?
          </h1>
          <p className="text-sm text-mist-400 mt-1 px-1">하루를 돌아보며 방향을 만들어가요.</p>
        </div>
        {lastRecord?.moodCode && (
          <div className="shrink-0 flex flex-col items-center">
             <span className="text-[10px] text-mist-300 mb-1">최근 무드</span>
             <MoodSticker code={lastRecord.moodCode} className="opacity-100" />
          </div>
        )}
      </div>

      <Card className="!bg-white/75 backdrop-blur-md shadow-sm border border-white/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-point-500 bg-point-50/80 rounded-full px-3 py-1 mb-4">
              <Compass size={12} />
              Current Path
            </div>
            <p className="text-lg font-bold text-mist-600 leading-snug">
              {currentDirection?.description || '아직 설정된 여정이 없어요'}
            </p>
            <p className="text-sm text-mist-500 mt-3 leading-relaxed">
              {currentDirection?.question || '지금 마음이 머무는 질문을 하나 정해보세요.'}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/80 border border-mist-100 px-3 py-3 text-right shadow-sm min-w-[92px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Consistency</p>
            <p className="text-2xl font-bold text-point-500 mt-1">{currentPathConsistency}%</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-mist-50/70 px-4 py-3 border border-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Started</p>
            <p className="text-sm font-semibold text-mist-600 mt-1">
              {currentDirection ? new Date(currentDirection.createdAt).toLocaleDateString('ko-KR') : '-'}
            </p>
          </div>
          <div className="rounded-2xl bg-mist-50/70 px-4 py-3 border border-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Review</p>
            <p className="text-sm font-semibold text-mist-600 mt-1">{reviewDateText || '-'}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 border border-white">
          <span className="text-sm text-mist-500">현재 Path 기록</span>
          <span className="text-sm font-bold text-mist-600">{currentPathRecordCount}일</span>
        </div>
      </Card>

      <Card className="!bg-white/85 shadow-md border border-white/60" breathe={!hasLoggedToday}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300 mb-3">Today&apos;s Record</p>
            <h2 className="text-xl font-bold text-mist-600 leading-snug">오늘 남기고 싶은 장면이 있나요?</h2>
            <p className="text-sm text-mist-400 mt-2">한 줄만 남겨도 충분해요.</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${hasLoggedToday ? 'bg-point-50' : 'bg-mist-50'}`}>
            <PenLine className={`w-5 h-5 ${hasLoggedToday ? 'text-point-500' : 'text-mist-400'}`} />
          </div>
        </div>
        <div className="mt-5">
          <SoftButton onClick={onLogClick} className="!py-4 shadow-lg shadow-point-200/40">
            <PenLine size={18} />
            <span className="text-base font-semibold">{hasLoggedToday ? '오늘 기록 다시 보기' : '기록 남기기'}</span>
          </SoftButton>
        </div>
        {hasLoggedToday && (
          <div className="mt-3 rounded-2xl bg-point-50/70 border border-point-100 px-4 py-3 text-sm text-point-500">
            오늘의 장면이 이미 남겨져 있어요. 다시 돌아보고 다듬을 수 있어요.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 px-1">
        <SoftButton variant="secondary" onClick={onRecordsClick} className="!py-4 bg-white/70 hover:bg-white shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
          <BookOpen size={16} className="text-point-400" />
          <span className="text-mist-600 text-xs font-semibold">이번 달 보기</span>
        </SoftButton>
        <SoftButton variant="secondary" onClick={onHistoryClick} className="!py-4 bg-white/70 hover:bg-white shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
          <History size={16} className="text-mist-400" />
          <span className="text-mist-600 text-xs font-semibold">지난 흐름 보기</span>
        </SoftButton>
      </div>

      {lastRecord && (
        <Card className="!bg-white/70 border border-white/50 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300 mb-3">Recent Scene</p>
              <p className="text-base text-mist-600 leading-relaxed whitespace-pre-line line-clamp-3">
                {lastRecord.action}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              {lastRecord.moodCode && <MoodSticker code={lastRecord.moodCode} className="opacity-100" />}
              {lastRecord.imageUrl && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-mist-400">
                  <ImageIcon size={11} />
                  사진 있음
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="!bg-white/70 border border-white/50 shadow-sm">
        <StreakHeatmap records={records} />
      </Card>

      <Card className="!bg-white/55 border-white/50 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-point-400" />
            <span className="text-sm font-medium text-mist-600">이번 달 요약</span>
          </div>
          <span className="text-[10px] font-bold text-mist-300 uppercase tracking-widest">This Month</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/70 px-4 py-4 border border-white text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Records</p>
            <p className="text-xl font-bold text-point-500 mt-2">{monthlyRecords.length}</p>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-4 border border-white text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Consistency</p>
            <p className="text-xl font-bold text-mist-600 mt-2">{monthlyConsistency}%</p>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-4 border border-white text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Top Mood</p>
            <div className="mt-2 flex justify-center">
              {topMood ? <MoodSticker code={topMood} className="opacity-100" /> : <span className="text-sm text-mist-300">-</span>}
            </div>
          </div>
        </div>
      </Card>

      {monthlyPhotoPreview.length > 0 && (
        <Card className="!bg-white/70 border border-white/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-mist-400" />
              <span className="text-sm font-medium text-mist-600">이번 달 장면 미리보기</span>
            </div>
            <button onClick={onRecordsClick} className="text-[11px] font-semibold text-point-500 inline-flex items-center gap-1">
              더 보기
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {monthlyPhotoPreview.map((record) => (
              <div key={`home-photo-${record.id}`} className="aspect-square rounded-2xl overflow-hidden border border-white shadow-sm bg-mist-50">
                <img src={record.imageUrl} alt="Monthly preview" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
