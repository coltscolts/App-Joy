import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export const pad = (n: number) => String(n).padStart(2, '0');
/** Fecha local YYYY-MM-DD */
export const ymd = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Fecha-hora local YYYY-MM-DDTHH:mm */
export const ymdhm = (d: Date = new Date()) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const nowIso = () => new Date().toISOString();

export function toDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = v.length === 10 ? parseISO(`${v}T00:00`) : parseISO(v);
  return isValid(d) ? d : null;
}

export function fmt(v: string | Date | null | undefined, pattern = "d MMM", fallback = ''): string {
  const d = typeof v === 'string' || v == null ? toDate(v as string | null) : v;
  return d ? format(d, pattern, { locale: es }) : fallback;
}

export const dayKey = (v?: string | null) => (v ? v.slice(0, 10) : '');

export function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function download(filename: string, content: Blob | string, type = 'text/plain') {
  // En la app nativa no hay descargas: se abre la hoja de Compartir de iOS.
  const rn = (window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } }).ReactNativeWebView;
  if (rn && typeof content === 'string') {
    rn.postMessage(JSON.stringify({ id: `dl${Date.now()}`, type: 'share', text: content, title: filename }));
    return;
  }
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export const greeting = (d = new Date()) =>
  d.getHours() < 12 ? 'Buenos días' : d.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

export const AREA_COLORS = ['#ea580c', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777', '#4b5563'];
