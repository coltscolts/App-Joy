import {
  Plane, Hotel, Utensils, Train, Compass,
  Dumbbell, Theater, Martini, Moon, Baby, Map,
  Calendar, Clock, MapPin, Car, Bus
} from "lucide-react";
import { t } from "@/lib/i18n";

export type ActivityCategory =
  | "flight"
  | "hotel"
  | "restaurant"
  | "bar"
  | "train"
  | "tour"
  | "fitness"
  | "cultural"
  | "nightlife"
  | "kids"
  | "transfer"
  | "transportation"
  | "general";

interface CategoryIconProps {
  category: ActivityCategory;
  className?: string;
}

export function CategoryIcon({ category, className = "w-4 h-4" }: CategoryIconProps) {
  const icons = {
    flight: Plane,
    hotel: Hotel,
    restaurant: Utensils,
    bar: Martini,
    train: Train,
    tour: Compass,
    fitness: Dumbbell,
    cultural: Theater,
    nightlife: Moon,
    kids: Baby,
    transfer: Car,
    transportation: Bus,
    general: Map,
  };

  const Icon = icons[category] || Map;
  return <Icon className={className} />;
}

export function getCategoryColor(category: ActivityCategory): string {
  const colors = {
    flight: "text-blue-600 dark:text-blue-400",
    hotel: "text-purple-600 dark:text-purple-400",
    restaurant: "text-orange-600 dark:text-orange-400",
    bar: "text-amber-600 dark:text-amber-400",
    train: "text-green-600 dark:text-green-400",
    tour: "text-cyan-600 dark:text-cyan-400",
    fitness: "text-red-600 dark:text-red-400",
    cultural: "text-pink-600 dark:text-pink-400",
    nightlife: "text-violet-600 dark:text-violet-400",
    kids: "text-yellow-600 dark:text-yellow-400",
    transfer: "text-teal-600 dark:text-teal-400",
    transportation: "text-indigo-600 dark:text-indigo-400",
    general: "text-slate-600 dark:text-slate-400",
  };

  return colors[category] || colors.general;
}

export function getCategoryBg(category: ActivityCategory): string {
  const colors = {
    flight: "bg-blue-100 dark:bg-blue-950",
    hotel: "bg-purple-100 dark:bg-purple-950",
    restaurant: "bg-orange-100 dark:bg-orange-950",
    bar: "bg-amber-100 dark:bg-amber-950",
    train: "bg-green-100 dark:bg-green-950",
    tour: "bg-cyan-100 dark:bg-cyan-950",
    fitness: "bg-red-100 dark:bg-red-950",
    cultural: "bg-pink-100 dark:bg-pink-950",
    nightlife: "bg-violet-100 dark:bg-violet-950",
    kids: "bg-yellow-100 dark:bg-yellow-950",
    transfer: "bg-teal-100 dark:bg-teal-950",
    transportation: "bg-indigo-100 dark:bg-indigo-950",
    general: "bg-slate-100 dark:bg-slate-950",
  };

  return colors[category] || colors.general;
}

/**
 * Localized category labels.
 * These are computed at module load time using the detected language.
 * The underlying enum/key values ("flight", "hotel", …) remain unchanged.
 */
export const categoryLabels: Record<ActivityCategory, string> = {
  flight: t("categories.flight"),
  hotel: t("categories.hotel"),
  restaurant: t("categories.restaurant"),
  bar: t("categories.bar"),
  train: t("categories.train"),
  tour: t("categories.tour"),
  fitness: t("categories.fitness"),
  cultural: t("categories.cultural"),
  nightlife: t("categories.nightlife"),
  kids: t("categories.kids"),
  transfer: t("categories.transfer"),
  transportation: t("categories.transportation"),
  general: t("categories.general"),
};
