import React from 'react';
import { Record } from '../types';
import { Card, MoodSticker } from './UI';
import { Image as ImageIcon, ArrowRight } from 'lucide-react';
import { getThemePalette, useResolvedTheme } from '../theme';
import { RecordImage } from './RecordImage';

interface MemoryPreviewStripProps {
  records: Record[];
  onMoreClick: () => void;
}

export const MemoryPreviewStrip: React.FC<MemoryPreviewStripProps> = ({ 
  records, 
  onMoreClick 
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  // Sort and filter active records
  const activeRecords = [...records].filter(r => !r.isHidden).sort((a, b) => b.timestamp - a.timestamp);
  
  // Find up to 4 records with photos
  const photoRecords = activeRecords.filter(r => r.imageUrl).slice(0, 4);
  
  // Find the most recent text-only record (if no photos or as fallback info)
  const recentTextRecord = activeRecords.find(r => !r.imageUrl && r.action);

  if (activeRecords.length === 0) {
    return null; // Don't show if empty
  }

  return (
    <Card className="shadow-sm !p-5" style={{ background: palette.cardBgMuted, borderColor: palette.border }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-mist-400" />
          <span className="text-sm font-medium" style={{ color: palette.strongText }}>장면 미리보기</span>
        </div>
        <button 
          onClick={onMoreClick} 
          className="text-[11px] font-semibold text-point-500 inline-flex items-center gap-1 hover:text-point-600 transition-colors"
        >
          기록 더 보기
          <ArrowRight size={12} />
        </button>
      </div>

      {photoRecords.length > 0 ? (
        // Strategy A: We have photos, show a grid
        <div className="grid grid-cols-4 gap-3">
          {photoRecords.map((record) => (
            <div key={`memory-photo-${record.id}`} className="aspect-square rounded-2xl overflow-hidden border shadow-sm relative group cursor-pointer" style={{ borderColor: palette.border, background: palette.cardBgSoft }} onClick={onMoreClick}>
              <RecordImage record={record} alt="Memory preview" className="w-full h-full transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
          {/* Fill empty slots nicely if less than 4 photos */}
          {Array.from({ length: Math.max(0, 4 - photoRecords.length) }).map((_, i) => (
            <div key={`empty-slot-${i}`} className="aspect-square rounded-2xl border border-dashed flex items-center justify-center" style={{ borderColor: palette.divider, background: palette.cardBgSoft }}>
              <span className="w-1 h-1 rounded-full" style={{ background: palette.faintText }}></span>
            </div>
          ))}
        </div>
      ) : (
        // Strategy B: No photos, fallback to the most recent scene description
        recentTextRecord ? (
          <div className="rounded-2xl p-4 border shadow-inner cursor-pointer transition-colors" style={{ background: palette.cardBgSoft, borderColor: palette.border }} onClick={onMoreClick}>
            <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: palette.strongText }}>
              "{recentTextRecord.action}"
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium tracking-wide" style={{ color: palette.mutedText }}>
                {new Date(recentTextRecord.timestamp).toLocaleDateString('ko-KR')}
              </span>
              {recentTextRecord.moodCode && (
                <MoodSticker code={recentTextRecord.moodCode} className="scale-75 origin-right opacity-80" />
              )}
            </div>
          </div>
        ) : (
             <div className="rounded-2xl border border-dashed p-6 flex flex-col items-center justify-center text-center" style={{ borderColor: palette.divider, background: palette.cardBgSoft }}>
                <ImageIcon size={20} className="mb-2" style={{ color: palette.faintText }} />
                <p className="text-xs" style={{ color: palette.mutedText }}>아직 저장된 사진이 없어요</p>
            </div>
        )
      )}
    </Card>
  );
};
