import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ApiError,
  getDestinationForDate,
  getGetTripActivitiesQueryKey,
  useCreateActivity,
  useGetSuggestions,
  type ActivitySuggestion,
  type SuggestionParamsLanguage,
  type Trip,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { mobileQueryClient } from '@/lib/queryClient';
import { formatTripDate, language, locale, t, type TranslationKey } from '@/lib/i18n';
import { localTodayIso } from '@/lib/tripStatus';
import { paywallReasonFromCode, usePlan } from '@/contexts/PlanContext';
import { PlaceContactSheet } from '@/components/PlaceContactSheet';
import { needsBooking } from '@/lib/placeContact';
import { readableWidth } from '@/constants/layout';

/** Gustos que se ofrecen; el valor se envía a la IA en el idioma de la persona. */
export const TASTES = [
  { key: 'taste_food', icon: 'restaurant-outline' },
  { key: 'taste_culture', icon: 'library-outline' },
  { key: 'taste_history', icon: 'business-outline' },
  { key: 'taste_nature', icon: 'leaf-outline' },
  { key: 'taste_beach', icon: 'sunny-outline' },
  { key: 'taste_adventure', icon: 'trail-sign-outline' },
  { key: 'taste_nightlife', icon: 'moon-outline' },
  { key: 'taste_shopping', icon: 'bag-handle-outline' },
  { key: 'taste_relax', icon: 'flower-outline' },
  { key: 'taste_art', icon: 'color-palette-outline' },
  { key: 'taste_sports', icon: 'football-outline' },
  { key: 'taste_photo', icon: 'camera-outline' },
  { key: 'taste_local', icon: 'people-outline' },
  { key: 'taste_family', icon: 'happy-outline' },
  // Fit y ejercicio
  { key: 'fit_running', icon: 'walk-outline' },
  { key: 'fit_hiking', icon: 'trail-sign-outline' },
  { key: 'fit_gym', icon: 'barbell-outline' },
  { key: 'fit_crossfit', icon: 'fitness-outline' },
  { key: 'fit_hyrox', icon: 'stopwatch-outline' },
  { key: 'fit_barre', icon: 'body-outline' },
  { key: 'fit_pilates_yoga', icon: 'leaf-outline' },
  { key: 'fit_cycling', icon: 'bicycle-outline' },
] as const satisfies readonly { key: TranslationKey; icon: keyof typeof Ionicons.glyphMap }[];

type TasteKey = (typeof TASTES)[number]['key'];
type Budget = 'low' | 'medium' | 'high';

const PREFS_KEY = 'joyplann.ideas.prefs.v1';

/** Días del viaje (YYYY-MM-DD), incluidos inicio y fin. */
export function tripDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const [y, m, d] = startDate.split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < 60; i += 1) {
    const iso = cursor.toISOString().slice(0, 10);
    if (iso > endDate) break;
    days.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

type Props = { trip: Trip; visible: boolean; onClose: () => void };

export function IdeasModal({ trip, visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const days = useMemo(() => tripDays(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const today = localTodayIso();

  const [step, setStep] = useState<'tastes' | 'results'>('tastes');
  const [tastes, setTastes] = useState<TasteKey[]>([]);
  const [budget, setBudget] = useState<Budget>('medium');
  const [extra, setExtra] = useState('');
  const [date, setDate] = useState(days.includes(today) ? today : days[0]);
  const [ideas, setIdeas] = useState<ActivitySuggestion[]>([]);
  const [added, setAdded] = useState<Record<string, 'saving' | 'done'>>({});
  const [error, setError] = useState<string | null>(null);
  const [contactFor, setContactFor] = useState<ActivitySuggestion | null>(null);

  const plan = usePlan();
  const suggestions = useGetSuggestions();
  const createActivity = useCreateActivity();
  const city = getDestinationForDate(date, trip) ?? trip.destination;

  // Recordar gustos y presupuesto para la próxima vez.
  useEffect(() => {
    if (!visible) return;
    setStep('tastes');
    setIdeas([]);
    setAdded({});
    setError(null);
    setDate(days.includes(today) ? today : days[0]);
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { tastes?: TasteKey[]; budget?: Budget };
        if (saved.tastes) setTastes(saved.tastes.filter((key) => TASTES.some((taste) => taste.key === key)));
        if (saved.budget) setBudget(saved.budget);
      })
      .catch(() => {});
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTaste = (key: TasteKey) => {
    void Haptics.selectionAsync?.();
    setTastes((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  };

  const generate = async () => {
    if (!tastes.length) {
      setError(t('ideas_pick_one'));
      return;
    }
    setError(null);
    setStep('results');
    setIdeas([]);
    void AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ tastes, budget })).catch(() => {});
    try {
      const result = await suggestions.mutateAsync({
        data: {
          destination: city,
          adults: trip.adults,
          children: trip.children,
          category: 'any',
          date,
          language: language as SuggestionParamsLanguage,
          budget,
          interests: [...tastes.map((key) => t(key)), ...(extra.trim() ? [extra.trim()] : [])],
        },
      });
      setIdeas(result);
      plan?.refetchPlan();
    } catch (err) {
      const reason = err instanceof ApiError && err.status === 402
        ? paywallReasonFromCode((err.data as { code?: string } | null)?.code)
        : null;
      if (reason && plan) {
        setStep('tastes');
        plan.openPaywall(reason);
        return;
      }
      setError(err instanceof ApiError && err.status === 503 ? t('ideas_unavailable') : t('ideas_error'));
    }
  };

  const addIdea = async (idea: ActivitySuggestion) => {
    setAdded((current) => ({ ...current, [idea.title]: 'saving' }));
    try {
      const details = [idea.description, idea.estimatedTime, t('ideas_verify')].filter(Boolean).join('\n');
      await createActivity.mutateAsync({
        data: {
          tripId: trip.id,
          day: new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'long' }),
          date,
          type: idea.category,
          category: idea.category,
          title: idea.title,
          location: idea.location || null,
          city,
          description: details,
          details,
          kidFriendly: idea.kidFriendly,
          budget: idea.budget,
          reminderEnabled: false,
          // «Por reservar» solo donde suele hacer falta reserva: así nadie cree que ya la tiene.
          status: needsBooking(idea.category, idea.budget, idea.needsBooking) ? 'pending' : 'confirmed',
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mobileQueryClient.invalidateQueries({ queryKey: getGetTripActivitiesQueryKey(trip.id) });
      setAdded((current) => ({ ...current, [idea.title]: 'done' }));
    } catch {
      setAdded(({ [idea.title]: _removed, ...rest }) => rest);
      setError(t('ideas_add_error'));
    }
  };

  const dayLabel = (iso: string) =>
    `${new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })} ${formatTripDate(iso)}`;

  return (
    <Modal
      animationType="slide"
      visible={visible}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        {Platform.OS === 'ios' ? <View style={[styles.grabber, { backgroundColor: colors.border }]} /> : null}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {step === 'results' ? (
            <Pressable onPress={() => setStep('tastes')} hitSlop={12} style={styles.headerButton} accessibilityRole="button" testID="ideas-back">
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </Pressable>
          ) : <View style={styles.headerButton} />}
          <Text style={[styles.headerTitle, { color: colors.title }]}>{t('ideas_title')}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.headerButton, styles.headerRight]} accessibilityRole="button" testID="ideas-close">
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>{t('ideas_done')}</Text>
          </Pressable>
        </View>

        {step === 'tastes' ? (
          <ScrollView contentContainerStyle={[styles.content, readableWidth]} keyboardShouldPersistTaps="handled">
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('ideas_step_tastes')}</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t('ideas_step_tastes_hint')}</Text>
            {[
              { title: t('ideas_section_tastes'), items: TASTES.filter((taste) => taste.key.startsWith('taste_')) },
              { title: t('ideas_section_fit'), items: TASTES.filter((taste) => taste.key.startsWith('fit_')) },
            ].map((section) => (
            <View key={section.title}>
            <Text style={[styles.chipSection, { color: colors.mutedForeground }]}>{section.title}</Text>
            <View style={styles.chips}>
              {section.items.map((taste) => {
                const selected = tastes.includes(taste.key);
                return (
                  <Pressable
                    key={taste.key}
                    testID={`taste-${taste.key}`}
                    onPress={() => toggleTaste(taste.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card }]}
                  >
                    <Ionicons name={taste.icon} size={16} color={selected ? colors.primaryForeground : colors.foreground} />
                    <Text style={[styles.chipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{t(taste.key)}</Text>
                  </Pressable>
                );
              })}
            </View>
            </View>
            ))}

            <Text style={[styles.label, { color: colors.foreground }]}>{t('ideas_budget')}</Text>
            <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {(['low', 'medium', 'high'] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setBudget(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: budget === value }}
                  style={[styles.segmentItem, budget === value && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.segmentText, { color: budget === value ? colors.primaryForeground : colors.foreground }]}>
                    {t(`ideas_budget_${value}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>{t('ideas_day')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
              {days.map((iso) => (
                <Pressable
                  key={iso}
                  onPress={() => setDate(iso)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: date === iso }}
                  style={[styles.dayChip, { borderColor: date === iso ? colors.primary : colors.border, backgroundColor: date === iso ? colors.primary : colors.card }]}
                >
                  <Text style={[styles.dayText, { color: date === iso ? colors.primaryForeground : colors.foreground }]}>{dayLabel(iso)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.foreground }]}>{t('ideas_extra')}</Text>
            <TextInput
              value={extra}
              onChangeText={setExtra}
              placeholder={t('ideas_extra_ph')}
              placeholderTextColor={colors.mutedForeground}
              maxLength={160}
              style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
            />

            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <Pressable
              testID="ideas-generate"
              accessibilityRole="button"
              onPress={() => void generate()}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="sparkles" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{t('ideas_generate')}</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, readableWidth]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t('ideas_results', { day: dayLabel(date), city: city.split(',')[0] })}
            </Text>
            {suggestions.isPending ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t('ideas_loading')}</Text>
              </View>
            ) : null}
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            {ideas.map((idea) => {
              const state = added[idea.title];
              return (
                <View key={idea.title} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{idea.title}</Text>
                  <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{idea.description}</Text>
                  <View style={styles.metaRow}>
                    {idea.location ? <Meta icon="location-outline" text={idea.location} color={colors.mutedForeground} /> : null}
                    {idea.estimatedTime ? <Meta icon="time-outline" text={idea.estimatedTime} color={colors.mutedForeground} /> : null}
                    {idea.kidFriendly ? <Meta icon="happy-outline" text={t('ideas_kid_friendly')} color={colors.mutedForeground} /> : null}
                  </View>
                  <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(state)}
                    onPress={() => void addIdea(idea)}
                    style={[styles.addButton, { backgroundColor: state === 'done' ? colors.muted : colors.primary }]}
                  >
                    {state === 'saving' ? <ActivityIndicator color={colors.primaryForeground} /> : (
                      <>
                        <Ionicons name={state === 'done' ? 'checkmark' : 'add'} size={18} color={state === 'done' ? colors.primary : colors.primaryForeground} />
                        <Text style={[styles.addText, { color: state === 'done' ? colors.primary : colors.primaryForeground }]}>
                          {state === 'done' ? (needsBooking(idea.category, idea.budget, idea.needsBooking) ? t('ideas_added_pending') : t('ideas_added')) : t('ideas_add')}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  {needsBooking(idea.category, idea.budget, idea.needsBooking) ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setContactFor(idea)}
                      testID={`idea-contact-${idea.title}`}
                      style={[styles.contactButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                      <Ionicons name="call-outline" size={16} color={colors.primary} />
                      <Text style={[styles.contactText, { color: colors.primary }]}>{t('contact_button')}</Text>
                    </Pressable>
                  ) : null}
                  </View>
                </View>
              );
            })}
            {!suggestions.isPending ? (
              <View style={styles.footerRow}>
                <Pressable onPress={() => void generate()} style={[styles.secondary, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="button" testID="ideas-more">
                  <Ionicons name="refresh" size={16} color={colors.foreground} />
                  <Text style={[styles.secondaryText, { color: colors.foreground }]}>{t('ideas_more')}</Text>
                </Pressable>
                <Pressable onPress={() => setStep('tastes')} style={[styles.secondary, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="button">
                  <Ionicons name="options-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.secondaryText, { color: colors.foreground }]}>{t('ideas_change')}</Text>
                </Pressable>
              </View>
            ) : null}
            {ideas.length ? <Text style={[styles.verify, { color: colors.mutedForeground }]}>{t('ideas_verify')}</Text> : null}
          </ScrollView>
        )}
      </View>
      {contactFor ? (
        <PlaceContactSheet visible name={contactFor.title} city={city} onClose={() => setContactFor(null)} />
      ) : null}
    </Modal>
  );
}

function Meta({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={color} />
      <Text numberOfLines={1} style={[styles.metaText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  grabber: { alignSelf: 'center', borderRadius: 3, height: 5, marginTop: 8, width: 40 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  headerButton: { justifyContent: 'center', minHeight: 44, minWidth: 64 },
  headerRight: { alignItems: 'flex-end' },
  headerButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  content: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 4 },
  chipSection: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.6, marginTop: 18, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 10 },
  chip: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 40, paddingHorizontal: 14 },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8, marginTop: 20 },
  segment: { borderRadius: 10, borderWidth: 1, flexDirection: 'row', overflow: 'hidden', padding: 3 },
  segmentItem: { alignItems: 'center', borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 40 },
  segmentText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  days: { gap: 8, paddingRight: 8 },
  dayChip: { borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  dayText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textTransform: 'capitalize' },
  input: { borderRadius: 8, borderWidth: 1, fontFamily: 'Inter_400Regular', fontSize: 15, height: 48, paddingHorizontal: 14 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18, marginTop: 14 },
  primary: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', marginTop: 24 },
  primaryText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  card: { borderRadius: 14, borderWidth: 1, marginTop: 14, padding: 16 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  cardBody: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  meta: { alignItems: 'center', flexDirection: 'row', gap: 4, maxWidth: '100%' },
  metaText: { fontFamily: 'Inter_500Medium', fontSize: 12, flexShrink: 1 },
  addButton: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 10, flexDirection: 'row', gap: 6, marginTop: 14, minHeight: 40, minWidth: 110, justifyContent: 'center', paddingHorizontal: 14 },
  addText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  cardActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contactButton: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 6, marginTop: 14, minHeight: 40, paddingHorizontal: 12 },
  contactText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secondary: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 46 },
  secondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  verify: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 14, textAlign: 'center' },
});
