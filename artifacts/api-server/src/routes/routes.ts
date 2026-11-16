import { Router } from "express";
import { storage } from "../storage";
import { generateTravelSuggestions, isAiConfigured, type TravelSuggestionParams } from "../openai";
import { insertActivitySchema } from "@workspace/db";
import {
  GetSuggestionsBody,
  GetSuggestionsResponse,
  GetDestinationSuggestionsQueryParams,
  GetDestinationSuggestionsResponse,
  GetHotelSuggestionsQueryParams,
  GetTransitRecommendationsQueryParams,
  FlightLookupQueryParams,
  ExtractBookingsBody,
  ExtractBookingsResponse,
  GetPlaceContactQueryParams,
  GetPlaceContactResponse,
  GetTripOutfitsQueryParams,
  LocatePlaceQueryParams,
  LocatePlaceResponse,
  GetTripOutfitsResponse,
} from "@workspace/api-zod";
import { fromError } from "zod-validation-error";
import {
  isActivityDateInTrip,
  validateTripForCreate,
  validateTripForUpdate,
} from "../trip-validation";
import { searchDestinationCatalog } from "../city-catalog";
import { getTransitRecommendations } from "../transit-recommendations";
import { HotelPlacesError, searchHotels } from "../hotel-places";
import {
  HotelStayValidationError,
  hotelStayBatchSchema,
  validateHotelStayBatch,
  validateHotelStayRange,
} from "../hotel-stays";
import { clerkClient } from "@clerk/express";
import { requireAuth } from "../middlewares/requireAuth";
import { extractBookingsFromImage, MAX_IMAGE_BASE64_LENGTH } from "../booking-extraction";
import { checkLimit, checkStopsLimit, getPlan, incrementUsage, invalidateProStatus } from "../billing";
import { locatePlace, lookupPlaceContact, PlaceContactError } from "../place-contact";
import { getStopWeather } from "../weather";
import { applyFeaturedPlaces } from "../featured-places";
import { aiActivityTips, ruleBasedOutfit } from "../outfits";

const appRouter = Router();
const hotelSearchWindows = new Map<string, number[]>();
const HOTEL_SEARCH_WINDOW_MS = 60_000;
const HOTEL_SEARCH_LIMIT_PER_WINDOW = 30;

appRouter.use("/trips", requireAuth);
appRouter.use("/activities", requireAuth);
appRouter.use("/hotel-stays", requireAuth);
appRouter.use("/account", requireAuth);
appRouter.use("/bookings", requireAuth);
appRouter.use("/suggestions", requireAuth);
appRouter.use("/me", requireAuth);
appRouter.use("/places", requireAuth);

// Contacto verificado de un lugar sugerido (Google Places), bajo demanda.
const contactWindows = new Map<string, number[]>();
appRouter.get('/places/contact', async (req, res) => {
  const parsed = GetPlaceContactQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).toString() });
  const now = Date.now();
  const recent = (contactWindows.get(req.userId!) ?? []).filter((at) => at > now - 60 * 60_000);
  if (recent.length >= 60) return res.status(429).json({ error: 'Too many lookups, try again later' });
  recent.push(now);
  contactWindows.set(req.userId!, recent);
  try {
    const contact = await lookupPlaceContact(parsed.data);
    return res.json(GetPlaceContactResponse.parse({ contact }));
  } catch (error) {
    if (error instanceof PlaceContactError) {
      return res.status(error.code === 'not_configured' ? 503 : 502).json({ error: error.code });
    }
    req.log.error({ err: error }, 'Error looking up place contact');
    return res.status(500).json({ error: 'Failed to look up place' });
  }
});

// «Qué llevar»: clima de cada parada (en vivo / pronóstico / típico) y outfits.
appRouter.get('/trips/:id/outfits', async (req, res) => {
  const parsed = GetTripOutfitsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).toString() });
  const { language } = parsed.data;
  try {
    const id = parseInt(req.params.id);
    const trip = await storage.getTrip(id, req.userId!);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const activities = await storage.getActivitiesByTrip(id, req.userId!);
    const legs = trip.stops.length
      ? trip.stops.map((stop) => ({ city: stop.destination, startDate: stop.startDate, endDate: stop.endDate }))
      : [{ city: trip.destination, startDate: trip.startDate, endDate: trip.endDate }];
    const stops = await Promise.all(legs.slice(0, 8).map(async (leg) => {
      const weather = await getStopWeather({ ...leg, language });
      if (!weather) return { ...leg, weather: null, outfit: null };
      const outfit = ruleBasedOutfit(weather, language);
      const legActivities = activities
        .filter((a) => a.date >= leg.startDate && a.date <= leg.endDate && a.type !== 'flight')
        .map((a) => ({ title: a.title, category: a.category }));
      const extra = await aiActivityTips(weather, legActivities, language);
      const { city: _c, startDate: _s, endDate: _e, ...weatherFields } = weather;
      return { ...leg, weather: weatherFields, outfit: { ...outfit, tips: [...extra, ...outfit.tips] } };
    }));
    return res.json(GetTripOutfitsResponse.parse({ stops }));
  } catch (error) {
    req.log.error({ err: error }, 'Error building outfits');
    return res.status(500).json({ error: 'Failed to build outfits' });
  }
});

// Coordenadas exactas para el mapa (Google Places), con su propio límite.
const locateWindows = new Map<string, number[]>();
appRouter.get('/places/locate', async (req, res) => {
  const parsed = LocatePlaceQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).toString() });
  const now = Date.now();
  const recent = (locateWindows.get(req.userId!) ?? []).filter((at) => at > now - 60 * 60_000);
  if (recent.length >= 150) return res.status(429).json({ error: 'Too many lookups, try again later' });
  recent.push(now);
  locateWindows.set(req.userId!, recent);
  try {
    const location = await locatePlace(parsed.data);
    return res.json(LocatePlaceResponse.parse({ location }));
  } catch (error) {
    if (error instanceof PlaceContactError) {
      return res.status(error.code === 'not_configured' ? 503 : 502).json({ error: error.code });
    }
    req.log.error({ err: error }, 'Error locating place');
    return res.status(500).json({ error: 'Failed to locate place' });
  }
});

// Respuesta común cuando se alcanza un límite del plan gratuito.
function sendLimitReached(res: import("express").Response, check: { code: string; limit: number }) {
  return res.status(402).json({ error: "Free plan limit reached", code: check.code, limit: check.limit });
}

appRouter.get('/me/plan', async (req, res) => {
  try {
    return res.json(await getPlan(req.userId!));
  } catch (error) {
    req.log.error({ err: error }, 'Error loading plan');
    return res.status(500).json({ error: 'Failed to load plan' });
  }
});

// Tras una compra o restauración en la app: volver a consultar RevenueCat.
appRouter.post('/me/plan/refresh', async (req, res) => {
  invalidateProStatus(req.userId!);
  try {
    return res.json(await getPlan(req.userId!));
  } catch (error) {
    req.log.error({ err: error }, 'Error refreshing plan');
    return res.status(500).json({ error: 'Failed to load plan' });
  }
});

// Lectura de reservas desde capturas: limitado por usuario para controlar el coste de IA.
const extractionWindows = new Map<string, number[]>();
const EXTRACTION_WINDOW_MS = 60 * 60_000;
const EXTRACTION_LIMIT_PER_WINDOW = 30;

function canExtract(userId: string) {
  const now = Date.now();
  const recent = (extractionWindows.get(userId) ?? []).filter((timestamp) => timestamp > now - EXTRACTION_WINDOW_MS);
  if (recent.length >= EXTRACTION_LIMIT_PER_WINDOW) {
    extractionWindows.set(userId, recent);
    return false;
  }
  recent.push(now);
  extractionWindows.set(userId, recent);
  return true;
}

appRouter.post('/bookings/extract', async (req, res) => {
  const parsed = ExtractBookingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: fromError(parsed.error).toString() });
  }
  const { imageBase64, mimeType, language, tripId } = parsed.data;
  if (imageBase64.length === 0 || imageBase64.length > MAX_IMAGE_BASE64_LENGTH || !/^[A-Za-z0-9+/=\s]+$/.test(imageBase64.slice(0, 2000))) {
    return res.status(400).json({ error: 'Invalid or too large image' });
  }
  if (!isAiConfigured()) {
    return res.status(503).json({ error: 'AI is not configured on this server' });
  }
  if (!canExtract(req.userId!)) {
    return res.status(429).json({ error: 'Too many screenshots, try again later' });
  }
  try {
    const limit = await checkLimit(req.userId!, 'scans');
    if (!limit.allowed) return sendLimitReached(res, limit);
    const trip = typeof tripId === 'number' ? await storage.getTrip(tripId, req.userId!) : undefined;
    const bookings = await extractBookingsFromImage({ imageBase64, mimeType, language, trip });
    if (bookings.length) await incrementUsage(req.userId!, 'scans');
    return res.json(ExtractBookingsResponse.parse({ bookings }));
  } catch (error) {
    req.log.error({ err: error }, 'Error extracting bookings from image');
    return res.status(502).json({ error: 'Could not read the screenshot' });
  }
});

// Borrado de cuenta (exigido por App Store, norma 5.1.1(v)).
// Primero los datos propios y después el usuario en Clerk: si Clerk fallara,
// la persona puede reintentar sin que queden viajes huérfanos.
appRouter.delete('/account', async (req, res) => {
  const userId = req.userId!;
  try {
    const deletedTrips = await storage.deleteAllTripsForOwner(userId);
    if (process.env.NODE_ENV !== 'test') {
      await clerkClient.users.deleteUser(userId);
    }
    req.log.info({ deletedTrips }, 'Account deleted');
    return res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, 'Error deleting account');
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

function canSearchHotels(clientId: string) {
  const now = Date.now();
  const recentRequests = (hotelSearchWindows.get(clientId) ?? [])
    .filter((timestamp) => timestamp > now - HOTEL_SEARCH_WINDOW_MS);
  if (recentRequests.length >= HOTEL_SEARCH_LIMIT_PER_WINDOW) {
    hotelSearchWindows.set(clientId, recentRequests);
    return false;
  }
  recentRequests.push(now);
  hotelSearchWindows.set(clientId, recentRequests);
  return true;
}

appRouter.get('/destinations', (req, res) => {
  const parsedQuery = GetDestinationSuggestionsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: parsedQuery.error.issues[0]?.message ?? 'Invalid destination search' });
  }

  return res.json(GetDestinationSuggestionsResponse.parse(
    searchDestinationCatalog(parsedQuery.data.query, parsedQuery.data.limit),
  ));
});

// Trip routes
appRouter.get('/trips', async (req, res) => {
  try {
    const trips = await storage.getAllTrips(req.userId!);
    return res.json(trips);
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching trips');
    return res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

appRouter.get('/trips/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const trip = await storage.getTrip(id, req.userId!);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    return res.json(trip);
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching trip');
    return res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

appRouter.post('/trips', async (req, res) => {
  try {
    const validatedData = validateTripForCreate(req.body);
    const limit = await checkLimit(req.userId!, 'activeTrips');
    if (!limit.allowed) return sendLimitReached(res, limit);
    const stopsLimit = await checkStopsLimit(req.userId!, validatedData.stops?.length ?? 0);
    if (!stopsLimit.allowed) return sendLimitReached(res, stopsLimit);
    const trip = await storage.createTrip(validatedData, req.userId!);
    return res.status(201).json(trip);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    req.log.error({ err: error }, 'Error creating trip');
    return res.status(500).json({ error: 'Failed to create trip' });
  }
});

appRouter.patch('/trips/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingTrip = await storage.getTrip(id, req.userId!);
    if (!existingTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const normalizedTrip = validateTripForUpdate(existingTrip, req.body);
    // Solo se bloquea si el cambio añade destinos por encima del límite gratuito
    // (un viaje antiguo con más destinos se puede seguir editando).
    const newStops = normalizedTrip.stops?.length ?? 0;
    if (newStops > (existingTrip.stops?.length ?? 0)) {
      const stopsLimit = await checkStopsLimit(req.userId!, newStops);
      if (!stopsLimit.allowed) return sendLimitReached(res, stopsLimit);
    }
    const activities = await storage.getActivitiesByTrip(id, req.userId!);
    const invalidActivity = activities.find((activity) => {
      if (activity.category === 'hotel') {
        try {
          validateHotelStayRange(activity, normalizedTrip);
          return false;
        } catch (error) {
          if (error instanceof HotelStayValidationError) {
            return true;
          }
          throw error;
        }
      }
      return (
        !isActivityDateInTrip(activity.date, normalizedTrip) ||
        Boolean(activity.endDate && !isActivityDateInTrip(activity.endDate, normalizedTrip))
      );
    });
    if (invalidActivity) {
      return res.status(400).json({
        error: `Trip update would leave activity "${invalidActivity.title}" outside its route`,
      });
    }
    const trip = await storage.updateTrip(id, req.userId!, normalizedTrip);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    return res.json(trip);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    req.log.error({ err: error }, 'Error updating trip');
    return res.status(500).json({ error: 'Failed to update trip' });
  }
});

appRouter.delete('/trips/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteTrip(id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    return res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, 'Error deleting trip');
    return res.status(500).json({ error: 'Failed to delete trip' });
  }
});

// Activity routes
appRouter.get('/trips/:id/activities', async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    const trip = await storage.getTrip(tripId, req.userId!);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const activities = await storage.getActivitiesByTrip(tripId, req.userId!);
    return res.json(activities);
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching activities');
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

appRouter.get('/trips/:id/transit-recommendations', async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    const trip = await storage.getTrip(tripId, req.userId!);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const parsedQuery = GetTransitRecommendationsQueryParams.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: parsedQuery.error.issues[0]?.message ?? 'Invalid language' });
    }
    const recommendations = await getTransitRecommendations(trip.stops, parsedQuery.data.language);
    return res.json(recommendations);
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching transit recommendations');
    return res.status(500).json({ error: 'Failed to fetch transit recommendations' });
  }
});

appRouter.post('/activities', async (req, res) => {
  try {
    const validatedData = insertActivitySchema.parse(req.body);
    const trip = await storage.getTrip(validatedData.tripId, req.userId!);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (validatedData.category === 'hotel') {
      return res.status(400).json({ error: 'Create hotel stays with POST /hotel-stays' });
    }
    if (!isActivityDateInTrip(validatedData.date, trip)) {
      return res.status(400).json({ error: 'Activity date must belong to one of the trip destinations' });
    }
    const activity = await storage.createActivity(validatedData);
    return res.status(201).json(activity);
  } catch (error: any) {
    if (error instanceof HotelStayValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    req.log.error({ err: error }, 'Error creating activity');
    return res.status(500).json({ error: 'Failed to create activity' });
  }
});

appRouter.patch('/activities/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingActivity = await storage.getActivity(id, req.userId!);
    if (!existingActivity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    const validatedData = insertActivitySchema.partial().parse(req.body);
    const tripId = validatedData.tripId ?? existingActivity.tripId;
    const activityDate = validatedData.date ?? existingActivity.date;
    const trip = await storage.getTrip(tripId, req.userId!);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const nextCategory = validatedData.category ?? existingActivity.category;
    if (nextCategory === 'hotel') {
      validateHotelStayRange({
        date: activityDate,
        endDate: validatedData.endDate === undefined
          ? existingActivity.endDate
          : validatedData.endDate,
      }, trip);
    } else if (!isActivityDateInTrip(activityDate, trip)) {
      return res.status(400).json({ error: 'Activity date must belong to one of the trip destinations' });
    }
    const activity = await storage.updateActivity(id, req.userId!, validatedData);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    return res.json(activity);
  } catch (error: any) {
    if (error instanceof HotelStayValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    req.log.error({ err: error }, 'Error updating activity');
    return res.status(500).json({ error: 'Failed to update activity' });
  }
});

appRouter.delete('/activities/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteActivity(id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    return res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, 'Error deleting activity');
    return res.status(500).json({ error: 'Failed to delete activity' });
  }
});

appRouter.post('/hotel-stays', async (req, res) => {
  try {
    const { stays } = hotelStayBatchSchema.parse(req.body);
    const trip = await storage.getTrip(stays[0].tripId, req.userId!);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    validateHotelStayBatch(stays, trip);
    const created = await storage.createActivities(stays);
    return res.status(201).json(created);
  } catch (error: any) {
    if (error instanceof HotelStayValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    req.log.error({ err: error }, 'Error creating hotel stays');
    return res.status(500).json({ error: 'Failed to create hotel stays' });
  }
});

appRouter.get('/hotel-suggestions', async (req, res) => {
  const language = req.query.language === 'es' ? 'es' : 'en';
  const isSpanish = language === 'es';
  const parsedQuery = GetHotelSuggestionsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      error: isSpanish ? 'Escribe un hotel y una ciudad válidos.' : 'Enter a valid hotel and city.',
    });
  }
  if (!canSearchHotels(req.ip || req.socket.remoteAddress || 'unknown')) {
    return res.status(429).json({
      error: isSpanish
        ? 'Demasiadas búsquedas. Espera un momento o escribe el hotel manualmente.'
        : 'Too many searches. Wait a moment or enter the hotel manually.',
    });
  }

  try {
    return res.json(await searchHotels(parsedQuery.data));
  } catch (error) {
    if (error instanceof HotelPlacesError) {
      return res.status(error.code === 'not_configured' ? 503 : 502).json({
        error: error.code,
        message: error.message,
      });
    }
    req.log.error({ err: error }, 'Error searching hotels');
    return res.status(502).json({
      error: 'provider_unavailable',
      message: isSpanish
        ? 'No pudimos buscar hoteles ahora. Puedes escribir los datos manualmente.'
        : 'We could not search hotels right now. You can enter the details manually.',
    });
  }
});

// AI Travel Suggestions
appRouter.post('/suggestions', async (req, res) => {
  if (!isAiConfigured()) {
    return res.status(503).json({ error: 'AI suggestions are not configured on this server' });
  }
  try {
    const parsedBody = GetSuggestionsBody.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.issues[0]?.message ?? 'Invalid suggestion request' });
    }

    const params: TravelSuggestionParams = {
      destination: parsedBody.data.destination,
      adults: parsedBody.data.adults,
      children: parsedBody.data.children,
      category: parsedBody.data.category,
      date: parsedBody.data.date,
      language: parsedBody.data.language,
      childAges: parsedBody.data.childAges || [],
      budget: parsedBody.data.budget || 'medium',
      interests: parsedBody.data.interests || []
    };

    const limit = await checkLimit(req.userId!, 'ideas');
    if (!limit.allowed) return sendLimitReached(res, limit);
    const suggestions = applyFeaturedPlaces(params, await generateTravelSuggestions(params));
    if (suggestions.length) await incrementUsage(req.userId!, 'ideas');
    return res.json(GetSuggestionsResponse.parse(suggestions));
  } catch (error) {
    req.log.error({ err: error }, 'Error generating suggestions');
    return res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

interface AviationStackFlight {
  airline?: { name?: string };
  flight?: { iata?: string };
  departure?: { airport?: string; iata?: string; terminal?: string; gate?: string; scheduled?: string; estimated?: string };
  arrival?: { airport?: string; iata?: string; terminal?: string; gate?: string; scheduled?: string; estimated?: string };
  flight_status?: string;
}

// Flight lookup route
appRouter.get('/flight-lookup', async (req, res) => {
  const language = req.query.language === 'es' ? 'es' : 'en';
  const isSpanish = language === 'es';
  try {
    if (typeof req.query.flightNumber !== 'string' || !req.query.flightNumber.trim()) {
      return res.status(400).json({
        error: isSpanish ? 'Escribe un número de vuelo válido.' : 'Enter a valid flight number.',
      });
    }
    const parsedQuery = FlightLookupQueryParams.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        error: isSpanish ? 'Escribe un número de vuelo válido.' : 'Enter a valid flight number.',
      });
    }
    const { flightNumber, date } = parsedQuery.data;
    const apiKey = process.env.AVIATIONSTACK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: isSpanish ? 'La búsqueda de vuelos no está configurada.' : 'Flight lookup is not configured.',
      });
    }

    let apiUrl = `https://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}`;
    if (date && typeof date === 'string') {
      apiUrl += `&flight_date=${date}`;
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json() as { data?: AviationStackFlight[] };

    if (!data.data || data.data.length === 0) {
      return res.status(404).json({
        error: isSpanish
          ? 'No encontramos el vuelo. Revisa el número e inténtalo de nuevo.'
          : 'Flight not found. Check the flight number and try again.',
      });
    }

    const flight = data.data[0];

    const flightDetails = {
      airline: flight.airline?.name || '',
      flightNumber: flight.flight?.iata || flightNumber,
      departure: {
        airport: flight.departure?.airport || '',
        iata: flight.departure?.iata || '',
        terminal: flight.departure?.terminal || '',
        gate: flight.departure?.gate || '',
        scheduled: flight.departure?.scheduled || '',
        estimated: flight.departure?.estimated || '',
      },
      arrival: {
        airport: flight.arrival?.airport || '',
        iata: flight.arrival?.iata || '',
        terminal: flight.arrival?.terminal || '',
        gate: flight.arrival?.gate || '',
        scheduled: flight.arrival?.scheduled || '',
        estimated: flight.arrival?.estimated || '',
      },
      status: flight.flight_status || '',
    };

    return res.json(flightDetails);
  } catch (error) {
    req.log.error({ err: error }, 'Error looking up flight');
    return res.status(500).json({
      error: isSpanish ? 'No pudimos consultar los detalles del vuelo.' : 'We could not look up the flight details.',
    });
  }
});

export default appRouter;
