import React, { useState, useMemo } from 'react';
import { Card, PageHeader } from '../components/UI';
import { Heart, ChevronDown, Trophy, Clock } from 'lucide-react';
import { LogEntry } from '../types';

interface CommunityViewProps {
  logs?: LogEntry[];
}

export const CommunityView: React.FC<CommunityViewProps> = ({ logs = [] }) => {
  // Define the 5 specific categories from the prompt
  type Category = 'all' | 'job' | 'study' | 'workout' | 'hobby' | 'cert';

  const categories: { id: Category; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'job', label: '취업' },
    { id: 'study', label: '공부' },
    { id: 'workout', label: '운동' },
    { id: 'hobby', label: '취미' },
    { id: 'cert', label: '자격증' },
  ];

  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  // Updated Mock Data with assigned categories
  const posts = [
    { 
      id: 1, 
      category: 'study' as Category,
      question: "나는 더 단순해지고 있는가?", 
      action: "오늘은 서두르지 않고 창밖을 5분간 바라보았다. 할 일이 많았지만, 잠시 멈춤을 선택했다.", 
      mood: "평온", 
      empathy: 42, 
      level: "Observer" 
    },
    { 
      id: 2, 
      category: 'job' as Category,
      question: "나만의 속도를 찾고 있는가?", 
      action: "나를 증명하려는 마음을 잠시 내려놓기. 다른 사람의 속도에 맞추지 않고 내 호흡으로 걸었다.", 
      mood: "다짐", 
      empathy: 18, 
      level: "Recorder" 
    },
    { 
      id: 3, 
      category: 'cert' as Category,
      question: "실패가 아니라 과정인가?", 
      action: "자격증 시험 점수가 기대보다 낮았다. 하지만 포기하지 않고 오답 노트를 다시 펼쳤다.", 
      mood: "위로", 
      empathy: 24, 
      level: "Maintainer" 
    },
    { 
      id: 4, 
      category: 'workout' as Category,
      question: "몸의 소리를 듣고 있는가?", 
      action: "무리하게 무게를 올리기보다, 정확한 자세에 집중했다. 통증 없는 움직임이 목표다.", 
      mood: "인정", 
      empathy: 15, 
      level: "Recorder" 
    },
    { 
      id: 5, 
      category: 'hobby' as Category,
      question: "결과보다 즐거움에 집중했나?", 
      action: "그림이 삐뚤어졌지만 지우지 않았다. 서툰 선도 나의 일부니까.", 
      mood: "감사", 
      empathy: 31, 
      level: "Reflector" 
    },
    {
      id: 6,
      category: 'job' as Category,
      question: "거절이 나를 정의하는가?",
      action: "불합격 메일을 받고 잠시 우울했지만, 내 가치가 떨어진 건 아니라고 되뇌었다.",
      mood: "용기",
      empathy: 56,
      level: "Observer"
    },
    {
      id: 7,
      category: 'cert' as Category,
      question: "오늘 한 걸음 나아갔는가?",
      action: "퇴근 후 피곤했지만 딱 30분만 강의를 들었다. 멈추지 않은 나를 칭찬한다.",
      mood: "성취",
      empathy: 9,
      level: "Recorder"
    }
  ];

  const toggleExpand = (id: number | string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  // Convert user shared logs to community posts format
  const sharedUserPosts = useMemo(() => {
    return logs.filter(log => log.isShared).map(log => ({
        id: log.id, // Use string ID
        category: 'study' as Category, // Default category for now
        question: log.directionQuestion,
        action: log.action, // Full content is visible (Option 2)
        mood: log.mood || '기록',
        empathy: 0,
        level: 'Me', // Indicator that it's my post
        isUserPost: true
    }));
  }, [logs]);

  // Combine mock posts and user posts
  const allPosts = [...sharedUserPosts, ...posts];

  // Filter Logic
  const filteredPosts = selectedCategory === 'all' 
    ? allPosts 
    : allPosts.filter(p => p.category === selectedCategory);

  // Separate Top 3 and Latest from filtered results
  const topPosts = [...filteredPosts].sort((a, b) => b.empathy - a.empathy).slice(0, 3);
  
  // For latest, put user posts first (string IDs), then sort mock posts (number IDs) descending
  const latestPosts = [...filteredPosts].sort((a, b) => {
      const aId = a.id;
      const bId = b.id;
      if (typeof aId === 'string' && typeof bId === 'number') return -1;
      if (typeof aId === 'number' && typeof bId === 'string') return 1;
      if (typeof aId === 'number' && typeof bId === 'number') return bId - aId;
      return 0; 
  });

  // Rhythm Logic (Visual variation)
  const getRhythmStyle = (index: number) => {
     const marginLeft = index % 2 === 0 ? 'ml-1' : 'ml-4'; 
     const width = index % 3 === 0 ? 'w-[98%]' : 'w-[95%]';
     return `${marginLeft} ${width}`;
  };

  const PostItem = ({ post, isTop = false, index }: { post: any, isTop?: boolean, index: number }) => {
     const isExpanded = expandedId === post.id;
     return (
        <Card 
            onClick={() => toggleExpand(post.id)}
            breathe={isTop}
            className={`
                !p-6 transition-all duration-500 cursor-pointer border 
                ${isTop ? 'bg-white border-point-100 shadow-point-100/30' : 'bg-white/70 hover:bg-white border-white/40'} 
                ${isExpanded ? 'shadow-md scale-[1.01]' : ''}
            `}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-[10px] font-bold tracking-wide uppercase ${isTop ? 'text-point-500' : 'text-mist-400'}`}>
                {post.level}
            </span>
            <span className={`text-[10px] text-mist-300 transition-transform ${index % 2 === 0 ? 'translate-x-0' : '-translate-x-2'}`}>
                {new Date().toLocaleDateString()}
            </span>
          </div>

          <h3 className={`text-mist-600 text-sm font-medium mb-3 leading-relaxed tracking-wide ${isTop ? 'text-base' : ''}`}>
            "{post.question}"
          </h3>

          {isExpanded ? (
              <div className="animate-fade-in mt-4 pt-4 border-t border-mist-100">
                   <p className="text-mist-500 text-sm leading-loose font-light mb-6 whitespace-pre-line opacity-90">
                    {post.action}
                   </p>
                   <div className="flex justify-between items-center">
                        <span className="text-[10px] text-mist-400 bg-mist-50 px-3 py-1.5 rounded-full border border-mist-100">
                            {post.mood}
                        </span>
                        <button className="group flex items-center gap-1.5 text-mist-300 hover:text-point-400 transition-colors px-2 py-1 hover:bg-point-50 rounded-full">
                            <Heart size={14} className="group-hover:fill-point-100 transition-all" />
                            <span className="text-[10px]">{post.empathy} 공감</span>
                        </button>
                   </div>
                   {post.isUserPost && (
                        <div className="mt-2 pt-2 border-t border-mist-50">
                            <p className="text-[9px] text-point-400">✨ 내가 공유한 글</p>
                        </div>
                   )}
              </div>
          ) : (
              <div className="flex justify-center mt-2 opacity-50">
                  <ChevronDown size={14} className="text-mist-200" />
              </div>
          )}
        </Card>
     )
  }

  return (
    <div className="pb-28 animate-slide-up pt-2">
      <PageHeader 
        title="Flow" 
        subtitle="다른 이들의 조용한 흐름을 바라봅니다."
      />

      {/* Category Filter */}
      <div className="px-4 mb-8 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 min-w-max px-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  text-sm transition-all duration-300 px-1 py-1 relative
                  ${isSelected ? 'text-point-600 font-bold' : 'text-mist-400 hover:text-mist-600 font-medium'}
                `}
              >
                {cat.label}
                {isSelected && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-point-300 rounded-full animate-fade-in"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: Weekly Top 3 */}
      {topPosts.length > 0 && (
        <div className="mb-8 animate-fade-in">
           <div className="flex items-center gap-2 mb-4 px-3">
              <Trophy size={14} className="text-point-400" />
              <h3 className="text-xs font-bold text-point-500 uppercase tracking-widest">Weekly Top Flows</h3>
           </div>
           <div className="flex flex-col gap-5">
              {topPosts.map((post, i) => (
                  <div key={`top-${post.id}`} className={`animate-slide-up ${getRhythmStyle(i)}`} style={{ animationDelay: `${i * 0.1}s` }}>
                      <PostItem post={post} isTop={true} index={i} />
                  </div>
              ))}
           </div>
           
           <div className="px-4 mt-8 mb-8">
             <div className="h-[1px] bg-gradient-to-r from-transparent via-mist-200/50 to-transparent"></div>
           </div>
        </div>
      )}

      {/* Section 2: Latest */}
      <div className="animate-fade-in">
         <div className="flex items-center gap-2 mb-4 px-3">
             <Clock size={14} className="text-mist-400" />
             <h3 className="text-xs font-bold text-mist-400 uppercase tracking-widest">Latest Flows</h3>
         </div>
         <div className="flex flex-col gap-4">
            {latestPosts.length > 0 ? (
                latestPosts.map((post, i) => (
                    <div key={`latest-${post.id}`} className={`animate-slide-up ${getRhythmStyle(i+1)}`} style={{ animationDelay: `${(i+3) * 0.1}s` }}>
                        <PostItem post={post} index={i} />
                    </div>
                ))
            ) : (
                <div className="text-center py-12 opacity-50">
                    <p className="text-mist-300 text-sm">이 방향의 흐름은 아직 조용합니다.</p>
                </div>
            )}
         </div>
      </div>
        
      <div className="text-center mt-12 px-8 mb-4">
         <p className="text-xs text-mist-300 leading-loose opacity-70">
           이곳은 성과를 자랑하는 곳이 아닙니다.<br/>
           그저 각자의 방향을 조용히 비춰줍니다.
         </p>
      </div>
    </div>
  );
};
