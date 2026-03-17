import React, { useState, useEffect } from 'react';
import { SoftButton, Card, SoftInput, CategoryIcon } from '../components/UI';
import { Calendar, ArrowRight } from 'lucide-react';
import { WaterDropCharacter } from '../components/WaterDropCharacter';
import { Direction } from '../types';
import { createDirectionId } from '../storage';
import { CATEGORIES } from '../constants';

interface OnboardingViewProps {
  onComplete: (initialDirection: Direction) => void;
  onLogin: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onLogin }) => {
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);

  // 방향 설정 상태 (DirectionView와 동일한 구조)
  const [customTitle, setCustomTitle] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [customReviewDate, setCustomReviewDate] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);

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

  useEffect(() => {
    if (selectedCategory) {
      setCustomTitle(selectedCategory.defaultTitle);
    }
  }, [selectedCategory]);

  // --- STEP 0: 시작 화면 ---
  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center animate-fade-in relative z-10">
        <div className="flex-1 flex flex-col justify-center items-center max-w-sm">
          <WaterDropCharacter size={96} mood="waiting" animate={true} className="mb-6" />
          <h2 className="text-2xl font-semibold text-mist-600 mb-4 leading-snug">
            지금, 어떤 방향을<br />세우고 계신가요?
          </h2>
          <p className="text-mist-400 text-sm font-normal leading-relaxed">
            요즘 가장 신경 쓰이는<br />한 가지만 고르면 됩니다.
          </p>
        </div>
        <div className="w-full max-w-xs mb-16 space-y-3">
          <SoftButton onClick={() => setStep(1)} className="shadow-lg shadow-point-200/40">
            시작하기
          </SoftButton>
          <button
            onClick={onLogin}
            className="w-full py-3 text-xs text-mist-400 hover:text-point-500 transition-colors"
          >
            이미 계정이 있으신가요?
          </button>
        </div>
      </div>
    );
  }

  // --- STEP 1: 카테고리 선택 (DirectionView와 동일한 디자인) ---
  if (step === 1) {
    return (
      <div className="flex flex-col h-screen px-5 pt-12 pb-8 animate-slide-up z-10 relative">
        <div className="mb-6 shrink-0">
          <p className="text-[11px] font-bold text-point-500 uppercase tracking-widest mb-2">Step 1</p>
          <h2 className="text-xl font-bold text-mist-600 leading-snug">
            지금 가장 집중하고 싶은<br />영역을 선택해주세요
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          <div className="flex flex-col gap-3">
            {CATEGORIES.map((cat) => (
              <Card
                key={cat.id}
                onClick={() => { setSelectedCategory(cat); setStep(2); }}
                className="!p-4 cursor-pointer active:scale-[0.99] border border-white transition-all duration-300 hover:shadow-md"
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
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 2: 앱 철학 소개 ---
  if (step === 2) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center animate-fade-in z-10 relative">
        <div className="flex-1 flex flex-col justify-center items-center max-w-sm gap-6">
          {/* 선택된 카테고리 뱃지 */}
          {selectedCategory && (
            <div className="flex items-center gap-3 bg-white/70 px-5 py-3 rounded-2xl shadow-sm border border-white">
              <CategoryIcon categoryId={selectedCategory.id} size="sm" />
              <span className="font-bold text-sm" style={{ color: selectedCategory?.accent }}>{selectedCategory.label}</span>
            </div>
          )}
          <h2 className="text-xl font-semibold text-mist-600 leading-relaxed">
            목표를 달성하라고<br/>재촉하지 않아요.
          </h2>
          <p className="text-mist-400 text-sm font-light leading-7">
            대신, 이 방향으로 <span className="font-medium text-mist-500">하루하루 걸어가고 있었는지</span>를<br/>나중에 함께 돌아봅니다.
          </p>
        </div>
        <div className="w-full max-w-xs mb-16">
          <SoftButton onClick={() => setStep(3)} className="shadow-lg shadow-lavender-200/40">
            여정 만들기
          </SoftButton>
        </div>
      </div>
    );
  }

  // --- STEP 3: 방향 설정 (DirectionView와 동일한 폼 구조) ---
  if (step === 3 && selectedCategory) {
    const handleStart = () => {
      const reviewAt = getReviewAt();
      if (!customTitle.trim() || !reviewAt) return;
      const initialDirection: Direction = {
        id: createDirectionId(),
        question: customQuestion.trim() || '이 방향으로 나는 어떻게 걸어가고 있을까?',
        description: customTitle,
        categoryId: selectedCategory.id,
        categoryLabel: selectedCategory.label,
        createdAt: Date.now(),
        reviewAt,
        isActive: true,
      };
      onComplete(initialDirection);
    };

    return (
      <div className="flex flex-col h-screen px-5 pt-10 pb-8 animate-slide-up overflow-y-auto no-scrollbar z-10 relative">
        <div className="mb-5 shrink-0">
          <p className="text-[11px] font-bold text-point-500 uppercase tracking-widest mb-2">Step 2</p>
          <h2 className="text-xl font-bold text-mist-600 leading-snug">나의 여정을 만들어요</h2>
        </div>

        <div className="flex-1">
          <Card className="w-full !bg-white/90 flex flex-col gap-5 mb-6">
            {/* 선택된 카테고리 */}
            <div className="flex items-center gap-3 pb-4 border-b border-mist-100">
              <CategoryIcon categoryId={selectedCategory.id} size="sm" />
              <span className="font-bold text-sm" style={{ color: selectedCategory.accent }}>{selectedCategory.label}</span>
            </div>

            {/* 1. 이름/제목 (카드 큰 제목으로 표시됨) */}
            <div>
              <label className="block text-xs font-bold text-mist-500 mb-2 ml-1">이 여정의 이름</label>
              <SoftInput
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={`예: ${selectedCategory.defaultTitle}`}
                autoFocus
                className="bg-white"
              />
              <p className="text-[10px] text-mist-300 mt-1.5 ml-1">카드에 큰 제목으로 보입니다</p>
            </div>

            {/* 2. 질문 (선택) */}
            <div>
              <label className="block text-xs font-bold text-mist-500 mb-2 ml-1">나에게 던지는 질문 <span className="text-mist-300 font-normal">(선택)</span></label>
              <SoftInput
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="예: 나는 꾸준히 나아가고 있을까?"
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
          </Card>
        </div>

        <div className="shrink-0 pb-4">
          <SoftButton
            onClick={handleStart}
            disabled={!customTitle.trim() || !getReviewAt()}
            className="shadow-xl shadow-point-300/30"
          >
            기록 시작하기
          </SoftButton>
        </div>
      </div>
    );
  }

  return null;
};
