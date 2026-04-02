import React, { useState } from 'react';
import { Direction, Record as RecordType } from '../types';
import { Card, PageHeader, SoftButton, ForestObject, MoodSticker } from '../components/UI';
import { ChevronLeft, Sparkles, MapPin, Pin, Lock } from 'lucide-react';

interface PastDirectionsViewProps {
  pastDirections: Direction[];
  records: RecordType[];
  onBack: () => void;
}

const PathSegment: React.FC<{ 
  direction: 'left-to-right' | 'right-to-left' | 'start'; 
  height?: number;
}> = ({ direction, height = 80 }) => {
  const strokeColor = "#CBD2D9"; 
  if (direction === 'start') {
      return (
        <div className="w-full h-12 flex justify-center items-end relative overflow-hidden">
            <div className="h-full w-[2px] bg-gradient-to-t from-point-200 to-transparent opacity-60"></div>
        </div>
      );
  }
  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
        <path
          d={direction === 'left-to-right' ? "M 20,0 C 20,50 80,50 80,100" : "M 80,0 C 80,50 20,50 20,100"}
          fill="none" stroke={strokeColor} strokeWidth="2.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" className="opacity-60"
        />
      </svg>
    </div>
  );
};

export const PastDirectionsView: React.FC<PastDirectionsViewProps> = ({ pastDirections, records, onBack }) => {
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const handleSummarize = () => {
    setIsSummarizing(true);
    setTimeout(() => {
        setIsSummarizing(false);
        setShowSummary(true);
    }, 1500);
  };

  if (selectedDirection) {
    const flowRecords = records
        .filter(r => r.directionQuestion === selectedDirection.question && !r.isHidden)
        .sort((a, b) => a.timestamp - b.timestamp); 

    const startDate = new Date(selectedDirection.createdAt).toLocaleDateString();
    const endDate = selectedDirection.endedAt ? new Date(selectedDirection.endedAt).toLocaleDateString() : 'Now';

    const now = Date.now();
    const reviewAt = selectedDirection.reviewAt || 0;
    const isLocked = selectedDirection.isActive ? false : (reviewAt > now);
    const unlockDate = selectedDirection.reviewAt ? new Date(selectedDirection.reviewAt).toLocaleDateString() : '';

    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-white/60 backdrop-blur-2xl animate-fade-in overflow-y-auto no-scrollbar pb-24 shadow-2xl">
        <div className="sticky top-0 bg-white/40 backdrop-blur-md py-4 z-20 w-full px-4 flex items-center gap-2 border-b border-white/50">
            <button onClick={() => setSelectedDirection(null)} className="p-1.5 text-mist-500 hover:text-point-600 hover:bg-white/50 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <span className="text-sm font-bold text-mist-600 ml-1">나의 방향 목록</span>
        </div>

        <div className="px-6 mt-10 mb-10 text-center animate-slide-up">
            <h2 className="text-[22px] font-bold text-mist-600 leading-snug mb-5 whitespace-pre-line px-2 drop-shadow-sm">
                "{selectedDirection.question}"
            </h2>
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-sm border border-white">
                <span className="text-[11px] font-bold text-point-500 uppercase tracking-widest">Period</span>
                <span className="text-sm text-mist-600 font-bold">{startDate} ~ {endDate}</span>
            </div>
        </div>

        <div className="px-6 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {!showSummary ? (
                <SoftButton 
                    onClick={isLocked ? undefined : handleSummarize} 
                    className={`w-full !rounded-2xl !py-5 shadow-sm bg-white/80 backdrop-blur-sm border border-white font-bold ${isLocked ? 'opacity-60 cursor-not-allowed grayscale' : 'hover:shadow-md hover:border-point-100 hover:bg-white'}`}
                    variant="secondary"
                    disabled={isLocked}
                >
                    {isSummarizing ? (
                        <span className="text-point-500 flex gap-2 items-center"><Sparkles size={16} className="animate-spin"/> 지난 조각들을 엮는 중...</span>
                    ) : isLocked ? (
                        <span className="text-mist-500 flex gap-2 items-center text-sm"><Lock size={16} /> {unlockDate}까지 회고가 잠겨있습니다</span>
                    ) : (
                        <span className="text-point-500 flex gap-2 items-center"><Sparkles size={16} /> AI 회고 리포트 받아보기</span>
                    )}
                </SoftButton>
            ) : (
                <div className="animate-fade-in bg-white/90 backdrop-blur-md rounded-3xl border border-white shadow-lg shadow-point-100/30 overflow-hidden">
                    <div className="flex justify-center py-4 bg-point-50/50 border-b border-white">
                        <span className="text-[11px] font-bold text-point-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={12} /> AI 요약 리포트
                        </span>
                    </div>
                    <div className="p-6">
                        <p className="text-mist-600 text-[15px] leading-loose font-medium whitespace-pre-line text-center">
                            "천천히, 그러나 확실하게 나아갔습니다."<br/><br/>
                            흔들리는 순간도 있었지만, 스스로를 다독이며 묵묵히 걸어온 궤적이 돋보입니다. 당신의 작지만 꾸준한 발걸음을 응원합니다.
                        </p>
                    </div>
                </div>
            )}
        </div>

        <div className="px-6 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
             <div className="flex items-center justify-between mb-5 px-1">
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-mist-500 uppercase tracking-widest">Recorded Flows</span>
                 </div>
                 {isLocked && (
                    <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-mist-500 border border-white shadow-sm">
                         <Lock size={12} /> <span className="text-[10px] font-bold tracking-wide">{unlockDate} 해제</span>
                    </div>
                 )}
             </div>
             
             <div className="flex flex-col gap-4">
                 {flowRecords.length === 0 ? (
                    <div className="text-center py-12 bg-white/40 backdrop-blur-sm rounded-3xl border border-white shadow-inner">
                        <p className="text-mist-500 text-sm font-medium drop-shadow-sm">기록된 궤적이 없습니다.</p>
                    </div>
                 ) : (
                    flowRecords.map((record) => (
                        <Card key={record.id} className={`!p-5 border border-white shadow-sm transition-transform active:scale-[0.99] ${record.isPinned ? 'bg-white shadow-md border-point-100 ring-1 ring-point-50' : 'bg-white/70 backdrop-blur-md'}`}>
                            <div className={`transition-all duration-700 ${isLocked ? 'blur-[6px] opacity-40 select-none grayscale-[0.5]' : ''}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-bold text-mist-400 tracking-wider">
                                        {new Date(record.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                    {record.isPinned && <Pin size={14} className="text-point-400" />}
                                </div>
                                <div className="flex items-center gap-2.5 mb-3">
                                    {record.moodCode && <MoodSticker code={record.moodCode} className="scale-90" />}
                                    {record.action && <span className="text-[14px] font-bold text-mist-600 line-clamp-2 leading-relaxed">{record.action}</span>}
                                </div>
                                {record.oneWordText && (
                                    <p className="text-mist-500 text-[14px] leading-relaxed font-medium bg-white/50 p-3 rounded-2xl border border-white">
                                        {record.oneWordText}
                                    </p>
                                )}
                            </div>
                        </Card>
                    ))
                 )}
             </div>
        </div>
        
        {flowRecords.length > 0 && (
            <div className="px-6 pb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="relative h-48 w-full bg-gradient-to-b from-white/40 to-white/70 backdrop-blur-md rounded-3xl border border-white shadow-sm overflow-hidden">
                     {flowRecords.map((record, i) => (
                         <ForestObject key={record.id} index={i} type={record.action} isLocked={isLocked} />
                     ))}
                     <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/80 via-white/40 to-transparent pointer-events-none"></div>
                </div>
                <div className="flex justify-center mt-5">
                    <p className="text-xs font-bold text-mist-500 bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full border border-white shadow-sm">
                        {flowRecords.length} 개의 발자국이 길 위에 남아있습니다.
                    </p>
                </div>
            </div>
        )}
      </div>
    );
  }

  const sortedDirections = [...pastDirections].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="animate-fade-in pt-2 pb-0 h-full flex flex-col relative w-full">
      <div className="flex items-center gap-2 mb-2 pl-1 px-4">
        <button onClick={onBack} className="p-2 -ml-2 text-mist-400 hover:text-mist-600 hover:bg-white/30 rounded-full transition-colors active:scale-95">
             <ChevronLeft size={24} />
        </button>
      </div>
      
      <PageHeader title="지나온 방향들" subtitle="걸어온 곡선들이 온전히 당신만의 궤적이 됩니다." />

      <div className="flex-1 overflow-y-auto no-scrollbar relative pb-32">
        {sortedDirections.length === 0 && (
            <div className="text-center py-20 opacity-60">
                <MapPin size={40} className="text-mist-300 mx-auto mb-4" />
                <p className="text-mist-400 font-medium">아직 지나온 길(방향)이 없습니다.</p>
            </div>
        )}

        {/* 궤적 박스들을 담으면서도 여백을 줄 수 있는 컨테이너 */}
        <div className="relative max-w-sm mx-auto w-full px-6 pt-4">
            <div className="flex justify-center mb-0">
                <div className="w-3 h-3 rounded-full bg-point-300 ring-4 ring-point-100/50 shadow-sm z-10"></div>
            </div>

            {sortedDirections.map((dir, index) => {
                const isEven = index % 2 === 0;
                const prevConnector = index === 0 ? <PathSegment direction="start" height={30} /> : <PathSegment direction={isEven ? "left-to-right" : "right-to-left"} height={55} />;
                
                const flowRecords = records
                    .filter(r => r.directionQuestion === dir.question && !r.isHidden)
                    .sort((a, b) => a.timestamp - b.timestamp);
                
                const count = flowRecords.length;
                const dayDiff = Math.max(1, Math.ceil(((dir.endedAt || Date.now()) - dir.createdAt) / (1000 * 60 * 60 * 24)));
                
                const moodCounts = flowRecords.reduce((acc, r) => {
                    if (r.moodCode) acc[r.moodCode] = (acc[r.moodCode] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                
                const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

                return (
                    <div key={dir.id} className="relative w-full">
                        {prevConnector}
                        <div onClick={() => setSelectedDirection(dir)} className={`relative flex ${isEven ? 'justify-end' : 'justify-start'} -mt-3 mb-1 z-10 group`}>
                            <div className={`w-[85%] transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer`}>
                                <div className={`relative backdrop-blur-xl p-6 rounded-[2rem] shadow-lg border border-white ${dir.isActive ? 'border-point-200 bg-white/90 shadow-point-100/30 ring-1 ring-point-50' : 'bg-white/60 hover:bg-white/80 shadow-mist-200/10'}`}>
                                    <span className="text-[10px] text-mist-400 block mb-2 font-bold tracking-widest uppercase opacity-80">
                                        {new Date(dir.createdAt).toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                        {dir.endedAt ? ` ~ ${new Date(dir.endedAt).toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' })}` : ' ~ 현재'}
                                    </span>
                                    <h3 className="text-mist-600 text-[15px] font-bold leading-relaxed line-clamp-2 drop-shadow-sm mb-4">
                                        {dir.question}
                                    </h3>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        <div className="flex items-center gap-1 bg-white/50 px-2.5 py-1.5 rounded-full border border-white shadow-sm">
                                            <span className="text-[9px] font-bold text-mist-400 tracking-wider">기록</span>
                                            <span className="text-[11px] font-bold text-point-500">{count}개</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white/50 px-2.5 py-1.5 rounded-full border border-white shadow-sm">
                                            <span className="text-[9px] font-bold text-mist-400 tracking-wider">기간</span>
                                            <span className="text-[11px] font-bold text-mist-500">{dayDiff}일</span>
                                        </div>
                                        {topMood && (
                                            <div className="flex items-center gap-1 bg-white/50 pl-1.5 pr-2.5 py-1 rounded-full border border-white shadow-sm">
                                                <div className="w-[20px] h-[20px] flex items-center justify-center -ml-0.5">
                                                     <MoodSticker code={topMood} className="scale-[0.55] origin-center shadow-none" />
                                                </div>
                                                <span className="text-[9px] font-bold text-mist-400 tracking-wider ml-0.5">주된 감정</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* 현재 위치를 나타내는 작은 노드 마커 */}
                                    <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-[3.5px] shadow-sm ${dir.isActive ? 'border-point-300' : 'border-mist-200'} ${isEven ? '-left-[15%] md:-left-[20%]' : '-right-[15%] md:-right-[20%]'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {sortedDirections.length > 0 && (
                <div className="relative h-32 w-full overflow-hidden mt-2">
                     <PathSegment direction={sortedDirections.length % 2 === 0 ? "left-to-right" : "right-to-left"} height={120} />
                </div>
            )}
        </div>
      </div>
      
      {/* 부드럽게 사라지는 하단 그라데이션 - 칙칙한 색 대신 흰색 투명도로 대체하여 dream-bg와 어울리게 함 */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white/40 via-white/10 to-transparent pointer-events-none z-20"></div>
    </div>
  );
};
