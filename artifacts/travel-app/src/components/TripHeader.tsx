import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Users } from "lucide-react";
import { t } from "@/lib/i18n";

interface TripHeaderProps {
  tripName: string;
  destination: string;
  dates: string;
  travelers?: { adults: number; children: number };
  onSettingsClick?: () => void;
  onNotificationsClick?: () => void;
}

export function TripHeader({
  tripName,
  destination,
  dates,
  travelers,
  onSettingsClick,
  onNotificationsClick
}: TripHeaderProps) {
  const travelersLabel = travelers
    ? (() => {
        const adults =
          travelers.adults === 1
            ? t("tripHeader.adult_one", { count: 1 })
            : t("tripHeader.adult_other", { count: travelers.adults });
        const children =
          travelers.children > 0
            ? travelers.children === 1
              ? t("tripHeader.child_one", { count: 1 })
              : t("tripHeader.child_other", { count: travelers.children })
            : "";
        return adults + children;
      })()
    : "";

  return (
    <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-40 backdrop-blur-lg bg-opacity-95">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate" data-testid="text-trip-name">
            {tripName}
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-destination">
            {destination}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            data-testid="button-notifications"
            aria-label={t("calendar.notifications")}
          >
            <Bell className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            data-testid="button-settings"
            aria-label={t("profile.settings")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs" data-testid="badge-dates">
          {dates}
        </Badge>
        {travelers && (
          <Badge variant="outline" className="text-xs gap-1" data-testid="badge-travelers">
            <Users className="w-3 h-3" />
            {travelersLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}
