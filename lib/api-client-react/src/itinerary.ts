export type ItineraryStop = {
  destination: string;
  startDate: Date | string;
  endDate: Date | string;
};

export type ItineraryTrip = {
  tripType: string;
  destination: string;
  startDate: Date | string;
  endDate: Date | string;
  stops?: readonly ItineraryStop[] | null;
};

function toDateKey(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

export function getStopForDate(date: string, trip: ItineraryTrip) {
  if (trip.tripType !== "multi" || !trip.stops?.length) return undefined;

  return [...trip.stops].reverse().find((stop) => {
    const startDate = toDateKey(stop.startDate);
    const endDate = toDateKey(stop.endDate);
    return date >= startDate && date <= endDate;
  });
}

export function getDestinationForDate(date: string, trip: ItineraryTrip) {
  const startDate = toDateKey(trip.startDate);
  const endDate = toDateKey(trip.endDate);
  if (date < startDate || date > endDate) return undefined;

  if (trip.tripType === "single") return trip.destination;
  return getStopForDate(date, trip)?.destination;
}

export function getCityName(destination: string) {
  return destination.split(",")[0]?.trim() || destination.trim();
}