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
      className="!rounded-[2rem] !p-4 backdrop-blur-md shadow-sm !transition-all !duration-300"
      style={{ background: palette.cardBg, borderColor: palette.border }}
    >
      <div className="relative z-10 flex items-center gap-3.5">
        <CategoryIcon categoryId={currentDirection.categoryId} size="md" className="self-center" />

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide"
              style={{ background: palette.cardBgSoft, borderColor: palette.divider, color: palette.mutedText }}
            >
              {cat?.label || '카테고리'}
            </span>
            {reviewDateText && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold"
                style={{ background: palette.pillBg, borderColor: palette.pillBorder, color: palette.mutedText }}
              >
                <Compass size={9} className="text-point-400" />
                ~ {reviewDateText}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 break-keep text-[16px] font-bold leading-[1.35]" style={{ color: palette.strongText }}>
            {currentDirection.description || '아직 설정된 여정이 없어요'}
          </h3>
          {currentDirection.question && (
            <p className="mt-1 line-clamp-1 break-keep text-[11px] font-medium leading-relaxed" style={{ color: palette.mutedText }}>
              {currentDirection.question}
            </p>
          )}
        </div>

        <div
          className="flex min-w-[64px] shrink-0 flex-col items-center justify-center self-stretch rounded-[1.15rem] border px-2 py-2.5"
          style={{
            background: theme === 'dark' ? 'rgba(139,92,246,0.12)' : 'rgba(245,243,255,0.72)',
            borderColor: theme === 'dark' ? 'rgba(167,139,250,0.2)' : 'rgba(196,181,253,0.42)',
          }}
        >
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-[21px] font-black leading-none tracking-tighter text-point-500">
              {currentPathConsistency}
            </span>
            <span className="text-[9px] font-bold" style={{ color: palette.faintText }}>%</span>
          </div>
          <p className="mt-1 whitespace-nowrap text-[7px] font-bold uppercase tracking-[0.12em]" style={{ color: palette.faintText }}>
            {KPI_LABELS.pathRate}
          </p>
        </div>
      </div>
    </Card>
  );
};
