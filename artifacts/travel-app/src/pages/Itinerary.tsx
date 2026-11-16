import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TripHeader } from "@/components/TripHeader";
import { FilterChips } from "@/components/FilterChips";
import { DaySection } from "@/components/DaySection";
import { ActivityCard } from "@/components/ActivityCard";
import { BookingCard } from "@/components/BookingCard";
import { EmptyState } from "@/components/EmptyState";
import { ActivityDialog } from "@/components/ActivityDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BusFront, Calendar, ChevronRight, CircleDollarSign, Clock3, Info, MapPin, Navigation2, Plane, Sparkles, TrainFront } from "lucide-react";
import type { ActivityCategory } from "@/components/CategoryIcon";
import { notificationService } from "@/lib/notifications";
import { backgroundTracking } from "@/lib/backgroundTracking";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Trip, Activity } from "@/lib/schemas";
import { getCityName, getDestinationForDate as getItineraryDestinationForDate } from "@workspace/api-client-react";
import { getGetTransitRecommendationsQueryKey, useGetTransitRecommendations, type TransitOption } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { t, fmtDate, fmtCurrency, locale, lang } from "@/lib/i18n";
import { GetTransitRecommendationsLanguage } from "@workspace/api-client-react";

interface DayActivities {
  id: string;
  day: string;
  date: string;
  items: Activity[];
}

function formatDayLabel(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  // Use locale-aware day names
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const transportMeta = {
  flight: { label: t("categories.flight"), Icon: Plane },
  train: { label: t("categories.train"), Icon: TrainFront },
  bus: { label: t("categories.transportation"), Icon: BusFront },
} as const;

function transportConvenience(value: TransitOption["convenience"]) {
  if (value === "high") return "★★★";
  if (value === "medium") return "★★";
  return "★";
}

export default function Itinerary() {
  const [, params] = useRoute("/trip/:id");
  const tripId = params?.id ? parseInt(params.id) : null;

  const [selectedCategories, setSelectedCategories] = useState<ActivityCategory[]>([]);
  const [alarmsSet, setAlarmsSet] = useState<Set<number>>(new Set());
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
  const [newActivityDate, setNewActivityDate] = useState<string>("");
  const [newActivityDay, setNewActivityDay] = useState<string>("");
  const { toast } = useToast();

  const { data: trip, isLoading: tripLoading } = useQuery<Trip>({
    queryKey: ['/api/trips', tripId],
    enabled: !!tripId,
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/trips', tripId, 'activities'],
    enabled: !!tripId,
  });
  const transitQuery = useGetTransitRecommendations(
    tripId ?? -1,
    { language: lang === "es" ? GetTransitRecommendationsLanguage.es : GetTransitRecommendationsLanguage.en },
    {
      query: {
        queryKey: getGetTransitRecommendationsQueryKey(tripId ?? -1, {
          language: lang === "es" ? GetTransitRecommendationsLanguage.es : GetTransitRecommendationsLanguage.en,
        }),
        enabled: Boolean(tripId && trip?.tripType === "multi" && trip.stops.length > 1),
        staleTime: 5 * 60_000,
      },
    },
  );

  useEffect(() => {
    const currentActivity = backgroundTracking.getCurrentActivity();
    if (currentActivity) {
      setTrackingEnabled(true);
    }
  }, []);

  // Group activities by day
  const groupedActivities = useMemo((): DayActivities[] => {
    const grouped = activities.reduce((acc, activity) => {
      const dateKey = activity.date;
      if (!acc[dateKey]) {
        acc[dateKey] = {
          id: dateKey,
          day: activity.day,
          date: activity.date,
          items: [],
        };
      }
      acc[dateKey].items.push(activity);
      return acc;
    }, {} as Record<string, DayActivities>);

    return Object.values(grouped).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [activities]);

  const handleToggleCategory = (category: ActivityCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
  };

  const handleAddActivity = (date: string, day: string) => {
    setNewActivityDate(date);
    setNewActivityDay(day);
    setEditingActivity(undefined);
    setActivityDialogOpen(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setNewActivityDate("");
    setNewActivityDay("");
    setActivityDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (activityId: number) => {
      await apiRequest('DELETE', `/api/activities/${activityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'activities'] });
      toast({
        title: t("itinerary.activityDeleted"),
        description: t("itinerary.activityDeletedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("itinerary.error"),
        description: t("itinerary.errorDelete"),
        variant: "destructive",
      });
    },
  });

  const handleDeleteActivity = (activityId: number) => {
    if (confirm(t("itinerary.deleteConfirm"))) {
      deleteMutation.mutate(activityId);
    }
  };

  const handleAlarmToggle = async (activityId: number, activityTitle: string, activityTime?: string | null) => {
    const isSet = alarmsSet.has(activityId);

    if (isSet) {
      setAlarmsSet(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });

      toast({
        title: t("itinerary.alarmCancelled"),
        description: t("itinerary.alarmCancelledDesc", { title: activityTitle }),
      });
    } else {
      setAlarmsSet(prev => new Set(prev).add(activityId));

      toast({
        title: t("itinerary.alarmSet"),
        description: t("itinerary.alarmSetDesc", { title: activityTitle }),
      });
    }
  };

  const handleToggleBackgroundTracking = async () => {
    if (trackingEnabled) {
      backgroundTracking.stopBackgroundTracking();
      setTrackingEnabled(false);
      toast({
        title: t("itinerary.trackingStopped"),
        description: t("itinerary.trackingStoppedDesc"),
      });
    } else {
      await backgroundTracking.startBackgroundTracking();

      const firstActivity = filteredActivities[0]?.items[0];
      if (firstActivity && firstActivity.time) {
        backgroundTracking.setCurrentActivity({
          activityId: String(firstActivity.id),
          activityTitle: firstActivity.title,
          startTime: firstActivity.time,
          isInProgress: false,
        });
      }

      setTrackingEnabled(true);
      toast({
        title: t("itinerary.trackingEnabled"),
        description: t("itinerary.trackingEnabledDesc"),
      });
    }
  };

  const filteredActivities = useMemo(() => {
    return groupedActivities.map(day => ({
      ...day,
      items: selectedCategories.length === 0
        ? day.items
        : day.items.filter(item => selectedCategories.includes(item.category as ActivityCategory))
    }));
  }, [groupedActivities, selectedCategories]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = fmtDate(startDate, { month: 'short', day: 'numeric' });
    const end = fmtDate(endDate, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const getDestinationForDate = (date: string) => {
    if (!trip) return undefined;
    const destination = getItineraryDestinationForDate(date, trip);
    return destination ? getCityName(destination) : undefined;
  };

  const formatHeaderDestination = (trip: Trip) => {
    if (trip.tripType === "multi" && trip.stops && trip.stops.length > 0) {
      return trip.stops.map(s => getCityName(s.destination)).join(" → ");
    }
    return trip.destination;
  };

  const getActivityCity = (activity: Activity, fallbackCity?: string) => (
    activity.city?.trim() || fallbackCity
  );

  const getActivityPlace = (activity: Activity, city?: string) => {
    const place = activity.location?.trim();
    return place && normalizeLocation(place) !== normalizeLocation(city ?? "") ? place : undefined;
  };

  if (!tripId) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{t("itinerary.tripNotFound")}</h2>
          <p className="text-muted-foreground">{t("itinerary.invalidId")}</p>
        </Card>
      </div>
    );
  }

  if (tripLoading || activitiesLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-40 bg-card border-b border-border backdrop-blur-lg bg-opacity-95 px-4 py-4">
          <div className="h-20 animate-pulse bg-muted rounded-lg" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{t("itinerary.tripNotFound")}</h2>
          <p className="text-muted-foreground">{t("itinerary.tripDoesNotExist")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TripHeader
        tripName={trip.name}
        destination={formatHeaderDestination(trip)}
        dates={formatDateRange(trip.startDate, trip.endDate)}
        travelers={{ adults: trip.adults, children: trip.children }}
        onSettingsClick={() => console.log('Settings clicked')}
        onNotificationsClick={() => console.log('Notifications clicked')}
      />

      {trip.tripType === "multi" && trip.stops.length > 0 ? (
        <div className="px-4 pt-4">
          <Card className="overflow-x-auto p-4" data-testid="multi-stop-route">
            <div className="flex min-w-max items-center">
              {trip.stops.map((stop, index) => (
                <div key={`${stop.destination}-${stop.startDate}`} className="flex items-center">
                  <div className="min-w-32">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <p className="max-w-40 truncate text-sm font-semibold">{stop.destination.split(",")[0]}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateRange(stop.startDate, stop.endDate)}
                    </p>
                  </div>
                  {index < trip.stops.length - 1 ? (
                    <ChevronRight className="mx-4 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {trip.tripType === "multi" && trip.stops.length > 1 ? (
        <section className="px-4 pt-4" aria-labelledby="transport-heading" data-testid="transit-recommendations">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {t("itinerary.betweenCities")}
              </p>
              <h2 id="transport-heading" className="mt-1 text-lg font-bold">
                {t("itinerary.howToMove")}
              </h2>
            </div>
            {transitQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">{t("itinerary.updating")}</span>
            ) : null}
          </div>

          {transitQuery.isLoading ? (
            <Card className="space-y-3 p-4">
              <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
            </Card>
          ) : transitQuery.isError ? (
            <Card className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{t("itinerary.transitError")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("itinerary.transitErrorDesc")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => transitQuery.refetch()}>
                {t("itinerary.retry")}
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {(transitQuery.data ?? []).map((transition) => {
                const recommended = transition.options.find((option) => option.mode === transition.recommendation);
                const RecommendationIcon = transportMeta[transition.recommendation].Icon;
                return (
                  <Card key={transition.id} className="overflow-hidden" data-testid={`transit-${transition.id}`}>
                    <div className="border-b border-border bg-primary/5 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">
                          {transition.origin}{" "}
                          <ChevronRight className="mx-0.5 inline h-4 w-4 text-muted-foreground" />{" "}
                          {transition.destination}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("itinerary.transferDate")}{" "}
                        {new Date(`${transition.travelDate}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long" })}
                      </p>
                    </div>
                    <div className="p-4">
                      <div className="flex gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                        <RecommendationIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">
                              {t("itinerary.recommendation")} {transportMeta[transition.recommendation].label}
                            </p>
                            {recommended?.isEstimated ? (
                              <Badge variant="outline">{t("itinerary.estimated")}</Badge>
                            ) : (
                              <Badge>{t("itinerary.scheduledChecked")}</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            {transition.recommendationReason}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {transition.options.map((option) => {
                          const { Icon } = transportMeta[option.mode];
                          const isRecommended = option.mode === transition.recommendation;
                          return (
                            <div
                              key={option.mode}
                              className={`rounded-lg border p-3 ${isRecommended ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <Icon className="h-4 w-4 text-primary" />
                                  <p className="text-sm font-semibold">{option.label}</p>
                                </div>
                                {isRecommended ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                                    {t("itinerary.chosen")}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <p className="flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {option.durationLabel}
                                  {option.departureTime ? ` · ${option.departureTime}–${option.arrivalTime}` : ""}
                                </p>
                                <p className="flex items-center gap-1">
                                  <CircleDollarSign className="h-3.5 w-3.5" />
                                  {t("itinerary.costFrom", { cost: fmtCurrency(option.estimatedCost, option.costCurrency) })} · {transportConvenience(option.convenience)}
                                </p>
                                <p>{option.summary}</p>
                              </div>
                              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Info className="h-3 w-3" />
                                {option.source}
                                {option.isEstimated ? ` ${t("itinerary.estimated_tag")}` : ""}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <Navigation2 className={`w-5 h-5 ${trackingEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <h3 className="font-semibold text-sm">{t("itinerary.trackingTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {trackingEnabled ? t("itinerary.trackingActive") : t("itinerary.trackingInactive")}
              </p>
            </div>
          </div>
          <Button
            variant={trackingEnabled ? "default" : "outline"}
            size="sm"
            onClick={handleToggleBackgroundTracking}
            data-testid="button-toggle-tracking"
          >
            {trackingEnabled ? t("itinerary.trackingStop") : t("itinerary.trackingStart")}
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <FilterChips
            selectedCategories={selectedCategories}
            onToggleCategory={handleToggleCategory}
            onClearAll={handleClearFilters}
          />
        </div>

        <div className="mb-4">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => console.log('Get AI suggestions')}
            data-testid="button-ai-suggestions"
          >
            <Sparkles className="w-4 h-4" />
            {t("itinerary.aiSuggestions")}
          </Button>
        </div>

        {filteredActivities.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">{t("itinerary.noActivities")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("itinerary.noActivitiesDesc")}
            </p>
            <Button
              onClick={() => handleAddActivity(trip.startDate, formatDayLabel(trip.startDate))}
              data-testid="button-add-activity"
            >
              {t("itinerary.addActivity")}
            </Button>
          </Card>
        ) : (
          filteredActivities.map((day) => (
            <DaySection
              key={day.id}
              date={day.date}
              dayOfWeek={day.day}
              totalDistance=""
              destination={getDestinationForDate(day.date)}
              onAddActivity={() => handleAddActivity(day.date, day.day)}
            >
              {day.items.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-12 h-12" />}
                  title={t("itinerary.noActivitiesFilter")}
                  description={t("itinerary.noActivitiesFilterDesc")}
                  actionLabel={t("itinerary.clearFilters")}
                  onAction={handleClearFilters}
                />
              ) : (
                day.items.map((item) => {
                  const fallbackCity = getDestinationForDate(day.date);
                  const activityCity = getActivityCity(item, fallbackCity);
                  const activityPlace = getActivityPlace(item, activityCity);
                  return (
                    item.type === "booking" ? (
                      <BookingCard
                        key={item.id}
                        id={item.id.toString()}
                        type={item.category as "flight" | "hotel" | "train"}
                        title={item.title}
                        destination={activityCity}
                        confirmationNumber={item.confirmationNumber || undefined}
                        time={item.time || undefined}
                        location={activityPlace}
                        details={item.details || undefined}
                        status={(item.status as "confirmed" | "pending") || "confirmed"}
                        onClick={() => handleEditActivity(item)}
                        onDelete={() => handleDeleteActivity(item.id)}
                      />
                    ) : (
                      <ActivityCard
                        key={item.id}
                        id={item.id.toString()}
                        title={item.title}
                        category={item.category as ActivityCategory}
                        destination={activityCity}
                        time={item.time || undefined}
                        location={activityPlace}
                        distance={item.distance || undefined}
                        description={item.description || undefined}
                        kidFriendly={item.kidFriendly || undefined}
                        budget={(item.budget as "low" | "medium" | "high") || undefined}
                        alarmSet={alarmsSet.has(item.id)}
                        onAlarmToggle={() => handleAlarmToggle(item.id, item.title, item.time)}
                        onClick={() => handleEditActivity(item)}
                        onDelete={() => handleDeleteActivity(item.id)}
                      />
                    )
                  );
                })
              )}
            </DaySection>
          ))
        )}
      </div>

      {tripId && (
        <ActivityDialog
          open={activityDialogOpen}
          onOpenChange={setActivityDialogOpen}
          tripId={tripId}
          trip={trip}
          activities={activities}
          activity={editingActivity}
          defaultDate={newActivityDate}
          defaultDay={newActivityDay}
        />
      )}
    </div>
  );
}
