import {
  completeTripSchema,
  type InsertTrip,
  type Trip,
  updateTripSchema,
} from "@workspace/db";

type TripPayload = Record<string, unknown>;

function normalizeDestination(destination: unknown) {
  return typeof destination === "string" ? destination.trim() : destination;
}

function normalizeStop(stop: unknown) {
  if (!stop || typeof stop !== "object") return stop;

  const details = stop as TripPayload;
  return {
    ...details,
    destination: normalizeDestination(details.destination),
  };
}

function getStopDetail(stop: unknown) {
  return stop && typeof stop === "object" ? stop as TripPayload : undefined;
}

/**
 * Creates one canonical trip shape from user input. Multi-destination trips
 * always derive their summary destination and overall dates from the stop
 * sequence, so a partial update cannot leave stale route metadata behind.
 */
export function normalizeTripDetails(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;

  const trip = payload as TripPayload;
  const stops = Array.isArray(trip.stops) ? trip.stops.map(normalizeStop) : trip.stops;
  const normalizedTrip: TripPayload = {
    ...trip,
    destination: normalizeDestination(trip.destination),
    stops,
  };

  if (trip.tripType !== "multi" || !Array.isArray(stops)) {
    return normalizedTrip;
  }

  const firstStop = getStopDetail(stops[0]);
  const lastStop = getStopDetail(stops[stops.length - 1]);

  return {
    ...normalizedTrip,
    destination: stops
      .map(getStopDetail)
      .map((stop) => stop?.destination)
      .filter((destination): destination is string => typeof destination === "string")
      .join(", "),
    startDate: firstStop?.startDate ?? trip.startDate,
    endDate: lastStop?.endDate ?? trip.endDate,
  };
}

export function validateTripForCreate(payload: unknown): InsertTrip {
  return completeTripSchema.parse(normalizeTripDetails(payload));
}

export function validateTripForUpdate(existingTrip: Trip, update: unknown): InsertTrip {
  const validatedUpdate = updateTripSchema.parse(update);
  return completeTripSchema.parse(normalizeTripDetails({ ...existingTrip, ...validatedUpdate }));
}

type TripDateRange = {
  tripType: string;
  startDate: string;
  endDate: string;
  stops: ReadonlyArray<{
    startDate: string;
    endDate: string;
  }>;
};

export function isActivityDateInTrip(date: string, trip: TripDateRange) {
  if (date < trip.startDate || date > trip.endDate) return false;

  return trip.tripType !== "multi" ||
    trip.stops.some((stop) => date >= stop.startDate && date <= stop.endDate);
}