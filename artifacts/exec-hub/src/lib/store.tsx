import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { idb } from './idb';
import type { AppState, Automation } from './types';
import { AREA_COLORS, nowIso, uid } from './util';

const KEY = 'app';

export const DEFAULT_AUTOMATIONS: Automation[] = [
  { id: 'auto-morning', name: 'Briefing de la mañana', enabled: true, trigger: 'daily', time: '08:00', action: 'morning_brief', builtin: true },
  { id: 'auto-evening', name: 'Cierre del día: pendientes', enabled: true, trigger: 'daily', time: '18:30', action: 'evening_review', builtin: true },
  { id: 'auto-minutes', name: 'Convertir acuerdos de minutas en pendientes', enabled: true, trigger: 'after_meeting', action: 'minutes_to_tasks', builtin: true },
  { id: 'auto-overdue', name: 'Alerta de pendientes vencidos', enabled: true, trigger: 'task_overdue', time: '09:00', action: 'overdue_alert', builtin: true },
  { id: 'auto-weekly', name: 'Revisión semanal de indicadores (lunes)', enabled: false, trigger: 'weekly', day: 1, time: '09:30', action: 'create_task', text: 'Revisar indicadores de la semana y enviar comentarios a directores', builtin: true },
];

export function initialState(): AppState {
  const areas = ['Dirección General', 'Comercial', 'Operaciones', 'Finanzas', 'Recursos Humanos', 'Personal'].map((name, i) => ({
    id: uid(), name, color: AREA_COLORS[i % AREA_COLORS.length],
  }));
  return {
    areas,
    tasks: [],
    meetings: [],
    notes: [],
    photos: [],
    dashboards: [],
    automations: DEFAULT_AUTOMATIONS,
    processes: [],
    importedEvents: [],
    settings: {
      name: '',
      pencilOnly: true,
      msClientId: import.meta.env.VITE_MS_CLIENT_ID ?? '',
      msTenant: import.meta.env.VITE_MS_TENANT ?? 'organizations',
      notifications: false,
      appleCalendar: false,
      appleCalendarIds: null,
      onboarded: false,
    },
    log: [],
  };
}

type Collection = 'areas' | 'tasks' | 'meetings' | 'notes' | 'photos' | 'dashboards' | 'automations' | 'processes' | 'importedEvents';
type Item<C extends Collection> = AppState[C][number];

interface StoreApi {
  state: AppState;
  ready: boolean;
  setState: (fn: (s: AppState) => AppState) => void;
  upsert: <C extends Collection>(c: C, item: Item<C>) => void;
  remove: <C extends Collection>(c: C, id: string) => void;
  patch: <C extends Collection>(c: C, id: string, changes: Partial<Item<C>>) => void;
  log: (text: string) => void;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setRaw] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    idb.getState<AppState>(KEY).then((saved) => {
      if (saved) {
        const base = initialState();
        // Mezcla para tolerar campos nuevos en versiones futuras.
        setRaw({ ...base, ...saved, settings: { ...base.settings, ...saved.settings } });
      }
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const setState = useCallback((fn: (s: AppState) => AppState) => {
    setRaw((prev) => {
      const next = fn(prev);
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => { void idb.setState(KEY, next); }, 250);
      return next;
    });
  }, []);

  const api: StoreApi = {
    state,
    ready,
    setState,
    upsert: (c, item) => setState((s) => {
      const list = s[c] as { id: string }[];
      const exists = list.some((x) => x.id === (item as { id: string }).id);
      return { ...s, [c]: exists ? list.map((x) => (x.id === (item as { id: string }).id ? item : x)) : [item, ...list] };
    }),
    remove: (c, id) => setState((s) => ({ ...s, [c]: (s[c] as { id: string }[]).filter((x) => x.id !== id) })),
    patch: (c, id, changes) => setState((s) => ({
      ...s, [c]: (s[c] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...changes } : x)),
    })),
    log: (text) => setState((s) => ({ ...s, log: [{ id: uid(), at: nowIso(), text }, ...s.log].slice(0, 200) })),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fuera de StoreProvider');
  return v;
}

export function useArea(id?: string | null) {
  const { state } = useStore();
  return state.areas.find((a) => a.id === id) ?? null;
}
