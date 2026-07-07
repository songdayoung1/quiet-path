import React, { useEffect, useMemo, useState } from 'react';
import { Record as RecordType, type RecordCardDisplayMode } from '../types';
import { AlertTriangle, BookOpenText, Calendar, ChevronLeft, ChevronRight, Download, Grid3X3, Image as ImageIcon } from 'lucide-react';
import { RecordDetailDiary } from '../components/RecordDetailDiary';
import { AlbumTab } from '../components/records/AlbumTab';
import { RecordsListTab } from '../components/records/RecordsListTab';
import { CalendarTab } from '../components/records/CalendarTab';
import { getThemePalette, useResolvedTheme } from '../theme';
import { buildApiErrorMessage } from '../api/apiClient';
import { recordApi, RecordMonthlyResponse, RecordResponse } from '../api/recordApi';
import type { ApiErrorWithStatus } from '../api/apiClient';
import { isMockAccessToken } from '../api/authApi';
import { AppModal } from '../components/AppModal';
import { exportRecordCard, exportMonthlyActivityBoard, exportMonthlyCollage } from '../utils/exportRecordCard';

interface RecordsViewProps {
  records: RecordType[];
  onUpdateRecord: (record: RecordType) => void;
  onDeleteRecord: (recordId: string) => void;
  accessToken?: string | null;
  onLoginRequired: () => void;
}

const RECORD_DELETE_DESCRIPTION = (
  <>
    삭제한 기록은 다시 복구할 수 없어요.
    <br />
    공유된 기록은 커뮤니티에서도 함께 사라집니다.
  </>
);

const buildRecordFromMonthlyItem = (record: RecordResponse): RecordType => {
  const createdAt = record.createdAt || `${record.recordDate}T00:00:00`;
  return {
    id: String(record.id),
    pathId: String(record.pathId),
    date: createdAt,
    timestamp: new Date(createdAt).getTime(),
    directionQuestion:
      record.directionText ||
      record.directionName ||
      '오늘의 기록',
    action: record.content,
    oneWordText: record.oneWordText ?? undefined,
    tomorrowText: record.tomorrowText ?? undefined,
    moodCode: record.moodCode ?? undefined,
    imageUrl: record.imageUrl ?? undefined,
    isShared: record.visibility === 'PUBLIC',
    isPinned: record.isPinned ?? undefined,
  };
};

const compareMonthlyItems = (
  a: RecordResponse,
  b: RecordResponse,
  prioritizedRecordId?: string,
): number => {
  const aPriority = prioritizedRecordId && String(a.id) === prioritizedRecordId && a.isPinned ? 1 : 0;
  const bPriority = prioritizedRecordId && String(b.id) === prioritizedRecordId && b.isPinned ? 1 : 0;
  if (aPriority !== bPriority) {
    return bPriority - aPriority;
  }

  const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
  if (pinDiff !== 0) {
    return pinDiff;
  }

  const dateDiff = new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime();
  if (dateDiff !== 0) {
    return dateDiff;
  }

  return b.id - a.id;
};

const sortMonthlyItems = (
  items: RecordResponse[],
  prioritizedRecordId?: string,
): RecordResponse[] => [...items].sort((a, b) => compareMonthlyItems(a, b, prioritizedRecordId));

const rebuildMonthlyReport = (
  report: RecordMonthlyResponse,
  items: RecordResponse[],
  prioritizedRecordId?: string,
): RecordMonthlyResponse => {
  const sortedItems = sortMonthlyItems(items, prioritizedRecordId);
  const recordsCount = sortedItems.length;
  const photoCount = sortedItems.filter((item) => item.imageUrl).length;
  return {
    ...report,
    recordsCount,
    photoCount,
    photoCoverage: recordsCount > 0 ? Math.round((photoCount / recordsCount) * 100) : 0,
    items: sortedItems,
  };
};

const updateMonthlyItem = (
  item: RecordResponse,
  updatedRecord: RecordType
): RecordResponse => ({
  ...item,
  content: updatedRecord.action,
  oneWordText: updatedRecord.oneWordText ?? null,
  tomorrowText: updatedRecord.tomorrowText ?? null,
  moodCode: updatedRecord.moodCode ?? null,
  imageUrl: updatedRecord.imageUrl ?? null,
  visibility: updatedRecord.isShared ? 'PUBLIC' : 'PRIVATE',
  isPinned: updatedRecord.isPinned ?? false,
});

export const RecordsView: React.FC<RecordsViewProps> = ({
  records,
  onUpdateRecord,
  onDeleteRecord,
  accessToken,
  onLoginRequired,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<RecordType | null>(null);
  const [detailDisplayMode, setDetailDisplayMode] = useState<RecordCardDisplayMode>('diary');
  const [activeTab, setActiveTab] = useState<'album' | 'records' | 'calendar'>('album');
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [monthlyReport, setMonthlyReport] = useState<RecordMonthlyResponse | null>(null);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<RecordType | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<{ title: string; description: string } | null>(null);
  const [shareNotice, setShareNotice] = useState<{ title: string; description: string } | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [isExportingActivityBoard, setIsExportingActivityBoard] = useState(false);
  const [isExportingCollage, setIsExportingCollage] = useState(false);

  const targetMonth = selectedMonthDate.getMonth();
  const targetYear = selectedMonthDate.getFullYear();
  const monthLabel = `${targetMonth + 1}월`;
  const requestKey = `${targetYear}-${targetMonth + 1}`;
  const isServerBacked = !!accessToken && !isMockAccessToken(accessToken);

  const guestMonthlyItems = useMemo(() => {
    return records
      .filter((record) => !record.isHidden)
      .filter((record) => {
        const date = new Date(record.timestamp);
        return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
      })
      .map((record) => ({
        id: Number(record.id),
        pathId: Number(record.pathId ?? 0),
        directionName: null,
        directionText: record.directionQuestion,
        categoryCode: null,
        recordDate: record.date.slice(0, 10),
        content: record.action,
        oneWordText: record.oneWordText ?? null,
        tomorrowText: record.tomorrowText ?? null,
        moodCode: record.moodCode ?? null,
        imageUrl: record.imageUrl ?? null,
        visibility: record.isShared ? 'PUBLIC' : 'PRIVATE',
        isPinned: record.isPinned ?? false,
        sharedAt: null,
        createdAt: record.date,
        updatedAt: undefined,
      }))
      .sort((a, b) => compareMonthlyItems(a, b));
  }, [records, targetMonth, targetYear]);

  const guestFirstRecordMonth = useMemo(() => {
    const visibleRecords = records
      .filter((record) => !record.isHidden)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (visibleRecords.length === 0) {
      return null;
    }
    const first = new Date(visibleRecords[0].timestamp);
    return new Date(first.getFullYear(), first.getMonth(), 1);
  }, [records]);

  useEffect(() => {
    setSelectedRecordForDetail(null);
  }, [targetYear, targetMonth]);

  useEffect(() => {
    if (selectedRecordForDetail) {
      setDetailDisplayMode('diary');
    }
  }, [selectedRecordForDetail?.id]);

  useEffect(() => {
    setPendingDeleteRecord(null);
  }, [targetYear, targetMonth]);

  useEffect(() => {
    if (isServerBacked) {
      return;
    }

    const recordsCount = guestMonthlyItems.length;
    const photoCount = guestMonthlyItems.filter((item) => item.imageUrl).length;
    setMonthlyReport({
      year: targetYear,
      month: targetMonth + 1,
      firstRecordYear: guestFirstRecordMonth?.getFullYear() ?? null,
      firstRecordMonth: guestFirstRecordMonth ? guestFirstRecordMonth.getMonth() + 1 : null,
      recordsCount,
      photoCount,
      photoCoverage: recordsCount > 0 ? Math.round((photoCount / recordsCount) * 100) : 0,
      items: guestMonthlyItems,
    });
    setMonthlyError(null);
    setIsMonthlyLoading(false);
  }, [guestFirstRecordMonth, guestMonthlyItems, isServerBacked, targetMonth, targetYear]);

  useEffect(() => {
    if (!isServerBacked) {
      return;
    }

    let active = true;
    const loadMonthly = async () => {
      setIsMonthlyLoading(true);
      setMonthlyError(null);
      try {
        const report = await recordApi.getMonthly(accessToken!, targetYear, targetMonth + 1);
        if (!active) return;
        setMonthlyReport(report);
      } catch (error) {
        if (!active) return;
        if ((error as ApiErrorWithStatus)?.status === 401) {
          setMonthlyReport(null);
          setMonthlyError('세션을 복구하지 못해 월간 기록을 다시 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
          return;
        }
        setMonthlyReport(null);
        setMonthlyError(buildApiErrorMessage(error, '월간 기록을 불러오지 못했어요.'));
      } finally {
        if (active) {
          setIsMonthlyLoading(false);
        }
      }
    };

    void loadMonthly();

    return () => {
      active = false;
    };
  }, [accessToken, isServerBacked, requestKey, targetMonth, targetYear]);

  const monthlyRecords = useMemo(
    () => (monthlyReport?.items ?? []).map(buildRecordFromMonthlyItem),
    [monthlyReport],
  );

  const photoRecords = useMemo(
    () =>
      monthlyRecords
        .filter((record) => record.imageUrl)
        .sort((a, b) => a.timestamp - b.timestamp),
    [monthlyRecords],
  );
  const displayedPhotoRecords = photoRecords.length > 12 ? photoRecords.slice(-12) : photoRecords;

  const todayMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const firstRecordMonth = useMemo(() => {
    if (isServerBacked) {
      if (!monthlyReport?.firstRecordYear || !monthlyReport?.firstRecordMonth) {
        return null;
      }
      return new Date(monthlyReport.firstRecordYear, monthlyReport.firstRecordMonth - 1, 1);
    }
    return guestFirstRecordMonth;
  }, [guestFirstRecordMonth, isServerBacked, monthlyReport?.firstRecordMonth, monthlyReport?.firstRecordYear]);
  const canGoPrevMonth = firstRecordMonth !== null && selectedMonthDate.getTime() > firstRecordMonth.getTime();
  const canGoNextMonth = selectedMonthDate.getTime() < todayMonth.getTime();

  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(targetYear, targetMonth, 1).getDay();

  const monthlyRecordMap = useMemo(() => {
    const map = new Map<number, RecordType>();
    monthlyRecords.forEach((record) => map.set(new Date(record.timestamp).getDate(), record));
    return map;
  }, [monthlyRecords]);

  const calendarCells = useMemo(() => {
    const cells: Array<{ type: 'empty' } | { type: 'day'; day: number; record?: RecordType }> = [];
    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push({ type: 'empty' });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ type: 'day', day, record: monthlyRecordMap.get(day) });
    }
    return cells;
  }, [daysInMonth, firstDayOfMonth, monthlyRecordMap]);

  const handleMonthlyRecordUpdate = (updatedRecord: RecordType) => {
    setMonthlyReport((prev) => {
      if (!prev) {
        return prev;
      }

      const nextItems = updatedRecord.isHidden
        ? prev.items.filter((item) => String(item.id) !== updatedRecord.id)
        : prev.items.map((item) =>
            String(item.id) === updatedRecord.id ? updateMonthlyItem(item, updatedRecord) : item
          );

      return rebuildMonthlyReport(
        prev,
        nextItems,
        updatedRecord.isPinned ? updatedRecord.id : undefined,
      );
    });

    onUpdateRecord(updatedRecord);
  };

  const requestDeleteRecord = (record: RecordType) => {
    setPendingDeleteRecord(record);
  };

  const confirmDeleteRecord = async () => {
    if (!pendingDeleteRecord || isDeletingRecord) {
      return;
    }

    const targetRecord = pendingDeleteRecord;
    setIsDeletingRecord(true);

    try {
      if (isServerBacked) {
        const recordId = Number(targetRecord.id);
        if (!Number.isInteger(recordId)) {
          throw new Error('삭제할 기록 정보를 다시 확인해 주세요.');
        }
        await recordApi.delete(accessToken!, recordId);
      }

      setMonthlyReport((prev) => {
        if (!prev) {
          return prev;
        }
        const nextItems = prev.items.filter((item) => String(item.id) !== targetRecord.id);
        return rebuildMonthlyReport(prev, nextItems);
      });
      onDeleteRecord(targetRecord.id);

      if (selectedRecordForDetail?.id === targetRecord.id) {
        setSelectedRecordForDetail(null);
      }

      setPendingDeleteRecord(null);
    } catch (error) {
      if ((error as ApiErrorWithStatus)?.status === 401) {
        setDeleteNotice({
          title: '로그인이 다시 필요해요',
          description: '세션이 만료되어 기록을 삭제하지 못했어요. 다시 로그인한 뒤 한 번 더 삭제해 주세요.',
        });
        return;
      }
      setDeleteNotice({
        title: '기록을 삭제하지 못했어요',
        description: buildApiErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
      });
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const handleExportRecord = async (record: RecordType, mode?: RecordCardDisplayMode) => {
    try {
      const result = await exportRecordCard(record, mode ? { mode } : undefined);
      setShareNotice({
        title: result.mode === 'share' ? '카드를 공유했어요' : '카드를 저장했어요',
        description:
          result.mode === 'share'
            ? '기기 공유 시트를 통해 기록 카드를 전달했어요.'
            : '기록 카드 이미지를 기기에 저장했어요.',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setShareNotice({
        title: '카드를 내보내지 못했어요',
        description: buildApiErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
      });
    }
  };

  const handleActivityBoardExport = async () => {
    if (isExportingActivityBoard || monthlyRecords.length === 0) return;
    setIsExportingActivityBoard(true);
    try {
      const result = await exportMonthlyActivityBoard(monthlyRecords, targetYear, targetMonth + 1);
      setShareNotice({
        title: result.mode === 'share' ? '활동판을 공유했어요' : '활동판을 저장했어요',
        description: `${targetMonth + 1}월 활동판을 ${result.mode === 'share' ? '공유' : '저장'}했어요.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareNotice({
        title: '활동판을 내보내지 못했어요',
        description: buildApiErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
      });
    } finally {
      setIsExportingActivityBoard(false);
    }
  };

  const handleCollageExport = async () => {
    if (isExportingCollage || monthlyRecords.length === 0) return;
    setIsExportingCollage(true);
    try {
      const result = await exportMonthlyCollage(monthlyRecords, targetYear, targetMonth + 1);
      setShareNotice({
        title: result.mode === 'share' ? '콜라주를 공유했어요' : '콜라주를 저장했어요',
        description:
          result.pages > 1
            ? `${result.pages}장으로 나눠 ${result.mode === 'share' ? '공유' : '저장'}했어요.`
            : `${targetMonth + 1}월 기록 콜라주를 ${result.mode === 'share' ? '공유' : '저장'}했어요.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareNotice({
        title: '콜라주를 내보내지 못했어요',
        description: buildApiErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
      });
    } finally {
      setIsExportingCollage(false);
    }
  };

  if (selectedRecordForDetail) {
    const record = selectedRecordForDetail;
    const pageNumber = monthlyRecords.findIndex((item) => item.id === record.id) + 1;
    return (
      <div className="relative min-h-screen">
        <RecordDetailDiary
          record={record}
          pageNumber={pageNumber > 0 ? pageNumber : 1}
          displayMode={detailDisplayMode}
          onDisplayModeChange={setDetailDisplayMode}
          onClose={() => setSelectedRecordForDetail(null)}
          onShare={() => void handleExportRecord(record, record.imageUrl ? detailDisplayMode : undefined)}
          onDelete={() => requestDeleteRecord(record)}
        />
        <AppModal
          open={pendingDeleteRecord !== null}
          icon={<AlertTriangle size={24} />}
          title="이 기록을 삭제할까요?"
          description={RECORD_DELETE_DESCRIPTION}
          confirmLabel={isDeletingRecord ? '삭제하는 중...' : '삭제하기'}
          confirmVariant="danger"
          confirmDisabled={isDeletingRecord}
          cancelDisabled={isDeletingRecord}
          onConfirm={() => void confirmDeleteRecord()}
          onClose={() => setPendingDeleteRecord(null)}
        />
        <AppModal
          open={deleteNotice !== null}
          icon={<AlertTriangle size={24} />}
          title={deleteNotice?.title ?? ''}
          description={deleteNotice?.description ?? ''}
          confirmLabel="확인"
          hideCancel={true}
          onConfirm={() => setDeleteNotice(null)}
          onClose={() => setDeleteNotice(null)}
        />
        <AppModal
          open={shareNotice !== null}
          icon={<AlertTriangle size={24} />}
          title={shareNotice?.title ?? ''}
          description={shareNotice?.description ?? ''}
          confirmLabel="확인"
          hideCancel={true}
          onConfirm={() => setShareNotice(null)}
          onClose={() => setShareNotice(null)}
        />
      </div>
    );
  }

  return (
    <div className="pb-28 animate-slide-up pt-4 relative z-10 min-h-screen">
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: palette.strongText }}>
              {targetYear}년 {targetMonth + 1}월의 궤적
            </h1>
            <p className="text-sm mt-1" style={{ color: palette.mutedText }}>한 달 동안 남긴 기록들을 모아 보여줍니다.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full px-2 py-2 shadow-sm border" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
            <button
              onClick={() => canGoPrevMonth && setSelectedMonthDate(new Date(targetYear, targetMonth - 1, 1))}
              disabled={!canGoPrevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: palette.mutedText }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-bold tracking-wide min-w-[56px] text-center" style={{ color: palette.mutedText }}>
              {targetMonth + 1}월
            </span>
            <button
              onClick={() => canGoNextMonth && setSelectedMonthDate(new Date(targetYear, targetMonth + 1, 1))}
              disabled={!canGoNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: palette.mutedText }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {monthlyError && (
        <div className="px-4 mb-4">
          <div className="rounded-[1.5rem] border px-4 py-3" style={{ background: palette.cardBgSoft, borderColor: palette.border }}>
            <p className="text-[13px] leading-relaxed" style={{ color: palette.mutedText }}>{monthlyError}</p>
          </div>
        </div>
      )}

      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-5 rounded-[2rem] border shadow-sm flex flex-col items-center min-h-[105px]" style={{ background: palette.cardBgSoft, borderColor: palette.border }}>
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: palette.faintText }}>Records</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              <span className="text-4xl font-bold text-point-500 leading-none">
                {isMonthlyLoading && !monthlyReport ? '...' : monthlyReport?.recordsCount ?? 0}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[2rem] border shadow-sm flex flex-col items-center min-h-[105px]" style={{ background: palette.cardBgSoft, borderColor: palette.border }}>
            <div className="h-6 flex items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: palette.faintText }}>Photos</span>
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              <span className="text-4xl font-bold leading-none" style={{ color: palette.strongText }}>
                {isMonthlyLoading && !monthlyReport ? '...' : monthlyReport?.photoCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="rounded-[2rem] p-1.5 border shadow-sm grid grid-cols-3 gap-1" style={{ background: palette.tabBg, borderColor: palette.border }}>
          {(
            [
              { id: 'album', icon: <ImageIcon size={15} />, label: '앨범' },
              { id: 'records', icon: <BookOpenText size={15} />, label: '기록' },
              { id: 'calendar', icon: <Calendar size={15} />, label: '캘린더' },
            ] as const
          ).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="rounded-full px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-1.5"
              style={{
                background: activeTab === id ? palette.activeTabBg : 'transparent',
                color: activeTab === id ? palette.activeTabText : palette.mutedText,
                boxShadow: activeTab === id ? palette.shadow : 'none',
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() => void handleActivityBoardExport()}
            disabled={isExportingActivityBoard || monthlyRecords.length === 0}
            title="이번 달 활동 흐름을 한 장의 카드로 저장해요."
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: palette.cardBgSoft, color: palette.strongText, border: `1px solid ${palette.border}` }}
          >
            <Grid3X3 size={13} />
            {isExportingActivityBoard ? '저장 중...' : '활동판 저장'}
          </button>
          <button
            onClick={() => void handleCollageExport()}
            disabled={isExportingCollage || monthlyRecords.length === 0}
            title="이번 달 기록들을 콜라주 카드로 저장해요."
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: palette.cardBgSoft, color: palette.strongText, border: `1px solid ${palette.border}` }}
          >
            <Download size={13} />
            {isExportingCollage ? '저장 중...' : '전체 기록 저장'}
          </button>
        </div>
      </div>

      {activeTab === 'album' && (
        <AlbumTab
          photoRecords={displayedPhotoRecords}
          onSelectRecord={setSelectedRecordForDetail}
          emptyMonthLabel={monthLabel}
        />
      )}
      {activeTab === 'records' && (
        <RecordsListTab
          records={monthlyRecords}
          onSelectRecord={setSelectedRecordForDetail}
          onUpdateRecord={handleMonthlyRecordUpdate}
          onRequestDeleteRecord={requestDeleteRecord}
          accessToken={accessToken}
          onLoginRequired={onLoginRequired}
          emptyMonthLabel={monthLabel}
        />
      )}
      {activeTab === 'calendar' && (
        <CalendarTab
          calendarCells={calendarCells}
          targetMonth={targetMonth}
          targetYear={targetYear}
          onSelectRecord={setSelectedRecordForDetail}
        />
      )}
      <AppModal
        open={pendingDeleteRecord !== null}
        icon={<AlertTriangle size={24} />}
        title="이 기록을 삭제할까요?"
        description={RECORD_DELETE_DESCRIPTION}
        confirmLabel={isDeletingRecord ? '삭제하는 중...' : '삭제하기'}
        confirmVariant="danger"
        confirmDisabled={isDeletingRecord}
        cancelDisabled={isDeletingRecord}
        onConfirm={() => void confirmDeleteRecord()}
        onClose={() => setPendingDeleteRecord(null)}
      />
      <AppModal
        open={deleteNotice !== null}
        icon={<AlertTriangle size={24} />}
        title={deleteNotice?.title ?? ''}
        description={deleteNotice?.description ?? ''}
        confirmLabel="확인"
        hideCancel={true}
        onConfirm={() => setDeleteNotice(null)}
        onClose={() => setDeleteNotice(null)}
      />
      <AppModal
        open={shareNotice !== null}
        icon={<AlertTriangle size={24} />}
        title={shareNotice?.title ?? ''}
        description={shareNotice?.description ?? ''}
        confirmLabel="확인"
        hideCancel={true}
        onConfirm={() => setShareNotice(null)}
        onClose={() => setShareNotice(null)}
      />
    </div>
  );
};
