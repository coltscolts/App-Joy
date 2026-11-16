import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCreateTrip, getGetTripsQueryKey, getGetDestinationSuggestionsQueryKey, useGetDestinationSuggestions } from '@workspace/api-client-react';
import { mobileQueryClient } from '@/lib/queryClient';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { t } from '@/lib/i18n';
import { DatePickerField } from '@/components/DatePickerField';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (tripId: number) => void;
};

type TripType = 'single' | 'multi';
type StopData = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
};

export function TripFormModal({ visible, onClose, onCreated }: Props) {
  const colors = useColors();
  const [name, setName] = useState('');
  const [tripType, setTripType] = useState<TripType>('single');
  const [stops, setStops] = useState<StopData[]>([
    { id: '1', destination: '', startDate: '', endDate: '' }
  ]);
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [error, setError] = useState('');

  const [activeInputId, setActiveInputId] = useState<string | null>(null);

  const activeStop = stops.find(s => s.id === activeInputId);
  const destinationSearch = activeStop ? activeStop.destination.split(',').pop()?.trim() ?? '' : '';
  const canSearchDestinations = Boolean(activeStop) && destinationSearch.length >= 2;
  const destinationParams = { query: destinationSearch, limit: 6 };
  const destinationSuggestionsQuery = useGetDestinationSuggestions(
    destinationParams,
    { query: { enabled: canSearchDestinations, staleTime: 60_000, queryKey: getGetDestinationSuggestionsQueryKey(destinationParams) } },
  );
  const destinationSuggestions = destinationSuggestionsQuery.data ?? [];

  const selectDestination = (suggestion: { label: string }) => {
    if (activeInputId) {
      setStops((prev) =>
        prev.map((stop) => (stop.id === activeInputId ? { ...stop, destination: suggestion.label } : stop))
      );
      setActiveInputId(null);
    }
  };

  const updateStop = (id: string, field: keyof StopData, value: string) => {
    setStops((prev) =>
      prev.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop))
    );
  };

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), destination: '', startDate: '', endDate: '' }
    ]);
  };

  const removeStop = (id: string) => {
    if (stops.length > 2) {
      setStops((prev) => prev.filter((stop) => stop.id !== id));
    }
  };

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    if (type === 'multi' && stops.length < 2) {
      setStops((prev) => [
        ...prev,
        { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), destination: '', startDate: '', endDate: '' }
      ]);
    }
  };

  const createTrip = useCreateTrip({
    mutation: {
      onSuccess: (trip) => {
        mobileQueryClient.invalidateQueries({ queryKey: getGetTripsQueryKey() });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setName('');
        setTripType('single');
        setStops([{ id: '1', destination: '', startDate: '', endDate: '' }]);
        setAdults('1');
        setChildren('0');
        onClose();
        onCreated(trip.id);
      },
    },
  });

  const submit = () => {
    if (!name.trim()) {
      setError(t('trip_form_err_name'));
      return;
    }

    const stopsToSubmit = tripType === 'multi' ? stops : stops.slice(0, 1);

    for (let i = 0; i < stopsToSubmit.length; i++) {
      const stop = stopsToSubmit[i];
      if (!stop.destination.trim() || !stop.startDate || !stop.endDate) {
        setError(
          tripType === 'multi'
            ? t('trip_form_err_dates_stop', { n: i + 1 })
            : t('trip_form_err_dates_single'),
        );
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(stop.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(stop.endDate)) {
        setError(t('trip_form_err_date_format'));
        return;
      }
      if (stop.startDate > stop.endDate) {
        setError(
          tripType === 'multi'
            ? t('trip_form_err_date_order_stop', { n: i + 1 })
            : t('trip_form_err_date_order_single'),
        );
        return;
      }
      if (tripType === 'multi' && i > 0) {
        const prevStop = stopsToSubmit[i - 1];
        if (stop.startDate < prevStop.endDate) {
          setError(t('trip_form_err_stop_overlap'));
          return;
        }
      }
    }

    setError('');

    const destination = tripType === 'multi'
      ? stopsToSubmit.map(s => s.destination.trim()).join(', ')
      : stopsToSubmit[0].destination;
    const startDate = stopsToSubmit[0].startDate;
    const endDate = stopsToSubmit[stopsToSubmit.length - 1].endDate;

    createTrip.mutate({
      data: {
        name: name.trim(),
        tripType,
        destination: destination.trim(),
        startDate,
        endDate,
        adults: Math.max(1, Number(adults) || 1),
        children: Math.max(0, Number(children) || 0),
        stops: tripType === 'multi'
          ? stopsToSubmit.map((s) => ({
              destination: s.destination.trim(),
              startDate: s.startDate,
              endDate: s.endDate
            }))
          : [],
      },
    });
  };

  const visibleStops = tripType === 'multi' ? stops : stops.slice(0, 1);
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable style={styles.iconButton} onPress={onClose} accessibilityLabel={t('trip_form_close_a11y')}>
            <Ionicons name="close" size={26} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.title }]}>{t('trip_form_title')}</Text>
          <View style={styles.iconButton} />
        </View>
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.content}
          bottomOffset={70}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.lead, { color: colors.mutedForeground }]}>
            {t('trip_form_lead')}
          </Text>
          <Field label={t('trip_form_name_label')} value={name} onChangeText={setName} placeholder={t('trip_form_name_placeholder')} colors={colors} />
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t('trip_form_type_label')}</Text>
            <View style={styles.tripTypeOptions}>
              <Pressable
                testID="button-trip-type-single"
                accessibilityRole="button"
                accessibilityState={{ selected: tripType === 'single' }}
                onPress={() => handleTripTypeChange('single')}
                style={[styles.tripTypeOption, { borderColor: tripType === 'single' ? colors.primary : colors.border, backgroundColor: tripType === 'single' ? colors.primary : colors.card }]}
              >
                <Ionicons name="location-outline" size={18} color={tripType === 'single' ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.tripTypeText, { color: tripType === 'single' ? colors.primaryForeground : colors.foreground }]}>{t('trip_form_type_single')}</Text>
              </Pressable>
              <Pressable
                testID="button-trip-type-multi"
                accessibilityRole="button"
                accessibilityState={{ selected: tripType === 'multi' }}
                onPress={() => handleTripTypeChange('multi')}
                style={[styles.tripTypeOption, { borderColor: tripType === 'multi' ? colors.primary : colors.border, backgroundColor: tripType === 'multi' ? colors.primary : colors.card }]}
              >
                <Ionicons name="git-branch-outline" size={18} color={tripType === 'multi' ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.tripTypeText, { color: tripType === 'multi' ? colors.primaryForeground : colors.foreground }]}>{t('trip_form_type_multi')}</Text>
              </Pressable>
            </View>
          </View>

          {visibleStops.map((stop, index) => (
            <View key={stop.id} style={tripType === 'multi' ? [styles.stopBlock, { borderColor: colors.border, backgroundColor: colors.card }] : undefined}>
              {tripType === 'multi' && (
                <View style={styles.stopHeader}>
                  <Text style={[styles.stopLabel, { color: colors.foreground }]}>{t('trip_form_stop_label', { n: index + 1 })}</Text>
                  {stops.length > 2 && (
                    <Pressable onPress={() => removeStop(stop.id)} accessibilityLabel={t('trip_form_remove_stop_a11y', { n: index + 1 })} style={styles.removeStopButton} testID={`button-remove-stop-${index}`}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              )}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t('trip_form_destination_label')}</Text>
                <TextInput
                  value={stop.destination}
                  onChangeText={(val) => {
                    setActiveInputId(stop.id);
                    updateStop(stop.id, 'destination', val);
                  }}
                  onFocus={() => setActiveInputId(stop.id)}
                  placeholder={tripType === 'multi' ? t('trip_form_destination_placeholder_multi') : t('trip_form_destination_placeholder_single')}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                  style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: tripType === 'multi' ? colors.background : colors.card }]}
                />
                {activeInputId === stop.id && canSearchDestinations ? (
                  <View style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {destinationSuggestionsQuery.isFetching ? (
                      <View style={styles.suggestion}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.suggestionText, { color: colors.mutedForeground }]}>{t('trip_form_searching_cities')}</Text>
                      </View>
                    ) : null}
                    {destinationSuggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion.label}
                        accessibilityRole="button"
                        testID={`destination-suggestion-${suggestion.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        onPress={() => selectDestination(suggestion)}
                        style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Ionicons name="location-outline" size={17} color={colors.mutedForeground} />
                        <Text style={[styles.suggestionText, { color: colors.foreground }]}>{suggestion.label}</Text>
                      </Pressable>
                    ))}
                    {!destinationSuggestionsQuery.isFetching && !destinationSuggestionsQuery.isError && destinationSuggestions.length === 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        testID="destination-use-manual"
                        onPress={() => setActiveInputId(null)}
                        style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Ionicons name="create-outline" size={17} color={colors.primary} />
                        <Text style={[styles.suggestionText, { color: colors.primary }]}>{t('trip_form_use_as_destination', { v: stop.destination.trim() })}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <DatePickerField label={t('trip_form_date_start_label')} value={stop.startDate} onChange={(startDate) => {
                    updateStop(stop.id, 'startDate', startDate);
                    if (stop.endDate && stop.endDate < startDate) updateStop(stop.id, 'endDate', startDate);
                  }} minimumDate={tripType === 'multi' && index > 0 ? stops[index - 1]?.endDate : ''} testID={tripType === 'multi' ? `button-start-date-${index}` : 'button-start-date'} backgroundColor={tripType === 'multi' ? colors.background : colors.card} />
                </View>
                <View style={styles.halfField}>
                  <DatePickerField label={t('trip_form_date_end_label')} value={stop.endDate} onChange={(endDate) => updateStop(stop.id, 'endDate', endDate)} minimumDate={stop.startDate} testID={tripType === 'multi' ? `button-end-date-${index}` : 'button-end-date'} backgroundColor={tripType === 'multi' ? colors.background : colors.card} />
                </View>
              </View>
            </View>
          ))}

          {tripType === 'multi' && (
            <Pressable onPress={addStop} style={[styles.addStopButton, { borderColor: colors.border }]} testID="button-add-stop">
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.addStopText, { color: colors.primary }]}>{t('trip_form_add_stop')}</Text>
            </Pressable>
          )}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Field label={t('trip_form_adults_label')} value={adults} onChangeText={setAdults} keyboardType="number-pad" colors={colors} />
            </View>
            <View style={styles.halfField}>
              <Field label={t('trip_form_children_label')} value={children} onChangeText={setChildren} keyboardType="number-pad" colors={colors} />
            </View>
          </View>
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          {createTrip.isError ? <Text style={[styles.error, { color: colors.destructive }]}>{t('trip_form_save_error')}</Text> : null}
          <Pressable
            testID="button-save-trip"
            accessibilityRole="button"
            disabled={createTrip.isPending}
            onPress={submit}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary, opacity: pressed || createTrip.isPending ? 0.8 : 1 },
            ]}
          >
            {createTrip.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{t('trip_form_save')}</Text>}
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 12 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  iconButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  content: { padding: 20, paddingBottom: 44 },
  lead: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 8, borderWidth: 1, fontFamily: 'Inter_400Regular', fontSize: 16, height: 50, paddingHorizontal: 14 },
  suggestions: { borderRadius: 8, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  suggestion: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 43, paddingHorizontal: 12 },
  suggestionText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  tripTypeOptions: { flexDirection: 'row', gap: 10 },
  tripTypeOption: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 48, paddingHorizontal: 8 },
  tripTypeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  stopBlock: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16 },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stopLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  removeStopButton: { padding: 4 },
  addStopButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 14, marginBottom: 24, gap: 6 },
  addStopText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  saveButton: { alignItems: 'center', borderRadius: 8, height: 52, justifyContent: 'center', marginTop: 4 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});
