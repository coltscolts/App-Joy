import AsyncStorage from '@react-native-async-storage/async-storage';
import { locatePlace, updateActivity, type Activity } from '@workspace/api-client-react';
import { language } from '@/lib/i18n';
import { geocodeQuery, hasCoordinates, isCityCentroid, isMappable, placesQuery, type LatLng } from '@/lib/tripMap';

/**
 * Ubica las actividades sin coordenadas y guarda el resultado en el servidor.
 * 1) Google Places (servidor): entiende nombres de lugares («Castillo de Chapultepec»).
 * 2) Si no está disponible, el geocodificador del sistema (Apple en iOS), pero
 *    se descarta si devuelve el centro de la ciudad (no encontró el lugar).
 */
const CACHE_PREFIX = 'joyplann.geo.v2:';
const MAX_PER_RUN = 25;

async function fromCache(key: string): Promise<LatLng | null | undefined> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return cached === 'none' ? null : (JSON.parse(cached) as LatLng);
  } catch {
    // Sin caché.
  }
  return undefined;
}

const save = (key: string, value: LatLng | null) =>
  AsyncStorage.setItem(key, value ? JSON.stringify(value) : 'none').catch(() => {});

async function systemGeocode(query: string): Promise<LatLng | null> {
  const key = `${CACHE_PREFIX}sys:${query.toLowerCase()}`;
  const cached = await fromCache(key);
  if (cached !== undefined) return cached;
  try {
    const Location = await import('expo-location');
    const [first] = await Location.geocodeAsync(query);
    const result = first ? { latitude: first.latitude, longitude: first.longitude } : null;
    await save(key, result);
    return result;
  } catch {
    return null;
  }
}

/** null = no encontrado; 'unavailable' = Google Places no configurado o caído. */
async function placesGeocode(query: string, city: string): Promise<LatLng | null | 'unavailable'> {
  const key = `${CACHE_PREFIX}places:${query.toLowerCase()}|${city.toLowerCase()}`;
  const cached = await fromCache(key);
  if (cached !== undefined) return cached;
  try {
    const { location } = await locatePlace({ query, city, language });
    const result = location ? { latitude: location.latitude, longitude: location.longitude } : null;
    await save(key, result);
    return result;
  } catch {
    return 'unavailable';
  }
}

async function locate(activity: Activity, city: string | null): Promise<LatLng | null> {
  const query = placesQuery(activity);
  if (query) {
    const found = await placesGeocode(query, city ?? '');
    if (found !== 'unavailable') return found;
  }
  const fallback = geocodeQuery(activity, city);
  if (!fallback) return null;
  const point = await systemGeocode(fallback);
  if (!point || !city) return point;
  const center = await systemGeocode(city);
  return isCityCentroid(point, center) && fallback.toLowerCase() !== city.toLowerCase() ? null : point;
}

/** Devuelve cuántas actividades se ubicaron. */
export async function locateActivities(activities: Activity[], fallbackCity: (activity: Activity) => string | null): Promise<number> {
  const candidates = activities.filter(isMappable);
  // Las que ya tienen coordenadas pero caen en el centro exacto de la ciudad
  // (versiones anteriores las ubicaban así) se vuelven a buscar una vez.
  const suspicious = new Set<number>();
  for (const activity of candidates) {
    if (!hasCoordinates(activity)) continue;
    const city = activity.city || fallbackCity(activity);
    const checkedKey = `${CACHE_PREFIX}checked:${activity.id}`;
    if (!city || (await AsyncStorage.getItem(checkedKey).catch(() => null))) continue;
    const center = await systemGeocode(city);
    if (isCityCentroid(activity, center)) suspicious.add(activity.id);
    else await AsyncStorage.setItem(checkedKey, '1').catch(() => {});
  }
  const pending = candidates
    .filter((activity) => !hasCoordinates(activity) || suspicious.has(activity.id))
    .slice(0, MAX_PER_RUN);
  let located = 0;
  for (const activity of pending) {
    const coordinates = await locate(activity, activity.city || fallbackCity(activity));
    if (suspicious.has(activity.id)) await AsyncStorage.setItem(`${CACHE_PREFIX}checked:${activity.id}`, '1').catch(() => {});
    if (!coordinates) continue;
    try {
      await updateActivity(activity.id, coordinates);
      located += 1;
    } catch {
      // Se intentará la próxima vez que se abra el mapa.
    }
  }
  return located;
}
