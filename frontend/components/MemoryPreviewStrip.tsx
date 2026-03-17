import React from 'react';
import { Record } from '../types';
import { Card, MoodSticker } from './UI';
import { Image as ImageIcon, ArrowRight } from 'lucide-react';

interface MemoryPreviewStripProps {
  records: Record[];
  onMoreClick: () => void;
}

export const MemoryPreviewStrip: React.FC<MemoryPreviewStripProps> = ({ 
  records, 
  onMoreClick 
}) => {
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
    <Card className="!bg-white/70 border border-white/50 shadow-sm !p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-mist-400" />
          <span className="text-sm font-medium text-mist-600">장면 미리보기</span>
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
            <div key={`memory-photo-${record.id}`} className="aspect-square rounded-2xl overflow-hidden border border-white shadow-sm bg-mist-50 relative group cursor-pointer" onClick={onMoreClick}>
              <img src={record.imageUrl} alt="Memory preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
          {/* Fill empty slots nicely if less than 4 photos */}
          {Array.from({ length: Math.max(0, 4 - photoRecords.length) }).map((_, i) => (
            <div key={`empty-slot-${i}`} className="aspect-square rounded-2xl border border-dashed border-mist-200 bg-mist-50/30 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-mist-200"></span>
            </div>
          ))}
        </div>
      ) : (
        // Strategy B: No photos, fallback to the most recent scene description
        recentTextRecord ? (
          <div className="rounded-2xl bg-white/60 p-4 border border-white shadow-inner cursor-pointer hover:bg-white/80 transition-colors" onClick={onMoreClick}>
            <p className="text-sm text-mist-600 leading-relaxed line-clamp-2 mb-3">
              "{recentTextRecord.action}"
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-mist-400 font-medium tracking-wide">
                {new Date(recentTextRecord.timestamp).toLocaleDateString('ko-KR')}
              </span>
              {recentTextRecord.moodCode && (
                <MoodSticker code={recentTextRecord.moodCode} className="scale-75 origin-right opacity-80" />
              )}
            </div>
          </div>
        ) : (
             <div className="rounded-2xl border border-dashed border-mist-200 bg-mist-50/30 p-6 flex flex-col items-center justify-center text-center">
                <ImageIcon size={20} className="text-mist-200 mb-2" />
                <p className="text-xs text-mist-400">아직 저장된 사진이 없어요</p>
            </div>
        )
      )}
    </Card>
  );
};
