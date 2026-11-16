import type { ActivitySuggestion, TravelSuggestionParams } from "./openai";

/**
 * Lugares destacados: aparecen primero en las sugerencias de su ciudad y
 * categorías, con la marca «featured» (la app muestra «Destacado»).
 */
type FeaturedPlace = {
  title: string;
  /** Fragmentos (en minúsculas, sin acentos) que identifican la ciudad del destino. */
  cities: string[];
  categories: string[];
  location: string;
  description: { es: string; en: string };
  estimatedTime: { es: string; en: string };
};

const FEATURED_PLACES: FeaturedPlace[] = [
  {
    title: "GOATROOM MX",
    cities: ["ciudad de mexico", "mexico city", "cdmx", "mexico df", "mexico, d.f", "distrito federal"],
    categories: ["bar", "nightlife"],
    location: "Monterrey 240, Roma Sur, Ciudad de México",
    description: {
      es: "Bar en la Roma Sur para cócteles y salir de noche. Revisa el horario y reserva antes de ir.",
      en: "Bar in Roma Sur for cocktails and a night out. Check opening hours and book before you go.",
    },
    estimatedTime: { es: "2-3 horas", en: "2-3 hours" },
  },
];

const NIGHT_INTEREST = /night|nocturn|\bbar(es|s)?\b|cocktail|c[oó]ctel|copas|drinks|tragos|antro|mixolog/i;
const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ¿El pedido es de bares, vida nocturna o cócteles? */
function wantsNightlife(params: TravelSuggestionParams, suggestions: ActivitySuggestion[], place: FeaturedPlace) {
  if (place.categories.includes(params.category)) return true;
  if ((params.interests ?? []).some((interest) => NIGHT_INTEREST.test(interest))) return true;
  // «Ayúdame con ideas» (categoría mixta): si la IA propuso algún bar o plan nocturno.
  return params.category === "any" && suggestions.some((s) => place.categories.includes(s.category));
}

/** Pone los lugares destacados al principio (sin duplicarlos). Exportada para pruebas. */
export function applyFeaturedPlaces(params: TravelSuggestionParams, suggestions: ActivitySuggestion[]): ActivitySuggestion[] {
  const destination = normalize(params.destination);
  let result = suggestions;
  for (const place of FEATURED_PLACES) {
    if (!place.cities.some((city) => destination.includes(city))) continue;
    if (!wantsNightlife(params, suggestions, place)) continue;
    const key = normalize(place.title).replace(/\s+/g, "");
    const rest = result.filter((s) => !normalize(s.title).replace(/\s+/g, "").includes(key.replace(/mx$/, "")));
    const language = params.language;
    result = [
      {
        title: place.title,
        category: place.categories.includes(params.category) ? params.category : place.categories[0],
        description: place.description[language],
        location: place.location,
        estimatedTime: place.estimatedTime[language],
        kidFriendly: false,
        needsBooking: true,
        budget: params.budget,
        featured: true,
      },
      ...rest,
    ];
  }
  return result;
}
