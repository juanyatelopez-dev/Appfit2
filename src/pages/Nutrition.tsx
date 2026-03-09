import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Database,
  Flame,
  PencilLine,
  ShieldPlus,
  Trash2,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNutritionTargets } from "@/hooks/useNutritionTargets";
import { cn } from "@/lib/utils";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import {
  addNutritionEntry,
  calculateNutritionFromFood,
  deleteNutritionEntry,
  getFavoriteFoods,
  getNutritionDaySummary,
  getNutritionEntriesByMeal,
  listFoodDatabaseCategories,
  listRecentNutritionEntries,
  saveFavoriteFood,
  searchFoodDatabase,
  type FoodDatabaseItem,
  type NutritionEntry,
  type NutritionMealType,
} from "@/services/nutrition";

const MEAL_SECTIONS: Array<{
  key: NutritionMealType;
  label: string;
  accentClass: string;
  railClass: string;
}> = [
  { key: "breakfast", label: "Desayuno", accentClass: "text-lime-300", railClass: "bg-lime-400" },
  { key: "lunch", label: "Almuerzo / principal", accentClass: "text-cyan-300", railClass: "bg-cyan-400" },
  { key: "dinner", label: "Cena", accentClass: "text-amber-300", railClass: "bg-amber-400" },
  { key: "snack", label: "Snacks / soporte", accentClass: "text-fuchsia-300", railClass: "bg-fuchsia-400" },
];

const DAY_ARCHETYPE_OPTIONS: Array<{ value: "base" | "heavy" | "recovery"; label: string }> = [
  { value: "heavy", label: "Torso" },
  { value: "base", label: "Base" },
  { value: "recovery", label: "Descanso" },
];

const ACTIVITY_LABELS: Record<string, string> = {
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
  very_high: "Muy alto",
  hyperactive: "Hiperactivo",
};

const GOAL_LABELS: Record<string, string> = {
  lose: "Perder peso",
  lose_slow: "Perder peso lentamente",
  maintain: "Mantener peso",
  gain_slow: "Aumentar peso lentamente",
  gain: "Aumentar peso",
};

type AddMode = "manual" | "database" | "favorite" | "yesterday" | "recent";

const formatMetric = (value: number | null | undefined, suffix = "", digits = 0) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toFixed(digits)}${suffix}`;
};

const Nutrition = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
  const timeZone = (profile as { timezone?: string } | null)?.timezone || DEFAULT_WATER_TIMEZONE;
  const metabolicProfileKey = [
    profile?.birth_date ?? "",
    profile?.weight ?? "",
    profile?.height ?? "",
    profile?.biological_sex ?? "",
    profile?.activity_level ?? "",
    profile?.nutrition_goal_type ?? "",
    profile?.day_archetype ?? "",
    profile?.goal_type ?? "",
  ].join("|");

  const [selectedDate, setSelectedDate] = useState(() => {
    const fromQuery = searchParams.get("date");
    if (fromQuery && /^\d{4}-\d{2}-\d{2}$/.test(fromQuery)) return new Date(`${fromQuery}T12:00:00`);
    return new Date();
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState<NutritionMealType>("breakfast");
  const [mode, setMode] = useState<AddMode>("manual");
  const [expandedMeals, setExpandedMeals] = useState<Record<NutritionMealType, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: false,
    snack: false,
  });

  const [foodName, setFoodName] = useState("");
  const [servingSize, setServingSize] = useState("100");
  const [servingUnit, setServingUnit] = useState("g");
  const [calories, setCalories] = useState("0");
  const [protein, setProtein] = useState("0");
  const [carbs, setCarbs] = useState("0");
  const [fat, setFat] = useState("0");
  const [fiber, setFiber] = useState("0");
  const [sugar, setSugar] = useState("0");
  const [sodium, setSodium] = useState("0");
  const [potassium, setPotassium] = useState("0");
  const [selectedFavoriteId, setSelectedFavoriteId] = useState("");
  const [selectedYesterdayId, setSelectedYesterdayId] = useState("");
  const [selectedRecentId, setSelectedRecentId] = useState("");
  const [searchFood, setSearchFood] = useState("");
  const [foodCategory, setFoodCategory] = useState("all");
  const [selectedFoodDatabaseId, setSelectedFoodDatabaseId] = useState("");
  const [consumedAmount, setConsumedAmount] = useState("100");
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [dayArchetype, setDayArchetype] = useState<"base" | "heavy" | "recovery">("base");

  const todayKey = getDateKeyForTimezone(selectedDate, timeZone);
  const previousDate = addDays(selectedDate, -1);
  const nutritionTargets = useNutritionTargets({
    userId,
    date: selectedDate,
    isGuest,
    timeZone,
    profile: profile as any,
  });

  useEffect(() => {
    const targetProfile = nutritionTargets.metabolicProfile;
    if (!targetProfile) return;
    setDayArchetype(targetProfile.dayArchetype);
  }, [nutritionTargets.metabolicProfile]);

  const summaryQuery = useQuery({
    queryKey: ["nutrition_day_summary", userId, todayKey, isGuest, timeZone, metabolicProfileKey],
    queryFn: () => getNutritionDaySummary(userId, selectedDate, { isGuest, timeZone, profile: profile as any }),
    enabled: Boolean(userId) || isGuest,
  });

  const favoritesQuery = useQuery({
    queryKey: ["nutrition_favorites", userId, isGuest],
    queryFn: () => getFavoriteFoods(userId, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const yesterdayQuery = useQuery({
    queryKey: ["nutrition_yesterday_entries", userId, getDateKeyForTimezone(previousDate, timeZone), isGuest, timeZone],
    queryFn: () => getNutritionEntriesByMeal(userId, previousDate, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });

  const recentQuery = useQuery({
    queryKey: ["nutrition_recent_entries", userId, isGuest],
    queryFn: () => listRecentNutritionEntries(userId, 20, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const categoriesQuery = useQuery({
    queryKey: ["food_database_categories"],
    queryFn: () => listFoodDatabaseCategories().catch(() => []),
    enabled: Boolean(userId) || isGuest,
  });

  const foodSearchQuery = useQuery({
    queryKey: ["food_database_search", searchFood, foodCategory],
    queryFn: () => searchFoodDatabase({ query: searchFood, category: foodCategory, limit: 35 }).catch(() => []),
    enabled: Boolean(userId) || isGuest,
  });

  const invalidateNutrition = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_recent_entries"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_range_summary"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
      queryClient.invalidateQueries({ queryKey: ["stats_nutrition"] }),
    ]);
  };

  const addMutation = useMutation({
    mutationFn: (payload: Parameters<typeof addNutritionEntry>[0]) => addNutritionEntry(payload),
    onSuccess: async () => {
      toast.success("Comida registrada.");
      setDialogOpen(false);
      await invalidateNutrition();
    },
    onError: (error: any) => toast.error(error?.message || "No se pudo guardar la comida."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNutritionEntry(id, userId, { isGuest }),
    onSuccess: invalidateNutrition,
    onError: (error: any) => toast.error(error?.message || "No se pudo eliminar la comida."),
  });

  const saveFavoriteMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      serving_size: number;
      serving_unit: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      fiber_g?: number | null;
      sodium_mg?: number | null;
      potassium_mg?: number | null;
      micronutrients?: Record<string, number> | null;
      nutrient_density_score?: number | null;
    }) => saveFavoriteFood(userId, payload, { isGuest }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition_favorites"] });
      toast.success("Guardado en favoritos.");
    },
  });

  const daySummary = summaryQuery.data;
  const goals = daySummary?.goals;
  const totals = daySummary?.totals;
  const target = daySummary?.targetBreakdown ?? nutritionTargets.target;
  const remaining = daySummary?.remaining;
  const metabolicProfile = nutritionTargets.metabolicProfile;
  const caloriesPct = goals && totals ? Math.min(100, Math.round((totals.calories / Math.max(goals.calorie_goal, 1)) * 100)) : 0;
  const proteinPct = goals && totals ? Math.min(100, Math.round((totals.protein_g / Math.max(goals.protein_goal_g, 1)) * 100)) : 0;
  const carbsPct = goals && totals ? Math.min(100, Math.round((totals.carbs_g / Math.max(goals.carb_goal_g, 1)) * 100)) : 0;
  const fatPct = goals && totals ? Math.min(100, Math.round((totals.fat_g / Math.max(goals.fat_goal_g, 1)) * 100)) : 0;

  const yesterdayEntries = useMemo(() => {
    const grouped = yesterdayQuery.data;
    if (!grouped) return [] as NutritionEntry[];
    return [...grouped.breakfast, ...grouped.lunch, ...grouped.dinner, ...grouped.snack];
  }, [yesterdayQuery.data]);

  const selectedFoodPreview = useMemo(() => {
    const selectedFood = (foodSearchQuery.data || []).find((row) => row.id === selectedFoodDatabaseId);
    const amount = Number(consumedAmount);
    if (!selectedFood || !Number.isFinite(amount) || amount <= 0) return null;
    return calculateNutritionFromFood(selectedFood as FoodDatabaseItem, amount);
  }, [foodSearchQuery.data, selectedFoodDatabaseId, consumedAmount]);

  const mealOverview = useMemo(
    () =>
      MEAL_SECTIONS.map((meal) => ({
        meal,
        entries: daySummary?.groups[meal.key] || [],
        subtotal: daySummary?.mealTotals[meal.key],
      })),
    [daySummary],
  );

  const openDialogForMeal = (meal: NutritionMealType, initialMode: AddMode = "manual") => {
    setActiveMeal(meal);
    setMode(initialMode);
    setDialogOpen(true);
  };

  const toggleMeal = (meal: NutritionMealType) => {
    setExpandedMeals((current) => ({ ...current, [meal]: !current[meal] }));
  };

  const handleAddEntry = async () => {
    if (mode === "manual") {
      const payload = {
        userId,
        date: selectedDate,
        meal_type: activeMeal,
        food_name: foodName,
        serving_size: Number(servingSize),
        serving_unit: servingUnit,
        calories: Number(calories),
        protein_g: Number(protein),
        carbs_g: Number(carbs),
        fat_g: Number(fat),
        fiber_g: Number(fiber),
        sugar_g: Number(sugar),
        sodium_mg: Number(sodium),
        potassium_mg: Number(potassium),
        isGuest,
        timeZone,
      } as const;
      await addMutation.mutateAsync(payload);
      if (saveAsFavorite) {
        await saveFavoriteMutation.mutateAsync({
          name: payload.food_name,
          serving_size: payload.serving_size,
          serving_unit: payload.serving_unit,
          calories: payload.calories,
          protein_g: payload.protein_g,
          carbs_g: payload.carbs_g,
          fat_g: payload.fat_g,
          fiber_g: payload.fiber_g,
          sodium_mg: payload.sodium_mg,
          potassium_mg: payload.potassium_mg,
        });
      }
      return;
    }

    if (mode === "database") {
      const food = (foodSearchQuery.data || []).find((row) => row.id === selectedFoodDatabaseId);
      if (!food || !selectedFoodPreview) {
        toast.error("Selecciona un alimento de la base.");
        return;
      }
      await addMutation.mutateAsync({
        userId,
        date: selectedDate,
        meal_type: activeMeal,
        food_name: food.food_name,
        serving_size: selectedFoodPreview.serving_size,
        serving_unit: selectedFoodPreview.serving_unit,
        calories: selectedFoodPreview.calories,
        protein_g: selectedFoodPreview.protein_g,
        carbs_g: selectedFoodPreview.carbs_g,
        fat_g: selectedFoodPreview.fat_g,
        fiber_g: selectedFoodPreview.fiber_g,
        sugar_g: selectedFoodPreview.sugar_g,
        sodium_mg: selectedFoodPreview.sodium_mg,
        potassium_mg: selectedFoodPreview.potassium_mg,
        micronutrients: selectedFoodPreview.micronutrients,
        nutrient_density_score: selectedFoodPreview.nutrient_density_score,
        notes: `Base food_database (${food.category})`,
        isGuest,
        timeZone,
      });
      return;
    }

    if (mode === "favorite") {
      const favorite = (favoritesQuery.data || []).find((row) => row.id === selectedFavoriteId);
      if (!favorite) {
        toast.error("Selecciona un favorito.");
        return;
      }
      await addMutation.mutateAsync({
        userId,
        date: selectedDate,
        meal_type: activeMeal,
        food_name: favorite.name,
        serving_size: favorite.serving_size,
        serving_unit: favorite.serving_unit,
        calories: favorite.calories,
        protein_g: favorite.protein_g,
        carbs_g: favorite.carbs_g,
        fat_g: favorite.fat_g,
        fiber_g: favorite.fiber_g,
        sodium_mg: favorite.sodium_mg,
        potassium_mg: favorite.potassium_mg,
        micronutrients: favorite.micronutrients,
        nutrient_density_score: favorite.nutrient_density_score,
        isGuest,
        timeZone,
      });
      return;
    }

    if (mode === "yesterday") {
      const entry = yesterdayEntries.find((row) => row.id === selectedYesterdayId);
      if (!entry) {
        toast.error("Selecciona una comida de ayer.");
        return;
      }
      await addMutation.mutateAsync({
        userId,
        date: selectedDate,
        meal_type: activeMeal,
        food_name: entry.food_name,
        serving_size: entry.serving_size,
        serving_unit: entry.serving_unit,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        fiber_g: entry.fiber_g,
        sugar_g: entry.sugar_g,
        sodium_mg: entry.sodium_mg,
        potassium_mg: entry.potassium_mg,
        micronutrients: entry.micronutrients,
        nutrient_density_score: entry.nutrient_density_score,
        notes: entry.notes,
        isGuest,
        timeZone,
      });
      return;
    }

    const recent = (recentQuery.data || []).find((row) => row.id === selectedRecentId);
    if (!recent) {
      toast.error("Selecciona una comida reciente.");
      return;
    }
    await addMutation.mutateAsync({
      userId,
      date: selectedDate,
      meal_type: activeMeal,
      food_name: recent.food_name,
      serving_size: recent.serving_size,
      serving_unit: recent.serving_unit,
      calories: recent.calories,
      protein_g: recent.protein_g,
      carbs_g: recent.carbs_g,
      fat_g: recent.fat_g,
      fiber_g: recent.fiber_g,
      sugar_g: recent.sugar_g,
      sodium_mg: recent.sodium_mg,
      potassium_mg: recent.potassium_mg,
      micronutrients: recent.micronutrients,
      nutrient_density_score: recent.nutrient_density_score,
      notes: recent.notes,
      isGuest,
      timeZone,
    });
  };

  return (
    <div className="app-shell min-h-screen px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <section className="app-surface-hero flex items-start justify-between rounded-[28px] px-8 py-8">
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/80">Panel diario</p>
              <h1 className="text-4xl font-black uppercase tracking-tight text-white">Nutricion & Combustible</h1>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Registro operativo y control de macros</p>
            </div>
            <div className="app-chip-muted flex items-center gap-3 rounded-2xl px-3 py-2">
              {DAY_ARCHETYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDayArchetype(option.value)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors",
                    dayArchetype === option.value ? "bg-primary text-primary-foreground" : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="app-chip-muted flex items-center gap-2 rounded-2xl px-3 py-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:bg-white/[0.05] hover:text-white" onClick={() => setSelectedDate((prev) => addDays(prev, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-40 text-center">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Bitacora</div>
                <div className="text-sm font-semibold text-white">{format(selectedDate, "dd/MM/yyyy")}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:bg-white/[0.05] hover:text-white" onClick={() => setSelectedDate((prev) => addDays(prev, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="app-chip rounded-2xl px-4 py-3 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Acumulado</div>
              <div className="text-2xl font-black text-primary">{formatMetric(totals?.calories, " kcal")}</div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]">
          <section className="space-y-5">
            <div className="app-surface-panel rounded-[28px]">
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Logbook</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">Registro operativo de comidas</h2>
                </div>
                <Button onClick={() => openDialogForMeal("breakfast")} className="rounded-2xl bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Anadir nueva comida
                </Button>
              </div>

              <div className="space-y-4 px-4 py-4">
                {mealOverview.map(({ meal, entries, subtotal }, index) => (
                  <article key={meal.key} className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.82))]">
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className={cn("h-16 w-1.5 rounded-full", meal.railClass)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Registro {index + 1}</div>
                        <div className={cn("mt-1 text-xl font-bold uppercase", meal.accentClass)}>{meal.label}</div>
                      </div>
                      <div className="grid min-w-[290px] grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-white/8 bg-slate-950/70 px-3 py-2 text-center"><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Pro</div><div className="text-sm font-semibold text-emerald-300">{formatMetric(subtotal?.protein_g, "g")}</div></div>
                        <div className="rounded-2xl border border-white/8 bg-slate-950/70 px-3 py-2 text-center"><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Cho</div><div className="text-sm font-semibold text-cyan-300">{formatMetric(subtotal?.carbs_g, "g")}</div></div>
                        <div className="rounded-2xl border border-white/8 bg-slate-950/70 px-3 py-2 text-center"><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Fat</div><div className="text-sm font-semibold text-amber-300">{formatMetric(subtotal?.fat_g, "g")}</div></div>
                        <div className="rounded-2xl border border-white/8 bg-slate-950/70 px-3 py-2 text-center"><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Kcal</div><div className="text-sm font-semibold text-white">{formatMetric(subtotal?.calories)}</div></div>
                      </div>
                      <button type="button" onClick={() => toggleMeal(meal.key)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-slate-300">
                        <ChevronDown className={cn("h-5 w-5 transition-transform", expandedMeals[meal.key] && "rotate-180")} />
                      </button>
                    </div>

                    {expandedMeals[meal.key] && (
                      <div className="border-t border-white/5 px-5 pb-5 pt-3">
                        <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/80">
                          <table className="w-full text-left">
                            <thead className="border-b border-white/6 bg-white/[0.03]">
                              <tr className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                                <th className="px-4 py-3">Alimento</th>
                                <th className="px-3 py-3 text-right">Cant</th>
                                <th className="px-3 py-3 text-right">P</th>
                                <th className="px-3 py-3 text-right">C</th>
                                <th className="px-3 py-3 text-right">F</th>
                                <th className="px-3 py-3 text-right">Kcal</th>
                                <th className="px-4 py-3 text-right">Accion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">Sin registros en esta comida.</td></tr>
                              ) : (
                                entries.map((entry) => (
                                  <tr key={entry.id} className="border-b border-white/5 last:border-b-0">
                                    <td className="px-4 py-3"><div className="font-medium text-white">{entry.food_name}</div><div className="text-xs text-slate-500">Na {formatMetric(entry.sodium_mg, "mg")} | K {formatMetric(entry.potassium_mg, "mg")}</div></td>
                                    <td className="px-3 py-3 text-right text-sm text-slate-300">{entry.serving_size} {entry.serving_unit}</td>
                                    <td className="px-3 py-3 text-right text-sm font-medium text-emerald-300">{entry.protein_g}</td>
                                    <td className="px-3 py-3 text-right text-sm font-medium text-cyan-300">{entry.carbs_g}</td>
                                    <td className="px-3 py-3 text-right text-sm font-medium text-amber-300">{entry.fat_g}</td>
                                    <td className="px-3 py-3 text-right text-sm font-semibold text-white">{entry.calories}</td>
                                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)} className="rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <button type="button" onClick={() => openDialogForMeal(meal.key, "manual")} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300"><PencilLine className="mr-2 inline h-4 w-4" />Carga manual</button>
                          <button type="button" onClick={() => openDialogForMeal(meal.key, "database")} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300"><Database className="mr-2 inline h-4 w-4" />Buscar alimento</button>
                          <button type="button" onClick={() => openDialogForMeal(meal.key, "favorite")} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300"><ShieldPlus className="mr-2 inline h-4 w-4" />Usar favorito</button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <div className="app-surface-panel rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Resumen metabolico</p><h3 className="mt-1 text-lg font-bold text-white">Base del plan diario</h3></div>
                <div className="app-chip rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  {GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "Objetivo"}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-4"><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">BMR</div><div className="mt-2 text-3xl font-black text-white">{formatMetric(target?.bmr)}</div><div className="text-xs text-slate-500">reposo</div></div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-4"><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">TDEE</div><div className="mt-2 text-3xl font-black text-white">{formatMetric(target?.tdee)}</div><div className="text-xs text-slate-500">mantenimiento</div></div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                <span>Peso: {formatMetric(metabolicProfile?.weightKg, " kg", 1)}</span>
                <span>Actividad: {ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--"}</span>
              </div>
            </div>

            <div className="app-surface-panel rounded-[28px] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Balance energetico</div>
              <div className="mt-4 flex items-end justify-between"><div><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Consumido</div><div className="text-4xl font-black text-white">{formatMetric(totals?.calories)}</div></div><div className="text-right"><div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Meta</div><div className="text-3xl font-black text-primary">{formatMetric(goals?.calorie_goal)}</div></div></div>
              <Progress value={caloriesPct} className="mt-4 h-3 bg-slate-800" />
              <div className="mt-3 flex justify-between text-xs text-slate-500"><span>Restante</span><span>{formatMetric(remaining?.calories, " kcal")}</span></div>
            </div>

            <div className="app-surface-panel rounded-[28px] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Macros</div>
              <div className="mt-4 space-y-4">
                <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-emerald-300">Proteinas</span><span className="text-slate-400">{formatMetric(totals?.protein_g, "g")} / {formatMetric(goals?.protein_goal_g, "g")}</span></div><Progress value={proteinPct} className="h-2.5 bg-slate-800 [&>div]:bg-emerald-400" /></div>
                <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-cyan-300">Carbohidratos</span><span className="text-slate-400">{formatMetric(totals?.carbs_g, "g")} / {formatMetric(goals?.carb_goal_g, "g")}</span></div><Progress value={carbsPct} className="h-2.5 bg-slate-800 [&>div]:bg-cyan-400" /></div>
                <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-amber-300">Grasas</span><span className="text-slate-400">{formatMetric(totals?.fat_g, "g")} / {formatMetric(goals?.fat_goal_g, "g")}</span></div><Progress value={fatPct} className="h-2.5 bg-slate-800 [&>div]:bg-amber-400" /></div>
              </div>
            </div>

            <div className="app-surface-panel rounded-[28px] p-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500"><Flame className="h-3.5 w-3.5 text-primary" />Perfil metabolico</div>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Sexo</div>
                    <div className="mt-2 text-sm text-white">{metabolicProfile?.sex === "female" ? "Femenino" : "Masculino"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Edad</div>
                    <div className="mt-2 text-sm text-white">{metabolicProfile?.age ?? "--"} anios</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Peso</div>
                    <div className="mt-2 text-sm text-white">{formatMetric(metabolicProfile?.weightKg, " kg", 1)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Altura</div>
                    <div className="mt-2 text-sm text-white">{formatMetric(metabolicProfile?.heightCm, " cm", 0)}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Actividad</div>
                  <div className="mt-2 text-sm text-white">{ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--"}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/80 p-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Objetivo</div>
                  <div className="mt-2 text-sm text-white">{GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--"}</div>
                </div>
                <Button asChild className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/fitness-profile">Abrir Perfil Fitness</Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="app-dialog-surface max-w-3xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Agregar comida - {MEAL_SECTIONS.find((m) => m.key === activeMeal)?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[200px_1fr] gap-4">
              <div className="space-y-2"><Label className="text-slate-400">Modo de carga</Label><Select value={mode} onValueChange={(value) => setMode(value as AddMode)}><SelectTrigger className="border-white/10 bg-slate-900 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Carga manual</SelectItem><SelectItem value="database">Base de alimentos</SelectItem><SelectItem value="favorite">Favoritos</SelectItem><SelectItem value="yesterday">Duplicar de ayer</SelectItem><SelectItem value="recent">Recientes</SelectItem></SelectContent></Select></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-400"><div className="font-medium text-white">Contexto activo</div><div className="mt-1">Comida destino: {MEAL_SECTIONS.find((m) => m.key === activeMeal)?.label}</div></div>
            </div>
            {mode === "database" && (
              <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="grid grid-cols-[1fr_220px] gap-3"><Input value={searchFood} onChange={(e) => setSearchFood(e.target.value)} placeholder="Buscar alimento..." className="border-white/10 bg-slate-900 text-white" /><Select value={foodCategory} onValueChange={setFoodCategory}><SelectTrigger className="border-white/10 bg-slate-900 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{(categoriesQuery.data || []).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
                <Select value={selectedFoodDatabaseId} onValueChange={setSelectedFoodDatabaseId}><SelectTrigger className="border-white/10 bg-slate-900 text-white"><SelectValue placeholder="Selecciona alimento" /></SelectTrigger><SelectContent>{(foodSearchQuery.data || []).map((food) => <SelectItem key={food.id} value={food.id}>{food.food_name} ({food.calories} kcal/{food.serving_size}{food.serving_unit})</SelectItem>)}</SelectContent></Select>
                <div className="grid grid-cols-[1fr_120px] gap-3"><Input value={consumedAmount} onChange={(e) => setConsumedAmount(e.target.value)} type="number" min="0" placeholder="Cantidad consumida" className="border-white/10 bg-slate-900 text-white" /><div className="flex items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-sm text-slate-400">{(foodSearchQuery.data || []).find((row) => row.id === selectedFoodDatabaseId)?.serving_unit || "g"}</div></div>
                {selectedFoodPreview && <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm text-slate-300">Vista previa: {selectedFoodPreview.calories} kcal | P {selectedFoodPreview.protein_g} | C {selectedFoodPreview.carbs_g} | G {selectedFoodPreview.fat_g}</div>}
              </div>
            )}
            {mode === "manual" && (
              <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <Input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Nombre alimento" className="border-white/10 bg-slate-900 text-white" />
                <div className="grid grid-cols-[1fr_110px] gap-3"><Input value={servingSize} onChange={(e) => setServingSize(e.target.value)} type="number" min="0" placeholder="Porcion" className="border-white/10 bg-slate-900 text-white" /><Input value={servingUnit} onChange={(e) => setServingUnit(e.target.value)} placeholder="unidad" className="border-white/10 bg-slate-900 text-white" /></div>
                <div className="grid grid-cols-4 gap-3">
                  <Input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" min="0" placeholder="kcal" className="border-white/10 bg-slate-900 text-white" />
                  <Input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" min="0" placeholder="Proteina g" className="border-white/10 bg-slate-900 text-white" />
                  <Input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" min="0" placeholder="Carbs g" className="border-white/10 bg-slate-900 text-white" />
                  <Input value={fat} onChange={(e) => setFat(e.target.value)} type="number" min="0" placeholder="Grasas g" className="border-white/10 bg-slate-900 text-white" />
                  <Input value={fiber} onChange={(e) => setFiber(e.target.value)} type="number" min="0" placeholder="Fibra g" className="border-white/10 bg-slate-900 text-white" />
                  <Input value={sugar} onChange={(e) => setSugar(e.target.value)} type="number" min="0" placeholder="Azucar g" className="border-white/10 bg-slate-900 text-white" />
                  <Input value={sodium} onChange={(e) => setSodium(e.target.value)} type="number" min="0" placeholder="Sodio mg" className="border-white/10 bg-slate-900 text-white" />
                  <Input value={potassium} onChange={(e) => setPotassium(e.target.value)} type="number" min="0" placeholder="Potasio mg" className="border-white/10 bg-slate-900 text-white" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={saveAsFavorite} onChange={(e) => setSaveAsFavorite(e.target.checked)} />Guardar en favoritos</label>
              </div>
            )}
            {mode === "favorite" && <Select value={selectedFavoriteId} onValueChange={setSelectedFavoriteId}><SelectTrigger className="border-white/10 bg-slate-900 text-white"><SelectValue placeholder="Selecciona favorito" /></SelectTrigger><SelectContent>{(favoritesQuery.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} ({item.calories} kcal)</SelectItem>)}</SelectContent></Select>}
            {mode === "yesterday" && <Select value={selectedYesterdayId} onValueChange={setSelectedYesterdayId}><SelectTrigger className="border-white/10 bg-slate-900 text-white"><SelectValue placeholder="Selecciona comida de ayer" /></SelectTrigger><SelectContent>{yesterdayEntries.map((item) => <SelectItem key={item.id} value={item.id}>{item.food_name} ({item.calories} kcal)</SelectItem>)}</SelectContent></Select>}
            {mode === "recent" && <Select value={selectedRecentId} onValueChange={setSelectedRecentId}><SelectTrigger className="border-white/10 bg-slate-900 text-white"><SelectValue placeholder="Selecciona reciente" /></SelectTrigger><SelectContent>{(recentQuery.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.food_name} ({item.calories} kcal)</SelectItem>)}</SelectContent></Select>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white">Cancelar</Button>
            <Button onClick={handleAddEntry} disabled={addMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nutrition;
