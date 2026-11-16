import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTripSelection } from '@/contexts/TripContext';
import { TripFormModal } from '@/components/TripFormModal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { t, formatTripDate, locale } from '@/lib/i18n';
import { useUser } from '@clerk/expo';

function QAButton({ icon, bg, fg = '#FFF', label, onPress, colors }: any) {
  return (
    <Pressable style={styles.qaBtn} onPress={onPress}>
      <View style={[styles.qaBtnCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text style={[styles.qaBtnLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export default function MyTripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectTrip } = useTripSelection();
  const [creating, setCreating] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const { user } = useUser();
  const tripsQuery = useGetTrips({ query: { queryKey: getGetTripsQueryKey(), refetchOnMount: true } });
  const trips = tripsQuery.data ?? [];
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const upcomingTrips = trips.filter((trip) => trip.endDate >= todayIso);

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
      ) : (
        <View testID="home-light-cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420, backgroundColor: '#1868C6' }} />
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 16 }]}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => tripsQuery.refetch()} tintColor={colors.isDark ? colors.primary : '#FFF'} />}
        showsVerticalScrollIndicator={false}
      >
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
              <Pressable testID="button-create-trip" onPress={() => setCreating(true)} style={styles.addButton} accessibilityLabel={t('trips_create_a11y')}>
                <Ionicons name="add" size={27} color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <Pressable testID="button-account-settings" onPress={() => setSettingsVisible(true)} style={[styles.accountButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]} accessibilityLabel={t('settings_title')}>
              <Ionicons name="person-outline" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

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
            <Pressable style={[styles.qaSearch, { backgroundColor: colors.muted }]} onPress={() => setCreating(true)} testID="button-create-trip">
              <Ionicons name="search" size={18} color={colors.mutedForeground} />
              <Text style={[styles.qaSearchText, { color: colors.mutedForeground }]}>{t('trips_create_a11y')}</Text>
            </Pressable>
            <View style={styles.qaRow}>
              <QAButton icon="add" bg={colors.primary} label={t('trips_create_a11y')} onPress={() => setCreating(true)} colors={colors} />
              <QAButton icon="map" bg={colors.primary} label={t('tab_itinerary')} onPress={() => router.navigate('/itinerary')} colors={colors} />
              <QAButton icon="time" bg={colors.accent} fg={colors.accentForeground} label={t('tab_history')} onPress={() => router.navigate('/history')} colors={colors} />
              <QAButton icon="settings" bg={colors.secondary} fg={colors.secondaryForeground} label={t('settings_title')} onPress={() => setSettingsVisible(true)} colors={colors} />
            </View>
          </View>
        )}

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
            <Pressable onPress={() => setCreating(true)}><Text style={[styles.retry, { color: colors.primary }]}>{t('trips_create_a11y')}</Text></Pressable>
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
            if (colors.isDark) {
              return (
                <Pressable key={trip.id} testID={`trip-card-${trip.id}`} onPress={() => openTrip(trip)} style={({ pressed }) => [styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}>
                  <View style={[styles.dateBlock, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.dateDay, { color: colors.accentForeground }]}>{new Date(`${trip.startDate}T12:00:00`).getDate()}</Text>
                    <Text style={[styles.dateMonth, { color: colors.accentForeground }]}>{new Date(`${trip.startDate}T12:00:00`).toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text numberOfLines={1} style={[styles.tripName, { color: colors.foreground }]}>{trip.name}</Text>
                    <View style={styles.locationRow}><Ionicons name="location-outline" size={14} color={colors.mutedForeground} /><Text style={[styles.location, { color: colors.mutedForeground }]}>{trip.destination}</Text></View>
                    <Text style={[styles.dates, { color: colors.mutedForeground }]}>{formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </Pressable>
              );
            }
            const grad = colors.isDark ? ['#1A2D49', '#08162B'] : cardGradients[trip.id % cardGradients.length];
            return (
              <Pressable key={trip.id} testID={`trip-card-${trip.id}`} onPress={() => openTrip(trip)} style={({ pressed }) => [styles.newTripCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}>
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
                    <Text style={[styles.ntcDates, { color: colors.mutedForeground }]}>{formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}</Text>
                  </View>
                  <View style={[styles.ntcAction, { backgroundColor: colors.muted }]}>
                    <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <TripFormModal
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          const created = tripsQuery.data?.find((trip) => trip.id === id);
          if (created) selectTrip(created);
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
  qaSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 14, marginBottom: 24 },
  qaSearchText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  qaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  qaBtn: { alignItems: 'center', gap: 8 },
  qaBtnCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  qaBtnLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, maxWidth: 64, textAlign: 'center' },

  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3, marginBottom: 16 },
  loading: { alignItems: 'center', paddingTop: 42 },
  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, paddingHorizontal: 26, paddingVertical: 42 },
  emptyIcon: { alignItems: 'center', borderRadius: 18, height: 62, justifyContent: 'center', width: 62 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 17, textAlign: 'center' },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  retry: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 12 },

  newTripCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', marginBottom: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  ntcImageContainer: { height: 140, justifyContent: 'center', alignItems: 'center', padding: 20 },
  ntcImageText: { fontFamily: 'Inter_700Bold', fontSize: 26, color: '#FFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  ntcInfo: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  ntcNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ntcName: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  ntcDates: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  ntcAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tripCard: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 15 },
  dateBlock: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', marginRight: 13, minHeight: 54, paddingHorizontal: 10, width: 56 },
  dateDay: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 21 },
  dateMonth: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase' },
  tripInfo: { flex: 1 },
  tripName: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4 },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  location: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  dates: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
});