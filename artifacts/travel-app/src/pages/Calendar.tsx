import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon, Download, Share2,
  ChevronLeft, ChevronRight, Bell, Smartphone
} from "lucide-react";
import { CategoryIcon, categoryLabels, getCategoryColor, getCategoryBg, type ActivityCategory } from "@/components/CategoryIcon";
import { NotificationSettings } from "@/components/NotificationSettings";
import { calendarSync } from "@/lib/calendarSync";
import { fmtDate, fmtTime, t } from "@/lib/i18n";

// TODO: Remove mock data when implementing real backend
const mockCalendarEvents = [
  { id: "1", date: "2025-12-10", time: "18:30", title: t("calendar.sampleFlight"), category: "flight" as ActivityCategory },
  { id: "2", date: "2025-12-11", time: "15:00", title: t("calendar.sampleHotelCheckin"), category: "hotel" as ActivityCategory },
  { id: "3", date: "2025-12-11", time: "17:00", title: "Eiffel Tower", category: "tour" as ActivityCategory },
  { id: "4", date: "2025-12-12", time: "07:00", title: t("calendar.sampleMorningYoga"), category: "fitness" as ActivityCategory },
  { id: "5", date: "2025-12-12", time: "10:00", title: "Louvre Museum", category: "cultural" as ActivityCategory },
  { id: "6", date: "2025-12-12", time: "14:30", title: "Café de Flore", category: "restaurant" as ActivityCategory },
];

export default function Calendar() {
  const [currentMonth] = useState(() => fmtDate("2025-12-01", { month: "long", year: "numeric" }));
  const [showNotifications, setShowNotifications] = useState(false);
  const { toast } = useToast();

  const handleSyncToiOSCalendar = async () => {
    try {
      const hasPermission = await calendarSync.requestCalendarPermissions();

      if (!hasPermission) {
        toast({
          title: t("calendar.permissionRequired"),
          description: t("calendar.permissionDesc"),
          variant: "destructive",
        });
        return;
      }

      const events = mockCalendarEvents.map(event =>
        calendarSync.createEventFromActivity(
          event.id,
          event.title,
          event.date,
          event.time,
          undefined,
          t("calendar.eventDescription", { category: categoryLabels[event.category] }),
          event.category
        )
      );

      const result = await calendarSync.syncToNativeCalendar(events);

      toast({
        title: t("calendar.synced"),
        description: t("calendar.syncedDesc", { count: String(result.success) }),
      });
    } catch (error) {
      console.error('Error syncing to iOS Calendar:', error);
      toast({
        title: t("calendar.syncFailed"),
        description: t("calendar.syncFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const handleExportCalendar = (format: string) => {
    console.log(`Exporting calendar as ${format}`);
    const events = mockCalendarEvents.map(event =>
      calendarSync.createEventFromActivity(
        event.id,
        event.title,
        event.date,
        event.time,
        undefined,
        t("calendar.eventDescription", { category: categoryLabels[event.category] }),
        event.category
      )
    );

    calendarSync.syncToNativeCalendar(events);

    toast({
      title: t("calendar.exported"),
      description: t("calendar.exportedDesc"),
    });
  };

  const weekdays = [
    t("calendar.weekdaySun"),
    t("calendar.weekdayMon"),
    t("calendar.weekdayTue"),
    t("calendar.weekdayWed"),
    t("calendar.weekdayThu"),
    t("calendar.weekdayFri"),
    t("calendar.weekdaySat"),
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border backdrop-blur-lg bg-opacity-95 px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("calendar.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("calendar.subtitle")}
        </p>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="default"
            className="gap-2"
            onClick={handleSyncToiOSCalendar}
            data-testid="button-sync-ios-calendar"
          >
            <Smartphone className="w-4 h-4" />
            {t("calendar.syncIOS")}
          </Button>
          <Button
            variant={showNotifications ? "default" : "outline"}
            className="gap-2"
            onClick={() => setShowNotifications(!showNotifications)}
            data-testid="button-notifications"
          >
            <Bell className="w-4 h-4" />
            {t("calendar.notifications")}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleExportCalendar('ical')}
            data-testid="button-export-ical"
          >
            <Download className="w-4 h-4" />
            {t("calendar.exportIcs")}
          </Button>
        </div>
      </div>

      <div className="p-4">
        {showNotifications && (
          <div className="mb-6">
            <NotificationSettings
              onSave={(settings) => {
                console.log('Saved notification settings:', settings);
                setShowNotifications(false);
              }}
            />
          </div>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" data-testid="button-prev-month" aria-label={t("calendar.previousMonth")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">{currentMonth}</h2>
          <Button variant="ghost" size="icon" data-testid="button-next-month" aria-label={t("calendar.nextMonth")}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekdays.map((day: string) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}

          {/* Calendar days - simplified for prototype */}
          {Array.from({ length: 35 }, (_, i) => {
            const dayNum = i - 2;
            const isCurrentMonth = dayNum >= 1 && dayNum <= 31;
            const hasEvents = [10, 11, 12].includes(dayNum);

            return (
              <div
                key={i}
                className={`aspect-square p-1 text-center rounded-lg ${
                  isCurrentMonth
                    ? hasEvents
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'hover-elevate cursor-pointer'
                    : 'text-muted-foreground/40'
                }`}
                data-testid={isCurrentMonth ? `calendar-day-${dayNum}` : undefined}
              >
                <div className="text-sm font-medium">
                  {isCurrentMonth ? dayNum : ''}
                </div>
                {hasEvents && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <div className="w-1 h-1 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Events List */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t("calendar.upcomingActivities")}</h3>
          <div className="space-y-2">
            {mockCalendarEvents.map((event) => (
              <Card
                key={event.id}
                className="p-3 hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => console.log(`Event ${event.id} clicked`)}
                data-testid={`calendar-event-${event.category}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${getCategoryBg(event.category)}`}>
                    <CategoryIcon
                      category={event.category}
                      className={`w-4 h-4 ${getCategoryColor(event.category)}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{event.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{fmtDate(event.date)}</span>
                      <span>•</span>
                      <span>{fmtTime(event.time)}</span>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    {categoryLabels[event.category]}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sync Info */}
        <Card className="p-4 mt-6 bg-muted/50">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-1">{t("calendar.syncInfo")}</h4>
              <p className="text-xs text-muted-foreground mb-3">
                {t("calendar.syncInfoDesc")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">iOS Calendar</Badge>
                <Badge variant="secondary" className="text-xs">Google Calendar</Badge>
                <Badge variant="secondary" className="text-xs">Outlook</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
