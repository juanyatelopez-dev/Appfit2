import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNutritionTargets } from "@/hooks/useNutritionTargets";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from "@/lib/metabolismOptions";
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
  type NutritionEntry,
  type FoodDatabaseItem,
  type NutritionMealType,
} from "@/services/nutrition";

const MEAL_SECTIONS: Array<{ key: NutritionMealType; label: string }> = [
  { key: "breakfast", label: "Desayuno" },
  { key: "lunch", label: "Almuerzo" },
  { key: "dinner", label: "Cena" },
  { key: "snack", label: "Snacks" },
];

type AddMode = "manual" | "database" | "favorite" | "yesterday" | "recent";

const Nutrition = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user, isGuest, profile, updateProfile } = useAuth();
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
    if (fromQuery && /^\d{4}-\d{2}-\d{2}$/.test(fromQuery)) {
      return new Date(`${fromQuery}T12:00:00`);
    }
    return new Date();
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState<NutritionMealType>("breakfast");
  const [mode, setMode] = useState<AddMode>("manual");

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
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>("");
  const [selectedYesterdayId, setSelectedYesterdayId] = useState<string>("");
  const [selectedRecentId, setSelectedRecentId] = useState<string>("");
  const [searchFood, setSearchFood] = useState("");
  const [foodCategory, setFoodCategory] = useState("all");
  const [selectedFoodDatabaseId, setSelectedFoodDatabaseId] = useState("");
  const [consumedAmount, setConsumedAmount] = useState("100");
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [profileWeightKg, setProfileWeightKg] = useState("");
  const [profileHeightCm, setProfileHeightCm] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState<"low" | "moderate" | "high" | "very_high" | "hyperactive">("moderate");
  const [nutritionGoalType, setNutritionGoalType] = useState<"lose" | "lose_slow" | "maintain" | "gain_slow" | "gain">("maintain");
  const [dayArchetype, setDayArchetype] = useState<"base" | "heavy" | "recovery">("base");
  const [calorieOverride, setCalorieOverride] = useState("");

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

    setBirthDate(targetProfile.birthDate || "");
    setProfileWeightKg(String(targetProfile.weightKg ?? ""));
    setProfileHeightCm(String(targetProfile.heightCm ?? ""));
    setBiologicalSex(targetProfile.sex);
    setActivityLevel(targetProfile.activityLevel);
    setNutritionGoalType(targetProfile.goalType);
    setDayArchetype(targetProfile.dayArchetype);
    setCalorieOverride(
      targetProfile.isCalorieOverrideEnabled && targetProfile.calorieOverride !== null ? String(targetProfile.calorieOverride) : "",
    );
  }, [nutritionTargets.metabolicProfile]);
  const selectedActivity = useMemo(() => ACTIVITY_OPTIONS.find((option) => option.value === activityLevel), [activityLevel]);
  const selectedGoal = useMemo(() => GOAL_OPTIONS.find((option) => option.value === nutritionGoalType), [nutritionGoalType]);

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

  const saveMetabolicConfigMutation = useMutation({
    mutationFn: async () => {
      const parsedWeight = Number(profileWeightKg);
      const parsedHeight = Number(profileHeightCm);
      const parsedOverride = calorieOverride.trim() ? Number(calorieOverride) : null;
      const parsedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00`) : null;

      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        throw new Error("Peso invalido.");
      }
      if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
        throw new Error("Altura invalida.");
      }
      if (parsedOverride !== null && (!Number.isFinite(parsedOverride) || parsedOverride <= 0)) {
        throw new Error("Override calorico invalido.");
      }
      if (parsedBirthDate && Number.isNaN(parsedBirthDate.getTime())) {
        throw new Error("Fecha de nacimiento invalida.");
      }
      if (parsedBirthDate) {
        const now = new Date();
        let age = now.getFullYear() - parsedBirthDate.getFullYear();
        const monthDiff = now.getMonth() - parsedBirthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsedBirthDate.getDate())) {
          age -= 1;
        }
        if (age < 12 || age > 95) {
          throw new Error("La edad debe estar entre 12 y 95 anios.");
        }
      }

      await updateProfile({
        birth_date: birthDate || null,
        weight: parsedWeight,
        height: parsedHeight,
        biological_sex: biologicalSex,
        activity_level: activityLevel,
        nutrition_goal_type: nutritionGoalType,
        goal_type: GOAL_OPTIONS.find((option) => option.value === nutritionGoalType)?.legacyGoalTypeLabel ?? "Maintain Weight",
        day_archetype: dayArchetype,
      } as any);

      await nutritionTargets.setDayArchetype(dayArchetype);
      await nutritionTargets.setCalorieOverride(parsedOverride);
    },
    onSuccess: async () => {
      toast.success("Configuracion metabolica actualizada.");
      await invalidateNutrition();
    },
    onError: (error: any) => toast.error(error?.message || "No se pudo actualizar la configuracion metabolica."),
  });

  const openDialogForMeal = (meal: NutritionMealType) => {
    setActiveMeal(meal);
    setMode("manual");
    setDialogOpen(true);
  };

  const daySummary = summaryQuery.data;
  const goals = daySummary?.goals;
  const totals = daySummary?.totals;
  const target = daySummary?.targetBreakdown ?? nutritionTargets.target;
  const remaining = daySummary?.remaining;
  const caloriesPct = goals ? Math.min(100, Math.round((totals!.calories / Math.max(goals.calorie_goal, 1)) * 100)) : 0;
  const proteinPct = goals ? Math.min(100, Math.round((totals!.protein_g / Math.max(goals.protein_goal_g, 1)) * 100)) : 0;
  const carbsPct = goals ? Math.min(100, Math.round((totals!.carbs_g / Math.max(goals.carb_goal_g, 1)) * 100)) : 0;
  const fatPct = goals ? Math.min(100, Math.round((totals!.fat_g / Math.max(goals.fat_goal_g, 1)) * 100)) : 0;

  const yesterdayEntries = useMemo(() => {
    const grouped = yesterdayQuery.data;
    if (!grouped) return [] as NutritionEntry[];
    return [...grouped.breakfast, ...grouped.lunch, ...grouped.dinner, ...grouped.snack];
  }, [yesterdayQuery.data]);

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
      if (!food) {
        toast.error("Selecciona un alimento de la base.");
        return;
      }
      const amount = Number(consumedAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Ingresa una cantidad valida.");
        return;
      }
      const computed = calculateNutritionFromFood(food as FoodDatabaseItem, amount);
      await addMutation.mutateAsync({
        userId,
        date: selectedDate,
        meal_type: activeMeal,
        food_name: food.food_name,
        serving_size: computed.serving_size,
        serving_unit: computed.serving_unit,
        calories: computed.calories,
        protein_g: computed.protein_g,
        carbs_g: computed.carbs_g,
        fat_g: computed.fat_g,
        fiber_g: computed.fiber_g,
        sugar_g: computed.sugar_g,
        sodium_mg: computed.sodium_mg,
        potassium_mg: computed.potassium_mg,
        micronutrients: computed.micronutrients,
        nutrient_density_score: computed.nutrient_density_score,
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
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alimentacion</h1>
          <p className="text-sm text-muted-foreground">Diario por comida y seguimiento de macros.</p>
        </div>
      <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate((prev) => addDays(prev, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium min-w-36 text-center">{format(selectedDate, "dd/MM/yyyy")}</p>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate((prev) => addDays(prev, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuracion metabolica</CardTitle>
            <CardDescription>Mifflin-St Jeor + actividad + meta + arquetipo diario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Sexo biologico</Label>
                <Select value={biologicalSex} onValueChange={(value) => setBiologicalSex(value as "male" | "female")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Peso (kg)</Label>
                <Input type="number" min="1" value={profileWeightKg} onChange={(event) => setProfileWeightKg(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Altura (cm)</Label>
                <Input type="number" min="1" value={profileHeightCm} onChange={(event) => setProfileHeightCm(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Nivel de actividad</Label>
                <Select value={activityLevel} onValueChange={(value) => setActivityLevel(value as typeof activityLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{selectedActivity?.description}</p>
              </div>
              <div className="space-y-1">
                <Label>Objetivo nutricional</Label>
                <Select value={nutritionGoalType} onValueChange={(value) => setNutritionGoalType(value as typeof nutritionGoalType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{selectedGoal?.description}</p>
              </div>
              <div className="space-y-1">
                <Label>Arquetipo del dia</Label>
                <Select value={dayArchetype} onValueChange={(value) => setDayArchetype(value as typeof dayArchetype)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="heavy">Heavy (+150 kcal)</SelectItem>
                    <SelectItem value="recovery">Recovery (-300 kcal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Override calorico (opcional)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Vacio = calculo automatico"
                  value={calorieOverride}
                  onChange={(event) => setCalorieOverride(event.target.value)}
                />
              </div>
            </div>
            <Button onClick={() => saveMetabolicConfigMutation.mutate()} disabled={saveMetabolicConfigMutation.isPending || nutritionTargets.isSaving}>
              Guardar configuracion metabolica
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle del calculo</CardTitle>
            <CardDescription>Motor metabolico activo para este dia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Edad: {nutritionTargets.metabolicProfile?.age ?? "--"} anios</p>
            <p>BMR: {target?.bmr ?? "--"} kcal</p>
            <p>TDEE: {target?.tdee ?? "--"} kcal</p>
            <p>Multiplicador actividad: {target?.activityMultiplier ?? "--"}</p>
            <p>Multiplicador meta: {target?.goalMultiplier ?? "--"}</p>
            <p>Delta arquetipo: {target?.archetypeDelta ?? "--"} kcal</p>
            <p>Calorias target (meta): {target?.calorieTarget ?? "--"} kcal</p>
            <p>Calorias finales: {target?.finalTargetCalories ?? "--"} kcal</p>
            <p>
              Proteina: {target?.proteinGrams ?? "--"} g ({target?.proteinCalories ?? "--"} kcal)
            </p>
            <p>
              Grasas: {target?.fatGrams ?? "--"} g ({target?.fatCalories ?? "--"} kcal)
            </p>
            <p>
              Carbohidratos: {target?.carbGrams ?? "--"} g ({target?.carbCalories ?? "--"} kcal)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen diario</CardTitle>
          <CardDescription>Calorias y macros consumidos vs objetivo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Calorias</p>
              <p className="text-2xl font-semibold">
                {totals?.calories ?? 0} / {goals?.calorie_goal ?? 2000}
              </p>
              <Progress value={caloriesPct} className="mt-2" />
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Proteina (g)</p>
              <p className="text-2xl font-semibold">
                {totals?.protein_g ?? 0} / {goals?.protein_goal_g ?? 150}
              </p>
              <Progress value={proteinPct} className="mt-2" />
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Carbohidratos (g)</p>
              <p className="text-2xl font-semibold">
                {totals?.carbs_g ?? 0} / {goals?.carb_goal_g ?? 250}
              </p>
              <Progress value={carbsPct} className="mt-2" />
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Grasas (g)</p>
              <p className="text-2xl font-semibold">
                {totals?.fat_g ?? 0} / {goals?.fat_goal_g ?? 70}
              </p>
              <Progress value={fatPct} className="mt-2" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Fibra: {totals?.fiber_g ?? 0} g | Azucar: {totals?.sugar_g ?? 0} g
          </p>
          <p className="text-xs text-muted-foreground">
            Sodio: {totals?.sodium_mg ?? 0} mg | Potasio: {totals?.potassium_mg ?? 0} mg | Ratio Na/K:{" "}
            {totals?.sodium_potassium_ratio ?? "--"}
          </p>
          <p className="text-xs text-muted-foreground">
            Densidad nutricional: {daySummary?.nutrientDensityScore ?? "--"} | Restante: {remaining?.calories ?? "--"} kcal, P{" "}
            {remaining?.protein_g ?? "--"} g, C {remaining?.carbs_g ?? "--"} g, G {remaining?.fat_g ?? "--"} g
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {MEAL_SECTIONS.map((meal) => {
          const entries = daySummary?.groups[meal.key] || [];
          const subtotal = daySummary?.mealTotals[meal.key];
          return (
            <Card key={meal.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{meal.label}</CardTitle>
                  <Button size="sm" onClick={() => openDialogForMeal(meal.key)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Agregar comida
                  </Button>
                </div>
                <CardDescription>
                  {subtotal?.calories ?? 0} kcal | P {subtotal?.protein_g ?? 0}g | C {subtotal?.carbs_g ?? 0}g | G{" "}
                  {subtotal?.fat_g ?? 0}g
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {entries.length === 0 && <p className="text-sm text-muted-foreground">Sin registros en esta comida.</p>}
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{entry.food_name}</p>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.serving_size} {entry.serving_unit} | {entry.calories} kcal | P {entry.protein_g} | C {entry.carbs_g} | G{" "}
                      {entry.fat_g} | Na {entry.sodium_mg ?? 0} mg | K {entry.potassium_mg ?? 0} mg
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar comida ({MEAL_SECTIONS.find((m) => m.key === activeMeal)?.label})</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Label>Modo rapido</Label>
            <Select value={mode} onValueChange={(value) => setMode(value as AddMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="database">Buscar en base</SelectItem>
                <SelectItem value="favorite">Favorito</SelectItem>
                <SelectItem value="yesterday">Duplicar de ayer</SelectItem>
                <SelectItem value="recent">Reutilizar reciente</SelectItem>
              </SelectContent>
            </Select>

            {mode === "database" && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input value={searchFood} onChange={(e) => setSearchFood(e.target.value)} placeholder="Buscar alimento..." />
                  <Select value={foodCategory} onValueChange={setFoodCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {(categoriesQuery.data || []).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={selectedFoodDatabaseId} onValueChange={setSelectedFoodDatabaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona alimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {(foodSearchQuery.data || []).map((food) => (
                      <SelectItem key={food.id} value={food.id}>
                        {food.food_name} ({food.calories} kcal/{food.serving_size}
                        {food.serving_unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={consumedAmount}
                    onChange={(e) => setConsumedAmount(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="Cantidad consumida"
                  />
                  <div className="flex items-center rounded-md border px-3 text-sm text-muted-foreground">
                    {(foodSearchQuery.data || []).find((row) => row.id === selectedFoodDatabaseId)?.serving_unit || "g"}
                  </div>
                </div>

                {(() => {
                  const selectedFood = (foodSearchQuery.data || []).find((row) => row.id === selectedFoodDatabaseId);
                  if (!selectedFood) return null;
                  const amount = Number(consumedAmount);
                  if (!Number.isFinite(amount) || amount <= 0) return null;
                  const computed = calculateNutritionFromFood(selectedFood as FoodDatabaseItem, amount);
                  return (
                    <p className="text-xs text-muted-foreground">
                      Vista previa: {computed.calories} kcal | P {computed.protein_g} | C {computed.carbs_g} | G {computed.fat_g} | Na{" "}
                      {computed.sodium_mg} | K {computed.potassium_mg}
                    </p>
                  );
                })()}
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-2">
                <Input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Nombre alimento" />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input value={servingSize} onChange={(e) => setServingSize(e.target.value)} type="number" min="0" placeholder="Porcion" />
                  <Input value={servingUnit} onChange={(e) => setServingUnit(e.target.value)} placeholder="unidad" className="w-24" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" min="0" placeholder="kcal" />
                  <Input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" min="0" placeholder="Proteina g" />
                  <Input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" min="0" placeholder="Carbs g" />
                  <Input value={fat} onChange={(e) => setFat(e.target.value)} type="number" min="0" placeholder="Grasas g" />
                  <Input value={fiber} onChange={(e) => setFiber(e.target.value)} type="number" min="0" placeholder="Fibra g" />
                  <Input value={sugar} onChange={(e) => setSugar(e.target.value)} type="number" min="0" placeholder="Azucar g" />
                  <Input value={sodium} onChange={(e) => setSodium(e.target.value)} type="number" min="0" placeholder="Sodio mg" />
                  <Input value={potassium} onChange={(e) => setPotassium(e.target.value)} type="number" min="0" placeholder="Potasio mg" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={saveAsFavorite} onChange={(e) => setSaveAsFavorite(e.target.checked)} />
                  Guardar en favoritos
                </label>
                <p className="text-xs text-muted-foreground">
                  Vista previa: {Number(calories || 0)} kcal | P {Number(protein || 0)} | C {Number(carbs || 0)} | G {Number(fat || 0)} |
                  {" "}Na {Number(sodium || 0)} | K {Number(potassium || 0)}
                </p>
              </div>
            )}

            {mode === "favorite" && (
              <Select value={selectedFavoriteId} onValueChange={setSelectedFavoriteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona favorito" />
                </SelectTrigger>
                <SelectContent>
                  {(favoritesQuery.data || []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.calories} kcal)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "yesterday" && (
              <Select value={selectedYesterdayId} onValueChange={setSelectedYesterdayId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona comida de ayer" />
                </SelectTrigger>
                <SelectContent>
                  {yesterdayEntries.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.food_name} ({item.calories} kcal)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "recent" && (
              <Select value={selectedRecentId} onValueChange={setSelectedRecentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona reciente" />
                </SelectTrigger>
                <SelectContent>
                  {(recentQuery.data || []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.food_name} ({item.calories} kcal)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEntry} disabled={addMutation.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nutrition;
