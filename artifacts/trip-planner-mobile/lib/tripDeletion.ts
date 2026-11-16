import { deleteTrip, getGetTripsQueryKey, getTripActivities, type Trip } from '@workspace/api-client-react';
import { mobileQueryClient } from '@/lib/queryClient';
import { cancelActivityReminder } from '@/lib/reminders';

/**
 * Borra uno o varios viajes y cancela los recordatorios del teléfono de sus
 * actividades. Devuelve los que no se pudieron borrar.
 */
export async function deleteTripsWithReminders(trips: Trip[]): Promise<{ deletedIds: number[]; failed: Trip[] }> {
  const deletedIds: number[] = [];
  const failed: Trip[] = [];
  for (const trip of trips) {
    try {
      const activities = await getTripActivities(trip.id).catch(() => []);
      await deleteTrip(trip.id);
      deletedIds.push(trip.id);
      await Promise.all(activities.map((activity) => cancelActivityReminder(activity.id).catch(() => {})));
    } catch {
      failed.push(trip);
    }
  }
  await mobileQueryClient.invalidateQueries({ queryKey: getGetTripsQueryKey() });
  return { deletedIds, failed };
}
