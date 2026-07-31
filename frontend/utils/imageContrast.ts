export type ImageTextTone = 'dark' | 'light';

export interface ImageTextTones {
  left: ImageTextTone;
  right: ImageTextTone;
  body: ImageTextTone;
}

interface ImageComposition {
  positionX?: number;
  positionY?: number;
  scale?: number;
  targetAspectRatio?: number;
  topSampleEnd?: number;
  bodySampleStart?: number;
  bodySampleEnd?: number;
}

const DEFAULT_TEXT_TONES: ImageTextTones = { left: 'light', right: 'light', body: 'light' };
const SAMPLE_WIDTH = 80;
const tonePromiseCache = new Map<string, Promise<ImageTextTones>>();

const resolveRegionTone = (
  pixels: Uint8ClampedArray,
  rowWidth: number,
  startX: number,
  endX: number,
  startY: number,
  endY: number,
): ImageTextTone => {
  let luminanceTotal = 0;
  let brightPixels = 0;
  let pixelCount = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = (y * rowWidth + x) * 4;
      const luminance = pixels[offset] * 0.2126
        + pixels[offset + 1] * 0.7152
        + pixels[offset + 2] * 0.0722;
      luminanceTotal += luminance;
      brightPixels += luminance >= 170 ? 1 : 0;
      pixelCount += 1;
    }
  }

  if (pixelCount === 0) {
    return 'light';
  }

  const averageLuminance = luminanceTotal / pixelCount;
  const brightPixelRatio = brightPixels / pixelCount;
  return averageLuminance >= 158 || brightPixelRatio >= 0.58 ? 'dark' : 'light';
};

export const getImageTextTones = (
  image: HTMLImageElement,
  composition: ImageComposition = {},
): ImageTextTones => {
  const requestedAspectRatio = composition.targetAspectRatio ?? 4 / 3;
  const targetAspectRatio = Number.isFinite(requestedAspectRatio) && requestedAspectRatio > 0
    ? requestedAspectRatio
    : 4 / 3;
  const sampleHeight = Math.round(SAMPLE_WIDTH / targetAspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx || !image.naturalWidth || !image.naturalHeight) {
    return DEFAULT_TEXT_TONES;
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SAMPLE_WIDTH, sampleHeight);

  const sourceRatio = image.naturalWidth / image.naturalHeight;
  let drawWidth = SAMPLE_WIDTH;
  let drawHeight = sampleHeight;

  if (sourceRatio > targetAspectRatio) {
    drawWidth = sampleHeight * sourceRatio;
  } else {
    drawHeight = SAMPLE_WIDTH / sourceRatio;
  }

  const scale = composition.scale ?? 1;
  drawWidth *= scale;
  drawHeight *= scale;
  const offsetX = -(drawWidth - SAMPLE_WIDTH) * ((composition.positionX ?? 50) / 100);
  const offsetY = -(drawHeight - sampleHeight) * ((composition.positionY ?? 50) / 100);
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const pixels = ctx.getImageData(0, 0, SAMPLE_WIDTH, sampleHeight).data;
  const topSampleEnd = Math.round(sampleHeight * (composition.topSampleEnd ?? 0.56));
  const bodySampleStart = Math.round(sampleHeight * (composition.bodySampleStart ?? 0.52));
  const bodySampleEnd = Math.round(sampleHeight * (composition.bodySampleEnd ?? 0.96));
  return {
    left: resolveRegionTone(
      pixels,
      SAMPLE_WIDTH,
      0,
      Math.round(SAMPLE_WIDTH * 0.48),
      0,
      topSampleEnd,
    ),
    right: resolveRegionTone(
      pixels,
      SAMPLE_WIDTH,
      Math.round(SAMPLE_WIDTH * 0.52),
      SAMPLE_WIDTH,
      0,
      topSampleEnd,
    ),
    body: resolveRegionTone(
      pixels,
      SAMPLE_WIDTH,
      Math.round(SAMPLE_WIDTH * 0.08),
      Math.round(SAMPLE_WIDTH * 0.92),
      bodySampleStart,
      bodySampleEnd,
    ),
  };
};

export const loadImageTextTones = (
  src: string,
  composition: ImageComposition = {},
): Promise<ImageTextTones> => {
  const cacheKey = [
    src,
    composition.positionX ?? 50,
    composition.positionY ?? 50,
    composition.scale ?? 1,
    composition.targetAspectRatio?.toFixed(3) ?? '1.333',
    composition.topSampleEnd ?? 0.56,
    composition.bodySampleStart ?? 0.52,
    composition.bodySampleEnd ?? 0.96,
  ].join('|');
  const cached = tonePromiseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const tonePromise = new Promise<ImageTextTones>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        resolve(getImageTextTones(image, composition));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('이미지 밝기를 확인하지 못했어요.'));
    image.src = src;
  }).catch((error) => {
    tonePromiseCache.delete(cacheKey);
    throw error;
  });

  tonePromiseCache.set(cacheKey, tonePromise);
  return tonePromise;
};
