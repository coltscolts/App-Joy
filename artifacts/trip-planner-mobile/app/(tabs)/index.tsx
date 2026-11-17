import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { getGetTripsQueryKey, useGetTrips, type Trip } from '@workspace/api-client-react';
import { TripSwipeRow } from '@/components/TripSwipeRow';
import { deleteTripsWithReminders } from '@/lib/tripDeletion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTripSelection } from '@/contexts/TripContext';
import { TripFormModal } from '@/components/TripFormModal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { t, formatTripDate, locale } from '@/lib/i18n';
import { getTripStatus, localTodayIso, pickNextTrip, tripStatusLabel } from '@/lib/tripStatus';
import { NextTripCountdown } from '@/components/NextTripCountdown';
import { syncTripWidget } from '@/lib/widgetSync';
import { useUser } from '@clerk/expo';
import { readableWidth } from '@/constants/layout';

export default function MyTripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectTrip, selectedTrip, clearTrip } = useTripSelection();
  const [creating, setCreating] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [coverHeight, setCoverHeight] = useState(360);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const { user } = useUser();
  const tripsQuery = useGetTrips({ query: { queryKey: getGetTripsQueryKey(), refetchOnMount: true } });
  const trips = tripsQuery.data ?? [];
  const todayIso = localTodayIso();
  const upcomingTrips = trips.filter((trip) => trip.endDate >= todayIso);
  const nextTrip = pickNextTrip(upcomingTrips, todayIso);

  // Sin viajes próximos, el widget de iOS vuelve a su estado vacío.
  useEffect(() => {
    if (tripsQuery.isSuccess && !nextTrip) syncTripWidget(null);
  }, [tripsQuery.isSuccess, nextTrip]);

  const removeTrip = async (trip: Trip) => {
    const { deletedIds, failed } = await deleteTripsWithReminders([trip]);
    if (selectedTrip && deletedIds.includes(selectedTrip.id)) clearTrip();
    if (failed.length) Alert.alert(t('trip_action_delete'), t('trip_delete_error'));
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmDeleteTrip = (trip: Trip) => {
    Alert.alert(t('trip_delete_title', { name: trip.name }), t('trip_delete_body'), [
      { text: t('form_cancel'), style: 'cancel' },
      { text: t('trip_action_delete'), style: 'destructive', onPress: () => void removeTrip(trip) },
    ]);
  };

  const openTripMenu = (trip: Trip) => {
    void Haptics.selectionAsync();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: trip.name, options: [t('trip_action_edit'), t('trip_action_delete'), t('form_cancel')], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (index) => {
          if (index === 0) setEditingTrip(trip);
          if (index === 1) confirmDeleteTrip(trip);
        },
      );
      return;
    }
    Alert.alert(trip.name, undefined, [
      { text: t('trip_action_edit'), onPress: () => setEditingTrip(trip) },
      { text: t('trip_action_delete'), style: 'destructive', onPress: () => confirmDeleteTrip(trip) },
      { text: t('form_cancel'), style: 'cancel' },
    ]);
  };

  const openCreate = () => {
    void Haptics.selectionAsync();
    setCreating(true);
  };

  const openTrip = (trip: Trip) => {
    void Haptics.selectionAsync();
    selectTrip(trip);
    router.navigate('/itinerary');
  };

  const cardGradients = [
    ['#3B82F6', '#1D4ED8'],
    ['#10B981', '#047857'],
    ['#F59E0B', '#B45309'],
    ['#8B5CF6', '#c2410c'],
    ['#EC4899', '#BE185D'],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {colors.isDark ? (
        <>
          <LinearGradient
            colors={['#08162B', '#0D1D36', '#09182D']}
            locations={[0, 0.52, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View testID="home-dark-compact" pointerEvents="none" style={styles.contourField}>
            <View style={styles.contourOne} />
            <View style={styles.contourTwo} />
            <View style={styles.contourThree} />
          </View>
        </>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.content, readableWidth, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 16 }]}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => tripsQuery.refetch()} tintColor={colors.isDark ? colors.primary : '#FFF'} />}
        showsVerticalScrollIndicator={false}
      >
        {!colors.isDark ? (
          // Se desplaza con el contenido y termina a media altura de la tarjeta
          // «Nuevo viaje», para que el título de la sección quede sobre fondo claro.
          <View testID="home-light-cover" pointerEvents="none" style={[styles.lightCover, { height: coverHeight + 1000 }]} />
        ) : null}
        <View onLayout={(event) => setCoverHeight(Math.max(200, event.nativeEvent.layout.y + event.nativeEvent.layout.height - 110))}>
        <View style={[styles.topRow, { marginBottom: colors.isDark ? 22 : 28 }]}>
          <View style={styles.brand}>
            <Image source={require('../../assets/images/logo-joyplann.png')} style={[styles.brandMark, !colors.isDark && { borderColor: 'rgba(255,255,255,0.3)' }]} resizeMode="cover" accessibilityLabel="JoyPlann" />
            <View>
              <Text style={[styles.eyebrow, { color: colors.isDark ? colors.mutedForeground : '#93C5FD' }]}>{t('trips_eyebrow')}</Text>
              <Text style={[styles.title, { color: colors.isDark ? colors.foreground : '#FFFFFF' }]}>{t('trips_title')}</Text>
            </View>
          </View>
          {colors.isDark ? (
            <View style={styles.actions}>
              <Pressable testID="button-account-settings" onPress={() => setSettingsVisible(true)} style={styles.darkAccountButton} accessibilityLabel={t('settings_title')}>
                <Ionicons name="person-circle-outline" size={24} color={colors.mutedForeground} />
                <Text numberOfLines={1} style={[styles.accountName, { color: colors.mutedForeground }]}>{user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? t('settings_title')}</Text>
              </Pressable>
              <Pressable testID="button-create-trip" onPress={openCreate} hitSlop={8} accessibilityRole="button" style={styles.addButton} accessibilityLabel={t('trips_create_a11y')}>
                <Ionicons name="add" size={27} color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <Pressable testID="button-account-settings" accessibilityRole="button" onPress={() => setSettingsVisible(true)} style={[styles.accountButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]} accessibilityLabel={t('settings_title')}>
              <Ionicons name="person-outline" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        {nextTrip ? (
          <NextTripCountdown trip={nextTrip} todayIso={todayIso} onPress={() => openTrip(nextTrip)} />
        ) : null}

        {colors.isDark ? (
          <LinearGradient colors={['#185A70', '#295467', '#5B4A3E']} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
            <View>
              <Text style={[styles.summaryEyebrow, { color: colors.primaryForeground }]}>{t('trips_summary_eyebrow')}</Text>
              <Text style={[styles.summaryValue, { color: colors.primaryForeground }]}>{upcomingTrips.length === 1 ? t('trips_summary_value_one') : t('trips_summary_value_other', { n: upcomingTrips.length })}</Text>
              <Text style={[styles.summaryBody, { color: colors.primaryForeground }]}>{t('trips_summary_body')}</Text>
            </View>
            <Ionicons name="compass-outline" size={46} color="#D7F6F6" />
          </LinearGradient>
        ) : (
          <View style={[styles.qaCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#88A2B8' }]}>
            <Text style={[styles.ctaTitle, { color: colors.foreground }]}>{t('home_cta_title')}</Text>
            <Text style={[styles.ctaBody, { color: colors.mutedForeground }]}>{t('home_cta_body')}</Text>
            <Pressable
              testID="button-create-trip"
              accessibilityRole="button"
              onPress={openCreate}
              style={({ pressed }) => [styles.ctaButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="add" size={22} color={colors.primaryForeground} />
              <Text style={[styles.ctaButtonText, { color: colors.primaryForeground }]}>{t('home_cta_button')}</Text>
            </Pressable>
          </View>
        )}

        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('trips_section_title')}</Text>

        {tripsQuery.isLoading ? (
          <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : tripsQuery.isError ? (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('trips_error_title')}</Text>
            <Pressable onPress={() => tripsQuery.refetch()}><Text style={[styles.retry, { color: colors.primary }]}>{t('trips_retry')}</Text></Pressable>
          </View>
        ) : trips.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.isDark ? '#16304D' : colors.muted }]}><Ionicons name="briefcase-outline" size={34} color={colors.isDark ? '#BDEEEF' : colors.primary} /></View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('trips_empty_exact')}</Text>
            <Pressable
              testID="button-create-trip-empty"
              accessibilityRole="button"
              onPress={openCreate}
              style={({ pressed }) => [styles.ctaButton, styles.emptyCta, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
              <Text style={[styles.ctaButtonText, { color: colors.primaryForeground }]}>{t('home_cta_button')}</Text>
            </Pressable>
          </View>
        ) : upcomingTrips.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.isDark ? '#16304D' : colors.muted }]}><Ionicons name="time-outline" size={34} color={colors.isDark ? '#BDEEEF' : colors.primary} /></View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('trips_past_only_title')}</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{t('trips_past_only_body')}</Text>
            <Pressable onPress={() => router.navigate('/history' as Href)}><Text style={[styles.retry, { color: colors.primary }]}>{t('trips_view_history')}</Text></Pressable>
          </View>
        ) : (
          upcomingTrips.map((trip) => {
            const status = tripStatusLabel(getTripStatus(trip.startDate, trip.endDate, todayIso));
            const dates = `${formatTripDate(trip.startDate)} — ${formatTripDate(trip.endDate)}`;
            const a11yLabel = t('trip_card_a11y', { name: trip.name, destination: trip.destination, dates, status });
            const statusChip = status ? (
              <View style={[styles.statusChip, { backgroundColor: colors.isDark ? '#16304D' : colors.muted }]}>
                <Text style={[styles.statusText, { color: colors.primary }]}>{status}</Text>
              </View>
            ) : null;
            const moreButton = (
              <Pressable
                testID={`trip-more-${trip.id}`}
                onPress={() => openTripMenu(trip)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('trip_action_more_a11y', { name: trip.name })}
                style={[styles.moreButton, { backgroundColor: colors.muted }]}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.foreground} />
              </Pressable>
            );
            if (colors.isDark) {
              return (
                <TripSwipeRow key={trip.id} onEdit={() => setEditingTrip(trip)} onDelete={() => confirmDeleteTrip(trip)} radius={16} spacing={12}>
                <Pressable testID={`trip-card-${trip.id}`} accessibilityRole="button" accessibilityLabel={a11yLabel} onPress={() => openTrip(trip)} style={({ pressed }) => [styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}>
                  <View style={[styles.dateBlock, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.dateDay, { color: colors.accentForeground }]}>{new Date(`${trip.startDate}T12:00:00`).getDate()}</Text>
                    <Text style={[styles.dateMonth, { color: colors.accentForeground }]}>{new Date(`${trip.startDate}T12:00:00`).toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text numberOfLines={1} style={[styles.tripName, { color: colors.foreground }]}>{trip.name}</Text>
                    <View style={styles.locationRow}><Ionicons name="location-outline" size={14} color={colors.mutedForeground} /><Text style={[styles.location, { color: colors.mutedForeground }]}>{trip.destination}</Text></View>
                    <Text style={[styles.dates, { color: colors.mutedForeground }]}>{dates}</Text>
                    {statusChip}
                  </View>
                  {moreButton}
                </Pressable>
                </TripSwipeRow>
              );
            }
            const grad = colors.isDark ? ['#1A2D49', '#08162B'] : cardGradients[trip.id % cardGradients.length];
            return (
              <TripSwipeRow key={trip.id} onEdit={() => setEditingTrip(trip)} onDelete={() => confirmDeleteTrip(trip)} radius={24} spacing={20}>
              <Pressable testID={`trip-card-${trip.id}`} accessibilityRole="button" accessibilityLabel={a11yLabel} onPress={() => openTrip(trip)} style={({ pressed }) => [styles.newTripCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}>
                <View style={[styles.ntcImageContainer, { backgroundColor: colors.muted }]}>
                  <LinearGradient colors={grad as [string, string]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={styles.ntcImageText} numberOfLines={2}>{trip.destination}</Text>
                </View>
                <View style={styles.ntcInfo}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <View style={styles.ntcNameRow}>
                      <Ionicons name="ellipse" size={8} color={colors.primary} />
                      <Text numberOfLines={1} style={[styles.ntcName, { color: colors.foreground }]}>{trip.name}</Text>
                    </View>
                    <Text style={[styles.ntcDates, { color: colors.mutedForeground }]}>{dates}</Text>
                    {statusChip}
                  </View>
                  {moreButton}
                </View>
              </Pressable>
              </TripSwipeRow>
            );
          })
        )}
      </ScrollView>
      <TripFormModal
        visible={creating || Boolean(editingTrip)}
        trip={editingTrip}
        onSaved={(saved) => {
          if (selectedTrip?.id === saved.id) selectTrip(saved);
        }}
        onClose={() => {
          setCreating(false);
          setEditingTrip(null);
        }}
        onCreated={(created) => {
          selectTrip(created);
          router.navigate('/itinerary');
        }}
      />
      <AccountSettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  contourField: { ...StyleSheet.absoluteFillObject, opacity: 0.22, overflow: 'hidden' },
  contourOne: { borderColor: '#4B7299', borderRadius: 360, borderWidth: 1, height: 440, left: -170, position: 'absolute', top: 270, transform: [{ rotate: '-23deg' }], width: 560 },
  contourTwo: { borderColor: '#496E94', borderRadius: 280, borderWidth: 1, height: 370, right: -155, position: 'absolute', top: 420, transform: [{ rotate: '20deg' }], width: 490 },
  contourThree: { borderColor: '#385978', borderRadius: 260, borderWidth: 1, height: 330, left: -100, position: 'absolute', top: 585, transform: [{ rotate: '14deg' }], width: 430 },
  content: { paddingBottom: 112, paddingHorizontal: 18 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  brandMark: { borderRadius: 12, borderWidth: 1, height: 40, width: 40, borderColor: '#3F718A' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -1 },
  accountButton: { alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 21 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  darkAccountButton: { alignItems: 'center', flexDirection: 'row', gap: 4, maxWidth: 130 },
  accountName: { fontFamily: 'Inter_500Medium', fontSize: 12, maxWidth: 96 },
  addButton: { alignItems: 'center', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  summary: { alignItems: 'center', borderColor: '#75C7CE', borderRadius: 18, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, overflow: 'hidden', padding: 24 },
  summaryEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, opacity: 0.7 },
  summaryValue: { fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: -0.7, marginTop: 4 },
  summaryBody: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21, marginTop: 5, maxWidth: 230, opacity: 0.88 },

  qaCard: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 34, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  ctaTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3 },
  ctaBody: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginBottom: 18, marginTop: 6 },
  ctaButton: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center' },
  ctaButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  emptyCta: { alignSelf: 'stretch', marginTop: 20 },
  statusChip: { alignSelf: 'flex-start', borderRadius: 999, marginTop: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3, marginBottom: 16 },
  loading: { alignItems: 'center', paddingTop: 42 },
  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, paddingHorizontal: 26, paddingVertical: 42 },
  emptyIcon: { alignItems: 'center', borderRadius: 18, height: 62, justifyContent: 'center', width: 62 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 17, textAlign: 'center' },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  retry: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 12 },

  // left/right amplios: en iPad el contenido está centrado y el azul debe cubrir todo el ancho.
  lightCover: { backgroundColor: '#1868C6', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, left: -1200, position: 'absolute', right: -1200, top: -1000 },
  moreButton: { alignItems: 'center', borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  swipeActions: { flexDirection: 'row', gap: 8, paddingLeft: 8 },
  swipeButton: { alignItems: 'center', gap: 4, justifyContent: 'center', width: 84 },
  swipeText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  newTripCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  ntcImageContainer: { height: 140, justifyContent: 'center', alignItems: 'center', padding: 20 },
  ntcImageText: { fontFamily: 'Inter_700Bold', fontSize: 26, color: '#FFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  ntcInfo: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  ntcNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ntcName: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  ntcDates: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  ntcAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tripCard: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 8, padding: 15 },
  dateBlock: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', marginRight: 13, minHeight: 54, paddingHorizontal: 10, width: 56 },
  dateDay: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 21 },
  dateMonth: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase' },
  tripInfo: { flex: 1 },
  tripName: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4 },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  location: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  dates: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
});