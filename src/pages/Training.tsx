import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, CirclePlus, Copy, PlayCircle, TimerReset, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DAY_LABELS, DIFFICULTY_LABELS, EQUIPMENT_LABELS, MOVEMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/features/training/catalog";
import {
  deleteExerciseSet,
  deleteWorkout,
  duplicateTemplateToWorkout,
  finishWorkoutSession,
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
import type { ExerciseFilterInput, ExerciseRecord, SaveExerciseInput, SaveWorkoutInput } from "@/types/training";

type WorkoutExerciseDraft = SaveWorkoutInput["exercises"][number] & { clientId: string; exercise?: ExerciseRecord };
type SetDraft = { weight: string; reps: string; rir: string; notes: string; completed: boolean };

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

const Training = () => {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const userId = user?.id ?? null;
  const options = useMemo(() => ({ isGuest }), [isGuest]);

  const [tab, setTab] = useState("today");
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
  const templates = templatesQuery.data ?? [];
  const schedule = scheduleQuery.data ?? [];
  const today = todayQuery.data;
  const activeSession = today?.activeSession ?? null;
  const scheduledWorkout = today?.scheduledWorkout ?? null;
  const exerciseLibrary = exercisesQuery.data ?? [];

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
      const next = { ...current };
      activeSession.exercises.forEach((exercise) => {
        const totalRows = Math.max(exercise.target_sets, exercise.sets.length);
        for (let setNumber = 1; setNumber <= totalRows; setNumber += 1) {
          const key = `${activeSession.id}:${exercise.exercise_id}:${setNumber}`;
          if (next[key]) continue;
          const existing = exercise.sets.find((set) => set.set_number === setNumber);
          const fallback = exercise.lastPerformance?.sets.find((set) => set.set_number === setNumber);
          next[key] = {
            weight: String(existing?.weight ?? fallback?.weight ?? 0),
            reps: String(existing?.reps ?? fallback?.reps ?? 0),
            rir: existing?.rir !== null && existing?.rir !== undefined ? String(existing.rir) : fallback?.rir !== null && fallback?.rir !== undefined ? String(fallback.rir) : "",
            notes: existing?.notes ?? "",
            completed: existing?.completed ?? false,
          };
        }
      });
      return next;
    });
  }, [activeSession]);

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

  const saveWorkoutMutation = useMutation({ mutationFn: (payload: SaveWorkoutInput) => saveWorkout(userId, payload, options), onSuccess: async () => { setWorkoutDialogOpen(false); setEditingWorkoutId(null); toast.success("Rutina guardada."); await invalidateTraining(); } });
  const deleteWorkoutMutation = useMutation({ mutationFn: (workoutId: string) => deleteWorkout(userId, workoutId, options), onSuccess: invalidateTraining });
  const duplicateTemplateMutation = useMutation({ mutationFn: (templateId: string) => duplicateTemplateToWorkout(userId, templateId, options), onSuccess: async () => { toast.success("Plantilla duplicada."); await invalidateTraining(); } });
  const saveScheduleMutation = useMutation({ mutationFn: ({ dayOfWeek, workoutId, isRestDay }: { dayOfWeek: number; workoutId: string | null; isRestDay: boolean }) => saveWorkoutScheduleDay(userId, dayOfWeek, workoutId, isRestDay, options), onSuccess: invalidateTraining });
  const saveCustomExerciseMutation = useMutation({ mutationFn: (payload: SaveExerciseInput) => saveCustomExercise(userId, payload, options), onSuccess: async (exercise) => { setSelectedExerciseId(exercise.id); setCustomExerciseOpen(false); setCustomExerciseForm(defaultExerciseForm); toast.success("Ejercicio personalizado guardado."); await invalidateTraining(); } });
  const startSessionMutation = useMutation({ mutationFn: (workoutId: string) => startWorkoutSession(userId, workoutId, options), onSuccess: async () => { setTab("today"); toast.success("Sesion iniciada."); await invalidateTraining(); } });
  const saveSetMutation = useMutation({ mutationFn: (payload: Parameters<typeof upsertExerciseSet>[1]) => upsertExerciseSet(userId, payload, options), onSuccess: invalidateTraining });
  const deleteSetMutation = useMutation({ mutationFn: ({ sessionId, exerciseId, setNumber }: { sessionId: string; exerciseId: string; setNumber: number }) => deleteExerciseSet(userId, sessionId, exerciseId, setNumber, options), onSuccess: invalidateTraining });
  const saveSessionNoteMutation = useMutation({ mutationFn: ({ sessionId, exerciseId, notes }: { sessionId: string; exerciseId: string; notes: string | null }) => upsertSessionExerciseNote(userId, sessionId, exerciseId, notes, options), onSuccess: invalidateTraining });
  const finishSessionMutation = useMutation({ mutationFn: ({ sessionId, status }: { sessionId: string; status: "completed" | "cancelled" }) => finishWorkoutSession(userId, sessionId, { notes: finishNotes || null, status }, options), onSuccess: async ({ prs }) => { setFinishNotes(""); setRestEndsAt(null); toast.success(prs.length > 0 ? `Sesion cerrada. ${prs.length} PRs detectados.` : "Sesion cerrada."); await invalidateTraining(); } });

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
  };

  const restRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)) : 0;

  const renderPlaceholder = (message: string) => <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{message}</div>;

  return (
    <div className="space-y-6 py-4">
      <Card className="overflow-hidden border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_42%),linear-gradient(135deg,rgba(15,23,42,1),rgba(15,23,42,0.88))] text-slate-100">
        <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Training Logbook</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Rutinas, biblioteca, agenda semanal, sesion activa, historial y progreso.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Hoy</div>
              <div className="mt-2 text-lg font-semibold text-white">{activeSession ? "Sesion activa" : scheduledWorkout?.name ?? "Sin entrenamiento"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Descanso</div>
              <div className="mt-2 text-lg font-semibold text-white">{restRemaining}s</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-2 lg:grid-cols-5">
          <TabsTrigger value="today">Entrenamiento de hoy</TabsTrigger>
          <TabsTrigger value="routines">Rutinas</TabsTrigger>
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="progress">Progreso</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Entrenamiento de hoy</CardTitle>
                <CardDescription>La sesion activa tiene prioridad sobre todo lo demas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeSession && scheduledWorkout ? (
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-2xl font-bold">{scheduledWorkout.name}</div>
                        <div className="text-sm text-muted-foreground">{scheduledWorkout.description || "Rutina programada para hoy."}</div>
                      </div>
                      <Button onClick={() => startSessionMutation.mutate(scheduledWorkout.id)} disabled={startSessionMutation.isPending}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start workout
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activeSession ? (
                  <>
                    <div className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xl font-bold">{activeSession.workout.name}</div>
                          <div className="text-sm text-muted-foreground">Iniciada {formatDateTime(activeSession.started_at)}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => finishSessionMutation.mutate({ sessionId: activeSession.id, status: "cancelled" })}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
                          <Button onClick={() => finishSessionMutation.mutate({ sessionId: activeSession.id, status: "completed" })}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Finalizar
                          </Button>
                        </div>
                      </div>
                      <Progress value={activeProgress.percent} className="mt-4 h-3" />
                      <div className="mt-2 text-sm text-muted-foreground">{activeProgress.completed}/{activeProgress.target} series completadas</div>
                      <Textarea className="mt-4" placeholder="Notas generales de la sesion" value={finishNotes} onChange={(event) => setFinishNotes(event.target.value)} />
                    </div>
                  </>
                ) : null}

                {!activeSession && !scheduledWorkout ? renderPlaceholder("No hay entrenamiento programado hoy.") : null}
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Semana</CardTitle>
                  <CardDescription>Asigna rutina, descanso o deja el dia vacio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schedule.map((day) => (
                    <div key={day.day_of_week} className="grid gap-2 rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{DAY_LABELS[day.day_of_week]}</span>
                        {day.day_of_week === new Date().getDay() ? <Badge variant="secondary">Hoy</Badge> : null}
                      </div>
                      <Select
                        value={day.is_rest_day ? "rest" : day.workout_id ?? "none"}
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
                          <SelectItem value="none">Sin asignar</SelectItem>
                          <SelectItem value="rest">Descanso</SelectItem>
                          {workouts.map((workout) => <SelectItem key={workout.id} value={workout.id}>{workout.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inicio rapido</CardTitle>
                  <CardDescription>Inicia cualquier rutina aunque no este programada hoy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workouts.length === 0 ? renderPlaceholder("Primero crea una rutina.") : null}
                  {workouts.map((workout) => (
                    <div key={workout.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                      <span>{workout.name}</span>
                      <Button variant="outline" onClick={() => startSessionMutation.mutate(workout.id)} disabled={Boolean(activeSession)}>Start</Button>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Rutinas personales</CardTitle>
                  <CardDescription>Crea, edita y elimina bloques de entrenamiento.</CardDescription>
                </div>
                <Button onClick={() => { setEditingWorkoutId(null); setWorkoutDialogOpen(true); }}>
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Nueva
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {workouts.length === 0 ? renderPlaceholder("Aun no tienes rutinas.") : null}
                {workouts.map((workout) => (
                  <div key={workout.id} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{workout.name}</div>
                        <div className="text-sm text-muted-foreground">{workout.description || "Sin descripcion"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => startSessionMutation.mutate(workout.id)} disabled={Boolean(activeSession)}><PlayCircle className="mr-2 h-4 w-4" />Iniciar</Button>
                        <Button variant="outline" onClick={() => { setEditingWorkoutId(workout.id); setWorkoutDialogOpen(true); }}>Editar</Button>
                        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteWorkoutMutation.mutate(workout.id)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plantillas</CardTitle>
                <CardDescription>Duplica bases como Push, Pull o Legs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      </div>
                      <Badge>{template.focus_tags.join(" / ")}</Badge>
                    </div>
                    <Button className="mt-4 w-full" variant="outline" onClick={() => duplicateTemplateMutation.mutate(template.id)}><Copy className="mr-2 h-4 w-4" />Duplicar plantilla</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Biblioteca de ejercicios</CardTitle>
                <CardDescription>Base global mas ejercicios personalizados.</CardDescription>
              </div>
              <Button onClick={() => setCustomExerciseOpen(true)}><CirclePlus className="mr-2 h-4 w-4" />Ejercicio custom</Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-4">
                <Input placeholder="Buscar ejercicio..." value={filters.search ?? ""} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
                <Select value={filters.muscleGroup ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, muscleGroup: value as ExerciseFilterInput["muscleGroup"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.equipment ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, equipment: value as ExerciseFilterInput["equipment"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el equipo</SelectItem>
                    {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.movementType ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, movementType: value as ExerciseFilterInput["movementType"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el patron</SelectItem>
                    {Object.entries(MOVEMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {exerciseLibrary.map((exercise) => (
                  <button key={exercise.id} type="button" className="rounded-2xl border p-4 text-left hover:border-cyan-400/40 hover:bg-cyan-400/5" onClick={() => setSelectedExerciseId(exercise.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{exercise.name}</div>
                        <div className="text-xs text-muted-foreground">{MUSCLE_GROUP_LABELS[exercise.muscle_group]} | {EQUIPMENT_LABELS[exercise.equipment]}</div>
                      </div>
                      {exercise.is_custom ? <Badge variant="secondary">Custom</Badge> : <Badge variant="outline">Base</Badge>}
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
              <CardTitle>Historial</CardTitle>
              <CardDescription>Sesiones finalizadas con volumen y estado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(historyQuery.data ?? []).length === 0 ? renderPlaceholder("Aun no hay sesiones finalizadas.") : null}
              {(historyQuery.data ?? []).map((session) => (
                <div key={session.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{session.workout_name}</div>
                      <div className="text-sm text-muted-foreground">{formatDateTime(session.started_at)}</div>
                    </div>
                    <div className="flex gap-2">
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
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-cyan-500" />Progreso por ejercicio</CardTitle>
                <CardDescription>Curva de fuerza, volumen y PRs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedExerciseId ?? ""} onValueChange={setSelectedExerciseId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona ejercicio" /></SelectTrigger>
                  <SelectContent>{exerciseLibrary.map((exercise) => <SelectItem key={exercise.id} value={exercise.id}>{exercise.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid gap-3 md:grid-cols-3">
                  {(exercisePrsQuery.data ?? []).map((pr) => (
                    <div key={pr.id} className="rounded-2xl border p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{prLabelMap[pr.pr_type]}</div>
                      <div className="mt-2 text-2xl font-black">{pr.value_num}</div>
                    </div>
                  ))}
                </div>
                <div className="h-72 rounded-2xl border p-4">
                  {(exerciseProgressQuery.data ?? []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sin datos historicos todavia.</div>
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
                <CardTitle>Historial por ejercicio</CardTitle>
                <CardDescription>Detalle de sets, carga maxima y volumen por fecha.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[640px] pr-3">
                  <div className="space-y-3">
                    {(exerciseHistoryQuery.data ?? []).map((entry) => (
                      <div key={entry.session_id} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{entry.workout_name}</div>
                            <div className="text-sm text-muted-foreground">{formatDateTime(entry.started_at)}</div>
                          </div>
                          <Badge variant="outline">{Math.round(entry.total_volume)} kg</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          {entry.sets.map((set) => (
                            <div key={set.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
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
            <DialogTitle>{editingWorkoutId ? "Editar rutina" : "Crear rutina"}</DialogTitle>
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
                <Label>Agregar ejercicio</Label>
                <Select value={exercisePickerId} onValueChange={setExercisePickerId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona ejercicio" /></SelectTrigger>
                  <SelectContent>{exerciseLibrary.map((exercise) => <SelectItem key={exercise.id} value={exercise.id}>{exercise.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  const exercise = exerciseLibrary.find((row) => row.id === exercisePickerId);
                  if (!exercise) return;
                  setWorkoutExercises((current) => [...current, { clientId: crypto.randomUUID(), exercise_id: exercise.id, order_index: current.length, target_sets: 3, target_reps: "8-10", rest_seconds: 90, notes: "", exercise }]);
                  setExercisePickerId("");
                }} disabled={!exercisePickerId}>
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {workoutExercises.map((exercise, index) => (
                <div key={exercise.clientId} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{index + 1}. {exercise.exercise?.name || exercise.exercise_id}</div>
                      <div className="text-xs text-muted-foreground">{exercise.exercise ? MUSCLE_GROUP_LABELS[exercise.exercise.muscle_group] : "Ejercicio"}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setWorkoutExercises((current) => current.filter((row) => row.clientId !== exercise.clientId))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Input value={String(exercise.target_sets)} onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, target_sets: Math.max(1, toNumber(event.target.value)) } : row))} />
                    <Input value={exercise.target_reps} onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, target_reps: event.target.value } : row))} />
                    <Input value={String(exercise.rest_seconds)} onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, rest_seconds: Math.max(0, toNumber(event.target.value)) } : row))} />
                  </div>
                  <Textarea className="mt-3" value={exercise.notes ?? ""} onChange={(event) => setWorkoutExercises((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, notes: event.target.value } : row))} placeholder="Nota fija del ejercicio" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkoutDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveWorkoutMutation.mutate({
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
            })} disabled={saveWorkoutMutation.isPending}>Guardar rutina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customExerciseOpen} onOpenChange={setCustomExerciseOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crear ejercicio personalizado</DialogTitle>
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
            <Button variant="outline" onClick={() => setCustomExerciseOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveCustomExerciseMutation.mutate(customExerciseForm)} disabled={saveCustomExerciseMutation.isPending}>Guardar ejercicio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Training;
