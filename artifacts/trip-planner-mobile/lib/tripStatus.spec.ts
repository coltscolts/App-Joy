import { describe, expect, it } from 'vitest';
import { getTripStatus, localTodayIso } from './tripStatus';

describe('getTripStatus', () => {
  const today = '2026-11-16';
  it('detects ongoing, today, tomorrow, upcoming and past trips', () => {
    expect(getTripStatus('2026-11-10', '2026-11-20', today)).toEqual({ kind: 'ongoing' });
    expect(getTripStatus('2026-11-16', '2026-11-20', today)).toEqual({ kind: 'today' });
    expect(getTripStatus('2026-11-17', '2026-11-20', today)).toEqual({ kind: 'tomorrow' });
    expect(getTripStatus('2026-11-21', '2026-11-25', today)).toEqual({ kind: 'upcoming', days: 5 });
    expect(getTripStatus('2026-11-01', '2026-11-15', today)).toEqual({ kind: 'past' });
  });

  it('counts days across a DST change and a year boundary', () => {
    expect(getTripStatus('2027-03-15', '2027-03-20', '2027-03-01')).toEqual({ kind: 'upcoming', days: 14 });
    expect(getTripStatus('2027-01-02', '2027-01-05', '2026-12-31')).toEqual({ kind: 'upcoming', days: 2 });
  });

  it('formats the local date as YYYY-MM-DD', () => {
    expect(localTodayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
