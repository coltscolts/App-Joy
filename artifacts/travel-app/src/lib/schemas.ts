/**
 * Frontend-only schema definitions.
 * These mirror the server schemas but are defined locally to avoid
 * pulling in @workspace/db (which requires Node.js / pg / drizzle).
 */
import { z } from "zod";

export const tripStopSchema = z.object({
  destination: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
});

export const insertTripSchema = z.object({
  name: z.string(),
  tripType: z.enum(["single", "multi"]),
  destination: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  adults: z.number().optional(),
  children: z.number().optional(),
  coverImage: z.string().nullable().optional(),
  stops: z.array(tripStopSchema),
});

export const insertActivitySchema = z.object({
  tripId: z.number(),
  day: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").nullable().optional(),
  type: z.string(),
  category: z.string(),
  title: z.string(),
  time: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  placeId: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  distance: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  kidFriendly: z.boolean().nullable().optional(),
  budget: z.string().nullable().optional(),
  confirmationNumber: z.string().nullable().optional(),
  flightNumber: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  reminderEnabled: z.boolean().optional(),
});

// Types that mirror the DB types
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type TripStop = z.infer<typeof tripStopSchema>;

export type Trip = {
  id: number;
  name: string;
  tripType: "single" | "multi";
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  coverImage: string | null;
  stops: TripStop[];
  createdAt: Date;
};

export type Activity = {
  id: number;
  tripId: number;
  day: string;
  date: string;
  endDate: string | null;
  type: string;
  category: string;
  title: string;
  time: string | null;
  location: string | null;
  placeId: string | null;
  city: string | null;
  distance: string | null;
  description: string | null;
  kidFriendly: boolean | null;
  budget: string | null;
  confirmationNumber: string | null;
  flightNumber: string | null;
  details: string | null;
  status: string | null;
  reminderEnabled: boolean | null;
  createdAt: Date;
};
