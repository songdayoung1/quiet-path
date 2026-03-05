import React, { useState } from 'react';
import { AppState, Direction, LogEntry } from '../types';
import { Card, PageHeader, SoftButton, ForestObject } from '../components/UI';
import { CheckCircle2, ChevronLeft, Sparkles, CalendarClock, RefreshCw, ChevronDown, ChevronUp, MapPin, Pin, Lock } from 'lucide-react';

interface PastDirectionsViewProps {
  pastDirections: Direction[];
  logs: LogEntry[];
  onBack: () => void;
}

// SVG Curve Component for connecting nodes
const PathSegment: React.FC<{ 
  direction: 'left-to-right' | 'right-to-left' | 'start'; 
  height?: number;
}> = ({ direction, height = 80 }) => {
  const strokeColor = "#CBD2D9"; // mist-200
  
  if (direction === 'start') {
      return (
        <div className="w-full h-12 flex justify-center items-end relative overflow-hidden">
            <div className="h-full w-[2px] bg-gradient-to-t from-mist-200 to-transparent"></div>
        </div>
      );
  }

  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <path
          d={
            direction === 'left-to-right'
              ? "M 20,0 C 20,50 80,50 80,100"
              : "M 80,0 C 80,50 20,50 20,100"
          }
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          className="opacity-60"
        />
      </svg>
    </div>
  );
};

export const PastDirectionsView: React.FC<PastDirectionsViewProps> = ({ pastDirections, logs, onBack }) => {
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Mock AI Logic
  const handleSummarize = () => {
    setIsSummarizing(true);
    setTimeout(() => {
        setIsSummarizing(false);
        setShowSummary(true);
        setSummaryExpanded(true);
    }, 1500);
  };

  // --- DETAIL VIEW ---
  if (selectedDirection) {
    const flowLogs = logs
        .filter(l => l.directionQuestion === selectedDirection.question && !l.isHidden)
        .sort((a, b) => a.timestamp - b.timestamp); // Chronological Order

    const startDate = new Date(selectedDirection.createdAt).toLocaleDateString();
    const endDate = selectedDirection.endedAt ? new Date(selectedDirection.endedAt).toLocaleDateString() : 'Present';

    // Time Anchor Logic
    const now = Date.now();
    const reviewAt = selectedDirection.reviewAt || 0;
    const isLocked = selectedDirection.isActive ? false : (reviewAt > now);
    
    // Formatting the unlock date
    const unlockDate = selectedDirection.reviewAt 
        ? new Date(selectedDirection.reviewAt).toLocaleDateString() 
        : '';

    return (
      <div className="animate-slide-up pt-0 pb-24 relative z-10 bg-[#F5F7FA] min-h-screen">
        
        {/* Sticky Back Header */}
        <div className="sticky top-0 bg-[#F5F7FA]/90 backdrop-blur-md py-4 z-20 w-full px-4 border-b border-white/50 flex items-center gap-2">
            <button 
              onClick={() => setSelectedDirection(null)}
              className="p-1 text-mist-500 hover:text-point-500 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold text-mist-400 uppercase tracking-widest">Back to Flows</span>
        </div>

        {/* Direction Header */}
        <div className="px-6 mt-8 mb-10 text-center animate-fade-in">
            <h2 className="text-xl font-medium text-mist-600 leading-relaxed mb-4 whitespace-pre-line">
                {selectedDirection.question}
            </h2>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-sm border border-mist-100">
                <span className="text-[10px] font-bold text-point-500 uppercase tracking-widest">
                    Period
                </span>
                <span className="text-xs text-mist-400 font-medium">
                    {startDate} — {endDate}
                </span>
            </div>
        </div>

        {/* AI Summary Section */}
        <div className="px-6 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {!showSummary ? (
                <SoftButton 
                    onClick={isLocked ? undefined : handleSummarize} 
                    className={`w-full !rounded-2xl !py-4 shadow-md bg-white border border-point-100 ${isLocked ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
                    variant="secondary"
                    disabled={isLocked}
                >
                    {isSummarizing ? (
                        <>
                            <RefreshCw size={16} className="animate-spin text-point-400" />
                            <span className="text-point-500">흐름을 분석하고 있습니다...</span>
                        </>
                    ) : isLocked ? (
                        <>
                             <Lock size={16} className="text-mist-300" />
                             <span className="text-mist-400">타임 앵커에 도달하면 요약할 수 있습니다</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} className="text-point-400" />
                            <span className="text-point-500">AI로 이 기간의 방향 요약하기</span>
                        </>
                    )}
                </SoftButton>
            ) : (
                <div className="animate-fade-in bg-gradient-to-br from-white to-lavender-50 rounded-2xl border border-lavender-100 shadow-sm overflow-hidden">
                    <div 
                        className="flex items-center justify-between p-4 cursor-pointer bg-white/50 hover:bg-white/80 transition-colors"
                        onClick={() => setSummaryExpanded(!summaryExpanded)}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-point-400" />
                            <span className="text-xs font-bold text-point-500 uppercase tracking-widest">Flow Summary</span>
                        </div>
                        <div className="flex items-center gap-3">
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleSummarize(); }}
                                className="p-1 text-mist-300 hover:text-point-400 transition-colors"
                             >
                                <RefreshCw size={12} />
                             </button>
                             {summaryExpanded ? <ChevronUp size={14} className="text-mist-300"/> : <ChevronDown size={14} className="text-mist-300"/>}
                        </div>
                    </div>
                    {summaryExpanded && (
                        <div className="p-5 pt-0">
                            <div className="h-[1px] w-full bg-lavender-100 mb-4 opacity-50"></div>
                            <p className="text-mist-600 text-sm leading-7 font-light whitespace-pre-line">
                                <strong className="font-medium text-mist-700 block mb-2">"천천히, 그러나 확실하게."</strong>
                                이 기간의 흐름은 외부의 속도보다 내부의 안정을 찾는 과정이었습니다. 작은 성공들이 모여 단단한 기반을 만들었습니다.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Journal List Section */}
        <div className="px-6 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
             <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2 opacity-70">
                    <span className="w-1.5 h-1.5 rounded-full bg-mist-300"></span>
                    <span className="text-xs font-bold text-mist-400 uppercase tracking-widest">Journal Journey</span>
                 </div>
                 {isLocked && (
                    <div className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-md border border-white/60">
                         <Lock size={10} className="text-mist-400" />
                         <span className="text-[10px] text-mist-400">{unlockDate} 해제</span>
                    </div>
                 )}
             </div>

             {/* Locked Micro Copy */}
             {isLocked && (
                <div className="mb-4 animate-fade-in text-center">
                    <p className="text-xs text-mist-400 font-light opacity-80">
                        아직 흐름이 열리지 않았습니다.<br/>
                        {unlockDate}가 되면 다시 선명해집니다.
                    </p>
                </div>
             )}
             
             <div className="flex flex-col gap-4">
                 {flowLogs.length === 0 ? (
                    <div className="text-center py-8 text-mist-300 text-sm">기록된 여정이 없습니다.</div>
                 ) : (
                    flowLogs.map((log) => (
                        <Card 
                            key={log.id} 
                            className={`!p-5 border border-white/60 transition-transform active:scale-[0.99] ${log.isPinned ? 'bg-white shadow-md ring-1 ring-point-100' : 'bg-white/60'}`}
                        >
                            {/* Inner Blur Container for Time Anchor */}
                            <div className={`transition-all duration-700 ${isLocked ? 'blur-[5px] opacity-40 select-none grayscale-[0.5]' : ''}`}>
                                <div className="flex justify-between items-baseline mb-3">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-bold text-mist-500">
                                        {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-[10px] text-mist-300">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {log.isPinned && <Pin size={12} className="text-point-400 rotate-45" />}
                                </div>
                                
                                {/* Question Context */}
                                <p className="text-[10px] text-point-400/90 font-medium mb-3 tracking-wide bg-point-50/50 inline-block px-2 py-0.5 rounded-md">
                                    {log.directionQuestion}
                                </p>
    
                                {/* Action Content */}
                                <p className="text-mist-600 text-sm leading-relaxed mb-3 font-normal">
                                    {log.action}
                                </p>

                                {/* Reflection Content */}
                                {log.reflection && (
                                    <div className="pl-3 border-l-2 border-point-200/50 py-1">
                                        <p className="text-mist-400 text-xs italic leading-relaxed">"{log.reflection}"</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                 )}
             </div>
        </div>
        
        {/* Forest Visualization Section */}
        {flowLogs.length > 0 && (
            <div className="px-6 pb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-2 mb-4 opacity-70">
                    <span className="w-1.5 h-1.5 rounded-full bg-mist-300"></span>
                    <span className="text-xs font-bold text-mist-400 uppercase tracking-widest">Forest of this Path</span>
                </div>
                
                <div className="relative h-60 w-full bg-gradient-to-b from-lavender-50/30 via-white/80 to-white rounded-[2rem] border border-white shadow-inner overflow-hidden">
                     {/* Sky/Atmosphere */}
                     <div className="absolute inset-0 bg-mist-50/20 mix-blend-multiply"></div>
                     
                     {/* Trees */}
                     {flowLogs.map((log, i) => (
                         <ForestObject 
                            key={log.id} 
                            index={i} 
                            type={log.action} 
                            isLocked={isLocked} 
                         />
                     ))}
                     
                     {/* Ground Fade */}
                     <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
                </div>
                
                <div className="flex justify-center mt-4">
                    <p className="text-[10px] text-mist-300 bg-white/50 px-3 py-1 rounded-full border border-white/50">
                        {flowLogs.length} 그루의 나무가 이 길에 심어졌습니다.
                    </p>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- MAIN VIEW: THE WINDING PATH (Unchanged) ---
  const sortedDirections = [...pastDirections].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="animate-slide-up pt-2 pb-0 h-full flex flex-col relative">
      <div className="flex items-center gap-2 mb-2 pl-1 px-4">
        <button onClick={onBack} className="p-1 -ml-1 text-mist-300 hover:text-mist-500">
             <ChevronLeft size={20} />
        </button>
      </div>
      
      <PageHeader 
        title="Past Flows" 
        subtitle="지나온 길들은 사라지지 않고 하나의 궤적이 됩니다." 
      />

      <div className="flex-1 overflow-y-auto no-scrollbar relative pb-32">
        
        {/* Empty State */}
        {sortedDirections.length === 0 && (
            <div className="text-center py-20 opacity-50">
                <MapPin size={32} className="text-mist-200 mx-auto mb-2" />
                <p className="text-mist-300 text-sm">아직 지나온 길이 없습니다.</p>
            </div>
        )}

        {/* The Path Container */}
        <div className="relative max-w-sm mx-auto w-full px-6">
            
            {/* Start Node (Top) */}
            <div className="flex justify-center mb-2">
                <div className="w-3 h-3 rounded-full bg-point-200 ring-4 ring-point-50"></div>
            </div>

            {sortedDirections.map((dir, index) => {
                const isEven = index % 2 === 0;
                // Connector BEFORE the item
                const prevConnector = index === 0 
                    ? <PathSegment direction="start" height={40} />
                    : <PathSegment direction={isEven ? "left-to-right" : "right-to-left"} height={60} />;

                return (
                    <div key={dir.id} className="relative">
                        {/* 1. The Connector from previous node */}
                        {prevConnector}

                        {/* 2. The Item Container */}
                        <div 
                            onClick={() => setSelectedDirection(dir)}
                            className={`relative flex ${isEven ? 'justify-end' : 'justify-start'} -mt-4 mb-2 z-10 group`}
                        >
                            {/* The Card */}
                            <div className={`w-[75%] transition-transform duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer`}>
                                <div className={`
                                    relative bg-white/70 backdrop-blur-xl p-5 rounded-3xl border border-white shadow-sm hover:shadow-md hover:border-point-200
                                    ${dir.isActive ? 'ring-2 ring-point-100' : ''}
                                `}>
                                    <span className="text-[10px] text-mist-400 block mb-2 font-medium tracking-wide">
                                        {new Date(dir.createdAt).toLocaleDateString()}
                                        {dir.endedAt ? ` — ${new Date(dir.endedAt).toLocaleDateString()}` : ' — Now'}
                                    </span>
                                    <h3 className="text-mist-600 text-sm font-medium leading-snug">
                                        {dir.question}
                                    </h3>

                                    {/* Connection Dot on the Card */}
                                    <div className={`
                                        absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-point-200 shadow-sm
                                        ${isEven ? '-left-[20%] md:-left-[28%]' : '-right-[20%] md:-right-[28%]'}
                                    `}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {/* Fading Path at Bottom */}
            {sortedDirections.length > 0 && (
                <div className="relative h-20 w-full overflow-hidden">
                     <PathSegment 
                        direction={sortedDirections.length % 2 === 0 ? "left-to-right" : "right-to-left"} 
                        height={100} 
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#F5F7FA] via-[#F5F7FA]/80 to-transparent"></div>
                </div>
            )}
        </div>
      </div>
      
      {/* Bottom Fade Overlay for the Viewport */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#F5F7FA] to-transparent pointer-events-none z-20"></div>
    </div>
  );
};
