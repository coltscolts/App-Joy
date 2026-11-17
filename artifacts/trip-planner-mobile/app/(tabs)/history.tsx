import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { getGetTripsQueryKey, useGetTrips, type Trip } from '@workspace/api-client-react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTripSelection } from '@/contexts/TripContext';
import { TripSwipeRow } from '@/components/TripSwipeRow';
import { formatTripDate, t } from '@/lib/i18n';
import { deleteTripsWithReminders } from '@/lib/tripDeletion';
import { localTodayIso } from '@/lib/tripStatus';
import { readableWidth } from '@/constants/layout';

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectTrip, selectedTrip, clearTrip } = useTripSelection();
  const tripsQuery = useGetTrips({ query: { queryKey: getGetTripsQueryKey(), refetchOnMount: true } });
  const pastTrips = (tripsQuery.data ?? []).filter((trip) => trip.endDate < localTodayIso());

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Si desaparecen viajes (borrados en otro sitio), limpiar la selección.
  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => pastTrips.some((trip) => trip.id === id)));
    if (selecting && pastTrips.length === 0) setSelecting(false);
  }, [tripsQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTrip = (trip: Trip) => {
    void Haptics.selectionAsync();
    selectTrip(trip);
    router.navigate('/itinerary');
  };

  const toggle = (id: number) => {
    void Haptics.selectionAsync();
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
  };

  const exitSelection = () => {
    setSelecting(false);
    setSelectedIds([]);
  };

  const runDelete = async (trips: Trip[]) => {
    setDeleting(true);
    const { deletedIds, failed } = await deleteTripsWithReminders(trips);
    setDeleting(false);
    if (selectedTrip && deletedIds.includes(selectedTrip.id)) clearTrip();
    setSelectedIds((ids) => ids.filter((id) => !deletedIds.includes(id)));
    if (failed.length) {
      Alert.alert(t('trip_action_delete'), t('history_delete_partial_error', { n: failed.length }));
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (trips.length > 1) exitSelection();
    }
  };

  const confirmDelete = (trips: Trip[]) => {
    if (!trips.length) return;
    const title = trips.length === 1
      ? t('trip_delete_title', { name: trips[0].name })
      : t('history_delete_many_title', { n: trips.length });
    Alert.alert(title, t('trip_delete_body'), [
      { text: t('form_cancel'), style: 'cancel' },
      { text: t('trip_action_delete'), style: 'destructive', onPress: () => void runDelete(trips) },
    ]);
  };

  const allSelected = pastTrips.length > 0 && selectedIds.length === pastTrips.length;
  const selectedTrips = pastTrips.filter((trip) => selectedIds.includes(trip.id));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, readableWidth, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 20, paddingBottom: selecting ? 190 : 112 }]}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => tripsQuery.refetch()} tintColor={colors.primary} />}
      >
        <View style={styles.heading}>
          <View style={styles.headingTitle}>
            <Ionicons name="time-outline" size={25} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>{t('history_title')}</Text>
          </View>
          {pastTrips.length > 0 ? (
            <Pressable
              testID="history-select-toggle"
              onPress={() => (selecting ? exitSelection() : setSelecting(true))}
              hitSlop={10}
              accessibilityRole="button"
              style={styles.headerButton}
            >
              <Text style={[styles.headerButtonText, { color: colors.primary }]}>{selecting ? t('form_cancel') : t('history_select')}</Text>
            </Pressable>
          ) : null}
        </View>

        {selecting ? (
          <View style={styles.selectionRow}>
            <Text style={[styles.selectionCount, { color: colors.mutedForeground }]}>{t('history_selected_count', { n: selectedIds.length })}</Text>
            <Pressable
              testID="history-select-all"
              onPress={() => setSelectedIds(allSelected ? [] : pastTrips.map((trip) => trip.id))}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={[styles.headerButtonText, { color: colors.primary }]}>{allSelected ? t('history_deselect_all') : t('history_select_all')}</Text>
            </Pressable>
          </View>
        ) : null}

        {tripsQuery.isLoading ? <ActivityIndicator size="large" color={colors.primary} /> : pastTrips.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t('history_empty')}</Text>
          </View>
        ) : pastTrips.map((trip) => {
          const checked = selectedIds.includes(trip.id);
          return (
            <TripSwipeRow key={trip.id} enabled={!selecting} onDelete={() => confirmDelete([trip])} radius={16} spacing={12}>
              <Pressable
                testID={`history-trip-${trip.id}`}
                onPress={() => (selecting ? toggle(trip.id) : openTrip(trip))}
                accessibilityRole={selecting ? 'checkbox' : 'button'}
                accessibilityState={selecting ? { checked } : undefined}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: checked ? colors.primary : colors.border, opacity: pressed ? 0.86 : 1 },
                ]}
              >
                {selecting ? (
                  <Ionicons
                    name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={checked ? colors.primary : colors.mutedForeground}
                    style={styles.check}
                  />
                ) : null}
                <View style={styles.cardText}>
                  <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>{trip.name}</Text>
                  <Text style={[styles.destination, { color: colors.mutedForeground }]}>{trip.destination}</Text>
                  <Text style={[styles.dates, { color: colors.mutedForeground }]}>{formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}</Text>
                </View>
                {!selecting ? <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} /> : null}
              </Pressable>
            </TripSwipeRow>
          );
        })}
      </ScrollView>

      {selecting ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 84 }]}>
          <Pressable
            testID="history-delete-selected"
            disabled={!selectedTrips.length || deleting}
            onPress={() => confirmDelete(selectedTrips)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.destructive, opacity: !selectedTrips.length ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            {deleting ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.deleteText}>{t('history_delete_n', { n: selectedTrips.length })}</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  headingTitle: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.8 },
  headerButton: { justifyContent: 'center', minHeight: 44 },
  headerButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  selectionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: -10 },
  selectionCount: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 40 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, marginTop: 13, textAlign: 'center' },
  card: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', padding: 16 },
  check: { marginRight: 12 },
  cardText: { flex: 1 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  destination: { fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 4 },
  dates: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, bottom: 0, left: 0, paddingHorizontal: 18, paddingTop: 12, position: 'absolute', right: 0 },
  deleteButton: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center' },
  deleteText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
});
