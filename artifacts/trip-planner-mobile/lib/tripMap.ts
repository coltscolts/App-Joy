/** Lógica del mapa del itinerario (sin dependencias nativas, para poder probarla). */

export type LatLng = { latitude: number; longitude: number };

export type MapActivity = {
  id: number;
  date: string;
  time?: string | null;
  title: string;
  category: string;
  location?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en línea recta (km). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Leg = { km: number; mode: 'walk' | 'car'; minutes: number };

/**
 * Estimación de un tramo: a pie hasta 3 km (4,8 km/h), en coche a partir de ahí
 * (30 km/h de media urbana + 5 min). Se corrige la línea recta ×1,3 para
 * aproximar calles. Es orientativo: la ruta real la da «Cómo llegar».
 */
export function estimateLeg(straightKm: number): Leg {
  const km = straightKm * 1.3;
  if (km <= 3) return { km, mode: 'walk', minutes: Math.max(1, Math.round((km / 4.8) * 60)) };
  return { km, mode: 'car', minutes: Math.round((km / 30) * 60 + 5) };
}

/** Actividades que se pueden situar en el mapa (los vuelos se excluyen). */
export function isMappable(activity: MapActivity): boolean {
  return activity.category !== 'flight';
}

export function hasCoordinates(activity: MapActivity): activity is MapActivity & LatLng {
  return typeof activity.latitude === 'number' && typeof activity.longitude === 'number';
}

/** Actividades de un día (o de todo el viaje) en orden: fecha, hora (sin hora al final) e id. */
export function orderActivities<T extends MapActivity>(activities: T[], date: string | 'all'): T[] {
  return activities
    .filter((activity) => isMappable(activity) && (date === 'all' || activity.date === date))
    .sort((a, b) =>
      a.date.localeCompare(b.date)
      || (a.time ? 0 : 1) - (b.time ? 0 : 1)
      || (a.time ?? '').localeCompare(b.time ?? '')
      || a.id - b.id);
}

/** Tramos entre lugares consecutivos con coordenadas, y el total. */
export function buildRoute<T extends MapActivity>(ordered: T[]) {
  const located = ordered.filter((activity): activity is T & LatLng => hasCoordinates(activity));
  const legs = located.slice(1).map((to, index) => ({
    from: located[index],
    to,
    ...estimateLeg(haversineKm(located[index], to)),
  }));
  // Solo tramos dentro del mismo día (en «todo el viaje» no se suma el salto entre días).
  const totalKm = legs.filter((leg) => leg.from.date === leg.to.date).reduce((sum, leg) => sum + leg.km, 0);
  return { located, legs, totalKm, missing: ordered.length - located.length };
}

/** Texto de búsqueda para ubicar una actividad. */
export function geocodeQuery(activity: MapActivity, fallbackCity?: string | null): string | null {
  const city = activity.city || fallbackCity || '';
  const place = activity.location?.trim() || activity.title.trim();
  if (!place) return null;
  return city && !place.toLowerCase().includes(city.split(',')[0].toLowerCase()) ? `${place}, ${city}` : place;
}

/** Texto para Google Places: nombre + zona (p. ej. «Castillo de Chapultepec, Bosque de Chapultepec»). */
export function placesQuery(activity: MapActivity): string | null {
  const title = activity.title.trim();
  const location = activity.location?.trim() ?? '';
  if (!title && !location) return null;
  if (!location || title.toLowerCase().includes(location.toLowerCase())) return title;
  if (!title || location.toLowerCase().includes(title.toLowerCase())) return location;
  return `${title}, ${location}`;
}

/**
 * ¿El resultado es en realidad «el centro de la ciudad»? El geocodificador del
 * sistema lo devuelve cuando no entiende el nombre del lugar.
 */
export function isCityCentroid(point: LatLng, cityCenter: LatLng | null): boolean {
  return Boolean(cityCenter) && haversineKm(point, cityCenter!) < 0.4;
}

export function formatKm(km: number, locale: string): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
