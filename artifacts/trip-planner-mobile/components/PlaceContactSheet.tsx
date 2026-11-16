import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlaceContact, type PlaceContact } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { language, t } from '@/lib/i18n';
import { dayStatus, fallbackLinks, openTableSearch, telUrl } from '@/lib/placeContact';

type Props = {
  visible: boolean;
  name: string;
  city: string;
  onClose: () => void;
  /** Si se pasa, muestra «Ya lo reservé». */
  onMarkBooked?: () => void;
  /** Día planeado (YYYY-MM-DD) para mostrar su horario y avisar si cierra. */
  date?: string | null;
  /** Categoría: restaurantes y bares muestran OpenTable. */
  category?: string | null;
};

type State = { status: 'loading' } | { status: 'ready'; contact: PlaceContact | null };

/**
 * Contacto para reservar: datos verificados de Google Maps cuando existen;
 * si no, solo enlaces de búsqueda. Nunca se muestran datos generados por IA.
 */
export function PlaceContactSheet({ visible, name, city, onClose, onMarkBooked, date, category }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [showWeek, setShowWeek] = useState(false);
  const links = fallbackLinks(name, city, language);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setState({ status: 'loading' });
    getPlaceContact({ name, city, language })
      .then((result) => { if (!cancelled) setState({ status: 'ready', contact: result.contact ?? null }); })
      .catch(() => { if (!cancelled) setState({ status: 'ready', contact: null }); });
    return () => { cancelled = true; };
  }, [visible, name, city]);

  const contact = state.status === 'ready' ? state.contact : null;
  const open = (url: string) => void Linking.openURL(url);

  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; url: string; primary?: boolean }[] = [];
  if (contact?.phone) actions.push({ icon: 'call-outline', label: t('contact_call'), url: telUrl(contact.phone), primary: true });
  if (contact?.website) actions.push({ icon: contact.reservable ? 'calendar-outline' : 'globe-outline', label: contact.reservable ? t('contact_book') : t('contact_website'), url: contact.website, primary: !contact.phone });
  if (!contact?.website) actions.push({ icon: 'search-outline', label: t('contact_search_booking'), url: links.bookingSearch, primary: !contact?.phone });
  if (category === 'restaurant' || category === 'bar' || category === 'nightlife') {
    actions.push({ icon: 'restaurant-outline', label: t('contact_opentable'), url: openTableSearch(contact?.name ?? name, city) });
  }
  actions.push({ icon: 'map-outline', label: t('contact_maps'), url: contact?.mapsUrl ?? links.maps });
  const today = dayStatus(contact, date);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'formSheet' : undefined} onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.side} />
          <Text style={[styles.headerTitle, { color: colors.title }]}>{t('contact_title')}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.side, styles.right]} accessibilityRole="button" testID="contact-close">
            <Text style={[styles.done, { color: colors.primary }]}>{t('ideas_done')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.name, { color: colors.foreground }]}>{contact?.name ?? name}</Text>
          {contact?.address ? <Text style={[styles.meta, { color: colors.mutedForeground }]}>{contact.address}</Text> : null}

          {state.status === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>{t('contact_loading')}</Text>
            </View>
          ) : (
            <>
              {contact ? (
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.foreground }]}>{t('contact_verified')}</Text>
                  </View>
                  {contact.reservable !== null && contact.reservable !== undefined ? (
                    <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                      <Ionicons name={contact.reservable ? 'calendar' : 'calendar-outline'} size={14} color={contact.reservable ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.badgeText, { color: colors.foreground }]}>{contact.reservable ? t('contact_reservable') : t('contact_no_reservations')}</Text>
                    </View>
                  ) : null}
                  {typeof contact.rating === 'number' ? (
                    <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.badgeText, { color: colors.foreground }]}>{t('contact_rating', { rating: contact.rating.toFixed(1), count: contact.ratingCount ?? 0 })}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.note, { color: colors.mutedForeground }]}>{t('contact_not_found')}</Text>
              )}

              <View style={[styles.hours, { backgroundColor: colors.card, borderColor: today.closed ? colors.destructive : colors.border }]}>
                <View style={styles.hoursHeader}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[styles.hoursTitle, { color: colors.foreground }]}>{t('contact_hours')}</Text>
                </View>
                {today.line ? (
                  <Text testID="contact-day-hours" style={[styles.hoursDay, { color: today.closed ? colors.destructive : colors.foreground }]}>
                    {t('contact_your_day', { line: today.line })}
                  </Text>
                ) : null}
                {today.closed ? (
                  <Text testID="contact-closed-warning" style={[styles.closed, { color: colors.destructive }]}>⚠️ {t('contact_closed_that_day')}</Text>
                ) : null}
                {contact?.openingHours?.length ? (
                  <>
                    <Pressable onPress={() => setShowWeek((open) => !open)} accessibilityRole="button" hitSlop={6}>
                      <Text style={[styles.weekToggle, { color: colors.primary }]}>{t('contact_week_hours')}</Text>
                    </Pressable>
                    {showWeek ? contact.openingHours.map((line) => (
                      <Text key={line} style={[styles.weekLine, { color: colors.mutedForeground }]}>{line}</Text>
                    )) : null}
                  </>
                ) : (
                  <Text style={[styles.weekLine, { color: colors.mutedForeground }]}>{t('contact_hours_unknown')}</Text>
                )}
              </View>

              <View style={styles.actions}>
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={() => open(action.url)}
                    accessibilityRole="link"
                    style={({ pressed }) => [
                      styles.action,
                      action.primary
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name={action.icon} size={18} color={action.primary ? colors.primaryForeground : colors.primary} />
                    <Text style={[styles.actionText, { color: action.primary ? colors.primaryForeground : colors.foreground }]}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {onMarkBooked ? (
            <Pressable
              testID="contact-mark-booked"
              onPress={onMarkBooked}
              accessibilityRole="button"
              style={[styles.booked, { borderColor: colors.primary }]}
            >
              <Ionicons name="checkmark-done" size={18} color={colors.primary} />
              <Text style={[styles.bookedText, { color: colors.primary }]}>{t('contact_mark_booked')}</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.note, { color: colors.mutedForeground }]}>{t('contact_disclaimer')}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 54, justifyContent: 'space-between', paddingHorizontal: 16 },
  side: { minWidth: 64 },
  right: { alignItems: 'flex-end', justifyContent: 'center', minHeight: 44 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  done: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  content: { alignSelf: 'center', maxWidth: 560, padding: 20, width: '100%' },
  name: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.3 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 4 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badge: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  hours: { borderRadius: 12, borderWidth: 1, gap: 6, marginTop: 16, padding: 12 },
  hoursHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  hoursTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  hoursDay: { fontFamily: 'Inter_600SemiBold', fontSize: 14, textTransform: 'capitalize' },
  closed: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  weekToggle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 2 },
  weekLine: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textTransform: 'capitalize' },
  actions: { gap: 10, marginTop: 20 },
  action: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, height: 50, justifyContent: 'center' },
  actionText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  booked: { alignItems: 'center', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: 8, height: 50, justifyContent: 'center', marginTop: 20 },
  bookedText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 14, textAlign: 'center' },
});
