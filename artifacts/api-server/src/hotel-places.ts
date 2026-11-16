import { logger } from "./lib/logger";

export type HotelSuggestion = {
  placeId: string;
  name: string;
  address: string;
  city: string;
};

type SearchParams = {
  query: string;
  city: string;
  language: "en" | "es";
  limit: number;
};

type GoogleAddressComponent = {
  longText?: string;
  types?: string[];
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
};

type CacheEntry = {
  expiresAt: number;
  suggestions: HotelSuggestion[];
};

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_CACHE_ENTRIES = 100;
const cache = new Map<string, CacheEntry>();

export class HotelPlacesError extends Error {
  constructor(
    public readonly code: "not_configured" | "provider_unavailable",
    message: string,
  ) {
    super(message);
  }
}

function getCity(place: GooglePlace, fallback: string) {
  const locality = place.addressComponents?.find((component) => (
    component.types?.some((type) => type === "locality" || type === "postal_town")
  ));
  return locality?.longText?.trim() || fallback;
}

function pruneCache(now: number) {
  for (const [key, value] of cache) {
    if (value.expiresAt <= now) cache.delete(key);
  }
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

export async function searchHotels(params: SearchParams): Promise<HotelSuggestion[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const isSpanish = params.language === "es";
  if (!apiKey) {
    throw new HotelPlacesError(
      "not_configured",
      isSpanish
        ? "La búsqueda de hoteles no está configurada. Escribe el nombre y la dirección manualmente."
        : "Hotel search is not configured. Enter the name and address manually.",
    );
  }

  const cacheKey = [
    params.language,
    params.city.trim().toLowerCase(),
    params.query.trim().toLowerCase(),
    params.limit,
  ].join("|");
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.suggestions;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GOOGLE_PLACES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.addressComponents",
      },
      body: JSON.stringify({
        textQuery: `${params.query.trim()} hotel in ${params.city.trim()}`,
        languageCode: params.language,
        maxResultCount: params.limit,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      logger.error({ statusCode: response.status }, "Google Places hotel search failed");
      throw new HotelPlacesError(
        "provider_unavailable",
        isSpanish
          ? "No pudimos buscar hoteles ahora. Puedes escribir los datos manualmente."
          : "We could not search hotels right now. You can enter the details manually.",
      );
    }

    const payload = await response.json() as { places?: GooglePlace[] };
    const suggestions = (payload.places ?? [])
      .map((place): HotelSuggestion | null => {
        const placeId = place.id?.trim();
        const name = place.displayName?.text?.trim();
        const address = place.formattedAddress?.trim();
        if (!placeId || !name || !address) return null;
        return { placeId, name, address, city: getCity(place, params.city) };
      })
      .filter((place): place is HotelSuggestion => place !== null)
      .slice(0, params.limit);

    pruneCache(now);
    cache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, suggestions });
    return suggestions;
  } catch (error) {
    if (error instanceof HotelPlacesError) throw error;
    logger.error({ err: error }, "Google Places hotel search failed");
    throw new HotelPlacesError(
      "provider_unavailable",
      isSpanish
        ? "No pudimos buscar hoteles ahora. Puedes escribir los datos manualmente."
        : "We could not search hotels right now. You can enter the details manually.",
    );
  } finally {
    clearTimeout(timeout);
  }
}