import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePathProgress } from './pathProgress.js';

const localDate = (year, month, day, hour = 0) => new Date(year, month - 1, day, hour).getTime();

const direction = {
  createdAt: localDate(2026, 8, 4, 10),
  reviewAt: localDate(2026, 8, 11),
};

test('calculatePathProgress uses the full direction period as its denominator', () => {
  const progress = calculatePathProgress(
    [{ timestamp: localDate(2026, 8, 4, 18) }],
    direction,
    localDate(2026, 8, 4, 20),
  );

  assert.deepEqual(progress, { rate: 13, recordedDays: 1, totalDays: 8 });
});

test('calculatePathProgress counts multiple records on the same date once', () => {
  const progress = calculatePathProgress(
    [
      { timestamp: localDate(2026, 8, 4, 9) },
      { timestamp: localDate(2026, 8, 4, 21) },
      { timestamp: localDate(2026, 8, 5, 14) },
    ],
    direction,
    localDate(2026, 8, 5, 20),
  );

  assert.deepEqual(progress, { rate: 25, recordedDays: 2, totalDays: 8 });
});

test('calculatePathProgress ignores hidden and out-of-period records', () => {
  const progress = calculatePathProgress(
    [
      { timestamp: localDate(2026, 8, 3, 18) },
      { timestamp: localDate(2026, 8, 4, 18), isHidden: true },
      { timestamp: localDate(2026, 8, 5, 18) },
      { timestamp: localDate(2026, 8, 9, 18) },
    ],
    direction,
    localDate(2026, 8, 5, 20),
  );

  assert.deepEqual(progress, { rate: 13, recordedDays: 1, totalDays: 8 });
});

test('calculatePathProgress reaches 100 only after every planned date is recorded', () => {
  const records = Array.from({ length: 8 }, (_, index) => ({
    timestamp: localDate(2026, 8, 4 + index, 18),
  }));

  assert.deepEqual(
    calculatePathProgress(records, direction, localDate(2026, 8, 11, 20)),
    { rate: 100, recordedDays: 8, totalDays: 8 },
  );
});
