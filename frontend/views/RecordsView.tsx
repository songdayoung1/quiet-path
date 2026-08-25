import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Record as RecordType, type RecordCardDisplayMode } from '../types';
import { AlertTriangle, ArrowDownUp, BookOpenText, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Image as ImageIcon, X } from 'lucide-react';
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
import { exportRecordCard, exportMonthlyCalendar, exportMonthlyCollage } from '../utils/exportRecordCard';
import { buildLatestRecordByDateMap } from '../utils/heatmap';
import { useRecordImageRefresh } from '../contexts/RecordImageRefreshContext';
import { MainScreenHeader } from '../components/MainScreenHeader';

interface RecordsViewProps {
  records: RecordType[];
  onUpdateRecord: (record: RecordType) => void;
  onDeleteRecord: (recordId: string) => void;
  accessToken?: string | null;
  onLoginRequired: () => void;
  showRecordsTabCoachmark?: boolean;
  onDismissRecordsTabCoachmark?: () => void;
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
    imagePositionX: record.imagePositionX ?? undefined,
    imagePositionY: record.imagePositionY ?? undefined,
    imageScale: record.imageScale ?? undefined,
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

const sortRecordsForDisplay = (
  records: RecordType[],
  sortOrder: 'newest' | 'oldest',
): RecordType[] =>
  [...records].sort((a, b) => {
    const aPinned = Boolean(a.isPinned);
    const bPinned = Boolean(b.isPinned);
    const pinDiff = Number(bPinned) - Number(aPinned);
    if (pinDiff !== 0) {
      return pinDiff;
    }
    if (aPinned && bPinned) {
      return 0;
    }

    const timeDiff = sortOrder === 'newest'
      ? b.timestamp - a.timestamp
      : a.timestamp - b.timestamp;
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return sortOrder === 'newest'
      ? b.id.localeCompare(a.id, undefined, { numeric: true })
      : a.id.localeCompare(b.id, undefined, { numeric: true });
  });

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
  imagePositionX: updatedRecord.imagePositionX ?? null,
  imagePositionY: updatedRecord.imagePositionY ?? null,
  imageScale: updatedRecord.imageScale ?? null,
  visibility: updatedRecord.isShared ? 'PUBLIC' : 'PRIVATE',
  isPinned: updatedRecord.isPinned ?? false,
});

export const RecordsView: React.FC<RecordsViewProps> = ({
  records,
  onUpdateRecord,
  onDeleteRecord,
  accessToken,
  onLoginRequired,
  showRecordsTabCoachmark = false,
  onDismissRecordsTabCoachmark,
}) => {
  const refreshImageUrl = useRecordImageRefresh();
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
  const [isExportingRecordCard, setIsExportingRecordCard] = useState(false);
  const [isExportingActivityBoard, setIsExportingActivityBoard] = useState(false);
  const [isExportingCollage, setIsExportingCollage] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isExportingSelectedRecords, setIsExportingSelectedRecords] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [recordSortOrder, setRecordSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [pendingRecordExport, setPendingRecordExport] = useState<{
    record: RecordType;
    mode?: RecordCardDisplayMode;
  } | null>(null);

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
        imagePositionX: record.imagePositionX ?? null,
        imagePositionY: record.imagePositionY ?? null,
        imageScale: record.imageScale ?? null,
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
    setIsSelectionMode(false);
    setSelectedRecordIds([]);
  }, [targetYear, targetMonth]);

  useEffect(() => {
    if (activeTab !== 'records' && isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedRecordIds([]);
    }
  }, [activeTab, isSelectionMode]);

  useEffect(() => {
    setIsSortMenuOpen(false);
  }, [activeTab, targetMonth, targetYear]);

  useEffect(() => {
    if (!isSortMenuOpen) {
      return;
    }

    const closeSortMenu = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeSortMenu);
    return () => document.removeEventListener('pointerdown', closeSortMenu);
  }, [isSortMenuOpen]);

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
  const sortedRecordsForList = useMemo(
    () => sortRecordsForDisplay(monthlyRecords, recordSortOrder),
    [monthlyRecords, recordSortOrder],
  );

  const photoRecords = useMemo(
    () => sortRecordsForDisplay(
      monthlyRecords.filter((record) => record.imageUrl),
      recordSortOrder,
    ),
    [monthlyRecords, recordSortOrder],
  );
  const displayedPhotoRecords = photoRecords.slice(0, 12);
  const selectedRecords = useMemo(
    () => monthlyRecords.filter((record) => selectedRecordIds.includes(record.id)),
    [monthlyRecords, selectedRecordIds],
  );
  const isAnyExporting = isExportingActivityBoard || isExportingCollage || isExportingSelectedRecords;

  useEffect(() => {
    setSelectedRecordIds((prev) => prev.filter((id) => monthlyRecords.some((record) => record.id === id)));
  }, [monthlyRecords]);

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
    const latestRecords = buildLatestRecordByDateMap(monthlyRecords) as Map<string, RecordType>;
    latestRecords.forEach((record) => {
      map.set(new Date(record.timestamp).getDate(), record);
    });
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

  const refreshRecordForExport = async (record: RecordType): Promise<RecordType> => {
    if (!record.imageUrl || !refreshImageUrl) {
      return record;
    }

    const nextImageUrl = await refreshImageUrl(record.id);
    return nextImageUrl ? { ...record, imageUrl: nextImageUrl } : record;
  };

  const refreshMonthlyRecordsForExport = async (): Promise<RecordType[]> => {
    if (!isServerBacked || !accessToken) {
      return monthlyRecords;
    }

    const refreshedReport = await recordApi.getMonthly(accessToken, targetYear, targetMonth + 1);
    setMonthlyReport(refreshedReport);
    return refreshedReport.items.map(buildRecordFromMonthlyItem);
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
    setIsExportingRecordCard(true);
    try {
      const refreshedRecord = await refreshRecordForExport(record);
      await exportRecordCard(refreshedRecord, mode ? { mode } : undefined);
      setShareNotice({
        title: '카드를 저장했어요',
        description: '기록 카드 이미지를 브라우저에서 다운로드했어요.',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setShareNotice({
        title: '카드를 내보내지 못했어요',
        description: buildApiErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
      });
    } finally {
      setIsExportingRecordCard(false);
    }
  };

  const openRecordExportModal = (record: RecordType, mode?: RecordCardDisplayMode) => {
    setPendingRecordExport({ record, mode });
  };

  const confirmRecordExport = async () => {
    if (!pendingRecordExport || isExportingRecordCard) {
      return;
    }

    const target = pendingRecordExport;
    setPendingRecordExport(null);
    await handleExportRecord(target.record, target.mode);
  };

  const handleCalendarExport = async () => {
    if (isExportingActivityBoard || monthlyRecords.length === 0) return;
    setIsExportingActivityBoard(true);
    try {
      await exportMonthlyCalendar(monthlyRecords, targetYear, targetMonth + 1);
      setShareNotice({
        title: '캘린더를 저장했어요',
        description: `${targetMonth + 1}월 무드 캘린더를 브라우저에서 다운로드했어요.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareNotice({
        title: '캘린더를 내보내지 못했어요',
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
      const refreshedRecords = await refreshMonthlyRecordsForExport();
      const result = await exportMonthlyCollage(refreshedRecords, targetYear, targetMonth + 1);
      setShareNotice({
        title: '전체 기록 저장이 완료되었어요',
        description:
          result.pages > 1
            ? `${result.pages}장으로 나눠 브라우저에서 다운로드했어요.`
            : `${targetMonth + 1}월 전체 기록을 브라우저에서 다운로드했어요.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareNotice({
        title: '전체 기록을 내보내지 못했어요',
        description: buildApiErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
      });
    } finally {
      setIsExportingCollage(false);
    }
  };

  const openExportModal = () => {
    setIsExportModalOpen(true);
  };

  const closeExportModal = () => {
    if (isAnyExporting) {
      return;
    }
    setIsExportModalOpen(false);
  };

  const startSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedRecordIds([]);
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedRecordIds([]);
  };

  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectedRecordsExport = async () => {
    if (isExportingSelectedRecords || selectedRecords.length === 0) return;

    setIsExportingSelectedRecords(true);
    try {
      const refreshedRecords = await refreshMonthlyRecordsForExport();
      const refreshedSelectedRecords = refreshedRecords.filter((record) => selectedRecordIds.includes(record.id));

      if (refreshedSelectedRecords.length === 1) {
        const targetRecord = refreshedSelectedRecords[0];
        await exportRecordCard(
          targetRecord,
          targetRecord.imageUrl ? { mode: 'poster' } : undefined,
        );
        setShareNotice({
          title: '선택 기록 저장이 완료되었어요',
          description: '선택한 기록 카드를 브라우저에서 다운로드했어요.',
        });
      } else {
        const result = await exportMonthlyCollage(refreshedRecords, targetYear, targetMonth + 1, {
          records: refreshedSelectedRecords,
        });
        setShareNotice({
          title: '선택 기록 저장이 완료되었어요',
          description:
            result.pages > 1
              ? `${result.pages}장으로 나눠 브라우저에서 다운로드했어요.`
              : `선택한 ${refreshedSelectedRecords.length}개의 장면을 브라우저에서 다운로드했어요.`,
        });
      }

      setIsSelectionMode(false);
      setSelectedRecordIds([]);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareNotice({
        title: '선택 기록을 내보내지 못했어요',
        description: buildApiErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
      });
    } finally {
      setIsExportingSelectedRecords(false);
    }
  };

  const handleExportOptionClick = async (option: 'calendar' | 'collage' | 'select') => {
    if (isAnyExporting) {
      return;
    }

    setIsExportModalOpen(false);

    if (option === 'calendar') {
      await handleCalendarExport();
      return;
    }

    if (option === 'collage') {
      await handleCollageExport();
      return;
    }

    setActiveTab('records');
    startSelectionMode();
  };

  if (selectedRecordForDetail) {
    const record = selectedRecordForDetail;
    const pageNumber = sortedRecordsForList.findIndex((item) => item.id === record.id) + 1;
    const exportViewLabel = record.imageUrl
      ? detailDisplayMode === 'poster'
        ? '포스터형 카드'
        : '기록형 카드'
      : '기록 상세 카드';

    return (
      <div className="relative min-h-screen">
        <RecordDetailDiary
          record={record}
          pageNumber={pageNumber > 0 ? pageNumber : 1}
          displayMode={detailDisplayMode}
          onDisplayModeChange={setDetailDisplayMode}
          onClose={() => {
            setPendingRecordExport(null);
            setSelectedRecordForDetail(null);
          }}
          onShare={() => openRecordExportModal(record, record.imageUrl ? detailDisplayMode : undefined)}
          onDelete={() => requestDeleteRecord(record)}
        />
        <AppModal
          open={pendingRecordExport !== null}
          icon={<Download size={24} />}
          title="카드 저장 안내"
          description={
            <>
              지금 보고 있는 <strong>{exportViewLabel}</strong> 화면으로 저장돼요.
              <br />
              앱 전체가 아니라 카드 이미지 한 장만 저장됩니다.
            </>
          }
          confirmLabel={isExportingRecordCard ? '저장 중...' : '이 화면으로 저장'}
          confirmDisabled={isExportingRecordCard}
          cancelDisabled={isExportingRecordCard}
          onConfirm={() => void confirmRecordExport()}
          onClose={() => setPendingRecordExport(null)}
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
    <div className="pb-28 animate-slide-up pt-2 relative z-10 min-h-screen">
      <MainScreenHeader
        actionBelowOnNarrow
        title={(
          <>
            <span className="block whitespace-nowrap">{targetYear}년 {targetMonth + 1}월의</span>
            <span className="block">궤적</span>
          </>
        )}
        description={(
          <>
            <span className="block">한 달 동안 남긴 기록들을</span>
            <span className="block">모아 보여줍니다.</span>
          </>
        )}
        action={(
          <div className="flex items-center gap-1 rounded-full border px-2 py-2 shadow-sm" style={{ background: palette.pillBg, borderColor: palette.pillBorder }}>
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
        )}
      />

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
          ).map(({ id, icon, label }) => {
            const showCoachmark = id === 'records' && showRecordsTabCoachmark;
            return (
              <div key={id} className="relative min-w-0">
                {showCoachmark && (
                  <div
                    className="absolute -top-[52px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-extrabold text-white shadow-[0_8px_24px_rgba(124,58,237,0.28)]"
                    style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)' }}
                  >
                    작성한 내용은 여기서 확인해요
                    <button
                      type="button"
                      onClick={onDismissRecordsTabCoachmark}
                      className="grid h-5 w-5 place-items-center rounded-full bg-white/15"
                      aria-label="기록 탭 안내 닫기"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    if (id === 'records' && showCoachmark) {
                      onDismissRecordsTabCoachmark?.();
                    }
                  }}
                  className="flex w-full items-center justify-center gap-1 rounded-full px-1 py-3 text-sm font-medium transition-all min-[390px]:gap-1.5 min-[390px]:px-4"
                  style={{
                    background: activeTab === id ? palette.activeTabBg : 'transparent',
                    color: activeTab === id ? palette.activeTabText : palette.mutedText,
                    boxShadow: showCoachmark
                      ? '0 0 0 3px rgba(139,92,246,0.24), 0 8px 22px rgba(124,58,237,0.16)'
                      : activeTab === id
                        ? palette.shadow
                        : 'none',
                  }}
                >
                  {icon}
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              </div>
            );
          })}
        </div>
        {activeTab === 'records' && isSelectionMode ? (
          <div
            className="mt-3 flex items-center gap-2 rounded-[1.6rem] border px-3 py-2.5 shadow-sm"
            style={{ background: palette.cardBgSoft, borderColor: palette.border }}
          >
            <button
              onClick={cancelSelectionMode}
              className="rounded-full px-3 py-2 text-[11px] font-bold transition-colors"
              style={{ color: palette.mutedText }}
            >
              취소
            </button>
            <div className="flex-1 text-center">
              <p className="text-[11px] font-bold" style={{ color: palette.strongText }}>
                {selectedRecordIds.length}개 선택됨
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: palette.faintText }}>
                저장할 기록을 눌러 선택하세요
              </p>
            </div>
            <button
              onClick={() => void handleSelectedRecordsExport()}
              disabled={isExportingSelectedRecords || selectedRecordIds.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: palette.activeTabBg, color: palette.activeTabText }}
            >
              <Download size={13} />
              {isExportingSelectedRecords ? '저장 중...' : '저장'}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-1.5">
            {(
              (activeTab === 'album' && photoRecords.length > 0) ||
              (activeTab === 'records' && monthlyRecords.length > 0)
            ) && (
              <div ref={sortMenuRef} className="relative z-40">
                <button
                  type="button"
                  aria-label={activeTab === 'album' ? '앨범 정렬' : '기록 정렬'}
                  aria-haspopup="listbox"
                  aria-expanded={isSortMenuOpen}
                  onClick={() => setIsSortMenuOpen((open) => !open)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold shadow-sm outline-none transition-all active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-point-300/70"
                  style={{
                    background: isSortMenuOpen ? palette.activeTabBg : palette.cardBgSoft,
                    borderColor: isSortMenuOpen ? 'rgba(139,92,246,0.24)' : palette.border,
                    color: isSortMenuOpen ? palette.activeTabText : palette.mutedText,
                    boxShadow: isSortMenuOpen ? palette.shadow : undefined,
                  }}
                >
                  <ArrowDownUp size={12} aria-hidden="true" />
                  <span>{recordSortOrder === 'newest' ? '최신순' : '오래된순'}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {isSortMenuOpen && (
                  <div
                    role="listbox"
                    aria-label={activeTab === 'album' ? '앨범 정렬 방식' : '기록 정렬 방식'}
                    className="absolute right-0 top-[calc(100%+8px)] w-[148px] overflow-hidden rounded-[18px] border p-1.5 shadow-xl backdrop-blur-xl"
                    style={{
                      background: palette.cardBgStrong,
                      borderColor: palette.border,
                      boxShadow: theme === 'dark'
                        ? '0 18px 44px rgba(0,0,0,0.34)'
                        : '0 18px 44px rgba(82,96,109,0.18)',
                    }}
                  >
                    {(
                      [
                        { id: 'newest', label: '최신순', description: '최근 기록부터' },
                        { id: 'oldest', label: '오래된순', description: '처음 기록부터' },
                      ] as const
                    ).map((option) => {
                      const selected = recordSortOrder === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setRecordSortOrder(option.id);
                            setIsSortMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-[13px] px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-point-300/60"
                          style={{ background: selected ? palette.activeTabBg : 'transparent' }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-bold" style={{ color: selected ? palette.activeTabText : palette.strongText }}>
                              {option.label}
                            </span>
                            <span className="mt-0.5 block text-[9px]" style={{ color: palette.faintText }}>
                              {option.description}
                            </span>
                          </span>
                          <span
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
                            style={{
                              background: selected ? 'rgba(139,92,246,0.14)' : 'transparent',
                              color: selected ? '#8B5CF6' : 'transparent',
                            }}
                          >
                            <Check size={12} strokeWidth={2.8} aria-hidden="true" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={openExportModal}
              disabled={isAnyExporting || monthlyRecords.length === 0}
              title="캘린더, 전체 기록, 선택 기록 저장 옵션을 고를 수 있어요."
              aria-label="기록 내보내기 옵션"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all hover:scale-[1.03] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: palette.mutedText }}
            >
              <Download size={13} />
            </button>
          </div>
        )}
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
          records={sortedRecordsForList}
          onSelectRecord={setSelectedRecordForDetail}
          onUpdateRecord={handleMonthlyRecordUpdate}
          onRequestDeleteRecord={requestDeleteRecord}
          accessToken={accessToken}
          onLoginRequired={onLoginRequired}
          emptyMonthLabel={monthLabel}
          selectionMode={isSelectionMode}
          selectedRecordIds={selectedRecordIds}
          onToggleSelectRecord={toggleRecordSelection}
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
        open={isExportModalOpen}
        icon={<Download size={24} />}
        title="기록 내보내기"
        description={
          <div className="mt-1 text-left">
            <div className="mb-5 text-center text-[12px] leading-[1.7]" style={{ color: palette.faintText }}>
              <p>이번 달 기록을 이미지로 저장해요</p>
              <p>카드를 누르면 바로 저장돼요</p>
            </div>

            <div className="space-y-2">
              <p className="px-1 text-[11px] font-bold tracking-[0.18em]" style={{ color: palette.faintText }}>
                바로 저장
              </p>

              {(
                [
                  {
                    id: 'calendar',
                    icon: <Calendar size={15} />,
                    title: '캘린더 저장',
                    desc: '이번 달 무드 흐름을 한 장으로',
                  },
                  {
                    id: 'collage',
                    icon: <Download size={15} />,
                    title: '전체 기록 저장',
                    desc: '이번 달 기록 전체를 콜라주로',
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => void handleExportOptionClick(option.id)}
                  disabled={isAnyExporting}
                  className="w-full rounded-[20px] border px-4 py-3 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: palette.cardBgSoft,
                    borderColor: palette.border,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px]"
                      style={{ background: 'rgba(139,92,246,0.10)', color: '#7C3AED' }}
                    >
                      {option.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold" style={{ color: palette.strongText }}>
                        {option.title}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: palette.mutedText }}>
                        {option.desc}
                      </p>
                    </div>
                    <Download size={14} style={{ color: palette.faintText }} />
                  </div>
                </button>
              ))}
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: palette.border }} />
              <span className="text-[10px] font-bold tracking-[0.18em]" style={{ color: palette.faintText }}>
                직접 고르기
              </span>
              <div className="h-px flex-1" style={{ background: palette.border }} />
            </div>

            <button
              type="button"
              onClick={() => void handleExportOptionClick('select')}
              disabled={isAnyExporting}
              className="w-full rounded-[20px] border border-dashed px-4 py-3 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: palette.cardBgSoft,
                borderColor: 'rgba(139,92,246,0.28)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px]"
                  style={{ background: 'rgba(139,92,246,0.10)', color: '#7C3AED' }}
                >
                  <BookOpenText size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold" style={{ color: palette.strongText }}>
                    기록 골라서 저장
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: palette.mutedText }}>
                    저장할 장면만 직접 선택해요
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: palette.faintText }} />
              </div>
            </button>
          </div>
        }
        confirmLabel="닫기"
        confirmDisabled={isAnyExporting}
        hideCancel={true}
        onConfirm={closeExportModal}
        onClose={closeExportModal}
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
