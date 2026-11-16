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
