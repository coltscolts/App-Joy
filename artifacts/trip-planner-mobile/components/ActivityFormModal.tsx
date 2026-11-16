import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDestinationForDate,
  flightLookup,
  getGetDestinationSuggestionsQueryKey,
  getGetHotelSuggestionsQueryKey,
  getGetTripActivitiesQueryKey,
  useCreateActivity,
  useCreateHotelStays,
  useGetDestinationSuggestions,
  useGetHotelSuggestions,
  useGetSuggestions,
  useGetTripActivities,
  useUpdateActivity,
  type Activity,
  type ActivitySuggestion,
  type HotelSuggestion,
  type Trip,
} from '@workspace/api-client-react';
import { mobileQueryClient } from '@/lib/queryClient';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { DatePickerField } from '@/components/DatePickerField';
import { TimePickerField } from '@/components/TimePickerField';
import { isoDateTimeToTime24 } from '@/lib/dateTime';
import {
  getReminderLeadMinutes,
  isActivityReminderScheduled,
  REMINDER_TIMING_OPTIONS,
  requestReminderPermission,
  scheduleActivityReminder,
  cancelActivityReminder,
} from '@/lib/reminders';
import { t, formatTime, formatDateForDisplay, locale, language } from '@/lib/i18n';
import { SuggestionParamsLanguage, FlightLookupLanguage, type ExtractedBooking } from '@workspace/api-client-react';
import { bookingToFormPatch, pickAndReadBookingScreenshot, ScanError } from '@/lib/bookingScan';
import { paywallReasonFromCode, usePlan } from '@/contexts/PlanContext';
import { ApiError } from '@workspace/api-client-react';
import { readableWidth } from '@/constants/layout';

// ─── Category definitions ─────────────────────────────────────────────────────
// `value` is the stored enum — never translated. `labelKey` drives the UI label.
const categoryDefs = [
  { value: 'cultural', labelKey: 'category_cultural' as const, icon: 'sparkles-outline' as const },
  { value: 'fitness', labelKey: 'category_fitness' as const, icon: 'fitness-outline' as const },
  { value: 'tour', labelKey: 'category_tour' as const, icon: 'compass-outline' as const },
  { value: 'restaurant', labelKey: 'category_restaurant' as const, icon: 'restaurant-outline' as const },
  { value: 'bar', labelKey: 'category_bar' as const, icon: 'wine-outline' as const },
  { value: 'flight', labelKey: 'category_flight' as const, icon: 'airplane-outline' as const },
  { value: 'hotel', labelKey: 'category_hotel' as const, icon: 'bed-outline' as const },
  { value: 'train', labelKey: 'category_train' as const, icon: 'train-outline' as const },
  { value: 'nightlife', labelKey: 'category_nightlife' as const, icon: 'moon-outline' as const },
  { value: 'kids', labelKey: 'category_kids' as const, icon: 'people-outline' as const },
  { value: 'transfer', labelKey: 'category_transfer' as const, icon: 'car-outline' as const },
  { value: 'transportation', labelKey: 'category_transportation' as const, icon: 'bus-outline' as const },
  { value: 'general', labelKey: 'category_general' as const, icon: 'help-circle-outline' as const },
];

// ─── Category field configs ───────────────────────────────────────────────────
function getCategoryFieldConfig(cat: string) {
  const cfgMap: Record<string, {
    titleLabel: string;
    titlePlaceholder: string;
    timeLabel: string;
    timePlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    detailsPlaceholder: string;
  }> = {
    flight: {
      titleLabel: t('cfc_flight_title_label'),
      titlePlaceholder: t('cfc_flight_title_ph'),
      timeLabel: t('cfc_flight_time_label'),
      timePlaceholder: t('cfc_flight_time_ph'),
      locationLabel: t('cfc_flight_location_label'),
      locationPlaceholder: t('cfc_flight_location_ph'),
      detailsPlaceholder: t('cfc_flight_details_ph'),
    },
    hotel: {
      titleLabel: t('cfc_hotel_title_label'),
      titlePlaceholder: t('cfc_hotel_title_ph'),
      timeLabel: t('cfc_hotel_time_label'),
      timePlaceholder: t('cfc_hotel_time_ph'),
      locationLabel: t('cfc_hotel_location_label'),
      locationPlaceholder: t('cfc_hotel_location_ph'),
      detailsPlaceholder: t('cfc_hotel_details_ph'),
    },
    restaurant: {
      titleLabel: t('cfc_restaurant_title_label'),
      titlePlaceholder: t('cfc_restaurant_title_ph'),
      timeLabel: t('cfc_restaurant_time_label'),
      timePlaceholder: t('cfc_restaurant_time_ph'),
      locationLabel: t('cfc_restaurant_location_label'),
      locationPlaceholder: t('cfc_restaurant_location_ph'),
      detailsPlaceholder: t('cfc_restaurant_details_ph'),
    },
    bar: {
      titleLabel: t('cfc_bar_title_label'),
      titlePlaceholder: t('cfc_bar_title_ph'),
      timeLabel: t('cfc_bar_time_label'),
      timePlaceholder: t('cfc_bar_time_ph'),
      locationLabel: t('cfc_bar_location_label'),
      locationPlaceholder: t('cfc_bar_location_ph'),
      detailsPlaceholder: t('cfc_bar_details_ph'),
    },
  };
  return cfgMap[cat] ?? {
    titleLabel: t('cfc_general_title_label'),
    titlePlaceholder: t('cfc_general_title_ph'),
    timeLabel: t('cfc_general_time_label'),
    timePlaceholder: t('cfc_general_time_ph'),
    locationLabel: t('cfc_general_location_label'),
    locationPlaceholder: t('cfc_general_location_ph'),
    detailsPlaceholder: t('cfc_general_details_ph'),
  };
}

type Props = { trip: Trip; visible: boolean; onClose: () => void; activity?: Activity | null };
type Suggestion = { value: string; detail?: string };
type HotelStayForm = {
  name: string;
  address: string;
  city: string;
  checkIn: string;
  checkOut: string;
  placeId: string;
};

function initialHotelStay(trip: Trip, activity?: Activity | null): HotelStayForm {
  const checkIn = activity?.date ?? trip.startDate;
  return {
    name: activity?.title ?? '',
    address: activity?.location ?? '',
    city: activity?.city ?? getDestinationForDate(checkIn, trip) ?? '',
    checkIn,
    checkOut: activity?.endDate ?? trip.endDate,
    placeId: activity?.placeId ?? '',
  };
}

function midpointDate(startDate: string, endDate: string) {
  const toUtc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  const start = toUtc(startDate);
  const end = toUtc(endDate);
  const midpoint = new Date(start + Math.floor((end - start) / 2));
  return midpoint.toISOString().slice(0, 10);
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function uniqueSuggestions(suggestions: Suggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = normalize(suggestion.value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ActivityFormModal({ trip, visible, onClose, activity }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // En iOS la hoja ya queda bajo la barra de estado; en Android hay que dejar el margen.
  const headerTopInset = Platform.OS === 'ios' ? 0 : insets.top;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(trip.startDate);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [details, setDetails] = useState('');
  const [kidFriendly, setKidFriendly] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [isLookingUpFlight, setIsLookingUpFlight] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ActivitySuggestion[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(60);
  const [isCheckingReminder, setIsCheckingReminder] = useState(false);
  const [error, setError] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');
  const [hotelMode, setHotelMode] = useState<1 | 2>(1);
  const [hotelStays, setHotelStays] = useState<HotelStayForm[]>([initialHotelStay(trip, activity)]);
  const [hotelSearchUnavailable, setHotelSearchUnavailable] = useState(false);
  const isEditing = Boolean(activity);
  const categoryFieldConfig = getCategoryFieldConfig(category);

  const createActivity = useCreateActivity();
  const createHotelStays = useCreateHotelStays();
  const updateActivity = useUpdateActivity();
  const aiSuggestionMutation = useGetSuggestions();
  const [isSaving, setIsSaving] = useState(false);
  const plan = usePlan();
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const tripActivitiesQuery = useGetTripActivities(trip.id, {
    query: {
      enabled: visible,
      queryKey: getGetTripActivitiesQueryKey(trip.id),
    },
  });
  const citySearch = city.split(',')[0]?.trim() ?? '';
  const canSearchCities = visible && citySearch.length >= 2;
  const cityParams = { query: citySearch, limit: 6 };
  const cityQuery = useGetDestinationSuggestions(
    cityParams,
    {
      query: {
        enabled: canSearchCities,
        staleTime: 60_000,
        queryKey: getGetDestinationSuggestionsQueryKey(cityParams),
      },
    },
  );

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setTitle(activity?.title ?? '');
    setDate(activity?.date ?? trip.startDate);
    setTime(activity?.time ?? '');
    setLocation(activity?.location ?? '');
    setCity(activity?.city ?? getDestinationForDate(activity?.date ?? trip.startDate, trip) ?? '');
    setDetails(activity?.details ?? activity?.description ?? '');
    setKidFriendly(activity?.kidFriendly ?? false);
    setCategory(activity?.category ?? '');
    setFlightNumber(activity?.flightNumber ?? '');
    setAiSuggestions([]);
    // The server preference is not enough to show an active reminder. A
    // native notification record may be missing after a reinstall or restore.
    setReminderEnabled(false);
    setIsCheckingReminder(Boolean(activity?.reminderEnabled));
    setReminderLeadMinutes(60);
    if (activity) {
      void getReminderLeadMinutes(activity.id).then(setReminderLeadMinutes);
      if (activity.reminderEnabled) {
        void isActivityReminderScheduled(activity.id)
          .then((scheduled) => {
            if (mounted) setReminderEnabled(scheduled);
          })
          .catch(() => {
            if (mounted) setReminderEnabled(false);
          })
          .finally(() => {
            if (mounted) setIsCheckingReminder(false);
          });
      }
    }
    setError('');
    setPermissionMessage('');
    setScanNotice(null);
    setIsScanning(false);
    setHotelMode(1);
    setHotelStays([initialHotelStay(trip, activity)]);
    return () => {
      mounted = false;
    };
  }, [activity, trip, visible]);

  const applyExtractedBooking = (booking: ExtractedBooking) => {
    const patch = bookingToFormPatch(booking, trip, { confirmation: t('scan_confirmation') });
    setCategory(patch.category);
    setCategoryOpen(false);
    setTitle(patch.title);
    if (patch.date) setDate(patch.date);
    if (patch.time) setTime(patch.time);
    if (patch.location) setLocation(patch.location);
    if (patch.city) setCity(patch.city);
    if (patch.flightNumber) setFlightNumber(patch.flightNumber);
    if (patch.details) setDetails(patch.details);
    if (patch.hotel) {
      setHotelMode(1);
      setHotelStays([{
        name: patch.hotel.name,
        address: patch.hotel.address,
        city: patch.hotel.city ?? getDestinationForDate(patch.hotel.checkIn, trip) ?? '',
        checkIn: patch.hotel.checkIn,
        checkOut: patch.hotel.checkOut,
        placeId: '',
      }]);
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScanNotice(patch.dateOutsideTrip
      ? { tone: 'warning', text: t('scan_date_outside', { date: formatDateForDisplay(patch.dateOutsideTrip) }) }
      : { tone: 'success', text: t('scan_success') });
  };

  const scanScreenshot = async () => {
    setScanNotice(null);
    setIsScanning(true);
    try {
      const bookings = await pickAndReadBookingScreenshot({ language, tripId: trip.id });
      if (bookings.length === 1) {
        applyExtractedBooking(bookings[0]);
        return;
      }
      Alert.alert(t('scan_choose_title'), t('scan_choose_body'), [
        ...bookings.map((booking) => ({ text: booking.title, onPress: () => applyExtractedBooking(booking) })),
        { text: t('form_cancel'), style: 'cancel' as const },
      ]);
    } catch (scanError) {
      const code = scanError instanceof ScanError ? scanError.code : 'failed';
      if (code === 'cancelled') return;
      if (code === 'limit' && plan) {
        plan.openPaywall('scans');
        return;
      }
      const messages = {
        not_configured: t('scan_not_configured'),
        rate_limited: t('scan_rate_limited'),
        no_bookings: t('scan_no_bookings'),
        limit: t('scan_failed'),
        failed: t('scan_failed'),
      } as const;
      setScanNotice({ tone: 'error', text: messages[code] });
    } finally {
      setIsScanning(false);
    }
  };

  const selectHotelMode = (mode: 1 | 2) => {
    setHotelMode(mode);
    if (mode === 1) {
      setHotelStays((current) => [{
        ...(current[0] ?? initialHotelStay(trip)),
        checkIn: trip.startDate,
        checkOut: trip.endDate,
      }]);
      return;
    }
    const boundary = midpointDate(trip.startDate, trip.endDate);
    setHotelStays((current) => [
      { ...(current[0] ?? initialHotelStay(trip)), checkIn: trip.startDate, checkOut: boundary },
      {
        name: '',
        address: '',
        city: getDestinationForDate(boundary, trip) ?? '',
        checkIn: boundary,
        checkOut: trip.endDate,
        placeId: '',
      },
    ]);
  };

  const updateHotelStay = (index: number, patch: Partial<HotelStayForm>) => {
    setHotelStays((current) => current.map((stay, stayIndex) => {
      if (stayIndex === index) return { ...stay, ...patch };
      if (hotelMode === 2 && index === 0 && stayIndex === 1 && patch.checkOut !== undefined) {
        return { ...stay, checkIn: patch.checkOut };
      }
      if (hotelMode === 2 && index === 1 && stayIndex === 0 && patch.checkIn !== undefined) {
        return { ...stay, checkOut: patch.checkIn };
      }
      return stay;
    }));
  };

  const routeCityOptions = useMemo(() => {
    const suggestedCity = getDestinationForDate(date, trip) ?? '';
    const tripCities = trip.tripType === 'multi'
      ? trip.stops.map((stop) => stop.destination)
      : [trip.destination];

    return uniqueSuggestions([
      ...(suggestedCity ? [{ value: suggestedCity, detail: t('suggestion_stop_day') }] : []),
      ...tripCities.map((value) => ({ value, detail: t('suggestion_in_itinerary') })),
    ]);
  }, [date, trip]);

  const cityOptions = useMemo(() => uniqueSuggestions([
    ...routeCityOptions,
    ...(cityQuery.data ?? []).map((suggestion) => ({ value: suggestion.label, detail: t('suggestion_world_catalog') })),
  ]), [cityQuery.data, routeCityOptions]);

  const placeOptions = useMemo(() => uniqueSuggestions(
    (tripActivitiesQuery.data ?? [])
      .filter((item) => item.id !== activity?.id && Boolean(item.location?.trim()))
      .map((item) => ({ value: item.location!.trim(), detail: t('suggestion_used_trip') })),
  ), [activity?.id, tripActivitiesQuery.data]);

  const handleDateChange = (nextDate: string) => {
    const previousSuggestedCity = getDestinationForDate(date, trip) ?? '';
    setDate(nextDate);
    const nextSuggestedCity = getDestinationForDate(nextDate, trip) ?? '';
    setCity((currentCity) => (!currentCity || normalize(currentCity) === normalize(previousSuggestedCity)
      ? nextSuggestedCity
      : currentCity));
  };

  const handleFlightLookup = async () => {
    const normalizedFlightNumber = flightNumber.trim().toUpperCase();
    if (!normalizedFlightNumber) {
      setError(t('activity_err_flight_number'));
      return;
    }

    setIsLookingUpFlight(true);
    setError('');
    try {
      const data = await flightLookup({
        flightNumber: normalizedFlightNumber,
        date,
        language: language === 'es' ? FlightLookupLanguage.es : FlightLookupLanguage.en,
      });
      const departure = data.departure;
      const arrival = data.arrival;
      const fmtTime = (value?: string) => value ? formatTime(value) : '';
      const departureName = departure?.airport || departure?.iata || '';
      const arrivalName = arrival?.airport || arrival?.iata || '';
      const route = [departureName, arrivalName].filter(Boolean).join(' → ');
      const detailLines = [
        `${t('flight_status_label')}: ${data.status || t('flight_status_unavailable')}`,
        departure?.terminal ? `${t('flight_dep_terminal')}: ${departure.terminal}` : '',
        departure?.gate ? `${t('flight_dep_gate')}: ${departure.gate}` : '',
        arrival?.terminal ? `${t('flight_arr_terminal')}: ${arrival.terminal}` : '',
        arrival?.gate ? `${t('flight_arr_gate')}: ${arrival.gate}` : '',
        arrival?.scheduled ? `${t('flight_arr_time')}: ${fmtTime(arrival.scheduled)}` : '',
      ].filter(Boolean);

      setFlightNumber(data.flightNumber || normalizedFlightNumber);
      setTitle(`${data.airline || t('flight_fallback_airline')} ${data.flightNumber || normalizedFlightNumber}`);
      setTime(isoDateTimeToTime24(departure?.scheduled));
      if (route) setLocation(route);
      setDetails(detailLines.join('\n'));
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : t('activity_err_flight_data'));
    } finally {
      setIsLookingUpFlight(false);
    }
  };

  const handleAiSuggestions = async () => {
    const destination = city.trim() || getDestinationForDate(date, trip) || '';
    if (!category) {
      setError(t('activity_err_no_suggestions_category'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError(t('activity_err_no_suggestions_date'));
      return;
    }
    if (!destination) {
      setError(t('activity_err_no_suggestions_city'));
      return;
    }

    setError('');
    try {
      const suggestions = await aiSuggestionMutation.mutateAsync({
        data: {
          destination,
          adults: trip.adults,
          children: trip.children,
          category,
          date,
          budget: 'medium',
          language: language === 'es' ? SuggestionParamsLanguage.es : SuggestionParamsLanguage.en,
        },
      });
      setAiSuggestions(suggestions);
      plan?.refetchPlan();
    } catch (suggestError) {
      const reason = suggestError instanceof ApiError && suggestError.status === 402
        ? paywallReasonFromCode((suggestError.data as { code?: string } | null)?.code)
        : null;
      if (reason && plan) plan.openPaywall(reason);
      else setError(t('activity_err_no_suggestions'));
    }
  };

  const applyAiSuggestion = (suggestion: ActivitySuggestion) => {
    const suggestionDetails = [
      suggestion.description,
      suggestion.estimatedTime,
      suggestion.kidFriendly ? '' : '',
    ].filter(Boolean).join('\n');

    setTitle(suggestion.title);
    setLocation(suggestion.location);
    setDetails(suggestionDetails);
    setKidFriendly(suggestion.kidFriendly);
    setAiSuggestions([]);
  };

  const handleReminderChange = async (enabled: boolean) => {
    if (!enabled) {
      setReminderEnabled(false);
      setPermissionMessage('');
      return;
    }

    if (!time.trim()) {
      setError(t('activity_err_time_for_reminder'));
      return;
    }

    try {
      const permission = await requestReminderPermission();
      if (permission.granted) {
        setError('');
        setPermissionMessage('');
        setReminderEnabled(true);
      } else {
        setReminderEnabled(false);
        setPermissionMessage(permission.message ?? t('reminder_no_permission'));
      }
    } catch {
      setReminderEnabled(false);
      setPermissionMessage(t('reminder_no_permission'));
    }
  };

  const submit = async () => {
    if (!category) {
      setError(t('activity_err_category'));
      return;
    }
    const isHotel = category === 'hotel';
    if (!isHotel && (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      setError(t('activity_err_title_date'));
      return;
    }
    setError('');
    const selected = categoryDefs.find((item) => item.value === category);
    if (!selected) {
      setError(t('activity_err_valid_category'));
      return;
    }
    const reminderRequested = reminderEnabled;
    if (isHotel) {
      const stays = hotelStays.slice(0, isEditing ? 1 : hotelMode);
      const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
      if (stays.some((stay) => (
        !stay.name.trim()
        || !stay.address.trim()
        || !stay.city.trim()
        || !validDate(stay.checkIn)
        || !validDate(stay.checkOut)
      ))) {
        setError(t('hotel_err_required'));
        return;
      }
      if (stays.some((stay) => stay.checkIn > stay.checkOut)) {
        setError(t('hotel_err_date_order'));
        return;
      }
      if (!isEditing && (
        stays[0].checkIn !== trip.startDate
        || stays[stays.length - 1].checkOut !== trip.endDate
        || (stays.length === 2 && stays[0].checkOut !== stays[1].checkIn)
      )) {
        setError(t('hotel_err_coverage'));
        return;
      }
    }
    const data = {
      tripId: trip.id,
      day: new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'long' }),
      date,
      type: activity?.type ?? selected.value,
      category: selected.value,
      flightNumber: category === 'flight' ? flightNumber.trim() || null : null,
      title: title.trim(),
      time: time.trim() || null,
      location: location.trim() || null,
      city: city.trim() || null,
      details: details.trim() || null,
      description: details.trim() || null,
      kidFriendly,
      // Do not display an enabled reminder until the native schedule succeeds.
      reminderEnabled: false,
      status: activity?.status ?? 'confirmed',
    };

    setIsSaving(true);
    try {
      const hotelData = (stay: HotelStayForm) => ({
        ...data,
        day: new Date(`${stay.checkIn}T12:00:00`).toLocaleDateString(locale, { weekday: 'long' }),
        date: stay.checkIn,
        endDate: stay.checkOut,
        type: 'hotel',
        category: 'hotel',
        title: stay.name.trim(),
        location: stay.address.trim() || null,
        placeId: stay.placeId.trim() || null,
        city: stay.city.trim() || null,
      });
      const savedActivities = category === 'hotel'
        ? activity
          ? [await updateActivity.mutateAsync({ id: activity.id, data: hotelData(hotelStays[0]) })]
          : await createHotelStays.mutateAsync({ data: { stays: hotelStays.slice(0, hotelMode).map(hotelData) } })
        : [activity
          ? await updateActivity.mutateAsync({ id: activity.id, data })
          : await createActivity.mutateAsync({ data })];

      for (const savedActivity of savedActivities) {
        await cancelActivityReminder(savedActivity.id);
        if (reminderRequested) {
          const reminder = await scheduleActivityReminder(savedActivity, reminderLeadMinutes);
          if (reminder.status === 'scheduled') {
            try {
              await updateActivity.mutateAsync({ id: savedActivity.id, data: { reminderEnabled: true } });
            } catch {
              await cancelActivityReminder(savedActivity.id);
              Alert.alert(t('activity_saved_title'), t('activity_saved_no_reminder'));
            }
          } else {
            Alert.alert(t('activity_saved_title'), reminder.message);
          }
        }
      }

      mobileQueryClient.invalidateQueries({ queryKey: getGetTripActivitiesQueryKey(trip.id) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      // Mutation errors are rendered below without closing the form.
    } finally {
      setIsSaving(false);
    }
  };

  // AI body with plural-aware interpolation
  const aiBodyText = t('activity_form_ai_body', {
    adults: trip.adults,
    sa: trip.adults === 1 ? '' : 's',
    children: trip.children,
    sc: trip.children === 1 ? '' : 's',
    childWord: trip.children === 1 ? 'child' : 'children',
  });

  return (
    <Modal
      animationType="slide"
      visible={visible}
      // iOS: hoja deslizable bajo la barra de estado; se cierra deslizando hacia abajo.
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {Platform.OS === 'ios' ? <View style={[styles.grabber, { backgroundColor: colors.border }]} /> : null}
        <View style={[styles.header, { borderBottomColor: colors.border, height: 58 + headerTopInset, paddingTop: headerTopInset }]}>
          <Pressable
            style={styles.headerButton}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('activity_form_close_a11y')}
            testID="button-cancel-activity-header"
          >
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>{t('form_cancel')}</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.title }]}>{isEditing ? t('activity_form_title_edit') : t('activity_form_title_new')}</Text>
          <View style={styles.headerButton} />
        </View>
        <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.content, readableWidth]} bottomOffset={70} keyboardShouldPersistTaps="handled">
          {!isEditing ? (
            <Pressable
              testID="button-scan-booking"
              accessibilityRole="button"
              accessibilityHint={t('scan_subtitle')}
              accessibilityState={{ busy: isScanning, disabled: isScanning }}
              disabled={isScanning}
              onPress={() => void scanScreenshot()}
              style={({ pressed }) => [
                styles.scanCard,
                { borderColor: colors.primary, backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.scanIcon, { backgroundColor: colors.primary }]}>
                {isScanning
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Ionicons name="scan-outline" size={22} color={colors.primaryForeground} />}
              </View>
              <View style={styles.scanText}>
                <Text style={[styles.scanTitle, { color: colors.foreground }]}>{isScanning ? t('scan_reading') : t('scan_title')}</Text>
                <Text style={[styles.scanSubtitle, { color: colors.mutedForeground }]}>{t('scan_subtitle')}</Text>
              </View>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
            </Pressable>
          ) : null}
          {scanNotice ? (
            <View
              testID="scan-notice"
              accessibilityLiveRegion="polite"
              style={[
                styles.scanNotice,
                {
                  borderColor: scanNotice.tone === 'error' ? colors.destructive : scanNotice.tone === 'warning' ? '#D97706' : colors.primary,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <Ionicons
                name={scanNotice.tone === 'error' ? 'alert-circle-outline' : scanNotice.tone === 'warning' ? 'warning-outline' : 'checkmark-circle-outline'}
                size={18}
                color={scanNotice.tone === 'error' ? colors.destructive : scanNotice.tone === 'warning' ? '#D97706' : colors.primary}
              />
              <Text style={[styles.scanNoticeText, { color: colors.foreground }]}>{scanNotice.text}</Text>
            </View>
          ) : null}
          <Text style={[styles.label, { color: colors.foreground }]}>{t('activity_form_type_label')}</Text>
          <View style={styles.dropdownField}>
            <Pressable
              testID="select-category"
              accessibilityRole="button"
              accessibilityState={{ expanded: categoryOpen }}
              onPress={() => setCategoryOpen((open) => !open)}
              style={({ pressed }) => [
                styles.dropdownTrigger,
                { borderColor: categoryOpen ? colors.primary : colors.input, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name={categoryDefs.find((item) => item.value === category)?.icon ?? 'apps-outline'} size={20} color={colors.primary} />
              <Text style={[styles.dropdownValue, { color: colors.foreground }]}>
                {categoryDefs.find((item) => item.value === category) ? t(categoryDefs.find((item) => item.value === category)!.labelKey) : t('activity_form_type_placeholder')}
              </Text>
              <Ionicons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={19} color={colors.mutedForeground} />
            </Pressable>
            {categoryOpen ? (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {categoryDefs.map((item) => {
                  const active = item.value === category;
                  return (
                    <Pressable
                      key={item.value}
                      testID={`category-option-${item.value}`}
                      onPress={() => {
                        setCategory(item.value);
                        setAiSuggestions([]);
                        setCategoryOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownOption,
                        { backgroundColor: active ? colors.accent : colors.card, opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Ionicons name={item.icon} size={18} color={active ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.dropdownOptionText, { color: colors.foreground }]}>{t(item.labelKey)}</Text>
                      {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          {category === 'flight' ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t('activity_form_flight_number_label')}</Text>
              <View style={styles.flightLookupRow}>
                <TextInput
                  value={flightNumber}
                  onChangeText={setFlightNumber}
                  autoCapitalize="characters"
                  placeholder="AA100, AM456, IB321"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.flightNumberInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
                  testID="input-flight-number"
                />
                <Pressable
                  testID="button-lookup-flight"
                  disabled={isLookingUpFlight}
                  onPress={() => void handleFlightLookup()}
                  style={({ pressed }) => [
                    styles.flightLookupButton,
                    { backgroundColor: colors.primary, opacity: pressed || isLookingUpFlight ? 0.75 : 1 },
                  ]}
                >
                  {isLookingUpFlight ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Ionicons name="search-outline" size={18} color={colors.primaryForeground} />
                      <Text style={[styles.flightLookupText, { color: colors.primaryForeground }]}>{t('activity_form_flight_autocomplete')}</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                {t('activity_form_flight_helper')}
              </Text>
            </View>
          ) : null}
          {category === 'hotel' ? (
            <>
              {!isEditing ? (
                <View style={styles.hotelModeSection}>
                  <Text style={[styles.label, { color: colors.foreground }]}>{t('hotel_mode_question')}</Text>
                  <View style={styles.hotelModeRow}>
                    {([1, 2] as const).map((mode) => (
                      <Pressable
                        key={mode}
                        testID={`hotel-mode-${mode}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: hotelMode === mode }}
                        onPress={() => selectHotelMode(mode)}
                        style={[styles.hotelModeOption, {
                          backgroundColor: hotelMode === mode ? colors.accent : colors.card,
                          borderColor: hotelMode === mode ? colors.primary : colors.border,
                        }]}
                      >
                        <Text style={[styles.hotelModeText, { color: colors.foreground }]}>
                          {t(mode === 1 ? 'hotel_mode_one' : 'hotel_mode_two')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {hotelStays.slice(0, isEditing ? 1 : hotelMode).map((stay, index) => (
                <HotelStayFields
                  key={index}
                  index={index}
                  stay={stay}
                  showHeading={!isEditing && hotelMode === 2}
                  colors={colors}
                  onChange={(patch) => updateHotelStay(index, patch)}
                  searchUnavailable={hotelSearchUnavailable}
                  onSearchUnavailable={() => setHotelSearchUnavailable(true)}
                  trip={trip}
                  minimumCheckInDate={index > 0 ? hotelStays[index - 1]?.checkIn || trip.startDate : trip.startDate}
                />
              ))}
              <TimePickerField
                label={t('cfc_hotel_time_label')}
                value={time}
                placeholder={t('cfc_hotel_time_ph')}
                onChange={setTime}
              />
            </>
          ) : (
            <>
          <Field label={categoryFieldConfig.titleLabel} value={title} onChangeText={setTitle} placeholder={categoryFieldConfig.titlePlaceholder} colors={colors} />
          <View style={styles.row}>
            <View style={styles.halfField}><DatePickerField label={t('activity_form_date_label')} value={date} onChange={handleDateChange} minimumDate={trip.startDate} maximumDate={trip.endDate} testID="input-date" /></View>
            <View style={styles.halfField}>
              <TimePickerField
                label={categoryFieldConfig.timeLabel}
                value={time}
                placeholder={categoryFieldConfig.timePlaceholder}
                onChange={setTime}
              />
            </View>
          </View>
          <SuggestionField
            label={t('activity_form_city_label')}
            value={city}
            onChangeText={setCity}
            options={cityOptions}
            placeholder={t('activity_form_city_placeholder')}
            colors={colors}
            inputTestID="input-city"
            suggestionTestPrefix="city-suggestion"
            manualTestID="city-use-manual"
            manualLabel="city"
            loading={cityQuery.isFetching}
            helperText={t('activity_form_city_helper')}
            searchingText={t('activity_form_searching_cities')}
            useAsManualKey="activity_form_use_as_city"
          />
          <View style={[styles.aiPanel, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <View style={styles.aiHeader}>
              <View style={styles.aiCopy}>
                <Text style={[styles.aiTitle, { color: colors.foreground }]}>{t('activity_form_ai_title')}</Text>
                <Text style={[styles.aiBody, { color: colors.mutedForeground }]}>{aiBodyText}</Text>
              </View>
              <Pressable
                testID="button-ai-suggestions"
                disabled={aiSuggestionMutation.isPending}
                onPress={() => void handleAiSuggestions()}
                style={({ pressed }) => [styles.aiButton, { backgroundColor: colors.primary, opacity: pressed || aiSuggestionMutation.isPending ? 0.75 : 1 }]}
              >
                {aiSuggestionMutation.isPending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Ionicons name="sparkles-outline" size={18} color={colors.primaryForeground} />}
                <Text style={[styles.aiButtonText, { color: colors.primaryForeground }]}>{aiSuggestionMutation.isPending ? t('activity_form_ai_thinking') : t('activity_form_ai_suggest')}</Text>
              </Pressable>
            </View>
            {aiSuggestions.length > 0 ? (
              <View style={styles.aiSuggestions}>
                {aiSuggestions.map((suggestion, index) => (
                  <Pressable
                    key={`${suggestion.title}-${index}`}
                    testID={`ai-suggestion-${index}`}
                    onPress={() => applyAiSuggestion(suggestion)}
                    style={({ pressed }) => [styles.aiSuggestion, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View style={styles.aiSuggestionTitleRow}>
                      <Text style={[styles.aiSuggestionTitle, { color: colors.foreground }]}>{suggestion.title}</Text>
                      {suggestion.kidFriendly ? <Ionicons name="people-outline" size={17} color={colors.primary} /> : null}
                    </View>
                    <Text style={[styles.aiSuggestionMeta, { color: colors.mutedForeground }]}>{suggestion.location} · {suggestion.estimatedTime}</Text>
                    <Text style={[styles.aiSuggestionDescription, { color: colors.foreground }]}>{suggestion.description}</Text>
                  </Pressable>
                ))}
                <Text style={[styles.aiDisclaimer, { color: colors.mutedForeground }]}>{t('activity_form_ai_disclaimer')}</Text>
              </View>
            ) : null}
          </View>
          <SuggestionField
            label={categoryFieldConfig.locationLabel}
            value={location}
            onChangeText={setLocation}
            options={placeOptions}
            placeholder={categoryFieldConfig.locationPlaceholder}
            colors={colors}
            inputTestID="input-location"
            suggestionTestPrefix="place-suggestion"
            manualTestID="place-use-manual"
            manualLabel="place"
            helperText={t('activity_form_place_helper')}
            searchingText={t('activity_form_searching_cities')}
            useAsManualKey="activity_form_use_as_place"
          />
            </>
          )}
          <Field label={t('activity_form_details_label')} value={details} onChangeText={setDetails} placeholder={categoryFieldConfig.detailsPlaceholder} colors={colors} multiline />
          <View style={[styles.reminder, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.reminderCopy}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              <View style={styles.reminderText}>
                <Text style={[styles.reminderTitle, { color: colors.foreground }]}>{t('activity_form_reminder_title')}</Text>
                <Text style={[styles.reminderBody, { color: colors.mutedForeground }]}>{t('activity_form_reminder_body')}</Text>
              </View>
            </View>
            {isCheckingReminder ? <ActivityIndicator size="small" color={colors.primary} /> : <Switch value={reminderEnabled} onValueChange={(value) => void handleReminderChange(value)} trackColor={{ false: colors.input, true: colors.primary }} />}
          </View>
          <View style={styles.timingSection}>
            <Text style={[styles.timingLabel, { color: colors.foreground }]}>{t('activity_form_timing_label')}</Text>
            <View style={styles.timings}>
              {REMINDER_TIMING_OPTIONS.map((option) => {
                const active = option.minutes === reminderLeadMinutes;
                return (
                  <Pressable
                    key={option.minutes}
                    onPress={() => setReminderLeadMinutes(option.minutes)}
                    style={[styles.timingOption, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.timingText, { color: active ? colors.primaryForeground : colors.foreground }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {permissionMessage || Platform.OS === 'web' ? (
            <View style={[styles.permissionNotice, { backgroundColor: colors.accent, borderColor: colors.border }]}>
              <Text style={[styles.permissionText, { color: colors.mutedForeground }]}>{permissionMessage || t('activity_form_web_notice')}</Text>
              {permissionMessage && Platform.OS !== 'web' ? <Pressable onPress={() => void Linking.openSettings()}><Text style={[styles.settingsLink, { color: colors.primary }]}>{t('activity_form_open_settings')}</Text></Pressable> : null}
            </View>
          ) : null}
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          {createActivity.isError || createHotelStays.isError || updateActivity.isError ? <Text style={[styles.error, { color: colors.destructive }]}>{t('activity_form_save_error')}</Text> : null}
          <Pressable testID="button-save-activity" disabled={isSaving || isCheckingReminder} onPress={() => void submit()} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary, opacity: pressed || isSaving || isCheckingReminder ? 0.8 : 1 }]}>
            {isSaving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{isEditing ? t('activity_form_save_edit') : t('activity_form_save_new')}</Text>}
          </Pressable>
          <Pressable
            testID="button-cancel-activity"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onClose}
            style={({ pressed }) => [styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.cancelText, { color: colors.foreground }]}>{t('form_cancel')}</Text>
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

function HotelStayFields({
  index,
  stay,
  showHeading,
  colors,
  onChange,
  searchUnavailable,
  onSearchUnavailable,
  trip,
  minimumCheckInDate,
}: {
  index: number;
  stay: HotelStayForm;
  showHeading: boolean;
  colors: ReturnType<typeof useColors>;
  onChange: (patch: Partial<HotelStayForm>) => void;
  searchUnavailable: boolean;
  onSearchUnavailable: () => void;
  trip: Trip;
  minimumCheckInDate: string;
}) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const canSearch = !searchUnavailable
    && stay.name.trim().length >= 2
    && stay.city.trim().length >= 2;
  const params = {
    query: stay.name.trim(),
    city: stay.city.trim(),
    language: language === 'es' ? ('es' as const) : ('en' as const),
    limit: 6,
  };
  const hotelQuery = useGetHotelSuggestions(params, {
    query: {
      enabled: canSearch,
      staleTime: 60_000,
      queryKey: getGetHotelSuggestionsQueryKey(params),
      retry: false,
    },
  });
  useEffect(() => {
    if (hotelQuery.isError) {
      onSearchUnavailable();
    }
  }, [hotelQuery.isError, onSearchUnavailable]);

  const selectSuggestion = (suggestion: HotelSuggestion) => {
    onChange({
      name: suggestion.name,
      address: suggestion.address,
      city: suggestion.city,
      placeId: suggestion.placeId,
    });
    setSuggestionsOpen(false);
  };

  return (
    <View style={[styles.hotelStayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {showHeading ? (
        <Text style={[styles.hotelStayTitle, { color: colors.foreground }]}>
          {t('hotel_stay_heading', { n: index + 1 })}
        </Text>
      ) : null}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>{t('hotel_name_label')}</Text>
        <TextInput
          testID={`input-hotel-name-${index}`}
          accessibilityLabel={t('hotel_name_a11y', { n: index + 1 })}
          value={stay.name}
          onFocus={() => setSuggestionsOpen(true)}
          onChangeText={(name) => {
            onChange({ name, placeId: '' });
            setSuggestionsOpen(true);
          }}
          placeholder={t('hotel_name_placeholder')}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
        />
        {suggestionsOpen && canSearch ? (
          <View style={[styles.suggestions, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {hotelQuery.isFetching ? (
              <View style={styles.suggestion}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.suggestionText, { color: colors.mutedForeground }]}>{t('hotel_searching')}</Text>
              </View>
            ) : null}
            {(hotelQuery.data ?? []).map((suggestion, suggestionIndex) => (
              <Pressable
                key={suggestion.placeId}
                testID={`hotel-suggestion-${index}-${suggestionIndex}`}
                accessibilityRole="button"
                accessibilityLabel={`${suggestion.name}, ${suggestion.address}`}
                onPress={() => selectSuggestion(suggestion)}
                style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="bed-outline" size={17} color={colors.primary} />
                <View style={styles.suggestionCopy}>
                  <Text style={[styles.suggestionText, { color: colors.foreground }]}>{suggestion.name}</Text>
                  <Text style={[styles.suggestionDetail, { color: colors.mutedForeground }]}>{suggestion.address}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        {hotelQuery.isError || searchUnavailable ? (
          <Text testID={`hotel-manual-fallback-${index}`} style={[styles.helperText, { color: colors.mutedForeground }]}>
            {t('hotel_manual_fallback')}
          </Text>
        ) : (
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{t('hotel_name_helper')}</Text>
        )}
      </View>
      <Field
        label={t('hotel_address_label')}
        value={stay.address}
        onChangeText={(address) => onChange({ address })}
        placeholder={t('hotel_address_placeholder')}
        colors={colors}
        testID={`input-hotel-address-${index}`}
      />
      <View style={styles.row}>
        <View style={styles.halfField}>
          <DatePickerField
            label={t('hotel_check_in_label')}
            value={stay.checkIn}
            onChange={(checkIn) => onChange({ checkIn })}
            minimumDate={minimumCheckInDate}
            maximumDate={stay.checkOut || trip.endDate}
            testID={`input-hotel-check-in-${index}`}
          />
        </View>
        <View style={styles.halfField}>
          <DatePickerField
            label={t('hotel_check_out_label')}
            value={stay.checkOut}
            onChange={(checkOut) => onChange({ checkOut })}
            minimumDate={stay.checkIn || minimumCheckInDate}
            maximumDate={trip.endDate}
            testID={`input-hotel-check-out-${index}`}
          />
        </View>
      </View>
      <Field
        label={t('activity_form_city_label')}
        value={stay.city}
        onChangeText={(city) => onChange({ city, placeId: '' })}
        placeholder={t('activity_form_city_placeholder')}
        colors={colors}
        testID={`input-hotel-city-${index}`}
      />
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, colors, multiline = false, testID }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; colors: ReturnType<typeof useColors>; multiline?: boolean; testID?: string }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} multiline={multiline} style={[styles.input, multiline && styles.multiline, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} testID={testID} />
    </View>
  );
}


function SuggestionField({
  label,
  value,
  onChangeText,
  options,
  placeholder,
  colors,
  inputTestID,
  suggestionTestPrefix,
  manualTestID,
  manualLabel: _manualLabel,
  helperText,
  loading = false,
  searchingText,
  useAsManualKey,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  options: Suggestion[];
  placeholder?: string;
  colors: ReturnType<typeof useColors>;
  inputTestID: string;
  suggestionTestPrefix: string;
  manualTestID: string;
  manualLabel: string;
  helperText: string;
  loading?: boolean;
  searchingText: string;
  useAsManualKey: 'activity_form_use_as_city' | 'activity_form_use_as_place';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleOptions = useMemo(() => {
    const query = normalize(value);
    return options.filter((option) => !query || normalize(option.value).includes(query)).slice(0, 8);
  }, [options, value]);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(nextValue) => {
          onChangeText(nextValue);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
        testID={inputTestID}
      />
      {isOpen ? (
        <View style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? (
            <View style={styles.suggestion}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.mutedForeground }]}>{searchingText}</Text>
            </View>
          ) : null}
          {visibleOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChangeText(option.value);
                setIsOpen(false);
              }}
              style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.7 : 1 }]}
              testID={`${suggestionTestPrefix}-${option.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              <Ionicons name="location-outline" size={17} color={colors.mutedForeground} />
              <View style={styles.suggestionCopy}>
                <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={1}>{option.value}</Text>
                {option.detail ? <Text style={[styles.suggestionDetail, { color: colors.mutedForeground }]}>{option.detail}</Text> : null}
              </View>
            </Pressable>
          ))}
          {!loading && value.trim() && visibleOptions.length === 0 ? (
            <Pressable
              onPress={() => setIsOpen(false)}
              style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.7 : 1 }]}
              testID={manualTestID}
            >
              <Ionicons name="create-outline" size={17} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.primary }]}>{t(useAsManualKey, { v: value.trim() })}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{helperText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 12 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  iconButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  grabber: { alignSelf: 'center', borderRadius: 3, height: 5, marginTop: 8, width: 40 },
  scanCard: { alignItems: 'center', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: 12, marginBottom: 16, minHeight: 72, padding: 14 },
  scanIcon: { alignItems: 'center', borderRadius: 10, height: 42, justifyContent: 'center', width: 42 },
  scanText: { flex: 1 },
  scanTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 2 },
  scanSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  scanNotice: { alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, marginBottom: 16, padding: 12 },
  scanNoticeText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  headerButton: { justifyContent: 'center', minHeight: 44, minWidth: 80 },
  headerButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  cancelButton: { alignItems: 'center', borderRadius: 8, borderWidth: 1, height: 52, justifyContent: 'center', marginTop: 12 },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  content: { padding: 20, paddingBottom: 44 },
  field: { marginBottom: 16 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 8, borderWidth: 1, fontFamily: 'Inter_400Regular', fontSize: 16, height: 50, paddingHorizontal: 14 },
  timeInput: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', height: 50, justifyContent: 'space-between', paddingHorizontal: 14 },
  timeInputValue: { fontFamily: 'Inter_400Regular', fontSize: 16 },
  helperText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, marginTop: 6 },
  suggestions: { borderRadius: 8, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  suggestion: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 42, paddingHorizontal: 12, paddingVertical: 9 },
  suggestionCopy: { flex: 1 },
  suggestionText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13 },
  suggestionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  multiline: { height: 92, paddingTop: 12, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  dropdownField: { marginBottom: 18 },
  dropdownTrigger: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, height: 50, paddingHorizontal: 14 },
  dropdownValue: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15 },
  dropdownMenu: { borderRadius: 8, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  dropdownOption: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10 },
  dropdownOptionText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  hotelModeSection: { marginBottom: 18 },
  hotelModeRow: { flexDirection: 'row', gap: 10 },
  hotelModeOption: { borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  hotelModeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center' },
  hotelStayCard: { borderRadius: 10, borderWidth: 1, marginBottom: 16, padding: 14, paddingBottom: 0 },
  hotelStayTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 14 },
  flightLookupRow: { flexDirection: 'row', gap: 8 },
  flightNumberInput: { borderRadius: 8, borderWidth: 1, flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, height: 50, paddingHorizontal: 14 },
  flightLookupButton: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: 6, justifyContent: 'center', minWidth: 122, paddingHorizontal: 12 },
  flightLookupText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  aiPanel: { borderRadius: 10, borderWidth: 1, marginBottom: 16, padding: 12 },
  aiHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  aiCopy: { flex: 1 },
  aiTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  aiBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  aiButton: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: 6, minHeight: 40, paddingHorizontal: 12 },
  aiButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  aiSuggestions: { gap: 8, marginTop: 12 },
  aiSuggestion: { borderRadius: 8, borderWidth: 1, padding: 11 },
  aiSuggestionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  aiSuggestionTitle: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 13 },
  aiSuggestionMeta: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 4 },
  aiSuggestionDescription: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 5 },
  aiDisclaimer: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, marginTop: 2 },
  reminder: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, padding: 14 },
  reminderCopy: { flex: 1, flexDirection: 'row', gap: 11, paddingRight: 12 },
  reminderText: { flex: 1 },
  reminderTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 3 },
  reminderBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  timingSection: { marginBottom: 18 },
  timingLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 },
  timings: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timingOption: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9 },
  timingText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  permissionNotice: { borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 12 },
  permissionText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  settingsLink: { fontFamily: 'Inter_700Bold', fontSize: 12, marginTop: 7 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  saveButton: { alignItems: 'center', borderRadius: 8, height: 52, justifyContent: 'center' },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  timePickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 13, 30, 0.56)', justifyContent: 'flex-end', padding: 16 },
  timePickerSheet: { borderRadius: 18, borderWidth: 1, padding: 20 },
  timePickerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  timePickerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  timePickerValue: { fontFamily: 'Inter_700Bold', fontSize: 30, marginTop: 4 },
  timeControls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 22 },
  timeStepper: { alignItems: 'center', minWidth: 92 },
  timeStepperLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 4 },
  timeStepperValue: { fontFamily: 'Inter_700Bold', fontSize: 34, marginVertical: 1 },
  timeSeparator: { fontFamily: 'Inter_700Bold', fontSize: 34, marginHorizontal: 2, marginTop: 20 },
  timePickerActions: { flexDirection: 'row', gap: 10 },
  timePickerAction: { alignItems: 'center', borderRadius: 8, borderWidth: 1, flex: 1, height: 46, justifyContent: 'center' },
  timePickerActionText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});
