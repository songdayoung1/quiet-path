import React from 'react';
import type { Record as RecordType } from '../types';

interface RecordImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  record: Pick<RecordType, 'imageUrl' | 'imagePositionX' | 'imagePositionY' | 'imageScale'>;
}

/** 저장된 구도값을 모든 기록 이미지에 동일하게 적용한다. */
export const RecordImage: React.FC<RecordImageProps> = ({ record, className = '', style, ...props }) => {
  const positionX = record.imagePositionX ?? 50;
  const positionY = record.imagePositionY ?? 50;
  const scale = record.imageScale ?? 1;

  if (!record.imageUrl) {
    return null;
  }

  return (
    <img
      {...props}
      crossOrigin="anonymous"
      src={record.imageUrl}
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
