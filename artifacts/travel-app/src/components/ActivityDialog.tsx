import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertActivitySchema, type Activity, type Trip } from "@/lib/schemas";
import { categoryLabels, type ActivityCategory } from "@/components/CategoryIcon";
import { Plane, Loader2, Bell, BellOff, Sparkles } from "lucide-react";
import { reminderService } from "@/lib/reminders";
import { SuggestionInput, type SuggestionOption } from "@/components/SuggestionInput";
import { DateField, TimeField } from "@/components/DateTimeFields";
import { timePartsToValue, timeToParts } from "@/lib/dateTime";
import {
  getDestinationForDate,
  getGetDestinationSuggestionsQueryKey,
  getGetHotelSuggestionsQueryKey,
  useCreateHotelStays,
  useGetDestinationSuggestions,
  useGetHotelSuggestions,
  useGetSuggestions,
  type ActivityInput,
  type ActivitySuggestion,
} from "@workspace/api-client-react";
import { t, lang, locale } from "@/lib/i18n";
import { SuggestionParamsLanguage } from "@workspace/api-client-react";

const activityFormSchema = insertActivitySchema.extend({
  tripId: z.number(),
  type: z.enum(["activity", "booking"]),
  category: z.string().min(1, t("activityDialog.selectCategoryError")),
});

type ActivityFormData = z.infer<typeof activityFormSchema>;

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  trip: Trip;
  activities: Activity[];
  activity?: Activity;
  defaultDate?: string;
  defaultDay?: string;
}

function getSuggestedCity(trip: Trip, date?: string) {
  return date ? getDestinationForDate(date, trip) ?? "" : "";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function sameValue(first?: string | null, second?: string | null) {
  return normalize(first ?? "") === normalize(second ?? "");
}

function normalizeTimeInput(value?: string | null) {
  return timePartsToValue(timeToParts(value));
}

function uniqueOptions(options: SuggestionOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = normalize(option.value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type HotelStayDraft = {
  title: string;
  location: string;
  city: string;
  placeId: string;
  date: string;
  endDate: string;
};

function dayForDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: "long" });
}

function midpointDate(startDate: string, endDate: string) {
  const toUtc = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  const start = toUtc(startDate);
  const end = toUtc(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return startDate;
  return new Date(start + Math.floor((end - start) / 2)).toISOString().slice(0, 10);
}

function emptyHotelStay(trip: Trip): HotelStayDraft {
  return {
    title: "",
    location: "",
    city: getSuggestedCity(trip, trip.startDate) || trip.destination,
    placeId: "",
    date: trip.startDate,
    endDate: trip.endDate,
  };
}

function HotelStayFields({
  index,
  stay,
  onChange,
  minimumCheckInDate,
  tripEndDate,
  searchUnavailable,
  onSearchUnavailable,
}: {
  index: number;
  stay: HotelStayDraft;
  onChange: (stay: HotelStayDraft) => void;
  minimumCheckInDate: string;
  tripEndDate: string;
  searchUnavailable: boolean;
  onSearchUnavailable: () => void;
}) {
  const canSearch = stay.title.trim().length >= 2 && stay.city.trim().length >= 2;
  const params = {
    query: stay.title.trim(),
    city: stay.city.trim(),
    language: lang,
    limit: 8,
  };
  const hotelQuery = useGetHotelSuggestions(params, {
    query: {
      enabled: canSearch && !searchUnavailable,
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
  const options: SuggestionOption[] = (hotelQuery.data ?? []).map((hotel) => ({
    value: hotel.name,
    detail: hotel.address,
    placeId: hotel.placeId,
    address: hotel.address,
    city: hotel.city,
  }));

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-semibold" data-testid={`text-hotel-stay-${index}`}>
        {t("activityDialog.hotelStay", { number: String(index + 1) })}
      </p>
      <div>
        <FormLabel>{t("activityDialog.hotelName")}</FormLabel>
        <SuggestionInput
          value={stay.title}
          onChange={(title) => onChange({ ...stay, title, placeId: "" })}
          onSelect={(option) => onChange({
            ...stay,
            title: option.value,
            location: option.address ?? "",
            city: option.city ?? stay.city,
            placeId: option.placeId ?? "",
          })}
          options={options}
          placeholder={t("activityDialog.hotelNamePlaceholder")}
          inputTestId={`input-hotel-name-${index}`}
          suggestionTestIdPrefix={`hotel-suggestion-${index}`}
          manualTestId={`hotel-use-manual-${index}`}
          loading={hotelQuery.isFetching}
          manualLabel={t("activityDialog.hotel").toLowerCase()}
        />
        {hotelQuery.isError || searchUnavailable ? (
          <p className="mt-1 text-xs text-muted-foreground" data-testid={`text-hotel-manual-fallback-${index}`}>
            {t("activityDialog.hotelManualFallback")}
          </p>
        ) : null}
      </div>
      <div>
        <FormLabel>{t("activityDialog.hotelAddress")}</FormLabel>
        <Input
          value={stay.location}
          onChange={(event) => onChange({ ...stay, location: event.target.value })}
          placeholder={t("activityDialog.hotelAddressPlaceholder")}
          data-testid={`input-hotel-address-${index}`}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>{t("activityDialog.checkIn")}</FormLabel>
          <DateField
            value={stay.date}
            onChange={(date) => onChange({ ...stay, date })}
            min={minimumCheckInDate}
            max={stay.endDate || tripEndDate}
            label={t("activityDialog.checkIn")}
            testId={`input-hotel-checkin-${index}`}
          />
        </div>
        <div>
          <FormLabel>{t("activityDialog.checkOut")}</FormLabel>
          <DateField
            value={stay.endDate}
            onChange={(endDate) => onChange({ ...stay, endDate })}
            min={stay.date || minimumCheckInDate}
            max={tripEndDate}
            label={t("activityDialog.checkOut")}
            testId={`input-hotel-checkout-${index}`}
          />
        </div>
      </div>
      <div>
        <FormLabel>{t("activityDialog.cityLabel")}</FormLabel>
        <Input
          value={stay.city}
          onChange={(event) => onChange({ ...stay, city: event.target.value })}
          placeholder={t("activityDialog.cityPlaceholder")}
          data-testid={`input-hotel-city-${index}`}
        />
      </div>
    </div>
  );
}

/**
 * Per-category contextual field configs.
 * These strings are computed once using the i18n module so they respond to the detected language.
 */
function getCategoryFieldConfigs() {
  return {
    flight: {
      titleLabel: t("categories.flight"),
      titlePlaceholder: t("activityDialog.flightNumber"),
      timeLabel: t("activityDialog.flightMissingDate"),
      timePlaceholder: "10:30",
      locationLabel: t("activityDialog.flightNumber"),
      locationPlaceholder: "IATA → IATA",
      detailsPlaceholder: t("activityDialog.detailsPlaceholder"),
    },
    hotel: {
      titleLabel: t("categories.hotel"),
      titlePlaceholder: t("myTrips.tripNamePlaceholder"),
      timeLabel: t("activityDialog.hotelCheckinLabel"),
      timePlaceholder: "15:00",
      locationLabel: t("categories.hotel"),
      locationPlaceholder: t("activityDialog.cityPlaceholder"),
      detailsPlaceholder: t("activityDialog.detailsPlaceholder"),
    },
    restaurant: {
      titleLabel: t("categories.restaurant"),
      titlePlaceholder: t("categories.restaurant"),
      timeLabel: t("activityDialog.date"),
      timePlaceholder: "20:00",
      locationLabel: t("categories.restaurant"),
      locationPlaceholder: t("activityDialog.cityPlaceholder"),
      detailsPlaceholder: t("activityDialog.detailsPlaceholder"),
    },
    bar: {
      titleLabel: t("categories.bar"),
      titlePlaceholder: t("categories.bar"),
      timeLabel: t("activityDialog.date"),
      timePlaceholder: "21:00",
      locationLabel: t("categories.bar"),
      locationPlaceholder: t("activityDialog.cityPlaceholder"),
      detailsPlaceholder: t("activityDialog.detailsPlaceholder"),
    },
    general: {
      titleLabel: t("activityDialog.activity"),
      titlePlaceholder: t("activityDialog.activity"),
      timeLabel: t("activityDialog.date"),
      timePlaceholder: "10:00",
      locationLabel: t("activityDialog.cityLabel"),
      locationPlaceholder: t("activityDialog.cityPlaceholder"),
      detailsPlaceholder: t("activityDialog.detailsPlaceholder"),
    },
  } as Record<string, {
    titleLabel: string;
    titlePlaceholder: string;
    timeLabel: string;
    timePlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    detailsPlaceholder: string;
  }>;
}

export function ActivityDialog({
  open,
  onOpenChange,
  tripId,
  trip,
  activities,
  activity,
  defaultDate,
  defaultDay,
}: ActivityDialogProps) {
  const { toast } = useToast();
  const isEditing = !!activity;

  const categoryFieldConfigs = getCategoryFieldConfigs();

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      tripId,
      day: activity?.day || defaultDay || "",
      date: activity?.date || defaultDate || "",
      type: (activity?.type as "activity" | "booking") || "activity",
      category: activity?.category || "",
      title: activity?.title || "",
      time: normalizeTimeInput(activity?.time),
      location: activity?.location || "",
      city: activity?.city || getSuggestedCity(trip, activity?.date || defaultDate),
      distance: activity?.distance || "",
      description: activity?.description || "",
      kidFriendly: activity?.kidFriendly || false,
      budget: activity?.budget || null,
      confirmationNumber: activity?.confirmationNumber || "",
      flightNumber: activity?.flightNumber || "",
      details: activity?.details || "",
      status: activity?.status || "",
      reminderEnabled: activity?.reminderEnabled ?? true,
    },
  });

  const [isLookingUpFlight, setIsLookingUpFlight] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ActivitySuggestion[]>([]);
  const [hotelCount, setHotelCount] = useState<1 | 2>(1);
  const [hotelSearchUnavailable, setHotelSearchUnavailable] = useState(false);
  const [hotelStays, setHotelStays] = useState<HotelStayDraft[]>(() => [{
    ...emptyHotelStay(trip),
    ...(activity?.category === "hotel" ? {
      title: activity.title,
      location: activity.location ?? "",
      city: activity.city ?? "",
      placeId: activity.placeId ?? "",
      date: activity.date,
      endDate: activity.endDate ?? activity.date,
    } : {}),
  }]);
  const aiSuggestionMutation = useGetSuggestions();
  const category = form.watch("category");
  const isFlight = category === "flight";
  const isHotel = category === "hotel";
  const categoryFieldConfig = categoryFieldConfigs[category] ?? categoryFieldConfigs.general;

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setAiSuggestions([]);
      setHotelCount(1);
      setHotelStays([{
        ...emptyHotelStay(trip),
        ...(activity?.category === "hotel" ? {
          title: activity.title,
          location: activity.location ?? "",
          city: activity.city ?? "",
          placeId: activity.placeId ?? "",
          date: activity.date,
          endDate: activity.endDate ?? activity.date,
        } : {}),
      }]);
      form.reset({
        tripId,
        day: activity?.day || defaultDay || "",
        date: activity?.date || defaultDate || "",
        type: (activity?.type as "activity" | "booking") || "activity",
        category: activity?.category || "",
        title: activity?.title || "",
        time: normalizeTimeInput(activity?.time),
        location: activity?.location || "",
        city: activity?.city || getSuggestedCity(trip, activity?.date || defaultDate),
        distance: activity?.distance || "",
        description: activity?.description || "",
        kidFriendly: activity?.kidFriendly || false,
        budget: activity?.budget || null,
        confirmationNumber: activity?.confirmationNumber || "",
        flightNumber: activity?.flightNumber || "",
        details: activity?.details || "",
        status: activity?.status || "",
        reminderEnabled: activity?.reminderEnabled ?? true,
      });
    }
  }, [open, activity, tripId, defaultDate, defaultDay, form, trip]);

  const selectedDate = form.watch("date");
  const city = form.watch("city") || "";
  const citySearch = city.split(",")[0]?.trim() ?? "";
  const canSearchCities = citySearch.length >= 2;
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

  const routeCityOptions = useMemo(() => {
    const suggestedCity = getSuggestedCity(trip, selectedDate);
    const tripCities = trip.tripType === "multi"
      ? trip.stops.map((stop) => stop.destination)
      : [trip.destination];

    return uniqueOptions([
      ...(suggestedCity ? [{ value: suggestedCity, detail: t("activityDialog.todayStop") }] : []),
      ...tripCities.map((value) => ({ value, detail: t("activityDialog.onItinerary") })),
    ]);
  }, [selectedDate, trip]);

  const cityOptions = useMemo(() => uniqueOptions([
    ...routeCityOptions,
    ...(cityQuery.data ?? []).map((suggestion) => ({
      value: suggestion.label,
      detail: t("activityDialog.worldCatalog"),
    })),
  ]), [cityQuery.data, routeCityOptions]);

  const placeOptions = useMemo(() => uniqueOptions(
    activities
      .filter((item) => item.id !== activity?.id && Boolean(item.location?.trim()))
      .map((item) => ({ value: item.location!.trim(), detail: t("activityDialog.usedInTrip") })),
  ), [activities, activity?.id]);

  // Flight lookup function
  const handleFlightLookup = async () => {
    const flightNumber = form.getValues("flightNumber");
    const currentDate = form.getValues("date");

    if (!flightNumber) {
      toast({
        title: t("activityDialog.flightMissingNumber"),
        description: t("activityDialog.flightMissingNumberDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!currentDate) {
      toast({
        title: t("activityDialog.flightMissingDate"),
        description: t("activityDialog.flightMissingDateDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsLookingUpFlight(true);
    try {
      let apiUrl = `/api/flight-lookup?flightNumber=${encodeURIComponent(flightNumber)}&language=${lang}`;
      if (currentDate) {
        apiUrl += `&date=${currentDate}`;
      }

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("activityDialog.flightLookupFailedDesc"));
      }

      const departureDate = data.departure.scheduled ? new Date(data.departure.scheduled) : null;
      const departureTime = departureDate
        ? `${String(departureDate.getHours()).padStart(2, "0")}:${String(departureDate.getMinutes()).padStart(2, "0")}`
        : "";

      form.setValue("title", t("activityDialog.flightTitle", {
        airline: data.airline,
        flightNumber: data.flightNumber,
      }).trim());
      form.setValue("time", departureTime);
      form.setValue("location", `${data.departure.airport} → ${data.arrival.airport}`);

      let details = `${t("activityDialog.flightStatus")}: ${data.status}\n`;
      if (data.departure.terminal) details += `${t("activityDialog.flightDepartureTerminal")}: ${data.departure.terminal}\n`;
      if (data.departure.gate) details += `${t("activityDialog.flightDepartureGate")}: ${data.departure.gate}\n`;
      if (data.arrival.terminal) details += `${t("activityDialog.flightArrivalTerminal")}: ${data.arrival.terminal}\n`;
      if (data.arrival.gate) details += `${t("activityDialog.flightArrivalGate")}: ${data.arrival.gate}\n`;
      if (data.arrival.scheduled) {
        const arrivalTime = new Date(data.arrival.scheduled).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });
        details += `${t("activityDialog.flightArrivalTime")}: ${arrivalTime}`;
      }

      form.setValue("details", details.trim());
      form.setValue("status", "confirmed");

      toast({
        title: t("activityDialog.flightLoaded"),
        description: t("activityDialog.flightLoadedDesc", { flightNumber: data.flightNumber }),
      });
    } catch (error: any) {
      toast({
        title: t("activityDialog.flightLookupFailed"),
        description: error.message || t("activityDialog.flightLookupFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsLookingUpFlight(false);
    }
  };

  const handleAiSuggestions = async () => {
    const destination = form.getValues("city")?.trim() || getSuggestedCity(trip, form.getValues("date"));
    const selectedCategory = form.getValues("category");
    const selectedDate = form.getValues("date");
    if (!selectedCategory) {
      form.setError("category", { message: t("activityDialog.selectCategoryForSuggestions") });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      form.setError("date", { message: t("activityDialog.selectDateForSuggestions") });
      return;
    }
    if (!destination) {
      form.setError("city", { message: t("activityDialog.addCityForSuggestions") });
      return;
    }

    try {
      const result = await aiSuggestionMutation.mutateAsync({
        data: {
          destination,
          adults: trip.adults,
          children: trip.children,
          category: selectedCategory,
          date: selectedDate,
          budget: "medium",
          language: lang === "es" ? SuggestionParamsLanguage.es : SuggestionParamsLanguage.en,
        },
      });
      setAiSuggestions(result);
    } catch {
      toast({
        title: t("activityDialog.aiError"),
        description: t("activityDialog.aiErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const applyAiSuggestion = (suggestion: ActivitySuggestion) => {
    const suggestionDetails = [
      suggestion.description,
      `${t("activityDialog.distance")}: ${suggestion.estimatedTime}`,
      suggestion.kidFriendly
        ? t("activityCard.kidFriendly") + "."
        : trip.children > 0
        ? t("activityDialog.selectCategoryError") + "."
        : "",
    ].filter(Boolean).join("\n");

    form.setValue("title", suggestion.title, { shouldDirty: true });
    form.setValue("location", suggestion.location, { shouldDirty: true });
    form.setValue("description", suggestionDetails, { shouldDirty: true });
    form.setValue("details", suggestionDetails, { shouldDirty: true });
    form.setValue("kidFriendly", suggestion.kidFriendly, { shouldDirty: true });
    setAiSuggestions([]);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ActivityFormData) => {
      const res = await apiRequest('POST', '/api/activities', data);
      return await res.json();
    },
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'activities'] });
      onOpenChange(false);

      if (newActivity.reminderEnabled) {
        reminderService.scheduleRemindersForActivity(newActivity);
        toast({
          title: t("activityDialog.added"),
          description: t("activityDialog.addedWithReminder"),
        });
      } else {
        toast({
          title: t("activityDialog.added"),
          description: t("activityDialog.addedNoReminder"),
        });
      }
    },
    onError: () => {
      toast({
        title: t("activityDialog.error"),
        description: t("activityDialog.errorAdd"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ActivityFormData) => {
      const res = await apiRequest('PATCH', `/api/activities/${activity!.id}`, data);
      return await res.json();
    },
    onSuccess: (updatedActivity) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'activities'] });
      onOpenChange(false);

      if (updatedActivity.reminderEnabled) {
        reminderService.scheduleRemindersForActivity(updatedActivity);
      } else {
        reminderService.cancelRemindersForActivity(updatedActivity.id);
      }

      toast({
        title: t("activityDialog.updated"),
        description: t("activityDialog.updatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("activityDialog.error"),
        description: t("activityDialog.errorUpdate"),
        variant: "destructive",
      });
    },
  });

  const createHotelMutation = useCreateHotelStays({
    mutation: {
      onSuccess: (newActivities) => {
        queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'activities'] });
        onOpenChange(false);
        newActivities.forEach((newActivity) => {
          if (newActivity.reminderEnabled) {
            reminderService.scheduleRemindersForActivity(newActivity);
          }
        });
        toast({
          title: t("activityDialog.hotelsAdded"),
          description: t("activityDialog.hotelsAddedDesc"),
        });
      },
      onError: () => {
        toast({
          title: t("activityDialog.error"),
          description: t("activityDialog.hotelErrorAdd"),
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (data: ActivityFormData) => {
    const normalizedData = {
      ...data,
      location: data.location?.trim() || null,
      city: data.city?.trim() || null,
    };
    if (isEditing) {
      updateMutation.mutate(normalizedData);
    } else {
      createMutation.mutate(normalizedData);
    }
  };

  const updateHotelStay = (index: number, nextStay: HotelStayDraft) => {
    setHotelStays((current) => {
      const next = [...current];
      next[index] = nextStay;
      if (next.length === 2) {
        if (index === 0 && next[1].date !== nextStay.endDate) {
          next[1] = { ...next[1], date: nextStay.endDate };
        } else if (index === 1 && next[0].endDate !== nextStay.date) {
          next[0] = { ...next[0], endDate: nextStay.date };
        }
      }
      return next;
    });
  };

  const selectHotelCount = (count: 1 | 2) => {
    setHotelCount(count);
    if (count === 1) {
      setHotelStays((current) => [{
        ...(current[0] ?? emptyHotelStay(trip)),
        date: trip.startDate,
        endDate: trip.endDate,
      }]);
      return;
    }
    const boundary = midpointDate(trip.startDate, trip.endDate);
    setHotelStays((current) => [
      {
        ...(current[0] ?? emptyHotelStay(trip)),
        date: trip.startDate,
        endDate: boundary,
      },
      {
        ...emptyHotelStay(trip),
        city: getSuggestedCity(trip, boundary) || trip.destination,
        date: boundary,
        endDate: trip.endDate,
      },
    ]);
  };

  const handleHotelSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const stays = hotelStays.slice(0, isEditing ? 1 : hotelCount);
    const invalidFields = stays.some((stay) =>
      !stay.title.trim() || !stay.location.trim() || !stay.city.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(stay.date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(stay.endDate) ||
      stay.endDate < stay.date
    );
    const invalidCoverage = !isEditing && (
      stays[0]?.date !== trip.startDate ||
      stays[stays.length - 1]?.endDate !== trip.endDate ||
      (stays.length === 2 && stays[0].endDate !== stays[1].date)
    );
    if (invalidFields || invalidCoverage) {
      toast({
        title: t("activityDialog.hotelValidation"),
        description: invalidCoverage
          ? t("activityDialog.hotelCoverageError")
          : t("activityDialog.hotelFieldsError"),
        variant: "destructive",
      });
      return;
    }

    const base = form.getValues();
    const payloads: ActivityInput[] = stays.map((stay) => ({
      ...base,
      tripId,
      category: "hotel",
      type: base.type,
      title: stay.title.trim(),
      location: stay.location.trim(),
      city: stay.city.trim(),
      placeId: stay.placeId.trim() || null,
      date: stay.date,
      endDate: stay.endDate,
      day: dayForDate(stay.date),
    }));

    if (isEditing) {
      updateMutation.mutate(payloads[0] as ActivityFormData);
    } else {
      createHotelMutation.mutate({ data: { stays: payloads } });
    }
  };

  const activityType = form.watch("type");
  const isBooking = activityType === "booking";

  const dialogTitle = isEditing
    ? isBooking ? t("activityDialog.editBooking") : t("activityDialog.editActivity")
    : isBooking ? t("activityDialog.addBooking") : t("activityDialog.addActivity");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("activityDialog.editDesc") : t("activityDialog.addDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={isHotel ? handleHotelSubmit : form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("activityDialog.activityType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder={t("activityDialog.selectActivity")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("activityDialog.recordType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="activity">{t("activityDialog.activity")}</SelectItem>
                      <SelectItem value="booking">{t("activityDialog.booking")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isHotel ? (
              <div className="space-y-4">
                {!isEditing ? (
                  <div className="space-y-2 rounded-lg border p-3">
                    <FormLabel>{t("activityDialog.hotelCountQuestion")}</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={hotelCount === 1 ? "default" : "outline"}
                        onClick={() => selectHotelCount(1)}
                        data-testid="button-one-hotel"
                      >
                        {t("activityDialog.oneHotel")}
                      </Button>
                      <Button
                        type="button"
                        variant={hotelCount === 2 ? "default" : "outline"}
                        onClick={() => selectHotelCount(2)}
                        data-testid="button-two-hotels"
                      >
                        {t("activityDialog.twoHotels")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("activityDialog.hotelCoverageHint")}
                    </p>
                  </div>
                ) : null}
                {hotelStays.slice(0, isEditing ? 1 : hotelCount).map((stay, index) => (
                  <HotelStayFields
                    key={index}
                    index={index}
                    stay={stay}
                    onChange={(nextStay) => updateHotelStay(index, nextStay)}
                    minimumCheckInDate={index > 0 ? hotelStays[index - 1]?.date || trip.startDate : trip.startDate}
                    tripEndDate={trip.endDate}
                    searchUnavailable={hotelSearchUnavailable}
                    onSearchUnavailable={() => setHotelSearchUnavailable(true)}
                  />
                ))}
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("activityDialog.hotelCheckinLabel")}</FormLabel>
                      <TimeField value={field.value} onChange={field.onChange} testId="input-time" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isFlight ? t("activityDialog.dateWithAsterisk") : t("activityDialog.date")}</FormLabel>
                    <FormControl>
                      <DateField
                        value={field.value}
                        min={trip.startDate}
                        max={trip.endDate}
                        label={isFlight ? t("activityDialog.dateWithAsterisk") : t("activityDialog.date")}
                        onChange={(nextDate) => {
                          const previousSuggestedCity = getSuggestedCity(trip, field.value);
                          const currentCity = form.getValues("city");
                          field.onChange(nextDate);
                          const nextSuggestedCity = getSuggestedCity(trip, nextDate);
                          if (!currentCity || sameValue(currentCity, previousSuggestedCity)) {
                            form.setValue("city", nextSuggestedCity);
                          }
                        }}
                        testId="input-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("activityDialog.day")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("activityDialog.dayPlaceholder")} {...field} data-testid="input-day" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isFlight && (
              <FormField
                control={form.control}
                name="flightNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("activityDialog.flightNumber")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="AA100, AM456, IB321"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-flight-number"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleFlightLookup}
                        disabled={isLookingUpFlight}
                        data-testid="button-lookup-flight"
                        className="gap-2"
                      >
                        {isLookingUpFlight ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("activityDialog.lookingUp")}
                          </>
                        ) : (
                          <>
                            <Plane className="w-4 h-4" />
                            {t("activityDialog.autofill")}
                          </>
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{categoryFieldConfig.titleLabel}</FormLabel>
                  <FormControl>
                    <Input placeholder={categoryFieldConfig.titlePlaceholder} {...field} data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{categoryFieldConfig.timeLabel}</FormLabel>
                  <TimeField value={field.value} onChange={field.onChange} testId="input-time" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("activityDialog.cityLabel")}</FormLabel>
                  <SuggestionInput
                    value={field.value || ""}
                    onChange={field.onChange}
                    options={cityOptions}
                    placeholder={t("activityDialog.cityPlaceholder")}
                    inputTestId="input-city"
                    suggestionTestIdPrefix="city-suggestion"
                    manualTestId="city-use-manual"
                    loading={cityQuery.isFetching}
                    manualLabel={t("activityDialog.cityLabel").toLowerCase()}
                  />
                  <p className="text-xs text-muted-foreground">{t("activityDialog.cityHint")}</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{t("activityDialog.aiIdeas")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("activityDialog.aiDesc", { adults: String(trip.adults), children: String(trip.children) })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  disabled={aiSuggestionMutation.isPending}
                  onClick={() => void handleAiSuggestions()}
                  data-testid="button-ai-suggestions"
                >
                  {aiSuggestionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {aiSuggestionMutation.isPending ? t("activityDialog.aiThinking") : t("activityDialog.aiSuggest")}
                </Button>
              </div>
              {aiSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.title}-${index}`}
                      type="button"
                      onClick={() => applyAiSuggestion(suggestion)}
                      data-testid={`ai-suggestion-${index}`}
                      className="w-full rounded-md border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                    >
                      <span className="block text-sm font-semibold">{suggestion.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {suggestion.location} · {suggestion.estimatedTime}
                      </span>
                      <span className="mt-1 block text-xs">{suggestion.description}</span>
                    </button>
                  ))}
                  <p className="text-[11px] text-muted-foreground">{t("activityDialog.aiTapToApply")}</p>
                </div>
              ) : null}
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{categoryFieldConfig.locationLabel}</FormLabel>
                  <SuggestionInput
                    value={field.value || ""}
                    onChange={field.onChange}
                    options={placeOptions}
                    placeholder={categoryFieldConfig.locationPlaceholder}
                    inputTestId="input-location"
                    suggestionTestIdPrefix="place-suggestion"
                    manualTestId="place-use-manual"
                    manualLabel={t("activityDialog.cityLabel").toLowerCase()}
                  />
                  <p className="text-xs text-muted-foreground">{t("activityDialog.locationHint")}</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isBooking && (
              <>
                <FormField
                  control={form.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("activityDialog.distance")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("activityDialog.distancePlaceholder")} {...field} value={field.value || ""} data-testid="input-distance" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("activityDialog.description")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={categoryFieldConfig.detailsPlaceholder}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("activityDialog.budget")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-budget">
                              <SelectValue placeholder={t("activityDialog.selectBudget")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">{t("activityDialog.budgetLow")}</SelectItem>
                            <SelectItem value="medium">{t("activityDialog.budgetMedium")}</SelectItem>
                            <SelectItem value="high">{t("activityDialog.budgetHigh")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="kidFriendly"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 pt-8">
                        <FormLabel>{t("activityDialog.kidFriendly")}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-kid-friendly"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {isBooking && (
              <>
                <FormField
                  control={form.control}
                  name="confirmationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("activityDialog.confirmationNumber")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("activityDialog.confirmationPlaceholder")}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-confirmation"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("activityDialog.details")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("activityDialog.detailsPlaceholder")}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("activityDialog.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder={t("activityDialog.selectStatus")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">{t("activityDialog.statusConfirmed")}</SelectItem>
                          <SelectItem value="pending">{t("activityDialog.statusPending")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="reminderEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-3 rounded-md border bg-muted/20">
                  <div className="flex items-center gap-2">
                    {field.value ? (
                      <Bell className="w-4 h-4 text-primary" />
                    ) : (
                      <BellOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <FormLabel className="text-sm font-medium">{t("activityDialog.reminder")}</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {field.value ? t("activityDialog.reminderOn") : t("activityDialog.reminderOff")}
                      </p>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      data-testid="switch-reminder"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending || createHotelMutation.isPending}
              data-testid="button-submit-activity"
            >
              {createMutation.isPending || updateMutation.isPending || createHotelMutation.isPending
                ? t("activityDialog.saving")
                : isEditing
                ? t("activityDialog.updateActivity")
                : isHotel
                ? t("activityDialog.addHotelStays")
                : t("activityDialog.add")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
