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

import { getCountdown, getTripDeparture, getTripProgress, pickNextTrip } from './tripStatus';

describe('countdown helpers', () => {
  const trips = [
    { id: 1, startDate: '2026-12-20', endDate: '2026-12-28' },
    { id: 2, startDate: '2026-12-01', endDate: '2026-12-05' },
    { id: 3, startDate: '2026-10-01', endDate: '2026-10-05' },
  ];

  it('picks the soonest upcoming trip, preferring one in progress', () => {
    expect(pickNextTrip(trips, '2026-11-16')?.id).toBe(2);
    expect(pickNextTrip(trips, '2026-12-03')?.id).toBe(2);
    expect(pickNextTrip(trips, '2027-01-01')).toBeNull();
  });

  it('counts down to the first timed activity of the first day', () => {
    const { at, activity } = getTripDeparture({ startDate: '2026-12-01' }, [
      { date: '2026-12-01', time: '14:30', title: 'Hotel' },
      { date: '2026-12-01', time: '09:05', title: 'AM401', flightNumber: 'AM401' },
      { date: '2026-12-02', time: '07:00', title: 'Tour' },
      { date: '2026-12-01', time: null, title: 'Sin hora' },
    ]);
    expect(activity?.title).toBe('AM401');
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([2026, 11, 1, 9, 5]);
    expect(getTripDeparture({ startDate: '2026-12-01' }).at.getHours()).toBe(0);
  });

  it('splits the remaining time into days, hours and minutes', () => {
    const now = new Date(2026, 10, 16, 10, 0);
    expect(getCountdown(new Date(2026, 10, 18, 12, 30), now)).toEqual({ days: 2, hours: 2, minutes: 30, done: false });
    expect(getCountdown(new Date(2026, 10, 16, 10, 0, 30), now)).toEqual({ days: 0, hours: 0, minutes: 1, done: false });
    expect(getCountdown(new Date(2026, 10, 16, 9, 0), now).done).toBe(true);
  });

  it('reports the current day of an ongoing trip', () => {
    expect(getTripProgress('2026-12-01', '2026-12-05', '2026-12-03')).toEqual({ current: 3, total: 5 });
  });
});
