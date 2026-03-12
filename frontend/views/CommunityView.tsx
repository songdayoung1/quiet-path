import React, { useState, useMemo } from 'react';
import { Card, PageHeader, MoodSticker } from '../components/UI';
import { Clock } from 'lucide-react';
import { Record as RecordType } from '../types';

interface CommunityViewProps {
  records?: RecordType[];
}

export const CommunityView: React.FC<CommunityViewProps> = ({ records = [] }) => {
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

  // Updated Mock Data without SNS stats
  const posts = [
    { 
      id: 1, 
      category: 'study' as Category,
      question: "나는 더 단순해지고 있는가?", 
      action: "오늘은 서두르지 않고 창밖을 5분간 바라보았다. 할 일이 많았지만, 잠시 멈춤을 선택했다.", 
      mood: "잔잔", 
      level: "누군가의 기록" 
    },
    { 
      id: 2, 
      category: 'job' as Category,
      question: "나만의 속도를 찾고 있는가?", 
      action: "나를 증명하려는 마음을 잠시 내려놓기. 다른 사람의 속도에 맞추지 않고 내 호흡으로 걸었다.", 
      mood: "포근", 
      level: "누군가의 기록" 
    },
    { 
      id: 3, 
      category: 'cert' as Category,
      question: "실패가 아니라 과정인가?", 
      action: "자격증 시험 점수가 기대보다 낮았다. 하지만 포기하지 않고 오답 노트를 다시 펼쳤다.", 
      mood: "버팀", 
      level: "누군가의 기록" 
    },
    { 
      id: 4, 
      category: 'workout' as Category,
      question: "몸의 소리를 듣고 있는가?", 
      action: "무리하게 무게를 올리기보다, 정확한 자세에 집중했다. 통증 없는 움직임이 목표다.", 
      mood: "멍함", 
      level: "누군가의 기록" 
    },
    { 
      id: 5, 
      category: 'hobby' as Category,
      question: "결과보다 즐거움에 집중했나?", 
      action: "그림이 삐뚤어졌지만 지우지 않았다. 서툰 선도 나의 일부니까.", 
      mood: "반짝", 
      level: "누군가의 기록" 
    }
  ];

  // Convert user shared records
  const sharedUserPosts = useMemo(() => {
    return records.filter(record => record.isShared).map(record => ({
        id: record.id,
        category: 'study' as Category, // Default
        question: record.directionQuestion,
        action: record.action,
        moodCode: record.moodCode || '잔잔', // Fallback
        level: '나의 기록',
        isUserPost: true
    }));
  }, [records]);

  const allPosts = [...sharedUserPosts, ...posts];

  // Filter & Sort (Latest only)
  const filteredPosts = selectedCategory === 'all' 
    ? allPosts 
    : allPosts.filter(p => p.category === selectedCategory);

  const latestPosts = [...filteredPosts].sort((a, b) => {
      const aId = a.id;
      const bId = b.id;
      if (typeof aId === 'string' && typeof bId === 'number') return -1;
      if (typeof aId === 'number' && typeof bId === 'string') return 1;
      if (typeof aId === 'number' && typeof bId === 'number') return bId - aId;
      return 0; 
  });

  const getRhythmStyle = (index: number) => {
     const marginLeft = index % 2 === 0 ? 'ml-0' : 'ml-4'; 
     const width = index % 3 === 0 ? 'w-[98%]' : 'w-[95%]';
     return `${marginLeft} ${width}`;
  };

  const PostItem = ({ post }: { post: any }) => {
     return (
        <Card className="!p-6 transition-all duration-500 bg-white/70 hover:bg-white border-white/40 shadow-sm border">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-mist-400 tracking-wide">
                {post.level}
            </span>
            <span className="text-[10px] text-mist-300">
                {new Date().toLocaleDateString()}
            </span>
          </div>

          <h3 className="text-mist-500 text-xs font-bold mb-4 tracking-wide bg-mist-50 inline-block px-3 py-1.5 rounded-lg">
            Q. {post.question}
          </h3>

          <p className="text-mist-600 text-[15px] leading-loose font-normal mb-5 whitespace-pre-line">
            {post.action}
          </p>

          <div className="flex justify-start items-center">
             <MoodSticker code={post.moodCode || post.mood} className="scale-90 origin-left" />
          </div>

          {post.isUserPost && (
              <div className="mt-4 pt-3 border-t border-mist-50">
                  <p className="text-[10px] font-bold text-point-400 uppercase tracking-widest">Shared by You</p>
              </div>
          )}
        </Card>
     )
  }

  return (
    <div className="pb-28 animate-slide-up pt-2">
      <PageHeader 
        title="조용한 피드" 
        subtitle="다른 이들의 궤적을 조용히 둘러봅니다."
      />

      {/* Category Filter */}
      <div className="px-4 mb-8 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 min-w-max px-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  text-sm transition-all duration-300 px-4 py-2 rounded-full font-medium border
                  ${isSelected ? 'bg-mist-600 text-white border-mist-600 shadow-md' : 'bg-white/60 text-mist-500 border-white hover:bg-white shadow-sm'}
                `}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed List */}
      <div className="animate-fade-in px-4">
         <div className="flex items-center gap-2 mb-4 px-1 opacity-60">
             <Clock size={16} className="text-mist-400" />
             <h3 className="text-xs font-bold text-mist-500 uppercase tracking-widest">Recent Flows</h3>
         </div>
         <div className="flex flex-col gap-6">
            {latestPosts.length > 0 ? (
                latestPosts.map((post, i) => (
                    <div key={`latest-${post.id}`} className={`animate-slide-up ${getRhythmStyle(i)}`} style={{ animationDelay: `${i * 0.1}s` }}>
                        <PostItem post={post} />
                    </div>
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
           이곳은 소란한 피드가 아닙니다.<br/>
           조용히 공감하고, 나의 길로 돌아가는 곳입니다.
         </p>
      </div>
    </div>
  );
};
