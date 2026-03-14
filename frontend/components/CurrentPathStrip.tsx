import React from 'react';
import { Direction } from '../types';
import { Compass } from 'lucide-react';
import { CategoryIcon } from './UI';
import { CATEGORIES } from '../constants';

interface CurrentPathStripProps {
  currentDirection: Direction | null;
  currentPathConsistency: number;
  currentPathRecordCount: number;
}

export const CurrentPathStrip: React.FC<CurrentPathStripProps> = ({
  currentDirection,
  currentPathConsistency,
  currentPathRecordCount
}) => {
  const reviewDateText = currentDirection?.reviewAt
    ? new Date(currentDirection.reviewAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : null;

  const cat = CATEGORIES.find(c => c.id === currentDirection?.categoryId);

  return (
    <div
      className="backdrop-blur-md rounded-[1.5rem] p-4 flex flex-col gap-3 shadow-sm border border-white/50 relative overflow-hidden"
      style={{
        background: cat
          ? `linear-gradient(135deg, ${cat.accentBg}99, rgba(255,255,255,0.7))`
          : 'rgba(255,255,255,0.6)',
      }}
    >
      {/* Decorative glow — 카테고리 색상 사용 */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"
        style={{ background: cat ? `${cat.accentBg}80` : 'rgba(196,181,253,0.3)' }}
      />

      <div className="flex items-center gap-3 relative z-10">
        {/* 카테고리 아이콘 뱃지 */}
        {currentDirection?.categoryId ? (
          <CategoryIcon categoryId={currentDirection.categoryId} size="md" />
        ) : (
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/60 border border-white/70 shadow-sm shrink-0">
            <Compass size={16} className="text-point-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 mb-1"
            style={cat
              ? { background: `${cat.accentBg}CC`, color: cat.accent }
              : { background: 'rgba(245,243,255,0.8)', color: '#8B5CF6' }
            }
          >
            <Compass size={9} />
            {cat ? cat.label : 'Current Path'}
          </div>
          <p className="text-[15px] font-bold text-mist-600 leading-tight truncate">
            {currentDirection?.description || '아직 설정된 여정이 없어요'}
          </p>
          {currentDirection?.question && (
            <p className="text-[11px] text-mist-400 mt-0.5 line-clamp-1">
              Q. {currentDirection.question}
            </p>
          )}
        </div>

        {/* Consistency 수치 */}
        <div className="flex flex-col items-end shrink-0 gap-1 pt-1">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold" style={{ color: cat?.accent ?? '#8B5CF6' }}>
              {currentPathConsistency}
            </span>
            <span className="text-[10px] font-bold text-mist-300">%</span>
          </div>
          {reviewDateText && (
            <span className="text-[9px] font-medium text-mist-400 bg-white/70 px-2 py-0.5 rounded-full border border-mist-100">
              ~ {reviewDateText}
            </span>
          )}
        </div>
      </div>

      {/* 기록 횟수 점 인디케이터 */}
      {currentPathRecordCount > 0 && (
        <div className="flex items-center gap-1 mt-1 opacity-60 pl-1">
          {Array.from({ length: Math.min(5, currentPathRecordCount) }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ background: cat?.accent ?? '#C4B5FD' }}
            />
          ))}
          {currentPathRecordCount > 5 && (
            <span className="text-[8px] font-bold text-mist-400 ml-1">+{currentPathRecordCount - 5}</span>
          )}
        </div>
      )}
    </div>
  );
};
