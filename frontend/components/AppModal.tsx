import React from 'react';
import { createPortal } from 'react-dom';
import { getThemePalette, useResolvedTheme } from '../theme';

type ConfirmVariant = 'primary' | 'danger';

interface AppModalProps {
  open: boolean;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  cancelLabel?: string;
  hideCancel?: boolean;
  confirmVariant?: ConfirmVariant;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
}

const getConfirmStyle = (theme: 'light' | 'dark', variant: ConfirmVariant, disabled: boolean): React.CSSProperties => {
  if (variant === 'danger') {
    return {
      background: theme === 'dark' ? 'rgba(127,29,29,0.30)' : 'rgba(255,241,242,0.96)',
      color: '#E11D48',
      border: `1px solid ${theme === 'dark' ? 'rgba(251,113,133,0.55)' : 'rgba(251,113,133,0.5)'}`,
      boxShadow: theme === 'dark' ? '0 12px 28px rgba(2,6,23,0.22)' : '0 12px 28px rgba(251,113,133,0.08)',
      opacity: disabled ? 0.65 : 1,
    };
  }

  return {
    background: 'linear-gradient(135deg, rgba(168,85,247,0.95) 0%, rgba(139,92,246,0.96) 100%)',
    color: '#FFFFFF',
    boxShadow: '0 12px 28px rgba(139,92,246,0.22)',
    opacity: disabled ? 0.7 : 1,
  };
};

export const AppModal: React.FC<AppModalProps> = ({
  open,
  icon,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  cancelLabel = '취소',
  hideCancel = false,
  confirmVariant = 'primary',
  confirmDisabled = false,
  cancelDisabled = false,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    background: theme === 'dark' ? 'rgba(15,23,42,0.74)' : 'rgba(99,102,120,0.28)',
    backdropFilter: 'blur(14px)',
  };

  const cardStyle: React.CSSProperties = {
    background: palette.cardBgStrong,
    border: `1px solid ${palette.border}`,
    boxShadow: theme === 'dark'
      ? '0 24px 60px -12px rgba(2,6,23,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset'
      : '0 24px 60px -12px rgba(15,17,30,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset',
  };

  const iconWrapStyle: React.CSSProperties = {
    background: theme === 'dark'
      ? 'linear-gradient(180deg, rgba(76,29,149,0.34) 0%, rgba(88,28,135,0.30) 100%)'
      : 'linear-gradient(180deg, rgba(237,233,254,0.95) 0%, rgba(243,232,255,0.92) 100%)',
    color: '#7C3AED',
  };

  const cancelButtonStyle: React.CSSProperties = {
    background: theme === 'dark' ? palette.cardBgSoft : 'rgba(241,245,249,0.95)',
    color: theme === 'dark' ? palette.strongText : '#475569',
    border: `1px solid ${theme === 'dark' ? palette.border : 'transparent'}`,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-5 py-8"
      style={overlayStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget && !cancelDisabled) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
    >
      <div className="w-full max-w-[360px] rounded-[24px] overflow-hidden" style={cardStyle}>
        <div className="px-7 pt-8 pb-2 text-center">
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-full grid place-items-center"
            style={iconWrapStyle}
            aria-hidden="true"
          >
            {icon}
          </div>
          <h3 id="app-modal-title" className="text-[17px] font-bold mb-3 tracking-tight" style={{ color: palette.strongText }}>
            {title}
          </h3>
          <div className="text-[13px] leading-[1.75]" style={{ color: palette.mutedText }}>{description}</div>
        </div>

        <div className="flex gap-3 p-5 pt-6">
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={cancelDisabled}
              className="flex-1 min-h-[52px] rounded-[20px] text-[14px] font-semibold"
              style={cancelButtonStyle}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`${hideCancel ? 'w-full' : 'flex-1'} min-h-[52px] rounded-[20px] text-[14px] font-bold`}
            style={getConfirmStyle(theme, confirmVariant, confirmDisabled)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
