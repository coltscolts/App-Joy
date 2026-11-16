import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { enUS, es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtDate, locale, t } from "@/lib/i18n";
import { dateStringToLocalDate, localDateToDateString, timePartsToValue, timeToParts, type TimeParts } from "@/lib/dateTime";

export const DateField = React.forwardRef<HTMLButtonElement, {
  value?: string | null;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label: string;
  testId?: string;
  className?: string;
}>(({ value, onChange, min, max, label, testId, className }, ref) => {
  const selected = dateStringToLocalDate(value);
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("flex gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !selected && "text-muted-foreground")}
            data-testid={testId}
            aria-label={label}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? fmtDate(value!, { year: "numeric", month: "short", day: "numeric" }) : t("dateTime.selectDate")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={locale.startsWith("es") ? es : enUS}
            selected={selected}
            onSelect={(date) => {
              onChange(localDateToDateString(date));
              if (date) setOpen(false);
            }}
            disabled={(date) => {
              const dateValue = localDateToDateString(date);
              return Boolean((min && dateValue < min) || (max && dateValue > max));
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {selected ? (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} aria-label={t("dateTime.clearDate")}>
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
});
DateField.displayName = "DateField";

export function TimeField({ value, onChange, testId }: { value?: string | null; onChange: (value: string) => void; testId?: string }) {
  const parts = timeToParts(value);
  const update = (patch: Partial<TimeParts>) => {
    const next = { ...(parts ?? { hour: "12", minute: "00", period: "AM" as const }), ...patch };
    onChange(timePartsToValue(next));
  };

  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <Select value={parts?.hour ?? ""} onValueChange={(hour) => update({ hour })}>
        <SelectTrigger aria-label={t("dateTime.hour")} className="w-[76px]"><SelectValue placeholder={t("dateTime.hour")} /></SelectTrigger>
        <SelectContent>{Array.from({ length: 12 }, (_, index) => <SelectItem key={index + 1} value={String(index + 1)}>{index + 1}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={parts?.minute ?? ""} onValueChange={(minute) => update({ minute })}>
        <SelectTrigger aria-label={t("dateTime.minute")} className="w-[76px]"><SelectValue placeholder={t("dateTime.minute")} /></SelectTrigger>
        <SelectContent>{Array.from({ length: 60 }, (_, index) => <SelectItem key={index} value={String(index).padStart(2, "0")}>{String(index).padStart(2, "0")}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={parts?.period ?? ""} onValueChange={(period) => update({ period: period as "AM" | "PM" })}>
        <SelectTrigger aria-label={t("dateTime.period")} className="w-[82px]"><SelectValue placeholder={t("dateTime.period")} /></SelectTrigger>
        <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
      </Select>
      {parts ? <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} aria-label={t("dateTime.clearTime")}><X className="h-4 w-4" /></Button> : null}
    </div>
  );
}