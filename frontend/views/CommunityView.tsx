import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Lock, MessageCircle, RefreshCcw, Sparkles } from 'lucide-react';
import { feedApi, FeedCategory, FeedItemResponse, WeeklyTop3ItemResponse } from '../api/feedApi';
import { getThemePalette, useResolvedTheme } from '../theme';

interface CommunityViewProps {
  accessToken?: string | null;
  isGuest?: boolean;
  onLoginClick?: () => void;
}

const CATEGORIES: { id: FeedCategory; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'job', label: '취업' },
  { id: 'study', label: '공부' },
  { id: 'workout', label: '운동' },
  { id: 'hobby', label: '취미' },
];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  job: '취업',
  study: '공부',
  workout: '운동',
  hobby: '취미',
  cert: '자격증',
  DEFAULT: '기록',
};

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

const WeeklyTopCard: React.FC<{ items: WeeklyTop3ItemResponse[] }> = ({ items }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mx-4 mb-4 p-4 rounded-3xl border" style={{ background: palette.cardBg, borderColor: palette.border, boxShadow: palette.shadow }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-md text-point-600 grid place-items-center" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.24)' : 'rgba(243,232,255,0.9)' }}>
          <Sparkles size={12} strokeWidth={1.8} />
        </span>
        <h2 className="text-[12px] font-bold tracking-tight" style={{ color: palette.strongText }}>이번 주 가장 공감받은 질문</h2>
      </div>
      <ol className="space-y-2.5">
        {items.map((item) => (
          <li key={`${item.rank}-${item.pathId}`} className="flex items-center gap-3">
            <span className="w-5 text-[12px] font-bold text-point-500 tabular-nums">{item.rank}</span>
            <p className="flex-1 text-[13px] leading-snug truncate" style={{ color: palette.strongText }}>{item.title}</p>
            <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: palette.faintText }}>
              <Heart size={12} strokeWidth={1.8} />
              {item.reactionCount}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

interface FeedCardProps {
  item: FeedItemResponse;
  onLike: () => void;
  onComment: () => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, onLike, onComment }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const nickname = item.owner?.nickname ?? '익명의 기록자';
  const categoryLabel = CATEGORY_LABEL_MAP[item.categoryCode ?? ''] ?? '기록';
  const badge = nickname.slice(0, 1);
  const sharedText = formatRelativeTime(item.sharedAt ?? item.createdAt);

  return (
    <article className="p-4 rounded-3xl border" style={{ background: palette.cardBg, borderColor: palette.border, boxShadow: palette.shadow }}>
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
        <div className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight mb-2.5 border" style={{ background: palette.pillBg, borderColor: palette.pillBorder, color: palette.mutedText }}>
          Q. {item.title}
        </div>
      )}

      <p className="text-[13.5px] leading-[1.75] mb-3" style={{ color: palette.strongText }}>{item.content ?? ''}</p>

      <footer className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: palette.divider }}>
        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold text-point-600 border" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.20)' : 'rgba(245,243,255,0.92)', borderColor: theme === 'dark' ? 'rgba(167,139,250,0.24)' : 'rgba(221,214,254,0.9)' }}>
          #{categoryLabel}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={onComment}
            className="flex items-center gap-1 text-[12px] transition"
            style={{ color: palette.faintText }}
          >
            <MessageCircle size={14} strokeWidth={1.8} />
            {item.commentCount}
          </button>
          <button
            onClick={onLike}
            className="flex items-center gap-1 text-[12px] transition"
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

export const CommunityView: React.FC<CommunityViewProps> = ({
  accessToken,
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadFeedPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) {
        if (isLoadingMore || !hasNext || !cursor) {
          return;
        }
        setIsLoadingMore(true);
      } else {
        setIsInitialLoading(true);
        setError(null);
      }

      try {
        const response = await feedApi.getFeed({
          token: isGuest ? null : accessToken,
          category: selectedCategory,
          cursor: isGuest ? null : cursor,
          size: 20,
        });

        setFeedItems((prev) => (append ? [...prev, ...response.items] : response.items));
        setHasNext(isGuest ? false : response.hasNext);
        setNextCursor(isGuest ? null : response.nextCursor);
      } catch (err) {
        if (!append) {
          setError(err instanceof Error ? err.message : '피드를 불러오지 못했습니다.');
        }
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [accessToken, hasNext, isGuest, isLoadingMore, selectedCategory]
  );

  useEffect(() => {
    void loadFeedPage(null, false);
  }, [loadFeedPage]);

  useEffect(() => {
    let cancelled = false;

    if (selectedCategory !== 'all') {
      setWeeklyTopItems([]);
      return undefined;
    }

    const loadWeeklyTop3 = async () => {
      try {
        const response = await feedApi.getWeeklyTop3(accessToken);
        if (!cancelled) {
          setWeeklyTopItems(response.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setWeeklyTopItems([]);
        }
      }
    };

    void loadWeeklyTop3();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedCategory]);

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
    () => (isGuest ? feedItems.slice(0, 1) : feedItems),
    [feedItems, isGuest]
  );
  const hiddenBlurPosts = useMemo(
    () => (isGuest ? feedItems.slice(1, 3) : []),
    [feedItems, isGuest]
  );

  const handleRestrictedAction = () => {
    if (isGuest) {
      onLoginClick?.();
    }
  };

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

      {selectedCategory === 'all' && <WeeklyTopCard items={weeklyTopItems} />}

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
        <div className={`relative px-4 space-y-3 ${isGuest ? 'pb-[240px]' : 'pb-8'}`}>
          {visiblePosts.map((item) => (
            <FeedCard
              key={item.recordId}
              item={item}
              onLike={handleRestrictedAction}
              onComment={handleRestrictedAction}
            />
          ))}

          {hiddenBlurPosts.map((item) => (
            <div key={`blur-${item.recordId}`} aria-hidden className="opacity-55 blur-[2.5px] pointer-events-none select-none">
              <FeedCard item={item} onLike={() => {}} onComment={() => {}} />
            </div>
          ))}

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

          {isGuest && (
            <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
              <div
                aria-hidden
                className="h-[240px]"
                style={{
                  background:
                    'linear-gradient(to top, #F8FAFC 30%, rgba(248,250,252,0.94) 55%, rgba(248,250,252,0.0) 100%)',
                }}
              />
              <div className="px-5 pb-8 -mt-[170px] pointer-events-auto">
                <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white text-center shadow-[0_8px_32px_rgba(31,38,135,0.08)]">
                  <div className="inline-flex p-2.5 rounded-xl bg-point-50 text-point-500 mb-3">
                    <Lock size={18} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[15px] font-bold text-mist-600 mb-1.5">더 많은 조용한 궤적들이 있어요</h3>
                  <p className="text-[12px] text-mist-400 leading-relaxed mb-4">
                    로그인하면 전체 피드를 읽고
                    <br />
                    공감과 댓글을 남길 수 있어요.
                  </p>
                  <button
                    onClick={() => onLoginClick?.()}
                    className="w-full min-h-[48px] rounded-xl text-[14px] font-bold text-white bg-mist-600 hover:bg-mist-700 active:scale-[0.985] transition shadow-[0_4px_12px_rgba(82,96,109,0.25)]"
                  >
                    로그인하고 계속 보기
                  </button>
                </div>
              </div>
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
    </div>
  );
};
