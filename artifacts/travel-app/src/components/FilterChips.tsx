import { Badge } from "@/components/ui/badge";
import { CategoryIcon, categoryLabels, type ActivityCategory } from "./CategoryIcon";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";

interface FilterChipsProps {
  selectedCategories: ActivityCategory[];
  onToggleCategory: (category: ActivityCategory) => void;
  onClearAll: () => void;
}

const filterableCategories: ActivityCategory[] = [
  "hotel",
  "tour",
  "restaurant",
  "bar",
  "cultural",
  "fitness",
  "nightlife",
  "kids",
  "transfer",
  "transportation",
];

export function FilterChips({
  selectedCategories,
  onToggleCategory,
  onClearAll
}: FilterChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filterableCategories.map((category) => {
        const isSelected = selectedCategories.includes(category);

        return (
          <Badge
            key={category}
            variant={isSelected ? "default" : "outline"}
            className="cursor-pointer gap-1.5 flex-shrink-0 hover-elevate active-elevate-2"
            onClick={() => onToggleCategory(category)}
            data-testid={`filter-${category}`}
            aria-pressed={isSelected}
          >
            <CategoryIcon category={category} className="w-3 h-3" />
            {categoryLabels[category]}
          </Badge>
        );
      })}

      {selectedCategories.length > 0 && (
        <Badge
          variant="secondary"
          className="cursor-pointer gap-1 flex-shrink-0 hover-elevate active-elevate-2"
          onClick={onClearAll}
          data-testid="filter-clear"
        >
          <X className="w-3 h-3" />
          {t("filterChips.clear")}
        </Badge>
      )}
    </div>
  );
}
