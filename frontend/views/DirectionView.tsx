import React, { useState } from 'react';
import { AppState, Direction } from '../types';
import { Card, PageHeader, SoftButton, SoftInput, QuoteHeader, SoftTextArea } from '../components/UI';
import { Compass, Archive, CheckCircle2, History, Calendar } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface DirectionViewProps {
  currentDirection: Direction | null;
  onUpdateDirection: (newDirection: Partial<Direction>) => void;
  onHistoryClick: () => void;
}

export const DirectionView: React.FC<DirectionViewProps> = ({ currentDirection, onUpdateDirection, onHistoryClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null); // No Default

  const handleStartEdit = () => {
    setIsEditing(true);
    setShowCategorySelect(true);
    setQuestion('');
    setDescription('');
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSubmit = () => {
    if (!question.trim() || !durationDays) return;
    onUpdateDirection({
      question,
      description,
      reviewAt: Date.now() + durationDays * 24 * 60 * 60 * 1000
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="animate-fade-in pb-24 pt-2">
        <PageHeader title="New Direction" subtitle="이전의 방향은 종료되고 새로운 흐름이 시작됩니다." />
        
        {showCategorySelect ? (
            <div className="flex flex-col gap-3 px-1 mt-2">
                 <p className="text-xs font-semibold text-mist-400 uppercase tracking-wider mb-1 ml-1">Choose Category</p>
                 {CATEGORIES.map((cat) => (
                    <Card 
                        key={cat.id} 
                        onClick={() => {
                            setQuestion('');
                            setDescription(cat.defaultTitle);
                            setShowCategorySelect(false);
                        }}
                        className="!p-4 cursor-pointer bg-white/60 hover:bg-white active:scale-[0.99] border border-transparent hover:border-point-200 transition-all shadow-sm"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-mist-600 font-medium text-sm mb-0.5">{cat.label}</h3>
                                <p className="text-mist-400 text-[10px] font-light">{cat.desc}</p>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-mist-200"></div>
                        </div>
                    </Card>
                 ))}
                 <SoftButton variant="secondary" onClick={handleCancel} className="mt-4">취소</SoftButton>
            </div>
        ) : (
            <Card className="flex flex-col gap-6 !bg-white/80">
          <div>
            <label className="block text-xs font-semibold text-mist-400 uppercase tracking-wider mb-3 ml-1">Key Question</label>
            <SoftInput 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: “나는 더 단순해지고 있는가?”"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-mist-400 uppercase tracking-wider mb-3 ml-1">Description</label>
            <SoftTextArea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="감정적 동요 없이 사실만 바라보기"
              rows={3}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-mist-400 uppercase tracking-wider mb-3 ml-1">Journey Duration</label>
            <div className="flex gap-2">
              {[7, 30, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setDurationDays(days)}
                  className={`px-4 py-2 rounded-xl text-xs transition-all ${durationDays === days ? 'bg-point-100 text-point-600 font-bold' : 'bg-mist-50 text-mist-400 hover:bg-mist-100'}`}
                >
                  {days} Days
                </button>
              ))}
              <label className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-mist-50 text-mist-400 text-xs overflow-hidden cursor-pointer hover:bg-mist-100 transition-colors">
                <Calendar size={12} className="shrink-0 pointer-events-none" />
                <span className="pointer-events-none min-w-[80px]">
                    {durationDays 
                        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toLocaleDateString()
                        : "날짜 선택"
                    }
                </span>
                <input 
                    type="date"
                    required
                    min={(function() {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow.toISOString().split('T')[0];
                    })()} 
                    value={(function() {
                        if (!durationDays) return '';
                        const targetDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
                        return targetDate.toISOString().split('T')[0];
                    })()}
                    onChange={(e) => {
                        if (!e.target.value) return;
                        const selected = new Date(e.target.value);
                        const now = new Date();
                        
                        // Reset hours to compare dates only
                        selected.setHours(0,0,0,0);
                        now.setHours(0,0,0,0);
                        
                        const diffTime = selected.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > 0) setDurationDays(diffDays);
                    }}
                    onClick={(e) => {
                        // Force picker on some browsers
                        try {
                            (e.target as HTMLInputElement).showPicker();
                        } catch (err) {
                            // fallback
                        }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 appearance-none"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-2">
            <SoftButton variant="secondary" onClick={handleCancel}>취소</SoftButton>
            <SoftButton onClick={handleSubmit} disabled={!question.trim() || !durationDays}>설정 완료</SoftButton>
          </div>
        </Card>
        )}
      </div>
    );
  }

  return (
    <div className="animate-slide-up pb-28 pt-2">
      <div className="flex justify-between items-start">
         <PageHeader 
          title="Compass" 
          subtitle="목표를 달성하는 것이 아니라, 방향을 잃지 않는 것이 중요합니다." 
        />
      </div>

      <div className="relative px-2">
        {/* Decorative Line */}
        <div className="absolute top-4 left-6 bottom-0 w-[2px] bg-gradient-to-b from-point-200 to-transparent z-0"></div>
        
        {/* Current Active Direction */}
        <div className="relative z-10 mb-8">
           <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-point-500 shadow-md shadow-point-100 ring-1 ring-point-50">
                <Compass size={20} />
             </div>
             <div>
               <span className="text-xs font-bold text-point-500 uppercase tracking-wider block">Currently Active</span>
               <span className="text-sm text-mist-500 font-medium">진행 중인 방향</span>
             </div>
           </div>

           <Card className="ml-5 relative !bg-white shadow-lg shadow-mist-200/50">
             {currentDirection ? (
               <div className="py-2">
                 <QuoteHeader text={currentDirection.question} className="mb-2" />
                 <p className="text-mist-400 text-sm font-light mb-6 px-2 whitespace-pre-line">{currentDirection.description}</p>
                 
                 <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2 text-xs text-mist-300 bg-mist-50 inline-flex px-3 py-1.5 rounded-full w-fit">
                        <CheckCircle2 size={12} />
                        <span>{new Date(currentDirection.createdAt).toLocaleDateString()}부터 시작됨</span>
                    </div>
                    {currentDirection.reviewAt && (
                        <div className="flex items-center gap-2 text-xs text-point-400 bg-point-50 inline-flex px-3 py-1.5 rounded-full w-fit">
                            <Calendar size={12} />
                            <span>{new Date(currentDirection.reviewAt).toLocaleDateString()}에 열어볼 예정</span>
                        </div>
                    )}
                 </div>
               </div>
             ) : (
                <p className="text-mist-400 text-center py-4">설정된 방향이 없습니다.</p>
             )}
           </Card>
        </div>

        {/* Change Action & History Link */}
        <div className="relative z-10 ml-5 mt-12 flex flex-col gap-4">
           <SoftButton variant="secondary" onClick={handleStartEdit} className="!bg-white/60 backdrop-blur-sm border-mist-100">
             <Archive size={16} className="text-mist-400" />
             <span className="text-mist-500">이 방향을 마무리하고 변경하기</span>
           </SoftButton>

           <div className="flex justify-center mt-2">
                <button 
                    onClick={onHistoryClick} 
                    className="flex items-center gap-1 text-[11px] text-mist-300 hover:text-mist-500 transition-colors"
                >
                    <History size={12} />
                    <span>이전 방향들 (과정 다시 살펴보기)</span>
                </button>
           </div>
        </div>
      </div>
    </div>
  );
};