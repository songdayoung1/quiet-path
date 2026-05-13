import React, { useMemo, useState } from 'react';
import { Heart, Lock, MessageCircle, Sparkles } from 'lucide-react';
import { Record as RecordType } from '../types';

interface CommunityViewProps {
  records?: RecordType[];
  isGuest?: boolean;
  onLoginClick?: () => void;
}

type Category = 'all' | 'job' | 'study' | 'workout' | 'hobby';

interface FeedPost {
  id: number | string;
  category: Exclude<Category, 'all'>;
  user: string;
  q: string;
  body: string;
  tag: string;
  ago: string;
  likes: number;
  comments: number;
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'job', label: '취업' },
  { id: 'study', label: '공부' },
  { id: 'workout', label: '운동' },
  { id: 'hobby', label: '취미' },
];

const MOCK_POSTS: FeedPost[] = [
  {
    id: 1,
    category: 'hobby',
    user: '고요한물결0421',
    q: '나는 더 단순해지고 있는가?',
    body: '오늘은 서두르지 않고 창밖을 5분간 바라보았다. 할 일이 많았지만, 잠시 멈춤을 허락했다.',
    tag: '취미',
    ago: '12분 전',
    likes: 31,
    comments: 4,
  },
  {
    id: 2,
    category: 'study',
    user: '새벽의발걸음0113',
    q: '나만의 속도를 찾고 있는가?',
    body: '나를 증명하려는 마음을 잠시 내려놓기. 다른 사람의 속도에 맞추지 않고 내 호흡으로 걸었다.',
    tag: '공부',
    ago: '1시간 전',
    likes: 47,
    comments: 6,
  },
  {
    id: 3,
    category: 'job',
    user: '묵묵히나아가는0777',
    q: '충분히 쉬고 있는가?',
    body: '자격증 시험 점수가 기대보다 낮았다. 하지만 포기하지 않고 오답 노트를 다시 펼쳤다.',
    tag: '취업',
    ago: '3시간 전',
    likes: 58,
    comments: 9,
  },
  {
    id: 4,
    category: 'workout',
    user: '조용한루틴0234',
    q: '몸의 소리를 듣고 있는가?',
    body: '무리하게 무게를 올리기보다, 정확한 자세에 집중했다.',
    tag: '운동',
    ago: '어제',
    likes: 19,
    comments: 2,
  },
];

const WEEKLY_TOP = [
  { rank: 1, q: '나는 더 단순해지고 있는가?', likes: 128 },
  { rank: 2, q: '나만의 속도를 찾고 있는가?', likes: 94 },
  { rank: 3, q: '충분히 쉬고 있는가?', likes: 72 },
];

const WeeklyTopCard: React.FC = () => {
  return (
    <section className="mx-4 mb-4 p-4 rounded-3xl bg-white/60 border border-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-md bg-point-100 text-point-600 grid place-items-center">
          <Sparkles size={12} strokeWidth={1.8} />
        </span>
        <h2 className="text-[12px] font-bold text-mist-600 tracking-tight">이번 주 가장 공감받은 질문</h2>
      </div>
      <ol className="space-y-2.5">
        {WEEKLY_TOP.map((item) => (
          <li key={item.rank} className="flex items-center gap-3">
            <span className="w-5 text-[12px] font-bold text-point-500 tabular-nums">{item.rank}</span>
            <p className="flex-1 text-[13px] text-mist-600 leading-snug truncate">{item.q}</p>
            <span className="flex items-center gap-1 text-[11px] text-mist-400 font-medium">
              <Heart size={12} strokeWidth={1.8} />
              {item.likes}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

interface FeedCardProps {
  post: FeedPost;
  liked: boolean;
  guest?: boolean;
  onLike: () => void;
  onComment: () => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ post, liked, guest = false, onLike, onComment }) => {
  return (
    <article className="p-4 rounded-3xl bg-white/75 border border-white shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <header className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-point-200 to-point-400 grid place-items-center text-white text-[11px] font-bold">
          {post.user.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-mist-600 truncate">@{post.user}</p>
          <p className="text-[10px] text-mist-400">
            {post.ago} · #{post.tag}
          </p>
        </div>
      </header>

      <div className="inline-block px-2.5 py-1 rounded-md bg-mist-100/70 text-mist-500 text-[10px] font-bold tracking-tight mb-2.5">
        Q. {post.q}
      </div>

      <p className="text-[13.5px] text-mist-600 leading-[1.75] mb-3">{post.body}</p>

      <footer className="flex items-center justify-between pt-2.5 border-t border-mist-100">
        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-point-50 text-point-600 border border-point-100">
          #{post.tag}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={onComment}
            className="flex items-center gap-1 text-[12px] text-mist-400 hover:text-mist-600 transition"
          >
            <MessageCircle size={14} strokeWidth={1.8} />
            {post.comments}
          </button>
          <button
            onClick={onLike}
            className={`flex items-center gap-1 text-[12px] transition ${liked ? 'text-rose-500' : 'text-mist-400 hover:text-mist-600'}`}
          >
            <Heart size={14} strokeWidth={1.8} className={liked ? 'fill-rose-500' : ''} />
            {post.likes + (liked ? 1 : 0)}
          </button>
        </div>
      </footer>
    </article>
  );
};

export const CommunityView: React.FC<CommunityViewProps> = ({
  records = [],
  isGuest = false,
  onLoginClick,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [likedIds, setLikedIds] = useState<Set<number | string>>(new Set());

  const userSharedPosts: FeedPost[] = useMemo(
    () =>
      records
        .filter((r) => r.isShared)
        .map((r) => ({
          id: r.id,
          category: 'study',
          user: '나의기록',
          q: r.directionQuestion,
          body: r.action,
          tag: '나의기록',
          ago: '방금',
          likes: 0,
          comments: 0,
        })),
    [records],
  );

  const allPosts = [...userSharedPosts, ...MOCK_POSTS];
  const filteredPosts =
    selectedCategory === 'all'
      ? allPosts
      : allPosts.filter((post) => post.category === selectedCategory);

  const visiblePosts = isGuest ? filteredPosts.slice(0, 1) : filteredPosts;
  const hiddenBlurPosts = isGuest ? filteredPosts.slice(1, 3) : [];

  const handleLike = (id: number | string) => {
    if (isGuest) {
      onLoginClick?.();
      return;
    }
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="pb-28 animate-slide-up pt-2">
      <div className="text-center px-6 mb-5">
        <h1 className="text-[22px] font-semibold text-mist-600 tracking-tight mb-1">조용한 피드</h1>
        <p className="text-[12px] text-mist-400">다른 이들의 궤적을 조용히 둘러봅니다.</p>
      </div>

      <nav
        aria-label="커뮤니티 카테고리"
        className="px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar"
      >
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition ${
              selectedCategory === category.id
                ? 'bg-mist-600 text-white'
                : 'bg-white/60 text-mist-500 border border-white hover:bg-white'
            }`}
          >
            {category.label}
          </button>
        ))}
      </nav>

      {selectedCategory === 'all' && <WeeklyTopCard />}

      <div className={`relative px-4 space-y-3 ${isGuest ? 'pb-[240px]' : 'pb-8'}`}>
        {visiblePosts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            liked={likedIds.has(post.id)}
            guest={isGuest}
            onLike={() => handleLike(post.id)}
            onComment={() => {
              if (isGuest) onLoginClick?.();
            }}
          />
        ))}

        {hiddenBlurPosts.map((post) => (
          <div key={post.id} aria-hidden className="opacity-55 blur-[2.5px] pointer-events-none select-none">
            <FeedCard post={post} liked={false} onLike={() => {}} onComment={() => {}} />
          </div>
        ))}

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

      {!isGuest && (
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
