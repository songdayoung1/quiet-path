import React from 'react';
import { Record as RecordType } from '../../types';
import { Image as ImageIcon } from 'lucide-react';
import { WaterDropCharacter, CharacterTone } from '../WaterDropCharacter';
import { getThemePalette, useResolvedTheme } from '../../theme';
import { RecordImage } from '../RecordImage';

interface AlbumTabProps {
  photoRecords: RecordType[];
  onSelectRecord: (record: RecordType) => void;
  mascotTone?: CharacterTone;
  emptyMonthLabel?: string;
}

const EmptyAlbum: React.FC<{ mascotTone?: CharacterTone; emptyMonthLabel?: string }> = ({
  mascotTone = 'default',
  emptyMonthLabel,
}) => (
  <EmptyAlbumInner mascotTone={mascotTone} emptyMonthLabel={emptyMonthLabel} />
);

const EmptyAlbumInner: React.FC<{ mascotTone?: CharacterTone; emptyMonthLabel?: string }> = ({
  mascotTone = 'default',
  emptyMonthLabel = '이번 달',
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="mx-4 flex flex-col items-center justify-center text-center py-12 px-6">
      <WaterDropCharacter size={80} mood="neutral" tone={mascotTone} animate={true} className="mb-4" />
      <p className="text-sm font-bold mb-1" style={{ color: palette.strongText }}>아직 {emptyMonthLabel} 장면이 없어요</p>
      <p className="text-[11px] leading-relaxed opacity-80" style={{ color: palette.mutedText }}>
        오늘의 한 걸음을 사진으로 남겨보세요.<br />이곳에 소중한 장면들이 모입니다.
      </p>
    </div>
  );
};

export const AlbumTab: React.FC<AlbumTabProps> = ({
  photoRecords,
  onSelectRecord,
  mascotTone = 'default',
  emptyMonthLabel,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  if (photoRecords.length === 0) return <EmptyAlbum mascotTone={mascotTone} emptyMonthLabel={emptyMonthLabel} />;

  return (
    <div className="px-2">
      <div className="px-3 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} style={{ color: palette.faintText }} />
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: palette.mutedText }}>Monthly Photo Timeline</h3>
        </div>
        <span className="text-[11px]" style={{ color: palette.faintText }}>{photoRecords.length}개의 장면</span>
      </div>
      <div className="grid grid-cols-2 gap-4 px-3 pb-6">
        {photoRecords.map(record => (
          <div
            key={`photo-${record.id}`}
            role="button"
            tabIndex={0}
            className="relative group aspect-[4/5] p-2 pb-10 rounded-2xl shadow-sm border text-left transform transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer"
            style={{ background: palette.cardBgStrong, borderColor: palette.border }}
            onClick={() => onSelectRecord(record)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectRecord(record)}
          >
            <div className="w-full h-full rounded-xl overflow-hidden" style={{ background: palette.cardBgSoft }}>
              <RecordImage
                record={record}
                alt="Scene"
                className="w-full h-full transition-transform duration-500"
              />
            </div>
            <span
              className="pointer-events-none absolute bottom-3 right-3 text-[11px] font-semibold tracking-[0.02em]"
              style={{ color: palette.mutedText }}
            >
              {new Intl.DateTimeFormat('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              }).format(new Date(record.timestamp))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
