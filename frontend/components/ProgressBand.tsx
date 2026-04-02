import React from 'react';
import { Record } from '../types';
import { Card, MoodSticker, StreakHeatmap } from './UI';
import { Flame } from 'lucide-react';

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
  return (
    <div className="flex flex-col gap-3">
       {/* 1. Streak Heatmap Section */}
      <Card className="!bg-white/85 backdrop-blur-md border border-white/50 shadow-sm !p-5">
        <StreakHeatmap records={records} />
      </Card>

      {/* 2. Monthly Summary Stats */}
      <Card className="!bg-white/85 backdrop-blur-md border border-white/50 shadow-sm !p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-point-400" />
            <span className="text-sm font-medium text-mist-600">이번 달 요약</span>
          </div>
          <span className="text-[10px] font-bold text-mist-300 uppercase tracking-widest">This Month</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/70 p-3 border border-white text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-mist-300">Records</p>
            <p className="text-xl font-bold text-point-500 mt-2">{monthlyRecords.length}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 border border-white text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-mist-300">Consist.</p>
            <p className="text-xl font-bold text-mist-600 mt-2">{monthlyConsistency}%</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 border border-white text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col items-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-mist-300 mb-2">Top Mood</p>
            {topMood ? (
              <MoodSticker code={topMood} className="opacity-100 scale-[0.85] origin-top" />
            ) : (
              <span className="text-sm text-mist-300">-</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
