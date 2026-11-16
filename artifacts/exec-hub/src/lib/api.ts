// Cliente de la API de IA (/api/exec/*). Usa el token de Clerk si hay sesión.
let tokenGetter: (() => Promise<string | null>) | null = null;
export function setTokenGetter(fn: typeof tokenGetter) { tokenGetter = fn; }

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

async function headers(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { ...extra };
  const token = tokenGetter ? await tokenGetter() : null;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { msg = (await res.json()).error ?? msg; } catch { /* sin cuerpo */ }
    if (res.status === 401) msg = 'Inicia sesión para usar las funciones de IA.';
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

export async function postAi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/exec/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: await headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function transcribe(blob: Blob, hint?: string): Promise<string> {
  const q = hint ? `?hint=${encodeURIComponent(hint.slice(0, 300))}` : '';
  const res = await fetch(`${BASE}/api/exec/transcribe${q}`, {
    method: 'POST',
    credentials: 'include',
    headers: await headers({ 'Content-Type': blob.type || 'audio/mp4' }),
    body: blob,
  });
  return (await handle<{ text: string }>(res)).text;
}

export async function aiStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/exec/status`, { credentials: 'include', headers: await headers() });
    if (!res.ok) return false;
    return Boolean((await res.json()).ai);
  } catch { return false; }
}
