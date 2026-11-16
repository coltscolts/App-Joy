import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getGetTripActivitiesQueryKey, useGetTripActivities, type Trip } from '@workspace/api-client-react';
import { formatTripDate, t } from '@/lib/i18n';
import { getCountdown, getTripDeparture, getTripProgress } from '@/lib/tripStatus';
import { syncTripWidget } from '@/lib/widgetSync';

type Props = { trip: Trip; todayIso: string; onPress: () => void };

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Tarjeta destacada del inicio: cuenta atrás hasta la salida del próximo viaje. */
export function NextTripCountdown({ trip, todayIso, onPress }: Props) {
  const now = useNow(20_000);
  const activitiesQuery = useGetTripActivities(trip.id, {
    query: { queryKey: getGetTripActivitiesQueryKey(trip.id), staleTime: 60_000 },
  });
  const departure = getTripDeparture(trip, activitiesQuery.data ?? []);
  const countdown = getCountdown(departure.at, now);
  const ongoing = trip.startDate < todayIso || (countdown.done && trip.endDate >= todayIso);
  const progress = getTripProgress(trip.startDate, trip.endDate, todayIso);

  // Mantiene el widget de la pantalla de inicio al día con el mismo dato.
  useEffect(() => {
    syncTripWidget({
      name: trip.name,
      destination: trip.destination,
      departureAt: departure.at.toISOString(),
      startDate: trip.startDate,
      endDate: trip.endDate,
      detail: departure.activity?.flightNumber ?? departure.activity?.title ?? null,
    });
  }, [trip.name, trip.destination, trip.startDate, trip.endDate, departure.at.getTime(), departure.activity?.title, departure.activity?.flightNumber]);

  const caption = departure.activity
    ? t('countdown_departs', { date: formatTripDate(trip.startDate), time: departure.activity.time ?? '' })
    : t('countdown_starts', { date: formatTripDate(trip.startDate) });

  return (
    <Pressable
      testID="next-trip-countdown"
      accessibilityRole="button"
      accessibilityLabel={ongoing
        ? `${trip.name}. ${t('countdown_day_of', progress)}`
        : t('countdown_a11y', { name: trip.name, days: countdown.days, hours: countdown.hours, minutes: countdown.minutes })}
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient colors={['#1E6FD9', '#0B3D91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>{ongoing ? t('countdown_ongoing_eyebrow') : t('countdown_eyebrow')}</Text>
          <Ionicons name={departure.activity?.flightNumber ? 'airplane' : 'compass'} size={20} color="#BFDBFE" />
        </View>
        <Text numberOfLines={1} style={styles.name}>{trip.name}</Text>
        <View style={styles.destinationRow}>
          <Ionicons name="location-outline" size={14} color="#BFDBFE" />
          <Text numberOfLines={1} style={styles.destination}>{trip.destination}</Text>
        </View>

        {ongoing ? (
          <View style={styles.progressBlock}>
            <Text style={styles.progressText}>{t('countdown_day_of', progress)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round((progress.current / progress.total) * 100)}%` }]} />
            </View>
          </View>
        ) : countdown.done ? (
          <Text style={styles.nowText}>{t('countdown_now')}</Text>
        ) : (
          <View style={styles.units}>
            <Unit value={countdown.days} label={countdown.days === 1 ? t('countdown_day') : t('countdown_days')} />
            <Unit value={countdown.hours} label={t('countdown_hours')} />
            <Unit value={countdown.minutes} label={t('countdown_minutes')} />
          </View>
        )}

        {!ongoing ? <Text style={styles.caption}>{caption}</Text> : null}
      </LinearGradient>
    </Pressable>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.unit}>
      <Text style={styles.unitValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  card: { borderRadius: 22, overflow: 'hidden', padding: 20 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#BFDBFE', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.4 },
  name: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.4, marginTop: 8 },
  destinationRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 4 },
  destination: { color: '#DBEAFE', flexShrink: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  units: { flexDirection: 'row', gap: 10, marginTop: 18 },
  unit: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, flex: 1, paddingVertical: 12 },
  unitValue: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 30, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  unitLabel: { color: '#BFDBFE', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 2 },
  caption: { color: '#DBEAFE', fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 14 },
  nowText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 18 },
  progressBlock: { marginTop: 18 },
  progressText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 10 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, height: 8, overflow: 'hidden' },
  progressFill: { backgroundColor: '#FFFFFF', borderRadius: 999, height: 8 },
});
