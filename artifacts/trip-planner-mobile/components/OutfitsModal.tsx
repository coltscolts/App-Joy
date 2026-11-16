import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GetTripOutfitsLanguage,
  getGetTripOutfitsQueryKey,
  useGetTripOutfits,
  type StopOutfit,
  type Trip,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { formatDate, language, t } from '@/lib/i18n';
import { weatherIcon } from '@/lib/outfits';

type Props = { trip: Trip; visible: boolean; onClose: () => void };

/** «Qué llevar»: clima por destino (en vivo, pronóstico o típico) y outfits. */
export function OutfitsModal({ trip, visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const lang = language === 'es' ? GetTripOutfitsLanguage.es : GetTripOutfitsLanguage.en;
  const query = useGetTripOutfits(trip.id, { language: lang }, {
    query: {
      queryKey: getGetTripOutfitsQueryKey(trip.id, { language: lang }),
      enabled: visible,
      staleTime: 10 * 60_000,
      refetchInterval: visible ? 10 * 60_000 : false,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.side} />
          <Text style={[styles.headerTitle, { color: colors.title }]}>{t('outfits_title')}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.side, styles.right]} accessibilityRole="button" testID="outfits-close">
            <Text style={[styles.done, { color: colors.primary }]}>{t('ideas_done')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          {query.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('outfits_loading')}</Text>
            </View>
          ) : query.isError ? (
            <View style={styles.center}>
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('outfits_error')}</Text>
              <Pressable onPress={() => void query.refetch()} accessibilityRole="button" style={[styles.retry, { borderColor: colors.primary }]}>
                <Text style={[styles.retryText, { color: colors.primary }]}>{t('outfits_retry')}</Text>
              </Pressable>
            </View>
          ) : (
            (query.data?.stops ?? []).map((stop) => <StopCard key={`${stop.city}-${stop.startDate}`} stop={stop} />)
          )}
          <Text style={[styles.note, { color: colors.mutedForeground }]}>{t('outfits_source')}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function StopCard({ stop }: { stop: StopOutfit }) {
  const colors = useColors();
  const w = stop.weather;
  return (
    <View testID="outfit-stop" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={weatherIcon(w)} size={26} color={colors.primary} />
        <View style={styles.flex}>
          <Text style={[styles.city, { color: colors.foreground }]}>{stop.city.split(',')[0]}</Text>
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>
            {formatDate(stop.startDate, { day: 'numeric', month: 'short' })} – {formatDate(stop.endDate, { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        {w ? (
          <View style={[styles.pill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.pillText, { color: colors.foreground }]}>
              {w.source === 'forecast' ? t('outfits_forecast') : t('outfits_typical')}
            </Text>
          </View>
        ) : null}
      </View>

      {!w || !stop.outfit ? (
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('outfits_unavailable')}</Text>
      ) : (
        <>
          {w.current ? (
            <View testID="outfit-live" style={[styles.live, { backgroundColor: colors.muted }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.liveText, { color: colors.foreground }]}>
                {t('outfits_now', { temp: Math.round(w.current.temperature), feels: Math.round(w.current.apparentTemperature) })}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.summary, { color: colors.foreground }]}>{stop.outfit.summary}</Text>
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>
            {t('outfits_range', { min: Math.round(w.minTemp), max: Math.round(w.maxTemp), rainy: w.rainyDays, days: w.totalDays })}
          </Text>
          <Text style={[styles.section, { color: colors.title }]}>{t('outfits_pack')}</Text>
          {stop.outfit.items.map((item) => (
            <View key={item} style={styles.row}>
              <Ionicons name="shirt-outline" size={16} color={colors.primary} />
              <Text style={[styles.rowText, { color: colors.foreground }]}>{item}</Text>
            </View>
          ))}
          {stop.outfit.tips.length ? (
            <>
              <Text style={[styles.section, { color: colors.title }]}>{t('outfits_tips')}</Text>
              {stop.outfit.tips.map((tip) => (
                <View key={tip} style={styles.row}>
                  <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                  <Text style={[styles.rowText, { color: colors.foreground }]}>{tip}</Text>
                </View>
              ))}
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 54, justifyContent: 'space-between', paddingHorizontal: 16 },
  side: { minWidth: 64 },
  right: { alignItems: 'flex-end', justifyContent: 'center', minHeight: 44 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  done: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  content: { alignSelf: 'center', gap: 14, maxWidth: 720, padding: 20, width: '100%' },
  center: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  card: { borderRadius: 14, borderWidth: 1, gap: 6, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 4 },
  flex: { flex: 1 },
  city: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  live: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { borderRadius: 4, height: 8, width: 8 },
  liveText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  summary: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  section: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 10 },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  rowText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  retry: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
