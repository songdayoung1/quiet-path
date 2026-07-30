import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  Compass,
  Heart,
  LoaderCircle,
  MessageCircle,
} from 'lucide-react';
import {
  notificationApi,
  type NotificationItem,
} from '../api/notificationApi';
import { buildApiErrorMessage } from '../api/apiClient';
import { getThemePalette, useResolvedTheme } from '../theme';

interface NotificationsViewProps {
  accessToken: string;
  onClose: () => void;
  onOpenTarget: (notification: NotificationItem) => void;
  onReadOne: () => void;
  onReadAll: () => void;
}

const PAGE_SIZE = 20;

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return '방금 전';
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

const notificationIcon = (type: string) => {
  if (type === 'REACTION_CREATED') return <Heart size={17} fill="currentColor" />;
  if (type === 'COMMENT_CREATED') return <MessageCircle size={17} />;
  if (type === 'PATH_REVIEW_REMINDER') return <Compass size={17} />;
  return <Bell size={17} />;
};

const notificationColors = (type: string, dark: boolean) => {
  if (type === 'REACTION_CREATED') {
    return {
      background: dark ? 'rgba(190,24,93,0.20)' : '#FCE7F3',
      color: dark ? '#F9A8D4' : '#BE185D',
    };
  }
  if (type === 'COMMENT_CREATED') {
    return {
      background: dark ? 'rgba(13,148,136,0.20)' : '#CCFBF1',
      color: dark ? '#5EEAD4' : '#0F766E',
    };
  }
  return {
    background: dark ? 'rgba(124,58,237,0.22)' : '#EDE9FE',
    color: dark ? '#C4B5FD' : '#7C3AED',
  };
};

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  accessToken,
  onClose,
  onOpenTarget,
  onReadOne,
  onReadAll,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [pendingIds, setPendingIds] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    notificationApi.getNotifications(accessToken, { page: 0, size: PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setPage(response.page);
        setTotalPages(response.totalPages);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(buildApiErrorMessage(requestError, '알림을 불러오지 못했어요.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const loadMore = async () => {
    if (isLoadingMore || page + 1 >= totalPages) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await notificationApi.getNotifications(accessToken, {
        page: page + 1,
        size: PAGE_SIZE,
      });
      setItems((current) => [...current, ...response.items]);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (requestError) {
      setError(buildApiErrorMessage(requestError, '알림을 더 불러오지 못했어요.'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (pendingIds[notification.notificationId]) return;
    if (!notification.read) {
      setPendingIds((current) => ({ ...current, [notification.notificationId]: true }));
      try {
        const response = await notificationApi.readNotification(
          accessToken,
          notification.notificationId
        );
        setItems((current) => current.map((item) => (
          item.notificationId === notification.notificationId
            ? { ...item, read: response.read, readAt: response.readAt }
            : item
        )));
        onReadOne();
      } catch (requestError) {
        setError(buildApiErrorMessage(requestError, '알림을 읽음 처리하지 못했어요.'));
        return;
      } finally {
        setPendingIds((current) => {
          const next = { ...current };
          delete next[notification.notificationId];
          return next;
        });
      }
    }
    onOpenTarget(notification);
  };

  const readAll = async () => {
    if (isReadingAll || !items.some((item) => !item.read)) return;
    setIsReadingAll(true);
    setError(null);
    try {
      await notificationApi.readAll(accessToken);
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      onReadAll();
    } catch (requestError) {
      setError(buildApiErrorMessage(requestError, '알림을 전체 읽음 처리하지 못했어요.'));
    } finally {
      setIsReadingAll(false);
    }
  };

  const hasUnread = items.some((item) => !item.read);

  return (
    <div className="min-h-[100dvh] w-full px-6 pb-10 pt-5 animate-slide-up overflow-y-auto">
      <header className="relative h-11 mb-7 flex items-center justify-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-0 w-10 h-10 rounded-full grid place-items-center"
          style={{ color: palette.mutedText }}
          aria-label="알림 닫기"
        >
          <ChevronLeft size={21} />
        </button>
        <h1 className="text-[16px] font-bold tracking-tight" style={{ color: palette.strongText }}>
          알림
        </h1>
        <button
          type="button"
          onClick={() => void readAll()}
          disabled={!hasUnread || isReadingAll}
          className="absolute right-0 inline-flex items-center gap-1.5 min-h-10 px-2 rounded-xl text-[11px] font-bold"
          style={{
            color: hasUnread ? '#8B5CF6' : palette.faintText,
            opacity: isReadingAll ? 0.55 : 1,
          }}
        >
          <CheckCheck size={15} />
          모두 읽음
        </button>
      </header>

      {error && (
        <p
          className="mb-3 rounded-2xl px-4 py-3 text-[12px] leading-relaxed"
          style={{
            color: theme === 'dark' ? '#FCA5A5' : '#B91C1C',
            background: theme === 'dark' ? 'rgba(127,29,29,0.24)' : 'rgba(254,226,226,0.82)',
          }}
        >
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="min-h-[320px] grid place-items-center" style={{ color: palette.faintText }}>
          <LoaderCircle size={25} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="min-h-[360px] flex flex-col items-center justify-center text-center px-8">
          <div
            className="w-14 h-14 rounded-full grid place-items-center mb-4"
            style={{ background: palette.cardBgStrong, color: palette.faintText }}
          >
            <Bell size={22} />
          </div>
          <p className="text-[15px] font-bold" style={{ color: palette.strongText }}>
            아직 도착한 알림이 없어요
          </p>
          <p className="text-[12px] mt-2 leading-relaxed" style={{ color: palette.mutedText }}>
            새로운 공감과 댓글, 회고 소식을 여기에 모아둘게요.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-[24px] border"
          style={{
            background: palette.cardBgStrong,
            borderColor: palette.border,
            boxShadow: palette.shadow,
          }}
        >
          {items.map((notification, index) => {
            const colors = notificationColors(notification.type, theme === 'dark');
            const nickname = notification.actor?.nickname || '시스템';
            return (
              <button
                type="button"
                key={notification.notificationId}
                onClick={() => void openNotification(notification)}
                disabled={Boolean(pendingIds[notification.notificationId])}
                className="relative w-full flex items-start gap-3.5 px-4 py-4 text-left transition-colors"
                style={{
                  borderTop: index === 0 ? 'none' : `1px solid ${palette.divider}`,
                  background: notification.read
                    ? 'transparent'
                    : theme === 'dark'
                      ? 'rgba(139,92,246,0.08)'
                      : 'rgba(245,243,255,0.72)',
                  opacity: pendingIds[notification.notificationId] ? 0.6 : 1,
                }}
              >
                <span
                  className="w-10 h-10 rounded-full grid place-items-center shrink-0"
                  style={colors}
                >
                  {notificationIcon(notification.type)}
                </span>
                <span className="flex-1 min-w-0 pt-0.5">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <strong
                      className="truncate text-[13px] leading-tight"
                      style={{ color: palette.strongText }}
                    >
                      {nickname}
                    </strong>
                    <span className="text-[10px]" style={{ color: palette.faintText }}>·</span>
                    <span className="shrink-0 text-[10.5px]" style={{ color: palette.faintText }}>
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                  <span
                    className="block mt-1.5 text-[12.5px] leading-[1.55]"
                    style={{ color: notification.read ? palette.mutedText : palette.strongText }}
                  >
                    {notification.message}
                  </span>
                </span>
                {!notification.read && (
                  <span className="absolute right-3.5 top-4 w-2 h-2 rounded-full bg-[#8B5CF6]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && page + 1 < totalPages && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={isLoadingMore}
          className="w-full min-h-11 mt-4 rounded-2xl text-[12px] font-bold"
          style={{
            background: palette.cardBg,
            color: palette.mutedText,
            border: `1px solid ${palette.border}`,
          }}
        >
          {isLoadingMore ? '불러오는 중…' : '알림 더 보기'}
        </button>
      )}
    </div>
  );
};
