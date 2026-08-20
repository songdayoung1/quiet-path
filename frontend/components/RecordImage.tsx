import React, { useEffect, useRef, useState } from 'react';
import type { Record as RecordType } from '../types';
import { useRecordImageRefresh } from '../contexts/RecordImageRefreshContext';

interface RecordImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  record: Pick<RecordType, 'id' | 'imageUrl' | 'imagePositionX' | 'imagePositionY' | 'imageScale'>;
}

const IMAGE_REFRESH_COOLDOWN_MS = 30_000;

/** 저장된 구도값을 모든 기록 이미지에 동일하게 적용한다. */
export const RecordImage: React.FC<RecordImageProps> = ({
  record,
  className = '',
  style,
  onError,
  ...props
}) => {
  const refreshImageUrl = useRecordImageRefresh();
  const [resolvedImageUrl, setResolvedImageUrl] = useState(record.imageUrl);
  const lastRefreshAtRef = useRef(0);
  const positionX = record.imagePositionX ?? 50;
  const positionY = record.imagePositionY ?? 50;
  const scale = record.imageScale ?? 1;

  useEffect(() => {
    setResolvedImageUrl(record.imageUrl);
  }, [record.imageUrl]);

  const handleImageError = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    const now = Date.now();
    if (!refreshImageUrl || now - lastRefreshAtRef.current < IMAGE_REFRESH_COOLDOWN_MS) {
      onError?.(event);
      return;
    }

    lastRefreshAtRef.current = now;
    const nextImageUrl = await refreshImageUrl(record.id);
    if (nextImageUrl && nextImageUrl !== resolvedImageUrl) {
      setResolvedImageUrl(nextImageUrl);
      return;
    }

    onError?.(event);
  };

  if (!resolvedImageUrl) {
    return null;
  }

  return (
    <img
      {...props}
      crossOrigin="anonymous"
      src={resolvedImageUrl}
      onError={(event) => void handleImageError(event)}
      className={`object-cover ${className}`}
      style={{
        objectPosition: `${positionX}% ${positionY}%`,
        transform: `scale(${scale})`,
        transformOrigin: `${positionX}% ${positionY}%`,
        ...style,
      }}
    />
  );
};
