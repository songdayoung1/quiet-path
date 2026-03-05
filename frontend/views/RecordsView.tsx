import React, { useState } from 'react';
import { AppState, LogEntry, Direction } from '../types';
import { Card, PageHeader, VisualTrace } from '../components/UI';
  import { MoreHorizontal, EyeOff, Pin, Calendar, Lock, Share2, Globe2 } from 'lucide-react';
  
  interface RecordsViewProps {
    logs: LogEntry[];
    currentDirection: Direction | null;
    pastDirections: Direction[];
    onUpdateLog: (log: LogEntry) => void;
  }
  
  export const RecordsView: React.FC<RecordsViewProps> = ({ logs, currentDirection, onUpdateLog }) => {
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    
    // Sort logs by date (newest first)
    const sortedLogs = [...logs].filter(log => !log.isHidden).sort((a, b) => b.timestamp - a.timestamp);
    const today = new Date().toDateString();
  
    const handleHide = (log: LogEntry) => {
      onUpdateLog({ ...log, isHidden: true });
      setActiveMenuId(null);
    };
  
    const handlePin = (log: LogEntry) => {
      onUpdateLog({ ...log, isPinned: !log.isPinned });
      setActiveMenuId(null);
    };

    const handleShare = (log: LogEntry) => {
        if (!log.isShared) {
            // In a real app, this would post to backend
            onUpdateLog({ ...log, isShared: true });
            alert("커뮤니티에 조용히 공유되었습니다.");
        }
        setActiveMenuId(null);
    };

  // Date Header Format
  const dateTitle = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="pb-28 animate-slide-up pt-4 relative z-10 min-h-[60vh]" onClick={() => setActiveMenuId(null)}>
      
      {/* 1. Header: Simple & Present */}
      <div className="px-4 mb-4">
         <div className="flex items-center gap-2 mb-1 opacity-60">
            <Calendar size={14} className="text-mist-400" />
            <span className="text-xs font-bold text-mist-400 uppercase tracking-widest">Journal</span>
         </div>
         <h1 className="text-2xl font-serif text-mist-600 tracking-tight">
            Your Steps
         </h1>
      </div>

      {/* 2. Content: Log List */}
      {sortedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center animate-fade-in px-8">
           <div className="w-16 h-16 border-2 border-dashed border-mist-200 rounded-full flex items-center justify-center mb-4 opacity-50">
             <span className="text-xl grayscale opacity-30">✍️</span>
           </div>
           <p className="text-mist-400 font-medium mb-2">아직 기록이 없습니다.</p>
           <p className="text-mist-300 text-sm font-light leading-relaxed">
             오늘 하루, 당신의 방향을<br/>가볍게 남겨보세요.
           </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-2">
          {sortedLogs.map((log, index) => {
            const isTodayLog = new Date(log.timestamp).toDateString() === today;
            // Time Capsule Logic: Blur if NOT today AND Direction is Active (and log belongs to current direction)
            // Assuming logs created after direction start belong to it.
            const belongsToCurrentDirection = currentDirection && log.timestamp >= currentDirection.createdAt;
            const isLocked = !isTodayLog && currentDirection?.isActive && belongsToCurrentDirection;

            return (
            <div key={log.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
               <VisualTrace index={index} />
               
               <Card className="!p-6 !rounded-[1.5rem] bg-white/60 backdrop-blur-md border border-white/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  
                  {/* Card Header: Date, Time & Question */}
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex flex-col">
                        <span className="text-[10px] text-mist-300 font-medium mb-1 flex items-center gap-2">
                          {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {log.isShared && <Globe2 size={10} className="text-point-400" />}
                        </span>
                        <span className="text-xs text-point-500 font-semibold tracking-wide">
                          {log.directionQuestion}
                        </span>
                     </div>
                     <div className="flex items-center gap-1 -mr-2 -mt-2">
                        {isTodayLog && !log.isShared && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShare(log);
                                }}
                                className="text-point-400 hover:text-point-600 hover:bg-point-50 transition-colors p-2 rounded-full"
                                title="Share to Community"
                            >
                                <Share2 size={16} />
                            </button>
                        )}
                        <button 
                            onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === log.id ? null : log.id);
                            }}
                            className="text-mist-200 hover:text-mist-400 transition-colors p-2 rounded-full"
                        >
                            <MoreHorizontal size={16} />
                        </button>
                     </div>
                  </div>

                  {/* Context Menu */}
                  {activeMenuId === log.id && (
                      <div className="absolute right-4 top-10 bg-white shadow-lg rounded-xl p-1 z-20 border border-mist-100 animate-fade-in min-w-[140px]">
                         <button onClick={(e) => { e.stopPropagation(); handlePin(log); }} className="flex items-center gap-2 px-3 py-2 text-xs text-mist-500 hover:bg-mist-50 rounded-lg w-full text-left">
                          <Pin size={12} /> {log.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        {isTodayLog && !log.isShared && (
                             <button onClick={(e) => { e.stopPropagation(); handleShare(log); }} className="flex items-center gap-2 px-3 py-2 text-xs text-point-500 hover:bg-point-50 rounded-lg w-full text-left font-medium">
                                <Share2 size={12} /> 커뮤니티 공유
                             </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleHide(log); }} className="flex items-center gap-2 px-3 py-2 text-xs text-mist-500 hover:bg-mist-50 rounded-lg w-full text-left">
                          <EyeOff size={12} /> Hide
                        </button>
                      </div>
                  )}

                  {/* Body: Action (Fact) */}
                  <div className={`mb-3 relative transition-all duration-500 ${isLocked ? 'blur-sm select-none grayscale opacity-60' : ''}`}>
                     <p className="text-mist-600 text-sm leading-relaxed font-normal">
                        {log.action}
                     </p>
                  </div>

                  {/* Footer: Reflection (Optional/Light) */}
                  <div className={`pl-3 border-l-2 border-point-100 mt-2 py-1 relative transition-all duration-500 ${isLocked ? 'blur-sm select-none opacity-40' : ''}`}>
                     <p className="text-mist-400 text-xs italic">
                        "{log.reflection}"
                     </p>
                  </div>

                  {/* Locked Overlay */}
                  {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-sm mb-2">
                              <Lock size={16} className="text-mist-400" />
                          </div>
                          <span className="text-[10px] text-mist-500 font-medium tracking-widest uppercase">Time Capsule</span>
                          <span className="text-[9px] text-mist-300 mt-1">{new Date(currentDirection?.reviewAt || 0).toLocaleDateString()} 대강 개봉 예정</span>
                      </div>
                  )}
                  
                  {/* Mood Tag */}
                  {log.mood && !isLocked && (
                    <div className="absolute bottom-6 right-6 opacity-50">
                        <span className="text-lg">{log.mood}</span>
                    </div>
                  )}

               </Card>
            </div>
            );
          })}
        </div>
      )}

      {/* Footer Hint */}
      {sortedLogs.length > 0 && (
          <div className="text-center mt-12 mb-8 opacity-40">
              <p className="text-[10px] text-mist-400 tracking-widest uppercase">
                  End of Journal
              </p>
          </div>
      )}
    </div>
  );
};
