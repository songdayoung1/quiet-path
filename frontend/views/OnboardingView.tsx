import React, { useState, useEffect } from 'react';
import { SoftButton, Card, QuoteHeader, SoftInput, SoftTextArea } from '../components/UI';
import { ArrowRight, CheckCircle2, Calendar } from 'lucide-react';
import { Direction } from '../types';
import { createDirectionId } from '../storage';

interface OnboardingViewProps {
  onComplete: (initialDirection: Direction) => void;
  onLogin: () => void;
}

import { CATEGORIES } from '../constants';

interface OnboardingViewProps {
  onComplete: (initialDirection: Direction) => void;
  onLogin: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onLogin }) => {
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  
  // Customization States for Final Step
  const [customTitle, setCustomTitle] = useState('');
  const [customQuestion, setCustomQuestion] = useState('이번 기간, 이 방향으로 얼마나 움직였나?');
  const [reviewDate, setReviewDate] = useState('');

  // Update defaults when category is selected
  useEffect(() => {
    if (selectedCategory) {
      setCustomTitle(selectedCategory.defaultTitle);
    }
  }, [selectedCategory]);

  // --- STEP 0: 시작 질문 화면 ---
  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center animate-fade-in relative z-10">
        <div className="flex-1 flex flex-col justify-center items-center max-w-sm">
          <h2 className="text-2xl font-semibold text-mist-600 mb-4 leading-snug">
            지금, 어떤 방향을<br />세우고 계신가요?
          </h2>
          <p className="text-mist-400 text-sm font-normal leading-relaxed">
            요즘 가장 신경 쓰이는<br />한 가지만 고르면 됩니다.
          </p>
        </div>

        <div className="w-full max-w-xs mb-16 space-y-3">
          <SoftButton onClick={() => setStep(1)} className="shadow-lg shadow-point-200/40">
            방향 고르기
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

  // --- STEP 1: 목표 카테고리 선택 화면 ---
  if (step === 1) {
    return (
      <div className="flex flex-col h-screen px-6 pt-12 pb-8 animate-slide-up z-10 relative bg-[#F5F7FA]">
        <div className="text-center mb-8 shrink-0">
          <h2 className="text-xl font-medium text-mist-600 mb-2 leading-relaxed">
            가장 가까운 것을<br/>하나 선택해주세요.
          </h2>
          <p className="text-mist-400 text-xs font-light">
            지금 마음이 향하는 곳은 어디인가요?
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          <div className="flex flex-col gap-3">
            {CATEGORIES.map((cat) => (
              <Card 
                key={cat.id} 
                onClick={() => {
                  setSelectedCategory(cat);
                  setStep(2);
                }}
                className="!p-5 cursor-pointer bg-white/60 hover:bg-white active:scale-[0.99] border border-transparent hover:border-point-200 transition-all duration-300 group shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-mist-600 font-medium text-sm mb-1 group-hover:text-point-600 transition-colors">
                      {cat.label}
                    </h3>
                    <p className="text-mist-400 text-xs font-light">
                      {cat.desc}
                    </p>
                  </div>
                  {/* Subtle indicator instead of button */}
                  <div className="w-1.5 h-1.5 rounded-full bg-mist-200 group-hover:bg-point-300 transition-colors"></div>
                </div>
              </Card>
            ))}
          </div>
          {/* Spacer for bottom scroll */}
          <div className="h-8"></div>
        </div>
      </div>
    );
  }

  // --- STEP 2: 방향(Path) 개념 설명 화면 ---
  if (step === 2) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center animate-fade-in z-10 relative">
        <div className="flex-1 flex flex-col justify-center items-center max-w-sm">
          <h2 className="text-xl font-medium text-mist-600 mb-6 leading-relaxed">
            이 앱은 목표를 달성하라고<br/>재촉하지 않습니다.
          </h2>
          <p className="text-mist-400 text-sm font-light leading-7">
            대신, 이 방향으로 살고 있었는지를<br/>나중에 돌아보게 합니다.
          </p>
        </div>

        <div className="w-full max-w-xs mb-16">
          <SoftButton onClick={() => setStep(3)} className="shadow-lg shadow-lavender-200/40">
            이 방향으로 시작하기
          </SoftButton>
        </div>
      </div>
    );
  }

  // --- STEP 3: 첫 Path 설정 및 생성 완료 화면 (Editable) ---
  if (step === 3 && selectedCategory) {
    const handleStart = () => {
        const initialDirection: Direction = {
            id: createDirectionId(),
            question: customQuestion,
            description: customTitle,
            categoryId: selectedCategory.id,
            categoryLabel: selectedCategory.label,
            createdAt: Date.now(),
            reviewAt: reviewDate ? new Date(reviewDate).getTime() : undefined,
            isActive: true,
        };
        onComplete(initialDirection);
    };

    return (
      <div className="flex flex-col items-center h-screen px-6 pt-10 pb-8 animate-slide-up overflow-y-auto no-scrollbar z-10 relative">
        <div className="flex-1 w-full max-w-sm flex flex-col items-center">
           <div className="w-12 h-12 bg-point-50 rounded-full flex items-center justify-center mb-4 animate-pulse-slow">
              <CheckCircle2 size={24} className="text-point-400" />
           </div>
           
           <p className="text-xs font-bold text-point-500 uppercase tracking-widest mb-4">New Path Setup</p>
           
           <Card className="w-full !bg-white/90 flex flex-col gap-6 mb-8">
              
              {/* 1. Key Question Input - Single Line, Emphasized */}
              <div>
                 <label className="block text-[10px] font-bold text-mist-400 uppercase tracking-wider mb-2 text-center">Key Question</label>
                 <SoftInput 
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className="!py-4 text-center !bg-mist-50 focus:!bg-white text-lg font-bold text-mist-600 shadow-sm"
                    placeholder="예: 나는 더 단순해지고 있는가?"
                 />
                 <p className="text-[10px] text-mist-300 mt-2 text-center">
                    * 이 Path를 대표하는 핵심 질문입니다.
                 </p>
              </div>

              <div className="w-full h-[1px] bg-mist-100"></div>

              {/* 2. Description (Title) Input - Multi Line, Relaxed */}
              <div>
                 <label className="block text-[10px] font-bold text-mist-400 uppercase tracking-wider mb-2 ml-1">어떤 방향으로 만들어 갈까요?</label>
                 <SoftTextArea 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="!bg-mist-50 focus:!bg-white text-sm leading-relaxed"
                    rows={3}
                    placeholder="이 방향에 대한 설명이나 다짐을 자유롭게 적어주세요."
                 />
              </div>

              {/* 3. Date Input */}
              <div>
                 <label className="flex items-center gap-1 text-[10px] font-bold text-mist-400 uppercase tracking-wider mb-2 ml-1">
                    <Calendar size={12} />
                    <span>언제 돌아볼까요? (Time Anchor)</span>
                 </label>
                 <input 
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full bg-mist-50 border-transparent rounded-xl p-3 text-sm text-mist-600 outline-none focus:bg-white focus:ring-1 focus:ring-point-300 transition-all text-center"
                 />
                 <p className="text-[10px] text-mist-300 mt-2 text-center">
                    * 설정한 날짜까지 기록 내용이 흐릿하게 보입니다.
                 </p>
              </div>

           </Card>
        </div>

        <div className="w-full max-w-xs mb-8">
          <SoftButton 
            onClick={handleStart} 
            disabled={!customTitle.trim() || !customQuestion.trim() || !reviewDate}
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
