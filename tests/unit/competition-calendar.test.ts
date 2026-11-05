import { describe, it, expect } from 'vitest';
import { daysUntil, approximateWindow } from '@/lib/calendar/countdown';

// Public countdown seam requested by M5.2; calendar days in Asia/Bangkok.
describe('Competition planning countdown', () => {
  it('counts calendar days from today in Thailand, not rounded elapsed hours', () => {
    expect(daysUntil('2026-11-06', new Date('2026-11-05T16:59:59Z'))).toBe(1);
    expect(daysUntil('2026-11-06', new Date('2026-11-05T17:00:00Z'))).toBe(0);
    expect(daysUntil('2026-11-04', new Date('2026-11-05T08:00:00Z'))).toBe(-1);
  });
  it('handles leap days, year boundaries and rejects impossible dates', () => {
    expect(daysUntil('2028-03-01', new Date('2028-02-28T08:00:00Z'))).toBe(2);
    expect(daysUntil('2027-01-01', new Date('2026-12-31T08:00:00Z'))).toBe(1);
    expect(() => daysUntil('2026-02-30')).toThrow();
    expect(() => daysUntil('not-a-date')).toThrow();
    expect(approximateWindow({ startMonth: 2, endMonth: 2 }, new Date('2028-02-29T08:00:00Z')))
      .toEqual({ start: '2028-02-01', end: '2028-02-29', phase: 'within', days: 0 });
    expect(() => approximateWindow({ startMonth: 12, endMonth: 1 })).toThrow();
    expect(() => approximateWindow({ startMonth: 0, endMonth: 13 })).toThrow();
  });
  it('projects an approximate month range with inclusive boundaries and rolls past ranges to next year', () => {
    expect(approximateWindow({ startMonth: 10, endMonth: 11 }, new Date('2026-09-30T08:00:00Z')))
      .toEqual({ start: '2026-10-01', end: '2026-11-30', phase: 'upcoming', days: 1 });
    expect(approximateWindow({ startMonth: 10, endMonth: 11 }, new Date('2026-10-01T08:00:00Z')))
      .toEqual({ start: '2026-10-01', end: '2026-11-30', phase: 'within', days: 60 });
    expect(approximateWindow({ startMonth: 10, endMonth: 11 }, new Date('2026-11-30T08:00:00Z')).days).toBe(0);
    expect(approximateWindow({ startMonth: 10, endMonth: 11 }, new Date('2026-12-01T08:00:00Z')))
      .toEqual({ start: '2027-10-01', end: '2027-11-30', phase: 'upcoming', days: 304 });
  });
});
