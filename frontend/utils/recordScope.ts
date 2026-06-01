import { Direction, Record } from '../types';

const isSameLocalDay = (timestamp: number, now = new Date()) => {
  const target = new Date(timestamp);
  return target.toDateString() === now.toDateString();
};

const isRecordForDirection = (record: Record, direction: Direction | null) => {
  if (!direction) {
    return false;
  }

  if (record.pathId) {
    return record.pathId === direction.id;
  }

  return record.directionQuestion === direction.question;
};

export const getCurrentPathRecords = (records: Record[], direction: Direction | null) =>
  records.filter((record) => isRecordForDirection(record, direction));

export const getCurrentPathTodayRecord = (records: Record[], direction: Direction | null) =>
  getCurrentPathRecords(records, direction)
    .filter((record) => isSameLocalDay(record.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;

export const hasLoggedTodayForCurrentPath = (records: Record[], direction: Direction | null) =>
  getCurrentPathTodayRecord(records, direction) !== null;
