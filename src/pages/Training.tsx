import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, CirclePlus, Copy, PlayCircle, TimerReset, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DAY_LABELS, DIFFICULTY_LABELS, EQUIPMENT_LABELS, MOVEMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/features/training/catalog";
import { createClientId } from "@/lib/id";
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

type WorkoutExerciseDraft = SaveWorkoutInput["exercises"][number] & { clientId: string; exercise?: ExerciseRecord };
type SetDraft = { weight: string; reps: string; rir: string; notes: string; completed: boolean };
const MAX_ROUTINE_PREVIEW_EXERCISES = 4;
const TRAINING_TABS = ["today", "routines", "library", "history", "progress"] as const;
type TrainingTab = (typeof TRAINING_TABS)[number];

const defaultExerciseForm: SaveExerciseInput = {
  name: "",
  muscle_group: "chest",
  secondary_muscles: [],
  equipment: "dumbbell",
  movement_type: "push",
  difficulty: "beginner",
  instructions: "",
  video_url: "",
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "--";
  return new Date(value).toLocaleString("es-PE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatRest = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

const prLabelMap = { max_weight: "Max weight", estimated_1rm: "1RM estimado", max_volume: "Max volumen" } as const;
const draftStorageKey = (sessionId: string) => `appfit_training_drafts:${sessionId}`;
const notesStorageKey = (sessionId: string) => `appfit_training_notes:${sessionId}`;
const parseStoredJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const TRAINING_COPY = {
  en: {
    title: "Training Logbook",
    subtitle: "Routines, library, weekly plan, active session, history and progress.",
    today: "Today",
    rest: "Rest",
    activeSession: "Active session",
    noWorkout: "No workout",
    tabs: { today: "Today's workout", routines: "Routines", library: "Library", history: "History", progress: "Progress" },
    startWorkout: "Start workout",
    startedAt: "Started",
    cancel: "Cancel",
    finish: "Finish",
    sessionNotes: "Session notes",
    completedSets: "completed sets",
    week: "Week",
    weekDescription: "Assign a routine, rest day or leave the day empty.",
    todayBadge: "Today",
    unassigned: "Unassigned",
    quickStart: "Quick start",
    quickStartDescription: "Start any routine even if it is not scheduled for today.",
    firstCreateRoutine: "Create a routine first.",
    personalRoutines: "Personal routines",
    personalRoutinesDescription: "Create, edit and delete training blocks.",
    newRoutine: "New",
    noRoutines: "You do not have routines yet.",
    noDescription: "No description",
    routineExercises: "Exercises",
    noRoutineExercises: "No exercises",
    moreExercisesSuffix: "more",
    start: "Start",
    edit: "Edit",
    delete: "Delete",
    templates: "Templates",
    templatesDescription: "Duplicate bases like Push, Pull or Legs.",
    duplicateTemplate: "Duplicate template",
    exerciseLibrary: "Exercise library",
    exerciseLibraryDescription: "Global base plus custom exercises.",
    customExercise: "Custom exercise",
    searchExercise: "Search exercise...",
    allGroups: "All muscle groups",
    allEquipment: "All equipment",
    allPatterns: "All patterns",
    customBadge: "Custom",
    baseBadge: "Base",
    historyTitle: "History",
    historyDescription: "Finished sessions with volume and status.",
    noHistory: "No finished sessions yet.",
    progressTitle: "Exercise progress",
    progressDescription: "Strength curve, volume and PRs.",
    selectExercise: "Select exercise",
    noProgress: "No historical data yet.",
    exerciseHistoryTitle: "Exercise history",
    exerciseHistoryDescription: "Sets, peak load and volume by date.",
    noWorkoutScheduled: "No workout scheduled today.",
    routineSaved: "Routine saved.",
    routineDeleted: "Routine deleted.",
    templateDuplicated: "Template duplicated.",
    exerciseSaved: "Custom exercise saved.",
    sessionStarted: "Session started.",
    sessionClosed: "Session closed.",
    prsDetected: "PRs detected.",
    scheduleSaved: "Week plan saved.",
    setSaved: "Set saved.",
    noteSaved: "Exercise note saved.",
    loading: "Loading training...",
    failedLoad: "Training could not be loaded.",
    deleteRoutineTitle: "Delete routine",
    deleteRoutineDescription: "This will remove the routine and its exercise block. Scheduled days will be left unassigned.",
    deleteRoutineConfirm: "Delete routine",
    activeExerciseCard: "Exercise block",
    target: "Target",
    restLabel: "Rest",
    previousPerformance: "Last performance",
    noPreviousPerformance: "No previous completed session yet.",
    exerciseNote: "Exercise note",
    saveNote: "Save note",
    setLabel: "Set",
    weight: "Weight",
    reps: "Reps",
    rir: "RIR",
    notes: "Notes",
    saveDraft: "Save",
    markDone: "Complete",
    markUndone: "Mark pending",
    removeSet: "Remove",
    addSet: "Add extra set",
    targetSets: "Target sets",
    targetReps: "Target reps",
    addExercise: "Add exercise",
    saveRoutine: "Save routine",
    createRoutine: "Create routine",
    editRoutine: "Edit routine",
    saveExercise: "Save exercise",
    createCustomExercise: "Create custom exercise",
  },
  es: {
    title: "Training Logbook",
    subtitle: "Rutinas, biblioteca, agenda semanal, sesion activa, historial y progreso.",
    today: "Hoy",
    rest: "Descanso",
    activeSession: "Sesion activa",
    noWorkout: "Sin entrenamiento",
    tabs: { today: "Entrenamiento de hoy", routines: "Rutinas", library: "Biblioteca", history: "Historial", progress: "Progreso" },
    startWorkout: "Iniciar entrenamiento",
    startedAt: "Iniciada",
    cancel: "Cancelar",
    finish: "Finalizar",
    sessionNotes: "Notas generales de la sesion",
    completedSets: "series completadas",
    week: "Semana",
    weekDescription: "Asigna rutina, descanso o deja el dia vacio.",
    todayBadge: "Hoy",
    unassigned: "Sin asignar",
    quickStart: "Inicio rapido",
    quickStartDescription: "Inicia cualquier rutina aunque no este programada hoy.",
    firstCreateRoutine: "Primero crea una rutina.",
    personalRoutines: "Rutinas personales",
    personalRoutinesDescription: "Crea, edita y elimina bloques de entrenamiento.",
    newRoutine: "Nueva",
    noRoutines: "Aun no tienes rutinas.",
    noDescription: "Sin descripcion",
    routineExercises: "Ejercicios",
    noRoutineExercises: "Sin ejercicios",
    moreExercisesSuffix: "mas",
    start: "Iniciar",
    edit: "Editar",
    delete: "Eliminar",
    templates: "Plantillas",
    templatesDescription: "Duplica bases como Push, Pull o Legs.",
    duplicateTemplate: "Duplicar plantilla",
    exerciseLibrary: "Biblioteca de ejercicios",
    exerciseLibraryDescription: "Base global mas ejercicios personalizados.",
    customExercise: "Ejercicio custom",
    searchExercise: "Buscar ejercicio...",
    allGroups: "Todos los grupos",
    allEquipment: "Todo el equipo",
    allPatterns: "Todo el patron",
    customBadge: "Custom",
    baseBadge: "Base",
    historyTitle: "Historial",
    historyDescription: "Sesiones finalizadas con volumen y estado.",
    noHistory: "Aun no hay sesiones finalizadas.",
    progressTitle: "Progreso por ejercicio",
    progressDescription: "Curva de fuerza, volumen y PRs.",
    selectExercise: "Selecciona ejercicio",
    noProgress: "Sin datos historicos todavia.",
    exerciseHistoryTitle: "Historial por ejercicio",
    exerciseHistoryDescription: "Detalle de sets, carga maxima y volumen por fecha.",
    noWorkoutScheduled: "No hay entrenamiento programado hoy.",
    routineSaved: "Rutina guardada.",
    routineDeleted: "Rutina eliminada.",
    templateDuplicated: "Plantilla duplicada.",
    exerciseSaved: "Ejercicio personalizado guardado.",
    sessionStarted: "Sesion iniciada.",
    sessionClosed: "Sesion cerrada.",
    prsDetected: "PRs detectados.",
    scheduleSaved: "Agenda semanal guardada.",
    setSaved: "Serie guardada.",
    noteSaved: "Nota del ejercicio guardada.",
    loading: "Cargando entrenamiento...",
    failedLoad: "No se pudo cargar entrenamiento.",
    deleteRoutineTitle: "Eliminar rutina",
    deleteRoutineDescription: "Se eliminara la rutina y su bloque de ejercicios. Los dias programados quedaran sin asignar.",
    deleteRoutineConfirm: "Eliminar rutina",
    activeExerciseCard: "Bloque de ejercicio",
    target: "Objetivo",
    restLabel: "Descanso",
    previousPerformance: "Ultimo rendimiento",
    noPreviousPerformance: "Todavia no hay una sesion completada previa.",
    exerciseNote: "Nota del ejercicio",
    saveNote: "Guardar nota",
    setLabel: "Serie",
    weight: "Peso",
    reps: "Reps",
    rir: "RIR",
    notes: "Notas",
    saveDraft: "Guardar",
    markDone: "Completar",
    markUndone: "Marcar pendiente",
    removeSet: "Quitar",
    addSet: "Agregar serie extra",
    targetSets: "Series objetivo",
    targetReps: "Reps objetivo",
    addExercise: "Agregar ejercicio",
    saveRoutine: "Guardar rutina",
    createRoutine: "Crear rutina",
    editRoutine: "Editar rutina",
    saveExercise: "Guardar ejercicio",
    createCustomExercise: "Crear ejercicio personalizado",
  },
} as const;

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
          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>{copy.tabs.today}</CardTitle>
                <CardDescription>La sesion activa tiene prioridad sobre todo lo demas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeSession && scheduledWorkout ? (
                    <div className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-xl font-bold md:text-2xl">{scheduledWorkout.name}</div>
                          <div className="text-sm text-muted-foreground">{scheduledWorkout.description || "Rutina programada para hoy."}</div>
                        </div>
                        <Button className="w-full sm:w-auto" onClick={() => startSessionMutation.mutate(scheduledWorkout.id)} disabled={startSessionMutation.isPending}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          {copy.startWorkout}
                        </Button>
                    </div>
                  </div>
                ) : null}

                {activeSession ? (
                  <div className="space-y-4">
                      <div className="rounded-2xl border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-bold md:text-xl">{activeSession.workout.name}</div>
                            <div className="text-sm text-muted-foreground">{copy.startedAt} {formatDateTime(activeSession.started_at)}</div>
                          </div>
                          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <Button className="w-full sm:w-auto" variant="outline" disabled={finishSessionMutation.isPending} onClick={() => finishSessionMutation.mutate({ sessionId: activeSession.id, status: "cancelled" })}>
                              <XCircle className="mr-2 h-4 w-4" />
                              {copy.cancel}
                            </Button>
                            <Button className="w-full sm:w-auto" disabled={finishSessionMutation.isPending} onClick={() => finishSessionMutation.mutate({ sessionId: activeSession.id, status: "completed" })}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {copy.finish}
                            </Button>
                        </div>
                      </div>
                      <Progress value={activeProgress.percent} className="mt-4 h-3" />
                      <div className="mt-2 text-sm text-muted-foreground">{activeProgress.completed}/{activeProgress.target} {copy.completedSets}</div>
                      <Textarea className="mt-4" placeholder={copy.sessionNotes} value={finishNotes} onChange={(event) => setFinishNotes(event.target.value)} />
                    </div>

                    {activeSession.exercises.map((exercise) => {
                      const draftRows = getExerciseDraftCount(activeSession.id, exercise.exercise_id);
                      const totalRows = Math.max(exercise.target_sets, exercise.sets.length, draftRows);
                      const noteKey = `${activeSession.id}:${exercise.exercise_id}`;
                      const localizedExerciseName = formatExerciseName(exercise.exercise);

                      return (
                        <div key={exercise.id} className="rounded-2xl border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-semibold">{localizedExerciseName}</div>
                              <div className="text-sm text-muted-foreground">
                                {copy.target}: {exercise.target_sets} {copy.targetSets.toLowerCase()} | {copy.targetReps}: {exercise.target_reps} | {copy.restLabel}: {formatRest(exercise.rest_seconds)}
                              </div>
                            </div>
                            <Badge variant="outline">{MUSCLE_GROUP_LABELS[exercise.exercise.muscle_group]}</Badge>
                          </div>

                          <div className="mt-4 rounded-xl bg-muted/35 p-3 text-sm">
                            <div className="font-medium">{copy.previousPerformance}</div>
                            {exercise.lastPerformance ? (
                              <div className="mt-1 text-muted-foreground">
                                {formatDateTime(exercise.lastPerformance.performed_at)} | {Math.round(exercise.lastPerformance.max_weight)} kg | {Math.round(exercise.lastPerformance.total_volume)} kg
                              </div>
                            ) : (
                              <div className="mt-1 text-muted-foreground">{copy.noPreviousPerformance}</div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <Textarea
                              className="min-h-24"
                              value={noteDrafts[noteKey] ?? ""}
                              placeholder={copy.exerciseNote}
                              onChange={(event) => setNoteDrafts((current) => ({ ...current, [noteKey]: event.target.value }))}
                            />
                            <Button
                              className="w-full shrink-0 sm:w-auto"
                              variant="outline"
                              disabled={saveSessionNoteMutation.isPending}
                              onClick={() => saveSessionNoteMutation.mutate({ sessionId: activeSession.id, exerciseId: exercise.exercise_id, notes: noteDrafts[noteKey] || null })}
                            >
                              {copy.saveNote}
                            </Button>
                          </div>

                          <div className="mt-4 space-y-3">
                            {Array.from({ length: totalRows }, (_, index) => {
                              const setNumber = index + 1;
                              const key = `${activeSession.id}:${exercise.exercise_id}:${setNumber}`;
                              const draft = getSetDraft(activeSession.id, exercise.exercise_id, setNumber);
                              const existingSet = exercise.sets.find((set) => set.set_number === setNumber);
                              return (
                                <div key={key} className="rounded-xl border p-3">
                                  <div className="mb-3 flex items-center justify-between">
                                    <div className="font-medium">{copy.setLabel} {setNumber}</div>
                                    <Badge variant={draft.completed || existingSet?.completed ? "default" : "secondary"}>
                                      {draft.completed || existingSet?.completed ? copy.markDone : copy.markUndone}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <Input
                                      aria-label={`${copy.weight} ${setNumber}`}
                                      value={draft.weight}
                                      onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, weight: event.target.value } }))}
                                      placeholder={copy.weight}
                                    />
                                    <Input
                                      aria-label={`${copy.reps} ${setNumber}`}
                                      value={draft.reps}
                                      onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reps: event.target.value } }))}
                                      placeholder={copy.reps}
                                    />
                                    <Input
                                      aria-label={`${copy.rir} ${setNumber}`}
                                      value={draft.rir}
                                      onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, rir: event.target.value } }))}
                                      placeholder={copy.rir}
                                    />
                                    <Input
                                      aria-label={`${copy.notes} ${setNumber}`}
                                      className="col-span-2 md:col-span-1"
                                      value={draft.notes}
                                      onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, notes: event.target.value } }))}
                                      placeholder={copy.notes}
                                    />
                                  </div>
                                  <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                                    <Button className="w-full sm:w-auto" variant="outline" disabled={saveSetMutation.isPending} onClick={() => saveSet(activeSession.id, exercise.exercise_id, setNumber, 0, false)}>
                                      {copy.saveDraft}
                                    </Button>
                                    <Button className="w-full sm:w-auto" disabled={saveSetMutation.isPending} onClick={() => saveSet(activeSession.id, exercise.exercise_id, setNumber, exercise.rest_seconds, true)}>
                                      {copy.markDone}
                                    </Button>
                                    {(existingSet || setNumber > exercise.target_sets) ? (
                                      <Button
                                        variant="ghost"
                                        className="w-full text-destructive hover:text-destructive sm:w-auto"
                                        disabled={deleteSetMutation.isPending}
                                        onClick={() => deleteSetMutation.mutate({ sessionId: activeSession.id, exerciseId: exercise.exercise_id, setNumber })}
                                      >
                                        {copy.removeSet}
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() =>
                              setDrafts((current) => ({
                                ...current,
                                [`${activeSession.id}:${exercise.exercise_id}:${totalRows + 1}`]: { weight: "0", reps: "0", rir: "", notes: "", completed: false },
                              }))
                            }
                          >
                            <TimerReset className="mr-2 h-4 w-4" />
                            {copy.addSet}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {!activeSession && !scheduledWorkout ? renderPlaceholder(copy.noWorkoutScheduled) : null}
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>{copy.week}</CardTitle>
                  <CardDescription>{copy.weekDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schedule.map((day) => (
                    <div key={day.day_of_week} className="grid gap-2 rounded-2xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{DAY_LABELS[day.day_of_week]}</span>
                        {day.day_of_week === new Date().getDay() ? <Badge variant="secondary">{copy.todayBadge}</Badge> : null}
                      </div>
                      <Select
                        value={day.is_rest_day ? "rest" : day.workout_id ?? "none"}
                        disabled={saveScheduleMutation.isPending}
                        onValueChange={(value) =>
                          saveScheduleMutation.mutate({
                            dayOfWeek: day.day_of_week,
                            workoutId: value === "none" || value === "rest" ? null : value,
                            isRestDay: value === "rest",
                          })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{copy.unassigned}</SelectItem>
                          <SelectItem value="rest">{copy.rest}</SelectItem>
                          {workouts.map((workout) => <SelectItem key={workout.id} value={workout.id}>{workout.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{copy.quickStart}</CardTitle>
                  <CardDescription>{copy.quickStartDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workouts.length === 0 ? renderPlaceholder(copy.firstCreateRoutine) : null}
                  {workouts.map((workout) => (
                    <div key={workout.id} className="flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>{workout.name}</span>
                      <Button className="w-full sm:w-auto" variant="outline" onClick={() => startSessionMutation.mutate(workout.id)} disabled={Boolean(activeSession) || startSessionMutation.isPending}>{copy.start}</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="routines" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{copy.personalRoutines}</CardTitle>
                  <CardDescription>{copy.personalRoutinesDescription}</CardDescription>
                </div>
                <Button className="w-full sm:w-auto" onClick={() => { setEditingWorkoutId(null); setWorkoutDialogOpen(true); }}>
                  <CirclePlus className="mr-2 h-4 w-4" />
                  {copy.newRoutine}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {workouts.length === 0 ? renderPlaceholder(copy.noRoutines) : null}
                {workouts.map((workout) => (
                  <div key={workout.id} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{workout.name}</div>
                        <div className="text-sm text-muted-foreground">{workout.description || copy.noDescription}</div>
                        <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">{copy.routineExercises}</div>
                          {getWorkoutPreviewText(workout.id)}
                        </div>
                      </div>
                      <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                        <Button className="w-full sm:w-auto" variant="outline" onClick={() => startSessionMutation.mutate(workout.id)} disabled={Boolean(activeSession) || startSessionMutation.isPending}><PlayCircle className="mr-2 h-4 w-4" />{copy.start}</Button>
                        <Button className="w-full sm:w-auto" variant="outline" onClick={() => { setEditingWorkoutId(workout.id); setWorkoutDialogOpen(true); }} disabled={saveWorkoutMutation.isPending}>{copy.edit}</Button>
                        <Button className="w-full text-destructive hover:text-destructive sm:w-auto" variant="ghost" onClick={() => setDeleteWorkoutId(workout.id)} disabled={deleteWorkoutMutation.isPending}><Trash2 className="mr-2 h-4 w-4" />{copy.delete}</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{copy.templates}</CardTitle>
                  <CardDescription>{copy.templatesDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{getLocalizedText(template.name_i18n, language, template.name)}</div>
                          <div className="text-sm text-muted-foreground">{getLocalizedText(template.description_i18n, language, template.description)}</div>
                        </div>
                        <Badge>{template.focus_tags.join(" / ")}</Badge>
                      </div>
                    <Button className="mt-4 w-full" variant="outline" disabled={duplicateTemplateMutation.isPending} onClick={() => duplicateTemplateMutation.mutate(template.id)}><Copy className="mr-2 h-4 w-4" />{copy.duplicateTemplate}</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-5">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{copy.exerciseLibrary}</CardTitle>
                <CardDescription>{copy.exerciseLibraryDescription}</CardDescription>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setCustomExerciseOpen(true)}><CirclePlus className="mr-2 h-4 w-4" />{copy.customExercise}</Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input placeholder={copy.searchExercise} value={filters.search ?? ""} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
                <Select value={filters.muscleGroup ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, muscleGroup: value as ExerciseFilterInput["muscleGroup"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.allGroups}</SelectItem>
                    {Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.equipment ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, equipment: value as ExerciseFilterInput["equipment"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.allEquipment}</SelectItem>
                    {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.movementType ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, movementType: value as ExerciseFilterInput["movementType"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.allPatterns}</SelectItem>
                    {Object.entries(MOVEMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {exerciseLibrary.map((exercise) => (
                  <button key={exercise.id} type="button" className="rounded-2xl border p-4 text-left hover:border-cyan-400/40 hover:bg-cyan-400/5" onClick={() => setSelectedExerciseId(exercise.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{formatExerciseName(exercise)}</div>
                        <div className="text-xs text-muted-foreground">{MUSCLE_GROUP_LABELS[exercise.muscle_group]} | {EQUIPMENT_LABELS[exercise.equipment]}</div>
                      </div>
                      {exercise.is_custom ? <Badge variant="secondary">{copy.customBadge}</Badge> : <Badge variant="outline">{copy.baseBadge}</Badge>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{MOVEMENT_LABELS[exercise.movement_type]}</Badge>
                      <Badge variant="outline">{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>{copy.historyTitle}</CardTitle>
                <CardDescription>{copy.historyDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(historyQuery.data ?? []).length === 0 ? renderPlaceholder(copy.noHistory) : null}
              {(historyQuery.data ?? []).map((session) => (
                <div key={session.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold">{session.workout_name}</div>
                      <div className="text-sm text-muted-foreground">{formatDateTime(session.started_at)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={session.status === "completed" ? "default" : "secondary"}>{session.status}</Badge>
                      <Badge variant="outline">{Math.round(session.total_volume)} kg</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-cyan-500" />{copy.progressTitle}</CardTitle>
                <CardDescription>{copy.progressDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedExerciseId ?? ""} onValueChange={setSelectedExerciseId}>
                  <SelectTrigger><SelectValue placeholder={copy.selectExercise} /></SelectTrigger>
                  <SelectContent>{exerciseLibrary.map((exercise) => <SelectItem key={exercise.id} value={exercise.id}>{formatExerciseName(exercise)}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {(exercisePrsQuery.data ?? []).map((pr) => (
                    <div key={pr.id} className="rounded-2xl border p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{prLabelMap[pr.pr_type]}</div>
                      <div className="mt-2 text-xl font-black md:text-2xl">{pr.value_num}</div>
                    </div>
                  ))}
                </div>
                <div className="h-60 rounded-2xl border p-4 md:h-72">
                  {(exerciseProgressQuery.data ?? []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">{copy.noProgress}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={exerciseProgressQuery.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date_key" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="max_weight" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="estimated_1rm" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="total_volume" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{copy.exerciseHistoryTitle}</CardTitle>
                <CardDescription>{copy.exerciseHistoryDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[420px] pr-3 md:h-[640px]">
                  <div className="space-y-3">
                    {(exerciseHistoryQuery.data ?? []).map((entry) => (
                      <div key={entry.session_id} className="rounded-2xl border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="font-semibold">{entry.workout_name}</div>
                            <div className="text-sm text-muted-foreground">{formatDateTime(entry.started_at)}</div>
                          </div>
                          <Badge variant="outline">{Math.round(entry.total_volume)} kg</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          {entry.sets.map((set) => (
                            <div key={set.id} className="flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                              <span>Set {set.set_number}</span>
                              <span>{set.weight} kg x {set.reps} reps</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={workoutDialogOpen} onOpenChange={setWorkoutDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingWorkoutId ? copy.editRoutine : copy.createRoutine}</DialogTitle>
            <DialogDescription>
              Define el nombre, la descripcion y los ejercicios que formaran parte de la rutina.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.2fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={workoutName} onChange={(event) => setWorkoutName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea value={workoutDescription} onChange={(event) => setWorkoutDescription(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{copy.addExercise}</Label>
                <Select value={exercisePickerId} onValueChange={setExercisePickerId}>
                  <SelectTrigger><SelectValue placeholder={copy.selectExercise} /></SelectTrigger>
                  <SelectContent>{exerciseLibrary.map((exercise) => <SelectItem key={exercise.id} value={exercise.id}>{formatExerciseName(exercise)}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  const exercise = exerciseLibrary.find((row) => row.id === exercisePickerId);
                  if (!exercise) return;
                  setWorkoutExercises((current) => [...current, { clientId: createClientId(), exercise_id: exercise.id, order_index: current.length, target_sets: 3, target_reps: "8-10", rest_seconds: 90, notes: "", exercise }]);
                  setExercisePickerId("");
                }} disabled={!exercisePickerId}>
                  <CirclePlus className="mr-2 h-4 w-4" />
                  {copy.addExercise}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {workoutExercises.map((exercise, index) => (
                <div key={exercise.clientId} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{index + 1}. {exercise.exercise ? formatExerciseName(exercise.exercise) : exercise.exercise_id}</div>
                      <div className="text-xs text-muted-foreground">{exercise.exercise ? MUSCLE_GROUP_LABELS[exercise.exercise.muscle_group] : "Ejercicio"}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setWorkoutExercises((current) => current.filter((row) => row.clientId !== exercise.clientId))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Repeticiones</Label>
                      <Input
                        aria-label={copy.targetReps}
                        placeholder="8-10"
                        value={exercise.target_reps}
                        onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, target_reps: event.target.value } : row))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Series</Label>
                      <Input
                        aria-label={copy.targetSets}
                        placeholder="3"
                        value={String(exercise.target_sets)}
                        onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, target_sets: Math.max(1, toNumber(event.target.value)) } : row))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Descanso (s)</Label>
                      <Input
                        aria-label="Descanso en segundos"
                        placeholder="90"
                        value={String(exercise.rest_seconds)}
                        onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, rest_seconds: Math.max(0, toNumber(event.target.value)) } : row))}
                      />
                    </div>
                  </div>
                  <Textarea className="mt-3" value={exercise.notes ?? ""} onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, notes: event.target.value } : row))} placeholder="Nota fija del ejercicio" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setWorkoutDialogOpen(false)}>{copy.cancel}</Button>
            <Button className="w-full sm:w-auto" onClick={() => saveWorkoutMutation.mutate({
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
            })} disabled={saveWorkoutMutation.isPending}>{copy.saveRoutine}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customExerciseOpen} onOpenChange={setCustomExerciseOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{copy.createCustomExercise}</DialogTitle>
            <DialogDescription>
              Guarda un ejercicio personalizado para reutilizarlo en la biblioteca y en tus rutinas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nombre</Label>
              <Input value={customExerciseForm.name} onChange={(event) => setCustomExerciseForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Grupo muscular</Label>
              <Select value={customExerciseForm.muscle_group} onValueChange={(value) => setCustomExerciseForm((current) => ({ ...current, muscle_group: value as SaveExerciseInput["muscle_group"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipamiento</Label>
              <Select value={customExerciseForm.equipment} onValueChange={(value) => setCustomExerciseForm((current) => ({ ...current, equipment: value as SaveExerciseInput["equipment"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(EQUIPMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de movimiento</Label>
              <Select value={customExerciseForm.movement_type} onValueChange={(value) => setCustomExerciseForm((current) => ({ ...current, movement_type: value as SaveExerciseInput["movement_type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MOVEMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dificultad</Label>
              <Select value={customExerciseForm.difficulty} onValueChange={(value) => setCustomExerciseForm((current) => ({ ...current, difficulty: value as SaveExerciseInput["difficulty"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Musculos secundarios (coma separada)</Label>
              <Input value={customExerciseForm.secondary_muscles.join(", ")} onChange={(event) => setCustomExerciseForm((current) => ({ ...current, secondary_muscles: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instrucciones</Label>
              <Textarea value={customExerciseForm.instructions ?? ""} onChange={(event) => setCustomExerciseForm((current) => ({ ...current, instructions: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Video URL</Label>
              <Input value={customExerciseForm.video_url ?? ""} onChange={(event) => setCustomExerciseForm((current) => ({ ...current, video_url: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setCustomExerciseOpen(false)}>{copy.cancel}</Button>
            <Button className="w-full sm:w-auto" onClick={() => saveCustomExerciseMutation.mutate(customExerciseForm)} disabled={saveCustomExerciseMutation.isPending}>{copy.saveExercise}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteWorkoutId)} onOpenChange={(open) => !open && setDeleteWorkoutId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteRoutineTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteRoutineDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteWorkoutId && deleteWorkoutMutation.mutate(deleteWorkoutId)}>
              {copy.deleteRoutineConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Training;
