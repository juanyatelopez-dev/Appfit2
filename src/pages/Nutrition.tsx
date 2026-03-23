import { addDays, format } from "date-fns";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [activeMainView, setActiveMainView] = useState<"logbook" | "library" | "summary">("summary");

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
    openCreateProfile,
    openEditProfile,
    handleAddEntry,
  } = useNutritionPageState();

  const sidebarPanel = (
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
  );

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]">
          <section className="space-y-5">
            <div className="space-y-2 px-1 sm:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/80">Bitacora de nutricion</p>
              <div className="flex items-start justify-between gap-3">
                <h1 className="app-surface-heading text-3xl font-black tracking-tight">Nutricion - Hoy</h1>
                <div className="app-chip-muted grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground"
                    onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 text-center">
                    <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Bitacora</div>
                    <div className="app-surface-heading text-sm font-semibold">{format(selectedDate, "dd/MM/yyyy")}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground"
                    onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="app-surface-caption text-sm">Registra rapido y entiende exactamente que plan nutricional estas usando.</p>
            </div>
            <div className="hidden sm:block">
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
            </div>
            <div className="app-surface-panel rounded-[20px] p-2 sm:rounded-[24px]">
              <div className="grid grid-cols-3 gap-2 sm:hidden">
                <Button
                  type="button"
                  variant={activeMainView === "summary" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setActiveMainView("summary")}
                >
                  Resumen
                </Button>
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
              <div className="hidden grid-cols-2 gap-2 sm:grid">
                <Button
                  type="button"
                  variant={activeMainView === "library" ? "outline" : "default"}
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
            {activeMainView === "summary" ? (
              <>
                <div className="space-y-5 sm:hidden">
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
                    showIntro={false}
                  />
                  {sidebarPanel}
                </div>
                <div className="hidden sm:block">
                  <NutritionMealsSection
                    mealOverview={mealOverview}
                    onOpenMealDialog={openDialogForMeal}
                    onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
                  />
                </div>
              </>
            ) : activeMainView === "library" ? (
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
            ) : (
              <NutritionMealsSection
                mealOverview={mealOverview}
                onOpenMealDialog={openDialogForMeal}
                onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
              />
            )}
          </section>

          <div className="hidden sm:block">{sidebarPanel}</div>
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
