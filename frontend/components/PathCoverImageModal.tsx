import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, X } from 'lucide-react';
import type { DirectionCoverImage } from '../types';
import type { PathCoverImageUpdate } from '../api/pathApi';
import { getThemePalette, useResolvedTheme } from '../theme';
import { prepareRecordImage } from '../utils/recordImage';
import { RecordImageEditor } from './RecordImageEditor';

interface PathCoverImageModalProps {
  open: boolean;
  coverImage?: DirectionCoverImage;
  onClose: () => void;
  onSave: (request: PathCoverImageUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const PathCoverImageModal: React.FC<PathCoverImageModalProps> = ({
  open,
  coverImage,
  onClose,
  onSave,
  onDelete,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [scale, setScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreviewUrl(coverImage?.imageUrl ?? '');
    setSelectedFile(null);
    setPositionX(coverImage?.positionX ?? 50);
    setPositionY(coverImage?.positionY ?? 50);
    setScale(coverImage?.scale ?? 1);
    setErrorMessage(null);
  }, [coverImage, open]);

  useEffect(() => () => {
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  if (!open) return null;

  const handleSelect = async (file: File) => {
    const prepared = await prepareRecordImage(file);
    const nextUrl = URL.createObjectURL(prepared);
    setSelectedFile(prepared);
    setPreviewUrl(nextUrl);
    setPositionX(50);
    setPositionY(50);
    setScale(1);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!previewUrl || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSave({
        imageFile: selectedFile,
        positionX,
        positionY,
        scale,
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '홈 카드 배경을 저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!coverImage || isSaving) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '홈 카드 배경을 삭제하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center px-5 py-8"
      style={{
        background: theme === 'dark' ? 'rgba(15,23,42,0.78)' : 'rgba(99,102,120,0.3)',
        backdropFilter: 'blur(14px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="path-cover-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        className="w-full max-w-[390px] max-h-full overflow-y-auto rounded-[26px] border p-5 shadow-2xl"
        style={{ background: palette.cardBgStrong, borderColor: palette.border }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-point-500">
              <ImageIcon size={16} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Home Card</span>
            </div>
            <h2 id="path-cover-modal-title" className="text-[18px] font-bold" style={{ color: palette.strongText }}>
              홈 카드 배경 사진
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="grid h-9 w-9 place-items-center rounded-full border transition-colors hover:text-point-500 disabled:opacity-50"
            style={{ background: palette.cardBgSoft, borderColor: palette.border, color: palette.mutedText }}
            aria-label="홈 카드 배경 설정 닫기"
          >
            <X size={17} />
          </button>
        </div>

        <p className="mb-4 rounded-2xl border px-4 py-3 text-[12px] leading-relaxed" style={{ color: palette.mutedText, background: palette.cardBgSoft, borderColor: palette.border }}>
          일일 기록 사진과 별도로 저장돼요. 오늘 카드에 계속 보여줄 사진을 설정해보세요.
        </p>

        <RecordImageEditor
          imageUrl={previewUrl}
          positionX={positionX}
          positionY={positionY}
          scale={scale}
          disabled={isSaving}
          frameAspectRatio={4 / 3}
          previewAlt="홈 카드 배경 사진 미리보기"
          dragHint="사진을 드래그해 카드에 보일 위치를 조정하세요"
          onSelect={handleSelect}
          onRemove={() => void handleDelete()}
          onPositionChange={(x, y) => {
            setPositionX(x);
            setPositionY(y);
          }}
          onScaleChange={setScale}
          onError={setErrorMessage}
        />

        {errorMessage && (
          <p className="mt-3 text-center text-[12px] font-medium text-rose-500">{errorMessage}</p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[50px] flex-1 rounded-[18px] border text-[13px] font-semibold disabled:opacity-50"
            style={{ background: palette.cardBgSoft, borderColor: palette.border, color: palette.mutedText }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!previewUrl || isSaving}
            className="min-h-[50px] flex-1 rounded-[18px] bg-gradient-to-r from-violet-500 to-purple-500 text-[13px] font-bold text-white shadow-lg shadow-violet-300/25 disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '배경 사진 저장'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
