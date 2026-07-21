const MAX_SOURCE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_SOURCE_PIXEL_COUNT = 40_000_000;
const MAX_LONG_EDGE = 1080;
const WEBP_QUALITY = 0.85;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const prepareRecordImage = async (file: File): Promise<File> => {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('JPG, PNG, WebP 이미지만 첨부할 수 있어요.');
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new Error('사진은 10MB 이하만 첨부할 수 있어요.');
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    if ((image.naturalWidth * image.naturalHeight) > MAX_SOURCE_PIXEL_COUNT) {
      throw new Error('사진 해상도가 너무 커요. 4천만 픽셀 이하 사진을 선택해 주세요.');
    }
    const ratio = Math.min(1, MAX_LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('사진을 처리하지 못했어요.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToWebp(canvas);
    return new File([blob], `${crypto.randomUUID()}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('사진을 불러오지 못했어요.'));
  image.src = src;
});

const canvasToWebp = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob || blob.type !== 'image/webp') {
      reject(new Error('이 브라우저에서는 사진 변환을 지원하지 않아요.'));
      return;
    }
    resolve(blob);
  }, 'image/webp', WEBP_QUALITY);
});
