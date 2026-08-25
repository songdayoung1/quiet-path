import React, { useEffect, useState } from 'react';
import { Record as RecordType } from '../types';
import { Card, SoftButton, MoodSticker } from './UI';
import { RefreshCw, Sparkles, PenLine } from 'lucide-react';
import { WaterDropCharacter, CharacterMood } from './WaterDropCharacter';
import { getThemePalette, useResolvedTheme } from '../theme';
import { RecordPreviewLine } from './RecordPreviewLine';
import { RecordImage } from './RecordImage';

interface TodaysCardProps {
  hasLoggedToday: boolean;
  hasActiveDirection: boolean;
  todayRecord: RecordType | null;
  onLogClick: () => void;
  onEditClick: () => void;
}

export const TodaysCard: React.FC<TodaysCardProps> = ({ 
  hasLoggedToday, 
  hasActiveDirection,
  todayRecord, 
  onLogClick, 
  onEditClick,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [isEditHovered, setIsEditHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isRestingState = !hasActiveDirection;

  useEffect(() => {
    setIsExpanded(false);
  }, [todayRecord?.id]);

  // 1. Resting state - no active direction
  if (isRestingState) {
    return (
      <Card className="backdrop-blur-md shadow-sm !p-6 xl:!p-5" style={{ background: palette.cardBg, borderColor: palette.border }}>
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <WaterDropCharacter size={90} mood="waiting" animate={true} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-point-300 mb-2">RESTING NOW</p>
            <h2 className="text-lg font-bold leading-tight break-keep whitespace-pre-line" style={{ color: palette.strongText }}>
              지금은 잠시
              <br />
              쉬고 있어요
            </h2>
            <p className="text-sm mt-2 break-keep" style={{ color: palette.mutedText }}>원할 때 새 방향을 시작해요.</p>
          </div>
        </div>
        <div className="mt-4 xl:mt-3">
          <SoftButton onClick={onLogClick} className="!py-3 shadow-lg shadow-point-200/30">
            <PenLine size={16} />
            <span className="text-sm font-semibold">새 방향 시작하기</span>
          </SoftButton>
        </div>
      </Card>
    );
  }

  // 2. Before Record State — character waits for you
  if (!hasLoggedToday) {
    return (
      <Card className="backdrop-blur-md shadow-sm !p-6 xl:!p-5" style={{ background: palette.cardBg, borderColor: palette.border }}>
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <WaterDropCharacter size={90} mood="waiting" animate={true} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-point-300 mb-2">TODAY&apos;S RECORD</p>
            <h2 className="text-lg font-bold leading-tight break-keep whitespace-pre-line" style={{ color: palette.strongText }}>
              오늘 남기고 싶은
              <br />
              기록이 있나요?
            </h2>
            <p className="text-sm mt-2 break-keep" style={{ color: palette.mutedText }}>한 줄만 남겨도 충분해요.</p>
          </div>
        </div>
        <div className="mt-4 xl:mt-3">
          <SoftButton onClick={onLogClick} className="!py-3 shadow-lg shadow-point-200/30">
            <PenLine size={16} />
            <span className="text-sm font-semibold">기록 남기기</span>
          </SoftButton>
        </div>
      </Card>
    );
  }

  // 3. After Record State (Result Display)
  if (todayRecord) {
    const hasImage = !!todayRecord.imageUrl;
    const editButtonStyle = hasImage
      ? undefined
      : {
          background: isEditHovered
            ? (theme === 'dark' ? 'rgba(124,58,237,0.22)' : 'rgba(237,233,254,0.82)')
            : palette.pillBg,
          borderColor: isEditHovered
            ? (theme === 'dark' ? 'rgba(196,181,253,0.28)' : 'rgba(196,181,253,0.78)')
            : palette.pillBorder,
          color: palette.strongText,
          boxShadow: isEditHovered
            ? (theme === 'dark' ? '0 10px 24px rgba(15,23,42,0.18)' : '0 10px 22px rgba(139,92,246,0.10)')
            : undefined,
        };
    return (
      <Card 
        className={`!p-0 relative overflow-hidden shadow-sm group ${hasImage ? 'text-white' : 'backdrop-blur-md'} ${isExpanded ? 'min-h-[280px] xl:min-h-[238px] h-auto' : ''}`}
        style={{
          background: hasImage ? undefined : palette.cardBgStrong,
          borderColor: hasImage ? 'transparent' : palette.border,
        }}
      >
        {/* Background Image Setup */}
        {hasImage && (
          <>
            <RecordImage record={todayRecord} alt="오늘의 기록 사진" className="absolute inset-0 z-0 h-full w-full" />
            {/* Dark overlay for text readability on images */}
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] z-0" />
          </>
        )}

        <div className="relative z-10 flex flex-col p-4 xl:p-3 pb-3 xl:pb-2.5">
          <div className="flex items-center justify-between mb-2.5 xl:mb-1.5">
             <div className="flex items-center gap-4 xl:gap-3">
               <WaterDropCharacter 
                 size={44}
                 mood={todayRecord.moodCode as CharacterMood} 
                 animate={true}
                 className="shrink-0 drop-shadow-sm xl:scale-[0.86] xl:origin-left" 
               />
              <p className="text-[11px] xl:text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: hasImage ? 'rgba(255,255,255,0.85)' : palette.mutedText }}>Today&apos;s Card</p>
             </div>
             {/* Recent Mood (MoodSticker) */}
             {todayRecord.moodCode && <MoodSticker code={todayRecord.moodCode} className="opacity-100 shadow-sm scale-90 origin-right" />}
          </div>

          <div className="flex flex-col items-center text-center pt-4 xl:pt-1.5">
            <RecordPreviewLine
              text={todayRecord.action || '오늘의 기록'}
              align="center"
              expanded={isExpanded}
              onMoreClick={() => setIsExpanded((prev) => !prev)}
              textClassName="text-[18px] xl:text-[16px] font-bold leading-tight tracking-[-0.02em]"
              expandedTextClassName="text-[17px] xl:text-[15px] font-bold leading-[1.62] tracking-[-0.02em]"
              textStyle={{ color: hasImage ? '#FFFFFF' : palette.strongText }}
              moreClassName="text-[11px] font-medium tracking-tight opacity-70 transition-opacity hover:opacity-100"
              moreStyle={{ color: hasImage ? 'rgba(255,255,255,0.74)' : palette.faintText }}
            />

            {todayRecord.oneWordText && (
              <div className={`flex w-full max-w-[220px] flex-col items-center ${isExpanded ? 'mt-6 xl:mt-4' : 'mt-7 xl:mt-5'}`}>
                <p
                  className="text-[10px] font-bold tracking-[0.14em] mb-1.5"
                  style={{ color: hasImage ? 'rgba(255,255,255,0.72)' : palette.faintText }}
                >
                  오늘의 한 단어
                </p>
                <p
                  className="text-[13px] leading-relaxed break-keep font-medium"
                  style={{ color: hasImage ? 'rgba(255,255,255,0.9)' : palette.mutedText }}
                >
                  "{todayRecord.oneWordText}"
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 xl:mt-2.5 flex items-center justify-between gap-3 shrink-0 pt-4 xl:pt-2.5 relative">
            {!hasImage ? (
              <div className="flex items-center gap-2" style={{ color: palette.faintText }}>
                <Sparkles size={12} className="opacity-70" />
                <span className="text-[10px] font-medium tracking-tight">기록을 남기면 배경 이미지로 바뀌어요 ✨</span>
              </div>
            ) : <div />}

            <button
              onClick={onEditClick}
              onMouseEnter={() => setIsEditHovered(true)}
              onMouseLeave={() => setIsEditHovered(false)}
              className={`flex items-center justify-center gap-1.5 py-2 xl:py-1.5 px-5 xl:px-4 rounded-full border transition-all ${hasImage ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' : 'shadow-sm'}`}
              style={editButtonStyle}
            >
              <RefreshCw size={14} />
              <span className="text-[13px] font-bold tracking-tight">수정</span>
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};
