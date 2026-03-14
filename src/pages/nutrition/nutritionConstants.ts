import type { NutritionMealType } from "@/services/nutrition";

export const MEAL_SECTIONS: Array<{ key: NutritionMealType; label: string; accentClass: string; railClass: string }> = [
  { key: "breakfast", label: "Desayuno", accentClass: "text-lime-300", railClass: "bg-lime-400" },
  { key: "lunch", label: "Almuerzo", accentClass: "text-cyan-300", railClass: "bg-cyan-400" },
  { key: "dinner", label: "Cena", accentClass: "text-amber-300", railClass: "bg-amber-400" },
  { key: "snack", label: "Snack", accentClass: "text-fuchsia-300", railClass: "bg-fuchsia-400" },
];

export const ACTIVITY_LABELS: Record<string, string> = {
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
  very_high: "Muy alto",
  hyperactive: "Hiperactivo",
};

export const GOAL_LABELS: Record<string, string> = {
  lose: "Perder peso",
  lose_slow: "Perder peso lentamente",
  maintain: "Mantener peso",
  gain_slow: "Aumentar peso lentamente",
  gain: "Aumentar peso",
};

export type AddMode = "manual" | "database" | "favorite" | "yesterday" | "recent";

export const formatMetric = (value: number | null | undefined, suffix = "", digits = 0) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toFixed(digits)}${suffix}`;
};
