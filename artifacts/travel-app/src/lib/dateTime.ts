export type TimeParts = { hour: string; minute: string; period: "AM" | "PM" };

export function timeToParts(value?: string | null): TimeParts | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  if (match[3]?.toLowerCase() === "pm" && hour < 12) hour += 12;
  if (match[3]?.toLowerCase() === "am" && hour === 12) hour = 0;
  return {
    hour: String(hour % 12 || 12),
    minute: String(minute).padStart(2, "0"),
    period: hour >= 12 ? "PM" : "AM",
  };
}

export function timePartsToValue(parts: TimeParts | null): string {
  if (!parts) return "";
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) return "";
  const hour24 = (hour % 12) + (parts.period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function dateStringToLocalDate(value?: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const result = new Date(year, month - 1, day, 12);
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : undefined;
}

export function localDateToDateString(date?: Date): string {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}