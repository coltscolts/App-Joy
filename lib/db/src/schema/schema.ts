import { pgTable, text, integer, boolean, serial, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const isoDateSchema = z
  .string()
  .regex(/^[1-9]\d{3}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Date must be a real calendar day");

export const tripStopSchema = z.object({
  destination: z.string().trim().min(1, "Destination is required"),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
}).refine((stop) => stop.endDate >= stop.startDate, {
  message: "Stop end date must be on or after its start date",
  path: ["endDate"],
});

export type TripStop = z.infer<typeof tripStopSchema>;

// Trips table
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  tripType: text("trip_type").notNull().default("single"),
  destination: text("destination").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  adults: integer("adults").notNull().default(2),
  children: integer("children").notNull().default(0),
  coverImage: text("cover_image"),
  stops: jsonb("stops").$type<TripStop[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  ownerId: true,
  createdAt: true,
}).extend({
  tripType: z.enum(["single", "multi"]),
  destination: z.string().trim().min(1, "Destination is required"),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  stops: z.array(tripStopSchema).default([]),
});

export const completeTripSchema = insertTripSchema.superRefine((trip, context) => {
  if (trip.endDate < trip.startDate) {
    context.addIssue({
      code: "custom",
      message: "Trip end date must be on or after its start date",
      path: ["endDate"],
    });
  }

  if (trip.tripType === "single") {
    if (trip.stops.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Single-destination trips cannot include stops",
        path: ["stops"],
      });
    }
    return;
  }

  if (trip.stops.length < 2) {
    context.addIssue({
      code: "custom",
      message: "Multi-destination trips require at least two stops",
      path: ["stops"],
    });
    return;
  }

  trip.stops.forEach((stop, index) => {
    if (index > 0 && stop.startDate < trip.stops[index - 1].endDate) {
      context.addIssue({
        code: "custom",
        message: "A stop can only begin on or after the previous stop's checkout date",
        path: ["stops", index, "startDate"],
      });
    }
  });

  const expectedDestination = trip.stops.map((stop) => stop.destination).join(", ");
  if (trip.destination !== expectedDestination) {
    context.addIssue({
      code: "custom",
      message: "Trip destination must match its ordered stops",
      path: ["destination"],
    });
  }
  if (trip.startDate !== trip.stops[0].startDate || trip.endDate !== trip.stops[trip.stops.length - 1].endDate) {
    context.addIssue({
      code: "custom",
      message: "Trip dates must cover the first through last stop",
      path: ["stops"],
    });
  }
});

export const updateTripSchema = insertTripSchema.partial().extend({
  stops: z.array(tripStopSchema).optional(),
});
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

// Activities table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  day: text("day").notNull(),
  date: text("date").notNull(),
  endDate: text("end_date"),
  type: text("type").notNull(), // "activity" | "booking"
  category: text("category").notNull(), // ActivityCategory
  title: text("title").notNull(),
  time: text("time"),
  location: text("location"),
  placeId: text("place_id"),
  city: text("city"),
  distance: text("distance"),
  description: text("description"),
  kidFriendly: boolean("kid_friendly"),
  budget: text("budget"), // "low" | "medium" | "high"
  confirmationNumber: text("confirmation_number"),
  flightNumber: text("flight_number"), // For flight bookings
  details: text("details"),
  status: text("status"), // "confirmed" | "pending" | etc
  reminderEnabled: boolean("reminder_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
}).extend({
  date: isoDateSchema,
  endDate: isoDateSchema.nullish(),
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Uso mensual de funciones de IA por usuario (límites del plan gratuito).
export const aiUsage = pgTable("ai_usage", {
  userId: text("user_id").notNull(),
  month: text("month").notNull(), // YYYY-MM (UTC)
  scans: integer("scans").notNull().default(0),
  ideas: integer("ideas").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.month] })]);

export type AiUsage = typeof aiUsage.$inferSelect;
