import React, { useState } from 'react';
import { Record as RecordType } from '../../types';
import { Card, MoodSticker } from '../UI';
import { Globe2, Pin, EyeOff, MoreHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WaterDropCharacter } from '../WaterDropCharacter';
import { getThemePalette, useResolvedTheme } from '../../theme';
import { recordApi } from '../../api/recordApi';
import { AppModal } from '../AppModal';

interface RecordsListTabProps {
  records: RecordType[];
  onSelectRecord: (record: RecordType) => void;
  onUpdateRecord: (record: RecordType) => void;
  accessToken?: string | null;
  onLoginRequired: () => void;
}

const EmptyRecords: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="mx-4 flex flex-col items-center justify-center text-center py-12 px-6">
      <WaterDropCharacter size={80} mood="waiting" tone="default" animate={true} className="mb-4" />
      <p className="text-sm font-bold mb-1" style={{ color: palette.strongText }}>아직 이번 달 기록이 없어요</p>
      <p className="text-[11px] leading-relaxed opacity-80" style={{ color: palette.mutedText }}>
        남겨주시는 오늘의 흔적들이<br />이곳에 차곡차곡 쌓일 예정입니다.
      </p>
    </div>
  );
};

export const RecordsListTab: React.FC<RecordsListTabProps> = ({
  records,
  onSelectRecord,
  onUpdateRecord,
  accessToken,
  onLoginRequired,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    description: string;
    variant: 'primary' | 'danger';
  } | null>(null);

  const handleHide = (record: RecordType) => {
    onUpdateRecord({ ...record, isHidden: true });
    setActiveMenuId(null);
  };
  const handlePin = (record: RecordType) => {
    onUpdateRecord({ ...record, isPinned: !record.isPinned });
    setActiveMenuId(null);
  };
  const handleVisibilityChange = async (record: RecordType, isShared: boolean) => {
    if (!accessToken) {
      onLoginRequired();
      return;
    }

    const recordId = Number(record.id);
    if (!Number.isInteger(recordId)) {
      setNoticeModal({
        title: '아직 공개할 수 없어요',
        description: '이 기록은 아직 서버에 저장되지 않아 공개 상태를 바꿀 수 없어요.',
        variant: 'danger',
      });
      setActiveMenuId(null);
      return;
    }

    try {
      const response = await recordApi.updateVisibility(accessToken, recordId, isShared ? 'PUBLIC' : 'PRIVATE');
      onUpdateRecord({ ...record, isShared: response.visibility === 'PUBLIC' });
      setNoticeModal({
        title: response.visibility === 'PUBLIC' ? '공유 상태가 바뀌었어요' : '비공개로 전환했어요',
        description:
          response.visibility === 'PUBLIC'
            ? '커뮤니티에 조용히 공유되었습니다.'
            : '이 기록은 다시 나만 볼 수 있게 바뀌었습니다.',
        variant: 'primary',
      });
    } catch (err) {
      setNoticeModal({
        title: '공개 상태를 바꾸지 못했어요',
        description: err instanceof Error ? err.message : '공개 상태 변경에 실패했습니다.',
        variant: 'danger',
      });
    } finally {
      setActiveMenuId(null);
    }
  };

  if (records.length === 0) return <EmptyRecords />;

  return (
    <>
      <div className="px-4 flex flex-col gap-5" onClick={() => setActiveMenuId(null)}>
        {records.map((record) => {
          return (
            <Card
            key={record.id}
            className={`!p-6 !rounded-[2rem] cursor-pointer hover:shadow-lg transition-all duration-300 relative !overflow-visible ${
              activeMenuId === record.id ? 'z-50' : 'z-10'
            }`}
            style={{
              background: record.isPinned ? palette.cardBgStrong : palette.cardBg,
              borderColor: record.isPinned ? 'rgba(139,92,246,0.34)' : palette.border,
              boxShadow: record.isPinned ? `0 18px 34px rgba(139,92,246,${theme === 'dark' ? '0.18' : '0.10'})` : undefined,
            }}
            onClick={() => onSelectRecord(record)}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold tracking-wider" style={{ color: palette.faintText }}>
                  {new Date(record.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </span>
                {record.isShared && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-point-500 border" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.28)' : undefined, borderColor: theme === 'dark' ? 'rgba(167,139,250,0.24)' : 'transparent' }}>
                    <Globe2 size={10} />
                    공유됨
                  </span>
                )}
                {record.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-amber-500 border" style={{ background: theme === 'dark' ? 'rgba(120,53,15,0.30)' : undefined, borderColor: theme === 'dark' ? 'rgba(251,191,36,0.24)' : 'transparent' }}>
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
                  className="transition-colors p-2 -mr-2 -mt-2"
                  style={{ color: palette.faintText }}
                >
                  <MoreHorizontal size={16} />
                </button>
                
                {/* Context Menu */}
                {activeMenuId === record.id && (
                  <div className="absolute right-0 top-full mt-1.5 backdrop-blur-xl rounded-[1.25rem] shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[160px]" style={{ background: palette.cardBgStrong, border: `1px solid ${palette.border}` }}>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePin(record); }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl w-full text-left transition-colors"
                        style={{ color: palette.strongText }}
                      >
                        <Pin size={14} className={record.isPinned ? 'text-amber-500 fill-amber-500' : 'text-mist-400'} />
                        {record.isPinned ? '고정 해제' : '고정하기'}
                      </button>
                      
                      {/* Categorized Share Options */}
                      {!record.isShared && (
                        <div className="my-1 border-t" style={{ borderColor: palette.divider }} />
                      )}
                      {!record.isShared && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVisibilityChange(record, true); }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors group/btn"
                          >
                            <div className="rounded-md p-1 transition-colors" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.24)' : 'rgba(243,232,255,0.8)' }}>
                              <span className="text-sm leading-none block">🏛️</span>
                            </div>
                            <span className="text-[11px] font-bold text-point-500">커뮤니티 공유</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoticeModal({
                                title: '준비 중인 공유예요',
                                description: '카카오톡 공유 기능은 아직 연결 전이에요.',
                                variant: 'primary',
                              });
                              setActiveMenuId(null);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors group/btn"
                          >
                            <div className="rounded-md p-1 transition-colors" style={{ background: palette.cardBgSoft }}>
                              <span className="text-sm leading-none block">💬</span>
                            </div>
                            <span className="text-[11px] font-bold text-mist-600">카카오톡 공유</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoticeModal({
                                title: '준비 중인 공유예요',
                                description: '링크 복사 기능은 아직 연결 전이에요.',
                                variant: 'primary',
                              });
                              setActiveMenuId(null);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors group/btn"
                          >
                            <div className="rounded-md p-1 transition-colors" style={{ background: palette.cardBgSoft }}>
                              <span className="text-sm leading-none block">🔗</span>
                            </div>
                            <span className="text-[11px] font-bold text-mist-600">링크 복사</span>
                          </button>
                        </>
                      )}
                      {record.isShared && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVisibilityChange(record, false); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors group/btn"
                        >
                          <div className="rounded-md p-1 transition-colors" style={{ background: theme === 'dark' ? 'rgba(15,23,42,0.48)' : 'rgba(241,245,249,0.9)' }}>
                            <EyeOff size={14} className="text-mist-400" />
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: palette.mutedText }}>커뮤니티 비공개</span>
                        </button>
                      )}
    
                      <div className="my-1 border-t" style={{ borderColor: palette.divider }} />
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); handleHide(record); }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-500 rounded-xl w-full text-left transition-colors"
                      >
                        <div className="rounded-md p-1 transition-colors" style={{ background: theme === 'dark' ? 'rgba(127,29,29,0.28)' : 'rgba(254,242,242,0.9)' }}>
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
              <div className="flex items-start gap-3 mb-4">
                {record.moodCode && <MoodSticker code={record.moodCode} className="opacity-100 shrink-0 mt-0.5" />}
                {record.action && (
                  <span className="text-[15px] font-bold line-clamp-2 leading-relaxed" style={{ color: palette.strongText }}>{record.action}</span>
                )}
              </div>
              {record.oneWordText && (
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: palette.mutedText }}>{record.oneWordText}</p>
              )}
              {record.imageUrl && (
                <div className="mt-4 inline-flex items-center gap-3 rounded-2xl p-2 pr-3" style={{ background: palette.cardBgSoft }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: palette.border }}>
                    <img src={record.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: palette.faintText }}>Photo Moment</p>
                    <p className="text-xs mt-1" style={{ color: palette.mutedText }}>이 날의 장면이 함께 남아 있어요</p>
                  </div>
                </div>
              )}
            </div>
            </Card>
          );
        })}
      </div>

      <AppModal
        open={noticeModal !== null}
        icon={
          noticeModal?.variant === 'danger'
            ? <AlertCircle size={22} />
            : <CheckCircle2 size={22} />
        }
        title={noticeModal?.title ?? ''}
        description={noticeModal?.description ?? ''}
        confirmLabel="확인"
        hideCancel
        confirmVariant={noticeModal?.variant === 'danger' ? 'danger' : 'primary'}
        onClose={() => setNoticeModal(null)}
        onConfirm={() => setNoticeModal(null)}
      />
    </>
  );
};
