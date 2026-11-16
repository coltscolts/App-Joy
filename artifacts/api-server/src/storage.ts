import {
  activities,
  db,
  trips,
  type Activity,
  type InsertActivity,
  type InsertTrip,
  type Trip,
} from "@workspace/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export interface IStorage {
  getAllTrips(ownerId: string): Promise<Trip[]>;
  getTrip(id: number, ownerId: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip, ownerId: string): Promise<Trip>;
  updateTrip(id: number, ownerId: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number, ownerId: string): Promise<boolean>;
  deleteAllTripsForOwner(ownerId: string): Promise<number>;

  getActivitiesByTrip(tripId: number, ownerId: string): Promise<Activity[]>;
  getActivity(id: number, ownerId: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  createActivities(activity: InsertActivity[]): Promise<Activity[]>;
  updateActivity(id: number, ownerId: string, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: number, ownerId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getAllTrips(ownerId: string): Promise<Trip[]> {
    return db.select().from(trips).where(eq(trips.ownerId, ownerId)).orderBy(desc(trips.createdAt));
  }

  async getTrip(id: number, ownerId: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(and(eq(trips.id, id), eq(trips.ownerId, ownerId))).limit(1);
    return trip;
  }

  async createTrip(insertTrip: InsertTrip, ownerId: string): Promise<Trip> {
    const [trip] = await db.insert(trips).values({ ...insertTrip, ownerId }).returning();
    return trip;
  }

  async updateTrip(id: number, ownerId: string, updateData: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [trip] = await db.update(trips).set(updateData).where(and(eq(trips.id, id), eq(trips.ownerId, ownerId))).returning();
    return trip;
  }

  async deleteTrip(id: number, ownerId: string): Promise<boolean> {
    const deleted = await db.delete(trips).where(and(eq(trips.id, id), eq(trips.ownerId, ownerId))).returning({ id: trips.id });
    return deleted.length > 0;
  }

  /** Borra todos los viajes del usuario; sus actividades se borran en cascada. */
  async deleteAllTripsForOwner(ownerId: string): Promise<number> {
    const deleted = await db.delete(trips).where(eq(trips.ownerId, ownerId)).returning({ id: trips.id });
    return deleted.length;
  }

  async getActivitiesByTrip(tripId: number, ownerId: string): Promise<Activity[]> {
    const results = await db
      .select()
      .from(activities)
      .innerJoin(trips, eq(activities.tripId, trips.id))
      .where(and(eq(activities.tripId, tripId), eq(trips.ownerId, ownerId)))
      .orderBy(asc(activities.date), asc(activities.time));
    return results.map((result) => result.activities);
  }

  async getActivity(id: number, ownerId: string): Promise<Activity | undefined> {
    const [result] = await db.select({ activity: activities }).from(activities)
      .innerJoin(trips, eq(activities.tripId, trips.id))
      .where(and(eq(activities.id, id), eq(trips.ownerId, ownerId))).limit(1);
    return result?.activity;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  async createActivities(insertActivities: InsertActivity[]): Promise<Activity[]> {
    return db.transaction(async (transaction) => (
      transaction.insert(activities).values(insertActivities).returning()
    ));
  }

  async updateActivity(id: number, ownerId: string, updateData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [activity] = await db.update(activities).set(updateData).where(and(
      eq(activities.id, id),
      sql`exists (select 1 from ${trips} where ${trips.id} = ${activities.tripId} and ${trips.ownerId} = ${ownerId})`,
    )).returning();
    return activity;
  }

  async deleteActivity(id: number, ownerId: string): Promise<boolean> {
    const deleted = await db.delete(activities).where(and(
      eq(activities.id, id),
      sql`exists (select 1 from ${trips} where ${trips.id} = ${activities.tripId} and ${trips.ownerId} = ${ownerId})`,
    )).returning({ id: activities.id });
    return deleted.length > 0;
  }
}

export const storage = new DatabaseStorage();