import React, { useEffect, useRef, useState } from 'react';
import { AppState, Record as RecordType, Direction } from '../types';
import { createLogId } from '../storage';
import { SoftButton, AutoTextArea, WaterDropOverlay } from '../components/UI';
import { X, Check, AlertCircle } from 'lucide-react';
import { MOOD_STICKERS } from '../constants';
import { CharacterTone } from '../components/WaterDropCharacter';
import { useResolvedTheme } from '../theme';
import { recordApi } from '../api/recordApi';
import type { RecordImageAction } from '../api/recordApi';
import type { ApiErrorWithStatus } from '../api/apiClient';
import { AppModal } from '../components/AppModal';
import { RecordImageEditor } from '../components/RecordImageEditor';
import { prepareRecordImage } from '../utils/recordImage';

interface DailyRecordEditorViewProps {
  state: AppState;
  initialRecord?: RecordType | null;
  onSave: (record: RecordType, directionUpdate?: Partial<Direction>) => void;
  onCancel: () => void;
  onStartDirection: () => void;
  onExpiredDirectionRequired?: () => void;
}

const MOOD_CHIP: Record<string, { bg: string; border: string; text: string }> = {
  '포근': { bg: '#FAF5FF', border: '#DDD6FE', text: '#7C3AED' },
  '멍함': { bg: '#F8FAFC', border: '#E4E7EB', text: '#616E7C' },
  '반짝': { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  '잔잔': { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  '버팀': { bg: '#ECFDF5', border: '#BBF7D0', text: '#047857' },
  '두근': { bg: '#FFF1F2', border: '#FECDD3', text: '#E11D48' },
};

const GLASS_CARD_LIGHT = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 100%)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(82,96,109,0.04), 0 12px 32px -16px rgba(82,96,109,0.18)',
  borderColor: 'rgba(255,255,255,0.7)',
};

export const DailyRecordEditorView: React.FC<DailyRecordEditorViewProps> = ({
  state,
  initialRecord = null,
  onSave,
  onCancel,
  onStartDirection,
  onExpiredDirectionRequired,
}) => {
  const theme = useResolvedTheme();
  const [action, setAction] = useState('');
  const [oneWordText, setOneWordText] = useState('');
  const [tomorrowText, setTomorrowText] = useState('');
  const [moodCode, setMoodCode] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAction, setImageAction] = useState<RecordImageAction>('KEEP');
  const [imagePositionX, setImagePositionX] = useState(50);
  const [imagePositionY, setImagePositionY] = useState(50);
  const [imageScale, setImageScale] = useState(1);
  const [isPreparingImage, setIsPreparingImage] = useState(false);

  const [saveState, setSaveState] = useState<'idle' | 'animating' | 'leaving'>('idle');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const { currentDirection } = state;
  const isEditing = initialRecord !== null;

  useEffect(() => {
    setAction(initialRecord?.action ?? '');
    setOneWordText(initialRecord?.oneWordText ?? '');
    setTomorrowText(initialRecord?.tomorrowText ?? '');
    setMoodCode(initialRecord?.moodCode ?? '');
    setImageUrl(initialRecord?.imageUrl ?? '');
    setImageFile(null);
    setImageAction('KEEP');
    setImagePositionX(initialRecord?.imagePositionX ?? 50);
    setImagePositionY(initialRecord?.imagePositionY ?? 50);
    setImageScale(initialRecord?.imageScale ?? 1);
  }, [initialRecord]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current && state.auth?.isLoggedIn) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
  }, [state.auth?.isLoggedIn]);

  const replacePreviewUrl = (nextUrl: string | null) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    previewObjectUrlRef.current = nextUrl;
  };

  const handleImageSelect = async (file: File) => {
    setIsPreparingImage(true);
    try {
      const preparedFile = await prepareRecordImage(file);
      const nextPreviewUrl = URL.createObjectURL(preparedFile);
      replacePreviewUrl(nextPreviewUrl);
      setImageFile(preparedFile);
      setImageUrl(nextPreviewUrl);
      setImageAction('REPLACE');
      setImagePositionX(50);
      setImagePositionY(50);
      setImageScale(1);
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleImageRemove = () => {
    replacePreviewUrl(null);
    setImageFile(null);
    setImageUrl('');
    setImageAction(initialRecord?.imageUrl ? 'REMOVE' : 'KEEP');
    setImagePositionX(50);
    setImagePositionY(50);
    setImageScale(1);
  };

  const handleSubmit = async () => {
    if (!currentDirection || !action.trim() || saveState !== 'idle') return;

    const payload = {
      content: action.trim(),
      oneWordText: oneWordText.trim() || undefined,
      tomorrowText: tomorrowText.trim() || undefined,
      moodCode: moodCode || undefined,
      imagePositionX: imageUrl ? imagePositionX : undefined,
      imagePositionY: imageUrl ? imagePositionY : undefined,
      imageScale: imageUrl ? imageScale : undefined,
    };

    const localCreatedAt = initialRecord?.date ?? new Date().toISOString();
    const savedPathId = initialRecord?.pathId ?? currentDirection.id;

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
          imageUrl: imageUrl || undefined,
          imagePositionX: imageUrl ? imagePositionX : undefined,
          imagePositionY: imageUrl ? imagePositionY : undefined,
          imageScale: imageUrl ? imageScale : undefined,
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
          imageUrl: imageUrl || undefined,
          imagePositionX: imageUrl ? imagePositionX : undefined,
          imagePositionY: imageUrl ? imagePositionY : undefined,
          imageScale: imageUrl ? imageScale : undefined,
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
          const response = await recordApi.update(
            token,
            recordId,
            { ...payload, imageAction },
            imageAction === 'REPLACE' ? imageFile : null,
          );
          savedRecord = {
            ...initialRecord,
            pathId: savedPathId,
            directionQuestion: currentDirection.question,
            action: response.content,
            oneWordText: response.oneWordText ?? undefined,
            tomorrowText: response.tomorrowText ?? undefined,
            moodCode: response.moodCode ?? undefined,
            imageUrl: response.imageUrl ?? undefined,
            imagePositionX: response.imagePositionX ?? undefined,
            imagePositionY: response.imagePositionY ?? undefined,
            imageScale: response.imageScale ?? undefined,
            isShared: response.visibility === 'PUBLIC',
          };
        } else {
          const response = await recordApi.create(
            token,
            { ...payload, visibility: 'PRIVATE' },
            imageFile,
          );
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
            imagePositionX: response.imagePositionX ?? undefined,
            imagePositionY: response.imagePositionY ?? undefined,
            imageScale: response.imageScale ?? undefined,
            isShared: response.visibility === 'PUBLIC',
          };
        }
      } catch (error) {
        setSaveState('idle');
        if ((error as ApiErrorWithStatus | undefined)?.code === 'PATH_REVIEW_REQUIRED') {
          onExpiredDirectionRequired?.();
          return;
        }
        setNoticeMessage(error instanceof Error ? error.message : '기록 저장에 실패했습니다.');
        return;
      }
    }

    setTimeout(() => setSaveState('leaving'), 1400);
    setTimeout(() => onSave(savedRecord), 1750);
  };

  const isSaving = saveState !== 'idle' || isPreparingImage;
  const hasRecordText = action.trim().length > 0;
  const hasMoodAndRecord = hasRecordText && moodCode.length > 0;
  const mascotTone: CharacterTone = (MOOD_STICKERS.some((s) => s.code === moodCode) ? moodCode : 'default') as CharacterTone;

  const cardStyle = theme === 'dark'
    ? { background: 'rgba(30,41,59,0.82)', borderColor: 'rgba(51,65,85,0.6)' }
    : GLASS_CARD_LIGHT;

  const inputStyle: React.CSSProperties = theme === 'dark'
    ? { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.6)', color: '#e2e8f0' }
    : { background: '#F8FAFC', border: '1px solid transparent', color: '#52606D', borderRadius: 14, padding: '14px 16px', fontSize: 14 };

  if (!currentDirection) {
    return (
      <div
        className="absolute inset-0 z-50 flex flex-col animate-fade-in"
        style={{
          background:
            theme === 'dark'
              ? 'rgba(15,23,42,0.95)'
              : 'radial-gradient(circle at -20% -10%, rgba(194,209,255,0.55) 0%, rgba(194,209,255,0) 60%), radial-gradient(circle at 120% 110%, rgba(178,223,219,0.45) 0%, rgba(178,223,219,0) 60%), linear-gradient(180deg, #ECEFFE 0%, #E2EEEC 100%)',
        }}
      >
        <div className="sticky top-0 bg-transparent p-4 flex justify-between items-center z-10 pt-6">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full grid place-items-center shadow-sm border"
            style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.9)', color: '#7B8794' }}
          >
            <X size={18} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-point-500 text-[10px] font-bold tracking-[0.24em]">TODAY'S LOG</span>
            <span className="text-mist-400 text-[10px] mt-0.5">방향이 필요해요</span>
          </div>
          <div className="w-10" />
        </div>
        <div className="flex-1 px-6 flex items-center justify-center">
          <div
            className="w-full max-w-sm rounded-[2rem] border p-7 text-center"
            style={cardStyle}
          >
            <h2 className="text-lg font-bold leading-tight text-mist-600">기록하려면 먼저 방향을 시작해 주세요.</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist-400">
              지금은 쉬는 상태예요. 원할 때 새 방향을 만들고 다시 기록을 이어갈 수 있어요.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <SoftButton onClick={onStartDirection} className="shadow-lg shadow-point-200/40">
                <span>새 방향 시작하기</span>
              </SoftButton>
              <SoftButton variant="secondary" onClick={onCancel}>
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
      <div
        className="absolute inset-0 z-50 flex flex-col animate-fade-in"
        style={{
          background:
            theme === 'dark'
              ? 'rgba(15,23,42,0.95)'
              : 'radial-gradient(circle at -20% -10%, rgba(194,209,255,0.55) 0%, rgba(194,209,255,0) 60%), radial-gradient(circle at 120% 110%, rgba(178,223,219,0.45) 0%, rgba(178,223,219,0) 60%), linear-gradient(180deg, #ECEFFE 0%, #E2EEEC 100%)',
        }}
      >
        {/* Topbar */}
        <div className="sticky top-0 bg-transparent p-4 flex justify-between items-center z-10 pt-6">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full grid place-items-center shadow-sm border"
            style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.9)', color: '#7B8794' }}
          >
            <X size={18} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-point-500 text-[10px] font-bold tracking-[0.24em]">TODAY'S LOG</span>
            <span className="text-mist-400 text-[10px] mt-0.5">{isEditing ? '기록 수정' : '새로운 기록'}</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Direction context pill */}
        <div className="mt-2 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border"
            style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.9)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-point-400" />
            <span className="text-[12px] font-semibold text-mist-500">{currentDirection.description || currentDirection.question}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-5 pt-4 pb-6 max-w-md mx-auto w-full flex flex-col gap-4 overflow-y-auto no-scrollbar">

          {/* 01 · MOOD */}
          <div className="animate-slide-up rounded-[24px] p-5 border" style={{ ...cardStyle, animationDelay: '0.05s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-3.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #C4B5FD, #A78BFA)' }} />
                <span className="text-[13px] font-bold text-mist-600">오늘의 기분</span>
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-point-400">01 · MOOD</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {MOOD_STICKERS.map((s) => {
                const tone = MOOD_CHIP[s.code];
                const selected = moodCode === s.code;
                return (
                  <button
                    key={s.code}
                    onClick={() => setMoodCode(selected ? '' : s.code)}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-bold border-[1.5px] transition-all"
                    style={{
                      background: tone ? tone.bg : '#F8FAFC',
                      borderColor: tone ? tone.border : '#E4E7EB',
                      color: tone ? tone.text : '#616E7C',
                      transform: selected ? 'translateY(-1px) rotate(-1deg)' : undefined,
                      boxShadow: selected ? '0 4px 10px -2px rgba(139,92,246,0.18)' : undefined,
                    }}
                  >
                    {s.code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 02 · SCENE */}
          <div className="animate-slide-up rounded-[24px] p-5 border" style={{ ...cardStyle, animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-3.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #C4B5FD, #A78BFA)' }} />
                <span className="text-[14px] font-bold text-mist-600">
                  오늘의 기록
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-point-400">02 · RECORD</span>
            </div>
            <AutoTextArea
              rows={3}
              placeholder={'기억에 남는 순간이나 오늘의 흐름을 편하게 적어주세요.\n엔터로 문단을 나누면 그대로 보여줘요.'}
              value={action}
              onChange={(e) => setAction(e.target.value)}
              autoFocus
              className="w-full min-h-[88px] resize-none leading-[1.7] rounded-[14px] !p-4 focus:!ring-1 focus:!ring-point-200 text-sm transition-shadow outline-none"
              style={inputStyle}
            />
            <p className="text-[11px] text-mist-400 mt-3 pl-[13px]">줄을 나누면 카드와 상세 화면에서도 그대로 보여줘요.</p>
          </div>

          {/* 03 · WORD */}
          <div className="animate-slide-up rounded-[24px] p-5 border" style={{ ...cardStyle, animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-3.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #C4B5FD, #A78BFA)' }} />
                <span className="text-[14px] font-bold text-mist-600">오늘의 한 단어</span>
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-point-400">03 · WORD</span>
            </div>
            <input
              type="text"
              placeholder="다짐, 평온, 위로 등…"
              value={oneWordText}
              onChange={(e) => setOneWordText(e.target.value)}
              className="w-full rounded-[14px] !p-4 focus:ring-1 focus:ring-point-200 text-sm outline-none transition-shadow"
              style={inputStyle}
            />
          </div>

          {/* 04 · OPTIONAL */}
          <div className="animate-slide-up rounded-[24px] p-5 border" style={{ ...cardStyle, animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-3.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #C4B5FD, #A78BFA)' }} />
                <span className="text-[13px] font-bold text-mist-600">내일의 메모</span>
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-point-400">04 · MEMO</span>
            </div>
            <p className="text-[11px] text-mist-400 mb-3 pl-[13px]">선택 사항이에요. 부담 없이 적어보세요.</p>
            <input
              type="text"
              placeholder="내일의 작은 목표나 기억하고 싶은 메모를 적어보세요."
              value={tomorrowText}
              onChange={(e) => setTomorrowText(e.target.value)}
              className="w-full rounded-[14px] !p-4 focus:ring-1 focus:ring-mist-200 text-sm outline-none transition-shadow mb-4"
              style={inputStyle}
            />

            <label className="block text-[11px] font-bold text-mist-500 mb-2 pl-[13px] tracking-wide">오늘의 사진 한 장</label>
            <RecordImageEditor
              imageUrl={imageUrl}
              positionX={imagePositionX}
              positionY={imagePositionY}
              scale={imageScale}
              disabled={isSaving}
              onSelect={handleImageSelect}
              onRemove={handleImageRemove}
              onPositionChange={(positionX, positionY) => {
                setImagePositionX(positionX);
                setImagePositionY(positionY);
              }}
              onScaleChange={setImageScale}
              onError={setNoticeMessage}
            />
          </div>

        </div>

        {/* Floating CTA */}
        <div
          className="shrink-0 w-full z-20 pb-[env(safe-area-inset-bottom)]"
          style={{
            background:
              theme === 'dark'
                ? 'linear-gradient(to top, rgba(15,23,42,1), rgba(15,23,42,0.92), transparent)'
                : 'linear-gradient(to top, rgba(226,238,236,1), rgba(226,238,236,0.85), transparent)',
          }}
        >
          <div className="w-full max-w-md mx-auto px-6 pb-8 pt-8">
            <button
              onClick={handleSubmit}
              disabled={!hasRecordText || isSaving}
              className="w-full h-14 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 text-white transition-all disabled:opacity-50"
              style={{
                background: hasMoodAndRecord
                  ? 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)'
                  : 'linear-gradient(135deg, #D8CCFE 0%, #B79AF9 100%)',
                boxShadow: hasMoodAndRecord
                  ? '0 12px 28px -8px rgba(139,92,246,0.52)'
                  : '0 10px 24px -8px rgba(139,92,246,0.32)',
              }}
            >
              <Check size={18} />
              <span>{isEditing ? '수정 저장하기' : '흔적 남기기'}</span>
            </button>
          </div>
        </div>

        {isSaving && <WaterDropOverlay leaving={saveState === 'leaving'} mood={mascotTone} />}
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
