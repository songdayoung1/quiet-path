import React from 'react';
import { Direction } from '../types';
import { Compass, Wind } from 'lucide-react';
import { CategoryIcon, Card } from './UI';
import { CATEGORIES } from '../constants';
import { getThemePalette, useResolvedTheme } from '../theme';

interface CurrentPathStripProps {
  currentDirection: Direction | null;
  currentPathConsistency: number;
  currentPathRecordCount: number;
}

export const CurrentPathStrip: React.FC<CurrentPathStripProps> = ({
  currentDirection,
  currentPathConsistency
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const reviewDateText = currentDirection?.reviewAt
    ? new Date(currentDirection.reviewAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : null;

  const cat = CATEGORIES.find(c => c.id === currentDirection?.categoryId);
  const accentColor = cat?.accent || '#8B5CF6';

  if (!currentDirection) {
    return (
      <Card className="!rounded-[2rem] !p-6 backdrop-blur-md shadow-sm !transition-all !duration-300 flex items-center justify-center gap-4 py-8" style={{ background: palette.cardBg, borderColor: palette.border }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1 border shadow-inner" style={{ background: palette.cardBgSoft, borderColor: palette.divider }}>
          <Wind size={22} className="text-mist-300" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col">
          <p className="text-[15px] font-bold tracking-wide" style={{ color: palette.strongText }}>지금은 잠시 쉬고 있어요</p>
          <p className="text-[11px] font-medium tracking-wide mt-0.5" style={{ color: palette.mutedText }}>원할 때 새 방향을 천천히 시작해요.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="!rounded-[2rem] !p-5 backdrop-blur-md shadow-sm !transition-all !duration-300"
      style={{ background: palette.cardBg, borderColor: palette.border }}
    >
      <div className="flex items-center gap-5 relative z-10">
        {/* Category Section: Icon with subtle background circle */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold tracking-wider mb-1" style={{ color: accentColor }}>
            {cat?.label || 'Path'}
          </span>
          <div className="relative">
             <div 
               className="absolute inset-0 rounded-full blur-md opacity-20"
               style={{ backgroundColor: accentColor }}
             />
             <CategoryIcon 
               categoryId={currentDirection?.categoryId} 
               size="lg" 
               className="!rounded-full shadow-sm relative z-10 border border-white" 
             />
          </div>
        </div>

        {/* Content Section: Title and Question */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-[17px] font-bold leading-snug break-keep mb-1.5" style={{ color: palette.strongText }}>
            {currentDirection?.description || '아직 설정된 여정이 없어요'}
          </h3>
          {currentDirection?.question && (
            <p className="text-[12px] font-medium leading-relaxed break-keep line-clamp-1 opacity-90" style={{ color: palette.mutedText }}>
              {currentDirection.question}
            </p>
          )}
        </div>

        {/* Info Section: Consistency & Review Date */}
        <div className="flex flex-col items-end shrink-0 gap-2.5">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-0.5">
              <span className="text-2xl font-black tracking-tighter" style={{ color: accentColor }}>
                {currentPathConsistency}
              </span>
              <span className="text-[10px] font-bold" style={{ color: palette.faintText }}>%</span>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: palette.faintText }}>Rate</p>
          </div>
          
          {reviewDateText && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
              <Compass size={10} className="text-point-400" />
              <span className="text-[9px] font-bold" style={{ color: palette.mutedText }}>
                ~ {reviewDateText}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
