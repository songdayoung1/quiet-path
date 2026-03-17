import React, { useMemo, useState } from 'react';
import { Direction, Record as RecordType } from '../types';
import { Card, PageHeader, SoftButton, SoftInput, SoftTextArea, MoodSticker, CategoryIcon } from '../components/UI';
import { Compass, CheckCircle2, History, Calendar, Play, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface DirectionViewProps {
  currentDirection: Direction | null;
  records: RecordType[];
  onUpdateDirection: (newDirection: Partial<Direction>) => void;
  onHistoryClick: () => void;
}

export const DirectionView: React.FC<DirectionViewProps> = ({ currentDirection, records, onUpdateDirection, onHistoryClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [customReviewDate, setCustomReviewDate] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number] | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const getReviewAt = () => {
    if (customReviewDate) return new Date(customReviewDate + 'T00:00:00').getTime();
    if (durationDays) { const d = new Date(); d.setDate(d.getDate() + durationDays); return d.getTime(); }
    return undefined;
  };
  const reviewDateDisplay = (() => {
    const ts = getReviewAt();
    return ts ? new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : null;
  })();

  const handleStartEdit = () => {
    setIsEditing(true);
    setShowCategorySelect(true);
    setQuestion('');
    setDescription('');
    setDurationDays(null);
    setCustomReviewDate('');
    setShowDateInput(false);
    setSelectedCategory(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSubmit = () => {
    const reviewAt = getReviewAt();
    if (!description.trim() || !reviewAt) return;
    onUpdateDirection({
      question: question.trim() || '이 방향으로 나는 어떻게 걸어가고 있을까?',
      description,
      categoryId: selectedCategory?.id,
      categoryLabel: selectedCategory?.label,
      reviewAt,
    });
    setIsEditing(false);
  };

  const currentPathRecords = useMemo(() => {
    if (!currentDirection) return [];
    return records
      .filter((record) => !record.isHidden && record.directionQuestion === currentDirection.question)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [currentDirection, records]);

  const currentPathImages = currentPathRecords.filter((record) => record.imageUrl).slice(0, 4);

  const topMood = useMemo(() => {
    const moodCounts = currentPathRecords.reduce((acc, record) => {
      if (record.moodCode) acc[record.moodCode] = (acc[record.moodCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [currentPathRecords]);

  const pathConsistency = useMemo(() => {
    if (!currentDirection) return 0;
    const startDate = new Date(currentDirection.createdAt);
    const today = new Date();
    const pathDays = Math.max(
      1,
      Math.floor(
        (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
          new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );

    return Math.round((currentPathRecords.length / pathDays) * 100);
  }, [currentDirection, currentPathRecords.length]);

  if (isEditing) {
    return (
      <div className="animate-fade-in pb-24 pt-2">
        <PageHeader title="새로운 방향 설정" subtitle="어떤 질문을 안고 걸어볼까요?" />

        {showCategorySelect ? (
          <div className="flex flex-col gap-3 px-1 mt-2">
            <p className="text-[11px] font-bold text-mist-400 uppercase tracking-widest mb-2 ml-1">관심사 선택</p>
            {CATEGORIES.map((cat) => (
              <Card
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setQuestion('');
                  setDescription(cat.defaultTitle);
                  setShowCategorySelect(false);
                }}
                className="!p-5 cursor-pointer hover:bg-white active:scale-[0.98] border border-white transition-all shadow-sm hover:shadow-md"
                style={{ background: `linear-gradient(135deg, ${cat.accentBg}CC, white)` } as React.CSSProperties}
              >
                <div className="flex items-center gap-4">
                  <CategoryIcon categoryId={cat.id} size="md" />
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-0.5" style={{ color: cat.accent }}>{cat.label}</h3>
                    <p className="text-mist-400 text-xs">{cat.desc}</p>
                  </div>
                  <ArrowRight size={16} className="text-mist-300 shrink-0" />
                </div>
              </Card>
            ))}
            <SoftButton variant="secondary" onClick={handleCancel} className="mt-6 bg-white/50">
              돌아가기
            </SoftButton>
          </div>
        ) : (
          <Card className="flex flex-col gap-6 !bg-white/80 shadow-md border-white/80">
            {/* 선택된 카테고리 뱃지 */}
            {selectedCategory && (
              <div className="flex items-center gap-3 pb-2 border-b border-mist-100">
                <CategoryIcon categoryId={selectedCategory.id} size="sm" />
                <span className="text-sm font-bold" style={{ color: selectedCategory.accent }}>{selectedCategory.label}</span>
              </div>
            )}

            {/* 1. 이름/제목 먼저 (카드에서 큰 제목으로 표시되는 것) */}
            <div>
              <label className="block text-xs font-bold text-mist-500 mb-2 ml-1">이 여정의 이름</label>
              <SoftInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 하루 1시간, 나만의 공부 루틴"
                autoFocus
                className="bg-white"
              />
              <p className="text-[10px] text-mist-300 mt-1.5 ml-1">카드에 큰 제목으로 보입니다</p>
            </div>

            {/* 2. 질문 (카드에서 본문으로 표시되는 것) */}
            <div>
              <label className="block text-xs font-bold text-mist-500 mb-2 ml-1">나에게 던지는 질문 <span className="text-mist-300 font-normal">(선택)</span></label>
              <SoftInput
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="예: 나는 꾸준히 배우고 있을까?"
                className="bg-white"
              />
              <p className="text-[10px] text-mist-300 mt-1.5 ml-1">이 기간이 끝날 때 스스로 돌아볼 질문이에요</p>
            </div>

            {/* 3. 언제 돌아볼까요 */}
            <div>
              <label className="block text-xs font-bold text-mist-500 mb-3 ml-1">언제 돌아볼까요?</label>
              <div className="flex gap-2 flex-wrap">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => { setDurationDays(days); setCustomReviewDate(''); setShowDateInput(false); }}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                      durationDays === days && !customReviewDate
                        ? 'bg-point-500 text-white shadow-md shadow-point-200/50 scale-105'
                        : 'bg-mist-50 text-mist-500 hover:bg-mist-100'
                    }`}
                  >
                    {days}일
                  </button>
                ))}
                <button
                  onClick={() => { setShowDateInput(!showDateInput); setDurationDays(null); }}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    showDateInput || customReviewDate
                      ? 'bg-point-500 text-white shadow-md shadow-point-200/50'
                      : 'bg-mist-50 text-mist-500 hover:bg-mist-100'
                  }`}
                >
                  <Calendar size={14} />
                  직접 선택
                </button>
              </div>
              {showDateInput && (
                <input
                  type="date"
                  min={todayStr}
                  value={customReviewDate}
                  onChange={(e) => { setCustomReviewDate(e.target.value); setDurationDays(null); }}
                  className="mt-3 w-full bg-white border border-mist-100 rounded-2xl px-4 py-3 text-sm text-mist-600 outline-none focus:ring-1 focus:ring-point-300 transition-all"
                />
              )}
              {reviewDateDisplay && (
                <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl bg-point-50 border border-point-100 text-point-600 text-sm">
                  <Calendar size={15} className="text-point-400 shrink-0" />
                  <span className="font-semibold">{reviewDateDisplay}</span>
                  <span className="text-point-400 text-xs ml-auto">에 돌아볼게요</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <SoftButton onClick={handleSubmit} disabled={!description.trim() || !getReviewAt()} className="py-4 text-base font-bold shadow-point-200/50">
                여정 시작하기
              </SoftButton>
              <SoftButton variant="secondary" onClick={handleCancel} className="bg-transparent border-none hover:bg-mist-50 shadow-none text-mist-400">
                취소
              </SoftButton>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="animate-slide-up pb-28 pt-2">
      <div className="flex justify-between items-start">
        <PageHeader title="Current Path" subtitle="지금 걷고 있는 방향과 흐름을 확인합니다." />
      </div>

      <div className="relative px-2">
        <div className="absolute top-4 left-6 bottom-0 w-[2px] bg-gradient-to-b from-mist-200/50 to-transparent z-0"></div>

        <div className="relative z-10 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-[1.25rem] bg-white flex items-center justify-center text-point-500 shadow-sm border border-mist-100">
              <Compass size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-point-500 uppercase tracking-widest block mb-1">Current Path</span>
              <span className="text-[15px] text-mist-600 font-bold tracking-wide">지금의 여정</span>
            </div>
          </div>

          <Card className="ml-5 relative !bg-white/90 backdrop-blur-md shadow-md border border-white/50">
            {currentDirection ? (
              <div className="py-2">
                <div className="space-y-3">
                  {/* 카테고리 아이콘 + 라벨 */}
                  {currentDirection.categoryId && (
                    <div className="flex items-center gap-3">
                      <CategoryIcon categoryId={currentDirection.categoryId} size="sm" />
                      <span className="text-[11px] font-bold tracking-wide"
                        style={{ color: CATEGORIES.find(c => c.id === currentDirection.categoryId)?.accent ?? '#9AA5B1' }}>
                        {currentDirection.categoryLabel}
                      </span>
                    </div>
                  )}
                  <h2 className="text-xl md:text-2xl text-mist-600 font-bold leading-relaxed tracking-wide">
                    {currentDirection.description || '지금의 여정'}
                  </h2>
                  <p className="text-mist-500 text-[15px] font-medium whitespace-pre-line bg-mist-50/50 py-4 px-4 rounded-2xl">
                    {currentDirection.question}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="rounded-2xl bg-white border border-mist-100 px-3 py-4 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Consistency</p>
                    <p className="text-xl font-bold text-point-500 mt-2">{pathConsistency}%</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-mist-100 px-3 py-4 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Record Days</p>
                    <p className="text-xl font-bold text-mist-600 mt-2">{currentPathRecords.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-mist-100 px-3 py-4 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Top Mood</p>
                    <div className="mt-2 flex justify-center">
                      {topMood ? <MoodSticker code={topMood} className="opacity-100" /> : <span className="text-sm text-mist-300">-</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="flex items-center gap-3 text-sm text-mist-500 bg-white border border-mist-100 px-4 py-3 rounded-2xl shadow-sm">
                    <CheckCircle2 size={16} className="text-point-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Start</p>
                      <span className="font-medium">{new Date(currentDirection.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-mist-500 bg-white border border-mist-100 px-4 py-3 rounded-2xl shadow-sm">
                    <Calendar size={16} className="text-point-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Review</p>
                      <span className="font-medium">{currentDirection.reviewAt ? new Date(currentDirection.reviewAt).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] bg-white/75 border border-white shadow-sm p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-mist-400" />
                      <h3 className="text-xs font-bold text-mist-500 uppercase tracking-widest">Path Scene Board</h3>
                    </div>
                    <button onClick={onHistoryClick} className="text-[11px] font-semibold text-point-500 inline-flex items-center gap-1">
                      지난 흐름 보기
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  {currentPathImages.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                      {currentPathImages.map((record) => (
                        <div key={`path-scene-${record.id}`} className="space-y-2">
                          <div className="aspect-square rounded-2xl overflow-hidden border border-white shadow-sm bg-mist-50">
                            <img src={record.imageUrl} alt="Path scene" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[10px] text-mist-400 text-center">{new Date(record.timestamp).getDate()}일</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-mist-50/70 border border-dashed border-white p-5 text-center">
                      <p className="text-sm font-medium text-mist-500">아직 장면 보드가 비어 있어요</p>
                      <p className="text-[11px] text-mist-400 mt-2">사진이 포함된 기록을 남기면 여정의 장면이 모입니다.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-mist-400 font-medium tracking-wide">설정된 방향이 없습니다.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="relative z-10 ml-5 mt-12 flex flex-col gap-4">
          {currentDirection ? (
            <SoftButton variant="secondary" onClick={handleStartEdit} className="!bg-white/70 backdrop-blur-sm border-white/50 shadow-sm py-4">
              <span className="text-mist-500 font-bold">새로운 방향으로 수정하기</span>
            </SoftButton>
          ) : (
            <SoftButton onClick={handleStartEdit} className="py-4 shadow-lg shadow-point-200/50 font-bold">
              <span>새로운 방향 설정하기</span>
            </SoftButton>
          )}

          <div className="flex justify-center mt-4">
            <button
              onClick={onHistoryClick}
              className="flex items-center gap-2 text-xs font-bold text-mist-400 hover:text-mist-600 transition-colors bg-white/50 px-4 py-2 rounded-full border border-mist-100 shadow-sm"
            >
              <History size={14} />
              <span>과거의 여정들 바로가기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
