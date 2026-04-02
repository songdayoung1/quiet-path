import React, { useState, useMemo } from 'react';
import { PageHeader, MoodSticker } from '../components/UI';
import { Heart, MessageCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Record as RecordType } from '../types';

const EXPAND_THRESHOLD = 60; // chars before collapsing text

interface CommunityViewProps {
  records?: RecordType[];
}

type Category = 'all' | 'job' | 'study' | 'workout' | 'hobby' | 'cert';

interface Post {
  id: number | string;
  category: Category;
  username: string;
  question: string;
  action: string;
  imageUrl?: string;
  mood: string;
  moodCode?: string;
  level: string;
  likes: number;
  comments: number;
  timeAgo: string;
  isUserPost?: boolean;
}

const MOCK_COMMENTS = [
  { id: 1, user: '지나가던_구름', text: '정말 공감되네요. 저도 오늘은 조금 천천히 걸어보려 합니다.', time: '1시간 전' },
  { id: 2, user: '작은_위로', text: '그럴 때가 있죠. 자신만의 속도를 찾는 게 가장 중요한 것 같아요.', time: '30분 전' }
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'job', label: '취업' },
  { id: 'study', label: '공부' },
  { id: 'workout', label: '운동' },
  { id: 'hobby', label: '취미' },
  { id: 'cert', label: '자격증' },
];

const MOCK_POSTS: Post[] = [
  {
    id: 1,
    category: 'study',
    username: '고요한_여정',
    question: '나는 더 단순해지고 있는가?',
    action: '오늘은 서두르지 않고 창밖을 5분간 바라보았다. 할 일이 많았지만, 잠시 멈춤을 선택했다.',
    mood: '잔잔',
    moodCode: '잔잔',
    level: '누군가의 기록',
    likes: 31,
    comments: 4,
    timeAgo: '2시간 전',
  },
  {
    id: 2,
    category: 'job',
    username: '새벽_발걸음',
    question: '나만의 속도를 찾고 있는가?',
    action: '나를 증명하려는 마음을 잠시 내려놓기. 다른 사람의 속도에 맞추지 않고 내 호흡으로 걸었다.',
    mood: '포근',
    moodCode: '포근',
    level: '누군가의 기록',
    likes: 47,
    comments: 6,
    timeAgo: '5시간 전',
  },
  {
    id: 3,
    category: 'cert',
    username: '묵묵히_나아가는',
    question: '실패가 아니라 과정인가?',
    action: '자격증 시험 점수가 기대보다 낮았다. 하지만 포기하지 않고 오답 노트를 다시 펼쳤다.',
    mood: '버팀',
    moodCode: '버팀',
    level: '누군가의 기록',
    likes: 58,
    comments: 9,
    timeAgo: '8시간 전',
  },
  {
    id: 4,
    category: 'workout',
    username: '조용한_루틴',
    question: '몸의 소리를 듣고 있는가?',
    action: '무리하게 무게를 올리기보다, 정확한 자세에 집중했다. 통증 없는 움직임이 목표다.',
    mood: '멍함',
    moodCode: '멍함',
    level: '누군가의 기록',
    likes: 19,
    comments: 2,
    timeAgo: '어제',
  },
  {
    id: 5,
    category: 'hobby',
    username: '서툰_선긋기',
    question: '결과보다 즐거움에 집중했나?',
    action: '그림이 삐뚤어졌지만 지우지 않았다. 서툰 선도 나의 일부니까.',
    mood: '반짝',
    moodCode: '반짝',
    level: '누군가의 기록',
    likes: 43,
    comments: 7,
    timeAgo: '어제',
  },
  {
    id: 6,
    category: 'study',
    username: '작은_불꽃',
    question: '오늘 배운 것이 내일의 나를 만드는가?',
    action: '교재 한 챕터를 완독했다. 이해가 안 되는 부분은 표시만 하고 넘어갔다. 완벽보다 흐름이 먼저다.',
    mood: '반짝',
    moodCode: '반짝',
    level: '누군가의 기록',
    likes: 25,
    comments: 3,
    timeAgo: '2일 전',
  },
  {
    id: 7,
    category: 'workout',
    username: '땀흘리는_여유',
    question: '나의 한계를 마주하고 있는가?',
    action: '오늘 하루 종일 바쁘게 움직였지만, 저녁에는 온전히 나만의 시간을 가지며 러닝머신 위를 달렸다. 숨이 차오를 때마다 복잡했던 머릿속이 맑아지는 기분이었다. 역시 땀 흘리는 시간은 배신하지 않는다. 내일도 이 감각을 잊지 않기를.',
    mood: '포근',
    moodCode: '포근',
    level: '누군가의 기록',
    likes: 82,
    comments: 12,
    timeAgo: '방금',
  }
];


export const CommunityView: React.FC<CommunityViewProps> = ({ records = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [likedIds, setLikedIds] = useState<Set<number | string>>(new Set());

  const toggleLike = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* Convert user's shared records into Post objects */
  const sharedUserPosts: Post[] = useMemo(
    () =>
      records
        .filter((r) => r.isShared)
        .map((r) => ({
          id: r.id,
          category: 'study' as Category,
          username: '나의 기록',
          question: r.directionQuestion,
          action: r.action,
          imageUrl: r.imageUrl,
          mood: r.moodCode || '잔잔',
          moodCode: r.moodCode || '잔잔',
          level: '나의 기록',
          likes: 0,
          comments: 0,
          timeAgo: '방금',
          isUserPost: true,
        })),
    [records],
  );

  const allPosts: Post[] = [...sharedUserPosts, ...MOCK_POSTS];

  /* Weekly Top 3 — sorted by likes across all posts */
  const weeklyTop3 = useMemo(
    () => [...MOCK_POSTS].sort((a, b) => b.likes - a.likes).slice(0, 3),
    [],
  );

  /* Feed filtered by category */
  const filteredPosts = selectedCategory === 'all'
    ? allPosts
    : allPosts.filter((p) => p.category === selectedCategory);

  const feedPosts = [...filteredPosts].sort((a, b) => {
    if (typeof a.id === 'string' && typeof b.id === 'number') return -1;
    if (typeof a.id === 'number' && typeof b.id === 'string') return 1;
    if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
    return 0;
  });

  return (
    <div className="pb-28 animate-slide-up pt-2">
      <PageHeader
        title="조용한 피드"
        subtitle="다른 이들의 궤적을 조용히 둘러봅니다."
      />

      {/* ── Category Filter ── */}
      <div className="px-4 mb-8 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 min-w-max px-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-sm transition-all duration-300 px-4 py-2 rounded-full font-medium border ${
                selectedCategory === cat.id
                  ? 'bg-mist-600 text-white border-mist-600 shadow-md'
                  : 'bg-white/60 text-mist-500 border-white hover:bg-white shadow-sm'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Weekly Top 3 (이번 주 가장 공감받은 기록) ── */}
      {selectedCategory === 'all' && (
        <div className="mb-10 relative">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white p-1.5 rounded-xl shadow-sm border border-mist-100">
                <Heart size={14} className="text-rose-400 fill-rose-300" />
              </div>
              <h3 className="text-[13px] font-bold text-mist-600 tracking-wide">이번 주 가장 공감받은 기록</h3>
            </div>
          </div>
          
          {/* 부각되는 디자인: 랭킹 배지와 특별한 테두리, 그리고 일반 피드와 동일한 세로 정렬(Vertical Flow) */}
          <div className="flex flex-col gap-5 px-4 mt-3">
            {weeklyTop3.map((post, index) => (
                <PostItem
                  key={`top-${post.id}`}
                  post={post}
                  liked={likedIds.has(post.id)}
                  onToggleLike={(e) => toggleLike(post.id, e)}
                  isHighlighted={true}
                />
            ))}
          </div>
        </div>
      )}

      {/* ── Feed ── */}
      <div className="animate-fade-in px-4">
        <div className="flex items-center gap-2 mb-4 px-1 opacity-60">
          <Clock size={16} className="text-mist-400" />
          <h3 className="text-xs font-bold text-mist-500 uppercase tracking-widest">Recent Flows</h3>
        </div>

        <div className="flex flex-col gap-5">
          {feedPosts.length > 0 ? (
            feedPosts.map((post) => (
              <PostItem
                key={`post-${post.id}`}
                post={post}
                liked={likedIds.has(post.id)}
                onToggleLike={(e) => toggleLike(post.id, e)}
              />
            ))
          ) : (
            <div className="text-center py-12 opacity-50 bg-white/40 rounded-3xl border border-white">
              <p className="text-mist-400 text-sm font-medium">아직 관련 궤적이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-12 px-8 mb-4">
        <p className="text-[11px] text-mist-300 leading-loose opacity-70 tracking-wide">
          이곳은 소란한 피드가 아닙니다.<br />
          조용히 공감하고, 나의 길로 돌아가는 곳입니다.
        </p>
      </div>
    </div>
  );
};

/* ─── Post Card Component ─── */
interface PostItemProps {
  post: Post;
  liked: boolean;
  onToggleLike: (e: React.MouseEvent) => void;
  isHighlighted?: boolean; // Flag to show a warm highlight styling instead of a rank
}

const PostItem: React.FC<PostItemProps> = ({ post, liked, onToggleLike, isHighlighted }) => {
  const displayLikes = post.likes + (liked ? 1 : 0);
  const needsExpand = post.action.length > EXPAND_THRESHOLD || !!post.imageUrl;
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  return (
    <div className={`bg-white/70 rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:bg-white relative ${isHighlighted ? 'border-rose-200/60 shadow-rose-100/50 shadow-lg ring-1 ring-rose-200/50' : 'border-white/70'}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mist-100 to-mist-200 flex items-center justify-center shadow-sm border border-white">
            <span className="text-[13px] font-bold text-mist-500">{post.username.charAt(0)}</span>
          </div>
          <div>
            <p className="text-[12px] font-bold text-mist-600">@{post.username}</p>
            <p className="text-[10px] text-mist-300">{post.timeAgo}</p>
          </div>
        </div>
        {post.isUserPost && (
          <span className="text-[10px] font-bold text-point-400 uppercase tracking-widest bg-point-50 px-2 py-1 rounded-full">
            내 기록
          </span>
        )}
      </div>

      {/* Question tag */}
      <div className="px-5 mb-3">
        <span className="inline-block text-mist-500 text-[11px] font-bold bg-mist-50 px-3 py-1.5 rounded-lg tracking-wide">
          Q. {post.question}
        </span>
      </div>

      {/* Content: text */}
      <div className="px-5 pb-2">
        <p className={`text-mist-600 text-[15px] leading-loose transition-all duration-300 ${!expanded && needsExpand ? 'line-clamp-3' : ''}`}>
          {post.action}
        </p>
      </div>

      {/* Content: image (only when expanded) */}
      {post.imageUrl && expanded && (
        <div className="px-5 pb-3">
          <div className="w-full rounded-2xl overflow-hidden border border-mist-100">
            <img src={post.imageUrl} alt="장면" className="w-full object-cover max-h-64" />
          </div>
        </div>
      )}

      {/* Expand/collapse toggle */}
      {needsExpand && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mx-5 mb-3 flex items-center gap-1 text-[11px] font-bold text-point-500 hover:text-point-600 transition-colors"
        >
          {expanded ? (
            <><ChevronUp size={13} /> 접기</>
          ) : (
            <><ChevronDown size={13} /> {post.imageUrl ? '사진 포함 더 보기' : '더 보기'}</>
          )}
        </button>
      )}

      {/* Footer */}
      <div className="px-5 pb-4 flex items-center justify-between border-t border-mist-50/80 pt-3">
        <MoodSticker code={post.moodCode || post.mood} className="scale-90 origin-left" />
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 transition-all duration-200 ${showComments ? 'text-point-500' : 'text-mist-400 hover:text-mist-500'}`}
          >
            <MessageCircle size={15} className={showComments ? 'fill-point-500' : ''} />
            <span className="text-[12px] font-semibold">{post.comments}</span>
          </button>
          <button
            onClick={onToggleLike}
            className={`flex items-center gap-1.5 transition-all duration-200 active:scale-90 ${
              liked ? 'text-rose-500' : 'text-mist-400 hover:text-rose-400'
            }`}
          >
            <Heart size={15} className={liked ? 'fill-rose-500' : ''} />
            <span className="text-[12px] font-semibold">{displayLikes}</span>
          </button>
        </div>
      </div>

      {/* Embedded Comments Section */}
      {showComments && (
        <div className="bg-mist-50/50 pt-3 pb-4 px-5 border-t border-mist-100/50 animate-fade-in">
          <div className="flex flex-col gap-3 mb-4">
            {MOCK_COMMENTS.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-6 h-6 shrink-0 rounded-full bg-mist-200 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">{c.user.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-bold text-mist-600">@{c.user}</span>
                    <span className="text-[9px] text-mist-400">{c.time}</span>
                  </div>
                  <p className="text-[12px] text-mist-600 mt-0.5 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input 
              type="text" 
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="따뜻한 공감을 남겨주세요." 
              className="flex-1 bg-white border border-mist-100 rounded-xl px-3 py-2 text-xs text-mist-600 placeholder-mist-300 focus:outline-none focus:border-point-300 transition-colors"
            />
            <button 
              className="bg-mist-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-mist-700 transition-colors"
              onClick={() => { if(commentInput) { alert('댓글이 등록되었습니다.'); setCommentInput(''); } }}
            >
              등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
