export type TransitMode = "flight" | "train" | "bus";
export type TransitLanguage = "en" | "es";

export type TransitOption = {
  mode: TransitMode;
  label: string;
  durationMinutes: number;
  durationLabel: string;
  estimatedCost: number;
  costCurrency: "EUR";
  departureTime: string | null;
  arrivalTime: string | null;
  source: string;
  isEstimated: boolean;
  convenience: "high" | "medium" | "low";
  summary: string;
};

export type TransitRecommendation = {
  id: string;
  origin: string;
  destination: string;
  travelDate: string;
  recommendation: TransitMode;
  recommendationReason: string;
  options: TransitOption[];
};

type CityProfile = {
  name: string;
  aliases: string[];
  latitude: number;
  longitude: number;
  airport: string;
  airportName: string;
};

type AviationStackFlight = {
  airline?: { name?: string };
  flight?: { iata?: string };
  departure?: { airport?: string; iata?: string; scheduled?: string; estimated?: string };
  arrival?: { airport?: string; iata?: string; scheduled?: string; estimated?: string };
};

type AviationStackResponse = {
  data?: AviationStackFlight[];
};

export const TRANSIT_RECOMMENDATION_TIMEOUT_MS = 5000;
const cityProfiles: CityProfile[] = [
  { name: "Madrid", aliases: ["madrid"], latitude: 40.4168, longitude: -3.7038, airport: "MAD", airportName: "Adolfo Suárez Madrid-Barajas" },
  { name: "Lisboa", aliases: ["lisboa", "lisbon"], latitude: 38.7223, longitude: -9.1393, airport: "LIS", airportName: "Humberto Delgado" },
  { name: "Oporto", aliases: ["oporto", "porto"], latitude: 41.1579, longitude: -8.6291, airport: "OPO", airportName: "Francisco Sá Carneiro" },
  { name: "París", aliases: ["paris"], latitude: 48.8566, longitude: 2.3522, airport: "CDG", airportName: "Charles de Gaulle" },
  { name: "Roma", aliases: ["roma", "rome"], latitude: 41.9028, longitude: 12.4964, airport: "FCO", airportName: "Leonardo da Vinci-Fiumicino" },
  { name: "Barcelona", aliases: ["barcelona"], latitude: 41.3874, longitude: 2.1686, airport: "BCN", airportName: "Josep Tarradellas Barcelona-El Prat" },
  { name: "Londres", aliases: ["londres", "london"], latitude: 51.5072, longitude: -0.1276, airport: "LHR", airportName: "Heathrow" },
  { name: "Ámsterdam", aliases: ["amsterdam", "amsterdam"], latitude: 52.3676, longitude: 4.9041, airport: "AMS", airportName: "Schiphol" },
  { name: "Berlín", aliases: ["berlin"], latitude: 52.52, longitude: 13.405, airport: "BER", airportName: "Berlin Brandenburg" },
  { name: "Viena", aliases: ["viena", "vienna"], latitude: 48.2082, longitude: 16.3738, airport: "VIE", airportName: "Vienna International" },
  { name: "Praga", aliases: ["praga", "prague"], latitude: 50.0755, longitude: 14.4378, airport: "PRG", airportName: "Václav Havel Prague" },
  { name: "Atenas", aliases: ["atenas", "athens"], latitude: 37.9838, longitude: 23.7275, airport: "ATH", airportName: "Athens International" },
  { name: "Nueva York", aliases: ["nueva york", "new york", "new york city"], latitude: 40.7128, longitude: -74.006, airport: "JFK", airportName: "John F. Kennedy" },
  { name: "Ciudad de México", aliases: ["ciudad de mexico", "mexico city"], latitude: 19.4326, longitude: -99.1332, airport: "MEX", airportName: "Benito Juárez" },
  { name: "Tokio", aliases: ["tokio", "tokyo"], latitude: 35.6762, longitude: 139.6503, airport: "NRT", airportName: "Narita" },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cityName(destination: string) {
  return destination.split(",")[0]?.trim() || destination.trim();
}

function findCity(destination: string) {
  const normalized = normalize(cityName(destination));
  return cityProfiles.find((profile) => profile.aliases.some((alias) => normalize(alias) === normalized));
}

function haversineKilometers(origin: CityProfile | undefined, destination: CityProfile | undefined) {
  if (!origin || !destination) return 500;
  const earthRadius = 6371;
  const latitudeDelta = (destination.latitude - origin.latitude) * Math.PI / 180;
  const longitudeDelta = (destination.longitude - origin.longitude) * Math.PI / 180;
  const latitude1 = origin.latitude * Math.PI / 180;
  const latitude2 = destination.latitude * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude1) * Math.cos(latitude2);
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

function formatDuration(minutes: number, language: TransitLanguage) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  const hourUnit = language === "es" ? "h" : (hours === 1 ? "hr" : "hrs");
  return remainingMinutes ? `${hours} ${hourUnit} ${remainingMinutes} min` : `${hours} ${hourUnit}`;
}

function formatCurrency(value: number, language: TransitLanguage) {
  return new Intl.NumberFormat(language === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(value: string | null, language: TransitLanguage) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString(language === "es" ? "es-MX" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
}

function makeEstimatedOptions(
  origin: string,
  destination: string,
  travelDate: string,
  distanceKm: number,
  language: TransitLanguage,
): TransitOption[] {
  const isSpanish = language === "es";
  const flightMinutes = Math.max(90, Math.round(distanceKm / 10 + 75));
  const trainMinutes = Math.max(95, Math.round(distanceKm / 1.55 + 35));
  const busMinutes = Math.max(150, Math.round(distanceKm / 0.95 + 45));
  const options: TransitOption[] = [
    {
      mode: "flight",
      label: isSpanish ? "Vuelo" : "Flight",
      durationMinutes: flightMinutes,
      durationLabel: formatDuration(flightMinutes, language),
      estimatedCost: Math.max(60, Math.round(distanceKm * 0.13)),
      costCurrency: "EUR",
      departureTime: null,
      arrivalTime: null,
      source: isSpanish ? "Estimación de ruta" : "Route estimate",
      isEstimated: true,
      convenience: distanceKm > 700 ? "high" : "medium",
      summary: isSpanish
        ? `La opción más rápida entre ${cityName(origin)} y ${cityName(destination)}, contando traslados y controles del aeropuerto.`
        : `The fastest option between ${cityName(origin)} and ${cityName(destination)}, including airport transfers and security.`,
    },
    {
      mode: "train",
      label: isSpanish ? "Tren" : "Train",
      durationMinutes: trainMinutes,
      durationLabel: formatDuration(trainMinutes, language),
      estimatedCost: Math.max(25, Math.round(distanceKm * 0.09)),
      costCurrency: "EUR",
      departureTime: null,
      arrivalTime: null,
      source: isSpanish ? "Estimación de ruta" : "Route estimate",
      isEstimated: true,
      convenience: distanceKm <= 800 ? "high" : "low",
      summary: isSpanish
        ? "Suele ofrecer el mejor equilibrio cuando hay conexión ferroviaria directa y evita los tiempos del aeropuerto."
        : "It often offers the best balance when a direct rail connection is available and avoids airport processing times.",
    },
    {
      mode: "bus",
      label: isSpanish ? "Autobús" : "Bus",
      durationMinutes: busMinutes,
      durationLabel: formatDuration(busMinutes, language),
      estimatedCost: Math.max(15, Math.round(distanceKm * 0.055)),
      costCurrency: "EUR",
      departureTime: null,
      arrivalTime: null,
      source: isSpanish ? "Estimación de ruta" : "Route estimate",
      isEstimated: true,
      convenience: "medium",
      summary: isSpanish
        ? "La alternativa de menor costo estimado, aunque normalmente requiere más tiempo de carretera."
        : "The lowest estimated-cost alternative, although it usually requires more time on the road.",
    },
  ];

  return options;
}

function validScheduledTime(value: string | undefined) {
  if (!value) return undefined;
  return Number.isNaN(new Date(value).getTime()) ? undefined : value;
}

async function lookupFlight(
  origin: CityProfile | undefined,
  destination: CityProfile | undefined,
  travelDate: string,
  requestSignal: AbortSignal,
  language: TransitLanguage,
): Promise<TransitOption | undefined> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey || !origin || !destination || requestSignal.aborted) return undefined;

  const params = new URLSearchParams({
    access_key: apiKey,
    dep_iata: origin.airport,
    arr_iata: destination.airport,
    flight_date: travelDate,
    limit: "1",
  });

  try {
    const response = await fetch(`https://api.aviationstack.com/v1/flights?${params}`, {
      signal: AbortSignal.any([requestSignal, AbortSignal.timeout(FLIGHT_LOOKUP_TIMEOUT_MS)]),
    });
    if (!response.ok) return undefined;
    const data = await response.json() as AviationStackResponse;
    const flight = data.data?.[0];
    if (!flight) return undefined;

    const departure = validScheduledTime(flight.departure?.scheduled);
    const arrival = validScheduledTime(flight.arrival?.scheduled);
    if (!departure || !arrival) return undefined;

    const durationMinutes = Math.max(60, Math.round((new Date(arrival).getTime() - new Date(departure).getTime()) / 60000));
    const airline = flight.airline?.name ?? (language === "es" ? "Aerolínea disponible" : "Available airline");
    const flightNumber = flight.flight?.iata ? ` ${flight.flight.iata}` : "";

    return {
      mode: "flight",
      label: `${language === "es" ? "Vuelo" : "Flight"}${flightNumber}`,
      durationMinutes,
      durationLabel: formatDuration(durationMinutes, language),
      estimatedCost: Math.max(60, Math.round(haversineKilometers(origin, destination) * 0.13)),
      costCurrency: "EUR",
      departureTime: formatTime(departure ?? null, language),
      arrivalTime: formatTime(arrival ?? null, language),
      source: `AviationStack · ${airline}`,
      isEstimated: false,
      convenience: "high",
      summary: language === "es"
        ? `Horario consultado para ${travelDate}; considera traslados al aeropuerto y controles antes de reservar.`
        : `Schedule checked for ${travelDate}; account for airport transfers and security before booking.`,
    };
  } catch {
    return undefined;
  }
}

function chooseRecommendation(options: TransitOption[], distanceKm: number): TransitMode {
  const flight = options.find((option) => option.mode === "flight");
  const train = options.find((option) => option.mode === "train");
  if (distanceKm > 700 && flight) return "flight";
  if (train && distanceKm <= 800 && train.estimatedCost <= (flight?.estimatedCost ?? Infinity) * 1.2) return "train";
  return flight ? "flight" : "bus";
}

async function mapWithConcurrency<T, Result>(
  items: readonly T[],
  limit: number,
  map: (item: T, index: number) => Promise<Result>,
) {
  const results = new Array<Result>(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await map(items[index] as T, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function getTransitRecommendations(
  stops: ReadonlyArray<{ destination: string; startDate: string; endDate: string }>,
  language: TransitLanguage = "en",
): Promise<TransitRecommendation[]> {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TRANSIT_RECOMMENDATION_TIMEOUT_MS);
  const legs = stops.slice(0, -1).map((origin, index) => ({ origin, destination: stops[index + 1]!, index }));
  try {
    return await mapWithConcurrency(legs, 3, async ({ origin, destination }) => {
      const originName = cityName(origin.destination);
      const destinationName = cityName(destination.destination);
      const originProfile = findCity(origin.destination);
      const destinationProfile = findCity(destination.destination);
      const distanceKm = haversineKilometers(originProfile, destinationProfile);
      const options = makeEstimatedOptions(origin.destination, destination.destination, destination.startDate, distanceKm, language);
      const liveFlight = await lookupFlight(originProfile, destinationProfile, destination.startDate, timeoutController.signal, language);
      if (liveFlight) {
        options.splice(0, 1, liveFlight);
      }

      const recommendation = chooseRecommendation(options, distanceKm);
      const recommendedOption = options.find((option) => option.mode === recommendation) ?? options[0];
      const recommendationReason = language === "es"
        ? recommendation === "flight"
          ? `Recomendamos el vuelo porque reduce el trayecto a ${recommendedOption.durationLabel}; el costo indicado es estimado y el horario ${recommendedOption.isEstimated ? "también es estimado" : "fue consultado con AviationStack"}.`
          : recommendation === "train"
            ? `Recomendamos el tren porque equilibra ${recommendedOption.durationLabel} de viaje con un costo estimado de ${formatCurrency(recommendedOption.estimatedCost, language)}, sin traslados de aeropuerto.`
            : `Recomendamos el autobús para priorizar el costo estimado de ${formatCurrency(recommendedOption.estimatedCost, language)}; tardará aproximadamente ${recommendedOption.durationLabel}.`
        : recommendation === "flight"
          ? `We recommend flying because it reduces the journey to ${recommendedOption.durationLabel}; the listed cost is estimated and the schedule ${recommendedOption.isEstimated ? "is also estimated" : "was checked with AviationStack"}.`
          : recommendation === "train"
            ? `We recommend the train because it balances a ${recommendedOption.durationLabel} journey with an estimated cost of ${formatCurrency(recommendedOption.estimatedCost, language)}, without airport transfers.`
            : `We recommend the bus to prioritize the estimated cost of ${formatCurrency(recommendedOption.estimatedCost, language)}; the journey will take about ${recommendedOption.durationLabel}.`;

      return {
        id: `${normalize(origin.destination)}-${normalize(destination.destination)}-${destination.startDate}`,
        origin: originName,
        destination: destinationName,
        travelDate: destination.startDate,
        recommendation,
        recommendationReason,
        options,
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}

const FLIGHT_LOOKUP_TIMEOUT_MS = 2500;
