import React from 'react';
import { Direction } from '../types';
import { Compass } from 'lucide-react';
import { CategoryIcon, Card } from './UI';
import { CATEGORIES } from '../constants';

interface CurrentPathStripProps {
  currentDirection: Direction | null;
  currentPathConsistency: number;
  currentPathRecordCount: number;
}

export const CurrentPathStrip: React.FC<CurrentPathStripProps> = ({
  currentDirection,
  currentPathConsistency
}) => {
  const reviewDateText = currentDirection?.reviewAt
    ? new Date(currentDirection.reviewAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : null;

  const cat = CATEGORIES.find(c => c.id === currentDirection?.categoryId);

  return (
    <Card
      className="!rounded-[2.5rem] !p-7 border-white/60 shadow-md !transition-all !duration-300"
      style={{
        background: cat
          ? `linear-gradient(135deg, ${cat.accentBg}66, rgba(255,255,255,0.8))`
          : 'rgba(255,255,255,0.7)',
      }}
    >
      {/* Decorative glow */}
      <div
        className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40"
        style={{ background: cat ? `${cat.accentBg}` : 'rgba(196,181,253,0.3)' }}
      />

      <div className="flex items-start gap-6 relative z-10">
        {/* Category Section: Name above Icon */}
        <div className="flex flex-col items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-bold tracking-wider" style={{ color: cat?.accent ?? '#8B5CF6' }}>
            {cat?.label || 'Path'}
          </span>
          <CategoryIcon categoryId={currentDirection?.categoryId} size="lg" className="!rounded-[1.75rem] shadow-lg" />
        </div>

        {/* Content Section: Title and Question aligned */}
        <div className="flex-1 min-w-0 flex flex-col justify-center pt-5">
          <h3 className="text-[19px] font-bold text-mist-600 leading-snug break-keep mb-2">
            {currentDirection?.description || '아직 설정된 여정이 없어요'}
          </h3>
          {currentDirection?.question && (
            <p className="text-[13px] text-mist-400 font-medium leading-relaxed break-keep opacity-80 border-l-2 border-mist-100 pl-3">
              {currentDirection.question}
            </p>
          )}
        </div>

        {/* Info Section: Consistency & Review Date */}
        <div className="flex flex-col items-end shrink-0 gap-3 pt-1">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-2xl font-black tracking-tighter" style={{ color: cat?.accent ?? '#8B5CF6' }}>
                {currentPathConsistency}
              </span>
              <span className="text-[10px] font-bold text-mist-300">%</span>
            </div>
            <p className="text-[9px] font-bold text-mist-300 uppercase tracking-widest mt-0.5">Focus</p>
          </div>
          
          {reviewDateText && (
            <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full border border-mist-100 shadow-sm">
              <Compass size={10} className="text-point-400" />
              <span className="text-[10px] font-bold text-mist-500">
                ~ {reviewDateText}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
