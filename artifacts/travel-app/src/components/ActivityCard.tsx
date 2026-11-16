import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon, getCategoryColor, getCategoryBg, categoryLabels, type ActivityCategory } from "./CategoryIcon";
import { Clock, MapPin, Navigation, Bell, BellOff, Trash2 } from "lucide-react";
import { fmtTime, t } from "@/lib/i18n";

export type BudgetLevel = "low" | "medium" | "high";

interface ActivityCardProps {
  id: string;
  title: string;
  category: ActivityCategory;
  destination?: string;
  time?: string;
  location?: string;
  distance?: string;
  description?: string;
  kidFriendly?: boolean;
  budget?: BudgetLevel;
  alarmSet?: boolean;
  onAlarmToggle?: () => void;
  onClick?: () => void;
  onDelete?: () => void;
}

const budgetLabels: Record<BudgetLevel, string> = {
  low: "$",
  medium: "$$",
  high: "$$$"
};

const budgetColors: Record<BudgetLevel, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
};

export function ActivityCard({
  title,
  category,
  destination,
  time,
  location,
  distance,
  description,
  kidFriendly,
  budget,
  alarmSet = false,
  onAlarmToggle,
  onClick,
  onDelete
}: ActivityCardProps) {
  const handleAlarmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAlarmToggle?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <Card
      className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`card-activity-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${getCategoryBg(category)} flex-shrink-0`}>
          <CategoryIcon
            category={category}
            className={`w-5 h-5 ${getCategoryColor(category)}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base" data-testid="text-activity-title">
              {title}
            </h3>
            <div className="flex gap-1 flex-shrink-0">
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleDeleteClick}
                  data-testid="button-delete-activity"
                  aria-label={t("itinerary.activityDeleted")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              {budget && (
                <Badge className={`text-xs ${budgetColors[budget]}`}>
                  {budgetLabels[budget]}
                </Badge>
              )}
              {kidFriendly && (
                <Badge variant="secondary" className="text-xs">
                  {t("activityCard.kidFriendly")}
                </Badge>
              )}
            </div>
          </div>

           {destination && (
             <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
               <MapPin className="w-3.5 h-3.5" />
               <span data-testid="text-activity-destination">{destination}</span>
             </div>
           )}

          {time && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span data-testid="text-activity-time">{fmtTime(time)}</span>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate" data-testid="text-activity-location">{location}</span>
            </div>
          )}

          {distance && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Navigation className="w-3.5 h-3.5" />
              <span data-testid="text-activity-distance">{distance}</span>
            </div>
          )}

          {description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {categoryLabels[category]}
            </Badge>

            {time && (
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 h-7 ${alarmSet ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={handleAlarmClick}
                data-testid="button-alarm-toggle"
                aria-label={alarmSet ? t("activityCard.alarmSet") : t("activityCard.setAlarm")}
              >
                {alarmSet ? (
                  <Bell className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <BellOff className="w-3.5 h-3.5" />
                )}
                <span className="text-xs">{alarmSet ? t("activityCard.alarmSet") : t("activityCard.setAlarm")}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
