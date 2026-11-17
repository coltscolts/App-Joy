import type { CalendarEvent } from './types';

// Puente con la app nativa de iPhone/iPad (artifacts/exec-mobile).
// Dentro de la app nativa la web corre en un WebView y puede pedir cosas que el
// navegador no permite: leer el Calendario de Apple (incluida la cuenta de trabajo
// agregada al iPhone), programar avisos con la app cerrada y abrir otras apps.

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    __mandoNativeReply?: (id: string, ok: boolean, data: unknown) => void;
  }
}

export const isNative = () => typeof window !== 'undefined' && !!window.ReactNativeWebView;

const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let seq = 0;

if (typeof window !== 'undefined') {
  window.__mandoNativeReply = (id, ok, data) => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (ok) p.resolve(data);
    else p.reject(new Error(String(data)));
  };
}

export function callNative<T>(type: string, payload: Record<string, unknown> = {}, timeoutMs = 60_000): Promise<T> {
  if (!window.ReactNativeWebView) return Promise.reject(new Error('Disponible solo en la app de iPhone/iPad'));
  const id = `n${Date.now()}-${seq++}`;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    setTimeout(() => { if (pending.delete(id)) reject(new Error('La app no respondió')); }, timeoutMs);
    window.ReactNativeWebView!.postMessage(JSON.stringify({ id, type, ...payload }));
  });
}

export interface DeviceCalendar { id: string; title: string; source: string; color: string }

export const nativeCalendar = {
  permission: () => callNative<{ granted: boolean }>('calendar.permission'),
  calendars: () => callNative<DeviceCalendar[]>('calendar.list'),
  events: (from: Date, to: Date, calendarIds?: string[]) =>
    callNative<CalendarEvent[]>('calendar.events', { from: from.toISOString(), to: to.toISOString(), calendarIds: calendarIds ?? null }),
  addEvent: (ev: { title: string; start: Date; end: Date; notes?: string; location?: string; alarmMinutes?: number }) =>
    callNative<{ id: string }>('calendar.add', { ...ev, start: ev.start.toISOString(), end: ev.end.toISOString() }),
};

export interface NativeReminder { id: string; title: string; body: string; at: string }
export const nativeNotifications = {
  sync: (items: NativeReminder[]) => callNative<{ scheduled: number }>('notifications.sync', { items }),
};

export const nativeShare = (text: string, title?: string) => callNative<void>('share', { text, title });
export const nativeOpenUrl = (url: string) => callNative<void>('openUrl', { url });

/** Abre una URL externa (Teams, Outlook, mailto) en su app. */
export function openExternal(url: string) {
  if (isNative()) void nativeOpenUrl(url).catch(() => { window.location.href = url; });
  else if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener');
  else window.location.href = url;
}

/** Borrador en la app de Outlook (iPhone/iPad). Sin Outlook, cae a la app Correo. */
export function outlookComposeUrl(to: string, subject: string, body: string) {
  const q = (k: string, v: string) => `${k}=${encodeURIComponent(v)}`;
  return `ms-outlook://compose?${[q('to', to), q('subject', subject), q('body', body)].join('&')}`;
}
export function mailtoUrl(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
