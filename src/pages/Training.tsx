import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrainingCustomExerciseDialog } from "@/pages/training/components/TrainingCustomExerciseDialog";
import { TrainingDeleteWorkoutDialog } from "@/pages/training/components/TrainingDeleteWorkoutDialog";
import { TrainingHistorySection } from "@/pages/training/components/TrainingHistorySection";
import { TrainingLibrarySection } from "@/pages/training/components/TrainingLibrarySection";
import { TrainingProgressSection } from "@/pages/training/components/TrainingProgressSection";
import { TrainingRoutinesSection } from "@/pages/training/components/TrainingRoutinesSection";
import { TrainingTodaySection } from "@/pages/training/components/TrainingTodaySection";
import { TrainingWorkoutDialog, type WorkoutExerciseDraft } from "@/pages/training/components/TrainingWorkoutDialog";
import {
  defaultExerciseForm,
  draftStorageKey,
  formatDateTime,
  formatRest,
  MAX_ROUTINE_PREVIEW_EXERCISES,
  notesStorageKey,
  parseStoredJson,
  prLabelMap,
  toNumber,
  TRAINING_COPY,
  TRAINING_TABS,
  type TrainingTab,
} from "@/pages/training/trainingConstants";
import {
  deleteExerciseSet,
  deleteWorkout,
  duplicateTemplateToWorkout,
  finishWorkoutSession,
  getLocalizedText,
  getTrainingErrorMessage,
  getExerciseHistory,
  getExerciseProgress,
  getExercisePrs,
  getTrainingTodaySummary,
  getWorkoutDetail,
  listExercises,
  listWorkoutHistory,
  listWorkoutSchedule,
  listWorkouts,
  listWorkoutTemplates,
  saveCustomExercise,
  saveWorkout,
  saveWorkoutScheduleDay,
  startWorkoutSession,
  upsertExerciseSet,
  upsertSessionExerciseNote,
} from "@/services/training";
import type { ExerciseFilterInput, ExerciseRecord, SaveExerciseInput, SaveWorkoutInput, WorkoutDetail } from "@/types/training";

type SetDraft = { weight: string; reps: string; rir: string; notes: string; completed: boolean };

const Training = () => {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const { language } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = user?.id ?? null;
  const options = useMemo(() => ({ isGuest, language }), [isGuest, language]);
  const copy = TRAINING_COPY[language];
  const searchTab = searchParams.get("tab");
  const initialTab = TRAINING_TABS.includes((searchTab ?? "") as TrainingTab) ? (searchTab as TrainingTab) : "today";

  const [tab, setTab] = useState<TrainingTab>(initialTab);
  const [filters, setFilters] = useState<ExerciseFilterInput>({ search: "", muscleGroup: "all", equipment: "all", movementType: "all" });
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [customExerciseOpen, setCustomExerciseOpen] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExerciseDraft[]>([]);
  const [exercisePickerId, setExercisePickerId] = useState("");
  const [customExerciseForm, setCustomExerciseForm] = useState<SaveExerciseInput>(defaultExerciseForm);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [finishNotes, setFinishNotes] = useState("");
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [deleteWorkoutId, setDeleteWorkoutId] = useState<string | null>(null);

  const invalidateTraining = async () => queryClient.invalidateQueries({ queryKey: ["training"] });

  const workoutsQuery = useQuery({ queryKey: ["training", "workouts", userId, isGuest], queryFn: () => listWorkouts(userId, options), enabled: Boolean(userId) || isGuest });
  const templatesQuery = useQuery({ queryKey: ["training", "templates", isGuest], queryFn: () => listWorkoutTemplates(options), enabled: Boolean(userId) || isGuest });
  const scheduleQuery = useQuery({ queryKey: ["training", "schedule", userId, isGuest], queryFn: () => listWorkoutSchedule(userId, options), enabled: Boolean(userId) || isGuest });
  const todayQuery = useQuery({ queryKey: ["training", "today", userId, isGuest], queryFn: () => getTrainingTodaySummary(userId, new Date(), options), enabled: Boolean(userId) || isGuest });
  const exercisesQuery = useQuery({ queryKey: ["training", "exercises", userId, isGuest, filters], queryFn: () => listExercises(userId, filters, options), enabled: Boolean(userId) || isGuest });
  const historyQuery = useQuery({ queryKey: ["training", "history", userId, isGuest], queryFn: () => listWorkoutHistory(userId, options), enabled: Boolean(userId) || isGuest });
  const editingWorkoutQuery = useQuery({ queryKey: ["training", "workout-detail", userId, editingWorkoutId, isGuest], queryFn: () => getWorkoutDetail(userId, editingWorkoutId!, options), enabled: Boolean(editingWorkoutId) && workoutDialogOpen });
  const exerciseHistoryQuery = useQuery({ queryKey: ["training", "exercise-history", userId, selectedExerciseId, isGuest], queryFn: () => getExerciseHistory(userId, selectedExerciseId!, options), enabled: Boolean(selectedExerciseId) && (Boolean(userId) || isGuest) });
  const exerciseProgressQuery = useQuery({ queryKey: ["training", "exercise-progress", userId, selectedExerciseId, isGuest], queryFn: () => getExerciseProgress(userId, selectedExerciseId!, options), enabled: Boolean(selectedExerciseId) && (Boolean(userId) || isGuest) });
  const exercisePrsQuery = useQuery({ queryKey: ["training", "exercise-prs", userId, selectedExerciseId, isGuest], queryFn: () => getExercisePrs(userId, selectedExerciseId!, options), enabled: Boolean(selectedExerciseId) && (Boolean(userId) || isGuest) });

  const workouts = workoutsQuery.data ?? [];
  const workoutDetailsQuery = useQuery({
    queryKey: ["training", "workout-previews", userId, isGuest, workouts.map((workout) => workout.id).join(",")],
    queryFn: async () => {
      const details = await Promise.all(workouts.map((workout) => getWorkoutDetail(userId, workout.id, options)));
      return details.filter((detail): detail is WorkoutDetail => Boolean(detail));
    },
    enabled: (Boolean(userId) || isGuest) && workouts.length > 0,
  });
  const templates = templatesQuery.data ?? [];
  const schedule = scheduleQuery.data ?? [];
  const today = todayQuery.data;
  const activeSession = today?.activeSession ?? null;
  const scheduledWorkout = today?.scheduledWorkout ?? null;
  const exerciseLibrary = exercisesQuery.data ?? [];
  const trainingQueries = [workoutsQuery, templatesQuery, scheduleQuery, todayQuery, exercisesQuery, historyQuery];
  const isTrainingLoading = trainingQueries.some((query) => query.isLoading);
  const trainingError = trainingQueries.find((query) => query.error)?.error ?? null;
  const formatExerciseName = (exercise: ExerciseRecord) => getLocalizedText(exercise.name_i18n, language, exercise.name);
  const workoutDetailsMap = useMemo(() => new Map((workoutDetailsQuery.data ?? []).map((detail) => [detail.id, detail])), [workoutDetailsQuery.data]);
  const getWorkoutPreviewText = (workoutId: string) => {
    const exercises = workoutDetailsMap.get(workoutId)?.exercises ?? [];
    if (exercises.length === 0) return copy.noRoutineExercises;
    const names = exercises.slice(0, MAX_ROUTINE_PREVIEW_EXERCISES).map((row) => formatExerciseName(row.exercise));
    return exercises.length > MAX_ROUTINE_PREVIEW_EXERCISES ? `${names.join(" | ")} +${exercises.length - MAX_ROUTINE_PREVIEW_EXERCISES} ${copy.moreExercisesSuffix}` : names.join(" | ");
  };

  useEffect(() => {
    const nextTab = TRAINING_TABS.includes((searchTab ?? "") as TrainingTab) ? (searchTab as TrainingTab) : "today";
    if (nextTab !== tab) setTab(nextTab);
  }, [searchTab, tab]);

  const handleTabChange = (nextTab: string) => {
    if (!TRAINING_TABS.includes(nextTab as TrainingTab)) return;
    setTab(nextTab as TrainingTab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", nextTab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (!selectedExerciseId && exerciseLibrary[0]?.id) setSelectedExerciseId(exerciseLibrary[0].id);
  }, [exerciseLibrary, selectedExerciseId]);

  useEffect(() => {
    if (!workoutDialogOpen) return;
    if (!editingWorkoutId) {
      setWorkoutName("");
      setWorkoutDescription("");
      setWorkoutExercises([]);
      return;
    }
    const detail = editingWorkoutQuery.data;
    if (!detail) return;
    setWorkoutName(detail.name);
    setWorkoutDescription(detail.description ?? "");
    setWorkoutExercises(detail.exercises.map((row, index) => ({
      clientId: `${row.id}-${index}`,
      exercise_id: row.exercise_id,
      order_index: row.order_index,
      target_sets: row.target_sets,
      target_reps: row.target_reps,
      rest_seconds: row.rest_seconds,
      notes: row.notes ?? "",
      exercise: row.exercise,
    })));
  }, [editingWorkoutId, editingWorkoutQuery.data, workoutDialogOpen]);

  useEffect(() => {
    if (!activeSession) return;
    setDrafts((current) => {
      const persisted = parseStoredJson<Record<string, SetDraft>>(sessionStorage.getItem(draftStorageKey(activeSession.id)), {});
      const next = { ...current };
      activeSession.exercises.forEach((exercise) => {
        const totalRows = Math.max(exercise.target_sets, exercise.sets.length);
        for (let setNumber = 1; setNumber <= totalRows; setNumber += 1) {
          const key = `${activeSession.id}:${exercise.exercise_id}:${setNumber}`;
          if (next[key]) continue;
          const existing = exercise.sets.find((set) => set.set_number === setNumber);
          const fallback = exercise.lastPerformance?.sets.find((set) => set.set_number === setNumber);
          next[key] = {
            weight: persisted[key]?.weight ?? String(existing?.weight ?? fallback?.weight ?? 0),
            reps: persisted[key]?.reps ?? String(existing?.reps ?? fallback?.reps ?? 0),
            rir:
              persisted[key]?.rir ??
              (existing?.rir !== null && existing?.rir !== undefined
                ? String(existing.rir)
                : fallback?.rir !== null && fallback?.rir !== undefined
                ? String(fallback.rir)
                : ""),
            notes: persisted[key]?.notes ?? existing?.notes ?? "",
            completed: persisted[key]?.completed ?? existing?.completed ?? false,
          };
        }
      });
      return next;
    });
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    const persisted = parseStoredJson<Record<string, string>>(sessionStorage.getItem(notesStorageKey(activeSession.id)), {});
    setNoteDrafts((current) => {
      const next = { ...current };
      activeSession.exercises.forEach((exercise) => {
        const key = `${activeSession.id}:${exercise.exercise_id}`;
        next[key] = persisted[key] ?? exercise.sessionNote?.notes ?? "";
      });
      return next;
    });
    setFinishNotes(sessionStorage.getItem(`${notesStorageKey(activeSession.id)}:session`) ?? "");
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    sessionStorage.setItem(draftStorageKey(activeSession.id), JSON.stringify(drafts));
  }, [activeSession, drafts]);

  useEffect(() => {
    if (!activeSession) return;
    sessionStorage.setItem(notesStorageKey(activeSession.id), JSON.stringify(noteDrafts));
    sessionStorage.setItem(`${notesStorageKey(activeSession.id)}:session`, finishNotes);
  }, [activeSession, finishNotes, noteDrafts]);

  useEffect(() => {
    if (!restEndsAt) return;
    const interval = window.setInterval(() => {
      if (Date.now() >= restEndsAt) {
        setRestEndsAt(null);
        window.clearInterval(interval);
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [restEndsAt]);

  const handleMutationError = (error: unknown) => toast.error(getTrainingErrorMessage(error));
  const saveWorkoutMutation = useMutation({
    mutationFn: (payload: SaveWorkoutInput) => saveWorkout(userId, payload, options),
    onSuccess: async () => {
      setWorkoutDialogOpen(false);
      setEditingWorkoutId(null);
      toast.success(copy.routineSaved);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const deleteWorkoutMutation = useMutation({
    mutationFn: (workoutId: string) => deleteWorkout(userId, workoutId, options),
    onSuccess: async () => {
      setDeleteWorkoutId(null);
      toast.success(copy.routineDeleted);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const duplicateTemplateMutation = useMutation({
    mutationFn: (templateId: string) => duplicateTemplateToWorkout(userId, templateId, options),
    onSuccess: async () => {
      toast.success(copy.templateDuplicated);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const saveScheduleMutation = useMutation({
    mutationFn: ({ dayOfWeek, workoutId, isRestDay }: { dayOfWeek: number; workoutId: string | null; isRestDay: boolean }) =>
      saveWorkoutScheduleDay(userId, dayOfWeek, workoutId, isRestDay, options),
    onSuccess: async () => {
      toast.success(copy.scheduleSaved);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const saveCustomExerciseMutation = useMutation({
    mutationFn: (payload: SaveExerciseInput) => saveCustomExercise(userId, payload, options),
    onSuccess: async (exercise) => {
      setSelectedExerciseId(exercise.id);
      setCustomExerciseOpen(false);
      setCustomExerciseForm(defaultExerciseForm);
      toast.success(copy.exerciseSaved);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const startSessionMutation = useMutation({
    mutationFn: (workoutId: string) => startWorkoutSession(userId, workoutId, options),
    onSuccess: async () => {
      setTab("today");
      toast.success(copy.sessionStarted);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const saveSetMutation = useMutation({
    mutationFn: (payload: Parameters<typeof upsertExerciseSet>[1]) => upsertExerciseSet(userId, payload, options),
    onSuccess: invalidateTraining,
    onError: handleMutationError,
  });
  const deleteSetMutation = useMutation({
    mutationFn: ({ sessionId, exerciseId, setNumber }: { sessionId: string; exerciseId: string; setNumber: number }) =>
      deleteExerciseSet(userId, sessionId, exerciseId, setNumber, options),
    onSuccess: async (_, variables) => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[`${variables.sessionId}:${variables.exerciseId}:${variables.setNumber}`];
        return next;
      });
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const saveSessionNoteMutation = useMutation({
    mutationFn: ({ sessionId, exerciseId, notes }: { sessionId: string; exerciseId: string; notes: string | null }) =>
      upsertSessionExerciseNote(userId, sessionId, exerciseId, notes, options),
    onSuccess: async () => {
      toast.success(copy.noteSaved);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });
  const finishSessionMutation = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: "completed" | "cancelled" }) =>
      finishWorkoutSession(userId, sessionId, { notes: finishNotes || null, status }, options),
    onSuccess: async ({ prs, session }) => {
      setFinishNotes("");
      setRestEndsAt(null);
      setDrafts({});
      setNoteDrafts({});
      sessionStorage.removeItem(draftStorageKey(session.id));
      sessionStorage.removeItem(notesStorageKey(session.id));
      sessionStorage.removeItem(`${notesStorageKey(session.id)}:session`);
      toast.success(prs.length > 0 ? `${copy.sessionClosed} ${prs.length} ${copy.prsDetected}.` : copy.sessionClosed);
      await invalidateTraining();
    },
    onError: handleMutationError,
  });

  const activeProgress = useMemo(() => {
    if (!activeSession) return { completed: 0, target: 0, percent: 0 };
    const completed = activeSession.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0);
    const target = activeSession.exercises.reduce((sum, exercise) => sum + exercise.target_sets, 0);
    return { completed, target, percent: target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0 };
  }, [activeSession]);

  const saveSet = async (sessionId: string, exerciseId: string, setNumber: number, restSeconds: number, complete: boolean) => {
    const key = `${sessionId}:${exerciseId}:${setNumber}`;
    const draft = drafts[key];
    if (!draft) return;
    await saveSetMutation.mutateAsync({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: setNumber,
      weight: toNumber(draft.weight),
      reps: toNumber(draft.reps),
      rir: draft.rir ? toNumber(draft.rir) : null,
      notes: draft.notes || null,
      completed: complete,
    });
    setDrafts((current) => ({ ...current, [key]: { ...draft, completed: complete } }));
    if (complete && restSeconds > 0) setRestEndsAt(Date.now() + restSeconds * 1000);
    toast.success(copy.setSaved);
  };

  const getSetDraft = (sessionId: string, exerciseId: string, setNumber: number) =>
    drafts[`${sessionId}:${exerciseId}:${setNumber}`] ?? { weight: "0", reps: "0", rir: "", notes: "", completed: false };

  const getExerciseDraftCount = (sessionId: string, exerciseId: string) =>
    Object.keys(drafts)
      .filter((key) => key.startsWith(`${sessionId}:${exerciseId}:`))
      .map((key) => Number(key.split(":").at(-1) ?? "0"))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);

  const restRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)) : 0;

  const renderPlaceholder = (message: string) => <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{message}</div>;

  return (
    <div className="space-y-6 py-4">
      <Card className="app-surface-hero overflow-hidden border-border/60">
        <CardContent className="grid gap-6 px-6 py-8 xl:min-h-[10.5rem] xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-center">
          <div className="flex min-h-full flex-col justify-center space-y-3">
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{copy.title}</h1>
            <p className="app-surface-muted mt-2 max-w-2xl text-sm">{copy.subtitle}</p>
          </div>
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
      {trainingError ? <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{copy.failedLoad}: {getTrainingErrorMessage(trainingError)}</div> : null}

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
            localizeText={(value, fallback) => getLocalizedText(value, language, fallback ?? "")}
            onCreateRoutine={() => { setEditingWorkoutId(null); setWorkoutDialogOpen(true); }}
            onStartWorkout={(workoutId) => startSessionMutation.mutate(workoutId)}
            onEditWorkout={(workoutId) => { setEditingWorkoutId(workoutId); setWorkoutDialogOpen(true); }}
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
            history={historyQuery.data ?? []}
            renderPlaceholder={renderPlaceholder}
            formatDateTime={formatDateTime}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-5">
          <TrainingProgressSection
            copy={copy}
            selectedExerciseId={selectedExerciseId}
            exerciseLibrary={exerciseLibrary}
            prs={exercisePrsQuery.data ?? []}
            progress={exerciseProgressQuery.data ?? []}
            history={exerciseHistoryQuery.data ?? []}
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
        onSave={() => saveWorkoutMutation.mutate({
          id: editingWorkoutId ?? undefined,
          name: workoutName,
          description: workoutDescription || null,
          exercises: workoutExercises.map((row, index) => ({
            exercise_id: row.exercise_id,
            order_index: index,
            target_sets: row.target_sets,
            target_reps: row.target_reps,
            rest_seconds: row.rest_seconds,
            notes: row.notes || null,
          })),
        })}
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
