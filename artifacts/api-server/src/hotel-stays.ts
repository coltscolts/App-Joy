import { z } from "zod/v4";
import { insertActivitySchema, type InsertActivity, type Trip } from "@workspace/db";

export const hotelStayBatchSchema = z.object({
  stays: z.array(insertActivitySchema).min(1).max(2),
});

type TripRange = Pick<Trip, "startDate" | "endDate">;
type HotelStayRange = Pick<InsertActivity, "date" | "endDate">;

export class HotelStayValidationError extends Error {}

export function validateHotelStayRange(stay: HotelStayRange, trip: TripRange) {
  if (!stay.endDate) {
    throw new HotelStayValidationError("Hotel checkout date is required");
  }
  if (stay.endDate < stay.date) {
    throw new HotelStayValidationError("Hotel checkout must be on or after check-in");
  }
  if (stay.date < trip.startDate || stay.endDate > trip.endDate) {
    throw new HotelStayValidationError("Hotel stay must be within the trip dates");
  }
}

export function validateHotelStayBatch(stays: InsertActivity[], trip: TripRange) {
  if (stays.some((stay) => stay.category !== "hotel")) {
    throw new HotelStayValidationError("Every stay must use the hotel category");
  }
  if (new Set(stays.map((stay) => stay.tripId)).size !== 1) {
    throw new HotelStayValidationError("All hotel stays must belong to the same trip");
  }

  stays.forEach((stay) => validateHotelStayRange(stay, trip));

  const first = stays[0];
  const last = stays[stays.length - 1];
  if (first.date !== trip.startDate || last.endDate !== trip.endDate) {
    throw new HotelStayValidationError("New hotel stays must cover the complete trip");
  }
  if (stays.length === 2 && first.endDate !== stays[1].date) {
    throw new HotelStayValidationError("Two hotel stays must meet on the same checkout and check-in date");
  }
}