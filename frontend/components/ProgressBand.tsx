import React from 'react';
import { Record } from '../types';
import { Card, MoodSticker, StreakHeatmap } from './UI';
import { Flame } from 'lucide-react';
import { getThemePalette, useResolvedTheme } from '../theme';

interface ProgressBandProps {
  records: Record[];
  monthlyRecords: Record[];
  monthlyConsistency: number;
  topMood?: string;
}

export const ProgressBand: React.FC<ProgressBandProps> = ({ 
  records, 
  monthlyRecords, 
  monthlyConsistency, 
  topMood 
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="flex flex-col gap-3">
       {/* 1. Streak Heatmap Section */}
      <Card className="backdrop-blur-md shadow-sm !p-5" style={{ background: palette.cardBg, borderColor: palette.border }}>
        <StreakHeatmap records={records} />
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
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: palette.faintText }}>Rate</p>
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
