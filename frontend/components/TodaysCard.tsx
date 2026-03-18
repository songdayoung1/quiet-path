import React from 'react';
import { Record } from '../types';
import { Card, SoftButton, MoodSticker } from './UI';
import { PenLine, RefreshCw, Share2 } from 'lucide-react';
import { WaterDropCharacter } from './WaterDropCharacter';

interface TodaysCardProps {
  hasLoggedToday: boolean;
  todayRecord: Record | null;
  onLogClick: () => void;
  onEditClick: () => void;
}

export const TodaysCard: React.FC<TodaysCardProps> = ({ 
  hasLoggedToday, 
  todayRecord, 
  onLogClick, 
  onEditClick 
}) => {
  // 1. Before Record State — character waits for you
  if (!hasLoggedToday) {
    return (
      <Card className="!bg-white/85 shadow-md border border-white/60">
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <WaterDropCharacter size={100} mood="waiting" animate={true} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300 mb-2">Today&apos;s Record</p>
            <h2 className="text-xl font-bold text-mist-600 leading-tight break-keep">오늘 남기고 싶은<br/>장면이 있나요?</h2>
            <p className="text-sm text-mist-400 mt-2 break-keep">한 줄만 남겨도 충분해요.</p>
          </div>
        </div>
        <div className="mt-5">
          <SoftButton onClick={onLogClick} className="!py-4 shadow-lg shadow-point-200/40">
            <PenLine size={18} />
            <span className="text-base font-semibold">기록 남기기</span>
          </SoftButton>
        </div>
      </Card>
    );
  }

  // 2. After Record State (Result Display)
  if (todayRecord) {
    const hasImage = !!todayRecord.imageUrl;

    return (
      <Card 
        className={`!p-0 relative overflow-hidden shadow-lg ${hasImage ? '!border-transparent text-white' : 'border-white/40 bg-gradient-to-br from-mist-50 to-white'}`}
      >
        {/* Background Image Setup */}
        {hasImage && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{ backgroundImage: `url(${todayRecord.imageUrl})` }}
            />
            {/* Dark overlay for text readability on images */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0" />
          </>
        )}

        <div className="relative z-10 flex flex-col h-full min-h-[160px] justify-between p-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <WaterDropCharacter size={40} mood="happy" className="shrink-0" />
                 <p className={`text-[10px] font-bold uppercase tracking-widest ${hasImage ? 'text-white/80' : 'text-mist-400'}`}>Today&apos;s Card</p>
               </div>
               {todayRecord.moodCode && <MoodSticker code={todayRecord.moodCode} className="opacity-100" />}
            </div>
            
            <h2 className={`text-2xl font-bold leading-tight mb-3 break-keep ${hasImage ? 'text-white' : 'text-mist-700'}`}>
              {todayRecord.action || "오늘의 장면"}
            </h2>

            {todayRecord.oneWordText && (
              <p className={`text-[15px] leading-relaxed break-keep ${hasImage ? 'text-white/90' : 'text-mist-600'}`}>
                {todayRecord.oneWordText}
              </p>
            )}
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 shrink-0">
            <SoftButton 
              variant="secondary" 
              onClick={onEditClick} 
              className={`!flex-none !w-auto !py-2.5 !px-4 !text-xs !rounded-xl min-w-[90px] ${hasImage ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' : ''}`}
            >
              <RefreshCw size={14} className="mr-1" />
              수정하기
            </SoftButton>
             <SoftButton 
              variant="secondary" 
              onClick={() => { /* share logic */ }} 
              className={`!flex-none !w-auto !py-2.5 !px-3.5 !rounded-xl ${hasImage ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' : ''}`}
            >
              <Share2 size={14} />
            </SoftButton>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};
