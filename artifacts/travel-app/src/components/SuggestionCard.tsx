import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon, getCategoryColor, getCategoryBg, type ActivityCategory } from "./CategoryIcon";
import { Plus, MapPin, Clock, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";

export type BudgetLevel = "low" | "medium" | "high";

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

interface SuggestionCardProps {
  title: string;
  category: ActivityCategory;
  description: string;
  location?: string;
  estimatedTime?: string;
  kidFriendly?: boolean;
  budget?: BudgetLevel;
  aiGenerated?: boolean;
  onAdd?: () => void;
}

export function SuggestionCard({
  title,
  category,
  description,
  location,
  estimatedTime,
  kidFriendly,
  budget,
  aiGenerated = true,
  onAdd
}: SuggestionCardProps) {
  return (
    <Card className="p-4 hover-elevate active-elevate-2">
      <div className="flex gap-3">
        <div className={`p-2 rounded-md ${getCategoryBg(category)} flex-shrink-0 h-fit`}>
          <CategoryIcon
            category={category}
            className={`w-5 h-5 ${getCategoryColor(category)}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold" data-testid="text-suggestion-title">
              {title}
            </h4>
            {aiGenerated && (
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {description}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{location}</span>
              </div>
            )}
            {estimatedTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{estimatedTime}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={onAdd}
              className="gap-1.5"
              data-testid="button-add-suggestion"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("suggestionCard.addToItinerary")}
            </Button>
            {budget && (
              <Badge className={`text-xs ${budgetColors[budget]}`}>
                {budgetLabels[budget]}
              </Badge>
            )}
            {kidFriendly && (
              <Badge variant="secondary" className="text-xs">
                {t("suggestionCard.kidFriendly")}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
