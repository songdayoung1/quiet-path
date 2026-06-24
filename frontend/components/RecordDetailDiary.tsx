import React from 'react';
import { Record as RecordType } from '../types';

interface Props {
  record: RecordType;
  nickname?: string;
  pageNumber?: number;
  onClose?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onHide?: () => void;
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

export const RecordDetailDiary: React.FC<Props> = ({
  record, nickname, pageNumber, onClose, onEdit, onShare, onHide,
}) => {
  const date = new Date(record.timestamp);
  const mood = record.moodCode;
  const moodTone = mood ? MOOD_TONE[mood] : undefined;

  const hasPhoto = !!record.imageUrl;
  const hasOneWord = !!record.oneWordText?.trim();
  const hasTomorrow = !!record.tomorrowText?.trim();

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col overflow-y-auto"
      style={{
        background:
          'radial-gradient(circle at -30% -25%, rgba(194,209,255,0.44) 0%, rgba(194,209,255,0) 62%),' +
          'radial-gradient(circle at 130% 120%, rgba(178,223,219,0.43) 0%, rgba(178,223,219,0) 62%),' +
          'linear-gradient(180deg, #ECEFFE 0%, #E2EEEC 100%)',
      }}
    >
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={onClose}
          className="text-mist-500 text-[13px] font-bold px-2 py-2 rounded-full hover:bg-white/40"
        >
          닫기
        </button>
        <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-mist-400">
          RECORD · {String(pageNumber ?? 1).padStart(3, '0')}
        </span>
        <div className="w-9 h-9" />
      </header>

      <div className="px-5 mt-3 pb-10">
        <article
          className="relative rounded-[22px] overflow-hidden border border-white/90"
          style={{
            background:
              'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.85) 0%, transparent 60%),' +
              'linear-gradient(180deg, #F4F6FE 0%, #EDF1ED 100%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.9) inset, 0 18px 36px -22px rgba(82,96,109,0.22), 0 2px 6px -2px rgba(82,96,109,0.06)',
          }}
        >
          {/* noise texture */}
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.03,
              mixBlendMode: 'multiply',
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          {/* 1) Header */}
          <div className="px-6 pt-6 pb-4 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold text-mist-500 tracking-[0.22em] mb-1">
                {WEEKDAYS[date.getDay()]} · {MONTHS[date.getMonth()]}
              </p>
              <p className="text-[52px] font-bold text-slate-800 leading-none tabular-nums tracking-tight">
                {String(date.getDate()).padStart(2, '0')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-mono text-[10px] text-mist-400 tracking-wider">{fmtTime(date)}</span>
              {moodTone && mood && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full border ${moodTone.bg} ${moodTone.border}`}>
                  <span className={`text-[11px] font-bold leading-none ${moodTone.text}`}>{mood}</span>
                </span>
              )}
            </div>
          </div>

          {/* 2) Photo (optional) */}
          {hasPhoto && (
            <div className="px-6">
              <div className="aspect-[4/3] rounded-md overflow-hidden border border-mist-200/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_2px_8px_-4px_rgba(82,96,109,0.18)] bg-white">
                <img src={record.imageUrl} alt="기록 사진" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {/* 3) One Word — large when no photo, small when photo exists */}
          {hasOneWord && !hasPhoto && (
            <div
              className="mx-6 mb-1 mt-1 relative px-5 py-7 rounded-md text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(255,228,230,0.5) 0%, rgba(245,243,255,0.45) 100%)',
                border: '1px dashed rgba(154,165,177,0.35)',
              }}
            >
              <p className="font-mono text-[9px] font-bold text-mist-400 tracking-[0.28em] mb-3">— ONE WORD</p>
              <p className="text-[26px] font-bold text-slate-800 leading-tight tracking-tight">
                "{record.oneWordText}"
              </p>
            </div>
          )}
          {hasOneWord && hasPhoto && (
            <div className="px-6 pt-5 pb-1">
              <p className="font-mono text-[9px] font-bold text-mist-400 tracking-[0.24em] mb-1">— ONE WORD</p>
              <p className="text-[24px] font-bold text-slate-800 leading-tight tracking-tight">
                "{record.oneWordText}"
              </p>
            </div>
          )}

          {/* 4) Body — on ruling lines */}
          <div
            className="px-6 pt-6 pb-7"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0, transparent 31px, rgba(154,165,177,0.18) 31px, rgba(154,165,177,0.18) 32px)',
            }}
          >
            <p className="font-mono text-[9px] font-bold text-mist-400 tracking-[0.24em] mb-2">— TODAY'S SCENE</p>
            <p className="text-[14.5px] text-slate-800 leading-[32px] font-medium whitespace-pre-line">
              {record.action}
            </p>
          </div>

          {/* 5) Tomorrow (optional) */}
          {hasTomorrow && (
            <div className="px-6 pt-2 pb-6 text-right">
              <p className="font-mono text-[9px] font-bold text-mist-400 tracking-[0.24em] mb-1">— TOMORROW</p>
              <p className="text-[14px] text-mist-600 font-medium">{record.tomorrowText}</p>
            </div>
          )}

          {/* 6) Signature */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <span className="font-mono text-[9px] text-mist-400 tracking-[0.22em]">
              {nickname ? `— ${nickname}` : ''}
            </span>
            <span className="font-mono text-[9px] text-mist-400 tracking-[0.22em]">
              pg.{String(pageNumber ?? 1).padStart(3, '0')}
            </span>
          </div>
        </article>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 rounded-full bg-white/70 border border-white text-mist-500 text-[11px] font-bold hover:bg-white transition"
            >
              편집
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="px-4 py-2 rounded-full bg-white/70 border border-white text-mist-500 text-[11px] font-bold hover:bg-white transition"
            >
              공유
            </button>
          )}
          {onHide && (
            <button
              onClick={onHide}
              className="px-4 py-2 rounded-full bg-white/70 border border-white text-rose-400 text-[11px] font-bold hover:bg-rose-50 transition"
            >
              숨기기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
