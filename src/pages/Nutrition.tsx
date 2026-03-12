import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Database,
  Flame,
  FolderKanban,
  PencilLine,
  ShieldPlus,
  Star,
  Trash2,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { cn } from "@/lib/utils";
import {
  addNutritionEntry,
  archiveNutritionProfile,
  calculateNutritionFromFood,
  deleteNutritionEntry,
  deleteNutritionProfileSafe,
  getFavoriteFoods,
  getNutritionDaySummary,
  getNutritionEntriesByMeal,
  listFoodDatabaseCategories,
  listNutritionProfiles,
  listRecentNutritionEntries,
  saveFavoriteFood,
  searchFoodDatabase,
  setDefaultNutritionProfile,
  setNutritionProfileForDate,
  upsertNutritionProfile,
  type FoodDatabaseItem,
  type NutritionDayArchetype,
  type NutritionEntry,
  type NutritionMealType,
  type NutritionProfileRecord,
} from "@/services/nutrition";

const MEAL_SECTIONS: Array<{ key: NutritionMealType; label: string; accentClass: string; railClass: string }> = [
  { key: "breakfast", label: "Desayuno", accentClass: "text-lime-300", railClass: "bg-lime-400" },
  { key: "lunch", label: "Almuerzo", accentClass: "text-cyan-300", railClass: "bg-cyan-400" },
  { key: "dinner", label: "Cena", accentClass: "text-amber-300", railClass: "bg-amber-400" },
  { key: "snack", label: "Snack", accentClass: "text-fuchsia-300", railClass: "bg-fuchsia-400" },
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
  const { language } = usePreferences();
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
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [profilesDialogOpen, setProfilesDialogOpen] = useState(false);
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

  const [editingProfile, setEditingProfile] = useState<NutritionProfileRecord | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileArchetype, setProfileArchetype] = useState<NutritionDayArchetype>("base");
  const [profileIsDefault, setProfileIsDefault] = useState(false);

  const todayKey = getDateKeyForTimezone(selectedDate, timeZone);
  const previousDate = addDays(selectedDate, -1);

  const summaryQuery = useQuery({
    queryKey: ["nutrition_day_summary", userId, todayKey, isGuest, timeZone, metabolicProfileKey],
    queryFn: () => getNutritionDaySummary(userId, selectedDate, { isGuest, timeZone, profile: profile as any }),
    enabled: Boolean(userId) || isGuest,
  });

  const profilesQuery = useQuery({
    queryKey: ["nutrition_profiles", userId, isGuest],
    queryFn: () => listNutritionProfiles(userId, { isGuest, includeArchived: true }),
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
    queryKey: ["food_database_search", searchFood, foodCategory, language],
    queryFn: () => searchFoodDatabase({ query: searchFood, category: foodCategory, limit: 35, language }).catch(() => []),
    enabled: Boolean(userId) || isGuest,
  });

  const invalidateNutrition = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_profiles"] }),
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
      setMealDialogOpen(false);
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

  const profileSelectionMutation = useMutation({
    mutationFn: (profileId: string | null) => setNutritionProfileForDate(userId, selectedDate, profileId, { isGuest, timeZone, profile: profile as any }),
    onSuccess: async () => {
      await invalidateNutrition();
      toast.success("Perfil del dia actualizado.");
    },
    onError: (error: any) => toast.error(error?.message || "No se pudo actualizar el perfil del dia."),
  });

  const saveProfileMutation = useMutation({
    mutationFn: () =>
      upsertNutritionProfile(
        userId,
        {
          id: editingProfile?.id,
          name: profileName,
          archetype: profileArchetype,
          is_default: profileIsDefault,
        },
        { isGuest },
      ),
    onSuccess: async () => {
      setProfilesDialogOpen(false);
      setEditingProfile(null);
      setProfileName("");
      setProfileArchetype("base");
      setProfileIsDefault(false);
      await invalidateNutrition();
      toast.success("Perfil nutricional guardado.");
    },
    onError: (error: any) => toast.error(error?.message || "No se pudo guardar el perfil."),
  });

  const archiveProfileMutation = useMutation({
    mutationFn: (profileId: string) => archiveNutritionProfile(profileId, userId, { isGuest, archived: true }),
    onSuccess: async () => {
      await invalidateNutrition();
      toast.success("Perfil archivado.");
    },
    onError: (error: any) => toast.error(error?.message || "No se pudo archivar el perfil."),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: string) => deleteNutritionProfileSafe(profileId, userId, { isGuest }),
    onSuccess: async (result) => {
      await invalidateNutrition();
      toast.success(result.archived ? "El perfil se archivo para proteger el historial." : "Perfil eliminado.");
    },
    onError: (error: any) => toast.error(error?.message || "No se pudo eliminar el perfil."),
  });

  const defaultProfileMutation = useMutation({
    mutationFn: (profileId: string) => setDefaultNutritionProfile(profileId, userId, { isGuest }),
    onSuccess: async () => {
      await invalidateNutrition();
      toast.success("Perfil marcado como predeterminado.");
    },
    onError: (error: any) => toast.error(error?.message || "No se pudo marcar el perfil predeterminado."),
  });

  const daySummary = summaryQuery.data;
  const profileOptions = profilesQuery.data ?? [];
  const goals = daySummary?.goals;
  const totals = daySummary?.totals;
  const target = daySummary?.targetBreakdown;
  const remaining = daySummary?.remaining;
  const metabolicProfile = daySummary?.metabolicProfile;
  const selectedNutritionProfile = daySummary?.selectedProfile ?? null;
  const activeDailyLog = daySummary?.dailyLog ?? null;
  const activeArchetype = target?.dayArchetype ?? selectedNutritionProfile?.archetype ?? activeDailyLog?.archetype_snapshot ?? "base";
  const archetypeMeta = NUTRITION_ARCHETYPE_META[activeArchetype];
  const effectiveProfileLabel = selectedNutritionProfile?.name ?? activeDailyLog?.profile_name_snapshot ?? "Sin perfil explicito";
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
    setMealDialogOpen(true);
  };

  const toggleMeal = (meal: NutritionMealType) => {
    setExpandedMeals((current) => ({ ...current, [meal]: !current[meal] }));
  };

  const openCreateProfile = () => {
    setEditingProfile(null);
    setProfileName("");
    setProfileArchetype("base");
    setProfileIsDefault(profileOptions.length === 0);
    setProfilesDialogOpen(true);
  };

  const openEditProfile = (profileRow: NutritionProfileRecord) => {
    setEditingProfile(profileRow);
    setProfileName(profileRow.name);
    setProfileArchetype(profileRow.archetype);
    setProfileIsDefault(profileRow.is_default);
    setProfilesDialogOpen(true);
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
    <div className="app-shell min-h-screen px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <section className="app-surface-hero rounded-[24px] px-4 py-5 sm:rounded-[28px] sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/80">Panel diario</p>
                <h1 className="app-surface-heading text-3xl font-black uppercase tracking-tight md:text-4xl">Nutricion & Combustible</h1>
                <p className="app-surface-caption text-sm uppercase tracking-[0.24em]">Perfil del dia, objetivos dinamicos y registro de comidas</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,280px)_1fr_auto]">
                <div className="app-chip-muted rounded-2xl px-3 py-3">
                  <div className="app-surface-caption mb-2 text-[10px] font-semibold uppercase tracking-[0.24em]">Perfil del dia</div>
                  <Select value={selectedNutritionProfile?.id ?? "__fallback__"} onValueChange={(value) => profileSelectionMutation.mutate(value === "__fallback__" ? null : value)}>
                    <SelectTrigger className="app-input-surface"><SelectValue placeholder="Selecciona perfil" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__fallback__">Sin perfil explicito</SelectItem>
                      {profileOptions.filter((row) => !row.is_archived).map((profileRow) => (
                        <SelectItem key={profileRow.id} value={profileRow.id}>
                          {profileRow.name} - {NUTRITION_ARCHETYPE_META[profileRow.archetype].shortLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="app-chip-muted rounded-2xl px-4 py-3">
                  <div className="app-surface-caption text-[10px] font-semibold uppercase tracking-[0.24em]">Arquetipo activo</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(NUTRITION_ARCHETYPE_META).map(([key, meta]) => (
                      <div key={key} className={cn("rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]", activeArchetype === key ? "border-primary/50 bg-primary/15 text-primary" : "border-border/70 text-muted-foreground")}>
                        {meta.shortLabel}
                      </div>
                    ))}
                  </div>
                  <p className="app-surface-muted mt-2 text-sm">{archetypeMeta.description}</p>
                </div>
                <Button type="button" onClick={openCreateProfile} className="app-outline-button h-auto rounded-2xl px-4 py-3">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Nuevo perfil
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="app-chip-muted flex items-center gap-2 rounded-2xl px-3 py-2">
                <Button variant="ghost" size="icon" className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground" onClick={() => setSelectedDate((prev) => addDays(prev, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="min-w-0 flex-1 text-center sm:min-w-40"><div className="app-surface-caption text-[11px] uppercase tracking-[0.24em]">Bitacora</div><div className="app-surface-heading text-sm font-semibold">{format(selectedDate, "dd/MM/yyyy")}</div></div>
                <Button variant="ghost" size="icon" className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground" onClick={() => setSelectedDate((prev) => addDays(prev, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="app-chip rounded-2xl px-4 py-3 text-right sm:min-w-[10rem]"><div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Acumulado</div><div className="text-xl font-black text-primary md:text-2xl">{formatMetric(totals?.calories, " kcal")}</div></div>
            </div>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]">
          <section className="space-y-5">
            <div className="app-surface-panel rounded-[24px] sm:rounded-[28px]">
              <div className="flex flex-col gap-3 border-b border-border/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                <div><p className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.28em]">Logbook</p><h2 className="app-surface-heading mt-1 text-xl font-bold md:text-2xl">Registro operativo de comidas</h2></div>
                <Button onClick={() => openDialogForMeal("breakfast")} className="w-full rounded-2xl bg-primary px-4 text-primary-foreground hover:bg-primary/90 sm:w-auto"><CirclePlus className="mr-2 h-4 w-4" />Anadir nueva comida</Button>
              </div>
              <div className="space-y-4 px-4 py-4">
                {mealOverview.map(({ meal, entries, subtotal }, index) => (
                  <article key={meal.key} className="app-surface-tile overflow-hidden rounded-[20px] sm:rounded-[24px]">
                    <div className="grid gap-4 px-4 py-4 sm:px-5 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div className={cn("mt-1 h-14 w-1.5 shrink-0 rounded-full", meal.railClass)} />
                          <div className="min-w-0 space-y-1">
                            <div className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.26em]">Registro {index + 1}</div>
                            <div className={cn("text-lg font-bold uppercase leading-tight md:text-xl", meal.accentClass)}>{meal.label}</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="app-panel-block rounded-2xl px-3 py-2 text-center"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Pro</div><div className="text-sm font-semibold text-emerald-300">{formatMetric(subtotal?.protein_g, "g")}</div></div>
                        <div className="app-panel-block rounded-2xl px-3 py-2 text-center"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Cho</div><div className="text-sm font-semibold text-cyan-300">{formatMetric(subtotal?.carbs_g, "g")}</div></div>
                        <div className="app-panel-block rounded-2xl px-3 py-2 text-center"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Fat</div><div className="text-sm font-semibold text-amber-300">{formatMetric(subtotal?.fat_g, "g")}</div></div>
                        <div className="app-panel-block rounded-2xl px-3 py-2 text-center"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Kcal</div><div className="app-surface-heading text-sm font-semibold">{formatMetric(subtotal?.calories)}</div></div>
                      </div>
                      <button type="button" onClick={() => toggleMeal(meal.key)} className="app-surface-soft app-surface-muted justify-self-end rounded-2xl p-3"><ChevronDown className={cn("h-5 w-5 transition-transform", expandedMeals[meal.key] && "rotate-180")} /></button>
                    </div>
                    {expandedMeals[meal.key] && (
                      <div className="border-t border-border/40 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                        <div className="hidden overflow-hidden rounded-2xl border md:block app-surface-soft">
                          <table className="w-full text-left">
                            <thead className="border-b border-border/50 bg-background/30"><tr className="app-surface-caption text-[11px] uppercase tracking-[0.24em]"><th className="px-4 py-3">Alimento</th><th className="px-3 py-3 text-right">Cant</th><th className="px-3 py-3 text-right">P</th><th className="px-3 py-3 text-right">C</th><th className="px-3 py-3 text-right">F</th><th className="px-3 py-3 text-right">Kcal</th><th className="px-4 py-3 text-right">Accion</th></tr></thead>
                            <tbody>
                              {entries.length === 0 ? (
                                <tr><td colSpan={7} className="app-surface-caption px-4 py-8 text-center text-sm">Sin registros en esta comida.</td></tr>
                              ) : (
                                entries.map((entry) => (
                                  <tr key={entry.id} className="border-b border-border/40 last:border-b-0">
                                    <td className="px-4 py-3"><div className="app-surface-heading font-medium">{entry.food_name}</div><div className="app-surface-caption text-xs">Na {formatMetric(entry.sodium_mg, "mg")} | K {formatMetric(entry.potassium_mg, "mg")}</div></td>
                                    <td className="app-surface-muted px-3 py-3 text-right text-sm">{entry.serving_size} {entry.serving_unit}</td>
                                    <td className="px-3 py-3 text-right text-sm font-medium text-emerald-300">{entry.protein_g}</td>
                                    <td className="px-3 py-3 text-right text-sm font-medium text-cyan-300">{entry.carbs_g}</td>
                                    <td className="px-3 py-3 text-right text-sm font-medium text-amber-300">{entry.fat_g}</td>
                                    <td className="app-surface-heading px-3 py-3 text-right text-sm font-semibold">{entry.calories}</td>
                                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)} className="app-surface-muted rounded-xl hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="space-y-3 md:hidden">
                          {entries.length === 0 ? (
                            <div className="app-surface-caption rounded-2xl border border-dashed border-border/50 px-4 py-6 text-center text-sm">Sin registros en esta comida.</div>
                          ) : (
                            entries.map((entry) => (
                              <div key={entry.id} className="rounded-2xl border border-border/50 px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="app-surface-heading font-medium">{entry.food_name}</div>
                                    <div className="app-surface-caption mt-1 text-xs">{entry.serving_size} {entry.serving_unit}</div>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)} className="app-surface-muted rounded-xl hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                  <div className="app-panel-block rounded-xl px-3 py-2">P {entry.protein_g}</div>
                                  <div className="app-panel-block rounded-xl px-3 py-2">C {entry.carbs_g}</div>
                                  <div className="app-panel-block rounded-xl px-3 py-2">F {entry.fat_g}</div>
                                  <div className="app-panel-block rounded-xl px-3 py-2 font-semibold">{entry.calories} kcal</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <button type="button" onClick={() => openDialogForMeal(meal.key, "manual")} className="app-surface-soft rounded-2xl px-4 py-3 text-sm font-medium"><PencilLine className="mr-2 inline h-4 w-4" />Carga manual</button>
                          <button type="button" onClick={() => openDialogForMeal(meal.key, "database")} className="app-surface-soft rounded-2xl px-4 py-3 text-sm font-medium"><Database className="mr-2 inline h-4 w-4" />Buscar alimento</button>
                          <button type="button" onClick={() => openDialogForMeal(meal.key, "favorite")} className="app-surface-soft rounded-2xl px-4 py-3 text-sm font-medium"><ShieldPlus className="mr-2 inline h-4 w-4" />Usar favorito</button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Perfil del dia</p>
                  <h3 className="app-surface-heading mt-1 text-lg font-bold">{effectiveProfileLabel}</h3>
                </div>
                <div className="app-chip rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">{archetypeMeta.label}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  {ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--"}
                </div>
                <div className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  {GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--"}
                </div>
                <div className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  {daySummary?.weightSource === "profile_fallback" ? "Peso perfil" : "Peso registrado"}
                </div>
              </div>
              <p className="app-surface-caption mt-2 text-xs">
                Actividad: {String((ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--")).toLowerCase()} | Objetivo: {String((GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--")).toLowerCase()}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border app-surface-soft p-4">
                  <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">TDEE base</div>
                  <div className="app-surface-heading mt-2 text-2xl font-black md:text-3xl">{formatMetric(target?.tdee)}</div>
                  <div className="app-surface-caption text-xs">antes del arquetipo</div>
                </div>
                <div className="rounded-2xl border app-surface-soft p-4">
                  <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Ajuste</div>
                  <div className="app-surface-heading mt-2 text-2xl font-black md:text-3xl">{target ? `${target.archetypeDelta >= 0 ? "+" : ""}${target.archetypeDelta}` : "--"}</div>
                  <div className="app-surface-caption text-xs">kcal del arquetipo</div>
                </div>
              </div>
              <div className="app-surface-caption mt-4 grid gap-2 text-xs uppercase tracking-[0.2em]">
                <div className="flex items-center justify-between"><span>Meta final</span><span>{formatMetric(goals?.calorie_goal, " kcal")}</span></div>
                <div className="flex items-center justify-between"><span>Peso de calculo</span><span>{formatMetric(metabolicProfile?.weightKg, " kg", 1)}</span></div>
              </div>
            </div>
            <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
              <div className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.26em]">Balance energetico</div>
              <div className="mt-4 flex items-end justify-between">
                <div><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Consumido</div><div className="app-surface-heading text-3xl font-black md:text-4xl">{formatMetric(totals?.calories)}</div></div>
                <div className="text-right"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Meta</div><div className="text-2xl font-black text-primary md:text-3xl">{formatMetric(goals?.calorie_goal)}</div></div>
              </div>
              <Progress value={caloriesPct} className="app-progress-track mt-4 h-3" />
              <div className="app-surface-caption mt-3 flex justify-between text-xs"><span>Restante</span><span>{formatMetric(remaining?.calories, " kcal")}</span></div>
            </div>
            <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5"><div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Macros</div><div className="mt-4 space-y-4"><div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-emerald-300">Proteinas</span><span className="text-slate-400">{formatMetric(totals?.protein_g, "g")} / {formatMetric(goals?.protein_goal_g, "g")}</span></div><Progress value={proteinPct} className="h-2.5 app-progress-track [&>div]:bg-emerald-400" /></div><div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-cyan-300">Carbohidratos</span><span className="text-slate-400">{formatMetric(totals?.carbs_g, "g")} / {formatMetric(goals?.carb_goal_g, "g")}</span></div><Progress value={carbsPct} className="h-2.5 app-progress-track [&>div]:bg-cyan-400" /></div><div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-amber-300">Grasas</span><span className="text-slate-400">{formatMetric(totals?.fat_g, "g")} / {formatMetric(goals?.fat_goal_g, "g")}</span></div><Progress value={fatPct} className="h-2.5 app-progress-track [&>div]:bg-amber-400" /></div></div></div>
            <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
              <div className="flex items-center justify-between"><div className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.26em]">Perfiles guardados</div><Button type="button" size="sm" onClick={openCreateProfile} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">Nuevo</Button></div>
              <div className="mt-4 space-y-3">{profileOptions.length === 0 ? <div className="app-panel-block app-surface-muted rounded-2xl border-dashed px-4 py-5 text-sm">Crea perfiles como Torso, Pierna o Descanso. El perfil del dia recalcula metas sin duplicar tus comidas.</div> : profileOptions.map((profileRow) => <div key={profileRow.id} className="app-panel-block rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="app-surface-heading text-sm font-semibold">{profileRow.name}</span>{profileRow.is_default ? <Star className="h-4 w-4 text-amber-300" /> : null}{profileRow.is_archived ? <span className="app-surface-caption text-[10px] uppercase tracking-[0.2em]">Archivado</span> : null}</div><p className="app-surface-muted mt-1 text-xs">{NUTRITION_ARCHETYPE_META[profileRow.archetype].description}</p></div><div className="app-surface-soft app-surface-muted rounded-xl px-2 py-1 text-[10px] uppercase tracking-[0.2em]">{NUTRITION_ARCHETYPE_META[profileRow.archetype].shortLabel}</div></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openEditProfile(profileRow)} className="app-outline-button">Editar</Button>{!profileRow.is_default ? <Button type="button" variant="outline" size="sm" onClick={() => defaultProfileMutation.mutate(profileRow.id)} className="app-outline-button">Predeterminado</Button> : null}{!profileRow.is_archived ? <Button type="button" variant="outline" size="sm" onClick={() => archiveProfileMutation.mutate(profileRow.id)} className="app-outline-button">Archivar</Button> : null}<Button type="button" variant="outline" size="sm" onClick={() => deleteProfileMutation.mutate(profileRow.id)} className="border-red-400/20 bg-transparent text-red-200">Eliminar</Button></div></div>)}</div>
            </div>
            <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5"><div className="app-surface-caption flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em]"><Flame className="h-3.5 w-3.5 text-primary" />Perfil metabolico</div><div className="mt-4 grid gap-3"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Sexo</div><div className="app-surface-heading mt-2 text-sm">{metabolicProfile?.sex === "female" ? "Femenino" : "Masculino"}</div></div><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Edad</div><div className="app-surface-heading mt-2 text-sm">{metabolicProfile?.age ?? "--"} anos</div></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Peso</div><div className="app-surface-heading mt-2 text-sm">{formatMetric(metabolicProfile?.weightKg, " kg", 1)}</div></div><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Altura</div><div className="app-surface-heading mt-2 text-sm">{formatMetric(metabolicProfile?.heightCm, " cm", 0)}</div></div></div><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Actividad</div><div className="app-surface-heading mt-2 text-sm">{ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--"}</div></div><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Objetivo</div><div className="app-surface-heading mt-2 text-sm">{GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--"}</div></div><Button asChild className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/fitness-profile">Abrir Perfil Fitness</Link></Button></div></div>
          </aside>
        </div>
      </div>
      <Dialog open={profilesDialogOpen} onOpenChange={setProfilesDialogOpen}>
        <DialogContent className="app-dialog-surface max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar perfil nutricional" : "Crear perfil nutricional"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Ej. Pierna, Torso, Descanso" className="app-input-surface" />
            </div>
            <div className="space-y-2">
              <Label>Arquetipo</Label>
              <Select value={profileArchetype} onValueChange={(value) => setProfileArchetype(value as NutritionDayArchetype)}>
                <SelectTrigger className="app-input-surface"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(NUTRITION_ARCHETYPE_META).map(([key, meta]) => <SelectItem key={key} value={key}>{meta.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="app-surface-soft rounded-2xl p-4 text-sm">{NUTRITION_ARCHETYPE_META[profileArchetype].description}</div>
            </div>
            <label className="app-surface-muted flex items-center gap-3 text-sm">
              <Checkbox checked={profileIsDefault} onCheckedChange={(checked) => setProfileIsDefault(Boolean(checked))} />
              Marcar como perfil predeterminado
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfilesDialogOpen(false)} className="w-full app-outline-button sm:w-auto">Cancelar</Button>
            <Button onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">Guardar perfil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
        <DialogContent className="app-dialog-surface max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Agregar comida - {MEAL_SECTIONS.find((m) => m.key === activeMeal)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
              <div className="space-y-2">
                <Label className="app-surface-muted">Modo de carga</Label>
                <Select value={mode} onValueChange={(value) => setMode(value as AddMode)}>
                  <SelectTrigger className="app-input-surface"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Carga manual</SelectItem>
                    <SelectItem value="database">Base de alimentos</SelectItem>
                    <SelectItem value="favorite">Favoritos</SelectItem>
                    <SelectItem value="yesterday">Duplicar de ayer</SelectItem>
                    <SelectItem value="recent">Recientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="app-panel-block app-surface-muted rounded-2xl px-4 py-3 text-sm">
                <div className="app-surface-heading font-medium">Contexto activo</div>
                <div className="mt-1">Comida destino: {MEAL_SECTIONS.find((m) => m.key === activeMeal)?.label}</div>
                <div className="mt-1">Perfil del dia: {effectiveProfileLabel}</div>
              </div>
            </div>
            {mode === "database" && <div className="app-panel-block space-y-3 rounded-2xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]"><Input value={searchFood} onChange={(e) => setSearchFood(e.target.value)} placeholder="Buscar alimento..." className="app-input-surface" /><Select value={foodCategory} onValueChange={setFoodCategory}><SelectTrigger className="app-input-surface"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{(categoriesQuery.data || []).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div><Select value={selectedFoodDatabaseId} onValueChange={setSelectedFoodDatabaseId}><SelectTrigger className="app-input-surface"><SelectValue placeholder="Selecciona alimento" /></SelectTrigger><SelectContent>{(foodSearchQuery.data || []).map((food) => <SelectItem key={food.id} value={food.id}>{food.food_name} ({food.calories} kcal/{food.serving_size}{food.serving_unit})</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]"><Input value={consumedAmount} onChange={(e) => setConsumedAmount(e.target.value)} type="number" min="0" placeholder="Cantidad consumida" className="app-input-surface" /><div className="app-panel-block app-surface-muted flex items-center justify-center rounded-xl text-sm">{(foodSearchQuery.data || []).find((row) => row.id === selectedFoodDatabaseId)?.serving_unit || "g"}</div></div>{selectedFoodPreview && <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm text-foreground/80">Vista previa: {selectedFoodPreview.calories} kcal | P {selectedFoodPreview.protein_g} | C {selectedFoodPreview.carbs_g} | G {selectedFoodPreview.fat_g}</div>}</div>}
            {mode === "manual" && <div className="app-panel-block space-y-3 rounded-2xl p-4"><Input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Nombre alimento" className="app-input-surface" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px]"><Input value={servingSize} onChange={(e) => setServingSize(e.target.value)} type="number" min="0" placeholder="Porcion" className="app-input-surface" /><Input value={servingUnit} onChange={(e) => setServingUnit(e.target.value)} placeholder="unidad" className="app-input-surface" /></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" min="0" placeholder="kcal" className="app-input-surface" /><Input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" min="0" placeholder="Proteina g" className="app-input-surface" /><Input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" min="0" placeholder="Carbs g" className="app-input-surface" /><Input value={fat} onChange={(e) => setFat(e.target.value)} type="number" min="0" placeholder="Grasas g" className="app-input-surface" /><Input value={fiber} onChange={(e) => setFiber(e.target.value)} type="number" min="0" placeholder="Fibra g" className="app-input-surface" /><Input value={sugar} onChange={(e) => setSugar(e.target.value)} type="number" min="0" placeholder="Azucar g" className="app-input-surface" /><Input value={sodium} onChange={(e) => setSodium(e.target.value)} type="number" min="0" placeholder="Sodio mg" className="app-input-surface" /><Input value={potassium} onChange={(e) => setPotassium(e.target.value)} type="number" min="0" placeholder="Potasio mg" className="app-input-surface" /></div><label className="app-surface-muted flex items-center gap-2 text-sm"><input type="checkbox" checked={saveAsFavorite} onChange={(e) => setSaveAsFavorite(e.target.checked)} />Guardar en favoritos</label></div>}
            {mode === "favorite" && <Select value={selectedFavoriteId} onValueChange={setSelectedFavoriteId}><SelectTrigger className="app-input-surface"><SelectValue placeholder="Selecciona favorito" /></SelectTrigger><SelectContent>{(favoritesQuery.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} ({item.calories} kcal)</SelectItem>)}</SelectContent></Select>}
            {mode === "yesterday" && <Select value={selectedYesterdayId} onValueChange={setSelectedYesterdayId}><SelectTrigger className="app-input-surface"><SelectValue placeholder="Selecciona comida de ayer" /></SelectTrigger><SelectContent>{yesterdayEntries.map((item) => <SelectItem key={item.id} value={item.id}>{item.food_name} ({item.calories} kcal)</SelectItem>)}</SelectContent></Select>}
            {mode === "recent" && <Select value={selectedRecentId} onValueChange={setSelectedRecentId}><SelectTrigger className="app-input-surface"><SelectValue placeholder="Selecciona reciente" /></SelectTrigger><SelectContent>{(recentQuery.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.food_name} ({item.calories} kcal)</SelectItem>)}</SelectContent></Select>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMealDialogOpen(false)} className="w-full app-outline-button sm:w-auto">Cancelar</Button>
            <Button onClick={handleAddEntry} disabled={addMutation.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nutrition;

