export const DEFAULT_HEATMAP_CELLS = 21;

const RECORDED_SENTINEL = '__recorded__';

export const toLocalDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const toStartOfLocalDay = (inputDate) => {
  const date = new Date(inputDate);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const buildRecordDateMap = (records) => {
  const recordDateMap = new Map();

  (records || [])
    .filter((record) => !record.isHidden)
    .forEach((record) => {
      const date = new Date(record.timestamp);
      const key = toLocalDateKey(date);
      if (record.moodCode) {
        recordDateMap.set(key, record.moodCode);
      } else {
        recordDateMap.set(key, RECORDED_SENTINEL);
      }
    });

  return recordDateMap;
};

export const buildRecentHeatmapDays = (recordDateMap, totalCells = DEFAULT_HEATMAP_CELLS, baseDate = new Date()) => {
  const today = toStartOfLocalDay(baseDate);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalCells - 1));
  const todayKey = toLocalDateKey(today);

  const days = [];
  for (let i = 0; i < totalCells; i += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const key = toLocalDateKey(date);
    days.push({
      date,
      hasRecord: recordDateMap.has(key),
      moodCode: recordDateMap.get(key) === RECORDED_SENTINEL ? undefined : recordDateMap.get(key),
      isToday: key === todayKey,
    });
  }

  return days;
};

export const computeCurrentStreak = (recordDateMap, baseDate = new Date()) => {
  const checkDate = toStartOfLocalDay(baseDate);
  let currentStreak = 0;

  while (true) {
    const key = toLocalDateKey(checkDate);
    if (!recordDateMap.has(key)) break;
    currentStreak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return currentStreak;
};

export const countFilledHeatmapCells = (days) => days.filter((day) => day.hasRecord).length;
