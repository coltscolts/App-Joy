import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon, getCategoryColor, getCategoryBg, type ActivityCategory } from "./CategoryIcon";
import { Calendar, Clock, MapPin, Hash, Trash2 } from "lucide-react";
import { fmtDate, fmtTime, t } from "@/lib/i18n";

interface BookingCardProps {
  id: string;
  type: Extract<ActivityCategory, "flight" | "hotel" | "train">;
  title: string;
  destination?: string;
  confirmationNumber?: string;
  date?: string;
  time?: string;
  location?: string;
  details?: string;
  status?: "confirmed" | "pending" | "completed";
  onClick?: () => void;
  onDelete?: () => void;
}

export function BookingCard({
  type,
  title,
  destination,
  confirmationNumber,
  date,
  time,
  location,
  details,
  status = "confirmed",
  onClick,
  onDelete
}: BookingCardProps) {
  const statusColors = {
    confirmed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  const statusLabels: Record<"confirmed" | "pending" | "completed", string> = {
    confirmed: t("bookingCard.confirmed"),
    pending: t("bookingCard.pending"),
    completed: t("bookingCard.completed"),
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <Card
      className="p-4 hover-elevate active-elevate-2 cursor-pointer"
      onClick={onClick}
      data-testid={`card-booking-${type}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-3 rounded-lg ${getCategoryBg(type)}`}>
          <CategoryIcon
            category={type}
            className={`w-6 h-6 ${getCategoryColor(type)}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base" data-testid="text-booking-title">
              {title}
            </h3>
            <div className="flex gap-1 flex-shrink-0">
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleDeleteClick}
                  data-testid="button-delete-booking"
                  aria-label={t("itinerary.activityDeleted")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
            </div>
          </div>

           {destination && (
             <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
               <MapPin className="w-3.5 h-3.5" />
               <span data-testid="text-booking-destination">{destination}</span>
             </div>
           )}

          {confirmationNumber && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Hash className="w-3.5 h-3.5" />
              <span className="font-mono" data-testid="text-confirmation-number">{confirmationNumber}</span>
            </div>
          )}

          {date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span data-testid="text-booking-date">{fmtDate(date)}</span>
            </div>
          )}

          {time && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span data-testid="text-booking-time">{fmtTime(time)}</span>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate" data-testid="text-booking-location">{location}</span>
            </div>
          )}

          {details && (
            <p className="text-sm text-muted-foreground mt-2">
              {details}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
