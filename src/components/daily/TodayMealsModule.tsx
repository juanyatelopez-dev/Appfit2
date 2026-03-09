import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Database, PencilLine, ShieldPlus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import {
  addNutritionEntry,
  deleteNutritionEntry,
  getFavoriteFoods,
  getNutritionDaySummary,
  listRecentNutritionEntries,
  type NutritionEntry,
  type NutritionMealType,
} from "@/services/nutrition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AddMode = "manual" | "favorite" | "recent";

const MEALS: Array<{ key: NutritionMealType; label: string; accent: string }> = [
  { key: "breakfast", label: "Desayuno", accent: "bg-lime-400" },
  { key: "lunch", label: "Almuerzo", accent: "bg-cyan-400" },
  { key: "dinner", label: "Cena", accent: "bg-amber-400" },
  { key: "snack", label: "Snack", accent: "bg-fuchsia-400" },
];

const formatNumber = (value: number | null | undefined, suffix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toFixed(0)}${suffix}`;
};

const TodayMealsModule = () => {
  const { user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();

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
  const [selectedFavoriteId, setSelectedFavoriteId] = useState("");
  const [selectedRecentId, setSelectedRecentId] = useState("");
  const [expandedMeals, setExpandedMeals] = useState<Record<NutritionMealType, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: false,
    snack: false,
  });

  const selectedDate = useMemo(() => new Date(), []);
  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const userId = user?.id ?? null;
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
  const todayKey = useMemo(() => selectedDate.toISOString().slice(0, 10), [selectedDate]);

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

  const recentQuery = useQuery({
    queryKey: ["nutrition_recent_entries", userId, isGuest],
    queryFn: () => listRecentNutritionEntries(userId, 20, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const invalidateNutritionQueries = async () => {
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
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
    ]);
  };

  const addMutation = useMutation({
    mutationFn: (payload: Parameters<typeof addNutritionEntry>[0]) => addNutritionEntry(payload),
    onSuccess: async () => {
      setDialogOpen(false);
      await invalidateNutritionQueries();
      toast.success("Comida registrada.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar la comida.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNutritionEntry(id, userId, { isGuest }),
    onSuccess: async () => {
      await invalidateNutritionQueries();
      toast.success("Registro eliminado.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo eliminar el registro.");
    },
  });

  const daySummary = summaryQuery.data;
  const totals = daySummary?.totals;
  const goals = daySummary?.goals;
  const caloriesPct = goals && totals ? Math.min(100, Math.round((totals.calories / Math.max(goals.calorie_goal, 1)) * 100)) : 0;

  const mealOverview = useMemo(
    () =>
      MEALS.map((meal) => ({
        ...meal,
        entries: daySummary?.groups[meal.key] || [],
        subtotal: daySummary?.mealTotals[meal.key],
      })),
    [daySummary],
  );

  const openDialog = (meal: NutritionMealType, nextMode: AddMode = "manual") => {
    setActiveMeal(meal);
    setMode(nextMode);
    setDialogOpen(true);
  };

  const toggleMeal = (meal: NutritionMealType) => {
    setExpandedMeals((current) => ({ ...current, [meal]: !current[meal] }));
  };

  const resetManualForm = () => {
    setFoodName("");
    setServingSize("100");
    setServingUnit("g");
    setCalories("0");
    setProtein("0");
    setCarbs("0");
    setFat("0");
  };

  const handleAdd = async () => {
    if (mode === "manual") {
      await addMutation.mutateAsync({
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
        isGuest,
        timeZone,
      });
      resetManualForm();
      return;
    }

    if (mode === "favorite") {
      const favorite = (favoritesQuery.data || []).find((item) => item.id === selectedFavoriteId);
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

    const recent = (recentQuery.data || []).find((item) => item.id === selectedRecentId);
    if (!recent) {
      toast.error("Selecciona un reciente.");
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
    <Card className="rounded-[28px] border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          Comidas del día
        </CardTitle>
        <CardDescription>Logbook operativo del día con carga rápida por comida.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Balance energetico</p>
                <p className="mt-2 text-3xl font-semibold">
                  {totals?.calories ?? 0} / {goals?.calorie_goal ?? 2000} kcal
                </p>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{caloriesPct}%</p>
            </div>
            <Progress value={caloriesPct} className="mt-4" />
            <p className="mt-3 text-sm text-muted-foreground">
              P {formatNumber(totals?.protein_g, "g")} / {formatNumber(goals?.protein_goal_g, "g")} | C{" "}
              {formatNumber(totals?.carbs_g, "g")} / {formatNumber(goals?.carb_goal_g, "g")} | G{" "}
              {formatNumber(totals?.fat_g, "g")} / {formatNumber(goals?.fat_goal_g, "g")}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ritmo del día</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                Ultima comida: {daySummary?.lastEntry ? `${daySummary.lastEntry.food_name} (${Math.round(daySummary.lastEntry.calories)} kcal)` : "Sin registro"}
              </div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                Densidad nutricional: {daySummary?.nutrientDensityScore ?? "--"}
              </div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                Sodio/Potasio: {daySummary?.sodiumPotassium.ratio ?? "--"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {mealOverview.map((meal) => (
            <article key={meal.key} className="overflow-hidden rounded-2xl border border-border/60 bg-background/35">
              <button
                type="button"
                onClick={() => toggleMeal(meal.key)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-10 w-1 rounded-full ${meal.accent}`} />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.08em]">{meal.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {meal.entries.length} items | {formatNumber(meal.subtotal?.protein_g, "g")} P | {formatNumber(meal.subtotal?.carbs_g, "g")} C |{" "}
                      {formatNumber(meal.subtotal?.fat_g, "g")} G | {formatNumber(meal.subtotal?.calories, " kcal")}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedMeals[meal.key] ? "rotate-180" : ""}`} />
              </button>

              {expandedMeals[meal.key] && (
                <div className="border-t border-border/60 px-4 pb-4 pt-3">
                  <div className="space-y-2">
                    {meal.entries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                        Sin registros en esta comida.
                      </div>
                    ) : (
                      meal.entries.map((entry: NutritionEntry) => (
                        <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border/50 bg-background/50 p-3">
                          <div>
                            <div className="font-medium">{entry.food_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {entry.serving_size} {entry.serving_unit} | P {entry.protein_g} | C {entry.carbs_g} | G {entry.fat_g}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold">{entry.calories} kcal</div>
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => openDialog(meal.key, "manual")}>
                      <PencilLine className="mr-2 h-4 w-4" />
                      Carga manual
                    </Button>
                    <Button variant="outline" onClick={() => openDialog(meal.key, "favorite")}>
                      <ShieldPlus className="mr-2 h-4 w-4" />
                      Favoritos
                    </Button>
                    <Button variant="outline" onClick={() => openDialog(meal.key, "recent")}>
                      <Database className="mr-2 h-4 w-4" />
                      Recientes
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar comida a {MEALS.find((item) => item.key === activeMeal)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Modo de carga</Label>
                <Select value={mode} onValueChange={(value) => setMode(value as AddMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="favorite">Favoritos</SelectItem>
                    <SelectItem value="recent">Recientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Comida destino</Label>
                <Select value={activeMeal} onValueChange={(value) => setActiveMeal(value as NutritionMealType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEALS.map((meal) => (
                      <SelectItem key={meal.key} value={meal.key}>
                        {meal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === "manual" && (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                <Input value={foodName} onChange={(event) => setFoodName(event.target.value)} placeholder="Nombre del alimento" />
                <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                  <Input value={servingSize} onChange={(event) => setServingSize(event.target.value)} type="number" min="0" placeholder="Cantidad" />
                  <Input value={servingUnit} onChange={(event) => setServingUnit(event.target.value)} placeholder="unidad" />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Input value={calories} onChange={(event) => setCalories(event.target.value)} type="number" min="0" placeholder="kcal" />
                  <Input value={protein} onChange={(event) => setProtein(event.target.value)} type="number" min="0" placeholder="Proteina" />
                  <Input value={carbs} onChange={(event) => setCarbs(event.target.value)} type="number" min="0" placeholder="Carbs" />
                  <Input value={fat} onChange={(event) => setFat(event.target.value)} type="number" min="0" placeholder="Grasas" />
                </div>
              </div>
            )}

            {mode === "favorite" && (
              <Select value={selectedFavoriteId} onValueChange={setSelectedFavoriteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona favorito" />
                </SelectTrigger>
                <SelectContent>
                  {(favoritesQuery.data || []).map((favorite) => (
                    <SelectItem key={favorite.id} value={favorite.id}>
                      {favorite.name} ({favorite.calories} kcal)
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
                  {(recentQuery.data || []).map((recent) => (
                    <SelectItem key={recent.id} value={recent.id}>
                      {recent.food_name} ({recent.calories} kcal)
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
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Guardando..." : "Guardar comida"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TodayMealsModule;
