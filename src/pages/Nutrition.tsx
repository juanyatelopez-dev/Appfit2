import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { NutritionMealDialog } from "@/pages/nutrition/components/NutritionMealDialog";
import { NutritionProfileDialog } from "@/pages/nutrition/components/NutritionProfileDialog";
import { NutritionHeaderSection } from "@/pages/nutrition/components/NutritionHeaderSection";
import { NutritionMealsSection } from "@/pages/nutrition/components/NutritionMealsSection";
import { NutritionSidebarPanel } from "@/pages/nutrition/components/NutritionSidebarPanel";
import { MEAL_SECTIONS, type AddMode } from "@/pages/nutrition/nutritionConstants";
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
        <NutritionHeaderSection
          selectedDate={selectedDate}
          selectedProfileId={selectedNutritionProfile?.id ?? null}
          profileOptions={profileOptions}
          activeArchetype={activeArchetype}
          archetypeDescription={archetypeMeta.description}
          totalCalories={totals?.calories}
          onPreviousDate={() => setSelectedDate((prev) => addDays(prev, -1))}
          onNextDate={() => setSelectedDate((prev) => addDays(prev, 1))}
          onSelectProfile={(value) => profileSelectionMutation.mutate(value)}
          onCreateProfile={openCreateProfile}
        />
        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]">
          <section className="space-y-5">
            <NutritionMealsSection
              mealOverview={mealOverview}
              expandedMeals={expandedMeals}
              onOpenMealDialog={openDialogForMeal}
              onToggleMeal={toggleMeal}
              onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
            />
          </section>
          <NutritionSidebarPanel
            effectiveProfileLabel={effectiveProfileLabel}
            activeArchetype={activeArchetype}
            weightSource={daySummary?.weightSource}
            target={target}
            goals={goals}
            totals={totals}
            remaining={remaining}
            metabolicProfile={metabolicProfile}
            profileOptions={profileOptions}
            caloriesPct={caloriesPct}
            proteinPct={proteinPct}
            carbsPct={carbsPct}
            fatPct={fatPct}
            onCreateProfile={openCreateProfile}
            onEditProfile={openEditProfile}
            onSetDefaultProfile={(profileId) => defaultProfileMutation.mutate(profileId)}
            onArchiveProfile={(profileId) => archiveProfileMutation.mutate(profileId)}
            onDeleteProfile={(profileId) => deleteProfileMutation.mutate(profileId)}
          />
        </div>
      </div>
      <NutritionProfileDialog
        open={profilesDialogOpen}
        editingProfile={editingProfile}
        profileName={profileName}
        profileArchetype={profileArchetype}
        profileIsDefault={profileIsDefault}
        isPending={saveProfileMutation.isPending}
        onOpenChange={setProfilesDialogOpen}
        onProfileNameChange={setProfileName}
        onProfileArchetypeChange={setProfileArchetype}
        onProfileIsDefaultChange={setProfileIsDefault}
        onSave={() => saveProfileMutation.mutate()}
      />
      <NutritionMealDialog
        open={mealDialogOpen}
        activeMeal={activeMeal}
        mode={mode}
        effectiveProfileLabel={effectiveProfileLabel}
        searchFood={searchFood}
        foodCategory={foodCategory}
        selectedFoodDatabaseId={selectedFoodDatabaseId}
        consumedAmount={consumedAmount}
        selectedFoodPreview={selectedFoodPreview}
        foodName={foodName}
        servingSize={servingSize}
        servingUnit={servingUnit}
        calories={calories}
        protein={protein}
        carbs={carbs}
        fat={fat}
        fiber={fiber}
        sugar={sugar}
        sodium={sodium}
        potassium={potassium}
        saveAsFavorite={saveAsFavorite}
        selectedFavoriteId={selectedFavoriteId}
        selectedYesterdayId={selectedYesterdayId}
        selectedRecentId={selectedRecentId}
        categories={categoriesQuery.data || []}
        foodSearchResults={foodSearchQuery.data || []}
        favorites={favoritesQuery.data || []}
        yesterdayEntries={yesterdayEntries}
        recentEntries={recentQuery.data || []}
        isPending={addMutation.isPending}
        onOpenChange={setMealDialogOpen}
        onModeChange={setMode}
        onSearchFoodChange={setSearchFood}
        onFoodCategoryChange={setFoodCategory}
        onSelectedFoodDatabaseIdChange={setSelectedFoodDatabaseId}
        onConsumedAmountChange={setConsumedAmount}
        onFoodNameChange={setFoodName}
        onServingSizeChange={setServingSize}
        onServingUnitChange={setServingUnit}
        onCaloriesChange={setCalories}
        onProteinChange={setProtein}
        onCarbsChange={setCarbs}
        onFatChange={setFat}
        onFiberChange={setFiber}
        onSugarChange={setSugar}
        onSodiumChange={setSodium}
        onPotassiumChange={setPotassium}
        onSaveAsFavoriteChange={setSaveAsFavorite}
        onSelectedFavoriteIdChange={setSelectedFavoriteId}
        onSelectedYesterdayIdChange={setSelectedYesterdayId}
        onSelectedRecentIdChange={setSelectedRecentId}
        onSave={handleAddEntry}
      />
    </div>
  );
};

export default Nutrition;

