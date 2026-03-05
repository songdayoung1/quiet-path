import React, { useState } from 'react';
import { AppState, LogEntry, Direction } from '../types';
import { createLogId, getDailyTone } from '../storage';
import { SoftButton, AutoTextArea, SoftInput } from '../components/UI';
import { X, Check, ChevronDown, ChevronUp, Calendar, Smile } from 'lucide-react';

interface LogEditorViewProps {
  state: AppState;
  onSave: (log: LogEntry, directionUpdate?: Partial<Direction>) => void;
  onCancel: () => void;
}

export const LogEditorView: React.FC<LogEditorViewProps> = ({ state, onSave, onCancel }) => {
  const [action, setAction] = useState('');
  const [reflection, setReflection] = useState('');
  const [plan, setPlan] = useState('');
  
  // Optional Fields
  const [mood, setMood] = useState<string>('');
  const [showExtras, setShowExtras] = useState(false);

  const { currentDirection } = state;
  const dailyTone = getDailyTone(); // Get current tone config

  const handleSubmit = () => {
    if (!action.trim() || !reflection.trim()) return;

    const newLog: LogEntry = {
      id: createLogId(),
      date: new Date().toISOString(),
      timestamp: Date.now(),
      directionQuestion: currentDirection?.question || '방향 없음',
      action,
      reflection,
      plan: plan.trim() || undefined,
      mood: mood || undefined,
    };

    onSave(newLog);
  };

  const moods = ['🌿', '☁️', '☀️', '🌙', '🌊'];

  return (
    <div className="absolute inset-0 z-50 flex flex-col animate-fade-in bg-[#F5F7FA]/95 backdrop-blur-xl">
      {/* Header */}
      <div className="sticky top-0 bg-transparent p-4 flex justify-between items-center z-10 pt-6">
        <button onClick={onCancel} className="p-3 rounded-full bg-white/50 hover:bg-white text-mist-400 transition-colors shadow-sm">
          <X size={20} />
        </button>
        <div className="flex flex-col items-center">
             <span className="text-point-500 text-[10px] font-bold tracking-[0.2em] uppercase">Today's Log</span>
             <span className="text-mist-400 text-[10px]">Today's Focus</span>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 px-6 py-4 max-w-md mx-auto w-full flex flex-col gap-8 overflow-y-auto no-scrollbar">
        
        {/* Context: Current Direction */}
        <div className="text-center py-4">
           <h2 className="text-lg text-mist-600 font-normal leading-relaxed px-4">
             {currentDirection?.question || "설정된 방향이 없습니다."}
           </h2>
        </div>

        {/* 1. Question 1 (Action/Fact) */}
        <div className="animate-slide-up bg-white rounded-3xl p-6 shadow-sm border border-white/50" style={{ animationDelay: '0.1s' }}>
          <label className="block text-sm text-point-600 mb-4 ml-1 font-medium leading-relaxed">
            {dailyTone.question1.title}
          </label>
          <AutoTextArea 
            rows={3}
            placeholder={dailyTone.question1.placeholder}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            autoFocus
            className="!bg-mist-50/50 !p-4 !border-none !rounded-xl focus:!ring-0 text-base placeholder:text-mist-300/70"
          />
        </div>

        {/* 2. Question 2 (Reflection/Feeling) */}
        <div className="animate-slide-up bg-white rounded-3xl p-6 shadow-sm border border-white/50" style={{ animationDelay: '0.2s' }}>
          <label className="block text-sm text-point-600 mb-4 ml-1 font-medium leading-relaxed">
            {dailyTone.question2.title}
          </label>
          <AutoTextArea 
            rows={2}
            placeholder={dailyTone.question2.placeholder}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="!bg-mist-50/50 !p-4 !border-none !rounded-xl focus:!ring-0 placeholder:text-mist-300/70"
          />
        </div>

        {/* 3. Optional Plan */}
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
           <label className="block text-sm text-mist-400 mb-2 ml-1 font-medium leading-relaxed">
            {dailyTone.plan.title} (선택)
          </label>
          <SoftInput 
            placeholder={dailyTone.plan.placeholder}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="!bg-white/60"
          />
        </div>

        {/* 4. Collapsible Extras */}
        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
           <button 
             onClick={() => setShowExtras(!showExtras)}
             className="flex items-center gap-2 text-xs text-mist-400 hover:text-mist-600 transition-colors w-full py-2"
           >
             {showExtras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
             <span>감정 더하기</span>
           </button>

           {showExtras && (
             <div className="mt-4 flex flex-col gap-6 animate-fade-in bg-white/40 p-5 rounded-2xl">
               {/* Mood */}
               <div>
                 <div className="flex items-center gap-2 mb-3">
                    <Smile size={14} className="text-point-400"/>
                    <label className="text-xs text-mist-500">오늘의 날씨 (기분)</label>
                 </div>
                 <div className="flex gap-4">
                   {moods.map(m => (
                     <button 
                       key={m} 
                       onClick={() => setMood(m)}
                       className={`text-xl transition-transform hover:scale-125 ${mood === m ? 'scale-125 drop-shadow-md' : 'opacity-50 grayscale'}`}
                     >
                       {m}
                     </button>
                   ))}
                 </div>
               </div>
             </div>
           )}
        </div>

        <div className="h-20" />
      </div>

      {/* Footer Action */}
      <div className="sticky bottom-0 w-full flex justify-center bg-gradient-to-t from-[#F5F7FA] via-[#F5F7FA]/80 to-transparent z-20 pb-safe">
        <div className="w-full max-w-md px-6 pb-6 pt-2">
            <SoftButton 
              onClick={handleSubmit} 
              disabled={!action.trim() || !reflection.trim()}
              className="shadow-xl shadow-point-200/50"
            >
              <Check size={18} />
              <span>흔적 남기기</span>
            </SoftButton>
        </div>
      </div>
    </div>
  );
};