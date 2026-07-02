const SENTENCE_BOUNDARY_REGEX = /([.!?。！？…]+)(\s+|$)/g;

const normalizeText = (text: string) => text.replace(/\r\n?/g, '\n').trim();

const splitSentences = (text: string) => {
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = SENTENCE_BOUNDARY_REGEX.exec(text)) !== null) {
    const endIndex = match.index + match[1].length;
    const sentence = text.slice(lastIndex, endIndex).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  const trailingText = text.slice(lastIndex).trim();
  if (trailingText) {
    sentences.push(trailingText);
  }

  return sentences;
};

const splitLongParagraph = (
  text: string,
  maxWordsPerParagraph: number,
  maxCharsPerParagraph: number
) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWordsPerParagraph && text.length <= maxCharsPerParagraph) {
    return [text];
  }

  const paragraphs: string[] = [];
  let currentWords: string[] = [];

  for (const word of words) {
    const candidate = [...currentWords, word].join(' ');
    if (
      currentWords.length > 0 &&
      (candidate.length > maxCharsPerParagraph || currentWords.length >= maxWordsPerParagraph)
    ) {
      paragraphs.push(currentWords.join(' '));
      currentWords = [word];
      continue;
    }

    currentWords.push(word);
  }

  if (currentWords.length > 0) {
    paragraphs.push(currentWords.join(' '));
  }

  return paragraphs;
};

interface RecordParagraphOptions {
  autoParagraph?: boolean;
  maxSentencesPerParagraph?: number;
  maxCharsPerParagraph?: number;
  maxWordsPerParagraph?: number;
}

export const getRecordParagraphs = (
  text: string,
  {
    autoParagraph = true,
    maxSentencesPerParagraph = 2,
    maxCharsPerParagraph = 58,
    maxWordsPerParagraph = 14,
  }: RecordParagraphOptions = {}
) => {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  if (normalized.includes('\n')) {
    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  if (!autoParagraph) {
    return [normalized];
  }

  const sentences = splitSentences(normalized);
  if (sentences.length > 1) {
    const paragraphs: string[] = [];
    let currentSentences: string[] = [];

    for (const sentence of sentences) {
      const candidate = [...currentSentences, sentence].join(' ');
      if (
        currentSentences.length > 0 &&
        (candidate.length > maxCharsPerParagraph || currentSentences.length >= maxSentencesPerParagraph)
      ) {
        paragraphs.push(currentSentences.join(' '));
        currentSentences = [sentence];
        continue;
      }

      currentSentences.push(sentence);
    }

    if (currentSentences.length > 0) {
      paragraphs.push(currentSentences.join(' '));
    }

    return paragraphs;
  }

  return splitLongParagraph(normalized, maxWordsPerParagraph, maxCharsPerParagraph);
};

export const getRecordDisplayText = (text: string, options?: RecordParagraphOptions) =>
  getRecordParagraphs(text, options).join('\n\n');

export const getRecordPreviewLine = (text: string) => {
  const normalized = normalizeText(text);
  if (!normalized) {
    return { line: '', hasMore: false };
  }

  const explicitLines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const paragraphs = getRecordParagraphs(normalized);
  const line = explicitLines[0] || paragraphs[0] || normalized;

  return {
    line,
    hasMore: explicitLines.length > 1 || paragraphs.length > 1,
  };
};
