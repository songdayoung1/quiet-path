import React from 'react';
import { Direction } from '../types';
import { Compass, Wind } from 'lucide-react';
import { CategoryIcon, Card } from './UI';
import { CATEGORIES } from '../constants';
import { KPI_LABELS } from '../kpiLabels';
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

  if (!currentDirection) {
    return (
      <Card className="!rounded-[2rem] !p-6 xl:!p-5 backdrop-blur-md shadow-sm !transition-all !duration-300 flex items-center justify-center gap-4 py-8" style={{ background: palette.cardBg, borderColor: palette.border }}>
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
      withSurfaceOverlay={false}
      className="!rounded-[2rem] !px-5 !py-4 backdrop-blur-md shadow-sm !transition-all !duration-300"
      style={{ background: palette.cardBg, borderColor: palette.border }}
    >
      <div className="relative z-10 flex items-center gap-3">
        <CategoryIcon categoryId={currentDirection.categoryId} size="md" className="self-center" />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold tracking-wide" style={{ color: palette.mutedText }}>
            <span className="font-bold text-point-500">
              {cat?.label || '카테고리'}
            </span>
            {reviewDateText && (
              <>
                <span className="h-2.5 w-px" style={{ background: palette.divider }} />
                <Compass size={9} className="shrink-0 text-point-300" />
                <span className="whitespace-nowrap">{reviewDateText} 회고</span>
              </>
            )}
          </div>

          <h3 className="line-clamp-2 break-keep text-[16px] font-bold leading-[1.4]" style={{ color: palette.strongText }}>
            {currentDirection.description || '아직 설정된 여정이 없어요'}
          </h3>
          {currentDirection.question && (
            <p className="mt-0.5 line-clamp-1 break-keep text-[11px] font-medium leading-relaxed" style={{ color: palette.mutedText }}>
              {currentDirection.question}
            </p>
          )}
        </div>

        <div
          className="flex w-[58px] shrink-0 flex-col items-center justify-center border-l pl-3"
          style={{ borderColor: palette.divider }}
        >
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-[22px] font-black leading-none tracking-tighter text-point-500">
              {currentPathConsistency}
            </span>
            <span className="text-[9px] font-bold" style={{ color: palette.faintText }}>%</span>
          </div>
          <p className="mt-1 whitespace-nowrap text-[7px] font-bold uppercase tracking-[0.1em]" style={{ color: palette.faintText }}>
            {KPI_LABELS.pathRate}
          </p>
        </div>
      </div>
    </Card>
  );
};
