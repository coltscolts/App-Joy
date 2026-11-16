import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SuggestionCard } from "@/components/SuggestionCard";
import { useToast } from "@/hooks/use-toast";
import { Search, RefreshCw, Sparkles } from "lucide-react";
import type { ActivityCategory } from "@/components/CategoryIcon";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { lang, t } from "@/lib/i18n";

// TODO: Remove mock data when implementing AI backend
const mockSuggestions = [
  {
    id: "1",
    title: t("discover.sampleVersaillesTitle"),
    category: "cultural" as ActivityCategory,
    description: t("discover.sampleVersaillesDesc"),
    location: "Versailles, 20km from Paris",
    estimatedTime: t("discover.duration4to5Hours"),
    kidFriendly: true,
    budget: "medium" as const,
  },
  {
    id: "2",
    title: "Disneyland Paris",
    category: "kids" as ActivityCategory,
    description: t("discover.sampleDisneyDesc"),
    location: "Marne-la-Vallée",
    estimatedTime: t("discover.durationFullDay"),
    kidFriendly: true,
    budget: "high" as const,
  },
  {
    id: "3",
    title: t("discover.sampleRunTitle"),
    category: "fitness" as ActivityCategory,
    description: t("discover.sampleRunDesc"),
    location: "16th arrondissement",
    estimatedTime: t("discover.duration1to2Hours"),
    kidFriendly: false,
    budget: "low" as const,
  },
  {
    id: "4",
    title: t("discover.sampleOperaTitle"),
    category: "cultural" as ActivityCategory,
    description: t("discover.sampleOperaDesc"),
    location: "Place de l'Opéra",
    estimatedTime: t("discover.duration3to4Hours"),
    kidFriendly: false,
    budget: "high" as const,
  },
  {
    id: "5",
    title: t("discover.sampleJazzTitle"),
    category: "nightlife" as ActivityCategory,
    description: t("discover.sampleJazzDesc"),
    location: "Latin Quarter",
    estimatedTime: t("discover.duration2to3Hours"),
    kidFriendly: false,
    budget: "medium" as const,
  },
  {
    id: "6",
    title: t("discover.sampleCookingTitle"),
    category: "cultural" as ActivityCategory,
    description: t("discover.sampleCookingDesc"),
    location: "Le Marais",
    estimatedTime: t("discover.duration3Hours"),
    kidFriendly: true,
    budget: "medium" as const,
  },
];

type BudgetFilter = "all" | "low" | "medium" | "high";

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");
  const [aiSuggestions, setAiSuggestions] = useState<typeof mockSuggestions>([]);
  const [showingAiResults, setShowingAiResults] = useState(false);
  const { toast } = useToast();

  const suggestionsMutation = useMutation({
    mutationFn: async ({ destination, budget }: { destination: string, budget: BudgetFilter }) => {
      const today = new Date();
      const date = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      const response = await apiRequest('POST', '/api/suggestions', {
        destination: destination || 'Paris',
        adults: 2,
        children: 1,
        category: "general",
        date,
        language: lang,
        childAges: [8],
        budget: budget === 'all' ? 'medium' : budget,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setAiSuggestions(data.map((s: any, idx: number) => ({ ...s, id: `ai-${idx}` })));
      setShowingAiResults(true);
      setSearchQuery("");
      toast({
        title: t("discover.aiComplete"),
        description: t("discover.aiCompleteDesc", { count: String(data.length) }),
      });
    },
    onError: () => {
      toast({
        title: t("discover.error"),
        description: t("discover.errorSuggestions"),
        variant: "destructive",
      });
    }
  });

  const handleSearch = () => {
    if (budgetFilter !== 'all' && searchQuery.trim()) {
      suggestionsMutation.mutate({
        destination: searchQuery.trim(),
        budget: budgetFilter
      });
    } else if (budgetFilter === 'all') {
      toast({
        title: t("discover.selectBudget"),
        description: t("discover.selectBudgetDesc"),
      });
    } else {
      toast({
        title: t("discover.enterDestination"),
        description: t("discover.enterDestinationDesc"),
      });
    }
  };

  const displaySuggestions = showingAiResults ? aiSuggestions : mockSuggestions;

  const filteredSuggestions = displaySuggestions.filter(s => {
    const matchesSearch = searchQuery
      ? s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesBudget = budgetFilter === "all" || s.budget === budgetFilter;

    return matchesSearch && matchesBudget;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border backdrop-blur-lg bg-opacity-95 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("discover.title")}</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {showingAiResults
            ? t("discover.subtitleAi")
            : t("discover.subtitleDefault")}
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("discover.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
              data-testid="input-search-destination"
            />
          </div>
          <Button
            variant="default"
            onClick={handleSearch}
            disabled={suggestionsMutation.isPending}
            data-testid="button-search-discover"
            className="gap-2"
          >
            {suggestionsMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {suggestionsMutation.isPending ? t("discover.searching") : t("discover.search")}
          </Button>
        </div>

        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("discover.budget")}</span>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Badge
                variant={budgetFilter === "all" ? "default" : "outline"}
                className="flex-shrink-0 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setBudgetFilter("all")}
                data-testid="filter-budget-all"
                aria-pressed={budgetFilter === "all"}
              >
                {t("discover.allBudgets")}
              </Badge>
              <Badge
                variant={budgetFilter === "low" ? "default" : "outline"}
                className="flex-shrink-0 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setBudgetFilter("low")}
                data-testid="filter-budget-low"
                aria-pressed={budgetFilter === "low"}
              >
                {t("discover.budgetFriendly")}
              </Badge>
              <Badge
                variant={budgetFilter === "medium" ? "default" : "outline"}
                className="flex-shrink-0 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setBudgetFilter("medium")}
                data-testid="filter-budget-medium"
                aria-pressed={budgetFilter === "medium"}
              >
                {t("discover.moderate")}
              </Badge>
              <Badge
                variant={budgetFilter === "high" ? "default" : "outline"}
                className="flex-shrink-0 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setBudgetFilter("high")}
                data-testid="filter-budget-high"
                aria-pressed={budgetFilter === "high"}
              >
                {t("discover.premium")}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Badge variant="secondary" className="flex-shrink-0">
              {t("discover.familyFriendly")}
            </Badge>
            <Badge variant="outline" className="flex-shrink-0">
              {t("discover.adults", { count: "2" })}
            </Badge>
            <Badge variant="outline" className="flex-shrink-0">
              {t("discover.children", { count: "1" })}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("discover.noSuggestions")}</p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              {...suggestion}
              onAdd={() => console.log(`Added ${suggestion.title} to itinerary`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
