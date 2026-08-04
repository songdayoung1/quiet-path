import { Record as RecordType, type RecordCardDisplayMode } from '../types';
import { buildLatestRecordByDateMap } from './heatmap';
import { getImageTextTones, type ImageTextTone } from './imageContrast';
import { getRecordParagraphs } from './recordText';

const CANVAS_WIDTH = 1080;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_FULL = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);

const getPhotoTextColors = (tone: ImageTextTone) => tone === 'dark'
  ? {
      primary: '#0F172A',
      secondary: 'rgba(51,65,85,0.82)',
      chipFill: 'rgba(255,255,255,0.52)',
      chipBorder: 'rgba(15,23,42,0.12)',
    }
  : {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.9)',
      chipFill: 'rgba(15,23,42,0.12)',
      chipBorder: 'rgba(255,255,255,0.42)',
    };

const setPhotoTextShadow = (ctx: CanvasRenderingContext2D, tone: ImageTextTone) => {
  ctx.shadowColor = tone === 'dark'
    ? 'rgba(255,255,255,0.72)'
    : 'rgba(15,23,42,0.48)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
};

const setPosterBodyTextShadow = (ctx: CanvasRenderingContext2D, tone: ImageTextTone) => {
  ctx.shadowColor = tone === 'dark'
    ? 'rgba(255,255,255,0.92)'
    : 'rgba(15,23,42,0.68)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
};

const MOOD_CHIP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '포근': { bg: 'rgba(245,243,255,0.92)', border: 'rgba(196,181,253,0.75)', text: '#7C3AED' },
  '반짝': { bg: 'rgba(255,251,235,0.92)', border: 'rgba(253,230,138,0.80)', text: '#D97706' },
  '잔잔': { bg: 'rgba(239,246,255,0.92)', border: 'rgba(147,197,253,0.80)', text: '#3B82F6' },
  '버팀': { bg: 'rgba(240,253,244,0.92)', border: 'rgba(134,239,172,0.80)', text: '#16A34A' },
  '두근': { bg: 'rgba(255,241,242,0.92)', border: 'rgba(254,205,211,0.85)', text: '#F43F5E' },
  '멍함': { bg: 'rgba(248,250,252,0.92)', border: 'rgba(203,213,225,0.70)', text: '#64748B' },
};

const MASCOT_URLS = {
  COZY: '/assets/mascot/mascot_3d_COZY.png',
  CALM: '/assets/mascot/mascot_3d_CALM.png',
  EXCITED: '/assets/mascot/mascot_3d_EXCITED.png',
  BLANK: '/assets/mascot/mascot_3d_BLANK.png',
  SPARKLE: '/assets/mascot/mascot_3d_SPARKLE.png',
  HOLDING: '/assets/mascot/mascot_3d_HOLDING.png',
  SLEEPING: '/assets/mascot/mascot_3d_SLEEPING.png',
};

type CharacterMood = keyof typeof MASCOT_URLS;

const MOOD_EXPORT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '포근': { bg: '#FAF5FF', border: '#DDD6FE', text: '#7C3AED' },
  '반짝': { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  '잔잔': { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  '버팀': { bg: '#ECFDF5', border: '#BBF7D0', text: '#047857' },
  '두근': { bg: '#FFF1F2', border: '#FECDD3', text: '#E11D48' },
  '멍함': { bg: '#F8FAFC', border: '#E4E7EB', text: '#64748B' },
};

const MOOD_ACTIVITY_CELL_COLORS: Record<string, string> = {
  '포근': '#C4B5FD',
  '반짝': '#FCD34D',
  '잔잔': '#BFDBFE',
  '버팀': '#86EFAC',
  '두근': '#FDA4AF',
  '멍함': '#94A3B8',
};

const getMoodExportColor = (mood?: string) =>
  (mood && MOOD_EXPORT_COLORS[mood]) || MOOD_EXPORT_COLORS['멍함'];

const getMoodActivityCellColor = (mood?: string) =>
  (mood && MOOD_ACTIVITY_CELL_COLORS[mood]) || MOOD_ACTIVITY_CELL_COLORS['멍함'];

const CALENDAR_EXPORT_MOOD_ORDER = ['포근', '반짝', '잔잔', '버팀', '두근', '멍함'] as const;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveCharacterMood = (mood?: string): CharacterMood => {
  switch (mood) {
    case '잔잔': return 'CALM';
    case '반짝': return 'SPARKLE';
    case '두근': return 'EXCITED';
    case '버팀': return 'HOLDING';
    case '멍함': return 'BLANK';
    case '포근': return 'COZY';
    default: return 'COZY';
  }
};

const formatFileDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'));
    image.src = src;
  });

const clipImageCover = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  positionX = 50,
  positionY = 50,
  scale = 1,
) => {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;

  if (sourceRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * sourceRatio;
  } else {
    drawWidth = width;
    drawHeight = width / sourceRatio;
  }

  drawWidth *= scale;
  drawHeight *= scale;
  const offsetX = x - (drawWidth - width) * (positionX / 100);
  const offsetY = y - (drawHeight - height) * (positionY / 100);

  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
};

const appendEllipsis = (line: string) => `${line.replace(/[.…]+$/, '')}…`;

const wrapTextLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) => {
  const lines = wrapTextLines(ctx, text, maxWidth);
  if (lines.length <= maxLines) {
    return lines;
  }

  const truncatedLines = lines.slice(0, maxLines);
  if (truncatedLines.length > 0) {
    truncatedLines[truncatedLines.length - 1] = appendEllipsis(truncatedLines[truncatedLines.length - 1]);
  }

  return truncatedLines;
};

const drawMultilineText = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number
) => {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
};

const wrapParagraphBlocks = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) => {
  const paragraphBlocks = getRecordParagraphs(text, { splitSingleNewline: true })
    .map((paragraph) => wrapTextLines(ctx, paragraph, maxWidth))
    .filter((lines) => lines.length > 0);

  if (paragraphBlocks.length === 0) {
    return [];
  }

  const limitedBlocks: string[][] = [];
  let usedLines = 0;

  for (let index = 0; index < paragraphBlocks.length; index += 1) {
    const block = paragraphBlocks[index];
    const remainingLines = maxLines - usedLines;

    if (remainingLines <= 0) {
      const lastBlock = limitedBlocks[limitedBlocks.length - 1];
      lastBlock[lastBlock.length - 1] = appendEllipsis(lastBlock[lastBlock.length - 1]);
      break;
    }

    if (block.length <= remainingLines) {
      limitedBlocks.push(block);
      usedLines += block.length;
      continue;
    }

    const partialBlock = block.slice(0, remainingLines);
    partialBlock[partialBlock.length - 1] = appendEllipsis(partialBlock[partialBlock.length - 1]);
    limitedBlocks.push(partialBlock);
    break;
  }

  return limitedBlocks;
};

const drawParagraphBlocks = (
  ctx: CanvasRenderingContext2D,
  blocks: string[][],
  x: number,
  startY: number,
  lineHeight: number,
  paragraphGap: number
) => {
  let cursorY = startY;

  blocks.forEach((lines, blockIndex) => {
    drawMultilineText(ctx, lines, x, cursorY, lineHeight);
    cursorY += lines.length * lineHeight;

    if (blockIndex < blocks.length - 1) {
      cursorY += paragraphGap;
    }
  });

  return cursorY;
};

const drawMascotImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  opacity = 1
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  ctx.restore();
};

const measureTrackedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number
) => {
  const chars = Array.from(text);
  return chars.reduce((total, char, index) => {
    const next = total + ctx.measureText(char).width;
    return index < chars.length - 1 ? next + letterSpacing : next;
  }, 0);
};

const drawTrackedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
) => {
  const chars = Array.from(text);
  let cursorX = x;
  chars.forEach((char, index) => {
    ctx.fillText(char, cursorX, y);
    cursorX += ctx.measureText(char).width;
    if (index < chars.length - 1) {
      cursorX += letterSpacing;
    }
  });
};

const drawExportWordmark = (
  ctx: CanvasRenderingContext2D,
  {
    mascotImage,
    x,
    y,
    mascotSize,
    textColor,
    fontSize,
    letterSpacing,
    gap,
    align = 'left',
    opacity = 1,
    mascotOffsetY,
  }: {
    mascotImage: HTMLImageElement | null;
    x: number;
    y: number;
    mascotSize: number;
    textColor: string;
    fontSize: number;
    letterSpacing: number;
    gap: number;
    align?: 'left' | 'center' | 'right';
    opacity?: number;
    mascotOffsetY?: number;
  }
) => {
  const text = 'QUIET PATH';
  ctx.save();
  ctx.font = `800 ${fontSize}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.textBaseline = 'middle';
  const textWidth = measureTrackedText(ctx, text, letterSpacing);
  const hasMascot = !!mascotImage;
  const totalWidth = textWidth + (hasMascot ? mascotSize + gap : 0);

  let startX = x;
  if (align === 'center') {
    startX = x - totalWidth / 2;
  } else if (align === 'right') {
    startX = x - totalWidth;
  }

  if (mascotImage) {
    drawMascotImage(
      ctx,
      mascotImage,
      startX + mascotSize / 2,
      y + (mascotOffsetY ?? -mascotSize * 0.08),
      mascotSize,
      opacity
    );
  }

  ctx.fillStyle = textColor;
  drawTrackedText(ctx, text, startX + (hasMascot ? mascotSize + gap : 0), y, letterSpacing);
  ctx.restore();
};

const drawExportFooterText = (
  ctx: CanvasRenderingContext2D,
  {
    text,
    x,
    y,
    color,
    fontSize,
    align = 'center',
  }: {
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
    align?: CanvasTextAlign;
  }
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.restore();
};

const drawMonthlyExportHeader = (
  ctx: CanvasRenderingContext2D,
  {
    mascotImage,
    cardX,
    cardY,
    cardWidth,
    scale,
    year,
    month,
    recordsCount,
    subtitle,
  }: {
    mascotImage: HTMLImageElement | null;
    cardX: number;
    cardY: number;
    cardWidth: number;
    scale: number;
    year: number;
    month: number;
    recordsCount: number;
    subtitle: string;
  }
) => {
  const s = (value: number) => value * scale;
  const innerX = cardX + s(32);
  const innerRight = cardX + cardWidth - s(32);
  const innerWidth = innerRight - innerX;
  const headerTop = cardY + s(28);

  drawExportWordmark(ctx, {
    mascotImage,
    x: innerX,
    y: headerTop + s(18),
    mascotSize: s(22),
    textColor: '#616E7C',
    fontSize: s(11),
    letterSpacing: s(3.6),
    gap: s(8),
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9AA5B1';
  ctx.font = `500 ${s(9)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText('R E C O R D S', innerRight, headerTop + s(10));
  ctx.fillStyle = '#7C3AED';
  ctx.font = `800 ${s(26)}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.fillText(String(recordsCount), innerRight, headerTop + s(38));

  let cursorY = headerTop + s(68);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = `800 ${s(30)}px "SF Pro Display", "Pretendard", sans-serif`;
  const titlePrefix = `${year} `;
  ctx.fillText(titlePrefix, innerX, cursorY);
  const titlePrefixWidth = ctx.measureText(titlePrefix).width;
  ctx.fillStyle = '#7C3AED';
  ctx.fillText(`${month}월`, innerX + titlePrefixWidth, cursorY);

  cursorY += s(22);
  ctx.fillStyle = '#64748B';
  ctx.font = `500 ${s(12)}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.fillText(subtitle, innerX, cursorY);

  return {
    innerX,
    innerRight,
    innerWidth,
    bodyStartY: cursorY + s(18),
  };
};

const drawMonthlyCollageHeader = (
  ctx: CanvasRenderingContext2D,
  {
    mascotImage,
    cardX,
    cardY,
    cardWidth,
    scale,
    year,
    month,
    records,
    subtitle,
  }: {
    mascotImage: HTMLImageElement | null;
    cardX: number;
    cardY: number;
    cardWidth: number;
    scale: number;
    year: number;
    month: number;
    records: RecordType[];
    subtitle?: string;
  }
) => {
  const s = (value: number) => value * scale;
  const innerX = cardX + s(32);
  const innerRight = cardX + cardWidth - s(32);
  const innerWidth = innerRight - innerX;
  const headerTop = cardY + s(28);

  drawExportWordmark(ctx, {
    mascotImage,
    x: innerX,
    y: headerTop + s(18),
    mascotSize: s(22),
    textColor: '#616E7C',
    fontSize: s(11),
    letterSpacing: s(3.6),
    gap: s(8),
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9AA5B1';
  ctx.font = `500 ${s(9)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText(`${year}. ${MONTHS_FULL[month - 1]}`, innerRight, headerTop + s(18));

  let cursorY = headerTop + s(68);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = `800 ${s(30)}px "SF Pro Display", "Pretendard", sans-serif`;
  const titlePrefix = '이 달의 ';
  ctx.fillText(titlePrefix, innerX, cursorY);
  const titlePrefixWidth = ctx.measureText(titlePrefix).width;
  ctx.fillStyle = '#7C3AED';
  ctx.fillText('기록', innerX + titlePrefixWidth, cursorY);

  cursorY += s(22);
  ctx.font = `500 ${s(12)}px "SF Pro Display", "Pretendard", sans-serif`;

  if (subtitle) {
    ctx.fillStyle = '#64748B';
    ctx.fillText(subtitle, innerX, cursorY);
  } else {
    const dominantMood = getMostFrequentMood(records);

    if (!dominantMood) {
      ctx.fillStyle = '#64748B';
      ctx.fillText(`${records.length}개의 장면을 담았어요.`, innerX, cursorY);
    } else {
      const beforeText = `${records.length}개의 장면 · 가장 많이 느낀 건 `;
      const afterText = '이에요.';
      const moodColor = getMoodExportColor(dominantMood).text;

      ctx.fillStyle = '#64748B';
      ctx.fillText(beforeText, innerX, cursorY);
      const beforeWidth = ctx.measureText(beforeText).width;

      ctx.fillStyle = moodColor;
      ctx.fillText(dominantMood, innerX + beforeWidth, cursorY);
      const moodWidth = ctx.measureText(dominantMood).width;

      ctx.fillStyle = '#64748B';
      ctx.fillText(afterText, innerX + beforeWidth + moodWidth, cursorY);
    }
  }

  return {
    innerX,
    innerRight,
    innerWidth,
    bodyStartY: cursorY + s(24),
  };
};

const limitParagraphBlocks = (blocks: string[][], maxBlocks: number) => {
  if (blocks.length <= maxBlocks) {
    return blocks;
  }

  const limitedBlocks = blocks.slice(0, maxBlocks).map((lines) => [...lines]);
  const lastBlock = limitedBlocks[limitedBlocks.length - 1];
  lastBlock[lastBlock.length - 1] = appendEllipsis(lastBlock[lastBlock.length - 1]);
  return limitedBlocks;
};

const getParagraphBlocksHeight = (
  blocks: string[][],
  lineHeight: number,
  paragraphGap: number
) =>
  blocks.reduce(
    (height, lines, index) => height + lines.length * lineHeight + (index < blocks.length - 1 ? paragraphGap : 0),
    0
  );

const drawDirectionSummaryWithText = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxWidth: number,
  directionText: string,
  textColor: string,
  labelColor: string
) => {
  ctx.fillStyle = labelColor;
  ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('현재 방향', x, y);

  ctx.fillStyle = textColor;
  ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
  const directionLines = wrapText(ctx, directionText || '오늘의 방향', maxWidth, 2);
  drawMultilineText(ctx, directionLines, x, y + 42, 38);
  return directionLines.length;
};

const drawDateBlock = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  timestamp: number,
  textColor: string
) => {
  const date = new Date(timestamp);
  ctx.fillStyle = textColor;
  ctx.font = '800 18px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(`${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]}`, x, y);
  ctx.font = '800 78px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(String(date.getDate()).padStart(2, '0'), x, y + 82);
  return date;
};

const drawMoodChip = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  moodCode: string,
  variant: 'photo' | 'paper'
) => {
  ctx.font = '700 24px "SF Pro Display", "Pretendard", sans-serif';
  const chipWidth = Math.max(ctx.measureText(moodCode).width + 78, 152);
  roundedRect(ctx, x, y, chipWidth, 56, 28);
  ctx.fillStyle = variant === 'photo' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.strokeStyle = variant === 'photo' ? 'rgba(255,255,255,0.42)' : 'rgba(148,163,184,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = variant === 'photo' ? '#FFFFFF' : '#7C3AED';
  ctx.fillText(moodCode, x + 28, y + 37);
  return chipWidth;
};

const drawMascotRail = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  mascotImages: HTMLImageElement[]
) => {
  const containerWidth = 296;
  const containerHeight = 74;
  const x = centerX - containerWidth / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(82,96,109,0.12)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  roundedRect(ctx, x, y, containerWidth, containerHeight, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  ctx.restore();

  roundedRect(ctx, x, y, containerWidth, containerHeight, 24);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const sizes = [44, 32, 38, 32, 32];
  const startX = x + 32;
  mascotImages.forEach((img, index) => {
    const mascotX = startX + index * 56;
    drawMascotImage(ctx, img, mascotX, y + 30, sizes[index], index === 0 ? 1 : 0.85);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.arc(mascotX, y + 56, 3, 0, Math.PI * 2);
    ctx.fill();
  });
};

const createPosterRecordCardBlob = async (record: RecordType) => {
  const hasPhoto = !!record.imageUrl;

  let CANVAS_HEIGHT: number;
  if (hasPhoto) {
    CANVAS_HEIGHT = 1440;
  } else {
    const simCtx = document.createElement('canvas').getContext('2d');
    if (simCtx) {
      const simContentWidth = CANVAS_WIDTH - 72 * 2 - 144 - 40; // cardX*2 + innerPad*2 + textGap
      simCtx.font = '700 50px "SF Pro Display", "Pretendard", sans-serif';
      const allBlocks = wrapParagraphBlocks(simCtx, record.action, simContentWidth, 100);
      let sim = 72 + 420 + 64; // cardY + content offset + label height
      allBlocks.forEach((lines, i) => {
        sim += lines.length * 74;
        if (i < allBlocks.length - 1) sim += 20;
      });
      if (record.oneWordText?.trim()) sim += 24 + 106;
      CANVAS_HEIGHT = Math.max(1200, sim + 340); // 340 = rail gap + rail + bottom padding
    } else {
      CANVAS_HEIGHT = 1200;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('이미지 캔버스를 준비하지 못했어요.');
  }

  const background = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  background.addColorStop(0, '#C8D5FF');
  background.addColorStop(1, '#B8D4CF');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cardX = 72;
  const cardY = 72;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const cardHeight = CANVAS_HEIGHT - cardY * 2;
  const contentX = cardX + 72;
  const contentWidth = cardWidth - 144;
  const date = new Date(record.timestamp);
  const directionText = record.directionQuestion || '오늘의 방향';

  const characterMood = resolveCharacterMood(record.moodCode);
  const mascotRailMoods: CharacterMood[] = [characterMood, 'COZY', 'SPARKLE', 'CALM', 'HOLDING'];

  const loadedMascots = await Promise.all(
    mascotRailMoods.map((mood) => loadImage(MASCOT_URLS[mood]))
  ).catch(() => []); // fallback to empty array if load fails

  const mainMascotImg = loadedMascots[0] ?? null;
  const wordmarkMascotImg = loadedMascots[1] ?? null; // COZY

  ctx.save();
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 44);
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
  cardGrad.addColorStop(0, '#ECEFFE');
  cardGrad.addColorStop(1, '#E2EEEC');
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  if (hasPhoto) {
    const image = await loadImage(record.imageUrl!);
    const photoTextTones = getImageTextTones(image, {
      positionX: record.imagePositionX,
      positionY: record.imagePositionY,
      scale: record.imageScale,
      targetAspectRatio: cardWidth / cardHeight,
      topSampleEnd: 0.34,
      bodySampleStart: 0.54,
      bodySampleEnd: 0.96,
    });
    const leftTextColors = getPhotoTextColors(photoTextTones.left);
    const rightTextColors = getPhotoTextColors(photoTextTones.right);
    const bodyTextColors = getPhotoTextColors(photoTextTones.body);
    clipImageCover(
      ctx,
      image,
      cardX,
      cardY,
      cardWidth,
      cardHeight,
      44,
      record.imagePositionX,
      record.imagePositionY,
      record.imageScale,
    );

    ctx.save();
    setPhotoTextShadow(ctx, photoTextTones.left);
    drawExportWordmark(ctx, {
      mascotImage: wordmarkMascotImg,
      x: contentX - 6,
      y: cardY + 78,
      mascotSize: 36,
      textColor: leftTextColors.secondary,
      fontSize: 22,
      letterSpacing: 3.5,
      gap: 8,
    });
    ctx.restore();

    const dirLeftX = cardX + cardWidth - 340;
    ctx.save();
    setPhotoTextShadow(ctx, photoTextTones.right);
    ctx.textAlign = 'left';
    drawDirectionSummaryWithText(
      ctx,
      dirLeftX,
      cardY + 83,
      268,
      directionText,
      rightTextColors.primary,
      rightTextColors.secondary,
    );
    ctx.restore();

    ctx.save();
    setPhotoTextShadow(ctx, photoTextTones.left);
    ctx.textAlign = 'left';
    ctx.fillStyle = leftTextColors.secondary;
    ctx.font = '800 18px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(`${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]}`, contentX, cardY + 224);
    ctx.fillStyle = leftTextColors.primary;
    ctx.font = '800 110px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(String(date.getDate()).padStart(2, '0'), contentX - 4, cardY + 322);
    ctx.restore();

    ctx.save();
    setPhotoTextShadow(ctx, photoTextTones.right);
    ctx.textAlign = 'right';
    ctx.fillStyle = rightTextColors.primary;
    ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(fmtTime(date), cardX + cardWidth - 72, cardY + 224);
    ctx.restore();

    if (record.moodCode) {
      ctx.font = '700 24px "SF Pro Display", "Pretendard", sans-serif';
      const moodWidth = Math.max(ctx.measureText(record.moodCode).width + 60, 120);
      roundedRect(ctx, cardX + cardWidth - 72 - moodWidth, cardY + 270, moodWidth, 52, 26);
      ctx.fillStyle = rightTextColors.chipFill;
      ctx.fill();
      ctx.strokeStyle = rightTextColors.chipBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.save();
      setPhotoTextShadow(ctx, photoTextTones.right);
      ctx.fillStyle = rightTextColors.primary;
      ctx.textAlign = 'center';
      ctx.fillText(record.moodCode, cardX + cardWidth - 72 - moodWidth / 2, cardY + 302);
      ctx.restore();
    }

    const actionBlocks = wrapParagraphBlocks(ctx, record.action, contentWidth - 80, 4);
    let cursorY = cardY + cardHeight - 540;

    ctx.save();
    setPosterBodyTextShadow(ctx, photoTextTones.body);
    ctx.textAlign = 'center';
    ctx.fillStyle = bodyTextColors.secondary;
    ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('오늘의 기록', CANVAS_WIDTH / 2, cursorY);
    cursorY += 64;

    ctx.fillStyle = bodyTextColors.primary;
    ctx.font = '700 52px "SF Pro Display", "Pretendard", sans-serif';
    cursorY = drawParagraphBlocks(ctx, actionBlocks, CANVAS_WIDTH / 2, cursorY, 68, 18);
    ctx.restore();

    if (record.oneWordText?.trim()) {
      cursorY += 34;
      const quoteText = `"${record.oneWordText.trim()}"`;
      ctx.textAlign = 'center';
      ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
      const textWidth = ctx.measureText(quoteText).width;
      const pillWidth = Math.min(contentWidth - 20, textWidth + 180);

      roundedRect(ctx, CANVAS_WIDTH / 2 - pillWidth / 2, cursorY, pillWidth, 82, 41);
      ctx.fillStyle = 'rgba(245,243,255,0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(196,181,253,0.6)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText('한 단어', CANVAS_WIDTH / 2 - textWidth / 2 - 28, cursorY + 50);
      ctx.fillStyle = '#CBD2D9';
      ctx.fillRect(CANVAS_WIDTH / 2 - textWidth / 2 + 14, cursorY + 41, 26, 2);
      ctx.fillStyle = '#7C3AED';
      ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText(quoteText, CANVAS_WIDTH / 2 + 50, cursorY + 52);
    }

    if (loadedMascots.length > 0) {
      drawMascotRail(ctx, CANVAS_WIDTH / 2, cardY + cardHeight - 160, loadedMascots);
    }

    drawExportFooterText(ctx, {
      text: 'quietpath.app',
      x: cardX + 44,
      y: cardY + cardHeight - 44,
      color: bodyTextColors.secondary,
      fontSize: 15,
      align: 'left',
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('카드 이미지를 만들지 못했어요.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  }

  const paperGlow = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 600);
  paperGlow.addColorStop(0, 'rgba(255,255,255,0.4)');
  paperGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = paperGlow;
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

  if (mainMascotImg) drawMascotImage(ctx, mainMascotImg, contentX + 80, cardY + 600, 520, 0.12);

  ctx.textAlign = 'left';
  drawExportWordmark(ctx, {
    mascotImage: wordmarkMascotImg,
    x: contentX - 6,
    y: cardY + 78,
    mascotSize: 36,
    textColor: '#7B8794',
    fontSize: 22,
    letterSpacing: 3.5,
    gap: 8,
  });

  const dirLeftX = cardX + cardWidth - 340;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 13px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('현재 방향', dirLeftX, cardY + 83);
  ctx.fillStyle = '#7C3AED';
  ctx.font = '700 26px "SF Pro Display", "Pretendard", sans-serif';
  const noDirLines = wrapText(ctx, directionText, 268, 2);
  noDirLines.forEach((line, i) => ctx.fillText(line, dirLeftX, cardY + 116 + i * 38));

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = '800 18px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(`${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]}`, contentX, cardY + 184);
  ctx.font = '800 110px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(String(date.getDate()).padStart(2, '0'), contentX - 4, cardY + 288);

  if (record.moodCode) {
    ctx.font = '700 24px "SF Pro Display", "Pretendard", sans-serif';
    const moodWidth = Math.max(ctx.measureText(record.moodCode).width + 78, 152);
    const moodColors = MOOD_CHIP_COLORS[record.moodCode] ?? MOOD_CHIP_COLORS['포근'];
    roundedRect(ctx, cardX + cardWidth - 72 - moodWidth, cardY + 232, moodWidth, 56, 28);
    ctx.fillStyle = moodColors.bg;
    ctx.fill();
    ctx.strokeStyle = moodColors.border;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = moodColors.text;
    ctx.textAlign = 'center';
    ctx.fillText(record.moodCode, cardX + cardWidth - 72 - moodWidth / 2, cardY + 270);
  }

  let cursorY = cardY + 420;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('오늘의 기록', CANVAS_WIDTH / 2, cursorY);
  cursorY += 64;

  ctx.fillStyle = '#1E293B';
  ctx.font = '700 50px "SF Pro Display", "Pretendard", sans-serif';
  const actionBlocks = wrapParagraphBlocks(ctx, record.action, contentWidth - 40, 100);

  actionBlocks.forEach((lines) => {
    lines.forEach((line) => {
      ctx.fillText(line, CANVAS_WIDTH / 2, cursorY);
      cursorY += 74;
    });
    cursorY += 20;
  });

  if (record.oneWordText?.trim()) {
    cursorY += 24;
    ctx.textAlign = 'center';

    const quoteText = `"${record.oneWordText.trim()}"`;
    ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
    const textWidth = ctx.measureText(quoteText).width;
    const pillWidth = Math.min(contentWidth, textWidth + 180);

    roundedRect(ctx, CANVAS_WIDTH / 2 - pillWidth / 2, cursorY, pillWidth, 82, 41);
    ctx.fillStyle = 'rgba(245,243,255,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(196,181,253,0.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('한 단어', CANVAS_WIDTH / 2 - textWidth / 2 - 28, cursorY + 50);
    ctx.fillStyle = '#CBD2D9';
    ctx.fillRect(CANVAS_WIDTH / 2 - textWidth / 2 + 14, cursorY + 41, 26, 2);
    ctx.fillStyle = '#7C3AED';
    ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(quoteText, CANVAS_WIDTH / 2 + 50, cursorY + 52);
    cursorY += 106;
  }

  const railY = cursorY + 80;
  if (loadedMascots.length > 0) {
    drawMascotRail(ctx, CANVAS_WIDTH / 2, railY, loadedMascots);
  }

  drawExportFooterText(ctx, {
    text: 'quietpath.app',
    x: cardX + 44,
    y: cardY + cardHeight - 44,
    color: 'rgba(148,163,184,0.6)',
    fontSize: 15,
    align: 'left',
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('카드 이미지를 만들지 못했어요.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

const createDiaryPhotoRecordCardBlob = async (record: RecordType) => {
  const image = await loadImage(record.imageUrl!);
  const photoTextTones = getImageTextTones(image, {
    positionX: record.imagePositionX,
    positionY: record.imagePositionY,
    scale: record.imageScale,
  });
  const leftTextColors = getPhotoTextColors(photoTextTones.left);
  const rightTextColors = getPhotoTextColors(photoTextTones.right);
  const simCtx = document.createElement('canvas').getContext('2d');
  const CANVAS_HEIGHT = 1440;
  const cardX = 72;
  const cardY = 72;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const cardHeight = CANVAS_HEIGHT - cardY * 2;
  const imageHeight = 590;
  const contentWidth = cardWidth - 144;
  const contentX = CANVAS_WIDTH / 2;
  const contentLeftX = cardX + 72;
  const date = new Date(record.timestamp);
  const directionText = record.directionQuestion || '오늘의 방향';
  const characterMood = resolveCharacterMood(record.moodCode);
  const mascotRailMoods: CharacterMood[] = [characterMood, 'COZY', 'SPARKLE', 'CALM', 'HOLDING'];
  const loadedMascots = await Promise.all(
    mascotRailMoods.map((mood) => loadImage(MASCOT_URLS[mood]))
  ).catch(() => []);
  const mainMascotImg = loadedMascots[0] ?? null;
  const wordmarkMascotImg = loadedMascots[1] ?? null;
  const actionBlocks = simCtx
    ? (() => {
        simCtx.font = '700 50px "SF Pro Display", "Pretendard", sans-serif';
        return wrapParagraphBlocks(
          simCtx,
          record.action,
          contentWidth - 40,
          record.tomorrowText?.trim() ? 4 : 5
        );
      })()
    : [];
  const tomorrowBlocks = simCtx && record.tomorrowText?.trim()
    ? (() => {
        simCtx.font = '600 28px "SF Pro Display", "Pretendard", sans-serif';
        return wrapParagraphBlocks(simCtx, record.tomorrowText.trim(), contentWidth - 56, 2);
      })()
    : [];
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('이미지 캔버스를 준비하지 못했어요.');
  }

  const background = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  background.addColorStop(0, '#EEF1FF');
  background.addColorStop(1, '#E4F2F0');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const topGlow = ctx.createRadialGradient(116, 0, 0, 116, 0, 520);
  topGlow.addColorStop(0, 'rgba(196,181,253,0.4)');
  topGlow.addColorStop(1, 'rgba(196,181,253,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bottomGlow = ctx.createRadialGradient(CANVAS_WIDTH, CANVAS_HEIGHT, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 560);
  bottomGlow.addColorStop(0, 'rgba(178,223,219,0.42)');
  bottomGlow.addColorStop(1, 'rgba(178,223,219,0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  ctx.shadowColor = 'rgba(82,96,109,0.16)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 16;
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 44);
  ctx.clip();
  clipImageCover(
    ctx,
    image,
    cardX,
    cardY,
    cardWidth,
    imageHeight,
    0,
    record.imagePositionX,
    record.imagePositionY,
    record.imageScale,
  );
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillRect(cardX, cardY + imageHeight, cardWidth, cardHeight - imageHeight);
  ctx.restore();

  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 44);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  setPhotoTextShadow(ctx, photoTextTones.left);
  drawExportWordmark(ctx, {
    mascotImage: wordmarkMascotImg,
    x: contentLeftX - 6,
    y: cardY + 78,
    mascotSize: 36,
    textColor: leftTextColors.secondary,
    fontSize: 22,
    letterSpacing: 3.5,
    gap: 8,
  });
  ctx.restore();

  const dirLeftX = cardX + cardWidth - 340;
  ctx.save();
  setPhotoTextShadow(ctx, photoTextTones.right);
  ctx.textAlign = 'left';
  drawDirectionSummaryWithText(
    ctx,
    dirLeftX,
    cardY + 83,
    268,
    directionText,
    rightTextColors.primary,
    rightTextColors.secondary,
  );
  ctx.restore();

  ctx.save();
  setPhotoTextShadow(ctx, photoTextTones.left);
  ctx.textAlign = 'left';
  ctx.fillStyle = leftTextColors.secondary;
  ctx.font = '800 18px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(`${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]}`, contentLeftX, cardY + 224);
  ctx.fillStyle = leftTextColors.primary;
  ctx.font = '800 110px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(String(date.getDate()).padStart(2, '0'), contentLeftX - 4, cardY + 322);
  ctx.restore();

  ctx.save();
  setPhotoTextShadow(ctx, photoTextTones.right);
  ctx.textAlign = 'right';
  ctx.fillStyle = rightTextColors.primary;
  ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(fmtTime(date), cardX + cardWidth - 72, cardY + 224);
  ctx.restore();

  if (record.moodCode) {
    ctx.font = '700 24px "SF Pro Display", "Pretendard", sans-serif';
    const moodWidth = Math.max(ctx.measureText(record.moodCode).width + 60, 120);
    roundedRect(ctx, cardX + cardWidth - 72 - moodWidth, cardY + 270, moodWidth, 52, 26);
    ctx.fillStyle = rightTextColors.chipFill;
    ctx.fill();
    ctx.strokeStyle = rightTextColors.chipBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    setPhotoTextShadow(ctx, photoTextTones.right);
    ctx.fillStyle = rightTextColors.primary;
    ctx.textAlign = 'center';
    ctx.fillText(record.moodCode, cardX + cardWidth - 72 - moodWidth / 2, cardY + 302);
    ctx.restore();
  }

  if (mainMascotImg) {
    drawMascotImage(ctx, mainMascotImg, cardX + cardWidth - 98, cardY + imageHeight + 188, 124, 0.15);
  }

  let cursorY = cardY + imageHeight + 60;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('오늘의 기록', contentX, cursorY);
  cursorY += 72;

  ctx.fillStyle = '#1E293B';
  ctx.font = '700 50px "SF Pro Display", "Pretendard", sans-serif';
  if (actionBlocks.length === 0) {
    ctx.fillText(record.action, contentX, cursorY);
    cursorY += 64;
  } else {
    cursorY = drawParagraphBlocks(ctx, actionBlocks, contentX, cursorY, 64, 16);
  }

  if (record.oneWordText?.trim()) {
    cursorY += 34;
    const quoteText = `"${record.oneWordText.trim()}"`;
    ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
    const textWidth = ctx.measureText(quoteText).width;
    const pillWidth = Math.min(contentWidth - 20, textWidth + 180);
    roundedRect(ctx, contentX - pillWidth / 2, cursorY, pillWidth, 82, 41);
    ctx.fillStyle = 'rgba(245,243,255,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(196,181,253,0.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('한 단어', contentX - textWidth / 2 - 28, cursorY + 50);
    ctx.fillStyle = '#CBD2D9';
    ctx.fillRect(contentX - textWidth / 2 + 14, cursorY + 41, 26, 2);
    ctx.fillStyle = '#7C3AED';
    ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(quoteText, contentX + 50, cursorY + 52);
    cursorY += 106;
  }

  if (tomorrowBlocks.length > 0) {
    cursorY += 26;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('내일의 메모', contentX, cursorY);
    cursorY += 38;
    ctx.fillStyle = '#64748B';
    ctx.font = '600 28px "SF Pro Display", "Pretendard", sans-serif';
    cursorY = drawParagraphBlocks(ctx, tomorrowBlocks, contentX, cursorY, 40, 10);
  }

  if (loadedMascots.length > 0) {
    drawMascotRail(ctx, CANVAS_WIDTH / 2, cardY + cardHeight - 160, loadedMascots);
  }

  drawExportFooterText(ctx, {
    text: 'quietpath.app',
    x: cardX + 44,
    y: cardY + cardHeight - 44,
    color: 'rgba(148,163,184,0.6)',
    fontSize: 15,
    align: 'left',
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('카드 이미지를 만들지 못했어요.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ─── Monthly Collage ────────────────────────────────────────────────────────

const COLLAGE_CANVAS_HEIGHT = 1350;
const COLLAGE_TILE_COLS = 2;
const COLLAGE_TILE_ROWS = 4;
const COLLAGE_TILES_PER_PAGE = COLLAGE_TILE_COLS * COLLAGE_TILE_ROWS;

const getMostFrequentMood = (records: RecordType[]): string => {
  const counts: Record<string, number> = {};
  for (const r of records) {
    if (r.moodCode) counts[r.moodCode] = (counts[r.moodCode] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '';
  const topCount = entries[0][1];
  const tiedMoods = new Set(entries.filter(([, c]) => c === topCount).map(([m]) => m));
  if (tiedMoods.size === 1) return entries[0][0];
  // 동률이면 가장 최근에 기록된 무드 사용
  const byRecent = [...records].sort((a, b) => b.timestamp - a.timestamp);
  for (const r of byRecent) {
    if (r.moodCode && tiedMoods.has(r.moodCode)) return r.moodCode;
  }
  return entries[0][0];
};

const drawCollageTile = (
  ctx: CanvasRenderingContext2D,
  record: RecordType | null,
  x: number,
  y: number,
  width: number,
  height: number,
  allowParagraphBlocks = false
) => {
  const radius = 40;

  if (!record) {
    ctx.save();
    ctx.shadowColor = 'rgba(148,163,184,0.12)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fill();
    ctx.restore();
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = 'rgba(226,232,240,0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const moodColors = record.moodCode
    ? getMoodExportColor(record.moodCode)
    : getMoodExportColor('멍함');
  const moodChipColors = record.moodCode
    ? (MOOD_CHIP_COLORS[record.moodCode] ?? MOOD_CHIP_COLORS['멍함'])
    : MOOD_CHIP_COLORS['멍함'];
  const accentColor = moodColors.border;

  ctx.save();
  ctx.shadowColor = 'rgba(148,163,184,0.14)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.restore();

  const tileBackground = ctx.createLinearGradient(x, y, x + width, y + height);
  tileBackground.addColorStop(0, 'rgba(255,255,255,0.98)');
  tileBackground.addColorStop(1, 'rgba(248,250,252,0.94)');

  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = tileBackground;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y, width, Math.max(6, height * 0.028));
  ctx.restore();

  const padX = height >= 280 ? 34 : 28;
  const dateY = y + (height >= 280 ? 50 : 42);
  const dateFontSize = height >= 280 ? 19 : 17;
  const bodyFontSize = height >= 280 ? 28 : 24;
  const bodyLineHeight = height >= 280 ? 38 : 34;
  const bodyMaxLines = allowParagraphBlocks ? (height >= 280 ? 4 : 3) : 3;
  const oneWordFontSize = height >= 280 ? 18 : 16;

  ctx.fillStyle = moodChipColors.text;
  ctx.beginPath();
  ctx.arc(x + padX + 8, dateY - 8, height >= 280 ? 7 : 6, 0, Math.PI * 2);
  ctx.fill();

  const d = new Date(record.timestamp);
  const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  ctx.fillStyle = '#94A3B8';
  ctx.font = `700 ${dateFontSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(dateStr, x + padX + 24, dateY);

  ctx.fillStyle = '#334155';
  ctx.font = `700 ${bodyFontSize}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.textAlign = 'center';
  const paragraphBlocks = limitParagraphBlocks(
    wrapParagraphBlocks(ctx, record.action, width - padX * 2, bodyMaxLines),
    3
  );
  const blockHeight = getParagraphBlocksHeight(paragraphBlocks, bodyLineHeight, 14);
  const bodyLineCount = paragraphBlocks.reduce((count, lines) => count + lines.length, 0);
  const paragraphCount = paragraphBlocks.length;
  const contentLift = Math.min(
    Math.max(bodyLineCount - 1, 0) * 12 + Math.max(paragraphCount - 1, 0) * 6,
    height >= 280 ? 36 : 28
  );
  const contentTop = y + (height >= 280 ? 110 : 92) - contentLift;
  const contentBottom = y + height - (height >= 280 ? 76 : 64);
  const availableHeight = Math.max(contentBottom - contentTop, blockHeight);
  const startY =
    contentTop +
    Math.max((availableHeight - blockHeight) / 2, 0) +
    bodyLineHeight -
    6;
  drawParagraphBlocks(ctx, paragraphBlocks, x + width / 2, startY, bodyLineHeight, 14);

  if (record.oneWordText?.trim()) {
    ctx.fillStyle = moodChipColors.text;
    ctx.font = `700 ${oneWordFontSize}px "SF Pro Display", "Pretendard", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(record.oneWordText.trim(), x + width - padX, y + height - padX);
  }
};

const createMonthlyCollageBlob = async (
  records: RecordType[],
  year: number,
  month: number,
  pageIndex: number,
  totalPages: number,
  tileRows: number,
  wordmarkMascotImg: HTMLImageElement | null,
  subtitle?: string
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = COLLAGE_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 준비하지 못했어요.');

  const bg = ctx.createLinearGradient(0, 0, 0, COLLAGE_CANVAS_HEIGHT);
  bg.addColorStop(0, '#EEF1FF');
  bg.addColorStop(1, '#E4F2F0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, COLLAGE_CANVAS_HEIGHT);

  const topGlow = ctx.createRadialGradient(116, 0, 0, 116, 0, 520);
  topGlow.addColorStop(0, 'rgba(196,181,253,0.55)');
  topGlow.addColorStop(1, 'rgba(196,181,253,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, COLLAGE_CANVAS_HEIGHT);

  const bottomGlow = ctx.createRadialGradient(CANVAS_WIDTH, COLLAGE_CANVAS_HEIGHT, 0, CANVAS_WIDTH, COLLAGE_CANVAS_HEIGHT, 560);
  bottomGlow.addColorStop(0, 'rgba(178,223,219,0.5)');
  bottomGlow.addColorStop(1, 'rgba(178,223,219,0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, COLLAGE_CANVAS_HEIGHT);

  const cardX = 56;
  const cardY = 56;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const scale = cardWidth / 452;

  const { innerX, innerWidth, bodyStartY } = drawMonthlyCollageHeader(ctx, {
    mascotImage: wordmarkMascotImg,
    cardX,
    cardY,
    cardWidth,
    scale,
    year,
    month,
    records,
    subtitle,
  });

  const tilesPerPage = COLLAGE_TILE_COLS * tileRows;
  let cursorY = bodyStartY;

  const footerTop = COLLAGE_CANVAS_HEIGHT - 80;
  const gridHeight = footerTop - cursorY;
  const tileWidth = (innerWidth - 16 * (COLLAGE_TILE_COLS - 1)) / COLLAGE_TILE_COLS;
  const tileHeight = (gridHeight - 16 * (tileRows - 1)) / tileRows;
  const pageRecords = records.slice(pageIndex * tilesPerPage, (pageIndex + 1) * tilesPerPage);
  const allowParagraphBlocks = true;

  for (let i = 0; i < pageRecords.length; i++) {
    const col = i % COLLAGE_TILE_COLS;
    const row = Math.floor(i / COLLAGE_TILE_COLS);
    drawCollageTile(
      ctx,
      pageRecords[i],
      innerX + col * (tileWidth + 16),
      cursorY + row * (tileHeight + 16),
      tileWidth,
      tileHeight,
      allowParagraphBlocks
    );
  }

  const footerText = (totalPages > 1 && pageIndex < totalPages - 1)
    ? 'quietpath.app  ·  계속 →'
    : 'quietpath.app';
  drawExportFooterText(ctx, {
    text: footerText,
    x: CANVAS_WIDTH / 2,
    y: COLLAGE_CANVAS_HEIGHT - 44,
    color: 'rgba(148,163,184,0.6)',
    fontSize: 22,
    align: 'center',
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('콜라주 이미지를 만들지 못했어요.')); return; }
      resolve(blob);
    }, 'image/png');
  });
};

export const exportMonthlyCollage = async (
  allRecords: RecordType[],
  year: number,
  month: number,
  options: {
    records?: RecordType[];
    subtitle?: string;
  } = {}
) => {
  const sourceRecords = options.records ?? allRecords;
  const monthRecords = sourceRecords
    .filter(r => {
      const d = new Date(r.timestamp);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  if (monthRecords.length === 0) throw new Error('내보낼 기록이 없어요.');

  const wordmarkMascotImg = await loadImage(MASCOT_URLS.COZY).catch(() => null);
  const tileRows = monthRecords.length <= 6 ? 3 : 4;
  const tilesPerPage = COLLAGE_TILE_COLS * tileRows;
  const totalPages = Math.ceil(monthRecords.length / tilesPerPage);
  const blobs: Blob[] = [];
  const subtitle = options.subtitle;

  for (let p = 0; p < totalPages; p++) {
    blobs.push(await createMonthlyCollageBlob(monthRecords, year, month, p, totalPages, tileRows, wordmarkMascotImg, subtitle));
  }

  const fileDate = `${year}-${String(month).padStart(2, '0')}`;
  for (let i = 0; i < blobs.length; i++) {
    const suffix = totalPages > 1 ? `-${i + 1}of${totalPages}` : '';
    downloadBlob(blobs[i], `quiet-path-collage-${fileDate}${suffix}.png`);
  }
  return { mode: 'download' as const, pages: totalPages };
};

// ─── Monthly Calendar Export ───────────────────────────────────────────────

const CALENDAR_EXPORT_CANVAS_HEIGHT = 1350;

type CalendarExportCell =
  | { type: 'empty' }
  | { type: 'day'; day: number; record?: RecordType };

const buildMonthlyCalendarCells = (
  records: RecordType[],
  year: number,
  month: number
): CalendarExportCell[] => {
  const recordByDay = new Map<number, RecordType>();

  const latestRecords = buildLatestRecordByDateMap(records) as Map<string, RecordType>;
  latestRecords.forEach((record) => {
    const date = new Date(record.timestamp);
    recordByDay.set(date.getDate(), record);
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOffset = new Date(year, month - 1, 1).getDay();
  const cells: CalendarExportCell[] = [];

  for (let i = 0; i < firstDayOffset; i += 1) {
    cells.push({ type: 'empty' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ type: 'day', day, record: recordByDay.get(day) });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: 'empty' });
  }

  return cells;
};

const createMonthlyCalendarBlob = async (
  records: RecordType[],
  year: number,
  month: number,
  wordmarkMascotImg: HTMLImageElement | null
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CALENDAR_EXPORT_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캘린더 이미지를 준비하지 못했어요.');

  const bg = ctx.createLinearGradient(0, 0, 0, CALENDAR_EXPORT_CANVAS_HEIGHT);
  bg.addColorStop(0, '#EEF1FF');
  bg.addColorStop(0.58, '#EDF5F6');
  bg.addColorStop(1, '#DFF2EF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CALENDAR_EXPORT_CANVAS_HEIGHT);

  const topGlow = ctx.createRadialGradient(130, 30, 0, 130, 30, 560);
  topGlow.addColorStop(0, 'rgba(196,181,253,0.58)');
  topGlow.addColorStop(1, 'rgba(196,181,253,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CALENDAR_EXPORT_CANVAS_HEIGHT);

  const bottomGlow = ctx.createRadialGradient(CANVAS_WIDTH, CALENDAR_EXPORT_CANVAS_HEIGHT, 0, CANVAS_WIDTH, CALENDAR_EXPORT_CANVAS_HEIGHT, 620);
  bottomGlow.addColorStop(0, 'rgba(178,223,219,0.56)');
  bottomGlow.addColorStop(1, 'rgba(178,223,219,0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CALENDAR_EXPORT_CANVAS_HEIGHT);

  const cardX = 44;
  const cardY = 40;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const cardHeight = CALENDAR_EXPORT_CANVAS_HEIGHT - cardY * 2;
  const scale = cardWidth / 452;
  const s = (value: number) => value * scale;

  const { innerX, innerWidth, bodyStartY } = drawMonthlyExportHeader(ctx, {
    mascotImage: wordmarkMascotImg,
    cardX,
    cardY,
    cardWidth,
    scale,
    year,
    month,
    recordsCount: records.length,
    subtitle: `한 달간 ${records.length}개의 장면을 남겼어요.`,
  });

  const boardX = innerX;
  const boardY = bodyStartY;
  const boardWidth = innerWidth;
  const boardHeight = s(276);

  ctx.save();
  roundedRect(ctx, boardX, boardY, boardWidth, boardHeight, s(20));
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fill();
  ctx.restore();

  const cells = buildMonthlyCalendarCells(records, year, month);
  const rowCount = cells.length / 7;
  const headerHeight = s(46);
  const gridTop = boardY + headerHeight;
  const cellWidth = boardWidth / 7;
  const cellHeight = (boardHeight - headerHeight) / rowCount;
  const daysInMonth = new Date(year, month, 0).getDate();

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? now.getDate() : -1;

  const moodImageEntries = await Promise.all(
    CALENDAR_EXPORT_MOOD_ORDER.map(async (mood) => {
      const moodKey = resolveCharacterMood(mood);
      const image = await loadImage(MASCOT_URLS[moodKey]).catch(() => null);
      return [mood, image] as const;
    })
  );
  const moodImageMap = new Map<string, HTMLImageElement | null>(moodImageEntries);

  ctx.save();
  roundedRect(ctx, boardX, boardY, boardWidth, boardHeight, s(20));
  ctx.clip();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = `700 ${s(10)}px "SF Pro Display", "Pretendard", sans-serif`;
  WEEKDAY_LABELS_KO.forEach((label, index) => {
    ctx.fillStyle = index === 0 ? '#F87171' : index === 6 ? '#60A5FA' : '#94A3B8';
    ctx.fillText(label, boardX + cellWidth * index + cellWidth / 2, boardY + s(28));
  });

  ctx.strokeStyle = 'rgba(226,232,240,0.95)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boardX, gridTop);
  ctx.lineTo(boardX + boardWidth, gridTop);
  for (let col = 1; col < 7; col += 1) {
    const x = boardX + cellWidth * col;
    ctx.moveTo(x, gridTop);
    ctx.lineTo(x, boardY + boardHeight);
  }
  for (let row = 1; row < rowCount; row += 1) {
    const y = gridTop + cellHeight * row;
    ctx.moveTo(boardX, y);
    ctx.lineTo(boardX + boardWidth, y);
  }
  ctx.stroke();

  ctx.textAlign = 'left';
  cells.forEach((cell, index) => {
    if (cell.type === 'empty') return;

    const col = index % 7;
    const row = Math.floor(index / 7);
    const cellX = boardX + col * cellWidth;
    const cellY = gridTop + row * cellHeight;
    const isToday = isCurrentMonth && cell.day === todayDay;
    const moodCode = cell.record?.moodCode;

    if (isToday) {
      ctx.save();
      ctx.strokeStyle = moodCode ? getMoodActivityCellColor(moodCode) : '#7C3AED';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(cellX + 1, cellY + 1, cellWidth - 2, cellHeight - 2);
      ctx.restore();
    }

    ctx.fillStyle = cell.record ? '#64748B' : '#94A3B8';
    if (isToday) {
      ctx.fillStyle = '#334155';
    }
    ctx.font = `700 ${s(9.8)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText(String(cell.day), cellX + s(9), cellY + s(15));

    if (!cell.record || !moodCode) return;

    const bubbleColor = getMoodActivityCellColor(moodCode);
    const centerX = cellX + cellWidth / 2;
    const centerY = cellY + cellHeight / 2 + s(4);
    const bubbleRadius = s(isToday ? 21 : 20);
    const bubble = ctx.createRadialGradient(
      centerX - bubbleRadius * 0.35,
      centerY - bubbleRadius * 0.45,
      bubbleRadius * 0.18,
      centerX,
      centerY,
      bubbleRadius
    );
    bubble.addColorStop(0, 'rgba(255,255,255,0.94)');
    bubble.addColorStop(0.58, hexToRgba(bubbleColor, 0.28));
    bubble.addColorStop(1, hexToRgba(bubbleColor, 0.12));
    ctx.fillStyle = bubble;
    ctx.beginPath();
    ctx.arc(centerX, centerY, bubbleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.52)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    const mascotImage = moodImageMap.get(moodCode);
    if (mascotImage) {
      const mascotSize = s(isToday ? 31 : 30);
      ctx.drawImage(mascotImage, centerX - mascotSize / 2, centerY - mascotSize / 2, mascotSize, mascotSize);
    }
  });
  ctx.restore();

  const moodCounts = records.reduce((acc, record) => {
    if (record.moodCode) acc[record.moodCode] = (acc[record.moodCode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const moodEntries = CALENDAR_EXPORT_MOOD_ORDER
    .map((mood) => ({ mood, count: moodCounts[mood] || 0 }))
    .filter(({ count }) => count > 0);

  const summaryTop = boardY + boardHeight + s(30);
  ctx.fillStyle = '#94A3B8';
  ctx.font = `700 ${s(10.5)}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('이번 달 무드', innerX, summaryTop);

  if (moodEntries.length > 0) {
    const itemGap = s(16);
    const itemWidth = s(44);
    const rowWidth = moodEntries.length * itemWidth + (moodEntries.length - 1) * itemGap;
    const startX = innerX + (innerWidth - rowWidth) / 2;
    const iconCenterY = summaryTop + s(34);

    moodEntries.forEach(({ mood, count }, index) => {
      const mascotImage = moodImageMap.get(mood);
      const moodColor = getMoodActivityCellColor(mood);
      const centerX = startX + itemWidth * index + itemGap * index + itemWidth / 2;
      const bubbleRadius = s(18);
      const bubble = ctx.createRadialGradient(
        centerX - bubbleRadius * 0.35,
        iconCenterY - bubbleRadius * 0.45,
        bubbleRadius * 0.18,
        centerX,
        iconCenterY,
        bubbleRadius
      );
      bubble.addColorStop(0, 'rgba(255,255,255,0.96)');
      bubble.addColorStop(0.58, hexToRgba(moodColor, 0.26));
      bubble.addColorStop(1, hexToRgba(moodColor, 0.10));
      ctx.fillStyle = bubble;
      ctx.beginPath();
      ctx.arc(centerX, iconCenterY, bubbleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      if (mascotImage) {
        const mascotSize = s(28);
        ctx.drawImage(mascotImage, centerX - mascotSize / 2, iconCenterY - mascotSize / 2, mascotSize, mascotSize);
      }

      ctx.fillStyle = '#64748B';
      ctx.font = `700 ${s(13)}px "SF Pro Display", "Pretendard", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(count), centerX, iconCenterY + bubbleRadius + s(16));
    });
  }

  drawExportFooterText(ctx, {
    text: 'quietpath.app',
    x: CANVAS_WIDTH / 2,
    y: cardY + cardHeight - s(18),
    color: '#B8C0C9',
    fontSize: s(9),
    align: 'center',
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('캘린더 이미지를 만들지 못했어요.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

export const exportMonthlyCalendar = async (
  allRecords: RecordType[],
  year: number,
  month: number
) => {
  const monthRecords = allRecords
    .filter((record) => {
      const d = new Date(record.timestamp);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  if (monthRecords.length === 0) throw new Error('내보낼 기록이 없어요.');

  const wordmarkMascotImg = await loadImage(MASCOT_URLS.COZY).catch(() => null);
  const blob = await createMonthlyCalendarBlob(monthRecords, year, month, wordmarkMascotImg);
  const fileDate = `${year}-${String(month).padStart(2, '0')}`;
  const fileName = `quiet-path-monthly-calendar-${fileDate}.png`;

  downloadBlob(blob, fileName);
  return { mode: 'download' as const };
};

// ────────────────────────────────────────────────────────────────────────────

export const exportRecordCard = async (
  record: RecordType,
  options?: { mode?: RecordCardDisplayMode }
) => {
  const exportMode = options?.mode ?? 'poster';
  const blob =
    exportMode === 'diary' && record.imageUrl
      ? await createDiaryPhotoRecordCardBlob(record)
      : await createPosterRecordCardBlob(record);
  const fileName = `quiet-path-record-${formatFileDate(record.timestamp)}.png`;

  downloadBlob(blob, fileName);
  return { mode: 'download' as const };
};
