import type { AppState, Automation, Task } from './types';
import { nowIso, toDate, uid, ymd, ymdhm } from './util';

// Motor de recordatorios y automatizaciones. Corre cada 30 s mientras la app
// está abierta (en iPad/iPhone como app instalada). Para avisos con la app
// cerrada se exporta el recordatorio al Calendario (.ics con alarma) o a Outlook.

export interface EngineEffect {
  notify: { title: string; body: string; tag: string }[];
  state: AppState;
}

const hm = (d: Date) => d.getHours() * 60 + d.getMinutes();
const parseHm = (t?: string | null) => {
  const m = (t ?? '').match(/^(\d{1,2}):(\d{2})/);
  return m ? +m[1] * 60 + +m[2] : null;
};

export const isOverdue = (t: Task, now = new Date()) => {
  if (t.done || !t.due) return false;
  const d = toDate(t.due.length === 10 ? `${t.due}T23:59` : t.due);
  return !!d && d < now;
};

function isDue(a: Automation, now: Date): boolean {
  const today = ymd(now);
  // lastRun se guarda en hora local (YYYY-MM-DDTHH:mm); los ISO en UTC antiguos se convierten.
  const last = a.lastRun ? (a.lastRun.endsWith('Z') ? ymd(new Date(a.lastRun)) : a.lastRun.slice(0, 10)) : null;
  if (last === today) return false;
  const t = parseHm(a.time) ?? 9 * 60;
  if (hm(now) < t) return false;
  // Si la app se abre muy tarde, no dispares avisos de la mañana a medianoche.
  if (hm(now) - t > 6 * 60 && a.action !== 'create_task') return false;
  switch (a.trigger) {
    case 'daily': return now.getDay() !== 0; // sin domingos
    case 'weekly': return now.getDay() === (a.day ?? 1);
    case 'monthly': return now.getDate() === (a.day ?? 1);
    case 'task_overdue': return true;
    default: return false;
  }
}

export function runEngine(state: AppState, now = new Date()): EngineEffect {
  const notify: EngineEffect['notify'] = [];
  let tasks = state.tasks;
  let changed = false;

  // 1) Recordatorios de pendientes.
  tasks = tasks.map((t) => {
    if (t.done || t.reminded || !t.remindAt) return t;
    const at = toDate(t.remindAt);
    if (!at || at > now) return t;
    changed = true;
    notify.push({ title: '⏰ Recordatorio', body: t.title, tag: `task-${t.id}` });
    return { ...t, reminded: true };
  });

  // 2) Automatizaciones programadas.
  const automations = state.automations.map((a) => {
    if (!a.enabled || !isDue(a, now)) return a;
    changed = true;
    const pending = tasks.filter((t) => !t.done);
    const overdue = pending.filter((t) => isOverdue(t, now));
    const dueToday = pending.filter((t) => t.due?.slice(0, 10) === ymd(now));
    switch (a.action) {
      case 'morning_brief':
        notify.push({ title: '☀️ Tu día', body: `${dueToday.length} pendientes para hoy${overdue.length ? `, ${overdue.length} vencidos` : ''}. Abre tu briefing.`, tag: 'morning' });
        break;
      case 'evening_review':
        notify.push({ title: '🌙 Cierre del día', body: `Te quedan ${pending.length} pendientes${overdue.length ? ` (${overdue.length} vencidos)` : ''}. Revisa y planea mañana.`, tag: 'evening' });
        break;
      case 'overdue_alert':
        if (overdue.length) notify.push({ title: '⚠️ Pendientes vencidos', body: overdue.slice(0, 3).map((t) => t.title).join(' · '), tag: 'overdue' });
        break;
      case 'create_task':
      case 'notify':
        if (a.action === 'create_task') {
          tasks = [{
            id: uid(), title: a.text || a.name, priority: 'media', done: false, due: ymd(now),
            areaId: a.areaId ?? null, source: 'automatizacion', createdAt: nowIso(),
          }, ...tasks];
        }
        notify.push({ title: `⚙️ ${a.name}`, body: a.text || a.name, tag: `auto-${a.id}` });
        break;
    }
    return { ...a, lastRun: ymdhm(now) };
  });

  if (!changed) return { notify, state };
  return { notify, state: { ...state, tasks, automations } };
}

export async function showSystemNotification(title: string, body: string, tag: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icon.svg` });
    else new Notification(title, { body, tag });
  } catch { /* algunos navegadores no permiten notificaciones locales */ }
}
