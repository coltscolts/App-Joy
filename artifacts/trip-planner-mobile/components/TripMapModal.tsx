import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDestinationForDate,
  getGetTripActivitiesQueryKey,
  useGetTripActivities,
  type Trip,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { mobileQueryClient } from '@/lib/queryClient';
import { formatTripDate, locale, t } from '@/lib/i18n';
import { locateActivities } from '@/lib/geocode';
import { buildRoute, formatKm, formatMinutes, orderActivities, type LatLng } from '@/lib/tripMap';
import { tripDays } from '@/components/IdeasModal';

type Props = { trip: Trip; visible: boolean; onClose: () => void };

const DAY_COLORS = ['#1E6FD9', '#E11D48', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DB2777'];

function directionsUrl(point: LatLng, mode: 'walk' | 'car') {
  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?daddr=${point.latitude},${point.longitude}&dirflg=${mode === 'walk' ? 'w' : 'd'}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}&travelmode=${mode === 'walk' ? 'walking' : 'driving'}`;
}

/** Mapa del itinerario (Pro): lugares numerados, ruta y distancias por día. */
export function TripMapModal({ trip, visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const days = useMemo(() => tripDays(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const [day, setDay] = useState<string>('all');
  const [locating, setLocating] = useState(false);
  const [showUser, setShowUser] = useState(false);

  // «Dónde estoy»: solo pide permiso cuando la persona lo pulsa.
  const locateMe = async () => {
    try {
      const Location = await import('expo-location');
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return;
      setShowUser(true);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({ latitude: position.coords.latitude, longitude: position.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
    } catch {
      // Sin ubicación disponible: el mapa sigue funcionando.
    }
  };

  const activitiesQuery = useGetTripActivities(trip.id, {
    query: { enabled: visible, queryKey: getGetTripActivitiesQueryKey(trip.id) },
  });
  const activities = activitiesQuery.data ?? [];

  // Al abrir: ubicar lo que falte y refrescar.
  useEffect(() => {
    if (!visible || !activitiesQuery.data) return;
    let cancelled = false;
    setLocating(true);
    locateActivities(activitiesQuery.data, (activity) => getDestinationForDate(activity.date, trip) ?? trip.destination)
      .then((count) => {
        if (!cancelled && count > 0) void mobileQueryClient.invalidateQueries({ queryKey: getGetTripActivitiesQueryKey(trip.id) });
      })
      .finally(() => { if (!cancelled) setLocating(false); });
    return () => { cancelled = true; };
  }, [visible, activitiesQuery.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = useMemo(() => orderActivities(activities, day), [activities, day]);
  const route = useMemo(() => buildRoute(ordered), [ordered]);
  const colorFor = (date: string) => DAY_COLORS[Math.max(0, days.indexOf(date)) % DAY_COLORS.length];

  // Encuadrar todos los puntos visibles.
  useEffect(() => {
    if (!visible || route.located.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(route.located.map(({ latitude, longitude }) => ({ latitude, longitude })), {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [visible, day, route.located.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Una línea por día para que «Todo el viaje» se lea por colores.
  const polylines = useMemo(() => {
    const byDay = new Map<string, LatLng[]>();
    for (const point of route.located) {
      const list = byDay.get(point.date) ?? [];
      list.push({ latitude: point.latitude, longitude: point.longitude });
      byDay.set(point.date, list);
    }
    return [...byDay.entries()].filter(([, coords]) => coords.length > 1);
  }, [route.located]);

  const focus = (point: LatLng) => {
    mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerSide} />
          <Text style={[styles.headerTitle, { color: colors.title }]}>{t('map_title')}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.headerSide, styles.headerRight]} accessibilityRole="button" testID="map-close">
            <Text style={[styles.done, { color: colors.primary }]}>{t('ideas_done')}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysBar} contentContainerStyle={styles.days}>
          {['all', ...days].map((value) => {
            const active = day === value;
            return (
              <Pressable
                key={value}
                onPress={() => setDay(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.dayChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }]}
              >
                {value !== 'all' ? <View style={[styles.dayDot, { backgroundColor: colorFor(value) }]} /> : null}
                <Text style={[styles.dayText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {value === 'all' ? t('map_all_days') : formatTripDate(value)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.mapBox}>
          <MapView ref={mapRef} style={StyleSheet.absoluteFill} showsPointsOfInterest showsCompass showsUserLocation={showUser}>
            {polylines.map(([date, coords]) => (
              <Polyline key={date} coordinates={coords} strokeColor={colorFor(date)} strokeWidth={4} lineDashPattern={[1, 0]} />
            ))}
            {route.located.map((point, index) => (
              <Marker
                key={point.id}
                coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                title={`${index + 1}. ${point.title}`}
                description={[point.time, point.location].filter(Boolean).join(' · ')}
              >
                <View style={[styles.pin, { backgroundColor: colorFor(point.date) }]}>
                  <Text style={styles.pinText}>{index + 1}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
          <Pressable
            onPress={() => void locateMe()}
            accessibilityRole="button"
            accessibilityLabel={t('map_locate_me')}
            testID="map-locate-me"
            style={[styles.locateMe, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="locate-outline" size={20} color={colors.primary} />
          </Pressable>
          {locating || activitiesQuery.isLoading ? (
            <View style={[styles.locating, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.locatingText, { color: colors.foreground }]}>{t('map_locating')}</Text>
            </View>
          ) : null}
        </View>

        <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}>
          {route.located.length > 0 ? (
            <Text style={[styles.total, { color: colors.foreground }]}>
              {t('map_total', { km: formatKm(route.totalKm, locale), n: route.located.length })}
            </Text>
          ) : !activitiesQuery.isLoading ? (
            <Text style={[styles.note, { color: colors.mutedForeground }]}>{t('map_empty')}</Text>
          ) : null}

          {route.located.map((point, index) => {
            const leg = route.legs[index - 1];
            return (
              <View key={point.id}>
                {leg && leg.from.date === leg.to.date ? (
                  <View style={styles.leg}>
                    <View style={[styles.legLine, { backgroundColor: colorFor(point.date) }]} />
                    <Ionicons name={leg.mode === 'walk' ? 'walk-outline' : 'car-outline'} size={14} color={colors.mutedForeground} />
                    <Text style={[styles.legText, { color: colors.mutedForeground }]}>
                      {formatKm(leg.km, locale)} · ~{formatMinutes(leg.minutes)} {leg.mode === 'walk' ? t('map_walk') : t('map_car')}
                    </Text>
                  </View>
                ) : null}
                <Pressable onPress={() => focus(point)} style={[styles.stop, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityRole="button">
                  <View style={[styles.stopNumber, { backgroundColor: colorFor(point.date) }]}>
                    <Text style={styles.pinText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stopText}>
                    <Text numberOfLines={1} style={[styles.stopTitle, { color: colors.foreground }]}>{point.title}</Text>
                    <Text numberOfLines={1} style={[styles.stopMeta, { color: colors.mutedForeground }]}>
                      {[day === 'all' ? formatTripDate(point.date) : null, point.time, point.location].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void Linking.openURL(directionsUrl(point, leg?.mode ?? 'walk'))}
                    hitSlop={8}
                    accessibilityRole="link"
                    accessibilityLabel={`${t('map_directions')}: ${point.title}`}
                    style={[styles.directions, { backgroundColor: colors.muted }]}
                  >
                    <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                    <Text style={[styles.directionsText, { color: colors.primary }]}>{t('map_directions')}</Text>
                  </Pressable>
                </Pressable>
              </View>
            );
          })}

          {route.missing > 0 && !locating ? (
            <Text style={[styles.note, { color: colors.mutedForeground }]}>{t('map_missing', { n: route.missing })}</Text>
          ) : null}
          {route.legs.length ? <Text style={[styles.note, { color: colors.mutedForeground }]}>{t('map_estimate_note')}</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 54, justifyContent: 'space-between', paddingHorizontal: 16 },
  headerSide: { minWidth: 64 },
  headerRight: { alignItems: 'flex-end', justifyContent: 'center', minHeight: 44 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  done: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  daysBar: { flexGrow: 0 },
  days: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  dayChip: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 36, paddingHorizontal: 14 },
  dayDot: { borderRadius: 4, height: 8, width: 8 },
  dayText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  mapBox: { flex: 1.2, minHeight: 260 },
  locateMe: { alignItems: 'center', borderRadius: 22, borderWidth: 1, bottom: 12, height: 44, justifyContent: 'center', position: 'absolute', right: 12, width: 44 },
  locating: { alignItems: 'center', alignSelf: 'center', borderRadius: 999, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 8, position: 'absolute', top: 12 },
  locatingText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  pin: { alignItems: 'center', borderColor: '#FFFFFF', borderRadius: 15, borderWidth: 2, height: 30, justifyContent: 'center', width: 30 },
  pinText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 13 },
  list: { flex: 1 },
  listContent: { alignSelf: 'center', maxWidth: 720, padding: 16, width: '100%' },
  total: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 10 },
  leg: { alignItems: 'center', flexDirection: 'row', gap: 6, marginLeft: 14, paddingVertical: 6 },
  legLine: { borderRadius: 2, height: 22, marginRight: 8, width: 3 },
  legText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  stop: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 10 },
  stopNumber: { alignItems: 'center', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  stopText: { flex: 1 },
  stopTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  stopMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  directions: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 4, minHeight: 32, paddingHorizontal: 10 },
  directionsText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 12, textAlign: 'center' },
});
