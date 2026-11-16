import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Share2, Users, Calendar, MapPin, MoreVertical, Trash2, Compass, Globe2, ArrowRight, Minus } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Trip, type InsertTrip } from "@/lib/schemas";
import { Link } from "wouter";
import { DestinationInput } from "@/components/DestinationInput";
import { DateField } from "@/components/DateTimeFields";
import { t, fmtDate } from "@/lib/i18n";
import { useTheme } from "@/components/theme-provider";

function DarkTripCard({
  trip,
  formatDate,
  formatStops,
  onShare,
  onDelete,
}: {
  trip: Trip;
  formatDate: (date: string) => string;
  formatStops: (stops: Trip["stops"]) => string | null;
  onShare: (trip: Trip) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card className="travel-trip-card p-4 transition-transform hover:-translate-y-0.5" data-testid={`card-trip-${trip.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="travel-trip-name truncate" data-testid="text-trip-name">{trip.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{trip.tripType === "multi" && trip.stops ? formatStops(trip.stops) : trip.destination}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" data-testid="button-trip-menu" aria-label={t("myTrips.shareTrip")}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onShare(trip)} data-testid="menu-share"><Share2 className="w-4 h-4 mr-2" />{t("myTrips.shareTrip")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(trip.id)} className="text-destructive" data-testid="menu-delete"><Trash2 className="w-4 h-4 mr-2" />{t("myTrips.deleteTrip")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Badge variant="secondary" className="travel-badge"><Calendar className="w-3 h-3" />{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</Badge>
        <Badge variant="outline" className="travel-badge">
          <Users className="w-3 h-3" />
          {trip.adults === 1 ? t("tripHeader.adult_one", { count: 1 }) : t("tripHeader.adult_other", { count: trip.adults })}
          {trip.children > 0 && (trip.children === 1 ? t("tripHeader.child_one", { count: 1 }) : t("tripHeader.child_other", { count: trip.children }))}
        </Badge>
      </div>
      <div className="flex gap-2 mt-3">
        <Link href={`/trip/${trip.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="travel-outline-action w-full gap-2" data-testid="button-view-trip">{t("myTrips.viewItinerary")}</Button>
        </Link>
        <Button variant="outline" size="sm" className="travel-outline-action gap-2" onClick={(event) => { event.stopPropagation(); onShare(trip); }} data-testid="button-share-trip">
          <Share2 className="w-3.5 h-3.5" />{t("myTrips.share")}
        </Button>
      </div>
    </Card>
  );
}

const formSchema = z.object({
  name: z.string().min(1, t("myTrips.nameRequired")),
  tripType: z.enum(["single", "multi"]),
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  adults: z.number().min(1).optional(),
  children: z.number().min(0).optional(),
  stops: z.array(z.object({
    destination: z.string().min(1, t("myTrips.destinationRequired")),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("myTrips.formatDate")),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("myTrips.formatDate")),
  })).default([]),
}).superRefine((data, ctx) => {
  if (data.tripType === "single") {
    if (!data.destination) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("myTrips.destinationRequired"), path: ["destination"] });
    if (!data.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("myTrips.startDateRequired"), path: ["startDate"] });
    if (!data.endDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("myTrips.endDateRequired"), path: ["endDate"] });
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("myTrips.endDateAfterStart"), path: ["endDate"] });
    }
  } else {
    if (data.stops.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("myTrips.atLeastTwoStops"), path: ["stops"] });
    }
    for (let i = 0; i < data.stops.length; i++) {
      if (data.stops[i].startDate && data.stops[i].endDate && data.stops[i].startDate > data.stops[i].endDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("myTrips.stopEndAfterStart"), path: ["stops", i, "endDate"] });
      }
    }
    for (let i = 0; i < data.stops.length - 1; i++) {
      if (data.stops[i].endDate > data.stops[i + 1].startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("myTrips.stopOverlap"), path: ["stops"] });
      }
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

export default function MyTrips({ mode = "upcoming" }: { mode?: "upcoming" | "history" }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips'],
  });
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const visibleTrips = trips.filter((trip) => mode === "history" ? trip.endDate < localToday : trip.endDate >= localToday);
  const hasPastTrips = trips.some((trip) => trip.endDate < localToday);

  const createMutation = useMutation({
    mutationFn: async (data: InsertTrip) => {
      const res = await apiRequest('POST', '/api/trips', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: t("myTrips.tripCreated"),
        description: t("myTrips.tripCreatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("myTrips.error"),
        description: t("myTrips.errorCreate"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tripId: number) => {
      await apiRequest('DELETE', `/api/trips/${tripId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      toast({
        title: t("myTrips.tripDeleted"),
        description: t("myTrips.tripDeletedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("myTrips.error"),
        description: t("myTrips.errorDelete"),
        variant: "destructive",
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      tripType: "single",
      destination: "",
      startDate: "",
      endDate: "",
      adults: 2,
      children: 0,
      stops: [
        { destination: "", startDate: "", endDate: "" },
        { destination: "", startDate: "", endDate: "" }
      ]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  const selectedTripType = form.watch("tripType");
  const singleStartDate = form.watch("startDate");
  const stopValues = form.watch("stops");

  const handleCreateTrip = (data: FormValues) => {
    let payload: InsertTrip;
    if (data.tripType === "multi") {
      const orderedStops = data.stops.map((stop) => ({
        ...stop,
        destination: stop.destination.trim(),
      }));
      const destinations = orderedStops.map(s => s.destination).join(", ");
      payload = {
        name: data.name,
        tripType: "multi",
        adults: data.adults || 1,
        children: data.children || 0,
        destination: destinations,
        startDate: orderedStops[0].startDate,
        endDate: orderedStops[orderedStops.length - 1].endDate,
        stops: orderedStops,
      };
    } else {
      payload = {
        name: data.name,
        tripType: "single",
        adults: data.adults || 1,
        children: data.children || 0,
        destination: data.destination!,
        startDate: data.startDate!,
        endDate: data.endDate!,
        stops: [],
      };
    }
    createMutation.mutate(payload);
  };

  const handleShareTrip = async (trip: Trip) => {
    const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/trip/${trip.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.name,
          text: t("myTrips.shareNativeText", { destination: trip.destination }),
          url: shareUrl,
        });
        toast({
          title: t("myTrips.sharedSuccess"),
          description: t("myTrips.sharedSuccessDesc"),
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: t("myTrips.linkCopied"),
      description: t("myTrips.linkCopiedDesc"),
    });
  };

  const handleDeleteTrip = (tripId: number) => {
    deleteMutation.mutate(tripId);
  };

  const formatDate = (dateString: string) => {
    return fmtDate(dateString, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatStops = (stops: Trip["stops"]) => {
    if (!stops || stops.length === 0) return null;
    return stops.map(s => s.destination.split(",")[0]).join(" → ");
  };

  const tripCountLabel = visibleTrips.length === 1
    ? t("myTrips.tripCount_one", { count: 1 })
    : t("myTrips.tripCount_other", { count: visibleTrips.length });

  if (isLoading) {
    return (
      <div className="travel-shell min-h-screen pb-24">
        <div className="travel-topography" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-xl px-5 pt-8">
          <header className="travel-header">
            <div className="flex items-center gap-3">
              <div className="travel-brand-mark"><Globe2 className="h-6 w-6" /></div>
              <div>
                <p className="travel-eyebrow">{t("myTrips.eyebrow")}</p>
                <h1 className="travel-page-title">{mode === "history" ? t("history.title") : t("myTrips.title")}</h1>
              </div>
            </div>
          </header>
          <div className="mt-8 space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="travel-trip-card h-28 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="travel-shell min-h-screen pb-24">
      <div className="travel-topography" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-xl px-5 pt-8">
        <header className="travel-header">
          <div className="flex items-center gap-3">
            <div className="travel-brand-mark"><Globe2 className="h-6 w-6" /></div>
            <div>
              <p className="travel-eyebrow">{t("myTrips.eyebrow")}</p>
              <h1 className="travel-page-title">{mode === "history" ? t("history.title") : t("myTrips.title")}</h1>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="travel-add-button"
                data-testid="button-create-trip"
                aria-label={t("myTrips.createTrip")}
              >
                <Plus className="h-7 w-7" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("myTrips.createTrip")}</DialogTitle>
                <DialogDescription>
                  {t("myTrips.createTripDesc")}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateTrip)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("myTrips.tripName")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("myTrips.tripNamePlaceholder")} {...field} data-testid="input-trip-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tripType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("myTrips.tripType")}</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            aria-pressed={field.value === "single"}
                            data-testid="button-trip-type-single"
                            onClick={() => field.onChange("single")}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                              field.value === "single"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:bg-muted"
                            }`}
                          >
                            {t("myTrips.singleDest")}
                          </button>
                          <button
                            type="button"
                            aria-pressed={field.value === "multi"}
                            data-testid="button-trip-type-multi"
                            onClick={() => field.onChange("multi")}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                              field.value === "multi"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:bg-muted"
                            }`}
                          >
                            {t("myTrips.multiDest")}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedTripType === "single" ? (
                    <>
                      <FormField
                        control={form.control}
                        name="destination"
                        render={({ field }) => (
                          <FormItem className="relative">
                            <FormLabel>{t("myTrips.destination")}</FormLabel>
                            <FormControl>
                              <DestinationInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder={t("myTrips.destinationPlaceholder")}
                                data-testid="input-destination"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("myTrips.startDate")}</FormLabel>
                              <FormControl><DateField {...field} label={t("myTrips.startDate")} testId="input-start-date" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("myTrips.endDate")}</FormLabel>
                              <FormControl><DateField {...field} min={singleStartDate || undefined} label={t("myTrips.endDate")} testId="input-end-date" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <FormLabel>{t("myTrips.stops")}</FormLabel>
                      <FormMessage>{form.formState.errors.stops?.message || form.formState.errors.stops?.root?.message}</FormMessage>
                      {fields.map((stop, index) => (
                        <div key={stop.id} className="relative p-4 border border-border rounded-xl space-y-3 bg-card/50">
                          {index >= 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(index)}
                              data-testid={`button-remove-stop-${index}`}
                              aria-label={t("myTrips.stop", { num: String(index + 1) })}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                          <h4 className="text-sm font-semibold text-muted-foreground">
                            {t("myTrips.stop", { num: String(index + 1) })}
                          </h4>
                          <FormField
                            control={form.control}
                            name={`stops.${index}.destination`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <DestinationInput
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeholder={t("myTrips.cityPlaceholder")}
                                    data-testid={`input-stop-${index}-destination`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`stops.${index}.startDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl><DateField {...field} min={index > 0 ? stopValues[index - 1]?.endDate || undefined : undefined} label={t("myTrips.startDate")} testId={`input-stop-${index}-start-date`} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`stops.${index}.endDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl><DateField {...field} min={stopValues[index]?.startDate || undefined} label={t("myTrips.endDate")} testId={`input-stop-${index}-end-date`} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-dashed"
                        onClick={() => append({ destination: "", startDate: "", endDate: "" })}
                        data-testid="button-add-stop"
                      >
                        <Plus className="w-4 h-4" /> {t("myTrips.addStop")}
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="adults"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("myTrips.adults")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-adults"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="children"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("myTrips.children")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-children"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    data-testid="button-submit-trip"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? t("myTrips.creating") : t("myTrips.create")}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </header>

        <section className={isDark ? "travel-summary" : "travel-summary flex-col items-stretch gap-4 p-5"}>
          {isDark ? (
            <>
              <div>
                <p className="travel-summary-eyebrow">{mode === "history" ? t("history.eyebrow") : t("myTrips.enRoute")}</p>
                <p className="travel-summary-value">{tripCountLabel}</p>
                <p className="travel-summary-copy">{mode === "history" ? t("history.tagline") : t("myTrips.tagline")}</p>
              </div>
              <Compass className="h-12 w-12 text-cyan-100/90" strokeWidth={1.7} />
            </>
          ) : mode === "upcoming" ? (
            <>
              <Link href="/discover" className="block">
                <div className="flex items-center gap-3 bg-muted/50 hover:bg-muted/80 transition-colors rounded-xl px-4 py-3 text-muted-foreground border border-border/50">
                  <Search className="w-5 h-5" />
                  <span className="text-[15px]">{t("discover.searchPlaceholder")}</span>
                </div>
              </Link>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <button onClick={() => setIsCreateDialogOpen(true)} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">{t("myTrips.create")}</span>
                </button>
                <Link href="/discover" className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Compass className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">{t("nav.discover")}</span>
                </Link>
                <Link href="/calendar" className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">{t("nav.calendar")}</span>
                </Link>
                <Link href="/map" className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">{t("nav.map")}</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full h-full">
              <div>
                <p className="travel-summary-eyebrow">{t("history.eyebrow")}</p>
                <p className="travel-summary-value">{tripCountLabel}</p>
                <p className="travel-summary-copy">{t("history.tagline")}</p>
              </div>
              <Compass className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.7} />
            </div>
          )}
        </section>

        <main>
          <h2 className="travel-section-title">{mode === "history" ? t("history.sectionTitle") : t("myTrips.sectionTitle")}</h2>
          {visibleTrips.length === 0 ? (
            <div className="travel-empty-panel">
              <div className="travel-empty-icon"><Calendar className="h-9 w-9" strokeWidth={1.8} /></div>
              <h3>{mode === "history" ? t("history.emptyTitle") : trips.length === 0 ? t("myTrips.emptyTitle") : t("myTrips.noUpcomingTitle")}</h3>
              <p>
                {mode === "history" ? t("history.emptyDesc") : trips.length === 0 ? t("myTrips.emptyDesc") : t("myTrips.noUpcomingDesc")}
              </p>
              {mode === "upcoming" && (trips.length === 0 ? (
                <Button className="mt-6" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-trip">
                  <Plus className="w-4 h-4 mr-2" />{t("myTrips.emptyAction")}
                </Button>
              ) : hasPastTrips ? (
                <Link href="/history" className="mt-6"><Button variant="outline" className="travel-outline-action">{t("myTrips.viewHistory")}</Button></Link>
              ) : null)}
            </div>
          ) : (
            <div className={isDark || mode === "history" ? "space-y-4" : "flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"}>
            {visibleTrips.map((trip) => isDark ? (
              <DarkTripCard key={trip.id} trip={trip} formatDate={formatDate} formatStops={formatStops} onShare={handleShareTrip} onDelete={handleDeleteTrip} />
            ) : (
              <Card
                key={trip.id}
                className={`travel-trip-card p-4 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${mode === "upcoming" ? "w-[280px] sm:w-[320px] h-[340px] flex-shrink-0 snap-center" : ""}`}
                data-testid={`card-trip-${trip.id}`}
              >
                <div className="relative h-32 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  {trip.coverImage ? (
                    <img src={trip.coverImage} alt={trip.destination} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 dark:from-primary/20 dark:to-accent/10" />
                  )}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-black/20 hover:text-white shrink-0 h-8 w-8 rounded-full bg-black/10 backdrop-blur-sm"
                          data-testid="button-trip-menu"
                          aria-label={t("myTrips.shareTrip")}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShareTrip(trip)} data-testid="menu-share">
                          <Share2 className="w-4 h-4 mr-2" />
                          {t("myTrips.shareTrip")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="text-destructive"
                          data-testid="menu-delete"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("myTrips.deleteTrip")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                    <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur-md border-none shadow-sm">
                      {mode === "upcoming" ? t("myTrips.enRoute") : t("history.completed")}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground truncate mb-1" data-testid="text-trip-name">
                      {trip.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate font-medium">
                        {trip.tripType === "multi" && trip.stops ? formatStops(trip.stops) : trip.destination}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      <Badge variant="outline" className="bg-muted/30 travel-badge border-border/50 text-xs py-0.5">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </Badge>
                      <Badge variant="outline" className="bg-muted/30 travel-badge border-border/50 text-xs py-0.5">
                        <Users className="w-3 h-3 mr-1" />
                        {trip.adults + trip.children}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2">
                    <Link href={`/trip/${trip.id}`} className="flex-1">
                      <Button className="w-full gap-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90" data-testid="button-view-trip">
                        {t("myTrips.viewItinerary")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
