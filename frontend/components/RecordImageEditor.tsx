import React, { useRef, useState } from 'react';
import { Image as ImageIcon, RotateCcw, X, ZoomIn } from 'lucide-react';

interface RecordImageEditorProps {
  imageUrl: string;
  positionX: number;
  positionY: number;
  scale: number;
  disabled?: boolean;
  onSelect: (file: File) => Promise<void> | void;
  onRemove: () => void;
  onPositionChange: (positionX: number, positionY: number) => void;
  onScaleChange: (scale: number) => void;
  onError: (message: string) => void;
  frameAspectRatio?: number;
  previewAlt?: string;
  dragHint?: string;
}

interface DragState {
  pointerId: number;
  clientX: number;
  clientY: number;
  positionX: number;
  positionY: number;
}

export const RecordImageEditor: React.FC<RecordImageEditorProps> = ({
  imageUrl,
  positionX,
  positionY,
  scale,
  disabled = false,
  onSelect,
  onRemove,
  onPositionChange,
  onScaleChange,
  onError,
  frameAspectRatio = 4 / 3,
  previewAlt = '기록 사진 미리보기',
  dragHint = '사진을 드래그해 보이는 위치를 조정하세요',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 4, height: 3 });

  const imageAspectRatio = naturalSize.width / naturalSize.height;
  const baseWidth = imageAspectRatio >= frameAspectRatio
    ? (imageAspectRatio / frameAspectRatio) * 100
    : 100;
  const baseHeight = imageAspectRatio >= frameAspectRatio
    ? 100
    : (frameAspectRatio / imageAspectRatio) * 100;
  const renderedWidth = baseWidth * scale;
  const renderedHeight = baseHeight * scale;
  const overflowX = Math.max(0, renderedWidth - 100);
  const overflowY = Math.max(0, renderedHeight - 100);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await onSelect(file);
    } catch (error) {
      onError(error instanceof Error ? error.message : '사진을 선택하지 못했어요.');
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      positionX,
      positionY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame) return;

    const bounds = frame.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.clientX) / bounds.width) * 100;
    const deltaY = ((event.clientY - drag.clientY) / bounds.height) * 100;
    const nextX = overflowX > 0
      ? clamp(drag.positionX - (deltaX * 100) / overflowX, 0, 100)
      : drag.positionX;
    const nextY = overflowY > 0
      ? clamp(drag.positionY - (deltaY * 100) / overflowY, 0, 100)
      : drag.positionY;
    onPositionChange(nextX, nextY);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  if (!imageUrl) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full py-7 rounded-2xl border-[1.5px] border-dashed flex flex-col items-center gap-1.5 transition-all hover:text-point-500 hover:border-point-300 disabled:opacity-50"
          style={{ borderColor: '#CBD2D9', color: '#9AA5B1', background: 'rgba(255,255,255,0.4)' }}
        >
          <ImageIcon size={22} />
          <span className="text-xs font-semibold">사진 첨부하기</span>
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-2xl border border-white/70 bg-mist-100 shadow-sm touch-none cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: frameAspectRatio }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          crossOrigin="anonymous"
          src={imageUrl}
          alt={previewAlt}
          draggable={false}
          onLoad={(event) => setNaturalSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })}
          className="absolute max-w-none select-none pointer-events-none"
          style={{
            width: `${renderedWidth}%`,
            height: `${renderedHeight}%`,
            left: `${-(overflowX * positionX) / 100}%`,
            top: `${-(overflowY * positionY) / 100}%`,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 pb-2 pt-8 text-[10px] font-semibold text-white/90">
          {dragHint}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-white/55 px-3 py-2">
        <ZoomIn size={15} className="shrink-0 text-mist-400" />
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={scale}
          disabled={disabled}
          onChange={(event) => onScaleChange(Number(event.target.value))}
          className="min-w-0 flex-1 accent-violet-500"
          aria-label="사진 확대 비율"
        />
        <span className="w-10 text-right text-[11px] font-bold text-mist-500">{scale.toFixed(1)}x</span>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onPositionChange(50, 50);
            onScaleChange(1);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/55 px-3 py-1.5 text-[11px] font-semibold text-mist-500 disabled:opacity-50"
        >
          <RotateCcw size={13} /> 원래 위치
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-white/80 bg-white/55 px-3 py-1.5 text-[11px] font-semibold text-mist-500 disabled:opacity-50"
        >
          사진 교체
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50/75 px-3 py-1.5 text-[11px] font-semibold text-rose-500 disabled:opacity-50"
        >
          <X size={13} /> 제거
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
