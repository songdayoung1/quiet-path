export type ImageTextTone = 'dark' | 'light';

export interface ImageTextTones {
  left: ImageTextTone;
  right: ImageTextTone;
}

interface ImageComposition {
  positionX?: number;
  positionY?: number;
  scale?: number;
}

const DEFAULT_TEXT_TONES: ImageTextTones = { left: 'light', right: 'light' };
const SAMPLE_WIDTH = 80;
const SAMPLE_HEIGHT = 60;
const tonePromiseCache = new Map<string, Promise<ImageTextTones>>();

const resolveRegionTone = (
  pixels: Uint8ClampedArray,
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
      const offset = (y * SAMPLE_WIDTH + x) * 4;
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
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx || !image.naturalWidth || !image.naturalHeight) {
    return DEFAULT_TEXT_TONES;
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = SAMPLE_WIDTH / SAMPLE_HEIGHT;
  let drawWidth = SAMPLE_WIDTH;
  let drawHeight = SAMPLE_HEIGHT;

  if (sourceRatio > targetRatio) {
    drawWidth = SAMPLE_HEIGHT * sourceRatio;
  } else {
    drawHeight = SAMPLE_WIDTH / sourceRatio;
  }

  const scale = composition.scale ?? 1;
  drawWidth *= scale;
  drawHeight *= scale;
  const offsetX = -(drawWidth - SAMPLE_WIDTH) * ((composition.positionX ?? 50) / 100);
  const offsetY = -(drawHeight - SAMPLE_HEIGHT) * ((composition.positionY ?? 50) / 100);
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const pixels = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
  const sampleBottom = Math.round(SAMPLE_HEIGHT * 0.56);
  return {
    left: resolveRegionTone(pixels, 0, Math.round(SAMPLE_WIDTH * 0.48), 0, sampleBottom),
    right: resolveRegionTone(
      pixels,
      Math.round(SAMPLE_WIDTH * 0.52),
      SAMPLE_WIDTH,
      0,
      sampleBottom,
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
