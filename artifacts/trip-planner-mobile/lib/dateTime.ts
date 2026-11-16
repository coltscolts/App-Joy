export type TimePeriod = 'AM' | 'PM';

export function time24ToParts(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  const parsedHour = match ? Number(match[1]) : NaN;
  const parsedMinute = match ? Number(match[2]) : NaN;
  const valid = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23
    && Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59;
  const hour24 = valid ? parsedHour : 9;
  const minute = valid ? parsedMinute : 0;
  return { hour: hour24 % 12 || 12, minute, period: hour24 >= 12 ? 'PM' as const : 'AM' as const };
}

export function timePartsTo24(hour: number, minute: number, period: TimePeriod) {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) return '';
  const hour24 = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatTime12(value: string) {
  if (!value) return '';
  const { hour, minute, period } = time24ToParts(value);
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function isoDateTimeToTime24(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}