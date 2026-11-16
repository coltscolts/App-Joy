import type { CalendarEvent, Meeting, Task } from './types';
import { pad, toDate, uid, ymdhm } from './util';

// Exporta a .ics: se abre en Calendario de Apple / Outlook con alarma incluida.
// Es la forma más fiable de tener recordatorios aunque la app esté cerrada.
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');

interface IcsItem { title: string; start: Date; end: Date; description?: string; location?: string; alarmMin?: number }

export function buildIcs(items: IcsItem[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Oficina Ejecutiva//ES', 'CALSCALE:GREGORIAN'];
  for (const it of items) {
    lines.push('BEGIN:VEVENT', `UID:${uid()}@oficina`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(it.start)}`, `DTEND:${stamp(it.end)}`, `SUMMARY:${esc(it.title)}`);
    if (it.description) lines.push(`DESCRIPTION:${esc(it.description)}`);
    if (it.location) lines.push(`LOCATION:${esc(it.location)}`);
    if (it.alarmMin !== undefined) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(it.title)}`, `TRIGGER:-PT${it.alarmMin}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function taskToIcs(t: Task): string | null {
  const start = toDate(t.remindAt ?? (t.due && t.due.length > 10 ? t.due : t.due ? `${t.due}T09:00` : null));
  if (!start) return null;
  return buildIcs([{ title: `⏰ ${t.title}`, start, end: new Date(start.getTime() + 15 * 60000), description: t.notes, alarmMin: 0 }]);
}

export function meetingToIcs(m: Meeting): string | null {
  const start = toDate(m.start);
  if (!start) return null;
  return buildIcs([{
    title: m.title, start, end: new Date(start.getTime() + m.durationMin * 60000),
    description: [m.agenda, m.teamsUrl ? `Teams: ${m.teamsUrl}` : ''].filter(Boolean).join('\n'),
    location: m.location, alarmMin: 10,
  }]);
}

// Importa un .ics (exportado de Outlook, Google o iCloud).
export function parseIcs(text: string): CalendarEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const events: CalendarEvent[] = [];
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const body = block.split('END:VEVENT')[0];
    const get = (k: string) => {
      const m = body.match(new RegExp(`^${k}(;[^:\\n]*)?:(.*)$`, 'm'));
      return m ? m[2].trim() : '';
    };
    const start = parseIcsDate(get('DTSTART'));
    if (!start) continue;
    const end = parseIcsDate(get('DTEND')) ?? new Date(start.getTime() + 3600000);
    events.push({
      id: `ics-${get('UID') || uid()}-${start.getTime()}`,
      title: get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' ') || 'Evento',
      start: ymdhm(start), end: ymdhm(end),
      location: get('LOCATION').replace(/\\,/g, ','),
      teamsUrl: (body.match(/https:\/\/teams\.microsoft\.com\/[^\s\\>"]+/) ?? [null])[0],
      source: 'ics',
    });
  }
  return events;
}

function parseIcsDate(v: string): Date | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0', z] = m;
  return z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : new Date(+y, +mo - 1, +d, +h, +mi, +s);
}
