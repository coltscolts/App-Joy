import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCityName, getDestinationForDate, getGetTripActivitiesQueryKey, getGetTransitRecommendationsQueryKey, getStopForDate, useDeleteActivity, useGetTripActivities, useGetTransitRecommendations, type Activity, type TransitOption } from '@workspace/api-client-react';
import { mobileQueryClient } from '@/lib/queryClient';
import { useColors } from '@/hooks/useColors';
import { useTripSelection } from '@/contexts/TripContext';
import { ActivityFormModal } from '@/components/ActivityFormModal';
import { IdeasModal } from '@/components/IdeasModal';
import { TripMapModal } from '@/components/TripMapModal';
import { PlaceContactSheet } from '@/components/PlaceContactSheet';
import { updateActivity } from '@workspace/api-client-react';
import { usePlan } from '@/contexts/PlanContext';
import { cancelActivityReminder, isActivityReminderScheduled } from '@/lib/reminders';
import { t, formatCurrency, formatDate, formatStoredTime, formatWeekdayLong, language } from '@/lib/i18n';
import { GetTransitRecommendationsLanguage } from '@workspace/api-client-react';
import { readableWidth } from '@/constants/layout';

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  cultural: 'business-outline',
  restaurant: 'restaurant-outline',
  bar: 'wine-outline',
  flight: 'airplane-outline',
  hotel: 'bed-outline',
};

function groupActivities(activities: Activity[]) {
  return activities.reduce<Record<string, Activity[]>>((groups, activity) => {
    groups[activity.date] = [...(groups[activity.date] ?? []), activity];
    return groups;
  }, {});
}

function normalizeLocation(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

const transportMeta = {
  flight: { icon: 'airplane-outline', labelKey: 'transport_flight' as const },
  train: { icon: 'train-outline', labelKey: 'transport_train' as const },
  bus: { icon: 'bus-outline', labelKey: 'transport_bus' as const },
} as const satisfies Record<string, { icon: keyof typeof Ionicons.glyphMap; labelKey: 'transport_flight' | 'transport_train' | 'transport_bus' }>;

function convenienceLabel(value: TransitOption['convenience']) {
  return value === 'high'
    ? t('itinerary_convenience_high')
    : value === 'medium'
      ? t('itinerary_convenience_medium')
      : t('itinerary_convenience_low');
}

export default function ItineraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedTrip, clearTrip } = useTripSelection();
  const [adding, setAdding] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [contactActivity, setContactActivity] = useState<Activity | null>(null);
  const markBooked = async (activity: Activity) => {
    setContactActivity(null);
    try {
      await updateActivity(activity.id, { status: 'confirmed' });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      void mobileQueryClient.invalidateQueries({ queryKey: getGetTripActivitiesQueryKey(selectedTrip!.id) });
    }
  };
  const plan = usePlan();
  const openMap = () => {
    void Haptics.selectionAsync();
    if (plan?.isLimited) plan.openPaywall('map');
    else setMapOpen(true);
  };
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [scheduledReminderIds, setScheduledReminderIds] = useState<Set<number>>(new Set());
  const tripId = selectedTrip?.id ?? -1;
  const activitiesQuery = useGetTripActivities(tripId, { query: { queryKey: getGetTripActivitiesQueryKey(tripId), enabled: Boolean(selectedTrip) } });
  const transitLang = language === 'es' ? GetTransitRecommendationsLanguage.es : GetTransitRecommendationsLanguage.en;
  const transitQuery = useGetTransitRecommendations(
    tripId,
    { language: transitLang },
    {
      query: {
        queryKey: getGetTransitRecommendationsQueryKey(tripId, { language: transitLang }),
        enabled: Boolean(selectedTrip?.tripType === 'multi' && selectedTrip.stops.length > 1),
        staleTime: 5 * 60_000,
      },
    },
  );
  const grouped = useMemo(() => groupActivities(activitiesQuery.data ?? []), [activitiesQuery.data]);
  const dayKeys = Object.keys(grouped).sort();

  useEffect(() => {
    let mounted = true;
    const activities = activitiesQuery.data ?? [];
    setScheduledReminderIds(new Set());
    void Promise.all(
      activities.map(async (activity) => (
        activity.reminderEnabled && await isActivityReminderScheduled(activity.id) ? activity.id : null
      )),
    ).then((ids) => {
      if (mounted) setScheduledReminderIds(new Set(ids.filter((id): id is number => id !== null)));
    }).catch(() => {
      if (mounted) setScheduledReminderIds(new Set());
    });
    return () => {
      mounted = false;
    };
  }, [activitiesQuery.data]);

  const deleteActivity = useDeleteActivity({
    mutation: {
      onSuccess: (_deleted, variables) => {
        mobileQueryClient.invalidateQueries({ queryKey: getGetTripActivitiesQueryKey(tripId) });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void cancelActivityReminder(variables.id);
      },
    },
  });

  const confirmDelete = (activity: Activity) => {
    if (Platform.OS === 'web') {
      deleteActivity.mutate({ id: activity.id });
      return;
    }

    Alert.alert(
      t('itinerary_delete_alert_title'),
      t('itinerary_delete_alert_body', { title: activity.title }),
      [
        { text: t('itinerary_delete_cancel'), style: 'cancel' },
        { text: t('itinerary_delete_confirm'), style: 'destructive', onPress: () => deleteActivity.mutate({ id: activity.id }) },
      ],
    );
  };

  if (!selectedTrip) {
    return (
      <View style={[styles.emptyScreen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <Ionicons name="map-outline" size={44} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('itinerary_no_trip_title')}</Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{t('itinerary_no_trip_body')}</Text>
        <Pressable onPress={() => router.navigate('/')} style={[styles.goTrips, { backgroundColor: colors.primary }]}>
          <Text style={[styles.goTripsText, { color: colors.primaryForeground }]}>{t('itinerary_go_trips')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, readableWidth, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 13 }]}
        refreshControl={<RefreshControl refreshing={activitiesQuery.isRefetching} onRefresh={() => activitiesQuery.refetch()} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={clearTrip} hitSlop={8} accessibilityRole="button" style={styles.back} accessibilityLabel={t('itinerary_change_trip_a11y')}><Ionicons name="chevron-back" size={24} color={colors.primary} /></Pressable>
          <View style={styles.headerContent}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]} numberOfLines={1}>{selectedTrip.destination.toUpperCase()}</Text>
            <Text style={[styles.tripTitle, { color: colors.title }]} numberOfLines={1}>{selectedTrip.name}</Text>
          </View>
          <Pressable testID="button-trip-map" onPress={openMap} hitSlop={8} accessibilityRole="button" style={styles.addButton} accessibilityLabel={t('map_button_a11y')}><Ionicons name="map-outline" size={23} color={colors.primary} /></Pressable>
          <Pressable testID="button-add-activity" onPress={() => setAdding(true)} hitSlop={8} accessibilityRole="button" style={styles.addButton} accessibilityLabel={t('itinerary_add_activity_a11y')}><Ionicons name="add" size={27} color={colors.primary} /></Pressable>
        </View>
        <View style={[styles.tripMeta, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={19} color={colors.primary} />
          <Text style={[styles.tripMetaText, { color: colors.mutedForeground }]}>{formatDate(selectedTrip.startDate)} — {formatDate(selectedTrip.endDate)}</Text>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <Ionicons name="people-outline" size={18} color={colors.primary} />
          <Text style={[styles.tripMetaText, { color: colors.mutedForeground }]}>{selectedTrip.adults + selectedTrip.children}</Text>
        </View>

        <Pressable
          testID="button-ideas"
          accessibilityRole="button"
          accessibilityHint={t('ideas_button_hint')}
          onPress={() => { void Haptics.selectionAsync(); setIdeasOpen(true); }}
          style={({ pressed }) => [styles.ideasCard, { backgroundColor: colors.card, borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={[styles.ideasIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={20} color={colors.primaryForeground} />
          </View>
          <View style={styles.ideasText}>
            <Text style={[styles.ideasTitle, { color: colors.foreground }]}>{t('ideas_button')}</Text>
            <Text style={[styles.ideasHint, { color: colors.mutedForeground }]}>{t('ideas_button_hint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>

        {selectedTrip.tripType === 'multi' && selectedTrip.stops && selectedTrip.stops.length > 0 ? (
          <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeScroll}>
              {selectedTrip.stops.map((stop, i) => (
                <View key={i} style={styles.routeStopHorizontal}>
                  <View style={styles.routeStopContent}>
                    <View style={styles.routeStopHeader}>
                      <Ionicons name="location" size={14} color={colors.primary} />
                      <Text style={[styles.routeStopText, { color: colors.title }]} numberOfLines={1}>{stop.destination.split(',')[0]}</Text>
                    </View>
                    <Text style={[styles.routeStopDates, { color: colors.mutedForeground }]}>
                      {formatDate(stop.startDate, { day: 'numeric', month: 'short' })} – {formatDate(stop.endDate, { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  {i < selectedTrip.stops.length - 1 && (
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={styles.routeArrow} />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {selectedTrip.tripType === 'multi' && selectedTrip.stops.length > 1 ? (
          <View testID="transit-recommendations" style={styles.transitSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{t('itinerary_between_cities_eyebrow')}</Text>
                <Text style={[styles.sectionTitle, { color: colors.title }]}>{t('itinerary_between_cities_title')}</Text>
              </View>
              {transitQuery.isFetching ? <Text style={[styles.refreshing, { color: colors.mutedForeground }]}>{t('itinerary_refreshing')}</Text> : null}
            </View>
            {transitQuery.isLoading ? <View style={[styles.transitLoading, { backgroundColor: colors.card, borderColor: colors.border }]}><ActivityIndicator color={colors.primary} /></View> : null}
            {transitQuery.isError ? (
              <View style={[styles.transitLoading, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.transitError, { color: colors.mutedForeground }]}>{t('itinerary_transit_error')}</Text>
                <Pressable onPress={() => transitQuery.refetch()}><Text style={[styles.retry, { color: colors.primary }]}>{t('itinerary_transit_retry')}</Text></Pressable>
              </View>
            ) : null}
            {(transitQuery.data ?? []).map((transition) => {
              const recommendation = transportMeta[transition.recommendation];
              const recommended = transition.options.find((option) => option.mode === transition.recommendation);
              return (
                <View key={transition.id} style={[styles.transitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.transitRoute, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
                    <View style={styles.transitRouteTitle}><Ionicons name="location-outline" size={15} color={colors.primary} /><Text style={[styles.transitRouteText, { color: colors.title }]}>{transition.origin} → {transition.destination}</Text></View>
                    <Text style={[styles.transitDate, { color: colors.mutedForeground }]}>{t('itinerary_transfer_on')} {formatDate(transition.travelDate, { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <View style={styles.transitContent}>
                    <View style={[styles.recommendation, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
                      <Ionicons name={recommendation.icon} size={20} color={colors.accentForeground} />
                      <View style={styles.recommendationCopy}>
                        <View style={styles.recommendationTitleRow}>
                          <Text style={[styles.recommendationTitle, { color: colors.accentForeground }]}>{t('itinerary_recommendation_prefix')} {t(recommendation.labelKey)}</Text>
                          <Text style={[styles.dataBadge, { color: colors.primary }]}>{recommended?.isEstimated ? t('itinerary_estimated_badge') : t('itinerary_schedule_badge')}</Text>
                        </View>
                        <Text style={[styles.recommendationReason, { color: colors.accentForeground }]}>{transition.recommendationReason}</Text>
                      </View>
                    </View>
                    {transition.options.map((option) => {
                      const meta = transportMeta[option.mode];
                      const selected = option.mode === transition.recommendation;
                      return (
                        <View key={option.mode} style={[styles.transportOption, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.muted : colors.card }]}>
                          <View style={styles.transportOptionHeader}><View style={styles.transportLabel}><Ionicons name={meta.icon} size={17} color={colors.primary} /><Text style={[styles.transportOptionTitle, { color: colors.title }]}>{option.label}</Text></View>{selected ? <Text style={[styles.selectedLabel, { color: colors.primary }]}>{t('itinerary_selected_badge')}</Text> : null}</View>
                          <Text style={[styles.transportMetrics, { color: colors.mutedForeground }]}>{option.durationLabel}{option.departureTime ? ` · ${option.departureTime}–${option.arrivalTime}` : ''} · {t('itinerary_transport_cost_prefix', { cost: formatCurrency(option.estimatedCost, option.costCurrency) })}</Text>
                          <Text style={[styles.transportSummary, { color: colors.mutedForeground }]}>{option.summary}</Text>
                          <Text style={[styles.transportSource, { color: colors.mutedForeground }]}>{option.source}{option.isEstimated ? ` ${t('itinerary_estimated_suffix')}` : ''} · {convenienceLabel(option.convenience)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {activitiesQuery.isLoading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View> : null}
        {activitiesQuery.isError ? (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="cloud-offline-outline" size={31} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.title }]}>{t('itinerary_load_error_title')}</Text>
            <Pressable onPress={() => activitiesQuery.refetch()}><Text style={[styles.retry, { color: colors.primary }]}>{t('itinerary_transit_retry')}</Text></Pressable>
          </View>
        ) : null}
        {!activitiesQuery.isLoading && !activitiesQuery.isError && dayKeys.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="sparkles-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.title }]}>{t('itinerary_empty_title')}</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{t('itinerary_empty_body')}</Text>
            <Pressable
              testID="button-add-activity-empty"
              accessibilityRole="button"
              onPress={() => setAdding(true)}
              style={({ pressed }) => [styles.emptyCta, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
              <Text style={[styles.emptyCtaText, { color: colors.primaryForeground }]}>{t('itinerary_empty_cta')}</Text>
            </Pressable>
            <View style={styles.emptyHintRow}>
              <Ionicons name="scan-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>{t('itinerary_empty_hint')}</Text>
            </View>
          </View>
        ) : null}
        {dayKeys.map((date) => {
          const stopForDate = getStopForDate(date, selectedTrip);
          const destinationForDate = getDestinationForDate(date, selectedTrip);
          const cityForDate = destinationForDate ? getCityName(destinationForDate) : null;
          return (
            <View key={date} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <View style={styles.dayHeaderLeft}>
                  <Text style={[styles.dayLabel, { color: colors.title }]}>{formatWeekdayLong(date)}</Text>
                  <Text style={[styles.dayDate, { color: colors.mutedForeground }]}>{formatDate(date, { day: 'numeric', month: 'short' })}</Text>
                </View>
                {stopForDate ? (
                  <View style={[styles.stopBadge, { backgroundColor: colors.accent }]}>
                    <Ionicons name="location" size={12} color={colors.accentForeground} />
                    <Text style={[styles.stopBadgeText, { color: colors.accentForeground }]}>{cityForDate}</Text>
                  </View>
                ) : null}
              </View>
              {grouped[date].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99')).map((activity) => {
                const icon = categoryIcons[activity.category] ?? 'compass-outline';
                const activityCity = activity.city?.trim() || cityForDate;
                const place = activity.location?.trim();
                const activityPlace = place && normalizeLocation(place) !== normalizeLocation(activityCity ?? "")
                  ? place
                  : undefined;
                return (
                  <View key={activity.id} style={[styles.activity, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.activityIcon, { backgroundColor: colors.accent }]}><Ionicons name={icon} size={20} color={colors.accentForeground} /></View>
                    <View style={styles.activityCopy}>
                      <Text style={[styles.activityTitle, { color: colors.title }]}>{activity.title}</Text>
                      {activityCity ? (
                        <View style={styles.activityDestination}>
                          <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                          <Text style={[styles.activityDestinationText, { color: colors.mutedForeground }]}>{activityCity}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.activityDetail, { color: colors.mutedForeground }]}>{[activity.time ? formatStoredTime(activity.time) : null, activityPlace].filter(Boolean).join(' · ') || t('itinerary_no_time_place')}</Text>
                      {activity.status === 'pending' ? (
                        <Pressable
                          testID={`booking-pending-${activity.id}`}
                          onPress={() => setContactActivity(activity)}
                          accessibilityRole="button"
                          accessibilityHint={t('booking_pending_hint')}
                          style={[styles.pendingBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
                        >
                          <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
                          <Text style={styles.pendingText}>{t('booking_pending')}</Text>
                          <Ionicons name="chevron-forward" size={12} color="#B45309" />
                        </Pressable>
                      ) : null}
                      {activity.reminderEnabled && scheduledReminderIds.has(activity.id) ? <View style={styles.reminderBadge}><Ionicons name="notifications-outline" size={12} color={colors.primary} /><Text style={[styles.reminderLabel, { color: colors.primary }]}>{t('itinerary_reminder_label')}</Text></View> : null}
                    </View>
                    <Pressable onPress={() => setEditingActivity(activity)} hitSlop={8} accessibilityRole="button" style={styles.editButton} accessibilityLabel={t('itinerary_edit_a11y', { title: activity.title })}>
                      <Ionicons name="create-outline" size={19} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(activity)} hitSlop={8} accessibilityRole="button" style={styles.deleteButton} accessibilityLabel={t('itinerary_delete_a11y', { title: activity.title })}>
                      <Ionicons name="trash-outline" size={19} color={colors.destructive} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <IdeasModal trip={selectedTrip} visible={ideasOpen} onClose={() => setIdeasOpen(false)} />
      <TripMapModal trip={selectedTrip} visible={mapOpen} onClose={() => setMapOpen(false)} />
      {contactActivity ? (
        <PlaceContactSheet
          visible
          name={contactActivity.title}
          city={contactActivity.city || getDestinationForDate(contactActivity.date, selectedTrip) || selectedTrip.destination}
          onClose={() => setContactActivity(null)}
          onMarkBooked={() => void markBooked(contactActivity)}
        />
      ) : null}
      <ActivityFormModal trip={selectedTrip} visible={adding || Boolean(editingActivity)} activity={editingActivity} onClose={() => { setAdding(false); setEditingActivity(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 112, paddingHorizontal: 18 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 15 },
  back: { alignItems: 'center', height: 40, justifyContent: 'center', marginRight: 4, width: 34 },
  headerContent: { flex: 1 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.15, marginBottom: 2 },
  tripTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  addButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  tripMeta: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 8, marginBottom: 25, paddingHorizontal: 13, paddingVertical: 12 },
  tripMetaText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  ideasCard: { alignItems: 'center', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 25, marginTop: -12, minHeight: 68, padding: 14 },
  ideasIcon: { alignItems: 'center', borderRadius: 10, height: 40, justifyContent: 'center', width: 40 },
  ideasText: { flex: 1 },
  ideasTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  ideasHint: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, marginTop: 2 },
  metaDivider: { height: 18, marginHorizontal: 3, width: 1 },
  routeCard: { borderWidth: 1, borderRadius: 8, marginBottom: 25 },
  routeScroll: { paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' },
  routeStopHorizontal: { flexDirection: 'row', alignItems: 'center' },
  routeStopContent: { alignItems: 'center', paddingHorizontal: 6 },
  routeStopHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  routeStopText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  routeStopDates: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  routeArrow: { marginHorizontal: 8 },
  transitSection: { marginBottom: 3 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginTop: 3 },
  refreshing: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  transitLoading: { alignItems: 'center', borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 19 },
  transitError: { fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' },
  transitCard: { borderRadius: 8, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  transitRoute: { borderBottomWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  transitRouteTitle: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  transitRouteText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  transitDate: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 4 },
  transitContent: { padding: 12 },
  recommendation: { alignItems: 'flex-start', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, padding: 10 },
  recommendationCopy: { flex: 1 },
  recommendationTitleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recommendationTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  dataBadge: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: .35 },
  recommendationReason: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 4 },
  transportOption: { borderRadius: 8, borderWidth: 1, marginTop: 8, padding: 10 },
  transportOptionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  transportLabel: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  transportOptionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  selectedLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: .4 },
  transportMetrics: { fontFamily: 'Inter_600SemiBold', fontSize: 11, marginTop: 5 },
  transportSummary: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4 },
  transportSource: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14, marginTop: 5 },
  loading: { alignItems: 'center', paddingTop: 44 },
  emptyScreen: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 38 },
  emptyState: { alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: 25, paddingVertical: 31 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 10, textAlign: 'center' },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  emptyCta: { alignItems: 'center', alignSelf: 'stretch', borderRadius: 12, flexDirection: 'row', gap: 8, height: 50, justifyContent: 'center', marginTop: 18 },
  emptyCtaText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  emptyHintRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 12 },
  emptyHint: { fontFamily: 'Inter_400Regular', fontSize: 12, flexShrink: 1 },
  retry: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 12 },
  goTrips: { borderRadius: 8, marginTop: 20, paddingHorizontal: 18, paddingVertical: 13 },
  goTripsText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  dayGroup: { marginTop: 25 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  stopBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  stopBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  dayLabel: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.9 },
  dayDate: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  activity: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', marginBottom: 9, padding: 12 },
  activityIcon: { alignItems: 'center', borderRadius: 8, height: 40, justifyContent: 'center', marginRight: 11, width: 40 },
  activityCopy: { flex: 1 },
  activityTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 3 },
  activityDestination: { alignItems: 'center', flexDirection: 'row', gap: 3, marginBottom: 3 },
  activityDestinationText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  activityDetail: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  reminderBadge: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 6 },
  reminderLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  pendingBadge: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 4, marginTop: 6, minHeight: 28, paddingHorizontal: 9 },
  pendingText: { color: '#92400E', fontFamily: 'Inter_700Bold', fontSize: 12 },
  editButton: { alignItems: 'center', height: 36, justifyContent: 'center', marginLeft: 6, width: 30 },
  deleteButton: { alignItems: 'center', height: 36, justifyContent: 'center', marginLeft: 2, width: 30 },
});
