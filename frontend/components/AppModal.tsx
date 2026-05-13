import React from 'react';
import { createPortal } from 'react-dom';

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
  confirmVariant?: ConfirmVariant;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
}

const overlayStyle: React.CSSProperties = {
  background: 'rgba(99,102,120,0.28)',
  backdropFilter: 'blur(14px)',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid rgba(255,255,255,0.72)',
  boxShadow: '0 24px 60px -12px rgba(15,17,30,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset',
};

const iconWrapStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(237,233,254,0.95) 0%, rgba(243,232,255,0.92) 100%)',
  color: '#7C3AED',
};

const cancelButtonStyle: React.CSSProperties = {
  background: 'rgba(241,245,249,0.95)',
  color: '#475569',
};

const getConfirmStyle = (variant: ConfirmVariant, disabled: boolean): React.CSSProperties => {
  if (variant === 'danger') {
    return {
      background: 'rgba(255,241,242,0.96)',
      color: '#E11D48',
      border: '1px solid rgba(251,113,133,0.5)',
      boxShadow: '0 12px 28px rgba(251,113,133,0.08)',
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
  confirmVariant = 'primary',
  confirmDisabled = false,
  cancelDisabled = false,
}) => {
  if (!open) return null;

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
          <h3 id="app-modal-title" className="text-[17px] font-bold mb-3 tracking-tight text-mist-700">
            {title}
          </h3>
          <div className="text-[13px] leading-[1.75] text-mist-500">{description}</div>
        </div>

        <div className="flex gap-3 p-5 pt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={cancelDisabled}
            className="flex-1 min-h-[52px] rounded-[20px] text-[14px] font-semibold"
            style={cancelButtonStyle}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 min-h-[52px] rounded-[20px] text-[14px] font-bold"
            style={getConfirmStyle(confirmVariant, confirmDisabled)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
