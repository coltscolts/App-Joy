import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateActivity, type Activity } from '@workspace/api-client-react';
import { geocodeQuery, hasCoordinates, isMappable, type LatLng } from '@/lib/tripMap';

/**
 * Ubica las actividades sin coordenadas con el geolocalizador del sistema
 * (Apple en iOS: gratis y sin permiso de ubicación) y guarda el resultado en
 * el servidor para no repetirlo. Caché local por texto de búsqueda.
 */
const CACHE_PREFIX = 'joyplann.geo.v1:';
const MAX_PER_RUN = 25;

async function geocode(query: string): Promise<LatLng | null> {
  const key = CACHE_PREFIX + query.toLowerCase();
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return cached === 'none' ? null : (JSON.parse(cached) as LatLng);
  } catch {
    // Sin caché: seguimos.
  }
  try {
    const Location = await import('expo-location');
    const [first] = await Location.geocodeAsync(query);
    const result = first ? { latitude: first.latitude, longitude: first.longitude } : null;
    await AsyncStorage.setItem(key, result ? JSON.stringify(result) : 'none').catch(() => {});
    return result;
  } catch {
    return null; // Límite del servicio o sin conexión: se reintenta otro día.
  }
}

/** Devuelve cuántas actividades se ubicaron. */
export async function locateActivities(activities: Activity[], fallbackCity: (activity: Activity) => string | null): Promise<number> {
  const pending = activities
    .filter((activity) => isMappable(activity) && !hasCoordinates(activity))
    .slice(0, MAX_PER_RUN);
  let located = 0;
  for (const activity of pending) {
    const query = geocodeQuery(activity, fallbackCity(activity));
    if (!query) continue;
    const coordinates = await geocode(query);
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
