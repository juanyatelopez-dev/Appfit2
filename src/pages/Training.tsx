import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrainingCustomExerciseDialog } from "@/modules/training/ui/components/TrainingCustomExerciseDialog";
import { TrainingDeleteWorkoutDialog } from "@/modules/training/ui/components/TrainingDeleteWorkoutDialog";
import { TrainingHistorySection } from "@/modules/training/ui/components/TrainingHistorySection";
import { TrainingLibrarySection } from "@/modules/training/ui/components/TrainingLibrarySection";
import { TrainingProgressSection } from "@/modules/training/ui/components/TrainingProgressSection";
import { TrainingRoutinesSection } from "@/modules/training/ui/components/TrainingRoutinesSection";
import { TrainingTodaySection } from "@/modules/training/ui/components/TrainingTodaySection";
import { TrainingWorkoutDialog } from "@/modules/training/ui/components/TrainingWorkoutDialog";
import { formatDateTime, formatRest, prLabelMap } from "@/modules/training/ui/trainingConstants";
import { useTrainingPageState } from "@/modules/training/ui/useTrainingPageState";

const Training = () => {
  const {
    copy,
    tab,
    handleTabChange,
    filters,
    setFilters,
    selectedExerciseId,
    setSelectedExerciseId,
    workoutDialogOpen,
    setWorkoutDialogOpen,
    customExerciseOpen,
    setCustomExerciseOpen,
    editingWorkoutId,
    workoutName,
    setWorkoutName,
    workoutDescription,
    setWorkoutDescription,
    workoutExercises,
    setWorkoutExercises,
    exercisePickerId,
    setExercisePickerId,
    customExerciseForm,
    setCustomExerciseForm,
    noteDrafts,
    setNoteDrafts,
    setDrafts,
    finishNotes,
    setFinishNotes,
    deleteWorkoutId,
    setDeleteWorkoutId,
    workouts,
    templates,
    schedule,
    activeSession,
    scheduledWorkout,
    exerciseLibrary,
    isTrainingLoading,
    trainingError,
    trainingErrorMessage,
    activeProgress,
    restRemaining,
    history,
    exerciseHistory,
    exerciseProgress,
    exercisePrs,
    formatExerciseName,
    localizeText,
    getWorkoutPreviewText,
    getSetDraft,
    getExerciseDraftCount,
    renderPlaceholder,
    saveSet,
    openCreateRoutine,
    openEditRoutine,
    saveWorkoutFromDraft,
    saveWorkoutMutation,
    deleteWorkoutMutation,
    duplicateTemplateMutation,
    saveScheduleMutation,
    saveCustomExerciseMutation,
    startSessionMutation,
    saveSetMutation,
    deleteSetMutation,
    saveSessionNoteMutation,
    finishSessionMutation,
  } = useTrainingPageState();

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2 px-1">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">{copy.title}</h1>
        <p className="app-surface-muted max-w-2xl text-sm">{copy.subtitle}</p>
      </div>

      <Card className="app-surface-hero overflow-hidden border-border/60">
        <CardContent className="grid gap-6 px-6 py-6 xl:min-h-[8.5rem] xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-center">
          <div />
          <div className="grid gap-3 sm:grid-cols-2 xl:self-start">
            <div className="app-surface-tile rounded-2xl p-4">
              <div className="app-surface-caption text-[11px] uppercase tracking-[0.22em]">{copy.today}</div>
              <div className="app-surface-heading mt-2 text-lg font-semibold">
                {activeSession ? copy.activeSession : scheduledWorkout?.name ?? copy.noWorkout}
              </div>
            </div>
            <div className="app-surface-tile rounded-2xl p-4">
              <div className="app-surface-caption text-[11px] uppercase tracking-[0.22em]">{copy.rest}</div>
              <div className="app-surface-heading mt-2 text-lg font-semibold">{restRemaining}s</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isTrainingLoading ? <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{copy.loading}</div> : null}
      {trainingError ? <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{copy.failedLoad}: {trainingErrorMessage}</div> : null}

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger className="min-w-0 px-2 text-xs sm:text-sm lg:min-w-0" value="today">{copy.tabs.today}</TabsTrigger>
          <TabsTrigger className="min-w-0 px-2 text-xs sm:text-sm lg:min-w-0" value="routines">{copy.tabs.routines}</TabsTrigger>
          <TabsTrigger className="min-w-0 px-2 text-xs sm:text-sm lg:min-w-0" value="library">{copy.tabs.library}</TabsTrigger>
          <TabsTrigger className="min-w-0 px-2 text-xs sm:text-sm lg:min-w-0" value="history">{copy.tabs.history}</TabsTrigger>
          <TabsTrigger className="col-span-2 min-w-0 px-2 text-xs sm:col-span-1 sm:text-sm lg:min-w-0" value="progress">{copy.tabs.progress}</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-5">
          <TrainingTodaySection
            copy={copy}
            activeSession={activeSession}
            scheduledWorkout={scheduledWorkout}
            schedule={schedule}
            workouts={workouts}
            activeProgress={activeProgress}
            finishNotes={finishNotes}
            noteDrafts={noteDrafts}
            renderPlaceholder={renderPlaceholder}
            formatDateTime={formatDateTime}
            formatRest={formatRest}
            formatExerciseName={formatExerciseName}
            getSetDraft={getSetDraft}
            getExerciseDraftCount={getExerciseDraftCount}
            onFinishNotesChange={setFinishNotes}
            onNoteDraftsChange={setNoteDrafts}
            onDraftsChange={setDrafts}
            onStartWorkout={(workoutId) => startSessionMutation.mutate(workoutId)}
            onFinishSession={(payload) => finishSessionMutation.mutate(payload)}
            onSaveExerciseNote={(payload) => saveSessionNoteMutation.mutate(payload)}
            onSaveSet={saveSet}
            onDeleteSet={(payload) => deleteSetMutation.mutate(payload)}
            onSaveScheduleDay={(payload) => saveScheduleMutation.mutate(payload)}
            isStartPending={startSessionMutation.isPending}
            isFinishPending={finishSessionMutation.isPending}
            isSaveSessionNotePending={saveSessionNoteMutation.isPending}
            isSaveSetPending={saveSetMutation.isPending}
            isDeleteSetPending={deleteSetMutation.isPending}
            isSaveSchedulePending={saveScheduleMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="routines" className="space-y-5">
          <TrainingRoutinesSection
            copy={copy}
            workouts={workouts}
            templates={templates}
            hasActiveSession={Boolean(activeSession)}
            isStartPending={startSessionMutation.isPending}
            isSavePending={saveWorkoutMutation.isPending}
            isDeletePending={deleteWorkoutMutation.isPending}
            isDuplicatePending={duplicateTemplateMutation.isPending}
            renderPlaceholder={renderPlaceholder}
            getWorkoutPreviewText={getWorkoutPreviewText}
            localizeText={localizeText}
            onCreateRoutine={openCreateRoutine}
            onStartWorkout={(workoutId) => startSessionMutation.mutate(workoutId)}
            onEditWorkout={openEditRoutine}
            onDeleteWorkout={setDeleteWorkoutId}
            onDuplicateTemplate={(templateId) => duplicateTemplateMutation.mutate(templateId)}
          />
        </TabsContent>

        <TabsContent value="library" className="space-y-5">
          <TrainingLibrarySection
            copy={copy}
            filters={filters}
            exerciseLibrary={exerciseLibrary}
            formatExerciseName={formatExerciseName}
            onOpenCustomExercise={() => setCustomExerciseOpen(true)}
            onFiltersChange={setFilters}
            onSelectExercise={setSelectedExerciseId}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-5">
          <TrainingHistorySection
            copy={copy}
            history={history}
            renderPlaceholder={renderPlaceholder}
            formatDateTime={formatDateTime}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-5">
          <TrainingProgressSection
            copy={copy}
            selectedExerciseId={selectedExerciseId}
            exerciseLibrary={exerciseLibrary}
            prs={exercisePrs}
            progress={exerciseProgress}
            history={exerciseHistory}
            prLabelMap={prLabelMap}
            formatDateTime={formatDateTime}
            formatExerciseName={formatExerciseName}
            onSelectExercise={setSelectedExerciseId}
          />
        </TabsContent>
      </Tabs>

      <TrainingWorkoutDialog
        copy={copy}
        open={workoutDialogOpen}
        editingWorkoutId={editingWorkoutId}
        workoutName={workoutName}
        workoutDescription={workoutDescription}
        exercisePickerId={exercisePickerId}
        exerciseLibrary={exerciseLibrary}
        workoutExercises={workoutExercises}
        isPending={saveWorkoutMutation.isPending}
        formatExerciseName={formatExerciseName}
        onOpenChange={setWorkoutDialogOpen}
        onWorkoutNameChange={setWorkoutName}
        onWorkoutDescriptionChange={setWorkoutDescription}
        onExercisePickerChange={setExercisePickerId}
        onWorkoutExercisesChange={setWorkoutExercises}
        onSave={saveWorkoutFromDraft}
      />

      <TrainingCustomExerciseDialog
        copy={copy}
        open={customExerciseOpen}
        form={customExerciseForm}
        isPending={saveCustomExerciseMutation.isPending}
        onOpenChange={setCustomExerciseOpen}
        onFormChange={setCustomExerciseForm}
        onSave={() => saveCustomExerciseMutation.mutate(customExerciseForm)}
      />

      <TrainingDeleteWorkoutDialog
        copy={copy}
        workoutId={deleteWorkoutId}
        onOpenChange={(open) => !open && setDeleteWorkoutId(null)}
        onConfirm={(workoutId) => deleteWorkoutMutation.mutate(workoutId)}
      />
    </div>
  );
};

export default Training;
