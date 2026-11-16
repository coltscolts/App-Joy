import { Platform } from 'react-native';

/**
 * Datos compartidos con el widget de iOS (WidgetKit) mediante un App Group.
 * El widget (targets/widget) lee la clave NEXT_TRIP_KEY del mismo grupo.
 */
export const WIDGET_APP_GROUP = 'group.com.joyplann.app';
export const NEXT_TRIP_KEY = 'nextTrip';

export type WidgetTrip = {
  name: string;
  destination: string;
  /** Instante de salida en ISO 8601 (UTC). */
  departureAt: string;
  startDate: string;
  endDate: string;
  /** Vuelo o primera actividad, si existe. */
  detail: string | null;
};

type Storage = { set(key: string, value?: string): void; remove(key: string): void };
type StorageModule = { ExtensionStorage: { new (group: string): Storage; reloadWidget(name?: string): void } };

let storage: Storage | null | undefined;
let lastPayload: string | null = null;

function getModule(): StorageModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@bacons/apple-targets') as StorageModule;
  } catch {
    return null; // Expo Go / web: sin módulo nativo.
  }
}

function getStorage(mod: StorageModule): Storage | null {
  if (storage === undefined) {
    try {
      storage = new mod.ExtensionStorage(WIDGET_APP_GROUP);
    } catch {
      storage = null;
    }
  }
  return storage;
}

/** Publica (o borra, con null) el próximo viaje para el widget. Ignora repeticiones. */
export function syncTripWidget(trip: WidgetTrip | null): void {
  const payload = trip ? JSON.stringify(trip) : null;
  if (payload === lastPayload) return;
  const mod = getModule();
  const store = mod ? getStorage(mod) : null;
  if (!mod || !store) return;
  try {
    if (payload) store.set(NEXT_TRIP_KEY, payload);
    else store.remove(NEXT_TRIP_KEY);
    mod.ExtensionStorage.reloadWidget();
    lastPayload = payload;
  } catch {
    // El widget es opcional: un fallo aquí no debe afectar a la app.
  }
}
