import React from 'react';
import { Calendar, Check } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { Card, CategoryIcon, SoftButton, SoftInput } from './UI';
import { getThemePalette, useResolvedTheme } from '../theme';

type Category = (typeof CATEGORIES)[number];

interface DirectionSetupFormProps {
  selectedCategory: Category;
  directionName: string;
  directionText: string;
  durationDays: number | null;
  customReviewDate: string;
  showDateInput: boolean;
  todayStr: string;
  reviewDateDisplay: string | null;
  isNameMissing: boolean;
  hasReviewAt: boolean;
  submitDisabled: boolean;
  onDirectionNameChange: (value: string) => void;
  onDirectionTextChange: (value: string) => void;
  onSelectDuration: (days: number) => void;
  onToggleDateInput: () => void;
  onReviewDateChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export const DirectionSetupForm: React.FC<DirectionSetupFormProps> = ({
  selectedCategory,
  directionName,
  directionText,
  durationDays,
  customReviewDate,
  showDateInput,
  todayStr,
  reviewDateDisplay,
  isNameMissing,
  hasReviewAt,
  submitDisabled,
  onDirectionNameChange,
  onDirectionTextChange,
  onSelectDuration,
  onToggleDateInput,
  onReviewDateChange,
  onSubmit,
  onCancel,
  submitLabel = '새 방향 만들기',
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <Card className="backdrop-blur-md shadow-md p-6 rounded-[2rem]" style={{ background: palette.cardBgStrong, borderColor: palette.border }}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-5 border-b" style={{ borderColor: palette.divider }}>
          <CategoryIcon categoryId={selectedCategory.id} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[15px] font-bold leading-tight" style={{ color: palette.strongText }}>
                {selectedCategory.label}
              </span>
              <Check size={12} className="text-point-500" strokeWidth={2.4} />
            </div>
            <span className="text-[11px] block" style={{ color: palette.faintText }}>
              이 카테고리 안에서 새로운 방향을 시작해요.
            </span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-[11px] font-bold mb-2 ml-1 uppercase tracking-widest" style={{ color: palette.mutedText }}>
            <span>방향 제목</span>
          </label>
          <SoftInput
            value={directionName}
            onChange={(e) => onDirectionNameChange(e.target.value)}
            placeholder={`예: ${selectedCategory.defaultTitle}`}
            autoFocus
            className={`w-full text-[15px] py-4 px-5 rounded-2xl shadow-sm transition-all placeholder:font-medium ${
              directionName ? 'font-bold' : 'font-medium'
            } ${isNameMissing ? 'focus:ring-rose-200' : ''}`}
            style={isNameMissing ? ({ borderColor: '#FDA4AF', background: theme === 'dark' ? 'rgba(127,29,29,0.18)' : 'rgba(255,241,242,0.82)' } as React.CSSProperties) : undefined}
          />
          {isNameMissing ? (
            <p className="text-[10px] text-rose-400 mt-2 ml-1 font-medium">방향 제목을 입력해주세요.</p>
          ) : (
            <p className="text-[10px] mt-2 ml-1" style={{ color: palette.faintText }}>이 방향을 떠올릴 수 있는 이름을 적어주세요.</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-[11px] font-bold mb-2 ml-1 uppercase tracking-widest" style={{ color: palette.mutedText }}>
            <span>나아갈 방향 한 줄</span>
            <span className="text-[9px] font-medium normal-case tracking-normal border px-1.5 py-0.5 rounded-md" style={{ color: palette.faintText, borderColor: palette.border, background: palette.cardBgSoft }}>
              선택
            </span>
          </label>
          <SoftInput
            value={directionText}
            onChange={(e) => onDirectionTextChange(e.target.value)}
            placeholder="예: 나는 이 방향으로 조금씩 나아가고 있을까?"
            className="w-full text-[14px] py-4 px-5 rounded-2xl shadow-sm transition-all font-medium"
          />
          <p className="text-[10px] mt-2 ml-1" style={{ color: palette.faintText }}>비워두면 기본 문장으로 시작합니다.</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-[11px] font-bold mb-3 ml-1 uppercase tracking-widest" style={{ color: palette.mutedText }}>
            <span>언제 돌아볼까요?</span>
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => onSelectDuration(days)}
                className={`py-3.5 px-4 rounded-[1.15rem] text-[13px] font-bold transition-all flex items-center justify-center border ${
                  durationDays === days && !customReviewDate
                    ? 'bg-point-500 text-white border-point-500 shadow-md shadow-point-200/50 scale-[1.02]'
                    : 'shadow-sm'
                }`}
                style={
                  durationDays === days && !customReviewDate
                    ? undefined
                    : { background: palette.cardBgSoft, color: palette.mutedText, borderColor: palette.border }
                }
              >
                {days}일 후
              </button>
            ))}
            <button
              onClick={onToggleDateInput}
              className={`py-3.5 px-4 rounded-[1.15rem] text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 border ${
                showDateInput || customReviewDate
                  ? 'bg-point-500 text-white border-point-500 shadow-md shadow-point-200/50 scale-[1.02]'
                  : 'shadow-sm'
              }`}
              style={
                showDateInput || customReviewDate
                  ? undefined
                  : { background: palette.cardBgSoft, color: palette.mutedText, borderColor: palette.border }
              }
            >
              <Calendar size={14} className={showDateInput || customReviewDate ? 'text-white' : ''} style={showDateInput || customReviewDate ? undefined : { color: palette.faintText }} />
              직접 선택
            </button>
          </div>

          <div className="min-h-[50px] flex flex-col justify-center">
            {showDateInput && (
              <input
                type="date"
                min={todayStr}
                value={customReviewDate}
                onChange={(e) => onReviewDateChange(e.target.value)}
                className="w-full shadow-sm rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-1 focus:ring-point-300 transition-all mb-2"
                style={{ background: palette.cardBgSoft, border: `1px solid ${theme === 'dark' ? 'rgba(167,139,250,0.24)' : 'rgba(221,214,254,0.9)'}`, color: palette.strongText }}
              />
            )}
            {reviewDateDisplay && (
              <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-point-600 shadow-sm" style={{ background: theme === 'dark' ? 'rgba(76,29,149,0.20)' : 'rgba(245,243,255,0.95)', borderColor: theme === 'dark' ? 'rgba(167,139,250,0.24)' : 'rgba(221,214,254,0.9)' }}>
                <Calendar size={14} className="text-point-400 shrink-0" />
                <span className="text-[13px] font-bold">{reviewDateDisplay}</span>
                <span className="text-[11px] font-medium text-point-400">에 돌아볼게요</span>
              </div>
            )}
            {!hasReviewAt && !showDateInput && (
              <p className="text-[11px] text-rose-400 text-center font-medium mt-1">
                회고 시점을 정해야 방향을 만들 수 있어요.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-4 border-t mt-2" style={{ borderColor: palette.divider }}>
          <SoftButton onClick={onSubmit} disabled={submitDisabled} className="py-4 text-[15px] font-bold shadow-point-200/50">
            {submitLabel}
          </SoftButton>
          {onCancel && (
            <SoftButton
              variant="secondary"
              onClick={onCancel}
              className="shadow-none py-3"
              style={{ background: 'transparent', borderColor: 'transparent', color: palette.mutedText }}
            >
              <span className="text-sm font-bold">취소</span>
            </SoftButton>
          )}
        </div>
      </div>
    </Card>
  );
};
