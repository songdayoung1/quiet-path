import { Record as RecordType } from '../types';
import { getRecordParagraphs } from './recordText';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1440;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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

const drawMascot = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opacity = 1
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);

  const body = ctx.createLinearGradient(-size * 0.2, -size * 0.45, size * 0.35, size * 0.5);
  body.addColorStop(0, '#C4B5FD');
  body.addColorStop(1, '#7C3AED');

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.45);
  ctx.bezierCurveTo(size * 0.42, -size * 0.38, size * 0.46, size * 0.12, 0, size * 0.5);
  ctx.bezierCurveTo(-size * 0.46, size * 0.12, -size * 0.42, -size * 0.38, 0, -size * 0.45);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -size * 0.06, size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(-size * 0.12, size * 0.06, size * 0.03, 0, Math.PI * 2);
  ctx.arc(size * 0.12, size * 0.06, size * 0.03, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, size * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, size * 0.16, size * 0.14, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  ctx.restore();
};

const drawMascotRow = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number
) => {
  [1, 0.85, 0.72, 0.58].forEach((opacity, index) => {
    drawMascot(ctx, startX + index * 46, y, 24, opacity);
  });
};

const drawHeroWordmark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
) => {
  drawMascot(ctx, x, y - 4, 18, 1);
  ctx.fillStyle = color;
  ctx.font = '800 23px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('QUIET PATH', x + 28, y);
  drawMascotRow(ctx, x + 214, y - 6);
};

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
  x: number,
  y: number,
  width: number
) => {
  roundedRect(ctx, x, y, width, 108, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('QUIET MEMORY', x + 28, y + 32);

  const sizes = [44, 34, 38, 34, 34];
  const startX = x + 46;
  sizes.forEach((size, index) => {
    const centerX = startX + index * 98;
    drawMascot(ctx, centerX, y + 68, size / 2, index === 0 ? 1 : 0.84);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.84)';
    ctx.arc(centerX, y + 98, 4, 0, Math.PI * 2);
    ctx.fill();
  });
};

const createRecordCardBlob = async (record: RecordType) => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('이미지 캔버스를 준비하지 못했어요.');
  }

  const background = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  background.addColorStop(0, '#F2F5FF');
  background.addColorStop(1, '#E5EFEC');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const topGlow = ctx.createRadialGradient(220, 140, 40, 220, 140, 480);
  topGlow.addColorStop(0, 'rgba(196,181,253,0.44)');
  topGlow.addColorStop(1, 'rgba(176, 197, 255, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cardX = 72;
  const cardY = 72;
  const cardWidth = CANVAS_WIDTH - cardX * 2;
  const cardHeight = CANVAS_HEIGHT - cardY * 2;

  ctx.save();
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const contentX = cardX + 72;
  const contentWidth = cardWidth - 144;
  const hasPhoto = !!record.imageUrl;
  const date = new Date(record.timestamp);
  const directionText = record.directionQuestion || '오늘의 방향';

  if (hasPhoto) {
    try {
      const image = await loadImage(record.imageUrl!);
      clipImageCover(ctx, image, cardX, cardY, cardWidth, 560, 44);

      const overlay = ctx.createLinearGradient(0, cardY, 0, cardY + 560);
      overlay.addColorStop(0, 'rgba(15,23,42,0.22)');
      overlay.addColorStop(0.45, 'rgba(15,23,42,0.16)');
      overlay.addColorStop(1, 'rgba(15,23,42,0.68)');
      ctx.save();
      roundedRect(ctx, cardX, cardY, cardWidth, 560, 44);
      ctx.clip();
      ctx.fillStyle = overlay;
      ctx.fillRect(cardX, cardY, cardWidth, 560);
      ctx.restore();

      drawMascot(ctx, contentX, cardY + 78, 18, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '800 23px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText('QUIET PATH', contentX + 28, cardY + 82);
      drawMascotRow(ctx, contentX + 214, cardY + 76);

      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText('현재 방향', cardX + cardWidth - 252, cardY + 82);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
      const directionLines = wrapText(ctx, directionText, 220, 2);
      drawMultilineText(ctx, directionLines, cardX + cardWidth - 252, cardY + 124, 38);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 18px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText(`${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]}`, contentX, cardY + 446);
      ctx.font = '800 82px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText(String(date.getDate()).padStart(2, '0'), contentX, cardY + 532);
      if (record.moodCode) {
        drawMoodChip(ctx, cardX + cardWidth - 234, cardY + 462, record.moodCode, 'photo');
      }
    } catch {
      // If the image fails to load, the paper layout below remains the fallback.
    }
  } else {
    const paperGlow = ctx.createRadialGradient(cardX + cardWidth * 0.64, cardY + 250, 40, cardX + cardWidth * 0.64, cardY + 250, 420);
    paperGlow.addColorStop(0, 'rgba(191,219,254,0.26)');
    paperGlow.addColorStop(1, 'rgba(191,219,254,0)');
    ctx.fillStyle = paperGlow;
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

    drawMascot(ctx, cardX + cardWidth - 146, cardY + 430, 148, 0.08);
    drawMascot(ctx, contentX, cardY + 76, 18, 1);
    ctx.fillStyle = '#7B8794';
    ctx.font = '800 23px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('QUIET PATH', contentX + 28, cardY + 80);
    drawMascotRow(ctx, contentX + 214, cardY + 74);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('현재 방향', contentX + 420, cardY + 84);
    ctx.fillStyle = '#7C3AED';
    ctx.font = '700 30px "SF Pro Display", "Pretendard", sans-serif';
    const directionLines = wrapText(ctx, directionText, 280, 2);
    drawMultilineText(ctx, directionLines, contentX + 420, cardY + 126, 38);

    ctx.fillStyle = '#1E293B';
    ctx.font = '800 18px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(`${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]}`, contentX, cardY + 186);
    ctx.font = '800 92px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText(String(date.getDate()).padStart(2, '0'), contentX, cardY + 286);
    if (record.moodCode) {
      drawMoodChip(ctx, contentX + 420, cardY + 244, record.moodCode, 'paper');
    }
  }

  let cursorY = hasPhoto ? cardY + 614 : cardY + 430;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
  if (hasPhoto) {
    ctx.textAlign = 'left';
    ctx.fillText('오늘의 기록', contentX, cursorY);
    cursorY += 48;

    ctx.fillStyle = '#1E293B';
    ctx.font = '700 32px "SF Pro Display", "Pretendard", sans-serif';
    const actionBlocks = wrapParagraphBlocks(ctx, record.action, contentWidth, 4);
    cursorY = drawParagraphBlocks(ctx, actionBlocks, contentX, cursorY, 44, 14);
    cursorY += 26;

    if (record.oneWordText?.trim()) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 18px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText('한 단어', contentX, cursorY);
      ctx.fillStyle = '#CBD2D9';
      ctx.fillRect(contentX + 86, cursorY - 6, 24, 2);
      ctx.fillStyle = '#7C3AED';
      ctx.font = '600 24px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText(`"${record.oneWordText.trim()}"`, contentX + 126, cursorY + 2);
      cursorY += 40;
    }
  } else {
    ctx.textAlign = 'center';
    ctx.fillText('오늘 남긴 장면', CANVAS_WIDTH / 2, cursorY);
    cursorY += 58;

    ctx.fillStyle = '#1E293B';
    ctx.font = '700 36px "SF Pro Display", "Pretendard", sans-serif';
    const centeredBlocks = wrapParagraphBlocks(ctx, record.action, contentWidth - 60, 4);
    centeredBlocks.forEach((lines) => {
      lines.forEach((line) => {
        ctx.fillText(line, CANVAS_WIDTH / 2, cursorY);
        cursorY += 52;
      });
      cursorY += 10;
    });

    if (record.oneWordText?.trim()) {
      const pillY = cursorY + 18;
      const quoteText = `"${record.oneWordText.trim()}"`;
      ctx.textAlign = 'left';
      ctx.font = '700 22px "SF Pro Display", "Pretendard", sans-serif';
      const pillWidth = Math.min(contentWidth, Math.max(ctx.measureText(quoteText).width + 240, 360));
      roundedRect(ctx, contentX + 8, pillY, pillWidth, 72, 36);
      ctx.fillStyle = 'rgba(245,243,255,0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(196,181,253,0.54)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 20px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText('한 단어', contentX + 36, pillY + 46);
      ctx.fillStyle = '#CBD2D9';
      ctx.fillRect(contentX + 132, pillY + 34, 24, 2);
      ctx.fillStyle = '#7C3AED';
      ctx.font = '700 24px "SF Pro Display", "Pretendard", sans-serif';
      ctx.fillText(quoteText, contentX + 172, pillY + 46);
      cursorY = pillY + 96;
    }
  }

  if (record.tomorrowText?.trim()) {
    roundedRect(ctx, contentX, cursorY + 10, contentWidth, 132, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 20px "SF Pro Display", "Pretendard", sans-serif';
    ctx.fillText('내일의 한 걸음', contentX + 26, cursorY + 48);
    ctx.fillStyle = '#475569';
    ctx.font = '600 28px "SF Pro Display", "Pretendard", sans-serif';
    const tomorrowBlocks = wrapParagraphBlocks(ctx, record.tomorrowText.trim(), contentWidth - 52, 2);
    drawParagraphBlocks(ctx, tomorrowBlocks, contentX + 26, cursorY + 92, 38, 12);
  }

  const railY = CANVAS_HEIGHT - 248;
  drawMascotRail(ctx, contentX, railY, contentWidth);

  ctx.fillStyle = 'rgba(123,135,148,0.96)';
  ctx.font = '600 18px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('짧은 하루도 이렇게 남겨두면 충분해요', contentX + 170, railY + 142);

  ctx.fillStyle = 'rgba(148,163,184,0.92)';
  ctx.font = '600 20px "SF Pro Display", "Pretendard", sans-serif';
  ctx.fillText('quiet-path.app', contentX, CANVAS_HEIGHT - 86);

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

export const exportRecordCard = async (record: RecordType) => {
  const blob = await createRecordCardBlob(record);
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
