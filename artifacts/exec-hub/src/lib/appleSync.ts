import { addDays } from 'date-fns';
import type { AppState, CalendarEvent } from './types';
import { isNative, nativeCalendar, nativeNotifications, type NativeReminder } from './native';
import { toDate, ymd } from './util';

/** Lee el Calendario de Apple (todas las cuentas del iPhone: iCloud, Exchange/Truper, Google). */
export async function syncAppleCalendar(state: AppState, setEvents: (ev: CalendarEvent[]) => void): Promise<number> {
  const { granted } = await nativeCalendar.permission();
  if (!granted) throw new Error('Permite el acceso al Calendario en Ajustes del iPhone → Mando → Calendarios.');
  const events = await nativeCalendar.events(addDays(new Date(), -14), addDays(new Date(), 60), state.settings.appleCalendarIds ?? undefined);
  setEvents(events);
  return events.length;
}

const replaceApple = (ev: CalendarEvent[]) => (s: AppState): AppState => ({
  ...s, importedEvents: [...s.importedEvents.filter((e) => e.source !== 'apple'), ...ev],
});
export { replaceApple };

/**
 * Avisos que el iPhone debe mostrar aunque la app esté cerrada:
 * recordatorios de pendientes, 10 min antes de cada junta, briefing y cierre del día.
 * iOS permite máx. 64 programados; se mandan los 60 más próximos.
 */
export function upcomingReminders(state: AppState, now = new Date()): NativeReminder[] {
  const out: NativeReminder[] = [];
  const horizon = addDays(now, 14);
  for (const t of state.tasks) {
    const at = toDate(t.remindAt);
    if (!t.done && at && at > now && at < horizon) out.push({ id: `task-${t.id}`, title: '⏰ Recordatorio', body: t.title, at: at.toISOString() });
  }
  const seen = new Set<string>();
  for (const m of state.meetings) {
    const s = toDate(m.start);
    if (!s) continue;
    const at = new Date(s.getTime() - 10 * 60000);
    if (at > now && at < horizon) { out.push({ id: `meet-${m.id}`, title: '📅 En 10 minutos', body: m.title, at: at.toISOString() }); seen.add(m.title + m.start); }
  }
  for (const e of state.importedEvents) {
    if (e.allDay || seen.has(e.title + e.start)) continue;
    const s = toDate(e.start);
    if (!s) continue;
    const at = new Date(s.getTime() - 10 * 60000);
    if (at > now && at < horizon) out.push({ id: `ev-${e.id}`, title: '📅 En 10 minutos', body: e.title + (e.location ? ` · ${e.location}` : ''), at: at.toISOString() });
  }
  const pending = state.tasks.filter((t) => !t.done).length;
  for (const a of state.automations) {
    if (!a.enabled || !a.time || (a.action !== 'morning_brief' && a.action !== 'evening_review')) continue;
    const [h, m] = a.time.split(':').map(Number);
    for (let i = 0; i < 7; i++) {
      const d = addDays(now, i);
      d.setHours(h, m, 0, 0);
      if (d <= now || d.getDay() === 0) continue;
      out.push({
        id: `${a.id}-${ymd(d)}`,
        title: a.action === 'morning_brief' ? '☀️ Tu día' : '🌙 Cierre del día',
        body: a.action === 'morning_brief' ? 'Abre tu briefing: prioridades y agenda de hoy.' : `Tienes ${pending} pendientes. Revisa y planea mañana.`,
        at: d.toISOString(),
      });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(0, 60);
}

let lastSent = '';
export async function pushNativeReminders(state: AppState) {
  if (!isNative() || !state.settings.notifications) return;
  const items = upcomingReminders(state);
  const key = JSON.stringify(items);
  if (key === lastSent) return;
  lastSent = key;
  try { await nativeNotifications.sync(items); } catch { lastSent = ''; }
}
