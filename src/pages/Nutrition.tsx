import { addDays } from "date-fns";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NutritionHeaderSection } from "@/modules/nutrition/ui/components/NutritionHeaderSection";
import { NutritionMealDialog } from "@/modules/nutrition/ui/components/NutritionMealDialog";
import { NutritionMealsSection } from "@/modules/nutrition/ui/components/NutritionMealsSection";
import { NutritionProfileDialog } from "@/modules/nutrition/ui/components/NutritionProfileDialog";
import { NutritionSidebarPanel } from "@/modules/nutrition/ui/components/NutritionSidebarPanel";
import { NutritionTechnicalDialog } from "@/modules/nutrition/ui/components/NutritionTechnicalDialog";
import { useNutritionPageState } from "@/modules/nutrition/ui/useNutritionPageState";

const Nutrition = () => {
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const {
    selectedDate,
    setSelectedDate,
    mealDialogOpen,
    setMealDialogOpen,
    profilesDialogOpen,
    setProfilesDialogOpen,
    activeMeal,
    mode,
    setMode,
    expandedMeals,
    foodName,
    setFoodName,
    servingSize,
    setServingSize,
    servingUnit,
    setServingUnit,
    calories,
    setCalories,
    protein,
    setProtein,
    carbs,
    setCarbs,
    fat,
    setFat,
    fiber,
    setFiber,
    sugar,
    setSugar,
    sodium,
    setSodium,
    potassium,
    setPotassium,
    selectedFavoriteId,
    setSelectedFavoriteId,
    selectedYesterdayId,
    setSelectedYesterdayId,
    selectedRecentId,
    setSelectedRecentId,
    searchFood,
    setSearchFood,
    foodCategory,
    setFoodCategory,
    selectedFoodDatabaseId,
    setSelectedFoodDatabaseId,
    consumedAmount,
    setConsumedAmount,
    saveAsFavorite,
    setSaveAsFavorite,
    editingProfile,
    profileName,
    setProfileName,
    profileArchetype,
    setProfileArchetype,
    profileIsDefault,
    setProfileIsDefault,
    daySummary,
    profileOptions,
    goals,
    totals,
    target,
    remaining,
    metabolicProfile,
    selectedNutritionProfile,
    activeArchetype,
    archetypeMeta,
    planSource,
    planSourceLabel,
    planSourceDescription,
    effectiveProfileLabel,
    caloriesPct,
    proteinPct,
    carbsPct,
    fatPct,
    yesterdayEntries,
    selectedFoodPreview,
    mealOverview,
    categories,
    foodSearchResults,
    favorites,
    recentEntries,
    addMutation,
    deleteMutation,
    saveProfileMutation,
    profileSelectionMutation,
    archiveProfileMutation,
    deleteProfileMutation,
    defaultProfileMutation,
    openDialogForMeal,
    toggleMeal,
    openCreateProfile,
    openEditProfile,
    handleAddEntry,
  } = useNutritionPageState();

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <NutritionHeaderSection
          selectedDate={selectedDate}
          selectedProfileId={selectedNutritionProfile?.id ?? null}
          profileOptions={profileOptions}
          activeArchetype={activeArchetype}
          archetypeDescription={archetypeMeta.description}
          planSource={planSource}
          planSourceLabel={planSourceLabel}
          planSourceDescription={planSourceDescription}
          totalCalories={totals?.calories}
          onPreviousDate={() => setSelectedDate((prev) => addDays(prev, -1))}
          onNextDate={() => setSelectedDate((prev) => addDays(prev, 1))}
          onSelectProfile={(value) => profileSelectionMutation.mutate(value)}
          onOpenAddFood={() => openDialogForMeal("breakfast", "database")}
          onOpenTechnicalConfig={() => setTechnicalOpen(true)}
        />

        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]">
          <section className="space-y-5">
            <Card className="app-surface-panel rounded-[20px]">
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">Resumen del dia</p>
                    <p className="app-surface-heading mt-1 text-xl font-black">
                      {totals?.calories ?? 0} / {goals?.calorie_goal ?? 0} kcal
                    </p>
                    <p className="app-surface-caption mt-1 text-xs">Tu estado diario en una sola mirada.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDialogForMeal("breakfast", "database")}
                    className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
                  >
                    + Agregar comida
                  </button>
                </div>
                <Progress value={caloriesPct} className="h-2.5 app-progress-track" />
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div className="app-panel-block rounded-xl px-3 py-2">Prote: {totals?.protein_g ?? 0} / {goals?.protein_goal_g ?? 0}g</div>
                  <div className="app-panel-block rounded-xl px-3 py-2">Carbs: {totals?.carbs_g ?? 0} / {goals?.carb_goal_g ?? 0}g</div>
                  <div className="app-panel-block rounded-xl px-3 py-2">Grasas: {totals?.fat_g ?? 0} / {goals?.fat_goal_g ?? 0}g</div>
                </div>
              </CardContent>
            </Card>

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
            planSource={planSource}
            planSourceLabel={planSourceLabel}
            weightSource={daySummary?.weightSource}
            target={target}
            goals={goals}
            totals={totals}
            remaining={remaining}
            metabolicProfile={metabolicProfile}
            caloriesPct={caloriesPct}
            proteinPct={proteinPct}
            carbsPct={carbsPct}
            fatPct={fatPct}
            onOpenTechnicalConfig={() => setTechnicalOpen(true)}
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
        categories={categories}
        foodSearchResults={foodSearchResults}
        favorites={favorites}
        yesterdayEntries={yesterdayEntries}
        recentEntries={recentEntries}
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

      <NutritionTechnicalDialog
        open={technicalOpen}
        onOpenChange={setTechnicalOpen}
        target={target}
        goals={goals}
        metabolicProfile={metabolicProfile}
        profileOptions={profileOptions}
        onCreateProfile={openCreateProfile}
        onEditProfile={openEditProfile}
        onSetDefaultProfile={(profileId) => defaultProfileMutation.mutate(profileId)}
        onArchiveProfile={(profileId) => archiveProfileMutation.mutate(profileId)}
        onDeleteProfile={(profileId) => deleteProfileMutation.mutate(profileId)}
      />
    </div>
  );
};

export default Nutrition;
