import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { getGetTripsQueryKey, useGetTrips, type Trip } from '@workspace/api-client-react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTripSelection } from '@/contexts/TripContext';
import { formatTripDate, t } from '@/lib/i18n';

function localIsoDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectTrip } = useTripSelection();
  const tripsQuery = useGetTrips({ query: { queryKey: getGetTripsQueryKey(), refetchOnMount: true } });
  const pastTrips = (tripsQuery.data ?? []).filter((trip) => trip.endDate < localIsoDate());
  const openTrip = (trip: Trip) => {
    void Haptics.selectionAsync();
    selectTrip(trip);
    router.navigate('/itinerary');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 20 }]}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => tripsQuery.refetch()} tintColor={colors.primary} />}
      >
        <View style={styles.heading}>
          <Ionicons name="time-outline" size={25} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>{t('history_title')}</Text>
        </View>
        {tripsQuery.isLoading ? <ActivityIndicator size="large" color={colors.primary} /> : pastTrips.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t('history_empty')}</Text>
          </View>
        ) : pastTrips.map((trip) => (
          <Pressable key={trip.id} onPress={() => openTrip(trip)} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}>
            <View style={styles.cardText}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>{trip.name}</Text>
              <Text style={[styles.destination, { color: colors.mutedForeground }]}>{trip.destination}</Text>
              <Text style={[styles.dates, { color: colors.mutedForeground }]}>{formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 112, paddingHorizontal: 18 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 24 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.8 },
  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 40 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, marginTop: 13, textAlign: 'center' },
  card: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 16 },
  cardText: { flex: 1 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  destination: { fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 4 },
  dates: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
});