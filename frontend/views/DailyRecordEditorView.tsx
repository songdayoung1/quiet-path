import React, { useEffect, useRef, useState } from 'react';
import { AppState, Record as RecordType, Direction } from '../types';
import { createLogId } from '../storage';
import { SoftButton, AutoTextArea, MoodSticker, WaterDropOverlay } from '../components/UI';
import { X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { MOOD_STICKERS } from '../constants';
import { CharacterTone } from '../components/WaterDropCharacter';
import { getThemePalette, useResolvedTheme } from '../theme';
import { recordApi } from '../api/recordApi';
import { AppModal } from '../components/AppModal';

interface DailyRecordEditorViewProps {
  state: AppState;
  initialRecord?: RecordType | null;
  onSave: (record: RecordType, directionUpdate?: Partial<Direction>) => void;
  onCancel: () => void;
  onStartDirection: () => void;
}

export const DailyRecordEditorView: React.FC<DailyRecordEditorViewProps> = ({
  state,
  initialRecord = null,
  onSave,
  onCancel,
  onStartDirection,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [action, setAction] = useState('');
  const [oneWordText, setOneWordText] = useState('');
  const [tomorrowText, setTomorrowText] = useState('');
  const [moodCode, setMoodCode] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  
  const [saveState, setSaveState] = useState<'idle' | 'animating' | 'leaving'>('idle');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentDirection } = state;
  const isEditing = initialRecord !== null;

  useEffect(() => {
    setAction(initialRecord?.action ?? '');
    setOneWordText(initialRecord?.oneWordText ?? '');
    setTomorrowText(initialRecord?.tomorrowText ?? '');
    setMoodCode(initialRecord?.moodCode ?? '');
    setImageUrl(initialRecord?.imageUrl ?? '');
  }, [initialRecord]);

  const handleSubmit = async () => {
    if (!currentDirection || !action.trim() || saveState !== 'idle') return;

    const payload = {
      content: action.trim(),
      oneWordText: oneWordText.trim() || undefined,
      tomorrowText: tomorrowText.trim() || undefined,
      moodCode: moodCode || undefined,
      imageUrl: imageUrl || undefined,
    };

    const localCreatedAt = initialRecord?.date ?? new Date().toISOString();
    const savedPathId = initialRecord?.pathId ?? currentDirection.id;

    // 1) 물방울 오버레이 등장
    setSaveState('animating');

    let savedRecord: RecordType = initialRecord
      ? {
          ...initialRecord,
          pathId: savedPathId,
          directionQuestion: currentDirection.question,
          action: payload.content,
          oneWordText: payload.oneWordText,
          tomorrowText: payload.tomorrowText,
          moodCode: payload.moodCode,
          imageUrl: payload.imageUrl,
        }
      : {
          id: createLogId(),
          pathId: savedPathId,
          date: localCreatedAt,
          timestamp: new Date(localCreatedAt).getTime(),
          directionQuestion: currentDirection.question,
          action: payload.content,
          oneWordText: payload.oneWordText,
          tomorrowText: payload.tomorrowText,
          moodCode: payload.moodCode,
          imageUrl: payload.imageUrl,
          isShared: false,
        };
    const token = state.auth?.token;

    if (state.auth?.isLoggedIn && token) {
      try {
        if (isEditing && initialRecord) {
          const recordId = Number(initialRecord.id);
          if (!Number.isInteger(recordId)) {
            throw new Error('수정할 기록 정보를 찾지 못했습니다.');
          }

          const response = await recordApi.update(token, recordId, payload);
          savedRecord = {
            ...initialRecord,
            pathId: savedPathId,
            directionQuestion: currentDirection.question,
            action: response.content,
            oneWordText: response.oneWordText ?? undefined,
            tomorrowText: response.tomorrowText ?? undefined,
            moodCode: response.moodCode ?? undefined,
            imageUrl: response.imageUrl ?? undefined,
            isShared: response.visibility === 'PUBLIC',
          };
        } else {
          const response = await recordApi.create(token, {
            ...payload,
            visibility: 'PRIVATE',
          });
          savedRecord = {
            id: String(response.id),
            pathId: String(response.pathId),
            date: response.createdAt,
            timestamp: new Date(response.createdAt).getTime(),
            directionQuestion: response.directionText || currentDirection.question,
            action: response.content,
            oneWordText: response.oneWordText ?? undefined,
            tomorrowText: response.tomorrowText ?? undefined,
            moodCode: response.moodCode ?? undefined,
            imageUrl: response.imageUrl ?? undefined,
            isShared: response.visibility === 'PUBLIC',
          };
        }
      } catch (error) {
        setSaveState('idle');
        setNoticeMessage(error instanceof Error ? error.message : '기록 저장에 실패했습니다.');
        return;
      }
    }

    // 2) 1.4s 후 페이드아웃 시작
    setTimeout(() => {
      setSaveState('leaving');
    }, 1400);

    // 3) 페이드아웃 완료(0.35s) 후 실제 저장
    setTimeout(() => {
      onSave(savedRecord);
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
  const mascotTone: CharacterTone = (MOOD_STICKERS.some((sticker) => sticker.code === moodCode) ? moodCode : 'default') as CharacterTone;

  if (!currentDirection) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col animate-fade-in backdrop-blur-xl" style={{ background: theme === 'dark' ? 'rgba(15,23,42,0.95)' : 'rgba(232,237,242,0.95)' }}>
        <div className="sticky top-0 bg-transparent p-4 flex justify-between items-center z-10 pt-6">
          <button onClick={onCancel} className="p-3 rounded-full transition-colors shadow-sm" style={{ background: palette.pillBg, color: palette.mutedText, border: `1px solid ${palette.pillBorder}` }}>
            <X size={20} />
          </button>
          <div className="flex flex-col items-center">
             <span className="text-point-500 text-[10px] font-bold tracking-[0.2em] uppercase">Direction Required</span>
             <span className="text-[10px]" style={{ color: palette.faintText }}>먼저 방향이 필요해요</span>
          </div>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 px-6 flex items-center justify-center">
          <div className="w-full max-w-sm rounded-[2rem] border p-7 text-center shadow-sm" style={{ background: palette.cardBgStrong, borderColor: palette.border }}>
            <h2 className="text-lg font-bold leading-tight" style={{ color: palette.strongText }}>기록하려면 먼저 방향을 시작해 주세요.</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: palette.mutedText }}>
              지금은 쉬는 상태예요. 원할 때 새 방향을 만들고 다시 기록을 이어갈 수 있어요.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <SoftButton onClick={onStartDirection} className="shadow-lg shadow-point-200/40">
                <span>새 방향 시작하기</span>
              </SoftButton>
              <SoftButton variant="secondary" onClick={onCancel} style={{ background: palette.cardBgSoft, borderColor: palette.border, color: palette.strongText }}>
                <span>돌아가기</span>
              </SoftButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="absolute inset-0 z-50 flex flex-col animate-fade-in backdrop-blur-xl" style={{ background: theme === 'dark' ? 'rgba(15,23,42,0.95)' : 'rgba(232,237,242,0.95)' }}>
      {/* Header */}
      <div className="sticky top-0 bg-transparent p-4 flex justify-between items-center z-10 pt-6">
        <button onClick={onCancel} className="p-3 rounded-full transition-colors shadow-sm" style={{ background: palette.pillBg, color: palette.mutedText, border: `1px solid ${palette.pillBorder}` }}>
          <X size={20} />
        </button>
        <div className="flex flex-col items-center">
             <span className="text-point-500 text-[10px] font-bold tracking-[0.2em] uppercase">Today's Log</span>
             <span className="text-[10px]" style={{ color: palette.faintText }}>{isEditing ? '오늘 기록 수정' : '새로운 기록'}</span>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 px-5 py-4 max-w-md mx-auto w-full flex flex-col gap-6 overflow-y-auto no-scrollbar">
        
        {/* Context: Current Direction */}
        <div className="text-center pb-2">
           <h2 className="text-sm font-medium" style={{ color: palette.mutedText }}>
             {currentDirection.question}
           </h2>
        </div>

        {/* 1. Mood Sticker Picker */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
           <label className="block text-[11px] font-bold mb-3 ml-1 text-center uppercase tracking-wide" style={{ color: palette.faintText }}>오늘의 기분</label>
           <div className="flex flex-wrap justify-center gap-2 p-4 rounded-3xl border shadow-sm" style={{ background: palette.cardBg, borderColor: palette.border }}>
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
        <div className="animate-slide-up rounded-3xl p-6 shadow-sm border" style={{ animationDelay: '0.2s', background: palette.cardBgStrong, borderColor: palette.border }}>
          <label className="block text-sm text-point-600 mb-4 ml-1 font-bold leading-relaxed">
            {isEditing ? '오늘의 장면을 다듬어볼까요?' : '오늘의 장면을 남겨볼까요?'}
          </label>
          <AutoTextArea 
            rows={3}
            placeholder="기억에 남는 순간이나 한 일을 편하게 적어주세요."
            value={action}
            onChange={(e) => setAction(e.target.value)}
            autoFocus
            className="!p-4 !rounded-xl focus:!ring-1 focus:!ring-point-200 text-sm transition-shadow"
            style={{ background: palette.cardBgSoft, border: `1px solid ${palette.border}`, color: palette.strongText } as React.CSSProperties}
          />
        </div>

        {/* 3. One Word */}
        <div className="animate-slide-up rounded-3xl p-6 shadow-sm border" style={{ animationDelay: '0.3s', background: palette.cardBgStrong, borderColor: palette.border }}>
          <label className="block text-sm text-point-600 mb-4 ml-1 font-bold leading-relaxed">
            오늘을 한 단어로 표현한다면?
          </label>
          <input 
            type="text"
            placeholder="다짐, 평온, 위로 등..."
            value={oneWordText}
            onChange={(e) => setOneWordText(e.target.value)}
            className="w-full p-4 rounded-xl focus:ring-1 focus:ring-point-200 transition-shadow text-sm outline-none"
            style={{ background: palette.cardBgSoft, border: `1px solid ${palette.border}`, color: palette.strongText }}
          />
        </div>

        {/* 4. Tomorrow Step & Image */}
        <div className="animate-slide-up rounded-3xl p-6 shadow-sm border flex flex-col gap-6" style={{ animationDelay: '0.4s', background: palette.cardBgStrong, borderColor: palette.border }}>
             
             <div>
                <label className="block text-xs font-bold mb-3 ml-1" style={{ color: palette.mutedText }}>내일은 무엇을 해볼까요? <span style={{ color: palette.faintText, fontWeight: 400 }}>(선택)</span></label>
                <input 
                    type="text"
                    placeholder="내일의 작은 목표나 계획을 적어보세요."
                    value={tomorrowText}
                    onChange={(e) => setTomorrowText(e.target.value)}
                    className="w-full p-4 rounded-xl focus:ring-1 focus:ring-mist-200 text-sm outline-none transition-shadow"
                    style={{ background: palette.cardBgSoft, border: `1px solid ${palette.border}`, color: palette.strongText }}
                />
             </div>

             <div>
                <label className="block text-xs font-bold mb-3 ml-1" style={{ color: palette.mutedText }}>오늘의 사진 한 장 <span style={{ color: palette.faintText, fontWeight: 400 }}>(선택)</span></label>
                {imageUrl ? (
                    <div className="relative group w-full aspect-video">
                        <img src={imageUrl} alt="Uploaded scene" className="w-full h-full object-cover rounded-xl shadow-sm border" style={{ borderColor: palette.border }} />
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
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-xl hover:text-point-500 hover:border-point-300 transition-all"
                        style={{ borderColor: palette.border, color: palette.mutedText, background: palette.cardBgSoft }}
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
      <div
        className="absolute bottom-0 left-0 w-full flex justify-center z-20 pb-[env(safe-area-inset-bottom)]"
        style={{
          backgroundImage:
            theme === 'dark'
              ? 'linear-gradient(to top, rgba(15,23,42,1), rgba(15,23,42,0.92), transparent)'
              : 'linear-gradient(to top, rgba(232,237,242,1), rgba(232,237,242,0.9), transparent)',
        }}
      >
        <div className="w-full max-w-md px-6 pb-8 pt-8">
            <SoftButton
              onClick={handleSubmit}
              disabled={!action.trim() || isSaving}
              className={`shadow-xl transition-all duration-300 shadow-point-200/50 py-4 text-base font-bold`}
            >
              <Check size={20} />
              <span>{isEditing ? '수정 저장하기' : '흔적 남기기'}</span>
            </SoftButton>
        </div>
      </div>

        {/* Water Drop Micro-interaction */}
        {isSaving && (
          <WaterDropOverlay leaving={saveState === 'leaving'} mood={mascotTone} />
        )}
      </div>

      <AppModal
        open={noticeMessage !== null}
        icon={<AlertCircle size={22} />}
        title="기록을 저장하지 못했어요"
        description={noticeMessage ?? ''}
        confirmLabel="확인"
        hideCancel
        confirmVariant="danger"
        onClose={() => setNoticeMessage(null)}
        onConfirm={() => setNoticeMessage(null)}
      />
    </>
  );
};
