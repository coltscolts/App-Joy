import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Navigation, MapPin } from "lucide-react";
import { useState } from "react";
import { fmtDate, t } from "@/lib/i18n";

interface DaySectionProps {
  date: string;
  dayOfWeek: string;
  totalDistance?: string;
  destination?: string;
  children: React.ReactNode;
  onAddActivity?: () => void;
}

export function DaySection({
  date,
  dayOfWeek,
  totalDistance,
  destination,
  children,
  onAddActivity
}: DaySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-6">
      <Card className="overflow-hidden">
        <div
          className="p-4 bg-card cursor-pointer hover-elevate active-elevate-2"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-day-toggle"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-day-date">
                {dayOfWeek}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">{fmtDate(date)}</p>
                {destination && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {destination}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {totalDistance && (
                <Badge variant="secondary" className="gap-1.5">
                  <Navigation className="w-3 h-3" />
                  {totalDistance}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-3 border-t">
            {children}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onAddActivity?.();
              }}
              data-testid="button-add-activity"
            >
              <Plus className="w-4 h-4" />
              {t("daySection.addActivity")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
