import { addDays } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { NutritionHeaderSection } from "@/modules/nutrition/ui/components/NutritionHeaderSection";
import { NutritionFoodLibrarySection } from "@/modules/nutrition/ui/components/NutritionFoodLibrarySection";
import { NutritionMealDialog } from "@/modules/nutrition/ui/components/NutritionMealDialog";
import { NutritionMealsSection } from "@/modules/nutrition/ui/components/NutritionMealsSection";
import { NutritionProfileDialog } from "@/modules/nutrition/ui/components/NutritionProfileDialog";
import { NutritionSidebarPanel } from "@/modules/nutrition/ui/components/NutritionSidebarPanel";
import { NutritionTechnicalDialog } from "@/modules/nutrition/ui/components/NutritionTechnicalDialog";
import { useNutritionPageState } from "@/modules/nutrition/ui/useNutritionPageState";

const Nutrition = () => {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [activeMainView, setActiveMainView] = useState<"logbook" | "library">("logbook");

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
    foodLibraryItems,
    favorites,
    recentEntries,
    addMutation,
    deleteMutation,
    saveProfileMutation,
    updateFavoriteMutation,
    deleteFavoriteMutation,
    profileSelectionMutation,
    archiveProfileMutation,
    deleteProfileMutation,
    defaultProfileMutation,
    weeklyProfilePlanMutation,
    openDialogForMeal,
    toggleMeal,
    openCreateProfile,
    openEditProfile,
    handleAddEntry,
  } = useNutritionPageState();

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]">
          <section className="space-y-5">
            <NutritionHeaderSection
              selectedDate={selectedDate}
              selectedProfileId={selectedNutritionProfile?.id ?? null}
              selectedPlanName={effectiveProfileLabel}
              profileOptions={profileOptions}
              activeArchetype={activeArchetype}
              archetypeDescription={archetypeMeta.description}
              planSource={planSource}
              planSourceLabel={planSourceLabel}
              planSourceDescription={planSourceDescription}
              onPreviousDate={() => setSelectedDate((prev) => addDays(prev, -1))}
              onNextDate={() => setSelectedDate((prev) => addDays(prev, 1))}
              onSelectProfile={(value) => profileSelectionMutation.mutate(value)}
              onApplyWeeklyPlan={(entries) => weeklyProfilePlanMutation.mutate(entries)}
              isApplyingWeeklyPlan={weeklyProfilePlanMutation.isPending}
              onOpenTechnicalConfig={() => setTechnicalOpen(true)}
            />
            <div className="app-surface-panel rounded-[20px] p-2 sm:rounded-[24px]">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={activeMainView === "logbook" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setActiveMainView("logbook")}
                >
                  Logbook
                </Button>
                <Button
                  type="button"
                  variant={activeMainView === "library" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setActiveMainView("library")}
                >
                  Biblioteca
                </Button>
              </div>
            </div>
            {activeMainView === "logbook" ? (
              <NutritionMealsSection
                mealOverview={mealOverview}
                expandedMeals={expandedMeals}
                onOpenMealDialog={openDialogForMeal}
                onToggleMeal={toggleMeal}
                onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
              />
            ) : (
              <NutritionFoodLibrarySection
                foodLibraryItems={foodLibraryItems}
                favorites={favorites}
                categories={categories}
                onAddMeal={() => openDialogForMeal("breakfast")}
                onUpdateFavorite={(payload) => updateFavoriteMutation.mutate(payload)}
                onDeleteFavorite={(favoriteId) => deleteFavoriteMutation.mutate(favoriteId)}
                isUpdatingFavorite={updateFavoriteMutation.isPending}
                isDeletingFavorite={deleteFavoriteMutation.isPending}
              />
            )}
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
        onDeleteProfile={(profileId, mode) => deleteProfileMutation.mutate({ profileId, mode })}
        isDeletingProfile={deleteProfileMutation.isPending}
      />
    </div>
  );
};

export default Nutrition;
