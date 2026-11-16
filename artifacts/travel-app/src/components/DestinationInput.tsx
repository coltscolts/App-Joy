import { useState, useRef, useEffect } from "react";
import { getGetDestinationSuggestionsQueryKey, useGetDestinationSuggestions } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { t } from "@/lib/i18n";

interface DestinationInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function DestinationInput({ value, onChange, placeholder, "data-testid": testId }: DestinationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const destinationSearch = value.split(",").pop()?.trim() ?? "";
  const canSearch = isOpen && destinationSearch.length >= 2;
  const destinationParams = { query: destinationSearch, limit: 6 };
  const destinationQuery = useGetDestinationSuggestions(
    destinationParams,
    { query: { enabled: canSearch, staleTime: 60_000, queryKey: getGetDestinationSuggestionsQueryKey(destinationParams) } },
  );
  const suggestions = destinationQuery.data ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectDestination = (suggestion: { label: string }) => {
    onChange(suggestion.label);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        data-testid={testId}
      />
      {isOpen && canSearch ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {destinationQuery.isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t("destinationInput.searchingCities")}
            </p>
          ) : null}
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectDestination(suggestion)}
              data-testid={`destination-suggestion-${suggestion.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {suggestion.label}
            </button>
          ))}
          {!destinationQuery.isFetching && !destinationQuery.isError && suggestions.length === 0 ? (
            <button
              type="button"
              className="flex w-full items-center border-t border-border px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsOpen(false)}
              data-testid="destination-use-manual"
            >
              {t("destinationInput.useManual", { value: value.trim() })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
