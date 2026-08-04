export const DEFAULT_HEATMAP_CELLS = 21;

const RECORDED_SENTINEL = '__recorded__';

export const toLocalDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const toStartOfLocalDay = (inputDate) => {
  const date = new Date(inputDate);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isNewerRecord = (candidate, current) => {
  const candidateTimestamp = Number(candidate.timestamp);
  const currentTimestamp = Number(current.timestamp);
  if (candidateTimestamp !== currentTimestamp) {
    return candidateTimestamp > currentTimestamp;
  }

  const candidateId = Number(candidate.id);
  const currentId = Number(current.id);
  return Number.isFinite(candidateId)
    && Number.isFinite(currentId)
    && candidateId > currentId;
};

export const buildLatestRecordByDateMap = (records) => {
  const latestRecordByDate = new Map();

  (records || [])
    .filter((record) => !record.isHidden)
    .forEach((record) => {
      const timestamp = Number(record.timestamp);
      if (!Number.isFinite(timestamp)) return;

      const date = new Date(timestamp);
      const key = toLocalDateKey(date);
      const current = latestRecordByDate.get(key);
      if (!current || isNewerRecord(record, current)) {
        latestRecordByDate.set(key, record);
      }
    });

  return latestRecordByDate;
};

export const buildRecordDateMap = (records) => {
  const recordDateMap = new Map();

  buildLatestRecordByDateMap(records).forEach((record, key) => {
    recordDateMap.set(key, record.moodCode || RECORDED_SENTINEL);
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
