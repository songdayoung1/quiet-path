import React, { useMemo, useState } from 'react';
import { Direction, Record as RecordType } from '../types';
import { Card, PageHeader, SoftButton, MoodSticker, CategoryIcon, WaterDropOverlay } from '../components/UI';
import { Compass, CheckCircle2, History, Calendar, Play, Image as ImageIcon, ArrowRight, Wind } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { DirectionSetupForm } from '../components/DirectionSetupForm';

interface DirectionViewProps {
  currentDirection: Direction | null;
  records: RecordType[];
  onStartDirection: (newDirection: Partial<Direction>) => void;
  onFinishDirection: () => void;
  onHistoryClick: () => void;
}

export const DirectionView: React.FC<DirectionViewProps> = ({ currentDirection, records, onStartDirection, onFinishDirection, onHistoryClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [customReviewDate, setCustomReviewDate] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number] | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'animating' | 'leaving'>('idle');

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
  const isTitleMissing = !description.trim();
  const canSubmit = !isTitleMissing && !!getReviewAt();

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
    if (!description.trim() || !reviewAt || saveState !== 'idle') return;

    // Trigger Success Animation
    setSaveState('animating');

    setTimeout(() => {
      setSaveState('leaving');
    }, 1400);

    setTimeout(() => {
      onStartDirection({
        question: question.trim() || '이 방향으로 나는 어떻게 걸어가고 있을까?',
        description,
        categoryId: selectedCategory?.id,
        categoryLabel: selectedCategory?.label,
        reviewAt,
      });
      setIsEditing(false);
      setSaveState('idle');
    }, 1750);
  };

  const handleFinishDirection = () => {
    if (window.confirm("이 방향을 마무리할까요?\n마무리 후 새 방향은 원할 때 시작할 수 있어요.")) {
      onFinishDirection();
    }
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
        <PageHeader title="새로운 방향 설정" subtitle="집중하고 싶은 방향을 차분히 정해볼까요?" />

        {showCategorySelect ? (
          <div className="flex flex-col gap-3 px-1 mt-2">
            <p className="text-[11px] font-bold text-mist-400 uppercase tracking-widest mb-2 ml-1">관심사 선택</p>
            {CATEGORIES.map((cat) => (
              <Card
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setQuestion('');
                  setDescription('');
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
          selectedCategory && (
            <DirectionSetupForm
              selectedCategory={selectedCategory}
              directionName={description}
              directionText={question}
              durationDays={durationDays}
              customReviewDate={customReviewDate}
              showDateInput={showDateInput}
              todayStr={todayStr}
              reviewDateDisplay={reviewDateDisplay}
              isNameMissing={isTitleMissing}
              hasReviewAt={!!getReviewAt()}
              submitDisabled={!canSubmit}
              onDirectionNameChange={setDescription}
              onDirectionTextChange={setQuestion}
              onSelectDuration={(days) => {
                setDurationDays(days);
                setCustomReviewDate('');
                setShowDateInput(false);
              }}
              onToggleDateInput={() => {
                setShowDateInput(!showDateInput);
                setDurationDays(null);
              }}
              onReviewDateChange={(value) => {
                setCustomReviewDate(value);
                setDurationDays(null);
              }}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )
        )}

        {/* Water Drop Micro-interaction Overlay */}
        {saveState !== 'idle' && (
          <WaterDropOverlay 
            leaving={saveState === 'leaving'} 
            mood="반짝" 
            title="새로운 방향이 시작되었어요"
            subtitle="함께 차분히 걸어가봐요 ✨"
          />
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
              <span className="text-[15px] text-mist-600 font-bold tracking-wide">지금의 방향</span>
            </div>
          </div>

          <Card className="ml-5 relative !bg-white/90 backdrop-blur-md shadow-md border border-white/50 !p-5">
            {currentDirection ? (
              <div className="flex flex-col">
                {/* 1. Header (Category + Title + Question) */}
                <div className="flex items-start gap-4 mb-4">
                  {currentDirection.categoryId && (
                    <CategoryIcon categoryId={currentDirection.categoryId} size="md" className="shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 pt-0.5">
                    {currentDirection.categoryId && (
                      <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block"
                        style={{ color: CATEGORIES.find(c => c.id === currentDirection.categoryId)?.accent ?? '#9AA5B1' }}>
                        {currentDirection.categoryLabel}
                      </span>
                    )}
                    <h2 className="text-[19px] text-mist-600 font-bold leading-tight break-keep">
                      {currentDirection.description || '지금의 방향'}
                    </h2>
                  </div>
                </div>
                
                <p className="text-mist-500 text-[13px] font-medium leading-relaxed whitespace-pre-line bg-mist-50/70 border border-mist-100/50 py-3 px-4 rounded-[1.25rem]">
                  {currentDirection.question}
                </p>

                {/* 2. Combined Stats & Dates Dashboard */}
                <div className="bg-white border border-mist-100 rounded-[1.25rem] p-4 mt-5 shadow-sm">
                  {/* Stats Row */}
                  <div className="flex items-center justify-between mb-4 border-b border-mist-50 pb-4">
                    <div className="flex flex-col items-center flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-mist-300">Consistency</p>
                      <p className="text-[17px] font-bold text-point-500 mt-1 leading-none">{pathConsistency}%</p>
                    </div>
                    <div className="w-px h-6 bg-mist-100"></div>
                    <div className="flex flex-col items-center flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-mist-300">Days</p>
                      <p className="text-[17px] font-bold text-mist-600 mt-1 leading-none">{currentPathRecords.length}</p>
                    </div>
                    <div className="w-px h-6 bg-mist-100"></div>
                    <div className="flex flex-col items-center flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-mist-300">Mood</p>
                      <div className="mt-1 flex justify-center h-[17px] items-center">
                        {topMood ? <MoodSticker code={topMood} className="scale-75 origin-center opacity-100" /> : <span className="text-sm text-mist-300">-</span>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Dates Row */}
                  <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-mist-400">
                    <CheckCircle2 size={12} className="text-point-300" />
                    <span>{new Date(currentDirection.createdAt).toLocaleDateString()} 시작</span>
                    <ArrowRight size={10} className="text-mist-200" />
                    <Calendar size={12} className="text-point-300" />
                    <span>{currentDirection.reviewAt ? new Date(currentDirection.reviewAt).toLocaleDateString() : '-'} 회고</span>
                  </div>
                </div>

                {/* 3. Compact Path Scene Board */}
                {currentPathImages.length > 0 && (
                  <div className="mt-5 flex items-center justify-between bg-mist-50/50 rounded-full py-2.5 px-4 border border-mist-100/50">
                    <div className="flex items-center gap-1.5">
                       <ImageIcon size={14} className="text-mist-400" />
                       <span className="text-[11px] font-bold text-mist-500">장면들 ({currentPathRecords.filter(r => r.imageUrl).length})</span>
                    </div>
                    <div className="flex items-center -space-x-1.5">
                      {currentPathImages.map((record, idx) => (
                        <img key={`thumb-${record.id}`} src={record.imageUrl} alt="Scene" className="w-[28px] h-[28px] rounded-full border-2 border-white object-cover shadow-sm bg-mist-100 relative" style={{ zIndex: 4 - idx }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-mist-50/80 flex items-center justify-center mb-2 border border-mist-100/50 shadow-inner">
                  <Wind size={28} className="text-mist-300" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-mist-600 text-base font-bold tracking-wide mb-1">지금은 잠시 쉬고 있어요</p>
                  <p className="text-mist-400 text-xs font-medium tracking-wide">원할 때 새 방향을 천천히 시작해요.</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="relative z-10 ml-5 mt-10 flex flex-col gap-3">
          {currentDirection ? (
            <SoftButton 
              variant="secondary" 
              onClick={handleFinishDirection} 
              className="!bg-white/90 backdrop-blur-sm border border-mist-200 shadow-sm py-3.5 hover:border-point-300 transition-colors"
            >
              <span className="text-mist-600 font-bold text-sm">현재 방향 마무리하기</span>
            </SoftButton>
          ) : (
            <SoftButton onClick={handleStartEdit} className="py-3.5 shadow-lg shadow-point-200/50 font-bold text-sm">
              <span>새 방향 시작하기</span>
            </SoftButton>
          )}

          <div className="flex justify-center mt-3">
            <button
              onClick={onHistoryClick}
              className="flex items-center gap-2 text-xs font-bold text-mist-400 hover:text-mist-600 transition-colors bg-white/50 px-4 py-2 rounded-full border border-mist-100 shadow-sm"
            >
              <History size={14} />
              <span>지나온 방향들 바로가기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
