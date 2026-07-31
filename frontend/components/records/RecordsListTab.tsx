import React, { useState } from 'react';
import { Record as RecordType } from '../../types';
import { Card, MoodSticker } from '../UI';
import { Globe2, Pin, EyeOff, MoreHorizontal, AlertCircle, CheckCircle2, ImageDown, Trash2 } from 'lucide-react';
import { WaterDropCharacter } from '../WaterDropCharacter';
import { getThemePalette, useResolvedTheme } from '../../theme';
import { recordApi } from '../../api/recordApi';
import { isMockAccessToken } from '../../api/authApi';
import { AppModal } from '../AppModal';
import { exportRecordCard } from '../../utils/exportRecordCard';
import { RecordPreviewLine } from '../RecordPreviewLine';
import { RecordImage } from '../RecordImage';

interface RecordsListTabProps {
  records: RecordType[];
  onSelectRecord: (record: RecordType) => void;
  onUpdateRecord: (record: RecordType) => void;
  onRequestDeleteRecord: (record: RecordType) => void;
  accessToken?: string | null;
  onLoginRequired: () => void;
  emptyMonthLabel?: string;
  selectionMode?: boolean;
  selectedRecordIds?: string[];
  onToggleSelectRecord?: (recordId: string) => void;
}

const EmptyRecords: React.FC<{ emptyMonthLabel?: string }> = ({ emptyMonthLabel = '이번 달' }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="mx-4 flex flex-col items-center justify-center text-center py-12 px-6">
      <WaterDropCharacter size={80} mood="waiting" tone="default" animate={true} className="mb-4" />
      <p className="text-sm font-bold mb-1" style={{ color: palette.strongText }}>아직 {emptyMonthLabel} 기록이 없어요</p>
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
  onRequestDeleteRecord,
  accessToken,
  onLoginRequired,
  emptyMonthLabel,
  selectionMode = false,
  selectedRecordIds = [],
  onToggleSelectRecord,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const isServerBacked = !!accessToken && !isMockAccessToken(accessToken);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    description: string;
    variant: 'primary' | 'danger';
  } | null>(null);
  const [pendingRecordExport, setPendingRecordExport] = useState<RecordType | null>(null);
  const [isExportingRecordCard, setIsExportingRecordCard] = useState(false);
  const [expandedRecordIds, setExpandedRecordIds] = useState<Record<string, boolean>>({});

  const openNoticeModal = (title: string, description: string, variant: 'primary' | 'danger' = 'primary') => {
    setNoticeModal({ title, description, variant });
  };

  const isUnauthorizedError = (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: number }).status === 401;

  const handlePin = async (record: RecordType) => {
    const nextPinned = !record.isPinned;
    const optimisticRecord = { ...record, isPinned: nextPinned };
    onUpdateRecord(optimisticRecord);
    setActiveMenuId(null);

    if (!isServerBacked) {
      return;
    }

    const token = accessToken;
    if (!token) {
      onUpdateRecord(record);
      onLoginRequired();
      return;
    }

    const recordId = Number(record.id);
    if (!Number.isInteger(recordId)) {
      onUpdateRecord(record);
      openNoticeModal(
        '고정 상태를 바꾸지 못했어요',
        '이 기록은 아직 서버에 저장되지 않아 고정할 수 없어요.',
        'danger'
      );
      return;
    }

    try {
      const response = await recordApi.updatePin(token, recordId, nextPinned);
      if (response.isPinned !== nextPinned) {
        onUpdateRecord({ ...record, isPinned: response.isPinned });
      }
    } catch (err) {
      onUpdateRecord(record);
      if (isUnauthorizedError(err)) {
        onLoginRequired();
        return;
      }
      openNoticeModal(
        '고정 상태를 바꾸지 못했어요',
        err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
        'danger'
      );
    }
  };
  const handleVisibilityChange = async (record: RecordType, isShared: boolean) => {
    if (!accessToken) {
      onLoginRequired();
      return;
    }

    const recordId = Number(record.id);
    if (!Number.isInteger(recordId)) {
      openNoticeModal(
        '아직 공개할 수 없어요',
        '이 기록은 아직 서버에 저장되지 않아 공개 상태를 바꿀 수 없어요.',
        'danger'
      );
      setActiveMenuId(null);
      return;
    }

    try {
      const response = await recordApi.updateVisibility(accessToken, recordId, isShared ? 'PUBLIC' : 'PRIVATE');
      onUpdateRecord({ ...record, isShared: response.visibility === 'PUBLIC' });
      openNoticeModal(
        response.visibility === 'PUBLIC' ? '공유 상태가 바뀌었어요' : '비공개로 전환했어요',
        response.visibility === 'PUBLIC'
          ? '커뮤니티에 조용히 공유되었습니다.'
          : '이 기록은 다시 나만 볼 수 있게 바뀌었습니다.'
      );
    } catch (err) {
      if (isUnauthorizedError(err)) {
        onLoginRequired();
        return;
      }
      openNoticeModal(
        '공개 상태를 바꾸지 못했어요',
        err instanceof Error ? err.message : '공개 상태 변경에 실패했습니다.',
        'danger'
      );
    } finally {
      setActiveMenuId(null);
    }
  };

  const handleExportRecord = async (record: RecordType) => {
    setIsExportingRecordCard(true);
    try {
      await exportRecordCard(record, record.imageUrl ? { mode: 'poster' } : undefined);
      openNoticeModal(
        '카드를 저장했어요',
        '기록 카드 이미지를 브라우저에서 다운로드했어요.'
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      openNoticeModal(
        '카드를 내보내지 못했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
        'danger'
      );
    } finally {
      setIsExportingRecordCard(false);
      setActiveMenuId(null);
    }
  };

  const openRecordExportModal = (record: RecordType) => {
    setPendingRecordExport(record);
    setActiveMenuId(null);
  };

  const confirmRecordExport = async () => {
    if (!pendingRecordExport || isExportingRecordCard) {
      return;
    }

    const targetRecord = pendingRecordExport;
    setPendingRecordExport(null);
    await handleExportRecord(targetRecord);
  };

  const toggleRecordExpansion = (recordId: string) => {
    setExpandedRecordIds((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  if (records.length === 0) return <EmptyRecords emptyMonthLabel={emptyMonthLabel} />;

  return (
    <>
      <div className="px-4 flex flex-col gap-5" onClick={() => setActiveMenuId(null)}>
        {records.map((record) => {
          const isExpanded = !!expandedRecordIds[record.id];
          const isSelected = selectedRecordIds.includes(record.id);
          return (
            <Card
              key={record.id}
              withSurfaceOverlay={false}
              className={`!p-[18px] !rounded-[2rem] cursor-pointer hover:shadow-lg transition-all duration-300 relative !overflow-visible ${
                isExpanded ? 'min-h-[170px] h-auto' : 'h-[170px]'
              } ${
                activeMenuId === record.id ? 'z-50' : 'z-10'
              }`}
              style={{
                background: isSelected ? palette.cardBgStrong : record.isPinned ? palette.cardBgStrong : palette.cardBg,
                borderColor: isSelected ? 'rgba(139,92,246,0.42)' : record.isPinned ? 'rgba(139,92,246,0.34)' : palette.border,
                boxShadow: isSelected
                  ? `0 20px 36px rgba(139,92,246,${theme === 'dark' ? '0.20' : '0.12'})`
                  : record.isPinned
                    ? `0 18px 34px rgba(139,92,246,${theme === 'dark' ? '0.18' : '0.10'})`
                    : undefined,
              }}
              onClick={() => {
                if (selectionMode) {
                  onToggleSelectRecord?.(record.id);
                  return;
                }
                onSelectRecord(record);
              }}
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <span className="shrink-0 text-[11px] font-bold tracking-wider" style={{ color: palette.faintText }}>
                    {new Date(record.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </span>
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 pt-0.5">
                      {record.imageUrl && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-1.5 py-1"
                          style={{
                            background: theme === 'dark' ? 'rgba(15,23,42,0.48)' : 'rgba(248,250,252,0.9)',
                            borderColor: palette.border,
                          }}
                        >
                          <span className="h-4 w-4 overflow-hidden rounded-full">
                            <RecordImage record={record} alt="기록 사진 썸네일" className="h-full w-full" />
                          </span>
                          <span className="text-[9px] font-bold tracking-[0.12em]" style={{ color: palette.faintText }}>
                            사진
                          </span>
                        </span>
                      )}
                      {record.isShared && (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold text-point-500" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.28)' : undefined, borderColor: theme === 'dark' ? 'rgba(167,139,250,0.24)' : 'transparent' }}>
                          <Globe2 size={10} />
                          공유됨
                        </span>
                      )}
                      {record.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold text-amber-500" style={{ background: theme === 'dark' ? 'rgba(120,53,15,0.30)' : undefined, borderColor: theme === 'dark' ? 'rgba(251,191,36,0.24)' : 'transparent' }}>
                          <Pin size={10} />
                          고정됨
                        </span>
                      )}
                    </div>
                    <div className="relative shrink-0">
                      {selectionMode ? (
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full border"
                          style={{
                            background: isSelected ? (theme === 'dark' ? 'rgba(76,29,149,0.30)' : 'rgba(243,232,255,0.9)') : palette.cardBgSoft,
                            borderColor: isSelected ? 'rgba(139,92,246,0.34)' : palette.border,
                          }}
                        >
                          {isSelected ? (
                            <CheckCircle2 size={16} className="text-point-500" />
                          ) : (
                            <div
                              className="h-3.5 w-3.5 rounded-full border"
                              style={{ borderColor: palette.faintText }}
                            />
                          )}
                        </div>
                      ) : (
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
                      )}

                      {/* Context Menu */}
                      {!selectionMode && activeMenuId === record.id && (
                        <div className="absolute right-0 top-full mt-1.5 min-w-[160px] animate-in fade-in slide-in-from-top-2 rounded-[1.25rem] border p-1.5 shadow-xl backdrop-blur-xl duration-200 z-50" style={{ background: palette.cardBgStrong, borderColor: palette.border }}>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); void handlePin(record); }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors"
                            >
                              <div className="rounded-md p-1 transition-colors" style={{ background: record.isPinned ? (theme === 'dark' ? 'rgba(120,53,15,0.30)' : 'rgba(254,243,199,0.88)') : palette.cardBgSoft }}>
                                <Pin size={14} className={record.isPinned ? 'text-amber-500 fill-amber-500' : 'text-mist-400'} />
                              </div>
                              <span className="text-[11px] font-bold" style={{ color: palette.strongText }}>
                                {record.isPinned ? '고정 해제' : '고정하기'}
                              </span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleVisibilityChange(record, !record.isShared);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors group/btn"
                            >
                              <div
                                className="rounded-md p-1 transition-colors"
                                style={{
                                  background: record.isShared
                                    ? (theme === 'dark' ? 'rgba(15,23,42,0.48)' : 'rgba(241,245,249,0.9)')
                                    : (theme === 'dark' ? 'rgba(76,29,149,0.24)' : 'rgba(243,232,255,0.8)'),
                                }}
                              >
                                {record.isShared ? (
                                  <EyeOff size={14} className="text-mist-400" />
                                ) : (
                                  <Globe2 size={14} className="text-point-500" />
                                )}
                              </div>
                              <span
                                className="text-[11px] font-bold"
                                style={{ color: record.isShared ? palette.mutedText : '#8B5CF6' }}
                              >
                                {record.isShared ? '커뮤니티 비공개' : '커뮤니티 공유'}
                              </span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRecordExportModal(record);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors group/btn"
                            >
                              <div className="rounded-md p-1 transition-colors" style={{ background: palette.cardBgSoft }}>
                                <ImageDown size={14} className="text-point-500" />
                              </div>
                              <span className="text-[11px] font-bold" style={{ color: palette.strongText }}>카드 저장</span>
                            </button>

                            <div className="my-1 border-t" style={{ borderColor: palette.divider }} />

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestDeleteRecord(record);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-left transition-colors text-red-500"
                            >
                              <div className="rounded-md p-1 transition-colors" style={{ background: theme === 'dark' ? 'rgba(127,29,29,0.28)' : 'rgba(254,242,242,0.9)' }}>
                                <Trash2 size={14} className="text-red-400" />
                              </div>
                              <span className="text-[11px] font-bold">삭제하기</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col transition-all duration-500">
                  <div className="grid flex-1 grid-cols-[72px_minmax(0,1fr)] gap-x-2.5">
                    <div className="col-start-1 row-start-1 flex items-start">
                      {record.moodCode && <MoodSticker code={record.moodCode} className="opacity-100 shrink-0 mt-0.5" />}
                    </div>
                    <div className="col-start-2 row-start-1 min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.14em] mb-1" style={{ color: palette.faintText }}>
                        오늘의 기록
                      </p>
                      {record.action && (
                        <RecordPreviewLine
                          text={record.action}
                          align="left"
                          expanded={isExpanded}
                          onMoreClick={() => toggleRecordExpansion(record.id)}
                          textClassName="text-[14px] font-bold leading-[1.55] break-keep"
                          expandedTextClassName="text-[14px] font-bold leading-[1.62] break-keep"
                          textStyle={{ color: palette.strongText }}
                          moreClassName="text-[11px] font-medium tracking-tight opacity-70 transition-opacity hover:opacity-100"
                          moreStyle={{ color: palette.faintText }}
                        />
                      )}
                    </div>
                    {record.oneWordText && (
                      <>
                        <p className="col-start-1 row-start-2 pt-5 text-[10px] font-bold tracking-[0.14em]" style={{ color: palette.faintText }}>
                          한 단어
                        </p>
                        <div className="col-start-2 row-start-2 flex min-w-0 items-center gap-2.5 pt-5">
                          <span
                            className="h-px w-3 shrink-0"
                            style={{ background: theme === 'dark' ? 'rgba(148,163,184,0.34)' : 'rgba(100,116,139,0.32)' }}
                          />
                          <p className="min-w-0 truncate text-[13px] font-medium" style={{ color: palette.mutedText }}>
                            "{record.oneWordText}"
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AppModal
        open={pendingRecordExport !== null}
        icon={<ImageDown size={22} />}
        title="카드 저장 안내"
        description={
          pendingRecordExport ? (
            <>
              {pendingRecordExport.imageUrl ? (
                <>
                  이 기록은 <strong>포스터형 카드</strong>로 저장돼요.
                </>
              ) : (
                <>
                  이 기록은 <strong>기록 상세 카드</strong>로 저장돼요.
                </>
              )}
              <br />
              앱 전체가 아니라 카드 이미지 한 장만 저장됩니다.
            </>
          ) : (
            ''
          )
        }
        confirmLabel={isExportingRecordCard ? '저장 중...' : '이 화면으로 저장'}
        confirmDisabled={isExportingRecordCard}
        cancelDisabled={isExportingRecordCard}
        onClose={() => setPendingRecordExport(null)}
        onConfirm={() => void confirmRecordExport()}
      />
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
