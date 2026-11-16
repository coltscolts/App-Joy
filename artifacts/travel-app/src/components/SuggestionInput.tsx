import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

export type SuggestionOption = {
  value: string;
  detail?: string;
  placeId?: string;
  address?: string;
  city?: string;
};

type SuggestionInputProps = {
  value: string;
  onChange: (value: string) => void;
  options: SuggestionOption[];
  placeholder?: string;
  inputTestId: string;
  suggestionTestIdPrefix: string;
  manualTestId: string;
  loading?: boolean;
  manualLabel: string;
  onSelect?: (option: SuggestionOption) => void;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function SuggestionInput({
  value,
  onChange,
  options,
  placeholder,
  inputTestId,
  suggestionTestIdPrefix,
  manualTestId,
  loading = false,
  manualLabel,
  onSelect,
}: SuggestionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const visibleOptions = useMemo(() => {
    const query = normalize(value);
    const seen = new Set<string>();
    return options.filter((option) => {
      const normalizedOption = normalize(option.value);
      if (seen.has(normalizedOption)) return false;
      seen.add(normalizedOption);
      return !query || normalizedOption.includes(query);
    }).slice(0, 8);
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        data-testid={inputTestId}
      />
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t("suggestionInput.searchingCities")}
            </p>
          ) : null}
          {visibleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                onSelect?.(option);
                setIsOpen(false);
              }}
              data-testid={`${suggestionTestIdPrefix}-${option.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{option.value}</span>
              {option.detail ? <span className="ml-2 shrink-0 text-xs text-muted-foreground">{option.detail}</span> : null}
            </button>
          ))}
          {!loading && value.trim() && visibleOptions.length === 0 ? (
            <button
              type="button"
              className="flex w-full items-center border-t border-border px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsOpen(false)}
              data-testid={manualTestId}
            >
              {t("suggestionInput.useManual", { value: value.trim(), label: manualLabel })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
