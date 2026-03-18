import React, { useState } from 'react';
import { Record as RecordType, Direction } from '../../types';
import { Card, MoodSticker } from '../UI';
import { Globe2, Pin, EyeOff, Share2, MoreHorizontal, Lock } from 'lucide-react';
import { WaterDropCharacter } from '../WaterDropCharacter';

interface RecordsListTabProps {
  records: RecordType[];
  currentDirection: Direction | null;
  onSelectRecord: (record: RecordType) => void;
  onUpdateRecord: (record: RecordType) => void;
}

const EmptyRecords: React.FC = () => (
  <div className="mx-4 flex flex-col items-center justify-center text-center py-10 px-6">
    <WaterDropCharacter size={84} mood="waiting" tone="default" animate={true} className="mb-3" />
    <p className="text-sm font-bold text-mist-600 mb-2">아직 이번 달 기록이 없어요</p>
    <p className="text-[12px] text-mist-400 leading-relaxed">
      오늘의 장면을 남겨볼까요?
    </p>
  </div>
);

export const RecordsListTab: React.FC<RecordsListTabProps> = ({
  records,
  currentDirection,
  onSelectRecord,
  onUpdateRecord,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleHide = (record: RecordType) => {
    onUpdateRecord({ ...record, isHidden: true });
    setActiveMenuId(null);
  };
  const handlePin = (record: RecordType) => {
    onUpdateRecord({ ...record, isPinned: !record.isPinned });
    setActiveMenuId(null);
  };
  const handleShare = (record: RecordType) => {
    if (!record.isShared) {
      onUpdateRecord({ ...record, isShared: true });
      alert('커뮤니티에 조용히 공유되었습니다.');
    }
    setActiveMenuId(null);
  };

  if (records.length === 0) return <EmptyRecords />;

  return (
    <div className="px-4 flex flex-col gap-5" onClick={() => setActiveMenuId(null)}>
      {records.map((record) => {
        const isLocked =
          currentDirection?.isActive &&
          record.timestamp >= currentDirection.createdAt &&
          new Date(record.timestamp).toDateString() !== new Date().toDateString();

        return (
          <Card
            key={record.id}
            className={`!p-6 !rounded-[2rem] cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden ${
              record.isPinned
                ? 'bg-white shadow-md border border-point-200'
                : 'bg-white/80 border border-white/60'
            }`}
            onClick={() => !isLocked && onSelectRecord(record)}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-mist-400 tracking-wider">
                  {new Date(record.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </span>
                {record.isShared && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-point-50 px-2 py-1 text-[10px] font-semibold text-point-500">
                    <Globe2 size={10} />
                    공유됨
                  </span>
                )}
                {record.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-500">
                    <Pin size={10} />
                    고정됨
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === record.id ? null : record.id);
                }}
                className="text-mist-300 hover:text-mist-500 transition-colors p-2 -mr-2 -mt-2"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* Context Menu */}
            {activeMenuId === record.id && (
              <div className="absolute right-6 top-12 bg-white shadow-xl rounded-2xl p-1.5 z-20 border border-mist-100 animate-fade-in min-w-[140px]">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePin(record); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-mist-600 hover:bg-mist-50 rounded-xl w-full text-left transition-colors"
                >
                  <Pin size={14} className="text-mist-400" />
                  {record.isPinned ? '고정 해제' : '고정하기'}
                </button>
                {!record.isShared && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(record); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-point-500 hover:bg-point-50 rounded-xl w-full text-left transition-colors mt-1"
                  >
                    <Share2 size={14} />
                    커뮤니티 공유
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleHide(record); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-xl w-full text-left transition-colors mt-1"
                >
                  <EyeOff size={14} />
                  숨기기
                </button>
              </div>
            )}

            {/* Content */}
            <div className={`transition-all duration-500 ${isLocked ? 'blur-[6px] select-none opacity-40 grayscale-[0.5]' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                {record.moodCode && <MoodSticker code={record.moodCode} className="opacity-100" />}
                {record.action && (
                  <span className="text-[15px] font-bold text-mist-600 line-clamp-2">{record.action}</span>
                )}
              </div>
              {record.oneWordText && (
                <p className="text-mist-600 text-sm leading-relaxed line-clamp-3">{record.oneWordText}</p>
              )}
              {record.imageUrl && (
                <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-mist-50/80 p-2 pr-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-mist-100 shadow-sm">
                    <img src={record.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-mist-400 uppercase tracking-widest">Photo Moment</p>
                    <p className="text-xs text-mist-500 mt-1">이 날의 장면이 함께 남아 있어요</p>
                  </div>
                </div>
              )}
            </div>

            {/* Locked Overlay */}
            {isLocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/20">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-full mb-3 border border-mist-100 shadow-sm">
                  <Lock size={16} className="text-mist-400" />
                </div>
                <span className="text-[10px] text-mist-500 font-bold tracking-widest uppercase bg-white/80 px-3 py-1 rounded-full shadow-sm">
                  Time Capsule
                </span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
