import React, { useState, useRef } from 'react';
import { AppState, Record as RecordType, Direction } from '../types';
import { createLogId } from '../storage';
import { SoftButton, AutoTextArea, MoodSticker, WaterDropOverlay } from '../components/UI';
import { X, Check, Image as ImageIcon } from 'lucide-react';
import { MOOD_STICKERS } from '../constants';

interface LogEditorViewProps {
  state: AppState;
  onSave: (record: RecordType, directionUpdate?: Partial<Direction>) => void;
  onCancel: () => void;
}

export const LogEditorView: React.FC<LogEditorViewProps> = ({ state, onSave, onCancel }) => {
  const [action, setAction] = useState(''); // 오늘의 장면
  const [oneWordText, setOneWordText] = useState('');
  const [tomorrowText, setTomorrowText] = useState('');
  const [moodCode, setMoodCode] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  
  const [saveState, setSaveState] = useState<'idle' | 'animating' | 'leaving'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentDirection } = state;

  const handleSubmit = () => {
    if (!action.trim() || saveState !== 'idle') return;

    const newRecord: RecordType = {
      id: createLogId(),
      date: new Date().toISOString(),
      timestamp: Date.now(),
      directionQuestion: currentDirection?.question || '방향 없음',
      action: action.trim(),
      oneWordText: oneWordText.trim() || undefined,
      tomorrowText: tomorrowText.trim() || undefined,
      moodCode: moodCode || undefined,
      imageUrl: imageUrl || undefined,
    };

    // 1) 물방울 오버레이 등장
    setSaveState('animating');

    // 2) 1.4s 후 페이드아웃 시작
    setTimeout(() => {
      setSaveState('leaving');
    }, 1400);

    // 3) 페이드아웃 완료(0.35s) 후 실제 저장
    setTimeout(() => {
      onSave(newRecord);
    }, 1750);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a mock local object URL for the image
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  const isSaving = saveState !== 'idle';

  return (
    <div className="absolute inset-0 z-50 flex flex-col animate-fade-in bg-[#E8EDF2]/95 backdrop-blur-xl">
      {/* Header */}
      <div className="sticky top-0 bg-transparent p-4 flex justify-between items-center z-10 pt-6">
        <button onClick={onCancel} className="p-3 rounded-full bg-white/50 hover:bg-white text-mist-400 transition-colors shadow-sm">
          <X size={20} />
        </button>
        <div className="flex flex-col items-center">
             <span className="text-point-500 text-[10px] font-bold tracking-[0.2em] uppercase">Today's Log</span>
             <span className="text-mist-400 text-[10px]">새로운 기록</span>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 px-5 py-4 max-w-md mx-auto w-full flex flex-col gap-6 overflow-y-auto no-scrollbar">
        
        {/* Context: Current Direction */}
        <div className="text-center pb-2">
           <h2 className="text-sm text-mist-500 font-medium">
             {currentDirection?.question || "오늘의 방향"}
           </h2>
        </div>

        {/* 1. Mood Sticker Picker */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
           <label className="block text-[11px] font-bold text-mist-400 mb-3 ml-1 text-center uppercase tracking-wide">오늘의 기분</label>
           <div className="flex flex-wrap justify-center gap-2 bg-white/70 p-4 rounded-3xl border border-white/80 shadow-sm">
              {MOOD_STICKERS.map(s => (
                <MoodSticker 
                  key={s.code} 
                  code={s.code} 
                  selected={moodCode === s.code} 
                  onClick={() => setMoodCode(s.code)}
                  className="px-4 py-2 text-sm" 
                />
              ))}
           </div>
        </div>

        {/* 2. Scene (Action) */}
        <div className="animate-slide-up bg-white/90 rounded-3xl p-6 shadow-sm border border-white/50" style={{ animationDelay: '0.2s' }}>
          <label className="block text-sm text-point-600 mb-4 ml-1 font-bold leading-relaxed">
            오늘의 장면을 남겨볼까요?
          </label>
          <AutoTextArea 
            rows={3}
            placeholder="기억에 남는 순간이나 한 일을 편하게 적어주세요."
            value={action}
            onChange={(e) => setAction(e.target.value)}
            autoFocus
            className="!bg-mist-50/50 !p-4 !border-none !rounded-xl focus:!ring-1 focus:!ring-point-200 text-sm placeholder:text-mist-300/80 transition-shadow"
          />
        </div>

        {/* 3. One Word */}
        <div className="animate-slide-up bg-white/90 rounded-3xl p-6 shadow-sm border border-white/50" style={{ animationDelay: '0.3s' }}>
          <label className="block text-sm text-point-600 mb-4 ml-1 font-bold leading-relaxed">
            오늘을 한 단어로 표현한다면?
          </label>
          <input 
            type="text"
            placeholder="다짐, 평온, 위로 등..."
            value={oneWordText}
            onChange={(e) => setOneWordText(e.target.value)}
            className="w-full bg-mist-50/50 p-4 rounded-xl border-none focus:ring-1 focus:ring-point-200 transition-shadow text-sm placeholder:text-mist-300/80 outline-none text-mist-600"
          />
        </div>

        {/* 4. Tomorrow Step & Image */}
        <div className="animate-slide-up bg-white/90 rounded-3xl p-6 shadow-sm border border-white/50 flex flex-col gap-6" style={{ animationDelay: '0.4s' }}>
             
             <div>
                <label className="block text-xs text-mist-500 font-bold mb-3 ml-1">내일은 무엇을 해볼까요? <span className="text-mist-300 font-normal">(선택)</span></label>
                <input 
                    type="text"
                    placeholder="내일의 작은 목표나 계획을 적어보세요."
                    value={tomorrowText}
                    onChange={(e) => setTomorrowText(e.target.value)}
                    className="w-full bg-mist-50/50 p-4 rounded-xl border-none focus:ring-1 focus:ring-mist-200 text-sm placeholder:text-mist-300/80 outline-none text-mist-600 transition-shadow"
                />
             </div>

             <div>
                <label className="block text-xs text-mist-500 font-bold mb-3 ml-1">오늘의 사진 한 장 <span className="text-mist-300 font-normal">(선택)</span></label>
                {imageUrl ? (
                    <div className="relative group w-full aspect-video">
                        <img src={imageUrl} alt="Uploaded scene" className="w-full h-full object-cover rounded-xl shadow-sm border border-mist-100" />
                        <button 
                            onClick={() => setImageUrl('')}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all shadow-md"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-mist-200 rounded-xl text-mist-400 hover:text-point-500 hover:border-point-300 hover:bg-point-50/30 transition-all bg-mist-50/50"
                    >
                        <ImageIcon size={24} />
                        <span className="text-xs font-medium">사진 첨부하기</span>
                    </button>
                )}
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload}
                />
             </div>
        </div>

        <div className="h-28" />
      </div>

      {/* Footer Action */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center bg-gradient-to-t from-[#E8EDF2] via-[#E8EDF2]/90 to-transparent z-20 pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-md px-6 pb-8 pt-8">
            <SoftButton
              onClick={handleSubmit}
              disabled={!action.trim() || isSaving}
              className={`shadow-xl transition-all duration-300 shadow-point-200/50 py-4 text-base font-bold`}
            >
              <Check size={20} />
              <span>흔적 남기기</span>
            </SoftButton>
        </div>
      </div>

      {/* Water Drop Micro-interaction */}
      {isSaving && (
        <WaterDropOverlay leaving={saveState === 'leaving'} />
      )}
    </div>
  );
};