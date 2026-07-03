import React from 'react';
import { Record as RecordType, type RecordCardDisplayMode } from '../types';
import { getRecordParagraphs } from '../utils/recordText';
import { WaterDropCharacter, type CharacterMood } from './WaterDropCharacter';

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
  '포근': { bg: 'bg-point-50',  border: 'border-point-200',  text: 'text-point-600'  },
  '반짝': { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-600'  },
  '잔잔': { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-500'   },
  '버팀': { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-600'  },
  '두근': { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-500'   },
  '멍함': { bg: 'bg-mist-50',   border: 'border-mist-200',   text: 'text-mist-500'   },
};

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const WEEKDAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
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

export const RecordDetailDiary: React.FC<Props> = ({
  record, nickname, pageNumber, displayMode = 'diary', onDisplayModeChange, onClose, onEdit, onShare, onDelete,
}) => {
  const date = new Date(record.timestamp);
  const mood = record.moodCode;
  const moodTone = mood ? MOOD_TONE[mood] : undefined;

  const hasPhoto = !!record.imageUrl;
  const hasOneWord = !!record.oneWordText?.trim();
  const hasTomorrow = !!record.tomorrowText?.trim();
  const actionParagraphs = getRecordParagraphs(record.action);
  const tomorrowParagraphs = hasTomorrow ? getRecordParagraphs(record.tomorrowText!) : [];
  const actionCharacterCount = actionParagraphs.join(' ').replace(/\s+/g, '').length;
  const isCompactEntry = actionParagraphs.length <= 2 && actionCharacterCount <= 42;
  const characterMood = resolveCharacterMood(mood);
  const mascotRailMoods: CharacterMood[] = [characterMood, 'COZY', 'SPARKLE', 'CALM', 'HOLDING'];
  const detailDisplayMode: RecordCardDisplayMode = hasPhoto ? displayMode : 'diary';
  const isPosterMode = detailDisplayMode === 'poster';
  const posterActionText = actionParagraphs.join(' ');
  const directionSummary = record.directionQuestion || '오늘의 방향';
  const cardSurfaceStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.74) 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.94), 0 2px 6px rgba(82,96,109,0.05), 0 18px 36px -22px rgba(82,96,109,0.22)',
  };
  const sectionLabelClassName = 'text-[10px] font-bold tracking-[0.12em] text-mist-400';

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
        className="sticky top-0 z-30 px-5 pb-4 pt-5"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'linear-gradient(180deg, rgba(236,239,254,0.92) 0%, rgba(236,239,254,0.72) 72%, rgba(236,239,254,0))',
        }}
      >
        <span className="block text-center text-[10px] font-bold tracking-[0.3em] uppercase text-mist-400 opacity-85">
          Quiet Path
        </span>
      </header>

      <div
        className={[
          'relative flex min-h-[calc(100dvh-64px)] flex-col justify-center px-5',
          hasPhoto ? 'pt-40' : 'pt-16',
        ].join(' ')}
      >
        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          <div className="relative mb-6 flex min-h-[48px] items-center justify-center">
            {hasPhoto && onDisplayModeChange && (
              <div className="absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center rounded-full border border-white/70 bg-white/62 p-1 shadow-[0_8px_18px_-14px_rgba(82,96,109,0.35)] backdrop-blur-sm">
                <button
                  onClick={() => onDisplayModeChange('poster')}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                    detailDisplayMode === 'poster'
                      ? 'bg-point-500 text-white shadow-[0_8px_18px_-12px_rgba(139,92,246,0.35)]'
                      : 'text-mist-500 hover:bg-white/80'
                  }`}
                >
                  포스터형
                </button>
                <button
                  onClick={() => onDisplayModeChange('diary')}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                    detailDisplayMode === 'diary'
                      ? 'bg-point-500 text-white shadow-[0_8px_18px_-12px_rgba(139,92,246,0.35)]'
                      : 'text-mist-500 hover:bg-white/80'
                  }`}
                >
                  기록형
                </button>
              </div>
            )}
            <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-mist-400">
              RECORD · {String(pageNumber ?? 1).padStart(3, '0')}
            </span>
            <button
              onClick={onClose}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/62 px-3 py-2 text-[13px] font-bold text-mist-500 shadow-[0_8px_18px_-14px_rgba(82,96,109,0.35)] backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white hover:text-slate-700 hover:shadow-[0_14px_28px_-16px_rgba(82,96,109,0.45)] active:scale-[0.97]"
            >
              닫기
            </button>
          </div>

          <div className="relative z-10">
            {isPosterMode ? (
              <article
                className="relative overflow-hidden rounded-[30px] border border-white/80 shadow-[0_22px_42px_-28px_rgba(82,96,109,0.35)]"
                style={{ minHeight: 860 }}
              >
                <img src={record.imageUrl} alt="기록 사진" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,20,42,0.72)_0%,rgba(10,20,42,0.08)_24%,rgba(10,20,42,0.04)_56%,rgba(10,20,42,0.42)_72%,rgba(10,20,42,0.84)_100%)]" />
                <div className="relative flex min-h-[860px] flex-col p-7 text-white">
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex items-center gap-3">
                      <WaterDropCharacter size={34} mood={characterMood} animate={false} />
                      <div>
                        <p className="text-[14px] font-black tracking-[0.02em] text-white">QUIET PATH</p>
                      </div>
                    </div>
                    <div className="max-w-[180px] text-right">
                      <p className="text-[11px] font-bold text-white/65">현재 방향</p>
                      <p className="mt-1 line-clamp-2 text-[20px] font-bold leading-tight text-white">
                        {directionSummary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-12 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-1 font-mono text-[12px] font-bold tracking-[0.2em] text-white/85">
                        {WEEKDAYS[date.getDay()]} · {MONTHS[date.getMonth()]}
                      </p>
                      <p className="text-[86px] font-extrabold leading-[0.88] tracking-[-0.05em] text-white">
                        {String(date.getDate()).padStart(2, '0')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 pt-1">
                      <span className="font-mono text-[12px] font-bold tracking-[0.18em] text-white/85">{fmtTime(date)}</span>
                      {mood && (
                        <span
                          className="inline-flex items-center justify-center rounded-2xl border border-white/35 bg-white/16 px-4 py-2 text-[18px] font-bold leading-none text-white backdrop-blur-sm"
                        >
                          {mood}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col items-center text-center">
                    <p className="mb-4 text-[14px] font-bold tracking-[0.12em] text-white/68">오늘의 기록</p>
                    <p className="max-w-[520px] text-[24px] font-extrabold leading-[1.5] tracking-[-0.03em] text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.28)] line-clamp-3">
                      {posterActionText}
                    </p>
                    {hasOneWord && (
                      <div className="mt-7 flex items-center gap-[10px] rounded-full border border-white/32 bg-white/14 px-5 py-3 backdrop-blur-sm">
                        <span className="text-[12px] font-bold tracking-[0.1em] text-white/68">한 단어</span>
                        <span className="h-px w-[16px] bg-white/28" />
                        <span className="text-[20px] font-bold tracking-[-0.02em] text-white">
                          "{record.oneWordText}"
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-10 flex justify-center">
                    <div className="flex items-end gap-3 rounded-[26px] border border-white/35 bg-white/22 px-5 py-4 backdrop-blur-md shadow-[0_16px_30px_-24px_rgba(82,96,109,0.3)]">
                      {mascotRailMoods.map((railMood, index) => (
                        <div key={`${record.id}-poster-mascot-${railMood}-${index}`} className="flex flex-col items-center gap-2">
                          <WaterDropCharacter
                            size={index === 0 ? 42 : index === 2 ? 38 : 32}
                            mood={railMood}
                            animate={false}
                            className={index === 0 ? '' : 'opacity-85'}
                          />
                          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex items-end justify-between text-white/50">
                    <span className="text-[12px] font-bold">quietpath.app</span>
                    <span className="font-mono text-[11px] tracking-[0.2em]">pg.{String(pageNumber ?? 1).padStart(3, '0')}</span>
                  </div>
                </div>
              </article>
            ) : (
            <article
              className="overflow-hidden rounded-[26px] border border-white/85"
              style={cardSurfaceStyle}
            >
            {hasPhoto && (
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={record.imageUrl} alt="기록 사진" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,17,30,0.25)_0%,transparent_30%,rgba(15,17,30,0.15)_60%,rgba(15,17,30,0.55)_100%)]" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between px-[18px] pb-6 pt-[18px]">
                  <div className="text-white">
                    <p className="mb-1 font-mono text-[9px] font-bold tracking-[0.2em] text-white/85">
                      {WEEKDAYS[date.getDay()]} · {MONTHS[date.getMonth()]}
                    </p>
                    <p className="text-[38px] font-extrabold leading-[0.9] tracking-[-0.03em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
                      {String(date.getDate()).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-mono text-[10px] tracking-wider text-center text-white/90">{fmtTime(date)}</span>
                    {mood && (
                      <span
                        className="inline-flex items-center justify-center rounded-xl border-[1.5px] border-white/40 px-3 py-1.5 text-xs font-bold leading-none text-white backdrop-blur-sm"
                        style={{ background: 'rgba(255,255,255,0.24)' }}
                      >
                        {mood}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!hasPhoto && (
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
            )}

            <div
              className={[
                isCompactEntry ? 'relative px-8 pt-4 pb-8' : '',
                !isCompactEntry ? 'px-6 pb-[22px]' : '',
                hasPhoto && !isCompactEntry ? 'pt-5' : '',
                !hasPhoto && !isCompactEntry ? 'pt-1' : '',
              ].join(' ')}
            >
              {isCompactEntry && (
                <>
                  <div
                    aria-hidden
                    className="absolute left-1/2 top-6 h-[180px] w-[180px] -translate-x-1/2 rounded-full blur-3xl"
                    style={{ background: 'rgba(196,181,253,0.18)' }}
                  />
                  <div aria-hidden className="absolute right-5 top-0 opacity-[0.08]">
                    <WaterDropCharacter size={68} mood={characterMood} animate={false} />
                  </div>
                </>
              )}
              <p className={`${sectionLabelClassName} ${isCompactEntry ? 'mb-4 text-center' : 'mb-3'}`}>오늘의 기록</p>
              <div className={`space-y-[18px] ${isCompactEntry ? 'relative mx-auto max-w-[420px] text-center' : ''}`}>
                {actionParagraphs.map((paragraph, index) => (
                  <p
                    key={`${record.id}-action-${index}`}
                    className={[
                      'whitespace-pre-line font-bold tracking-[-0.01em] text-slate-800',
                      isCompactEntry ? 'text-[22px] leading-[1.85]' : 'text-[20px] leading-[1.72]',
                    ].join(' ')}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {hasOneWord && (
              <div className={`px-6 pb-5 ${isCompactEntry ? '' : 'flex items-center gap-[9px]'}`}>
                {isCompactEntry ? (
                  <div className="mx-auto flex w-fit items-center gap-[10px] rounded-full border border-point-100/80 bg-point-50/55 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <span className={sectionLabelClassName}>한 단어</span>
                    <span className="h-px w-[14px] bg-mist-200" />
                    <span className="text-[15px] font-semibold italic tracking-[-0.01em] text-point-600">
                      "{record.oneWordText}"
                    </span>
                  </div>
                ) : (
                  <>
                    <span className={sectionLabelClassName}>한 단어</span>
                    <span className="h-px w-[14px] bg-mist-200" />
                    <span className="text-[14px] font-semibold italic tracking-[-0.01em] text-point-600">
                      "{record.oneWordText}"
                    </span>
                  </>
                )}
              </div>
            )}

            {hasTomorrow && (
              <div className="border-t border-mist-200/60 px-6 pb-[18px] pt-4">
                <div className={isCompactEntry ? 'space-y-2 text-center' : 'flex gap-[10px]'}>
                  <span className={`${sectionLabelClassName} ${isCompactEntry ? 'block' : 'shrink-0 pt-[2px]'}`}>내일의 메모</span>
                  <div className={`min-w-0 ${isCompactEntry ? 'mx-auto max-w-[360px] space-y-2' : 'flex-1 space-y-1.5'}`}>
                    {tomorrowParagraphs.map((paragraph, index) => (
                      <p
                        key={`${record.id}-tomorrow-${index}`}
                        className={[
                          'whitespace-pre-line font-medium tracking-[-0.01em] text-mist-500',
                          isCompactEntry ? 'text-[14px] leading-[1.8]' : 'text-[13px] leading-[1.65]',
                        ].join(' ')}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

              <div className="flex items-center justify-between px-6 pb-5">
                <span className="font-mono text-[9px] tracking-[0.2em] text-mist-400">
                  {nickname ? `— ${nickname}` : ''}
                </span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-mist-400">
                  pg.{String(pageNumber ?? 1).padStart(3, '0')}
                </span>
              </div>
            </article>
            )}

            <div className="mt-4 flex items-center justify-center gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="rounded-full border border-white bg-white/70 px-4 py-2 text-[11px] font-bold text-mist-500 transition hover:bg-white"
                >
                  편집
                </button>
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  className="rounded-full border border-white bg-white/70 px-4 py-2 text-[11px] font-bold text-mist-500 transition hover:bg-white"
                >
                  카드 내보내기
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="rounded-full border border-white bg-white/70 px-4 py-2 text-[11px] font-bold text-rose-400 transition hover:bg-rose-50"
                >
                  삭제하기
                </button>
              )}
            </div>
          </div>

          {!isPosterMode && (
          <div aria-hidden className="pointer-events-none relative mt-5 flex justify-center pb-4">
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
          )}
        </div>
      </div>
    </div>
  );
};
