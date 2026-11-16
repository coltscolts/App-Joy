import type { AppState, CalendarEvent } from './types';
import { toDate, ymdhm } from './util';

/** Agenda unificada: reuniones propias + Outlook/Teams + calendarios importados. */
export function allEvents(state: AppState): CalendarEvent[] {
  const linked = new Set(state.meetings.map((m) => m.externalId).filter(Boolean));
  const own: CalendarEvent[] = state.meetings.map((m) => {
    const s = toDate(m.start) ?? new Date();
    return {
      id: `m-${m.id}`, title: m.title, start: m.start, end: ymdhm(new Date(s.getTime() + m.durationMin * 60000)),
      location: m.location, teamsUrl: m.teamsUrl, source: 'local', meetingId: m.id, attendees: m.attendees,
    };
  });
  const ext = state.importedEvents.filter((e) => !linked.has(e.id.replace(/^ol-/, '')));
  return [...own, ...ext].sort((a, b) => a.start.localeCompare(b.start));
}

export function eventsOn(state: AppState, day: string) {
  return allEvents(state).filter((e) => e.start.slice(0, 10) === day);
}
