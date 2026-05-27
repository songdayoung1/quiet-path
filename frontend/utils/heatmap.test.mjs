import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HEATMAP_CELLS,
  buildRecordDateMap,
  buildRecentHeatmapDays,
  computeCurrentStreak,
  countFilledHeatmapCells,
  toLocalDateKey,
} from './heatmap.js';

const localDate = (year, month, day) => new Date(year, month - 1, day, 12, 0, 0, 0);

test('buildRecentHeatmapDays always ends at today and has fixed cell count', () => {
  const baseDate = localDate(2026, 5, 19);
  const map = buildRecordDateMap([]);
  const days = buildRecentHeatmapDays(map, DEFAULT_HEATMAP_CELLS, baseDate);

  assert.equal(days.length, DEFAULT_HEATMAP_CELLS);
  assert.equal(days.filter((day) => day.isToday).length, 1);
  assert.equal(toLocalDateKey(days[days.length - 1].date), toLocalDateKey(baseDate));
});

test('buildRecordDateMap ignores hidden records and preserves visible date hits', () => {
  const records = [
    { timestamp: localDate(2026, 5, 17).getTime(), isHidden: true, moodCode: '포근' },
    { timestamp: localDate(2026, 5, 18).getTime(), moodCode: '잔잔' },
    { timestamp: localDate(2026, 5, 19).getTime() },
  ];

  const map = buildRecordDateMap(records);
  assert.equal(map.has(toLocalDateKey(localDate(2026, 5, 17))), false);
  assert.equal(map.get(toLocalDateKey(localDate(2026, 5, 18))), '잔잔');
  assert.equal(map.has(toLocalDateKey(localDate(2026, 5, 19))), true);
});

test('computeCurrentStreak counts consecutive days backward from today', () => {
  const baseDate = localDate(2026, 5, 19);
  const records = [
    { timestamp: localDate(2026, 5, 19).getTime() },
    { timestamp: localDate(2026, 5, 18).getTime() },
    { timestamp: localDate(2026, 5, 17).getTime() },
    { timestamp: localDate(2026, 5, 15).getTime() },
  ];
  const map = buildRecordDateMap(records);
  assert.equal(computeCurrentStreak(map, baseDate), 3);
});

test('countFilledHeatmapCells returns visible activity density inside recent cells', () => {
  const baseDate = localDate(2026, 5, 19);
  const records = [
    { timestamp: localDate(2026, 5, 10).getTime() },
    { timestamp: localDate(2026, 5, 12).getTime() },
    { timestamp: localDate(2026, 5, 19).getTime(), moodCode: '두근' },
  ];
  const map = buildRecordDateMap(records);
  const days = buildRecentHeatmapDays(map, DEFAULT_HEATMAP_CELLS, baseDate);
  assert.equal(countFilledHeatmapCells(days), 3);
});
