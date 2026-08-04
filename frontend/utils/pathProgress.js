const DAY_MS = 24 * 60 * 60 * 1000;

const toLocalDayNumber = (input) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
};

export const calculatePathProgress = (records, direction, now = Date.now()) => {
  if (!direction?.reviewAt) {
    return { rate: 0, recordedDays: 0, totalDays: 0 };
  }

  const startDay = toLocalDayNumber(direction.createdAt);
  const reviewDay = toLocalDayNumber(direction.reviewAt);
  const today = toLocalDayNumber(now);

  if (startDay === null || reviewDay === null || today === null || reviewDay < startDay) {
    return { rate: 0, recordedDays: 0, totalDays: 0 };
  }

  const totalDays = reviewDay - startDay + 1;
  const latestCountableDay = Math.min(today, reviewDay);
  const recordedDayNumbers = new Set();

  (records || [])
    .filter((record) => !record.isHidden)
    .forEach((record) => {
      const recordDay = toLocalDayNumber(record.timestamp);
      if (recordDay !== null && recordDay >= startDay && recordDay <= latestCountableDay) {
        recordedDayNumbers.add(recordDay);
      }
    });

  const recordedDays = recordedDayNumbers.size;
  const rate = Math.min(100, Math.round((recordedDays / totalDays) * 100));

  return { rate, recordedDays, totalDays };
};
