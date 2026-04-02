import React from 'react';
import { Record as RecordType } from '../../types';
import { MoodSticker } from '../UI';
import { Image as ImageIcon } from 'lucide-react';
import { WaterDropCharacter, CharacterTone } from '../WaterDropCharacter';

interface AlbumTabProps {
  photoRecords: RecordType[];
  onSelectRecord: (record: RecordType) => void;
  mascotTone?: CharacterTone;
}

const EmptyAlbum: React.FC<{ mascotTone?: CharacterTone }> = ({ mascotTone = 'default' }) => (
  <div className="mx-4 flex flex-col items-center justify-center text-center py-12 px-6">
    <WaterDropCharacter size={80} mood="neutral" tone={mascotTone} animate={true} className="mb-4" />
    <p className="text-sm font-bold text-mist-600 mb-1">아직 이번 달 장면이 없어요</p>
    <p className="text-[11px] text-mist-400 leading-relaxed opacity-80">
      오늘의 한 걸음을 사진으로 남겨보세요.<br />이곳에 소중한 장면들이 모입니다.
    </p>
  </div>
);

export const AlbumTab: React.FC<AlbumTabProps> = ({ photoRecords, onSelectRecord, mascotTone = 'default' }) => {
  if (photoRecords.length === 0) return <EmptyAlbum mascotTone={mascotTone} />;

  return (
    <div className="px-2">
      <div className="px-3 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-mist-400" />
          <h3 className="text-xs font-bold text-mist-500 uppercase tracking-widest">Monthly Photo Timeline</h3>
        </div>
        <span className="text-[11px] text-mist-300">{photoRecords.length}개의 장면</span>
      </div>
      <div className="grid grid-cols-2 gap-4 px-3 pb-6">
        {photoRecords.map(record => (
          <div
            key={`photo-${record.id}`}
            role="button"
            tabIndex={0}
            className="relative group aspect-[4/5] bg-white p-2 pb-10 rounded-2xl shadow-sm border border-mist-100/50 text-left transform transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer"
            onClick={() => onSelectRecord(record)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectRecord(record)}
          >
            <div className="w-full h-full rounded-xl overflow-hidden bg-mist-50">
              <img
                src={record.imageUrl}
                alt="Scene"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="absolute font-bold bottom-2 left-3 right-3 pointer-events-none">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-mist-500 tracking-wider bg-white/80 px-2 py-1 rounded-full shadow-sm">
                  {new Date(record.timestamp).getDate()}일
                </span>
                {record.moodCode && (
                  <MoodSticker code={record.moodCode} className="scale-75 origin-right shadow-none" />
                )}
              </div>
              {record.oneWordText && (
                <p className="mt-1 text-[11px] text-mist-500 truncate px-1">{record.oneWordText}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
