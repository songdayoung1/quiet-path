import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRecordPreviewLine } from '../utils/recordText';

interface RecordPreviewLineProps {
  text: string;
  align?: 'left' | 'center';
  expanded?: boolean;
  textClassName?: string;
  textStyle?: React.CSSProperties;
  expandedTextClassName?: string;
  expandedTextStyle?: React.CSSProperties;
  moreClassName?: string;
  moreStyle?: React.CSSProperties;
  onMoreClick?: () => void;
}

export const RecordPreviewLine: React.FC<RecordPreviewLineProps> = ({
  text,
  align = 'left',
  expanded = false,
  textClassName = '',
  textStyle,
  expandedTextClassName = '',
  expandedTextStyle,
  moreClassName = '',
  moreStyle,
  onMoreClick,
}) => {
  const { line, hasMore } = useMemo(() => getRecordPreviewLine(text), [text]);
  const fullText = useMemo(() => text.replace(/\r\n?/g, '\n').trim(), [text]);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const node = lineRef.current;
    if (!node) {
      setIsOverflowing(false);
      return undefined;
    }

    const measure = () => {
      setIsOverflowing(node.scrollWidth - node.clientWidth > 1 || node.scrollHeight - node.clientHeight > 1);
    };

    measure();
    const frameId = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measure);
    };
  }, [line]);

  if (!line) {
    return null;
  }

  const showMore = hasMore || isOverflowing;
  const alignmentClassName = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const toggleLabel = expanded ? '접기' : '더보기';

  return (
    <div className={`flex w-full flex-col ${alignmentClassName}`}>
      {expanded ? (
        <p
          className={`w-full whitespace-pre-line break-keep ${expandedTextClassName || textClassName}`}
          style={expandedTextStyle ?? textStyle}
        >
          {fullText}
          {showMore && (
            <>
              {onMoreClick ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoreClick();
                  }}
                  className={`inline-flex align-baseline ml-2 ${moreClassName}`}
                  style={moreStyle}
                >
                  {toggleLabel}
                </button>
              ) : (
                <span className={`inline-flex align-baseline ml-2 ${moreClassName}`} style={moreStyle}>
                  {toggleLabel}
                </span>
              )}
            </>
          )}
        </p>
      ) : (
        <div className={`flex w-full items-baseline gap-2 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <p
            ref={lineRef}
            className={`overflow-hidden text-ellipsis whitespace-nowrap ${align === 'center' ? 'max-w-[calc(100%-3.5rem)] flex-none text-center' : 'min-w-0 flex-1'} ${textClassName}`}
            style={textStyle}
          >
            {line}
          </p>
          {showMore && (
            onMoreClick ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onMoreClick();
                }}
                className={`shrink-0 ${moreClassName}`}
                style={moreStyle}
              >
                {toggleLabel}
              </button>
            ) : (
              <span className={`shrink-0 ${moreClassName}`} style={moreStyle}>
                {toggleLabel}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
};
