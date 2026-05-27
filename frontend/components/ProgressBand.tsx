import React from 'react';
import { Record } from '../types';
import { Card, MoodSticker, StreakHeatmap } from './UI';
import { Flame, ChevronDown } from 'lucide-react';
import { KPI_LABELS } from '../kpiLabels';
import { getThemePalette, useResolvedTheme } from '../theme';

interface ProgressBandProps {
  records: Record[];
  monthlyRecords: Record[];
  monthlyConsistency: number;
  topMood?: string;
  onExpandHeatmap?: () => void;
}

export const ProgressBand: React.FC<ProgressBandProps> = ({
  records,
  monthlyRecords,
  monthlyConsistency,
  topMood,
  onExpandHeatmap,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="flex flex-col gap-3">
       {/* 1. Streak Heatmap Section */}
      <Card
        className="backdrop-blur-md shadow-sm !p-5 cursor-pointer transition-transform active:scale-[0.995]"
        style={{ background: palette.cardBg, borderColor: palette.border }}
        onClick={onExpandHeatmap}
      >
        <StreakHeatmap records={records} />
        {onExpandHeatmap && (
          <div className="flex items-center justify-end gap-1 mt-3 pt-3" style={{ borderTop: `1px solid ${palette.divider}` }}>
            <span className="text-[11px] font-medium" style={{ color: palette.mutedText }}>
              더 길게 보기
            </span>
            <ChevronDown size={12} style={{ color: palette.mutedText }} />
          </div>
        )}
      </Card>

      {/* 2. Monthly Summary Stats */}
      <Card className="backdrop-blur-md shadow-sm !p-5" style={{ background: palette.cardBg, borderColor: palette.border }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-point-400" />
            <span className="text-sm font-medium" style={{ color: palette.strongText }}>이번 달 요약</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: palette.faintText }}>This Month</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]" style={{ background: palette.cardBgSoft, border: `1px solid ${palette.border}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: palette.faintText }}>Records</p>
            <p className="text-xl font-bold text-point-500 mt-2">{monthlyRecords.length}</p>
          </div>
          <div className="rounded-2xl p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]" style={{ background: palette.cardBgSoft, border: `1px solid ${palette.border}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: palette.faintText }}>{KPI_LABELS.monthRate}</p>
            <p className="text-xl font-bold mt-2" style={{ color: palette.strongText }}>{monthlyConsistency}%</p>
          </div>
          <div className="rounded-2xl p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col items-center" style={{ background: palette.cardBgSoft, border: `1px solid ${palette.border}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: palette.faintText }}>Top Mood</p>
            {topMood ? (
              <MoodSticker code={topMood} className="opacity-100 scale-[0.85] origin-top" />
            ) : (
              <span className="text-sm" style={{ color: palette.faintText }}>-</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
