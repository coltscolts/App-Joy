import * as Calendar from 'expo-calendar';

// Lee el Calendario de iOS (EventKit): todas las cuentas agregadas al iPhone,
// incluida la cuenta de trabajo (Exchange/Outlook) sin tocar los servidores de la empresa.

const pad = (n: number) => String(n).padStart(2, '0');
const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const TEAMS = /https:\/\/teams\.(?:microsoft|live)\.com\/(?:l\/meetup-join|meet)\/[^\s"'<>)\]]+/i;

export async function permission(): Promise<{ granted: boolean }> {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return { granted: true };
  const r = await Calendar.requestCalendarPermissionsAsync();
  return { granted: r.granted };
}

export async function listCalendars() {
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals.map((c) => ({ id: c.id, title: c.title, source: c.source?.name ?? '', color: c.color ?? '#888888' }));
}

export async function events(fromIso: string, toIso: string, calendarIds: string[] | null) {
  const ids = calendarIds ?? (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).map((c) => c.id);
  if (!ids.length) return [];
  const cals = new Map((await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).map((c) => [c.id, c]));
  const list = await Calendar.getEventsAsync(ids, new Date(fromIso), new Date(toIso));
  const soon = Date.now() + 21 * 86400000;
  const out = [];
  // Asistentes solo para las próximas 3 semanas (consulta por evento), en lotes.
  for (let i = 0; i < list.length; i += 10) {
    const batch = list.slice(i, i + 10);
    const rows = await Promise.all(batch.map(async (e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      let attendees: string[] = [];
      if (start.getTime() > Date.now() - 86400000 && start.getTime() < soon) {
        try {
          const a = await Calendar.getAttendeesForEventAsync(e.id, { instanceStartDate: start });
          attendees = a.map((x) => x.name || x.email || '').filter(Boolean);
        } catch { /* algunas cuentas no exponen asistentes */ }
      }
      const notes = (e.notes ?? '').slice(0, 4000);
      const teams = [e.url, notes, e.location].map((x) => (x ? TEAMS.exec(x)?.[0] : null)).find(Boolean) ?? null;
      const cal = cals.get(e.calendarId);
      return {
        id: `apple-${e.id}-${start.getTime()}`,
        title: e.title || '(sin título)',
        start: local(start),
        end: local(end),
        allDay: !!e.allDay,
        location: e.location ?? undefined,
        notes: notes || undefined,
        teamsUrl: teams,
        attendees,
        calendarName: cal ? `${cal.title}${cal.source?.name && cal.source.name !== cal.title ? ` · ${cal.source.name}` : ''}` : undefined,
        source: 'apple' as const,
      };
    }));
    out.push(...rows);
  }
  return out;
}

export async function addEvent(p: { title: string; start: string; end: string; notes?: string; location?: string; alarmMinutes?: number }) {
  const def = await Calendar.getDefaultCalendarAsync();
  const id = await Calendar.createEventAsync(def.id, {
    title: p.title,
    startDate: new Date(p.start),
    endDate: new Date(p.end),
    notes: p.notes,
    location: p.location,
    alarms: p.alarmMinutes !== undefined ? [{ relativeOffset: -p.alarmMinutes }] : undefined,
  });
  return { id };
}
