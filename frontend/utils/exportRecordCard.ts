import { Record as RecordType, type RecordCardDisplayMode } from '../types';
import { getRecordParagraphs } from './recordText';

const CANVAS_WIDTH = 1080;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);

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
  '멍함': '#E2E8F0',
};

const getMoodExportColor = (mood?: string) =>
  (mood && MOOD_EXPORT_COLORS[mood]) || MOOD_EXPORT_COLORS['멍함'];

const getMoodActivityCellColor = (mood?: string) =>
  (mood && MOOD_ACTIVITY_CELL_COLORS[mood]) || MOOD_ACTIVITY_CELL_COLORS['멍함'];

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
  radius: number
) => {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (sourceRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * sourceRatio;
    offsetX = x - (drawWidth - width) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / sourceRatio;
    offsetY = y - (drawHeight - height) / 2;
  }

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
  const paragraphBlocks = getRecordParagraphs(text)
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
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  if (hasPhoto) {
    const image = await loadImage(record.imageUrl!);
    clipImageCover(ctx, image, cardX, cardY, cardWidth, cardHeight, 44);

    const overlay = ctx.createLinearGradient(0, cardY, 0, cardY + cardHeight);
    overlay.addColorStop(0, 'rgba(10,20,42,0.72)');
    overlay.addColorStop(0.22, 'rgba(10,20,42,0.08)');
    overlay.addColorStop(0.48, 'rgba(10,20,42,0.08)');
    overlay.addColorStop(0.56, 'rgba(10,20,42,0.04)');
    overlay.addColorStop(0.72, 'rgba(10,20,42,0.42)');
    overlay.addColorStop(1, 'rgba(10,20,42,0.82)');
    ctx.save();
    roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 44);
    ctx.clip();
    ctx.fillStyle = overlay;
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    ctx.restore();

    drawExportWordmark(ctx, {
      mascotImage: wordmarkMascotImg,
      x: contentX - 6,
      y: cardY + 78,
      mascotSize: 36,
      textColor: 'rgba(255,255,255,0.95)',
      fontSize: 22,
      letterSpacing: 3.5,
      gap: 8,
    });

    const dirRightX = cardX + cardWidth - 72;
    ctx.textAlign = 'right';
    drawDirectionSummaryWithText(
      ctx,
      dirRightX,
      cardY + 83,
      340,
      directionText,
      '#FFFFFF',
      'rgba(255,255,255,0.6)',
    );

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '800 18px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(`${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]}`, contentX, cardY + 224);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 110px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(String(date.getDate()).padStart(2, '0'), contentX - 4, cardY + 322);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(fmtTime(date), cardX + cardWidth - 72, cardY + 224);

    if (record.moodCode) {
      ctx.font = '700 24px "SF Pro Display", "Pretendard", sans-serif';
      const moodWidth = Math.max(ctx.measureText(record.moodCode).width + 60, 120);
      roundedRect(ctx, cardX + cardWidth - 72 - moodWidth, cardY + 270, moodWidth, 52, 26);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(record.moodCode, cardX + cardWidth - 72 - moodWidth / 2, cardY + 302);
    }

    if (mainMascotImg) {
      drawMascotImage(ctx, mainMascotImg, cardX + cardWidth - 100, cardY + cardHeight - 470, 92, 0.08);
    }

    const actionBlocks = wrapParagraphBlocks(ctx, record.action, contentWidth - 80, 4);
    let cursorY = cardY + cardHeight - 540;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.76)';
    ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('오늘의 기록', CANVAS_WIDTH / 2, cursorY);
    cursorY += 64;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 52px "SF Pro Display", "Pretendard", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.24)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
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
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText('한 단어', CANVAS_WIDTH / 2 - textWidth / 2 - 28, cursorY + 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(CANVAS_WIDTH / 2 - textWidth / 2 + 14, cursorY + 41, 26, 2);
      ctx.fillStyle = '#FFFFFF';
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
      color: 'rgba(255,255,255,0.45)',
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
  paperGlow.addColorStop(0, 'rgba(191,219,254,0.15)');
  paperGlow.addColorStop(1, 'rgba(191,219,254,0)');
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

  const noDirRightX = cardX + cardWidth - 72;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 13px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('현재 방향', noDirRightX, cardY + 83);
  ctx.fillStyle = '#7C3AED';
  ctx.font = '700 26px "SF Pro Display", "Pretendard", sans-serif';
  const noDirLines = wrapText(ctx, directionText, 340, 2);
  noDirLines.forEach((line, i) => ctx.fillText(line, noDirRightX, cardY + 116 + i * 38));

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
  const simCtx = document.createElement('canvas').getContext('2d');
  const cardX = 56;
  const cardY = 56;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const imageHeight = Math.round(cardWidth * 0.72);
  const contentWidth = cardWidth - 148;
  const contentX = cardX + cardWidth / 2;
  const characterMood = resolveCharacterMood(record.moodCode);
  const mascotRailMoods: CharacterMood[] = [characterMood, 'COZY', 'SPARKLE', 'CALM', 'HOLDING'];
  const loadedMascots = await Promise.all(
    mascotRailMoods.map((mood) => loadImage(MASCOT_URLS[mood]))
  ).catch(() => []);
  const mainMascotImg = loadedMascots[0] ?? null;
  const actionBlocks = simCtx
    ? (() => {
        simCtx.font = '700 42px "SF Pro Display", "Pretendard", sans-serif';
        return wrapParagraphBlocks(simCtx, record.action, contentWidth, 100);
      })()
    : [];
  const tomorrowBlocks = simCtx && record.tomorrowText?.trim()
    ? (() => {
        simCtx.font = '600 26px "SF Pro Display", "Pretendard", sans-serif';
        return wrapParagraphBlocks(simCtx, record.tomorrowText.trim(), contentWidth - 40, 100);
      })()
    : [];

  let contentHeight = 74;
  contentHeight += 28 + 48;
  if (actionBlocks.length > 0) {
    actionBlocks.forEach((lines, index) => {
      contentHeight += lines.length * 56;
      if (index < actionBlocks.length - 1) contentHeight += 14;
    });
  } else {
    contentHeight += 56;
  }

  if (record.oneWordText?.trim()) {
    contentHeight += 30 + 86;
  }

  if (tomorrowBlocks.length > 0) {
    contentHeight += 28;
    contentHeight += 24;
    tomorrowBlocks.forEach((lines, index) => {
      contentHeight += lines.length * 38;
      if (index < tomorrowBlocks.length - 1) contentHeight += 10;
    });
  }

  contentHeight += 72 + 74 + 62;
  const cardHeight = imageHeight + contentHeight;
  const canvasHeight = cardY * 2 + cardHeight;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('이미지 캔버스를 준비하지 못했어요.');
  }

  const background = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  background.addColorStop(0, '#EEF1FF');
  background.addColorStop(1, '#E4F2F0');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  const topGlow = ctx.createRadialGradient(116, 0, 0, 116, 0, 520);
  topGlow.addColorStop(0, 'rgba(196,181,253,0.4)');
  topGlow.addColorStop(1, 'rgba(196,181,253,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  const bottomGlow = ctx.createRadialGradient(CANVAS_WIDTH, canvasHeight, 0, CANVAS_WIDTH, canvasHeight, 560);
  bottomGlow.addColorStop(0, 'rgba(178,223,219,0.42)');
  bottomGlow.addColorStop(1, 'rgba(178,223,219,0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  ctx.save();
  ctx.shadowColor = 'rgba(82,96,109,0.16)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 16;
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 42);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 42);
  ctx.clip();
  clipImageCover(ctx, image, cardX, cardY, cardWidth, imageHeight, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillRect(cardX, cardY + imageHeight, cardWidth, cardHeight - imageHeight);
  const imageOverlay = ctx.createLinearGradient(0, cardY, 0, cardY + imageHeight);
  imageOverlay.addColorStop(0, 'rgba(10,20,42,0.22)');
  imageOverlay.addColorStop(0.66, 'rgba(10,20,42,0.02)');
  imageOverlay.addColorStop(1, 'rgba(10,20,42,0.52)');
  ctx.fillStyle = imageOverlay;
  ctx.fillRect(cardX, cardY, cardWidth, imageHeight);
  ctx.restore();

  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 42);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.font = '800 17px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(`${WEEKDAYS[new Date(record.timestamp).getDay()]} · ${MONTHS[new Date(record.timestamp).getMonth()]}`, cardX + 34, cardY + 48);
  ctx.font = '800 70px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText(String(new Date(record.timestamp).getDate()).padStart(2, '0'), cardX + 30, cardY + 138);

  ctx.textAlign = 'right';
  ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(new Date(record.timestamp).toTimeString().slice(0, 5), cardX + cardWidth - 34, cardY + 48);

  if (record.moodCode) {
    drawMoodChip(ctx, cardX + cardWidth - 166, cardY + 72, record.moodCode, 'photo');
  }

  if (mainMascotImg) {
    drawMascotImage(ctx, mainMascotImg, cardX + cardWidth - 90, cardY + imageHeight + 172, 116, 0.17);
  }

  let cursorY = cardY + imageHeight + 54;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('오늘의 기록', contentX, cursorY);
  cursorY += 58;

  ctx.fillStyle = '#1E293B';
  ctx.font = '700 42px "SF Pro Display", "Pretendard", sans-serif';
  if (actionBlocks.length === 0) {
    ctx.fillText(record.action, contentX, cursorY);
    cursorY += 56;
  } else {
    actionBlocks.forEach((lines, blockIndex) => {
      lines.forEach((line) => {
        ctx.fillText(line, contentX, cursorY);
        cursorY += 56;
      });
      if (blockIndex < actionBlocks.length - 1) {
        cursorY += 14;
      }
    });
  }

  if (record.oneWordText?.trim()) {
    cursorY += 28;
    const quoteText = `"${record.oneWordText.trim()}"`;
    ctx.font = '700 26px "SF Pro Display", "Pretendard", sans-serif';
    const textWidth = ctx.measureText(quoteText).width;
    const pillWidth = Math.min(contentWidth, textWidth + 176);
    roundedRect(ctx, contentX - pillWidth / 2, cursorY, pillWidth, 74, 37);
    ctx.fillStyle = 'rgba(245,243,255,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(221,214,254,0.82)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 20px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('한 단어', contentX - textWidth / 2 - 24, cursorY + 46);
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(contentX - textWidth / 2 + 18, cursorY + 37, 20, 2);
    ctx.fillStyle = '#7C3AED';
    ctx.font = '700 26px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(quoteText, contentX + 44, cursorY + 48);
    cursorY += 94;
  }

  if (tomorrowBlocks.length > 0) {
    cursorY += 24;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('내일의 메모', contentX, cursorY);
    cursorY += 34;
    ctx.fillStyle = '#64748B';
    ctx.font = '600 26px "SF Pro Display", "Pretendard", sans-serif';
    tomorrowBlocks.forEach((lines, blockIndex) => {
      lines.forEach((line) => {
        ctx.fillText(line, contentX, cursorY);
        cursorY += 38;
      });
      if (blockIndex < tomorrowBlocks.length - 1) {
        cursorY += 10;
      }
    });
  }

  const railY = cursorY + 56;
  if (loadedMascots.length > 0) {
    drawMascotRail(ctx, CANVAS_WIDTH / 2, railY, loadedMascots);
  }

  drawExportFooterText(ctx, {
    text: 'quietpath.app',
    x: cardX + cardWidth - 34,
    y: cardY + cardHeight - 32,
    color: 'rgba(148,163,184,0.9)',
    fontSize: 16,
    align: 'right',
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
  const radius = 28;

  if (!record) {
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = 'rgba(203,213,225,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(203,213,225,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const moodColors = record.moodCode
    ? (MOOD_CHIP_COLORS[record.moodCode] ?? MOOD_CHIP_COLORS['포근'])
    : MOOD_CHIP_COLORS['포근'];

  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = moodColors.bg;
  ctx.fill();
  ctx.strokeStyle = moodColors.border;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const pad = 26;
  const d = new Date(record.timestamp);
  const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = moodColors.text;
  ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(dateStr, x + pad, y + pad + 18);
  ctx.restore();

  ctx.fillStyle = '#334155';
  ctx.font = `700 ${allowParagraphBlocks ? 24 : 28}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.textAlign = 'center';
  const centerY = y + height / 2 + 4;

  if (allowParagraphBlocks) {
    const paragraphBlocks = limitParagraphBlocks(
      wrapParagraphBlocks(ctx, record.action, width - pad * 2, 6),
      3
    );
    const lineH = 34;
    const paragraphGap = 10;
    const blockH = getParagraphBlocksHeight(paragraphBlocks, lineH, paragraphGap);
    const startY = centerY - blockH / 2 + lineH - 4;
    drawParagraphBlocks(ctx, paragraphBlocks, x + width / 2, startY, lineH, paragraphGap);
  } else {
    const bodyLines = wrapText(ctx, record.action, width - pad * 2, 3);
    const lineH = 42;
    const blockH = bodyLines.length * lineH;
    bodyLines.forEach((line, i) => {
      ctx.fillText(line, x + width / 2, centerY - blockH / 2 + lineH * (i + 1) - 4);
    });
  }

  if (record.oneWordText?.trim()) {
    ctx.fillStyle = moodColors.text;
    ctx.font = '700 20px "SF Pro Display", "Pretendard", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`"${record.oneWordText.trim()}"`, x + width - pad, y + height - pad);
  }
};

const createMonthlyCollageBlob = async (
  records: RecordType[],
  year: number,
  month: number,
  pageIndex: number,
  totalPages: number,
  tileRows: number,
  wordmarkMascotImg: HTMLImageElement | null
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
  const s = (value: number) => value * scale;
  const cardHeight = COLLAGE_CANVAS_HEIGHT - cardY * 2;

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

  const tilesPerPage = COLLAGE_TILE_COLS * tileRows;
  let cursorY = bodyStartY;

  const footerTop = COLLAGE_CANVAS_HEIGHT - 80;
  const gridHeight = footerTop - cursorY;
  const tileWidth = (innerWidth - 16 * (COLLAGE_TILE_COLS - 1)) / COLLAGE_TILE_COLS;
  const tileHeight = (gridHeight - 16 * (tileRows - 1)) / tileRows;
  const pageRecords = records.slice(pageIndex * tilesPerPage, (pageIndex + 1) * tilesPerPage);
  const allowParagraphBlocks = tileRows <= 3;

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
  month: number
) => {
  const monthRecords = allRecords
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

  for (let p = 0; p < totalPages; p++) {
    blobs.push(await createMonthlyCollageBlob(monthRecords, year, month, p, totalPages, tileRows, wordmarkMascotImg));
  }

  const fileDate = `${year}-${String(month).padStart(2, '0')}`;
  const files = blobs.map((blob, i) => {
    const suffix = totalPages > 1 ? `-${i + 1}of${totalPages}` : '';
    return new File([blob], `quiet-path-collage-${fileDate}${suffix}.png`, { type: 'image/png' });
  });

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files });

  if (canNativeShare) {
    await navigator.share({
      files,
      title: 'Quiet Path 기록 콜라주',
      text: `${year}년 ${month}월의 기록을 콜라주로 내보냈어요.`,
    });
    return { mode: 'share' as const, pages: totalPages };
  }

  for (let i = 0; i < blobs.length; i++) {
    const suffix = totalPages > 1 ? `-${i + 1}of${totalPages}` : '';
    downloadBlob(blobs[i], `quiet-path-collage-${fileDate}${suffix}.png`);
  }
  return { mode: 'download' as const, pages: totalPages };
};

// ─── Monthly Activity Board ────────────────────────────────────────────────

const ACTIVITY_BOARD_CANVAS_HEIGHT = 1350;

const drawActivityBoardCell = (
  ctx: CanvasRenderingContext2D,
  day: number,
  record: RecordType | undefined,
  isToday: boolean,
  isFuture: boolean,
  useCurrentMonthState: boolean,
  x: number,
  y: number,
  size: number
) => {
  const radius = 10;
  const fillColor = record ? getMoodActivityCellColor(record.moodCode) : '#EEF3F7';
  const shouldDrawFuturePlaceholder = useCurrentMonthState && isFuture && !record;
  const shouldDrawTodayMarker = useCurrentMonthState && isToday;
  const shouldDrawEmptyCell = record || !shouldDrawFuturePlaceholder;

  if (shouldDrawEmptyCell) {
    ctx.save();
    roundedRect(ctx, x, y, size, size, radius);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();
  }

  if (!record && !shouldDrawFuturePlaceholder) {
    roundedRect(ctx, x, y, size, size, radius);
    ctx.strokeStyle = shouldDrawTodayMarker ? '#A78BFA' : '#E3EAF1';
    ctx.lineWidth = shouldDrawTodayMarker ? 2.2 : 1.5;
    ctx.stroke();
  }

  if (record && shouldDrawTodayMarker) {
    roundedRect(ctx, x, y, size, size, radius);
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = record
    ? 'rgba(71,85,105,0.72)'
    : shouldDrawFuturePlaceholder
      ? 'rgba(148,163,184,0.28)'
      : 'rgba(148,163,184,0.74)';
  ctx.font = `${record ? 600 : 500} ${Math.max(size * 0.30, 14)}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(day), x + size / 2, y + size / 2 + 1);

  if (!record && shouldDrawTodayMarker) {
    ctx.fillStyle = '#B69BFF';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size - Math.max(size * 0.12, 6), Math.max(size * 0.055, 2.6), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textBaseline = 'alphabetic';
};

const createMonthlyActivityBoardBlob = async (
  records: RecordType[],
  year: number,
  month: number,
  wordmarkMascotImg: HTMLImageElement | null
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = ACTIVITY_BOARD_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('활동판 캔버스를 준비하지 못했어요.');

  const bg = ctx.createLinearGradient(0, 0, 0, ACTIVITY_BOARD_CANVAS_HEIGHT);
  bg.addColorStop(0, '#EEF1FF');
  bg.addColorStop(0.58, '#EDF5F6');
  bg.addColorStop(1, '#DFF2EF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, ACTIVITY_BOARD_CANVAS_HEIGHT);

  const topGlow = ctx.createRadialGradient(130, 30, 0, 130, 30, 560);
  topGlow.addColorStop(0, 'rgba(196,181,253,0.58)');
  topGlow.addColorStop(1, 'rgba(196,181,253,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, ACTIVITY_BOARD_CANVAS_HEIGHT);

  const bottomGlow = ctx.createRadialGradient(CANVAS_WIDTH, ACTIVITY_BOARD_CANVAS_HEIGHT, 0, CANVAS_WIDTH, ACTIVITY_BOARD_CANVAS_HEIGHT, 620);
  bottomGlow.addColorStop(0, 'rgba(178,223,219,0.56)');
  bottomGlow.addColorStop(1, 'rgba(178,223,219,0)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, ACTIVITY_BOARD_CANVAS_HEIGHT);

  const cardX = 44;
  const cardY = 40;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const cardHeight = ACTIVITY_BOARD_CANVAS_HEIGHT - cardY * 2;
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
  const boardHeight = s(205);
  roundedRect(ctx, boardX, boardY, boardWidth, boardHeight, s(20));
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.fill();

  ctx.fillStyle = '#616E7C';
  ctx.font = `700 ${s(10.5)}px "SF Pro Display", "Pretendard", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('이번 달 활동판', boardX + s(16), boardY + s(18));

  const daysInMonth = new Date(year, month, 0).getDate();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#B8C0C9';
  ctx.font = `500 ${s(9)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText(`${MONTHS[month - 1]}  1 - ${daysInMonth}`, boardX + boardWidth - s(16), boardY + s(18));

  const recordByDay = new Map<number, RecordType>();
  records.forEach((record) => {
    const d = new Date(record.timestamp);
    const day = d.getDate();
    const previous = recordByDay.get(day);
    if (!previous || record.timestamp > previous.timestamp) {
      recordByDay.set(day, record);
    }
  });

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year &&
    now.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? now.getDate() : -1;

  const cellSize = s(29.8);
  const cellGap = s(5);
  const gridWidth = cellSize * 7 + cellGap * 6;
  const gridX = boardX + (boardWidth - gridWidth) / 2;
  const gridY = boardY + s(31);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const index = day - 1;
    const col = index % 7;
    const row = Math.floor(index / 7);
    const record = recordByDay.get(day);
    const isToday = isCurrentMonth && day === todayDay;
    const isFuture = isCurrentMonth && day > todayDay;
    drawActivityBoardCell(
      ctx,
      day,
      record,
      isToday,
      isFuture,
      isCurrentMonth,
      gridX + col * (cellSize + cellGap),
      gridY + row * (cellSize + cellGap),
      cellSize
    );
  }

  const moodCounts = records.reduce((acc, record) => {
    if (record.moodCode) acc[record.moodCode] = (acc[record.moodCode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const moodEntries = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  let chipX = innerX;
  const chipY = boardY + boardHeight + s(14);
  moodEntries.forEach(([mood, count]) => {
    const colors = getMoodExportColor(mood);
    ctx.font = `700 ${s(11)}px "SF Pro Display", "Pretendard", sans-serif`;
    const label = `${mood} ×${count}`;
    const chipWidth = Math.max(ctx.measureText(label).width + s(22), s(58));
    roundedRect(ctx, chipX, chipY, chipWidth, s(26), s(13));
    ctx.fillStyle = colors.bg;
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.fillText(label, chipX + chipWidth / 2, chipY + s(17.5));
    chipX += chipWidth + s(8);
  });

  const latestRecord = [...records].sort((a, b) => b.timestamp - a.timestamp)[0];
  const latestDate = new Date(latestRecord.timestamp);
  const latestColors = getMoodExportColor(latestRecord.moodCode);
  const highlightX = innerX;
  const highlightY = chipY + s(38);
  const footerY = cardY + cardHeight - s(18);
  const highlightHeight = footerY - s(14) - highlightY;

  roundedRect(ctx, highlightX, highlightY, innerWidth, highlightHeight, s(20));
  const highlightBg = ctx.createLinearGradient(highlightX, highlightY, highlightX + innerWidth, highlightY + highlightHeight);
  highlightBg.addColorStop(0, 'rgba(196,181,253,0.28)');
  highlightBg.addColorStop(1, 'rgba(178,223,219,0.24)');
  ctx.fillStyle = highlightBg;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#7C3AED';
  ctx.font = `600 ${s(9)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText(
    `최근 기록 · ${String(latestDate.getMonth() + 1).padStart(2, '0')}.${String(latestDate.getDate()).padStart(2, '0')}`,
    highlightX + s(20),
    highlightY + s(28)
  );

  if (latestRecord.moodCode) {
    ctx.font = `700 ${s(10)}px "SF Pro Display", "Pretendard", sans-serif`;
    const moodChipWidth = Math.max(ctx.measureText(latestRecord.moodCode).width + s(18), s(52));
    roundedRect(ctx, highlightX + innerWidth - s(20) - moodChipWidth, highlightY + s(14), moodChipWidth, s(24), s(12));
    ctx.fillStyle = latestColors.bg;
    ctx.fill();
    ctx.strokeStyle = latestColors.border;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = latestColors.text;
    ctx.textAlign = 'center';
    ctx.fillText(latestRecord.moodCode, highlightX + innerWidth - s(20) - moodChipWidth / 2, highlightY + s(30));
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = `700 ${s(16)}px "SF Pro Display", "Pretendard", sans-serif`;
  const actionLines = wrapText(ctx, latestRecord.action, innerWidth - s(44), 2);
  actionLines.forEach((line, index) => {
    ctx.fillText(line, highlightX + s(20), highlightY + s(62) + index * s(26));
  });

  if (latestRecord.oneWordText?.trim()) {
    ctx.fillStyle = '#7C3AED';
    ctx.font = `700 italic ${s(12)}px "SF Pro Display", "Pretendard", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`"${latestRecord.oneWordText.trim()}"`, highlightX + innerWidth - s(20), highlightY + highlightHeight - s(18));
  }

  drawExportFooterText(ctx, {
    text: 'quietpath.app',
    x: CANVAS_WIDTH / 2,
    y: footerY,
    color: '#B8C0C9',
    fontSize: s(9),
    align: 'center',
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('활동판 이미지를 만들지 못했어요.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

export const exportMonthlyActivityBoard = async (
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
  const blob = await createMonthlyActivityBoardBlob(monthRecords, year, month, wordmarkMascotImg);
  const fileDate = `${year}-${String(month).padStart(2, '0')}`;
  const fileName = `quiet-path-activity-board-${fileDate}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canNativeShare) {
    await navigator.share({
      files: [file],
      title: 'Quiet Path 활동판',
      text: `${year}년 ${month}월 활동판을 내보냈어요.`,
    });
    return { mode: 'share' as const };
  }

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
  const file = new File([blob], fileName, { type: 'image/png' });

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canNativeShare) {
    await navigator.share({
      files: [file],
      title: 'Quiet Path 기록 카드',
      text: '오늘의 기록을 카드로 꺼냈어요.',
    });
    return { mode: 'share' as const };
  }

  downloadBlob(blob, fileName);
  return { mode: 'download' as const };
};
