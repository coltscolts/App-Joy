import { createRequire } from "node:module";

type RawCity = {
  cityId: number;
  name: string;
  altName?: string;
  country: string;
  population: number;
};

type IndexedCity = {
  id: number;
  city: string;
  country: string;
  label: string;
  population: number;
  normalizedCity: string;
  normalizedAlternate: string;
  normalizedCountry: string;
  normalizedSearch: string;
};

export type DestinationSuggestion = Pick<IndexedCity, "city" | "country" | "label">;

const require = createRequire(import.meta.url);
const rawCities = require("all-the-cities") as RawCity[];
const countryNames = new Intl.DisplayNames(["es-MX"], { type: "region" });

const commonAliases: Record<string, string> = {
  "Athens": "atenas",
  "Beijing": "pekin pekín",
  "Copenhagen": "copenhague",
  "Florence": "florencia",
  "Istanbul": "estambul",
  "Lisbon": "lisboa",
  "London": "londres",
  "Mexico City": "ciudad de mexico ciudad de méxico",
  "Milan": "milan milán",
  "Moscow": "moscu moscú",
  "Munich": "munchen münchen",
  "New York City": "nueva york",
  "Paris": "paris parís",
  "Prague": "praga",
  "Rome": "roma",
  "Seoul": "seul seúl",
  "Tokyo": "tokio",
  "Venice": "venecia",
  "Vienna": "viena",
  "Warsaw": "varsovia",
  "Zurich": "zurich zúrich",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[øœ]/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[łđ]/g, "d")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countryName(countryCode: string): string {
  return countryNames.of(countryCode) ?? countryCode;
}

const cities: IndexedCity[] = rawCities
  .filter((city) => city.name && city.country)
  .map((city) => {
    const country = countryName(city.country);
    const normalizedCity = normalize(city.name);
    const normalizedAlternate = normalize(`${city.altName ?? ""} ${commonAliases[city.name] ?? ""}`);
    const normalizedCountry = normalize(country);

    return {
      id: city.cityId,
      city: city.name,
      country,
      label: `${city.name}, ${country}`,
      population: city.population ?? 0,
      normalizedCity,
      normalizedAlternate,
      normalizedCountry,
      normalizedSearch: `${normalizedCity} ${normalizedAlternate} ${normalizedCountry}`.trim(),
    };
  });

const prefixIndex = new Map<string, IndexedCity[]>();

function addToIndex(value: string, city: IndexedCity) {
  for (const term of value.split(" ")) {
    if (term.length < 2) continue;
    const key = term.slice(0, 2);
    const bucket = prefixIndex.get(key);
    if (bucket) bucket.push(city);
    else prefixIndex.set(key, [city]);
  }
}

for (const city of cities) {
  addToIndex(city.normalizedCity, city);
  addToIndex(city.normalizedAlternate, city);
  addToIndex(city.normalizedCountry, city);
}

function scoreMatch(city: IndexedCity, query: string): number {
  if (city.normalizedCity === query || city.normalizedAlternate === query) return 10_000;
  if (city.normalizedCity.startsWith(query) || city.normalizedAlternate.startsWith(query)) return 8_000;

  const words = `${city.normalizedCity} ${city.normalizedAlternate}`.split(" ");
  if (words.some((word) => word.startsWith(query))) return 6_000;
  if (city.normalizedCountry.startsWith(query)) return 4_000;
  if (city.normalizedSearch.includes(query)) return 2_000;
  return -1;
}

/**
 * Searches the GeoNames-derived catalog without scanning all cities per keystroke.
 * Results are weighted toward exact/prefix matches, then population.
 */
export function searchDestinationCatalog(query: string, limit = 6): DestinationSuggestion[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const seen = new Set<number>();
  const candidates: IndexedCity[] = [];
  for (const term of normalizedQuery.split(" ")) {
    const bucket = prefixIndex.get(term.slice(0, 2)) ?? [];
    for (const city of bucket) {
      if (!seen.has(city.id)) {
        seen.add(city.id);
        candidates.push(city);
      }
    }
  }

  const rankedCities = candidates
    .map((city) => ({ city, score: scoreMatch(city, normalizedQuery) }))
    .filter((result) => result.score >= 0)
    .sort((left, right) => (
      right.score - left.score
      || right.city.population - left.city.population
      || left.city.label.localeCompare(right.city.label, "es-MX")
    ));

  const resultLimit = Math.min(Math.max(limit, 1), 12);
  const returnedLabels = new Set<string>();
  const suggestions: DestinationSuggestion[] = [];
  for (const { city } of rankedCities) {
    if (returnedLabels.has(city.label)) continue;
    returnedLabels.add(city.label);
    suggestions.push({ city: city.city, country: city.country, label: city.label });
    if (suggestions.length === resultLimit) break;
  }

  return suggestions;
}

export const destinationCatalogMetadata = {
  cityCount: cities.length,
  source: "all-the-cities 3.1.0, derived from GeoNames cities1000 data",
} as const;