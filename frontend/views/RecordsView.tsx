import React, { useState, useMemo } from 'react';
import { Record as RecordType, Direction } from '../types';
import { Card, PageHeader, SoftButton, MoodSticker } from '../components/UI';
import { MoreHorizontal, EyeOff, Pin, Calendar, Lock, Share2, Globe2, Image as ImageIcon, ChevronLeft, ChevronRight, BookOpenText } from 'lucide-react';

interface RecordsViewProps {
  records: RecordType[];
  currentDirection: Direction | null;
  pastDirections: Direction[];
  onUpdateRecord: (record: RecordType) => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({ records, currentDirection, onUpdateRecord }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<RecordType | null>(null);
  const [activeTab, setActiveTab] = useState<'album' | 'records' | 'calendar'>('album');

  const activeRecords = useMemo(() => records.filter(r => !r.isHidden).sort((a, b) => b.timestamp - a.timestamp), [records]);

  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(() => {
    if (activeRecords.length > 0) {
      const latestRecordDate = new Date(activeRecords[0].timestamp);
      return new Date(latestRecordDate.getFullYear(), latestRecordDate.getMonth(), 1);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const targetMonth = selectedMonthDate.getMonth();
  const targetYear = selectedMonthDate.getFullYear();

  const monthlyRecords = useMemo(() => activeRecords.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  }), [activeRecords, targetMonth, targetYear]);

  // Statistics
  const moodCounts = monthlyRecords.reduce((acc, record) => {
      if (record.moodCode) acc[record.moodCode] = (acc[record.moodCode] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const photoRecords = useMemo(
    () => monthlyRecords
      .filter(r => r.imageUrl)
      .sort((a, b) => a.timestamp - b.timestamp),
    [monthlyRecords]
  );
  const displayedPhotoRecords = useMemo(
    () => (photoRecords.length > 12 ? photoRecords.slice(-12) : photoRecords),
    [photoRecords]
  );
  const firstRecordMonth = useMemo(() => {
    if (activeRecords.length === 0) return null;
    const lastRecordDate = new Date(activeRecords[activeRecords.length - 1].timestamp);
    return new Date(lastRecordDate.getFullYear(), lastRecordDate.getMonth(), 1);
  }, [activeRecords]);
  const latestRecordMonth = useMemo(() => {
    if (activeRecords.length === 0) return null;
    const latestRecordDate = new Date(activeRecords[0].timestamp);
    return new Date(latestRecordDate.getFullYear(), latestRecordDate.getMonth(), 1);
  }, [activeRecords]);
  const canGoPrevMonth = firstRecordMonth !== null && selectedMonthDate.getTime() > firstRecordMonth.getTime();
  const canGoNextMonth = latestRecordMonth !== null && selectedMonthDate.getTime() < latestRecordMonth.getTime();
  const photoCoverage = monthlyRecords.length > 0
    ? Math.round((photoRecords.length / monthlyRecords.length) * 100)
    : 0;
  const sceneTextLabel = (record: RecordType) => record.action;
  const monthlyRecordMap = useMemo(() => {
    const map = new Map<number, RecordType>();
    monthlyRecords.forEach((record) => {
      map.set(new Date(record.timestamp).getDate(), record);
    });
    return map;
  }, [monthlyRecords]);
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(targetYear, targetMonth, 1).getDay();
  const calendarCells = useMemo(() => {
    const cells: Array<{ type: 'empty' } | { type: 'day'; day: number; record?: RecordType }> = [];
    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push({ type: 'empty' });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ type: 'day', day, record: monthlyRecordMap.get(day) });
    }
    return cells;
  }, [daysInMonth, firstDayOfMonth, monthlyRecordMap]);
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  // Handlers
  const handleHide = (record: RecordType) => {
    onUpdateRecord({ ...record, isHidden: true });
    setActiveMenuId(null);
  };
  const handlePin = (record: RecordType) => {
    onUpdateRecord({ ...record, isPinned: !record.isPinned });
    setActiveMenuId(null);
  };
  const handleShare = (record: RecordType) => {
    if (!record.isShared) {
        onUpdateRecord({ ...record, isShared: true });
        alert("커뮤니티에 조용히 공유되었습니다.");
    }
    setActiveMenuId(null);
  };

  // DETAIL VIEW
  if (selectedRecordForDetail) {
      const record = selectedRecordForDetail;
      return (
        <div className="pb-28 animate-slide-up pt-4 relative z-10 min-h-screen bg-[#F5F7FA]">
           <div className="px-4 flex justify-between items-center mb-6">
              <button onClick={() => setSelectedRecordForDetail(null)} className="text-mist-500 hover:text-mist-600 transition-colors p-2 text-sm font-bold">닫기</button>
              <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest">{new Date(record.timestamp).toLocaleDateString()}</span>
              <div className="w-10"></div>
           </div>

           <div className="px-5 flex flex-col gap-6 max-w-md mx-auto">
               <div className="text-center">
                   {record.moodCode && <MoodSticker code={record.moodCode} className="mb-4 scale-125 hover:scale-125 pointer-events-none" />}
                   {record.oneWordText && (
                       <h2 className="text-2xl font-bold text-mist-600 mt-2">"{record.oneWordText}"</h2>
                   )}
                   <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-mist-400">
                       {record.isShared && (
                           <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 shadow-sm border border-mist-100">
                               <Globe2 size={12} className="text-point-400" />
                               공유됨
                           </span>
                       )}
                       {record.isPinned && (
                           <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 shadow-sm border border-mist-100">
                               <Pin size={12} className="text-mist-400" />
                               기억할 장면
                           </span>
                       )}
                   </div>
               </div>

               {record.imageUrl && (
                   <div className="w-full rounded-3xl overflow-hidden shadow-sm border border-mist-100">
                       <img src={record.imageUrl} alt="Scene" className="w-full object-cover aspect-[4/5] max-h-96" />
                   </div>
               )}

               <div className="bg-white/80 p-6 rounded-3xl shadow-sm border border-white">
                   <p className="text-xs text-point-500 font-bold mb-3 uppercase tracking-wide">오늘의 장면</p>
                   <p className="text-mist-600 text-[15px] leading-relaxed whitespace-pre-line">{sceneTextLabel(record)}</p>
               </div>

               {record.tomorrowText && (
                   <div className="bg-white/50 p-6 rounded-3xl shadow-sm border border-white">
                       <p className="text-xs text-mist-400 font-bold mb-3 uppercase tracking-wide">내일의 한 걸음</p>
                       <p className="text-mist-600 text-[14px] leading-relaxed">{record.tomorrowText}</p>
                   </div>
               )}
               
               <div className="text-center mt-6">
                   <p className="text-[10px] text-mist-300 tracking-wide">이 기록은 당신의 궤적에 안전하게 보관되어 있습니다.</p>
               </div>
           </div>
        </div>
      );
  }

  // MONTHLY VIEW
  return (
    <div className="pb-28 animate-slide-up pt-4 relative z-10 min-h-screen" onClick={() => setActiveMenuId(null)}>
      {/* 1. 상단: 월간 요약 */}
      <div className="px-4 mb-6">
         <div className="flex items-center justify-between gap-3">
            <div>
               <h1 className="text-2xl font-bold text-mist-600 tracking-tight">
                  {targetYear}년 {targetMonth + 1}월의 궤적
               </h1>
               <p className="text-mist-400 text-sm mt-1">이번 달의 기록들을 돌아봅니다.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-2 py-2 shadow-sm border border-white/70">
               <button
                 onClick={() => canGoPrevMonth && setSelectedMonthDate(new Date(targetYear, targetMonth - 1, 1))}
                 disabled={!canGoPrevMonth}
                 className="w-8 h-8 rounded-full flex items-center justify-center text-mist-500 hover:bg-mist-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
               >
                 <ChevronLeft size={16} />
               </button>
               <span className="text-[11px] font-bold text-mist-500 tracking-wide min-w-[64px] text-center">
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
             <div className="bg-white/70 p-4 rounded-3xl border border-white shadow-sm flex flex-col justify-center items-center min-h-[104px]">
                 <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest mb-1.5 text-center">Records</span>
                 <span className="text-3xl font-bold text-point-500">{monthlyRecords.length}</span>
             </div>
             <div className="bg-white/70 p-4 rounded-3xl border border-white shadow-sm flex flex-col justify-center items-center min-h-[104px]">
                 <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest mb-1.5 text-center">Photo Moments</span>
                 <span className="text-3xl font-bold text-mist-600">{photoRecords.length}</span>
                 <span className="text-[10px] text-mist-300 mt-1">{photoCoverage}% 남김</span>
             </div>
             <div className="bg-white/70 p-4 rounded-3xl border border-white shadow-sm flex flex-col justify-center items-center min-h-[104px]">
                 <span className="text-[10px] font-bold text-mist-400 uppercase tracking-widest mb-2 text-center">Top Moods</span>
                 <div className="flex justify-center flex-wrap gap-1">
                     {topMoods.length > 0 ? topMoods.map(([code]) => (
                          <MoodSticker key={code} code={code} className="scale-90 opacity-100 px-2 py-1" />
                     )) : <span className="text-sm text-mist-300">-</span>}
                 </div>
             </div>
         </div>
      </div>

      <div className="px-4 mb-6">
         <div className="bg-white/70 rounded-[2rem] p-1.5 border border-white shadow-sm grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab('album')}
              className={`rounded-full px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'album' ? 'bg-white text-point-500 shadow-sm' : 'text-mist-400 hover:text-mist-600'
              }`}
            >
              <ImageIcon size={16} />
              앨범
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`rounded-full px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'records' ? 'bg-white text-point-500 shadow-sm' : 'text-mist-400 hover:text-mist-600'
              }`}
            >
              <BookOpenText size={16} />
              기록
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`rounded-full px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'calendar' ? 'bg-white text-point-500 shadow-sm' : 'text-mist-400 hover:text-mist-600'
              }`}
            >
              <Calendar size={16} />
              캘린더
            </button>
         </div>
      </div>

      {monthlyRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center opacity-70">
              <Calendar size={32} className="text-mist-300 mb-4" />
              <p className="text-mist-500 font-medium tracking-wide">기록된 궤적이 없습니다.</p>
          </div>
      ) : (
          <div className="flex flex-col gap-8">
              {activeTab === 'album' ? (
                  <div className="px-2">
                      <div className="px-3 mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                              <ImageIcon size={16} className="text-mist-400" />
                              <h3 className="text-xs font-bold text-mist-500 uppercase tracking-widest">Monthly Photo Timeline</h3>
                          </div>
                          {displayedPhotoRecords.length > 0 && (
                              <span className="text-[11px] text-mist-300">{displayedPhotoRecords.length}개의 장면</span>
                          )}
                      </div>
                      {displayedPhotoRecords.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4 px-3 pb-6">
                              {displayedPhotoRecords.map(record => (
                                  <button
                                       key={`photo-${record.id}`}
                                       type="button"
                                       className="relative group aspect-[4/5] bg-white p-2 pb-10 rounded-2xl shadow-sm border border-mist-100/50 text-left transform transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                                       onClick={() => setSelectedRecordForDetail(record)}
                                  >
                                      <div className="w-full h-full rounded-xl overflow-hidden bg-mist-50">
                                          <img src={record.imageUrl} alt="Scene Board element" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                      </div>
                                      <div className="absolute font-bold bottom-2 left-3 right-3 pointer-events-none">
                                          <div className="flex items-center justify-between gap-2">
                                              <span className="text-[11px] text-mist-500 tracking-wider bg-white/80 px-2 py-1 rounded-full shadow-sm">
                                                  {new Date(record.timestamp).getDate()}일
                                              </span>
                                              {record.moodCode && <MoodSticker code={record.moodCode} className="scale-75 origin-right shadow-none" />}
                                          </div>
                                          {record.oneWordText && (
                                              <p className="mt-2 text-[11px] text-mist-500 truncate px-1">{record.oneWordText}</p>
                                          )}
                                      </div>
                                  </button>
                              ))}
                          </div>
                      ) : (
                          <div className="mx-3 mb-8 bg-white/50 border-2 border-dashed border-white rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-3">
                                  <ImageIcon size={20} className="text-mist-300" />
                              </div>
                              <p className="text-sm font-bold text-mist-500 mb-1.5">아직 이번 달 장면이 없어요</p>
                              <p className="text-[11px] text-mist-400 leading-relaxed max-w-[220px]">
                                  기록을 남길 때 사진을 첨부하면
                                  <br />
                                  이곳에 장면 타임라인이 차곡차곡 쌓입니다.
                              </p>
                          </div>
                      )}
                  </div>
              ) : activeTab === 'records' ? (
                  <div className="px-4 flex flex-col gap-5">
                      <div className="flex items-center justify-between gap-3 mb-1 px-1">
                          <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-mist-400" />
                              <h3 className="text-xs font-bold text-mist-500 uppercase tracking-widest">Record View</h3>
                          </div>
                          <span className="text-[11px] text-mist-300">{monthlyRecords.length}일의 기록</span>
                      </div>
                      <p className="px-1 text-sm text-mist-400 leading-relaxed">
                        날짜와 장면 순서대로 이번 달의 흐름을 다시 볼 수 있어요.
                      </p>
                      {monthlyRecords.map((record) => {
                      const isLocked = currentDirection?.isActive && record.timestamp >= currentDirection.createdAt && new Date(record.timestamp).toDateString() !== new Date().toDateString();

                      return (
                          <Card 
                              key={record.id} 
                              className={`!p-6 !rounded-[2rem] cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden ${record.isPinned ? 'bg-white shadow-md border border-point-200' : 'bg-white/80 border border-white/60'}`}
                              onClick={() => !isLocked && setSelectedRecordForDetail(record)}
                          >
                              {/* Header */}
                              <div className="flex justify-between items-start mb-4">
                                  <div className="flex flex-col">
                                      <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[11px] font-bold text-mist-400 tracking-wider">
                                              {new Date(record.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                          </span>
                                          {record.isShared && (
                                              <span className="inline-flex items-center gap-1 rounded-full bg-point-50 px-2 py-1 text-[10px] font-semibold text-point-500">
                                                  <Globe2 size={10} />
                                                  공유됨
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-1 -mr-2 -mt-2">
                                      <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenuId(activeMenuId === record.id ? null : record.id);
                                          }}
                                          className="text-mist-300 hover:text-mist-500 transition-colors p-2"
                                      >
                                          <MoreHorizontal size={16} />
                                      </button>
                                  </div>
                              </div>

                              {/* Context Menu */}
                              {activeMenuId === record.id && (
                                  <div className="absolute right-6 top-12 bg-white shadow-xl rounded-2xl p-1.5 z-20 border border-mist-100 animate-fade-in min-w-[140px]">
                                      <button onClick={(e) => { e.stopPropagation(); handlePin(record); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-mist-600 hover:bg-mist-50 rounded-xl w-full text-left transition-colors">
                                      <Pin size={14} className="text-mist-400" /> {record.isPinned ? '고정 해제' : '고정하기'}
                                      </button>
                                      {!record.isShared && (
                                          <button onClick={(e) => { e.stopPropagation(); handleShare(record); }} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-point-500 hover:bg-point-50 rounded-xl w-full text-left transition-colors mt-1">
                                              <Share2 size={14} /> 커뮤니티 공유
                                          </button>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); handleHide(record); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-xl w-full text-left transition-colors mt-1">
                                      <EyeOff size={14} /> 숨기기
                                      </button>
                                  </div>
                              )}

                              {/* Content */}
                              <div className={`transition-all duration-500 ${isLocked ? 'blur-[6px] select-none opacity-40 grayscale-[0.5]' : ''}`}>
                                  {/* Mood and OneWord Row */}
                                  <div className="flex items-center gap-3 mb-4">
                                      {record.moodCode && <MoodSticker code={record.moodCode} className="opacity-100" />}
                                      {record.oneWordText && <span className="text-[15px] font-bold text-mist-600">"{record.oneWordText}"</span>}
                                  </div>
                                  
                                  <p className="text-mist-600 text-sm leading-relaxed line-clamp-3 font-normal">
                                      {sceneTextLabel(record)}
                                  </p>

                                  {/* Image Thumbnail Hint */}
                                  {record.imageUrl && (
                                      <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-mist-50/80 p-2 pr-3">
                                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-mist-100 shadow-sm opacity-90">
                                              <img src={record.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                          </div>
                                          <div>
                                              <p className="text-[10px] font-bold text-mist-400 uppercase tracking-widest">Photo Moment</p>
                                              <p className="text-xs text-mist-500 mt-1">이 날의 장면이 함께 남아 있어요</p>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              {/* Locked Overlay */}
                              {isLocked && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/20">
                                      <div className="bg-white/90 backdrop-blur-md p-4 rounded-full mb-3 border border-mist-100 shadow-sm">
                                          <Lock size={16} className="text-mist-400" />
                                      </div>
                                      <span className="text-[10px] text-mist-500 font-bold tracking-widest uppercase bg-white/80 px-3 py-1 rounded-full shadow-sm">Time Capsule</span>
                                  </div>
                              )}
                          </Card>
                      );
                  })}
                  </div>
              ) : (
                  <div className="px-4">
                      <div className="flex items-center justify-between gap-3 mb-4 px-1">
                          <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-mist-400" />
                              <h3 className="text-xs font-bold text-mist-500 uppercase tracking-widest">Calendar View</h3>
                          </div>
                          <span className="text-[11px] text-mist-300">날짜별 빠른 탐색</span>
                      </div>
                      <p className="px-1 text-sm text-mist-400 leading-relaxed mb-5">
                        특정 날짜의 기록, 무드, 사진 유무를 빠르게 확인하고 바로 열어볼 수 있어요.
                      </p>
                      <Card className="!p-5 !rounded-[2rem] bg-white/75 border border-white/60 shadow-sm">
                          <div className="grid grid-cols-7 gap-2 mb-4">
                              {weekdayLabels.map((label) => (
                                  <div key={label} className="text-center text-[11px] font-bold text-mist-300 uppercase tracking-widest py-2">
                                      {label}
                                  </div>
                              ))}
                          </div>
                          <div className="grid grid-cols-7 gap-2">
                              {calendarCells.map((cell, index) => {
                                  if (cell.type === 'empty') {
                                      return <div key={`empty-${index}`} className="aspect-square" />;
                                  }

                                  const record = cell.record;
                                  const isToday = cell.day === new Date().getDate() && targetMonth === new Date().getMonth() && targetYear === new Date().getFullYear();

                                  return (
                                      <button
                                        key={`day-${cell.day}`}
                                        type="button"
                                        onClick={() => record && setSelectedRecordForDetail(record)}
                                        className={`aspect-square rounded-2xl border text-left p-2 transition-all ${
                                          record
                                            ? 'bg-white border-mist-100 shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                                            : 'bg-mist-50/60 border-transparent'
                                        } ${isToday ? 'ring-2 ring-point-100' : ''}`}
                                      >
                                        <div className="flex h-full flex-col justify-between">
                                            <div className="flex items-start justify-between gap-1">
                                                <span className={`text-xs font-bold ${record ? 'text-mist-600' : 'text-mist-300'}`}>{cell.day}</span>
                                                {record?.imageUrl && (
                                                    <span className="w-2 h-2 rounded-full bg-point-300 shrink-0 mt-1"></span>
                                                )}
                                            </div>
                                            {record ? (
                                                <div className="space-y-1">
                                                    {record.moodCode ? (
                                                        <MoodSticker code={record.moodCode} className="scale-75 origin-left shadow-none px-2 py-1" />
                                                    ) : (
                                                        <div className="h-6"></div>
                                                    )}
                                                    <p className="text-[10px] text-mist-400 line-clamp-2">
                                                        {record.oneWordText || '기록 있음'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-mist-200">-</span>
                                            )}
                                        </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </Card>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
