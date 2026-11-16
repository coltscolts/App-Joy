import { t } from '@/lib/i18n';

const toUtcDay = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

export function localTodayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type TripStatus =
  | { kind: 'ongoing' }
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'upcoming'; days: number }
  | { kind: 'past' };

/** Estado de un viaje respecto a hoy (fechas YYYY-MM-DD, día local). */
export function getTripStatus(startDate: string, endDate: string, todayIso: string): TripStatus {
  if (endDate < todayIso) return { kind: 'past' };
  if (startDate < todayIso) return { kind: 'ongoing' };
  const days = Math.round((toUtcDay(startDate) - toUtcDay(todayIso)) / 86_400_000);
  if (days === 0) return { kind: 'today' };
  if (days === 1) return { kind: 'tomorrow' };
  return { kind: 'upcoming', days };
}

export function tripStatusLabel(status: TripStatus): string {
  switch (status.kind) {
    case 'ongoing': return t('trip_status_ongoing');
    case 'today': return t('trip_status_today');
    case 'tomorrow': return t('trip_status_tomorrow');
    case 'upcoming': return t('trip_status_in_days', { n: status.days });
    default: return '';
  }
}

type TripDates = { id: number; startDate: string; endDate: string };
type TimedActivity = { date: string; time?: string | null; title: string; category?: string | null; flightNumber?: string | null };

/** El viaje en curso, o si no hay, el próximo que empieza. */
export function pickNextTrip<T extends TripDates>(trips: T[], todayIso: string): T | null {
  const active = trips.filter((trip) => trip.endDate >= todayIso);
  const ongoing = active.filter((trip) => trip.startDate <= todayIso).sort((a, b) => a.endDate.localeCompare(b.endDate));
  if (ongoing.length) return ongoing[0];
  return active.sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

const TIME_24 = /^(\d{2}):(\d{2})/;

/**
 * Momento de salida: la primera actividad con hora del primer día del viaje
 * (normalmente el vuelo) o, si no hay, el inicio de ese día. Hora local.
 */
export function getTripDeparture(
  trip: Pick<TripDates, 'startDate'>,
  activities: TimedActivity[] = [],
): { at: Date; activity: TimedActivity | null } {
  const [year, month, day] = trip.startDate.split('-').map(Number);
  const firstDay = activities
    .filter((activity) => activity.date === trip.startDate && TIME_24.test(activity.time ?? ''))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const first = firstDay[0];
  if (first) {
    const [, hh, mm] = TIME_24.exec(first.time ?? '')!;
    return { at: new Date(year, month - 1, day, Number(hh), Number(mm)), activity: first };
  }
  return { at: new Date(year, month - 1, day, 0, 0), activity: null };
}

export type Countdown = { days: number; hours: number; minutes: number; done: boolean };

export function getCountdown(target: Date, now: Date = new Date()): Countdown {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, done: true };
  const totalMinutes = Math.ceil(diff / 60_000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    done: false,
  };
}

/** Para viajes en curso: día actual y total (1-based). */
export function getTripProgress(startDate: string, endDate: string, todayIso: string) {
  const total = Math.round((toUtcDay(endDate) - toUtcDay(startDate)) / 86_400_000) + 1;
  const current = Math.min(total, Math.max(1, Math.round((toUtcDay(todayIso) - toUtcDay(startDate)) / 86_400_000) + 1));
  return { current, total };
}
