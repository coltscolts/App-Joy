import { logger } from "./lib/logger";

/**
 * Contacto verificado de un lugar (restaurante, bar…) con Google Places:
 * teléfono, web, dirección, valoración y si acepta reservas. Nunca se usan
 * datos generados por la IA para contactar: o vienen de Google o no se muestran.
 * Se consulta solo cuando la persona pide el contacto (coste por consulta).
 */

export type PlaceContact = {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  reservable: boolean | null;
  rating: number | null;
  ratingCount: number | null;
  /** Horario semanal tal como lo publica Google (lunes primero, en el idioma pedido). */
  openingHours: string[] | null;
  /** Días con apertura (0 = domingo … 6 = sábado); null si no hay horario. */
  openDays: number[] | null;
};

type GooglePlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  reservable?: boolean;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    periods?: { open?: { day?: number } }[];
  };
};

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.reservable",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
].join(",");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, { expiresAt: number; contact: PlaceContact | null }>();

export class PlaceContactError extends Error {
  constructor(public readonly code: "not_configured" | "provider_unavailable") {
    super(code);
  }
}

export function isPlaceContactConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

const safeUrl = (value?: string) => (value && /^https:\/\//i.test(value) ? value : null);

/** Normaliza la respuesta de Google. Exportada para pruebas. */
export function toPlaceContact(place: GooglePlace | undefined): PlaceContact | null {
  const name = place?.displayName?.text?.trim();
  if (!place || !name) return null;
  return {
    name,
    address: place.formattedAddress?.trim() || null,
    phone: place.internationalPhoneNumber?.trim() || place.nationalPhoneNumber?.trim() || null,
    website: safeUrl(place.websiteUri),
    mapsUrl: safeUrl(place.googleMapsUri),
    reservable: typeof place.reservable === "boolean" ? place.reservable : null,
    rating: typeof place.rating === "number" ? place.rating : null,
    ratingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.length
      ? place.regularOpeningHours.weekdayDescriptions.map((line) => line.trim())
      : null,
    openDays: place.regularOpeningHours?.periods?.length
      ? [...new Set(place.regularOpeningHours.periods
          .map((period) => period.open?.day)
          .filter((day): day is number => typeof day === "number" && day >= 0 && day <= 6))].sort()
      : null,
  };
}

export async function lookupPlaceContact(params: { name: string; city: string; language: "en" | "es" }): Promise<PlaceContact | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new PlaceContactError("not_configured");

  const key = [params.language, params.city.trim().toLowerCase(), params.name.trim().toLowerCase()].join("|");
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.contact;

  try {
    const response = await fetch(GOOGLE_PLACES_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
      body: JSON.stringify({ textQuery: `${params.name.trim()}, ${params.city.trim()}`, languageCode: params.language, maxResultCount: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.error({ statusCode: response.status }, "Google Places contact lookup failed");
      throw new PlaceContactError("provider_unavailable");
    }
    const payload = (await response.json()) as { places?: GooglePlace[] };
    const contact = toPlaceContact(payload.places?.[0]);
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(key, { expiresAt: now + CACHE_TTL_MS, contact });
    return contact;
  } catch (error) {
    if (error instanceof PlaceContactError) throw error;
    logger.error({ err: error }, "Google Places contact lookup failed");
    throw new PlaceContactError("provider_unavailable");
  }
}

export type PlaceLocation = { name: string; latitude: number; longitude: number };

const LOCATE_FIELD_MASK = "places.displayName,places.location";
const locateCache = new Map<string, { expiresAt: number; location: PlaceLocation | null }>();

/** Normaliza la ubicación de Google. Exportada para pruebas. */
export function toPlaceLocation(place: { displayName?: { text?: string }; location?: { latitude?: number; longitude?: number } } | undefined): PlaceLocation | null {
  const lat = place?.location?.latitude;
  const lng = place?.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { name: place?.displayName?.text?.trim() || "", latitude: lat, longitude: lng };
}

/**
 * Coordenadas exactas de un lugar (p. ej. «Castillo de Chapultepec») para el
 * mapa. El geocodificador del sistema solo entiende direcciones y, con nombres
 * de lugares, suele devolver el centro de la ciudad.
 */
export async function locatePlace(params: { query: string; city: string; language: "en" | "es" }): Promise<PlaceLocation | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new PlaceContactError("not_configured");
  const textQuery = params.city && !params.query.toLowerCase().includes(params.city.split(",")[0].trim().toLowerCase())
    ? `${params.query.trim()}, ${params.city.trim()}`
    : params.query.trim();
  const key = `${params.language}|${textQuery.toLowerCase()}`;
  const now = Date.now();
  const cached = locateCache.get(key);
  if (cached && cached.expiresAt > now) return cached.location;
  try {
    const response = await fetch(GOOGLE_PLACES_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": LOCATE_FIELD_MASK },
      body: JSON.stringify({ textQuery, languageCode: params.language, maxResultCount: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.error({ statusCode: response.status }, "Google Places locate failed");
      throw new PlaceContactError("provider_unavailable");
    }
    const payload = (await response.json()) as { places?: Parameters<typeof toPlaceLocation>[0][] };
    const location = toPlaceLocation(payload.places?.[0]);
    if (locateCache.size >= MAX_CACHE_ENTRIES) locateCache.delete(locateCache.keys().next().value!);
    locateCache.set(key, { expiresAt: now + 7 * CACHE_TTL_MS, location });
    return location;
  } catch (error) {
    if (error instanceof PlaceContactError) throw error;
    logger.error({ err: error }, "Google Places locate failed");
    throw new PlaceContactError("provider_unavailable");
  }
}
