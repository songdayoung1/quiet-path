import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Heart, Lock, MessageCircle, RefreshCcw, Sparkles } from 'lucide-react';
import { reactionApi } from '../api/reactionApi';
import { feedApi, FeedCategory, FeedItemResponse, WeeklyTop3ItemResponse } from '../api/feedApi';
import { getThemePalette, useResolvedTheme } from '../theme';
import { AppModal } from '../components/AppModal';
import { CommunityCommentsSheet } from '../components/CommunityCommentsSheet';

interface CommunityViewProps {
  accessToken?: string | null;
  onRefreshAuth?: () => Promise<string | null>;
  currentUserId?: string | null;
  isGuest?: boolean;
  onLoginClick?: () => void;
}

type CommunityRecordItem = Pick<
  FeedItemResponse,
  'pathId' | 'recordId' | 'title' | 'content' | 'status' | 'owner' | 'categoryCode' | 'reactionCount' | 'commentCount' | 'isReacted' | 'sharedAt' | 'createdAt'
>;

const CATEGORIES: { id: FeedCategory; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'job', label: '취업' },
  { id: 'study', label: '공부' },
  { id: 'workout', label: '운동/건강' },
  { id: 'hobby', label: '취미' },
  { id: 'cert', label: '자격증' },
];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  job: '취업',
  study: '공부',
  workout: '운동/건강',
  hobby: '취미',
  cert: '자격증',
  DEFAULT: '기록',
};

const GUEST_VISIBLE_POST_COUNT = 1;
const GUEST_BLUR_POST_COUNT = 4;
const activeFeedRequests = new Set<string>();
const activeWeeklyTopRequests = new Set<string>();

const formatRelativeTime = (value?: string | null) => {
  if (!value) return '방금';

  const target = new Date(value);
  const diffMs = Date.now() - target.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return '방금';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return target.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};

interface FeedCardProps {
  item: CommunityRecordItem;
  onLike: () => void;
  onComment: () => void;
  likeDisabled?: boolean;
  commentDisabled?: boolean;
  commentOpen?: boolean;
}

const FeedCard: React.FC<FeedCardProps> = ({
  item,
  onLike,
  onComment,
  likeDisabled = false,
  commentDisabled = false,
  commentOpen = false,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const nickname = item.owner?.nickname ?? '익명의 기록자';
  const categoryLabel = CATEGORY_LABEL_MAP[item.categoryCode ?? ''] ?? '기록';
  const badge = nickname.slice(0, 1);
  const sharedText = formatRelativeTime(item.sharedAt ?? item.createdAt);

  return (
    <article
      className="p-4 border transition-[border-radius] duration-200"
      style={{
        background: palette.cardBg,
        borderColor: palette.border,
        borderRadius: commentOpen ? '24px 24px 0 0' : '24px',
      }}
    >
      <header className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-point-200 to-point-400 grid place-items-center text-white text-[11px] font-bold">
          {badge}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold truncate" style={{ color: palette.strongText }}>@{nickname}</p>
          <p className="text-[10px]" style={{ color: palette.faintText }}>
            {sharedText} · #{categoryLabel}
          </p>
        </div>
      </header>

      {item.title && (
        <div
          className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight mb-2.5 border"
          style={{ background: palette.pillBg, borderColor: palette.pillBorder, color: palette.mutedText }}
        >
          Q. {item.title}
        </div>
      )}

      <p className="text-[13.5px] leading-[1.75] mb-3 whitespace-pre-line" style={{ color: palette.strongText }}>
        {item.content ?? ''}
      </p>

      <footer className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: palette.divider }}>
        <span
          className="px-2.5 py-1 rounded-md text-[10px] font-bold text-point-600 border"
          style={{
            background: theme === 'dark' ? 'rgba(76,29,149,0.20)' : 'rgba(245,243,255,0.92)',
            borderColor: theme === 'dark' ? 'rgba(167,139,250,0.24)' : 'rgba(221,214,254,0.9)',
          }}
        >
          #{categoryLabel}
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onComment}
            disabled={commentDisabled}
            className="flex items-center gap-1 text-[12px] transition disabled:opacity-50"
            style={{ color: palette.faintText }}
          >
            <MessageCircle size={14} strokeWidth={1.8} />
            {item.commentCount}
          </button>
          <button
            type="button"
            onClick={onLike}
            disabled={likeDisabled}
            className="flex items-center gap-1 text-[12px] transition disabled:opacity-50"
            style={{ color: item.isReacted ? '#F43F5E' : palette.faintText }}
          >
            <Heart size={14} strokeWidth={1.8} className={item.isReacted ? 'fill-rose-500' : ''} />
            {item.reactionCount}
          </button>
        </div>
      </footer>
    </article>
  );
};

interface WeeklyTopCarouselProps {
  items: WeeklyTop3ItemResponse[];
  commentTarget: CommunityRecordItem | null;
  pendingReactionIds: Record<number, boolean>;
  accessToken?: string | null;
  onRefreshAuth?: () => Promise<string | null>;
  currentUserId?: string | null;
  onLike: (item: CommunityRecordItem) => void;
  onComment: (item: CommunityRecordItem) => void;
  onCloseComments: () => void;
  onCommentCountChange: (recordId: number, nextCount: number) => void;
  onActiveRecordChange: (recordId: number | null) => void;
}

const WeeklyTopCarousel: React.FC<WeeklyTopCarouselProps> = ({
  items,
  commentTarget,
  pendingReactionIds,
  accessToken,
  onRefreshAuth,
  currentUserId,
  onLike,
  onComment,
  onCloseComments,
  onCommentCountChange,
  onActiveRecordChange,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRecordIdRef = useRef<number | null>(null);
  const topRecordIds = useMemo(() => new Set(items.map((item) => item.recordId)), [items]);

  useEffect(() => {
    if (items.length === 0) {
      activeRecordIdRef.current = null;
      onActiveRecordChange(null);
      setActiveIndex(0);
      return;
    }

    setActiveIndex((prev) => {
      const fallbackRecordId = items[Math.min(prev, items.length - 1)]?.recordId ?? items[0].recordId;
      const preferredRecordId = activeRecordIdRef.current ?? fallbackRecordId;
      const nextIndex = items.findIndex((item) => item.recordId === preferredRecordId);
      return nextIndex >= 0 ? nextIndex : 0;
    });
  }, [items, onActiveRecordChange]);

  useEffect(() => {
    activeRecordIdRef.current = items[activeIndex]?.recordId ?? null;
    onActiveRecordChange(items[activeIndex]?.recordId ?? null);
  }, [activeIndex, items, onActiveRecordChange]);

  if (items.length === 0) {
    return null;
  }

  const activeItem = items[Math.min(activeIndex, items.length - 1)];

  const moveToIndex = (nextIndex: number) => {
    const normalized = (nextIndex + items.length) % items.length;
    const nextItem = items[normalized];
    if (commentTarget && topRecordIds.has(commentTarget.recordId) && commentTarget.recordId !== nextItem.recordId) {
      onCloseComments();
    }
    activeRecordIdRef.current = nextItem.recordId;
    setActiveIndex(normalized);
  };

  return (
    <section className="mx-4 mb-4 p-4 rounded-3xl border" style={{ background: palette.cardBg, borderColor: palette.border }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md text-point-600 grid place-items-center" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.24)' : 'rgba(243,232,255,0.9)' }}>
            <Sparkles size={12} strokeWidth={1.8} />
          </span>
          <h2 className="text-[12px] font-bold tracking-tight" style={{ color: palette.strongText }}>
            이번 주 공감이 머문 기록
          </h2>
        </div>

        {items.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tabular-nums" style={{ color: palette.faintText }}>
              {activeIndex + 1} / {items.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveToIndex(activeIndex - 1)}
                className="w-7 h-7 rounded-full border grid place-items-center transition"
                style={{ borderColor: palette.border, color: palette.mutedText, background: palette.cardBgSoft }}
                aria-label="이전 기록"
              >
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => moveToIndex(activeIndex + 1)}
                className="w-7 h-7 rounded-full border grid place-items-center transition"
                style={{ borderColor: palette.border, color: palette.mutedText, background: palette.cardBgSoft }}
                aria-label="다음 기록"
              >
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {items.map((item) => (
            <div key={item.recordId} className="min-w-full">
              <FeedCard
                item={item}
                onLike={() => onLike(item)}
                onComment={() => onComment(item)}
                likeDisabled={!!pendingReactionIds[item.recordId]}
                commentOpen={commentTarget?.recordId === item.recordId}
              />
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {items.map((item, index) => (
            <button
              key={item.recordId}
              type="button"
              onClick={() => moveToIndex(index)}
              className="h-2 rounded-full transition-all"
              style={{
                width: activeIndex === index ? 18 : 8,
                background: activeIndex === index ? '#8B5CF6' : theme === 'dark' ? 'rgba(148,163,184,0.36)' : 'rgba(148,163,184,0.5)',
              }}
              aria-label={`${index + 1}번째 기록 보기`}
            />
          ))}
        </div>
      )}

      {commentTarget?.recordId === activeItem.recordId && (
        <CommunityCommentsSheet
          open
          accessToken={accessToken}
          onRefreshAuth={onRefreshAuth}
          currentUserId={currentUserId}
          recordId={activeItem.recordId}
          onCommentCountChange={onCommentCountChange}
        />
      )}
    </section>
  );
};

const CommunitySkeleton: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="px-4 space-y-3">
      <div className="h-[132px] rounded-3xl border animate-pulse" style={{ background: palette.cardBgMuted, borderColor: palette.border }} />
      <div className="h-[220px] rounded-3xl border animate-pulse" style={{ background: palette.cardBgSoft, borderColor: palette.border }} />
      <div className="h-[220px] rounded-3xl border animate-pulse" style={{ background: palette.cardBg, borderColor: palette.border }} />
    </div>
  );
};

const GuestLockCard: React.FC<{ onLoginClick?: () => void }> = ({ onLoginClick }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div
      className="rounded-[1.75rem] border px-5 py-6 text-center"
      style={{
        background: palette.cardBgStrong,
        borderColor: palette.border,
        boxShadow:
          theme === 'dark'
            ? '0 18px 40px rgba(2,6,23,0.38)'
            : '0 18px 40px rgba(15,23,42,0.08)',
      }}
    >
      <div
        className="inline-flex p-2.5 rounded-xl mb-3"
        style={{
          background: theme === 'dark' ? 'rgba(76,29,149,0.24)' : 'rgba(243,232,255,0.82)',
          color: '#8B5CF6',
        }}
      >
        <Lock size={18} strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-bold mb-1.5" style={{ color: palette.strongText }}>
        더 많은 조용한 궤적들이 있어요
      </h3>
      <p className="text-[12px] leading-relaxed mb-4" style={{ color: palette.mutedText }}>
        로그인하면 전체 피드를 읽고
        <br />
        공감과 댓글을 남길 수 있어요.
      </p>
      <button
        onClick={() => onLoginClick?.()}
        className="w-full min-h-[48px] rounded-xl text-[14px] font-bold text-white transition active:scale-[0.985]"
        style={{
          background: theme === 'dark' ? '#64748B' : '#52606D',
          boxShadow: theme === 'dark' ? '0 8px 20px rgba(2,6,23,0.28)' : '0 8px 20px rgba(82,96,109,0.22)',
        }}
      >
        로그인하고 계속 보기
      </button>
    </div>
  );
};

export const CommunityView: React.FC<CommunityViewProps> = ({
  accessToken,
  onRefreshAuth,
  currentUserId,
  isGuest = false,
  onLoginClick,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory>('all');
  const [weeklyTopItems, setWeeklyTopItems] = useState<WeeklyTop3ItemResponse[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItemResponse[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [pendingReactionIds, setPendingReactionIds] = useState<Record<number, boolean>>({});
  const [commentTarget, setCommentTarget] = useState<CommunityRecordItem | null>(null);
  const [topActiveRecordId, setTopActiveRecordId] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasNextRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const feedRequestSeqRef = useRef(0);
  const weeklyTopRequestSeqRef = useRef(0);
  const viewContextRef = useRef<string | null>(null);
  const requestContextKey = `${selectedCategory}:${accessToken ?? 'guest'}:${isGuest ? 'guest' : 'member'}`;
  viewContextRef.current = requestContextKey;

  const handleRestrictedAction = useCallback(() => {
    if (isGuest || !accessToken) {
      onLoginClick?.();
    }
  }, [accessToken, isGuest, onLoginClick]);

  const refreshWeeklyTop3 = useCallback(async (options?: { bypassCache?: boolean }) => {
    if (selectedCategory !== 'all') {
      setWeeklyTopItems([]);
      setTopActiveRecordId(null);
      return;
    }

    const requestSeq = ++weeklyTopRequestSeqRef.current;
    const requestContext = requestContextKey;
    const requestKey = `${selectedCategory}:${accessToken ?? 'guest'}`;
    if (activeWeeklyTopRequests.has(requestKey)) {
      return;
    }
    activeWeeklyTopRequests.add(requestKey);

    try {
      const response = isGuest
        ? await feedApi.getWeeklyTop3(null, options)
        : await feedApi.getWeeklyTop3(accessToken, options);
      if (weeklyTopRequestSeqRef.current !== requestSeq || viewContextRef.current !== requestContext || selectedCategory !== 'all') {
        return;
      }
      setWeeklyTopItems(response.items ?? []);
    } catch {
      if (weeklyTopRequestSeqRef.current !== requestSeq || viewContextRef.current !== requestContext || selectedCategory !== 'all') {
        return;
      }
      setWeeklyTopItems([]);
    } finally {
      activeWeeklyTopRequests.delete(requestKey);
    }
  }, [accessToken, isGuest, requestContextKey, selectedCategory]);

  const loadFeedPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const requestSeq = append ? feedRequestSeqRef.current : ++feedRequestSeqRef.current;
      const requestContext = requestContextKey;
      if (append) {
        if (loadingMoreRef.current || !hasNextRef.current || !cursor) {
          return;
        }
        loadingMoreRef.current = true;
        setIsLoadingMore(true);
      } else {
        const requestKey = `${selectedCategory}:${accessToken ?? 'guest'}:${cursor ?? 'first'}:${isGuest ? 'guest' : 'member'}`;
        if (activeFeedRequests.has(requestKey)) {
          return;
        }
        activeFeedRequests.add(requestKey);
        hasNextRef.current = false;
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
        setIsInitialLoading(true);
        setError(null);
      }

      try {
        const response = isGuest
          ? await feedApi.getFeed({
              token: null,
              category: selectedCategory,
              cursor: null,
              size: 20,
            })
          : await feedApi.getFeed({
              token: accessToken,
              category: selectedCategory,
              cursor,
              size: 20,
            });

        if (feedRequestSeqRef.current !== requestSeq || viewContextRef.current !== requestContext) {
          return;
        }
        setFeedItems((prev) => (append ? [...prev, ...response.items] : response.items));
        const nextHasNext = isGuest ? false : response.hasNext;
        const resolvedCursor = isGuest ? null : response.nextCursor;
        hasNextRef.current = nextHasNext;
        setHasNext(nextHasNext);
        setNextCursor(resolvedCursor);
      } catch (err) {
        if (feedRequestSeqRef.current !== requestSeq || viewContextRef.current !== requestContext) {
          return;
        }
        if (!append) {
          setError(err instanceof Error ? err.message : '피드를 불러오지 못했습니다.');
        }
      } finally {
        if (append) {
          loadingMoreRef.current = false;
          setIsLoadingMore(false);
        } else {
          activeFeedRequests.delete(`${selectedCategory}:${accessToken ?? 'guest'}:${cursor ?? 'first'}:${isGuest ? 'guest' : 'member'}`);
          setIsInitialLoading(false);
        }
      }
    },
    [accessToken, isGuest, requestContextKey, selectedCategory]
  );

  useEffect(() => {
    void loadFeedPage(null, false);
  }, [loadFeedPage]);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      setWeeklyTopItems([]);
      setTopActiveRecordId(null);
      return undefined;
    }

    void refreshWeeklyTop3();
    return undefined;
  }, [refreshWeeklyTop3, selectedCategory]);

  useEffect(() => {
    setCommentTarget(null);
    setTopActiveRecordId(null);
  }, [selectedCategory, accessToken, isGuest]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNext || isGuest) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadFeedPage(nextCursor, true);
        }
      },
      { rootMargin: '160px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNext, isGuest, loadFeedPage, nextCursor]);

  const visiblePosts = useMemo(
    () => (isGuest ? feedItems.slice(0, GUEST_VISIBLE_POST_COUNT) : feedItems),
    [feedItems, isGuest]
  );
  const hiddenBlurPosts = useMemo(
    () => (
      isGuest
        ? feedItems.slice(
            GUEST_VISIBLE_POST_COUNT,
            GUEST_VISIBLE_POST_COUNT + GUEST_BLUR_POST_COUNT
          )
        : []
    ),
    [feedItems, isGuest]
  );
  const topVisibleCommentRecordId = selectedCategory === 'all' ? topActiveRecordId : null;

  const updateCommunityItem = useCallback((recordId: number, updater: (item: CommunityRecordItem) => CommunityRecordItem) => {
    setFeedItems((prev) => prev.map((item) => (item.recordId === recordId ? updater(item) as FeedItemResponse : item)));
    setWeeklyTopItems((prev) => prev.map((item) => (item.recordId === recordId ? updater(item) as WeeklyTop3ItemResponse : item)));
    setCommentTarget((prev) => (prev && prev.recordId === recordId ? updater(prev) : prev));
  }, []);

  const handleCommentCountChange = useCallback((recordId: number, nextCount: number) => {
    updateCommunityItem(recordId, (item) => ({
      ...item,
      commentCount: nextCount,
    }));
    feedApi.invalidateCommunityCache();
  }, [updateCommunityItem]);

  const handleOpenComments = (item: CommunityRecordItem) => {
    if (isGuest || !accessToken) {
      handleRestrictedAction();
      return;
    }
    setCommentTarget((prev) => (prev?.recordId === item.recordId ? null : item));
  };

  const handleToggleReaction = useCallback(async (item: CommunityRecordItem) => {
    if (isGuest || !accessToken) {
      handleRestrictedAction();
      return;
    }

    if (pendingReactionIds[item.recordId]) {
      return;
    }

    const previousReacted = item.isReacted;
    const previousCount = item.reactionCount;
    const optimisticCount = previousReacted
      ? Math.max(0, previousCount - 1)
      : previousCount + 1;

    setPendingReactionIds((prev) => ({
      ...prev,
      [item.recordId]: true,
    }));

    updateCommunityItem(item.recordId, (current) => ({
      ...current,
      isReacted: !previousReacted,
      reactionCount: optimisticCount,
    }));

    try {
      const response = previousReacted
        ? await reactionApi.deleteReaction(accessToken, item.recordId)
        : await reactionApi.createReaction(accessToken, item.recordId);

      updateCommunityItem(item.recordId, (current) => ({
        ...current,
        isReacted: response.reacted,
        reactionCount: response.reactionCount,
      }));

      feedApi.invalidateCommunityCache();
      if (selectedCategory === 'all') {
        void refreshWeeklyTop3({ bypassCache: true });
      }
    } catch (err) {
      updateCommunityItem(item.recordId, (current) => ({
        ...current,
        isReacted: previousReacted,
        reactionCount: previousCount,
      }));
      setNoticeMessage(err instanceof Error ? err.message : '공감 처리에 실패했습니다.');
    } finally {
      setPendingReactionIds((prev) => {
        const next = { ...prev };
        delete next[item.recordId];
        return next;
      });
    }
  }, [accessToken, handleRestrictedAction, isGuest, pendingReactionIds, refreshWeeklyTop3, selectedCategory, updateCommunityItem]);

  return (
    <div className="pb-28 animate-slide-up pt-2">
      <div className="text-center px-6 mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight mb-1" style={{ color: palette.strongText }}>조용한 피드</h1>
        <p className="text-[12px]" style={{ color: palette.mutedText }}>다른 이들의 궤적을 조용히 둘러봅니다.</p>
      </div>

      <nav
        aria-label="커뮤니티 카테고리"
        className="px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar"
      >
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition border"
            style={{
              background: selectedCategory === category.id ? palette.activeTabBg : palette.pillBg,
              color: selectedCategory === category.id ? palette.activeTabText : palette.mutedText,
              borderColor: selectedCategory === category.id ? 'rgba(139,92,246,0.26)' : palette.pillBorder,
            }}
          >
            {category.label}
          </button>
        ))}
      </nav>

      {selectedCategory === 'all' && (
        <WeeklyTopCarousel
          items={weeklyTopItems}
          commentTarget={commentTarget}
          pendingReactionIds={pendingReactionIds}
          accessToken={accessToken}
          onRefreshAuth={onRefreshAuth}
          currentUserId={currentUserId}
          onLike={(item) => void handleToggleReaction(item)}
          onComment={handleOpenComments}
          onCloseComments={() => setCommentTarget(null)}
          onCommentCountChange={handleCommentCountChange}
          onActiveRecordChange={setTopActiveRecordId}
        />
      )}

      {!isInitialLoading && !error && (
        <div className="flex items-center gap-3 px-6 mb-1">
          <div className="flex-1 h-px" style={{ background: palette.divider }} />
          <span className="text-[11px] font-semibold tracking-wide" style={{ color: palette.faintText }}>
            오늘의 기록
          </span>
          <div className="flex-1 h-px" style={{ background: palette.divider }} />
        </div>
      )}

      {isInitialLoading ? (
        <CommunitySkeleton />
      ) : error ? (
        <div className="px-4">
          <div className="p-5 rounded-3xl border text-center" style={{ background: palette.cardBg, borderColor: palette.border }}>
            <p className="text-[13px] font-semibold mb-2" style={{ color: palette.strongText }}>피드를 불러오지 못했어요</p>
            <p className="text-[12px] mb-4" style={{ color: palette.mutedText }}>{error}</p>
            <button
              onClick={() => void loadFeedPage(null, false)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold text-white"
              style={{ background: theme === 'dark' ? '#475569' : '#475569' }}
            >
              <RefreshCcw size={14} strokeWidth={2} />
              다시 불러오기
            </button>
          </div>
        </div>
      ) : (
        <div className={`relative px-4 space-y-3 ${isGuest ? 'pb-10' : 'pb-8'}`}>
          {visiblePosts.map((item) => (
            <div key={item.recordId}>
              <FeedCard
                item={item}
                onLike={() => void handleToggleReaction(item)}
                onComment={() => handleOpenComments(item)}
                likeDisabled={!!pendingReactionIds[item.recordId]}
                commentOpen={commentTarget?.recordId === item.recordId}
              />
              <CommunityCommentsSheet
                open={
                  commentTarget?.recordId === item.recordId &&
                  topVisibleCommentRecordId !== item.recordId
                }
                accessToken={accessToken}
                onRefreshAuth={onRefreshAuth}
                currentUserId={currentUserId}
                recordId={item.recordId}
                onCommentCountChange={handleCommentCountChange}
              />
            </div>
          ))}

          {isGuest && hiddenBlurPosts.length > 0 ? (
            <div className="relative min-h-[280px]">
              <div aria-hidden className="space-y-3 opacity-40 blur-[3px] pointer-events-none select-none">
                {hiddenBlurPosts.map((item) => (
                  <FeedCard key={`blur-${item.recordId}`} item={item} onLike={() => {}} onComment={() => {}} />
                ))}
              </div>

              <div className="absolute inset-x-0 top-8 bottom-0 flex items-start px-2 pointer-events-none">
                <div className="relative mx-auto w-full max-w-[360px] pointer-events-auto">
                  <GuestLockCard onLoginClick={onLoginClick} />
                </div>
              </div>
            </div>
          ) : (
            hiddenBlurPosts.map((item) => (
              <div key={`blur-${item.recordId}`} aria-hidden className="opacity-55 blur-[2.5px] pointer-events-none select-none">
                <FeedCard item={item} onLike={() => {}} onComment={() => {}} />
              </div>
            ))
          )}

          {!isGuest && hasNext && (
            <div ref={loadMoreRef} className="h-12 flex items-center justify-center text-[12px] text-mist-400">
              {isLoadingMore ? '더 불러오는 중...' : '더 많은 기록을 확인하는 중...'}
            </div>
          )}

          {!isGuest && !hasNext && feedItems.length > 0 && (
            <div className="text-center pt-3 text-[11px] text-mist-300 opacity-70 tracking-wide">
              오늘 확인할 공개 기록을 모두 읽었습니다.
            </div>
          )}

          {isGuest && hiddenBlurPosts.length === 0 && (
            <div className="pt-2">
              <GuestLockCard onLoginClick={onLoginClick} />
            </div>
          )}
        </div>
      )}

      {!isGuest && !isInitialLoading && !error && (
        <div className="text-center mt-8 px-8 mb-2">
          <p className="text-[11px] text-mist-300 leading-loose opacity-70 tracking-wide">
            이곳은 소란한 피드가 아닙니다.
            <br />
            조용히 공감하고, 나의 길로 돌아가는 곳입니다.
          </p>
        </div>
      )}

      <AppModal
        open={noticeMessage !== null}
        icon={<AlertCircle size={22} />}
        title="커뮤니티 작업을 완료하지 못했어요"
        description={noticeMessage ?? ''}
        confirmLabel="확인"
        hideCancel
        confirmVariant="danger"
        onClose={() => setNoticeMessage(null)}
        onConfirm={() => setNoticeMessage(null)}
      />
    </div>
  );
};
