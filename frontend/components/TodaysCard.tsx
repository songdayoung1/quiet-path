import React, { useState } from 'react';
import { Record as RecordType } from '../types';
import { Card, SoftButton, MoodSticker } from './UI';
import { RefreshCw, Share2, Sparkles, MessageCircle, Globe, Link as LinkIcon, PenLine } from 'lucide-react';
import { WaterDropCharacter, CharacterMood } from './WaterDropCharacter';

interface TodaysCardProps {
  hasLoggedToday: boolean;
  todayRecord: RecordType | null;
  onLogClick: () => void;
  onEditClick: () => void;
}

export const TodaysCard: React.FC<TodaysCardProps> = ({ 
  hasLoggedToday, 
  todayRecord, 
  onLogClick, 
  onEditClick 
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);

  // 1. Before Record State — character waits for you
  if (!hasLoggedToday) {
    return (
      <Card className="!bg-white/85 backdrop-blur-md border border-white/50 shadow-sm !p-6 hover:scale-[1.01] hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <WaterDropCharacter size={90} mood="waiting" animate={true} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-point-300 mb-2">Today&apos;s Record</p>
            <h2 className="text-lg font-bold text-mist-600 leading-tight break-keep">오늘 남기고 싶은<br/>장면이 있나요?</h2>
          </div>
        </div>
        <div className="mt-4">
          <SoftButton onClick={onLogClick} className="!py-3 shadow-lg shadow-point-200/30">
            <PenLine size={16} />
            <span className="text-sm font-semibold">기록 남기기</span>
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
        className={`!p-0 relative overflow-hidden transition-all duration-500 shadow-sm border-white/50 hover:scale-[1.01] hover:shadow-md group ${hasImage ? '!border-transparent text-white' : '!bg-white/85 backdrop-blur-md'}`}
      >
        {/* Background Image Setup */}
        {hasImage && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{ backgroundImage: `url(${todayRecord.imageUrl})` }}
            />
            {/* Dark overlay for text readability on images */}
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] z-0" />
          </>
        )}

        <div className="relative z-10 flex flex-col h-full justify-between p-5 pb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-4">
                 <WaterDropCharacter 
                   size={48} 
                   mood={todayRecord.moodCode as CharacterMood} 
                   animate={true}
                   className="shrink-0 drop-shadow-sm" 
                 />
                 <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${hasImage ? 'text-white/85' : 'text-mist-400'}`}>Today&apos;s Card</p>
               </div>
               {/* Recent Mood (MoodSticker) */}
               {todayRecord.moodCode && <MoodSticker code={todayRecord.moodCode} className="opacity-100 shadow-sm scale-90 origin-right" />}
            </div>
            
            <h2 className={`text-[20px] font-bold leading-tight mb-1.5 break-keep ${hasImage ? 'text-white' : 'text-mist-600'}`}>
              {todayRecord.action || "오늘의 장면"}
            </h2>

            {todayRecord.oneWordText && (
              <p className={`text-[13px] leading-relaxed break-keep font-medium ${hasImage ? 'text-white/90' : 'text-mist-400'}`}>
                {todayRecord.oneWordText}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 shrink-0 pt-3 relative">
            {!hasImage ? (
              <div className="flex items-center gap-2 text-mist-300">
                <Sparkles size={12} className="opacity-70" />
                <span className="text-[10px] font-medium tracking-tight">장면을 남기면 배경 이미지로 바껴요 ✨</span>
              </div>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button 
                onClick={onEditClick} 
                className={`flex items-center justify-center gap-1.5 py-2.5 px-6 rounded-full border transition-all ${hasImage ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' : 'bg-white border-mist-200 text-mist-600 shadow-sm hover:bg-mist-50'}`}
              >
                <RefreshCw size={14} />
                <span className="text-[13px] font-bold tracking-tight">수정</span>
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)} 
                  className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all ${hasImage ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' : 'bg-white border-mist-200 text-mist-600 shadow-sm hover:bg-mist-50'} ${showShareMenu ? '!border-mist-400 !bg-mist-100' : ''}`}
                >
                  <Share2 size={15} className="-ml-0.5" />
                </button>

                {/* Sharing Menu Popover */}
                {showShareMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-44 bg-white/95 backdrop-blur-xl border border-mist-100 rounded-[1.25rem] shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex flex-col gap-0.5">
                      <button className="flex items-center gap-2.5 w-full p-2 hover:bg-mist-50 rounded-xl transition-colors text-left group/item">
                        <span className="text-base leading-none">🏛️</span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-mist-600 mb-0.5">커뮤니티에 공유</span>
                          <span className="text-[9px] text-mist-400 leading-none">앱 내 기록 공간으로</span>
                        </div>
                      </button>
                      <button className="flex items-center gap-2.5 w-full p-2 hover:bg-mist-50 rounded-xl transition-colors text-left group/item">
                        <span className="text-base leading-none">💬</span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-mist-600 mb-0.5">카카오톡 공유</span>
                          <span className="text-[9px] text-mist-400 leading-none">친구에게 메시지 보내기</span>
                        </div>
                      </button>
                      <button className="flex items-center gap-2.5 w-full p-2 hover:bg-mist-50 rounded-xl transition-colors text-left group/item">
                        <span className="text-base leading-none">🔗</span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-mist-600 mb-0.5">링크 복사</span>
                          <span className="text-[9px] text-mist-400 leading-none">URL을 복사합니다</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Backdrop to close share menu when clicking outside */}
        {showShareMenu && (
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={() => setShowShareMenu(false)}
          />
        )}
      </Card>
    );
  }

  return null;
};
