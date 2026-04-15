import React, { useState } from 'react';
import { Record as RecordType } from '../../types';
import { Card, MoodSticker } from '../UI';
import { Globe2, Pin, EyeOff, Share2, MoreHorizontal } from 'lucide-react';
import { WaterDropCharacter } from '../WaterDropCharacter';

interface RecordsListTabProps {
  records: RecordType[];
  onSelectRecord: (record: RecordType) => void;
  onUpdateRecord: (record: RecordType) => void;
}

const EmptyRecords: React.FC = () => (
  <div className="mx-4 flex flex-col items-center justify-center text-center py-12 px-6">
    <WaterDropCharacter size={80} mood="waiting" tone="default" animate={true} className="mb-4" />
    <p className="text-sm font-bold text-mist-600 mb-1">아직 이번 달 기록이 없어요</p>
    <p className="text-[11px] text-mist-400 leading-relaxed opacity-80">
      남겨주시는 오늘의 흔적들이<br />이곳에 차곡차곡 쌓일 예정입니다.
    </p>
  </div>
);

export const RecordsListTab: React.FC<RecordsListTabProps> = ({
  records,
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
        return (
          <Card
            key={record.id}
            className={`!p-6 !rounded-[2rem] cursor-pointer hover:shadow-lg transition-all duration-300 relative !overflow-visible ${
              activeMenuId === record.id ? 'z-50' : 'z-10'
            } ${
              record.isPinned
                ? 'bg-white shadow-md border border-point-200'
                : 'bg-white/80 border border-white/60'
            }`}
            onClick={() => onSelectRecord(record)}
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
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === record.id ? null : record.id);
                  }}
                  className="text-mist-300 hover:text-mist-500 transition-colors p-2 -mr-2 -mt-2"
                >
                  <MoreHorizontal size={16} />
                </button>
                
                {/* Context Menu */}
                {activeMenuId === record.id && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white/95 backdrop-blur-xl border border-mist-100 rounded-[1.25rem] shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[160px]">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePin(record); }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-mist-600 hover:bg-mist-50 rounded-xl w-full text-left transition-colors"
                      >
                        <Pin size={14} className={record.isPinned ? 'text-amber-500 fill-amber-500' : 'text-mist-400'} />
                        {record.isPinned ? '고정 해제' : '고정하기'}
                      </button>
                      
                      {/* Categorized Share Options */}
                      {!record.isShared && (
                        <div className="my-1 border-t border-mist-50/80" />
                      )}
                      {!record.isShared && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShare(record); }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-point-50 rounded-xl w-full text-left transition-colors group/btn"
                          >
                            <div className="bg-point-100/50 rounded-md p-1 group-hover/btn:bg-point-200/50 transition-colors">
                              <span className="text-sm leading-none block">🏛️</span>
                            </div>
                            <span className="text-[11px] font-bold text-point-500">커뮤니티 공유</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); alert('카카오톡으로 공유합니다.'); setActiveMenuId(null); }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-mist-50 rounded-xl w-full text-left transition-colors group/btn"
                          >
                            <div className="bg-mist-100/50 rounded-md p-1 group-hover/btn:bg-mist-200/50 transition-colors">
                              <span className="text-sm leading-none block">💬</span>
                            </div>
                            <span className="text-[11px] font-bold text-mist-600">카카오톡 공유</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); alert('링크가 복사되었습니다.'); setActiveMenuId(null); }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-mist-50 rounded-xl w-full text-left transition-colors group/btn"
                          >
                            <div className="bg-mist-100/50 rounded-md p-1 group-hover/btn:bg-mist-200/50 transition-colors">
                              <span className="text-sm leading-none block">🔗</span>
                            </div>
                            <span className="text-[11px] font-bold text-mist-600">링크 복사</span>
                          </button>
                        </>
                      )}
    
                      <div className="my-1 border-t border-mist-50/80" />
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); handleHide(record); }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl w-full text-left transition-colors"
                      >
                        <div className="bg-red-50 rounded-md p-1 group-hover/btn:bg-red-100 transition-colors">
                          <EyeOff size={14} className="text-red-400" />
                        </div>
                        숨기기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="transition-all duration-500">
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
          </Card>
        );
      })}
    </div>
  );
};
