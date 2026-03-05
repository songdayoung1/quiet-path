import React from 'react';
import { AppState } from '../types';
import { getDailyTone } from '../storage';
import { Card, SoftButton, QuoteHeader, WaterCompass } from '../components/UI';
import { PenLine, History, Check, Wind } from 'lucide-react';

interface HomeViewProps {
  state: AppState;
  onLogClick: () => void;
  onHistoryClick: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ state, onLogClick, onHistoryClick }) => {
  const { currentDirection, logs, hasLoggedToday } = state;
  const lastLog = logs.find(l => !l.isHidden);
  const dailyTone = getDailyTone(); 

  const getLastMovedText = () => {
    if (!lastLog) return "시작하지 않음.";
    const diff = Date.now() - lastLog.timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "오늘 움직임.";
    if (days === 1) return "어제 움직임.";
    return `${days}일 전 기록.`;
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-up pb-32 pt-2 relative z-10">
      {/* 1. Header with Focus (Clean, no tone name) */}
      <div className="px-2 mt-2 mb-1 flex items-end justify-between">
        <div>
           <p className="text-point-500 text-[10px] font-bold tracking-widest uppercase mb-1">
             Today's Focus
           </p>
        </div>
        <span className="text-[10px] px-3 py-1 bg-white/40 rounded-full text-mist-400 backdrop-blur-sm border border-white/40 shadow-sm">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* 2. Main Direction Card with Water Compass (Time Flow) */}
      <div className="relative group perspective-1000">
        <Card 
          className="min-h-[300px] flex flex-col justify-between relative !bg-white/70 backdrop-blur-2xl" 
          breathe={true} 
          withTraces={true}
        >
          
          {currentDirection ? (
            <div className="z-10 w-full flex flex-col items-center flex-1 justify-center gap-6">
               <div className="w-full flex flex-col items-center">
                 <QuoteHeader text={currentDirection.question} className="mb-2 w-full" />
                 <p className="text-mist-500 text-sm font-light tracking-wide px-4 leading-loose text-center whitespace-pre-line opacity-90">
                   {currentDirection.description}
                 </p>
               </div>
               
               <div className="w-full flex flex-col items-center justify-center pb-2">
                 <WaterCompass 
                    startDate={currentDirection.createdAt} 
                    reviewDate={currentDirection.reviewAt} 
                 />
                 {currentDirection.reviewAt && (
                    <p className="text-[10px] text-mist-300 font-medium tracking-wider mt-[-8px]">
                        Until {new Date(currentDirection.reviewAt).toLocaleDateString()}
                    </p>
                 )}
               </div>
            </div>
          ) : (
            <div className="z-10 text-center py-12">
                <p className="text-mist-400 mb-6 font-light">설정된 방향이 없습니다.</p>
                <button onClick={onHistoryClick} className="text-xs text-point-500 hover:text-point-600 transition-colors border-b border-point-200 pb-0.5">
                    이전 흐름 보기
                </button>
            </div>
          )}
        </Card>
      </div>

      {/* 3. Motivation Card */}
      {!hasLoggedToday && (
        <Card className="!bg-white/40 !border-white/30 py-5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-mist-100/50 flex items-center justify-center shrink-0">
               <Wind className="w-4 h-4 text-mist-400" />
            </div>
            <div>
              <p className="text-mist-600 text-sm font-normal leading-relaxed">
                {/* Tone specific text without revealing the tone name explicitly */}
                {dailyTone.type === 'Fact' && "생각은 덜어내고 사실만 남기세요."}
                {dailyTone.type === 'Observe' && "멀리서 나를 보듯 적어보세요."}
                {dailyTone.type === 'Honest' && "누구에게도 보여주지 않을 글입니다."}
                {dailyTone.type === 'Casual' && "아주 가볍게, 친구에게 말하듯이."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Post-Log Message */}
      {hasLoggedToday ? (
        <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-point-50 flex items-center justify-center mb-3">
             <Check className="w-5 h-5 text-point-500" />
          </div>
          <p className="text-mist-600 text-sm font-medium mb-1">흔적이 남겨졌습니다.</p>
          <p className="text-mist-400 text-xs font-light mb-4">이 기록은 흐름 속에 보관됩니다.</p>
          
          <button 
              onClick={onHistoryClick} 
              className="flex items-center gap-1 text-[11px] text-mist-400 hover:text-point-500 transition-colors border-b border-mist-200 pb-0.5"
          >
              <History size={12} />
              <span>지나온 궤적 보기</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 my-2">
          <p className="text-xs text-mist-400 font-medium tracking-wide">
            {getLastMovedText()}
          </p>
          <button 
              onClick={onHistoryClick} 
              className="flex items-center gap-1 text-[10px] text-mist-300 hover:text-mist-500 transition-colors"
          >
              <History size={10} />
              <span>지나온 궤적 보기</span>
          </button>
        </div>
      )}

      {/* 5. Primary Action - Fixed to bottom regardless of scroll */}
      {!hasLoggedToday && (
        <div className="fixed bottom-24 left-0 w-full px-6 z-30 flex justify-center pointer-events-none">
           <div className="w-full max-w-md pointer-events-auto">
             <SoftButton 
                onClick={onLogClick} 
                className="shadow-xl shadow-point-500/20"
             >
                <PenLine className="w-4 h-4" />
                <span>기록 남기기</span>
             </SoftButton>
           </div>
        </div>
      )}
    </div>
  );
};