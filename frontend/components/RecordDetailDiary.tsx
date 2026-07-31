import React from 'react';
import { Download, PencilLine, Trash2, X } from 'lucide-react';
import { Record as RecordType, type RecordCardDisplayMode } from '../types';
import { loadImageTextTones, type ImageTextTones } from '../utils/imageContrast';
import { getRecordParagraphs } from '../utils/recordText';
import { WaterDropCharacter, type CharacterMood } from './WaterDropCharacter';
import { RecordImage } from './RecordImage';

interface Props {
  record: RecordType;
  nickname?: string;
  pageNumber?: number;
  displayMode?: RecordCardDisplayMode;
  onDisplayModeChange?: (mode: RecordCardDisplayMode) => void;
  onClose?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

const MOOD_TONE: Record<string, { bg: string; border: string; text: string }> = {
  포근: { bg: 'bg-point-50', border: 'border-point-200', text: 'text-point-600' },
  반짝: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
  잔잔: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-500' },
  버팀: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
  두근: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-500' },
  멍함: { bg: 'bg-mist-50', border: 'border-mist-200', text: 'text-mist-500' },
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);

const resolveCharacterMood = (mood?: string): CharacterMood => {
  switch (mood) {
    case '잔잔':
      return 'CALM';
    case '반짝':
      return 'SPARKLE';
    case '두근':
      return 'EXCITED';
    case '버팀':
      return 'HOLDING';
    case '멍함':
      return 'BLANK';
    case '포근':
      return 'COZY';
    default:
      return 'COZY';
  }
};

const toolbarButtonBaseClassName =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_10px_20px_-18px_rgba(82,96,109,0.45)] transition active:scale-[0.97]';
const toolbarIconClassName = 'h-[15px] w-[15px] shrink-0';
const toolbarPrimaryButtonClassName = `${toolbarButtonBaseClassName} border-point-100 bg-point-50/72 text-point-500 hover:border-point-200 hover:bg-point-50 hover:text-point-600`;
const toolbarSecondaryButtonClassName = `${toolbarButtonBaseClassName} border-white/80 bg-white/62 text-mist-500 hover:bg-white hover:text-slate-700`;
const toolbarDangerButtonClassName = `${toolbarButtonBaseClassName} border-rose-100 bg-rose-50/70 text-rose-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`;

export const RecordDetailDiary: React.FC<Props> = ({
  record,
  nickname,
  pageNumber,
  displayMode = 'diary',
  onDisplayModeChange,
  onClose,
  onEdit,
  onShare,
  onDelete,
}) => {
  const posterCardRef = React.useRef<HTMLElement>(null);
  const [photoTextTones, setPhotoTextTones] = React.useState<ImageTextTones>({
    left: 'light',
    right: 'light',
    body: 'light',
  });
  const [posterAspectRatio, setPosterAspectRatio] = React.useState(3 / 4);
  const date = new Date(record.timestamp);
  const mood = record.moodCode;
  const moodTone = mood ? MOOD_TONE[mood] : undefined;

  const hasPhoto = !!record.imageUrl;
  const hasOneWord = !!record.oneWordText?.trim();
  const hasTomorrow = !!record.tomorrowText?.trim();
  const actionParagraphs = getRecordParagraphs(record.action);
  const tomorrowParagraphs = hasTomorrow ? getRecordParagraphs(record.tomorrowText!) : [];
  const characterMood = resolveCharacterMood(mood);
  const mascotRailMoods: CharacterMood[] = [characterMood, 'COZY', 'SPARKLE', 'CALM', 'HOLDING'];
  const detailDisplayMode: RecordCardDisplayMode = hasPhoto ? displayMode : 'diary';
  const isPosterMode = hasPhoto && detailDisplayMode === 'poster';
  const leftUsesDarkText = photoTextTones.left === 'dark';
  const rightUsesDarkText = photoTextTones.right === 'dark';
  const posterUsesDarkText = photoTextTones.body === 'dark';
  const posterTextShadow = posterUsesDarkText
    ? '0 0 2px rgba(255,255,255,0.98), 0 1px 6px rgba(255,255,255,0.9), 0 3px 14px rgba(255,255,255,0.62)'
    : '0 0 2px rgba(15,23,42,0.82), 0 1px 6px rgba(15,23,42,0.68), 0 3px 14px rgba(15,23,42,0.48)';

  React.useEffect(() => {
    const card = posterCardRef.current;
    if (!isPosterMode || !card) {
      return;
    }

    const updateAspectRatio = () => {
      if (!card.clientWidth || !card.clientHeight) {
        return;
      }

      const nextRatio = Number((card.clientWidth / card.clientHeight).toFixed(3));
      setPosterAspectRatio((currentRatio) => (
        Math.abs(currentRatio - nextRatio) >= 0.01 ? nextRatio : currentRatio
      ));
    };

    updateAspectRatio();
    const observer = new ResizeObserver(updateAspectRatio);
    observer.observe(card);
    return () => observer.disconnect();
  }, [isPosterMode, record.id]);

  React.useEffect(() => {
    let cancelled = false;

    if (!record.imageUrl) {
      setPhotoTextTones({ left: 'light', right: 'light', body: 'light' });
      return () => {
        cancelled = true;
      };
    }

    setPhotoTextTones({ left: 'light', right: 'light', body: 'light' });
    loadImageTextTones(record.imageUrl, {
      positionX: record.imagePositionX,
      positionY: record.imagePositionY,
      scale: record.imageScale,
      ...(isPosterMode
        ? {
            targetAspectRatio: posterAspectRatio,
            topSampleEnd: 0.34,
            bodySampleStart: 0.48,
            bodySampleEnd: 0.96,
          }
        : {}),
    })
      .then((tones) => {
        if (!cancelled) {
          setPhotoTextTones(tones);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhotoTextTones({ left: 'light', right: 'light', body: 'light' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isPosterMode,
    posterAspectRatio,
    record.imagePositionX,
    record.imagePositionY,
    record.imageScale,
    record.imageUrl,
  ]);

  const cardSurfaceStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.74) 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.94), 0 2px 6px rgba(82,96,109,0.05), 0 18px 36px -22px rgba(82,96,109,0.22)',
  };
  const posterCardStyle: React.CSSProperties = {
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.74), 0 2px 6px rgba(82,96,109,0.06), 0 18px 36px -22px rgba(82,96,109,0.28)',
  };
  const diaryPhotoSurfaceStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,255,0.96) 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.96), 0 2px 6px rgba(82,96,109,0.06), 0 18px 36px -22px rgba(82,96,109,0.22)',
  };

  const defaultSectionLabelClassName = 'text-[10px] font-bold tracking-[0.12em] text-mist-400';

  return (
    <div
      className="fixed inset-y-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 flex-col overflow-y-auto"
      style={{
        background:
          'radial-gradient(circle at -30% -25%, rgba(194,209,255,0.44) 0%, rgba(194,209,255,0) 62%),' +
          'radial-gradient(circle at 130% 120%, rgba(178,223,219,0.43) 0%, rgba(178,223,219,0) 62%),' +
          'linear-gradient(180deg, #ECEFFE 0%, #E2EEEC 100%)',
      }}
    >
      <header
        className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 px-5 py-3"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'linear-gradient(180deg, rgba(236,239,254,0.95) 0%, rgba(236,239,254,0.85) 100%)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {onShare && (
            <button
              onClick={onShare}
              className={toolbarPrimaryButtonClassName}
              title="카드 저장"
              aria-label="카드 저장"
            >
              <Download className={toolbarIconClassName} strokeWidth={2.2} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className={toolbarSecondaryButtonClassName}
              title="편집"
              aria-label="편집"
            >
              <PencilLine className={toolbarIconClassName} strokeWidth={2.2} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className={toolbarDangerButtonClassName}
              title="삭제하기"
              aria-label="삭제하기"
            >
              <Trash2 className={toolbarIconClassName} strokeWidth={2.2} />
            </button>
          )}
          <button
            onClick={onClose}
            className={toolbarSecondaryButtonClassName}
            title="닫기"
            aria-label="닫기"
          >
            <X className={toolbarIconClassName} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <div
        className={[
          'relative flex flex-1 flex-col justify-start overflow-x-hidden px-5 pb-8',
          hasPhoto ? 'pt-4' : 'pt-10',
        ].join(' ')}
      >
        <div className="mx-auto mt-6 flex w-full max-w-[640px] flex-col">
          <div className="relative mb-5 flex items-center justify-between min-h-[36px]">
            <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-mist-400">
              RECORD · {String(pageNumber ?? 1).padStart(3, '0')}
            </span>
            {hasPhoto && onDisplayModeChange && (
              <div className="inline-flex items-center rounded-full border border-white/70 bg-white/62 p-0.5 shadow-[0_8px_18px_-14px_rgba(82,96,109,0.35)] backdrop-blur-sm">
                <button
                  onClick={() => onDisplayModeChange('poster')}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                    detailDisplayMode === 'poster'
                      ? 'bg-point-500 text-white shadow-[0_4px_10px_-4px_rgba(139,92,246,0.35)]'
                      : 'text-mist-500 hover:bg-white/80'
                  }`}
                >
                  포스터형
                </button>
                <button
                  onClick={() => onDisplayModeChange('diary')}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                    detailDisplayMode === 'diary'
                      ? 'bg-point-500 text-white shadow-[0_4px_10px_-4px_rgba(139,92,246,0.35)]'
                      : 'text-mist-500 hover:bg-white/80'
                  }`}
                >
                  기록형
                </button>
              </div>
            )}
          </div>

          <div className="relative z-10">
            {isPosterMode ? (
              <article
                ref={posterCardRef}
                className="relative overflow-hidden rounded-[26px] border border-white/85"
                style={posterCardStyle}
              >
                <RecordImage record={record} alt="기록 사진" className="absolute inset-0 h-full w-full" />
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-x-0 top-0 flex items-end justify-between px-6 pb-[18px] pt-6">
                    <div
                      className={leftUsesDarkText ? 'text-slate-900' : 'text-white'}
                      style={{
                        textShadow: leftUsesDarkText
                          ? '0 1px 3px rgba(255,255,255,0.72)'
                          : '0 1px 3px rgba(15,23,42,0.48)',
                      }}
                    >
                      <p className={`mb-1 font-mono text-[10px] font-bold tracking-[0.2em] ${
                        leftUsesDarkText ? 'text-slate-700/80' : 'text-white/92'
                      }`}>
                        {WEEKDAYS[date.getDay()]} · {MONTHS[date.getMonth()]}
                      </p>
                      <p className={`text-[46px] font-extrabold leading-[0.9] tracking-[-0.03em] ${
                        leftUsesDarkText ? 'text-slate-900' : 'text-white'
                      }`}>
                        {String(date.getDate()).padStart(2, '0')}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2.5">
                      <span
                        className={`text-center font-mono text-[10px] tracking-wider ${
                          rightUsesDarkText ? 'text-slate-700' : 'text-white'
                        }`}
                        style={{
                          textShadow: rightUsesDarkText
                            ? '0 1px 3px rgba(255,255,255,0.72)'
                            : '0 1px 3px rgba(15,23,42,0.48)',
                        }}
                      >
                        {fmtTime(date)}
                      </span>
                      {mood && (
                        <span className={`inline-flex items-center justify-center rounded-xl border-[1.5px] px-3 py-1.5 backdrop-blur-sm ${
                          rightUsesDarkText
                            ? 'border-slate-900/10 bg-white/[0.52]'
                            : 'border-white/[0.42] bg-slate-950/[0.12]'
                        }`}>
                          <span className={`text-xs font-bold leading-none ${
                            rightUsesDarkText ? 'text-slate-800' : 'text-white'
                          }`}>
                            {mood}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative px-6 pb-6 pt-9">
                  <p
                    className={`mb-5 text-center text-[10px] font-bold tracking-[0.12em] ${
                      posterUsesDarkText ? 'text-slate-700/70' : 'text-white/70'
                    }`}
                    style={{ textShadow: posterTextShadow }}
                  >
                    오늘의 기록
                  </p>
                  <div className="space-y-[18px] text-center">
                    {actionParagraphs.map((paragraph, index) => (
                      <p
                        key={`${record.id}-poster-action-${index}`}
                        className={`whitespace-pre-line text-[20px] font-bold leading-[1.72] tracking-[-0.01em] ${
                          posterUsesDarkText ? 'text-slate-900' : 'text-white'
                        }`}
                        style={{ textShadow: posterTextShadow }}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {hasOneWord && (
                    <div className="mt-8 flex justify-center">
                      <div className="flex items-center gap-[10px] rounded-full border border-point-100/80 bg-point-50/55 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <span className={defaultSectionLabelClassName}>한 단어</span>
                        <span className="h-px w-[14px] bg-mist-200" />
                        <span className="text-[18px] font-semibold italic tracking-[-0.01em] text-point-600">
                          "{record.oneWordText}"
                        </span>
                      </div>
                    </div>
                  )}

                  {hasTomorrow && (
                    <div className={`mt-8 border-t pt-5 text-center ${
                      posterUsesDarkText ? 'border-slate-900/10' : 'border-white/14'
                    }`}>
                      <p className={`mb-3 text-[10px] font-bold tracking-[0.12em] ${
                        posterUsesDarkText ? 'text-slate-700/70' : 'text-white/68'
                      }`}>내일의 메모</p>
                      <div className="space-y-2">
                        {tomorrowParagraphs.map((paragraph, index) => (
                          <p
                            key={`${record.id}-poster-tomorrow-${index}`}
                            className={`whitespace-pre-line text-[13px] font-medium leading-[1.7] tracking-[-0.01em] ${
                              posterUsesDarkText ? 'text-slate-700/80' : 'text-white/78'
                            }`}
                            style={{ textShadow: posterTextShadow }}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-7 flex items-center justify-between">
                    <span className={`font-mono text-[9px] tracking-[0.2em] ${
                      posterUsesDarkText ? 'text-slate-700/55' : 'text-white/38'
                    }`}>{nickname ? `— ${nickname}` : ''}</span>
                    <span className={`font-mono text-[9px] tracking-[0.2em] ${
                      posterUsesDarkText ? 'text-slate-700/60' : 'text-white/46'
                    }`}>
                      pg.{String(pageNumber ?? 1).padStart(3, '0')}
                    </span>
                  </div>
                </div>
              </article>
            ) : hasPhoto ? (
              <article className="overflow-hidden rounded-[26px] border border-white/85" style={diaryPhotoSurfaceStyle}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <RecordImage record={record} alt="기록 사진" className="h-full w-full" />
                  <div className="absolute inset-x-0 top-0 flex items-end justify-between px-6 pb-[18px] pt-6">
                    <div
                      className={leftUsesDarkText ? 'text-slate-900' : 'text-white'}
                      style={{
                        textShadow: leftUsesDarkText
                          ? '0 1px 3px rgba(255,255,255,0.72)'
                          : '0 1px 3px rgba(15,23,42,0.48)',
                      }}
                    >
                      <p className={`mb-1 font-mono text-[10px] font-bold tracking-[0.2em] ${
                        leftUsesDarkText ? 'text-slate-700/80' : 'text-white/92'
                      }`}>
                        {WEEKDAYS[date.getDay()]} · {MONTHS[date.getMonth()]}
                      </p>
                      <p className={`text-[46px] font-extrabold leading-[0.9] tracking-[-0.03em] ${
                        leftUsesDarkText ? 'text-slate-900' : 'text-white'
                      }`}>
                        {String(date.getDate()).padStart(2, '0')}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2.5">
                      <span
                        className={`text-center font-mono text-[10px] tracking-wider ${
                          rightUsesDarkText ? 'text-slate-700' : 'text-white'
                        }`}
                        style={{
                          textShadow: rightUsesDarkText
                            ? '0 1px 3px rgba(255,255,255,0.72)'
                            : '0 1px 3px rgba(15,23,42,0.48)',
                        }}
                      >
                        {fmtTime(date)}
                      </span>
                      {mood && (
                        <span className={`inline-flex items-center justify-center rounded-xl border-[1.5px] px-3 py-1.5 backdrop-blur-sm ${
                          rightUsesDarkText
                            ? 'border-slate-900/10 bg-white/[0.52]'
                            : 'border-white/[0.42] bg-slate-950/[0.12]'
                        }`}>
                          <span className={`text-xs font-bold leading-none ${
                            rightUsesDarkText ? 'text-slate-800' : 'text-white'
                          }`}>
                            {mood}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative px-6 pb-6 pt-9">
                  <div aria-hidden className="pointer-events-none absolute right-8 top-7 opacity-[0.08]">
                    <WaterDropCharacter size={74} mood={characterMood} animate={false} />
                  </div>

                  <p className="mb-5 text-center text-[10px] font-bold tracking-[0.12em] text-mist-400">오늘의 기록</p>
                  <div className="space-y-[18px] text-center">
                    {actionParagraphs.map((paragraph, index) => (
                      <p
                        key={`${record.id}-action-${index}`}
                        className="whitespace-pre-line text-[20px] font-bold leading-[1.72] tracking-[-0.01em] text-slate-800"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {hasOneWord && (
                    <div className="mt-8 flex justify-center">
                      <div className="flex items-center gap-[10px] rounded-full border border-point-100/80 bg-point-50/55 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <span className={defaultSectionLabelClassName}>한 단어</span>
                        <span className="h-px w-[14px] bg-mist-200" />
                        <span className="text-[18px] font-semibold italic tracking-[-0.01em] text-point-600">
                          "{record.oneWordText}"
                        </span>
                      </div>
                    </div>
                  )}

                  {hasTomorrow && (
                    <div className="mt-8 border-t border-mist-200/60 pt-5 text-center">
                      <p className="mb-3 text-[10px] font-bold tracking-[0.12em] text-mist-400">내일의 메모</p>
                      <div className="space-y-2">
                        {tomorrowParagraphs.map((paragraph, index) => (
                          <p
                            key={`${record.id}-tomorrow-${index}`}
                            className="whitespace-pre-line text-[13px] font-medium leading-[1.7] tracking-[-0.01em] text-mist-500"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-7 flex items-center justify-between">
                    <span className="font-mono text-[9px] tracking-[0.2em] text-mist-300">{nickname ? `— ${nickname}` : ''}</span>
                    <span className="font-mono text-[9px] tracking-[0.2em] text-mist-400">
                      pg.{String(pageNumber ?? 1).padStart(3, '0')}
                    </span>
                  </div>
                </div>
              </article>
            ) : (
              <article className="overflow-hidden rounded-[26px] border border-white/85" style={cardSurfaceStyle}>
                <div className="flex items-end justify-between px-6 pb-[18px] pt-6">
                  <div>
                    <p className="mb-1 font-mono text-[10px] font-bold tracking-[0.2em] text-mist-500">
                      {WEEKDAYS[date.getDay()]} · {MONTHS[date.getMonth()]}
                    </p>
                    <p className="text-[46px] font-extrabold leading-[0.9] tracking-[-0.03em] text-slate-800">
                      {String(date.getDate()).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <span className="font-mono text-[10px] tracking-wider text-center text-mist-400">{fmtTime(date)}</span>
                    {moodTone && mood && (
                      <span className={`inline-flex items-center justify-center rounded-xl border-[1.5px] px-3 py-1.5 ${moodTone.bg} ${moodTone.border}`}>
                        <span className={`text-xs font-bold leading-none ${moodTone.text}`}>{mood}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative px-8 pb-8 pt-4">
                  <div
                    aria-hidden
                    className="absolute left-1/2 top-6 h-[180px] w-[180px] -translate-x-1/2 rounded-full blur-3xl"
                    style={{ background: 'rgba(196,181,253,0.18)' }}
                  />
                  <div aria-hidden className="absolute right-5 top-0 opacity-[0.08]">
                    <WaterDropCharacter size={68} mood={characterMood} animate={false} />
                  </div>
                  <p className={`${defaultSectionLabelClassName} mb-4 text-center`}>오늘의 기록</p>
                  <div className="relative mx-auto max-w-[420px] space-y-[18px] text-center">
                    {actionParagraphs.map((paragraph, index) => (
                      <p
                        key={`${record.id}-action-${index}`}
                        className="whitespace-pre-line text-[22px] font-bold leading-[1.85] tracking-[-0.01em] text-slate-800"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {hasOneWord && (
                  <div className="px-6 pb-5">
                    <div className="mx-auto flex w-fit items-center gap-[10px] rounded-full border border-point-100/80 bg-point-50/55 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <span className={defaultSectionLabelClassName}>한 단어</span>
                      <span className="h-px w-[14px] bg-mist-200" />
                      <span className="text-[15px] font-semibold italic tracking-[-0.01em] text-point-600">
                        "{record.oneWordText}"
                      </span>
                    </div>
                  </div>
                )}

                {hasTomorrow && (
                  <div className="border-t border-mist-200/60 px-6 pb-[18px] pt-4">
                    <div className="space-y-2 text-center">
                      <span className={`${defaultSectionLabelClassName} block`}>내일의 메모</span>
                      <div className="mx-auto max-w-[360px] space-y-2">
                        {tomorrowParagraphs.map((paragraph, index) => (
                          <p
                            key={`${record.id}-tomorrow-${index}`}
                            className="whitespace-pre-line text-[14px] font-medium leading-[1.8] tracking-[-0.01em] text-mist-500"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-6 pb-5">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-mist-400">{nickname ? `— ${nickname}` : ''}</span>
                  <span className="font-mono text-[9px] tracking-[0.2em] text-mist-400">
                    pg.{String(pageNumber ?? 1).padStart(3, '0')}
                  </span>
                </div>
              </article>
            )}

          </div>

          <div aria-hidden className="pointer-events-none relative mt-16 flex justify-center pb-12">
            <div className="relative w-full max-w-[640px]">
              <div className="absolute -left-8 bottom-6 opacity-[0.15]">
                <WaterDropCharacter size={132} mood={characterMood} animate={false} />
              </div>
              <div className="absolute -right-5 bottom-10 opacity-[0.11]">
                <WaterDropCharacter size={78} mood="SPARKLE" animate={false} />
              </div>
              <div
                className="absolute right-0 top-3 h-[96px] w-[96px] rounded-full blur-2xl"
                style={{ background: 'rgba(167,139,250,0.18)' }}
              />
              <div className="mx-auto w-fit">
                <div className="mb-2 text-center">
                  <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-mist-400">QUIET MEMORY</span>
                </div>
                <div className="flex items-end gap-3 rounded-[28px] border border-white/40 bg-white/28 px-5 py-4 backdrop-blur-md shadow-[0_16px_30px_-24px_rgba(82,96,109,0.3)]">
                  {mascotRailMoods.map((railMood, index) => (
                    <div key={`${record.id}-mascot-${railMood}-${index}`} className="flex flex-col items-center gap-2">
                      <WaterDropCharacter
                        size={index === 0 ? 44 : index === 2 ? 38 : 34}
                        mood={railMood}
                        animate={false}
                        className={index === 0 ? '' : 'opacity-85'}
                      />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-[12px] font-medium tracking-[-0.01em] text-mist-400">
                  짧은 하루도 이렇게 남겨두면 충분해요
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
