import { describe, it, expect } from 'vitest';
import { todayISO, dueStatus, formatDue, daysBetween, isValidISODate } from './dueDate';

const TODAY = '2026-08-20';

describe('todayISO', () => {
  it('formats a local date with zero padding', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayISO(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('isValidISODate', () => {
  it('accepts real dates and rejects junk', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('20260101')).toBe(false);
    expect(isValidISODate(undefined)).toBe(false);
    expect(isValidISODate(42)).toBe(false);
  });
});

describe('daysBetween', () => {
  it('counts whole days across month and year boundaries', () => {
    expect(daysBetween('2026-08-20', '2026-08-21')).toBe(1);
    expect(daysBetween('2026-08-20', '2026-09-01')).toBe(12);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-08-20', '2026-08-10')).toBe(-10);
  });
  it('spans DST changes without rounding errors', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('dueStatus', () => {
  it.each([
    [undefined, 'none'],
    ['garbage', 'none'],
    ['2026-08-19', 'overdue'],
    ['2025-01-01', 'overdue'],
    ['2026-08-20', 'today'],
    ['2026-08-21', 'soon'],
    ['2026-08-27', 'soon'],
    ['2026-08-28', 'later'],
    ['2027-08-20', 'later'],
  ] as const)('%s → %s', (due, expected) => {
    expect(dueStatus(due, TODAY)).toBe(expected);
  });
});

describe('formatDue', () => {
  it.each([
    ['2026-08-20', 'Today'],
    ['2026-08-21', 'Tomorrow'],
    ['2026-08-19', 'Yesterday'],
    ['2026-08-17', '3 days overdue'],
    ['2026-08-06', '14 days overdue'],
    ['2026-08-05', 'Aug 5'],
    ['2026-08-25', 'In 5 days'],
    ['2026-09-03', 'In 14 days'],
    ['2026-09-04', 'Sep 4'],
    ['2026-12-25', 'Dec 25'],
    ['2027-01-02', 'Jan 2, 2027'],
    ['2025-03-09', 'Mar 9, 2025'],
  ])('%s → %s', (due, expected) => {
    expect(formatDue(due, TODAY)).toBe(expected);
  });
  it('falls back to the raw string for malformed input', () => {
    expect(formatDue('nope', TODAY)).toBe('nope');
  });
});
