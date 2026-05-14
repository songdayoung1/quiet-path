import React, { useState } from 'react';
import { Direction, Record as RecordType } from '../types';
import { Card, PageHeader, SoftButton, ForestObject, MoodSticker } from '../components/UI';
import { ChevronLeft, Sparkles, MapPin, Pin, Lock } from 'lucide-react';
import { getThemePalette, useResolvedTheme } from '../theme';

interface PastDirectionsViewProps {
  pastDirections: Direction[];
  records: RecordType[];
  onBack: () => void;
}

const PathSegment: React.FC<{ 
  direction: 'left-to-right' | 'right-to-left' | 'start'; 
  height?: number;
  strokeColor?: string;
}> = ({ direction, height = 80, strokeColor = '#CBD2D9' }) => {
  if (direction === 'start') {
      return (
        <div className="w-full h-12 flex justify-center items-end relative overflow-hidden">
            <div className="h-full w-[2px] opacity-60" style={{ backgroundImage: `linear-gradient(to top, ${strokeColor}, transparent)` }}></div>
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
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
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
      <div className="absolute inset-0 z-50 flex flex-col animate-fade-in overflow-y-auto no-scrollbar pb-24 shadow-2xl" style={{ background: theme === 'dark' ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.60)', backdropFilter: 'blur(20px)' }}>
        <div className="sticky top-0 backdrop-blur-md py-4 z-20 w-full px-4 flex items-center gap-2 border-b" style={{ background: theme === 'dark' ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.40)', borderColor: palette.divider }}>
            <button onClick={() => setSelectedDirection(null)} className="p-1.5 rounded-full transition-colors" style={{ color: palette.mutedText, background: theme === 'dark' ? 'rgba(30,41,59,0.66)' : 'transparent' }}>
              <ChevronLeft size={24} />
            </button>
            <span className="text-sm font-bold ml-1" style={{ color: palette.strongText }}>나의 방향 목록</span>
        </div>

        <div className="px-6 mt-10 mb-10 text-center animate-slide-up">
            <h2 className="text-[22px] font-bold leading-snug mb-5 whitespace-pre-line px-2" style={{ color: palette.strongText }}>
                "{selectedDirection.question}"
            </h2>
            <div className="inline-flex items-center gap-2 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-sm border" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
                <span className="text-[11px] font-bold text-point-500 uppercase tracking-widest">Period</span>
                <span className="text-sm font-bold" style={{ color: palette.mutedText }}>{startDate} ~ {endDate}</span>
            </div>
        </div>

        <div className="px-6 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {!showSummary ? (
                isLocked ? (
                    <Card className="w-full !rounded-3xl !bg-mist-800/90 backdrop-blur-md border border-mist-700/50 !p-8 flex flex-col items-center text-center shadow-lg">
                        <div className="w-12 h-12 rounded-full bg-mist-700/50 flex items-center justify-center mb-4 border border-mist-600/30">
                            <Lock size={20} className="text-mist-300" />
                        </div>
                        <h3 className="text-white/90 font-bold text-[16px] mb-2 tracking-wide">AI 회고 캡슐</h3>
                        <p className="text-mist-300/80 text-[12px] font-medium tracking-wide">
                            {unlockDate} 이후에 열어볼 수 있는<br/>방향 종합 리포트입니다.
                        </p>
                    </Card>
                ) : (
                    <SoftButton 
                        onClick={handleSummarize} 
                        className="w-full !rounded-3xl !py-5 shadow-sm font-bold transition-all"
                        variant="secondary"
                        style={{ background: palette.cardBgStrong, borderColor: palette.border, color: '#8B5CF6' }}
                    >
                        {isSummarizing ? (
                            <span className="text-point-500 flex gap-2 items-center"><Sparkles size={16} className="animate-spin"/> 지난 조각들을 엮는 중...</span>
                        ) : (
                            <span className="text-point-500 flex gap-2 items-center"><Sparkles size={16} /> AI 회고 캡슐 열기</span>
                        )}
                    </SoftButton>
                )
            ) : (
                <div className="animate-fade-in backdrop-blur-md rounded-3xl border shadow-lg overflow-hidden" style={{ background: palette.cardBgStrong, borderColor: palette.border }}>
                    <div className="flex justify-center py-4 border-b" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.16)' : 'rgba(243,232,255,0.6)', borderColor: palette.divider }}>
                        <span className="text-[11px] font-bold text-point-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={12} /> AI 요약 리포트
                        </span>
                    </div>
                    <div className="p-6">
                        <p className="text-[15px] leading-loose font-medium whitespace-pre-line text-center" style={{ color: palette.mutedText }}>
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
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: palette.mutedText }}>Recorded Flows</span>
                 </div>
             </div>
             
             <div className="flex flex-col gap-4">
                 {flowRecords.length === 0 ? (
                    <div className="text-center py-12 backdrop-blur-sm rounded-3xl border shadow-inner" style={{ background: palette.cardBgMuted, borderColor: palette.border }}>
                        <p className="text-sm font-medium" style={{ color: palette.mutedText }}>기록된 궤적이 없습니다.</p>
                    </div>
                 ) : (
                    flowRecords.map((record) => (
                        <Card
                          key={record.id}
                          className="!p-5 shadow-sm transition-transform active:scale-[0.99]"
                          style={{
                            background: record.isPinned ? palette.cardBgStrong : palette.cardBg,
                            borderColor: record.isPinned ? 'rgba(139,92,246,0.34)' : palette.border,
                          }}
                        >
                            <div className={`transition-all duration-700`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-bold tracking-wider" style={{ color: palette.faintText }}>
                                        {new Date(record.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                    {record.isPinned && <Pin size={14} className="text-point-400" />}
                                </div>
                                <div className="flex items-start gap-2.5 mb-3">
                                    {record.moodCode && <MoodSticker code={record.moodCode} className="scale-90 shrink-0 mt-0.5" />}
                                    {record.action && <span className="text-[14px] font-bold line-clamp-2 leading-relaxed" style={{ color: palette.strongText }}>{record.action}</span>}
                                </div>
                                {record.oneWordText && (
                                    <p className="text-[14px] leading-relaxed font-medium p-3 rounded-2xl border" style={{ color: palette.mutedText, background: palette.cardBgSoft, borderColor: palette.border }}>
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
                <div className="relative h-48 w-full backdrop-blur-md rounded-3xl border shadow-sm overflow-hidden" style={{ background: `linear-gradient(to bottom, ${palette.cardBgMuted}, ${palette.cardBgStrong})`, borderColor: palette.border }}>
                     {flowRecords.map((record, i) => (
                         <ForestObject key={record.id} index={i} type={record.action} isLocked={false} />
                     ))}
                     <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none" style={{ backgroundImage: theme === 'dark' ? 'linear-gradient(to top, rgba(15,23,42,0.92), rgba(15,23,42,0.40), transparent)' : 'linear-gradient(to top, rgba(255,255,255,0.80), rgba(255,255,255,0.40), transparent)' }}></div>
                </div>
                <div className="flex justify-center mt-5">
                    <p className="text-xs font-bold backdrop-blur-sm px-5 py-2 rounded-full border shadow-sm" style={{ color: palette.mutedText, background: palette.pillBg, borderColor: palette.pillBorder }}>
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
        <button onClick={onBack} className="p-2 -ml-2 rounded-full transition-colors active:scale-95" style={{ color: palette.faintText, background: theme === 'dark' ? 'rgba(30,41,59,0.52)' : 'transparent' }}>
             <ChevronLeft size={24} />
        </button>
      </div>
      
      <PageHeader title="지나온 방향들" subtitle="걸어온 곡선들이 온전히 당신만의 궤적이 됩니다." />

      <div className="flex-1 overflow-y-auto no-scrollbar relative pb-32">
        {sortedDirections.length === 0 && (
            <div className="text-center py-20 opacity-60">
                <MapPin size={40} className="mx-auto mb-4" style={{ color: palette.faintText }} />
                <p className="font-medium" style={{ color: palette.mutedText }}>아직 지나온 길(방향)이 없습니다.</p>
            </div>
        )}

        {/* 궤적 박스들을 담으면서도 여백을 줄 수 있는 컨테이너 */}
        <div className="relative max-w-sm mx-auto w-full px-6 pt-4">
            <div className="flex justify-center mb-0">
                <div className="w-3 h-3 rounded-full bg-point-300 ring-4 ring-point-100/50 shadow-sm z-10"></div>
            </div>

            {sortedDirections.map((dir, index) => {
                const isEven = index % 2 === 0;
                const prevConnector = index === 0
                  ? <PathSegment direction="start" height={30} strokeColor={theme === 'dark' ? 'rgba(167,139,250,0.38)' : '#C4B5FD'} />
                  : <PathSegment direction={isEven ? "left-to-right" : "right-to-left"} height={55} strokeColor={theme === 'dark' ? 'rgba(148,163,184,0.30)' : '#CBD2D9'} />;
                
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
                                <div
                                  className="relative backdrop-blur-xl p-6 rounded-[2rem] shadow-lg border"
                                  style={{
                                    background: dir.isActive ? palette.cardBgStrong : palette.cardBg,
                                    borderColor: dir.isActive ? 'rgba(139,92,246,0.34)' : palette.border,
                                    boxShadow: dir.isActive ? `0 18px 36px rgba(139,92,246,${theme === 'dark' ? '0.18' : '0.10'})` : undefined,
                                  }}
                                >
                                    <span className="text-[10px] block mb-2 font-bold tracking-widest uppercase opacity-80" style={{ color: palette.faintText }}>
                                        {new Date(dir.createdAt).toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                        {dir.endedAt ? ` ~ ${new Date(dir.endedAt).toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' })}` : ' ~ 현재'}
                                    </span>
                                    <h3 className="text-[15px] font-bold leading-relaxed line-clamp-2 mb-4" style={{ color: palette.strongText }}>
                                        {dir.question}
                                    </h3>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border shadow-sm" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
                                            <span className="text-[9px] font-bold tracking-wider" style={{ color: palette.faintText }}>기록</span>
                                            <span className="text-[11px] font-bold text-point-500">{count}개</span>
                                        </div>
                                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border shadow-sm" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
                                            <span className="text-[9px] font-bold tracking-wider" style={{ color: palette.faintText }}>기간</span>
                                            <span className="text-[11px] font-bold" style={{ color: palette.mutedText }}>{dayDiff}일</span>
                                        </div>
                                        {topMood && (
                                            <div className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border shadow-sm" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
                                                <MoodSticker code={topMood} className="scale-[0.72] origin-center shadow-none shrink-0" />
                                                <span className="text-[9px] font-bold tracking-wider whitespace-nowrap" style={{ color: palette.faintText }}>주된 감정</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* 현재 위치를 나타내는 작은 노드 마커 */}
                                    <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[3.5px] shadow-sm ${dir.isActive ? 'border-point-300' : ''} ${isEven ? '-left-[15%] md:-left-[20%]' : '-right-[15%] md:-right-[20%]'}`} style={{ background: theme === 'dark' ? '#182234' : '#FFFFFF', borderColor: dir.isActive ? undefined : theme === 'dark' ? '#64748B' : '#CBD5E1' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {sortedDirections.length > 0 && (
                <div className="relative h-32 w-full overflow-hidden mt-2">
                     <PathSegment direction={sortedDirections.length % 2 === 0 ? "left-to-right" : "right-to-left"} height={120} strokeColor={theme === 'dark' ? 'rgba(148,163,184,0.26)' : '#CBD2D9'} />
                </div>
            )}
        </div>
      </div>
      
      {/* 부드럽게 사라지는 하단 그라데이션 - 칙칙한 색 대신 흰색 투명도로 대체하여 dream-bg와 어울리게 함 */}
      <div
        className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t pointer-events-none z-20"
        style={{
          backgroundImage:
            theme === 'dark'
              ? 'linear-gradient(to top, rgba(15,23,42,0.88), rgba(15,23,42,0.32), transparent)'
              : 'linear-gradient(to top, rgba(255,255,255,0.40), rgba(255,255,255,0.10), transparent)',
        }}
      />
    </div>
  );
};
