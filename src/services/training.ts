import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { DAY_LABELS, DEFAULT_EXERCISE_SEEDS, DEFAULT_TEMPLATE_SEEDS } from "@/features/training/catalog";
import { supabase } from "@/services/supabaseClient";
import type {
  ActiveWorkoutExercise,
  ExerciseHistoryEntry,
  ExercisePrRecord,
  ExerciseProgressPoint,
  ExerciseFilterInput,
  ExerciseRecord,
  ExerciseSetRecord,
  LastExercisePerformance,
  LocalizedText,
  SaveExerciseInput,
  SaveWorkoutInput,
  SessionExerciseNoteRecord,
  TrainingTodaySummary,
  UpsertExerciseSetInput,
  WorkoutDetail,
  WorkoutExerciseRecord,
  WorkoutRecord,
  WorkoutScheduleDay,
  WorkoutScheduleRecord,
  WorkoutSessionDetail,
  WorkoutSessionRecord,
  WorkoutTemplateDetail,
} from "@/types/training";

type TrainingOptions = {
  isGuest?: boolean;
  timeZone?: string;
  language?: "en" | "es";
};

type GuestTrainingState = {
  customExercises: ExerciseRecord[];
  workouts: WorkoutRecord[];
  workoutExercises: WorkoutExerciseRecord[];
  schedule: WorkoutScheduleRecord[];
  sessions: WorkoutSessionRecord[];
  sets: ExerciseSetRecord[];
  sessionNotes: SessionExerciseNoteRecord[];
  prs: ExercisePrRecord[];
};

const GUEST_TRAINING_KEY = "appfit_guest_training_state";

const defaultGuestState = (): GuestTrainingState => ({
  customExercises: [],
  workouts: [],
  workoutExercises: [],
  schedule: [],
  sessions: [],
  sets: [],
  sessionNotes: [],
  prs: [],
});

const readGuestState = (): GuestTrainingState => {
  const raw = localStorage.getItem(GUEST_TRAINING_KEY);
  if (!raw) return defaultGuestState();
  try {
    const parsed = JSON.parse(raw) as GuestTrainingState;
    return { ...defaultGuestState(), ...parsed };
  } catch {
    return defaultGuestState();
  }
};

const saveGuestState = (state: GuestTrainingState) => {
  localStorage.setItem(GUEST_TRAINING_KEY, JSON.stringify(state));
};

const isSchemaError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return message.includes("schema cache") || message.includes("does not exist") || message.includes("relation") || message.includes("column");
};

const isRpcMissingError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return message.includes("function") && (message.includes("does not exist") || message.includes("schema cache"));
};

const normalizeLocalizedText = (value: unknown): LocalizedText | null => {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const normalized: LocalizedText = {};
  if (typeof entry.en === "string" && entry.en.trim()) normalized.en = entry.en.trim();
  if (typeof entry.es === "string" && entry.es.trim()) normalized.es = entry.es.trim();
  return Object.keys(normalized).length > 0 ? normalized : null;
};

export const getLocalizedText = (
  value: LocalizedText | null | undefined,
  language: "en" | "es" | undefined,
  fallback: string | null | undefined,
) => {
  const preferred = language ? value?.[language]?.trim() : "";
  if (preferred) return preferred;
  const alternate = language === "es" ? value?.en?.trim() : value?.es?.trim();
  if (alternate) return alternate;
  return fallback?.trim() || "";
};

const MAX_TEXT_LENGTH = 160;
const MAX_NOTES_LENGTH = 1000;
const MAX_INSTRUCTIONS_LENGTH = 4000;

const validateWorkoutExerciseInput = (input: SaveWorkoutInput["exercises"][number], index: number) => {
  if (!input.exercise_id) throw new Error(`El ejercicio ${index + 1} no es valido.`);
  if (!Number.isInteger(input.target_sets) || input.target_sets < 1 || input.target_sets > 20) {
    throw new Error(`Las series objetivo del ejercicio ${index + 1} deben estar entre 1 y 20.`);
  }
  if (!input.target_reps.trim() || input.target_reps.trim().length > 20) {
    throw new Error(`Las repeticiones objetivo del ejercicio ${index + 1} no son validas.`);
  }
  if (!Number.isInteger(input.rest_seconds) || input.rest_seconds < 0 || input.rest_seconds > 1800) {
    throw new Error(`El descanso del ejercicio ${index + 1} debe estar entre 0 y 1800 segundos.`);
  }
  if ((input.notes ?? "").trim().length > MAX_NOTES_LENGTH) {
    throw new Error(`La nota del ejercicio ${index + 1} excede el maximo permitido.`);
  }
};

export const validateWorkoutInput = (input: SaveWorkoutInput) => {
  const name = input.name.trim();
  if (!name) throw new Error("La rutina necesita un nombre.");
  if (name.length > MAX_TEXT_LENGTH) throw new Error("El nombre de la rutina es demasiado largo.");
  if ((input.description ?? "").trim().length > MAX_NOTES_LENGTH) throw new Error("La descripcion de la rutina es demasiado larga.");
  if (input.exercises.length === 0) throw new Error("Agrega al menos un ejercicio.");
  const seen = new Set<string>();
  input.exercises.forEach((exercise, index) => {
    validateWorkoutExerciseInput(exercise, index);
    const duplicateKey = `${exercise.exercise_id}:${exercise.order_index}`;
    if (seen.has(duplicateKey)) throw new Error("La rutina contiene ejercicios duplicados en la misma posicion.");
    seen.add(duplicateKey);
  });
};

export const validateExerciseInput = (input: SaveExerciseInput) => {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre del ejercicio es obligatorio.");
  if (name.length > MAX_TEXT_LENGTH) throw new Error("El nombre del ejercicio es demasiado largo.");
  if ((input.secondary_muscles ?? []).some((item) => item.trim().length > 40)) {
    throw new Error("Uno de los musculos secundarios es demasiado largo.");
  }
  if ((input.instructions ?? "").trim().length > MAX_INSTRUCTIONS_LENGTH) {
    throw new Error("Las instrucciones del ejercicio son demasiado largas.");
  }
  if ((input.video_url ?? "").trim()) {
    try {
      new URL(input.video_url);
    } catch {
      throw new Error("La URL del video no es valida.");
    }
  }
};

export const getTrainingErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  const message = (error as { message?: string } | null)?.message;
  if (message?.trim()) return message.trim();
  return "No se pudo completar la accion de entrenamiento.";
};

const normalizeExercise = (row: any): ExerciseRecord => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  name_i18n: normalizeLocalizedText(row.name_i18n),
  muscle_group: row.muscle_group,
  secondary_muscles: Array.isArray(row.secondary_muscles) ? row.secondary_muscles.map(String) : [],
  equipment: row.equipment,
  movement_type: row.movement_type,
  difficulty: row.difficulty,
  instructions: row.instructions ?? null,
  instructions_i18n: normalizeLocalizedText(row.instructions_i18n),
  video_url: row.video_url ?? null,
  is_custom: Boolean(row.is_custom),
  created_by: row.created_by ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
});

const normalizeWorkout = (row: any): WorkoutRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  name: String(row.name ?? ""),
  description: row.description ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});

const normalizeWorkoutExercise = (row: any): WorkoutExerciseRecord => ({
  id: String(row.id),
  workout_id: String(row.workout_id),
  exercise_id: String(row.exercise_id),
  order_index: Number(row.order_index ?? 0),
  target_sets: Number(row.target_sets ?? 3),
  target_reps: String(row.target_reps ?? "8-10"),
  rest_seconds: Number(row.rest_seconds ?? 90),
  notes: row.notes ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
});

const normalizeWorkoutSchedule = (row: any): WorkoutScheduleRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  day_of_week: Number(row.day_of_week ?? 0),
  workout_id: row.workout_id ?? null,
  is_rest_day: Boolean(row.is_rest_day),
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});

const normalizeWorkoutSession = (row: any): WorkoutSessionRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  workout_id: String(row.workout_id),
  started_at: String(row.started_at ?? new Date().toISOString()),
  ended_at: row.ended_at ?? null,
  status: row.status,
  notes: row.notes ?? null,
  total_volume: Number(row.total_volume ?? 0),
  created_at: String(row.created_at ?? new Date().toISOString()),
});

const normalizeExerciseSet = (row: any): ExerciseSetRecord => ({
  id: String(row.id),
  session_id: String(row.session_id),
  exercise_id: String(row.exercise_id),
  set_number: Number(row.set_number ?? 1),
  weight: Number(row.weight ?? 0),
  reps: Number(row.reps ?? 0),
  rir: row.rir === null || row.rir === undefined ? null : Number(row.rir),
  completed: Boolean(row.completed),
  notes: row.notes ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
});

const normalizeSessionNote = (row: any): SessionExerciseNoteRecord => ({
  id: String(row.id),
  session_id: String(row.session_id),
  exercise_id: String(row.exercise_id),
  notes: row.notes ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});

const normalizeExercisePr = (row: any): ExercisePrRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  exercise_id: String(row.exercise_id),
  pr_type: row.pr_type,
  value_num: Number(row.value_num ?? 0),
  achieved_at: String(row.achieved_at ?? new Date().toISOString()),
  session_id: row.session_id ?? null,
  set_id: row.set_id ?? null,
  metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;
const clampNonNegative = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);
const estimateOneRm = (weight: number, reps: number) => {
  const safeWeight = clampNonNegative(weight);
  const safeReps = Math.max(Number(reps) || 0, 0);
  if (safeWeight === 0 || safeReps === 0) return 0;
  return round1(safeWeight * (1 + safeReps / 30));
};
const computeSetVolume = (set: Pick<ExerciseSetRecord, "weight" | "reps">) => round2(clampNonNegative(set.weight) * Math.max(Number(set.reps) || 0, 0));

const getExerciseSearchText = (row: ExerciseRecord) => [
  row.name,
  row.name_i18n?.en,
  row.name_i18n?.es,
  row.instructions,
  row.instructions_i18n?.en,
  row.instructions_i18n?.es,
]
  .filter((value): value is string => Boolean(value?.trim()))
  .join(" ")
  .toLowerCase();

const applyExerciseFilters = (rows: ExerciseRecord[], filters?: ExerciseFilterInput) => {
  const search = filters?.search?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    if (filters?.muscleGroup && filters.muscleGroup !== "all" && row.muscle_group !== filters.muscleGroup) return false;
    if (filters?.equipment && filters.equipment !== "all" && row.equipment !== filters.equipment) return false;
    if (filters?.movementType && filters.movementType !== "all" && row.movement_type !== filters.movementType) return false;
    if (!search) return true;
    return getExerciseSearchText(row).includes(search);
  });
};

const getGuestExerciseLibrary = (userId: string | null) => {
  const state = readGuestState();
  const custom = state.customExercises.filter((row) => !userId || row.created_by === userId || row.created_by === "guest");
  return [...DEFAULT_EXERCISE_SEEDS, ...custom];
};

const loadExercisesByIds = async (userId: string | null, ids: string[], options?: TrainingOptions): Promise<Map<string, ExerciseRecord>> => {
  if (ids.length === 0) return new Map();
  if (options?.isGuest) {
    return new Map(getGuestExerciseLibrary(userId).filter((row) => ids.includes(row.id)).map((row) => [row.id, row]));
  }
  const { data, error } = await supabase.from("exercises").select("*").in("id", ids);
  if (error) throw error;
  return new Map((data || []).map((row) => {
    const normalized = normalizeExercise(row);
    return [normalized.id, normalized];
  }));
};

const buildWorkoutDetail = (
  workout: WorkoutRecord,
  workoutExercises: WorkoutExerciseRecord[],
  exerciseMap: Map<string, ExerciseRecord>,
): WorkoutDetail => ({
  ...workout,
  exercises: workoutExercises
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      ...row,
      exercise: exerciseMap.get(row.exercise_id)!,
    })),
});

export const listExercises = async (
  userId: string | null,
  filters?: ExerciseFilterInput,
  options?: TrainingOptions,
) => {
  if (options?.isGuest) {
    return applyExerciseFilters(getGuestExerciseLibrary(userId), filters).sort((a, b) => a.name.localeCompare(b.name));
  }

  try {
    let query = supabase.from("exercises").select("*").order("name", { ascending: true });
    if (filters?.muscleGroup && filters.muscleGroup !== "all") query = query.eq("muscle_group", filters.muscleGroup);
    if (filters?.equipment && filters.equipment !== "all") query = query.eq("equipment", filters.equipment);
    if (filters?.movementType && filters.movementType !== "all") query = query.eq("movement_type", filters.movementType);
    query = userId ? query.or(`is_custom.eq.false,created_by.eq.${userId}`) : query.eq("is_custom", false);
    const { data, error } = await query;
    if (error) throw error;
    return applyExerciseFilters((data || []).map(normalizeExercise), filters).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (isSchemaError(error)) {
      return applyExerciseFilters(DEFAULT_EXERCISE_SEEDS, filters).sort((a, b) => a.name.localeCompare(b.name));
    }
    throw error;
  }
};

export const saveCustomExercise = async (
  userId: string | null,
  input: SaveExerciseInput,
  options?: TrainingOptions,
) => {
  validateExerciseInput(input);
  const payload: ExerciseRecord = {
    id: input.id ?? crypto.randomUUID(),
    name: input.name.trim(),
    muscle_group: input.muscle_group,
    secondary_muscles: input.secondary_muscles ?? [],
    equipment: input.equipment,
    movement_type: input.movement_type,
    difficulty: input.difficulty,
    instructions: input.instructions ?? null,
    video_url: input.video_url ?? null,
    is_custom: true,
    created_by: userId ?? "guest",
    created_at: new Date().toISOString(),
  };

  if (options?.isGuest) {
    const state = readGuestState();
    saveGuestState({
      ...state,
      customExercises: [...state.customExercises.filter((row) => row.id !== payload.id), payload],
    });
    return payload;
  }
  if (!userId) throw new Error("No se encontro el usuario.");

  const { data, error } = await supabase
    .from("exercises")
    .upsert({
      id: payload.id,
      name: payload.name,
      muscle_group: payload.muscle_group,
      secondary_muscles: payload.secondary_muscles,
      equipment: payload.equipment,
      movement_type: payload.movement_type,
      difficulty: payload.difficulty,
      instructions: payload.instructions,
      video_url: payload.video_url,
      is_custom: true,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeExercise(data);
};

export const listWorkoutTemplates = async (options?: TrainingOptions): Promise<WorkoutTemplateDetail[]> => {
  if (options?.isGuest) return DEFAULT_TEMPLATE_SEEDS;

  try {
    const [{ data: templatesData, error: templateError }, { data: templateExercisesData, error: templateExercisesError }] = await Promise.all([
      supabase.from("workout_templates").select("*").order("name", { ascending: true }),
      supabase.from("workout_template_exercises").select("*").order("order_index", { ascending: true }),
    ]);
    if (templateError) throw templateError;
    if (templateExercisesError) throw templateExercisesError;

    const exerciseIds = Array.from(new Set((templateExercisesData || []).map((row: any) => String(row.exercise_id))));
    const exerciseMap = await loadExercisesByIds(null, exerciseIds, options);

    return (templatesData || []).map((template: any) => ({
      id: String(template.id),
      name: String(template.name),
      name_i18n: normalizeLocalizedText(template.name_i18n),
      description: template.description ?? null,
      description_i18n: normalizeLocalizedText(template.description_i18n),
      focus_tags: Array.isArray(template.focus_tags) ? template.focus_tags.map(String) : [],
      is_system: Boolean(template.is_system),
      created_at: String(template.created_at ?? new Date().toISOString()),
      exercises: (templateExercisesData || [])
        .filter((row: any) => String(row.template_id) === String(template.id))
        .map((row: any) => ({
          id: String(row.id),
          template_id: String(row.template_id),
          exercise_id: String(row.exercise_id),
          order_index: Number(row.order_index ?? 0),
          target_sets: Number(row.target_sets ?? 3),
          target_reps: String(row.target_reps ?? "8-10"),
          rest_seconds: Number(row.rest_seconds ?? 90),
          notes: row.notes ?? null,
          created_at: String(row.created_at ?? new Date().toISOString()),
          exercise: exerciseMap.get(String(row.exercise_id))!,
        })),
    }));
  } catch (error) {
    if (isSchemaError(error)) return DEFAULT_TEMPLATE_SEEDS;
    throw error;
  }
};

export const listWorkouts = async (userId: string | null, options?: TrainingOptions): Promise<WorkoutRecord[]> => {
  if (options?.isGuest) {
    return readGuestState().workouts.sort((a, b) => a.updated_at.localeCompare(b.updated_at)).reverse();
  }
  if (!userId) return [];
  const { data, error } = await supabase.from("workouts").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeWorkout);
};

export const getWorkoutDetail = async (userId: string | null, workoutId: string, options?: TrainingOptions): Promise<WorkoutDetail | null> => {
  if (options?.isGuest) {
    const state = readGuestState();
    const workout = state.workouts.find((row) => row.id === workoutId) ?? null;
    if (!workout) return null;
    const workoutExercises = state.workoutExercises.filter((row) => row.workout_id === workoutId);
    return buildWorkoutDetail(workout, workoutExercises, new Map(getGuestExerciseLibrary(userId).map((row) => [row.id, row])));
  }
  if (!userId) return null;

  const [{ data: workoutData, error: workoutError }, { data: exerciseRows, error: exerciseError }] = await Promise.all([
    supabase.from("workouts").select("*").eq("user_id", userId).eq("id", workoutId).maybeSingle(),
    supabase.from("workout_exercises").select("*").eq("workout_id", workoutId).order("order_index", { ascending: true }),
  ]);
  if (workoutError) throw workoutError;
  if (exerciseError) throw exerciseError;
  if (!workoutData) return null;
  const normalizedWorkout = normalizeWorkout(workoutData);
  const normalizedExercises = (exerciseRows || []).map(normalizeWorkoutExercise);
  const exerciseMap = await loadExercisesByIds(userId, normalizedExercises.map((row) => row.exercise_id), options);
  return buildWorkoutDetail(normalizedWorkout, normalizedExercises, exerciseMap);
};

export const saveWorkout = async (userId: string | null, input: SaveWorkoutInput, options?: TrainingOptions) => {
  validateWorkoutInput(input);

  if (options?.isGuest) {
    const state = readGuestState();
    const workoutId = input.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const existing = state.workouts.find((row) => row.id === workoutId);
    const workout: WorkoutRecord = {
      id: workoutId,
      user_id: userId ?? "guest",
      name: input.name.trim(),
      description: input.description ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    saveGuestState({
      ...state,
      workouts: [...state.workouts.filter((row) => row.id !== workoutId), workout],
      workoutExercises: [
        ...state.workoutExercises.filter((row) => row.workout_id !== workoutId),
        ...input.exercises.map((row) => ({
          id: crypto.randomUUID(),
          workout_id: workoutId,
          exercise_id: row.exercise_id,
          order_index: row.order_index,
          target_sets: row.target_sets,
          target_reps: row.target_reps,
          rest_seconds: row.rest_seconds,
          notes: row.notes ?? null,
          created_at: now,
        })),
      ],
    });
    return getWorkoutDetail(userId, workoutId, options);
  }
  if (!userId) throw new Error("No se encontro el usuario.");

  const workoutId = input.id ?? crypto.randomUUID();
  try {
    const { data, error } = await supabase.rpc("save_workout_with_exercises", {
      p_user_id: userId,
      p_workout_id: workoutId,
      p_name: input.name.trim(),
      p_description: input.description ?? null,
      p_exercises: input.exercises.map((row, index) => ({
        exercise_id: row.exercise_id,
        order_index: index,
        target_sets: row.target_sets,
        target_reps: row.target_reps.trim(),
        rest_seconds: row.rest_seconds,
        notes: row.notes ?? null,
      })),
    });
    if (error) throw error;
    const savedWorkoutId = typeof data === "string" ? data : workoutId;
    return getWorkoutDetail(userId, savedWorkoutId, options);
  } catch (error) {
    if (!isRpcMissingError(error)) throw error;
  }

  const { error: workoutError } = await supabase.from("workouts").upsert({
    id: workoutId,
    user_id: userId,
    name: input.name.trim(),
    description: input.description ?? null,
    updated_at: new Date().toISOString(),
  });
  if (workoutError) throw workoutError;

  const { error: deleteError } = await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase.from("workout_exercises").insert(
    input.exercises.map((row, index) => ({
      workout_id: workoutId,
      exercise_id: row.exercise_id,
      order_index: index,
      target_sets: row.target_sets,
      target_reps: row.target_reps.trim(),
      rest_seconds: row.rest_seconds,
      notes: row.notes ?? null,
    })),
  );
  if (insertError) throw insertError;

  return getWorkoutDetail(userId, workoutId, options);
};

export const deleteWorkout = async (userId: string | null, workoutId: string, options?: TrainingOptions) => {
  if (options?.isGuest) {
    const state = readGuestState();
    saveGuestState({
      ...state,
      workouts: state.workouts.filter((row) => row.id !== workoutId),
      workoutExercises: state.workoutExercises.filter((row) => row.workout_id !== workoutId),
      schedule: state.schedule.map((row) => (row.workout_id === workoutId ? { ...row, workout_id: null } : row)),
    });
    return;
  }
  if (!userId) return;
  const { error } = await supabase.from("workouts").delete().eq("user_id", userId).eq("id", workoutId);
  if (error) throw error;
};

export const duplicateTemplateToWorkout = async (userId: string | null, templateId: string, options?: TrainingOptions) => {
  const template = (await listWorkoutTemplates(options)).find((row) => row.id === templateId);
  if (!template) throw new Error("No se encontro la plantilla.");
  return saveWorkout(
    userId,
    {
      name: template.name,
      description: template.description,
      exercises: template.exercises.map((row) => ({
        exercise_id: row.exercise_id,
        order_index: row.order_index,
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        rest_seconds: row.rest_seconds,
        notes: row.notes,
      })),
    },
    options,
  );
};

export const listWorkoutSchedule = async (userId: string | null, options?: TrainingOptions): Promise<WorkoutScheduleDay[]> => {
  if (options?.isGuest) {
    const state = readGuestState();
    const workoutMap = new Map(state.workouts.map((row) => [row.id, row]));
    return Array.from({ length: 7 }).map((_, day) => {
      const row = state.schedule.find((entry) => entry.day_of_week === day);
      return row
        ? { ...row, workout: row.workout_id ? workoutMap.get(row.workout_id) ?? null : null }
        : {
            id: `guest-schedule-${day}`,
            user_id: userId ?? "guest",
            day_of_week: day,
            workout_id: null,
            is_rest_day: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            workout: null,
          };
    });
  }
  if (!userId) return [];
  const [scheduleRes, workoutsRes] = await Promise.all([
    supabase.from("workout_schedule").select("*").eq("user_id", userId).order("day_of_week", { ascending: true }),
    supabase.from("workouts").select("*").eq("user_id", userId),
  ]);
  if (scheduleRes.error) throw scheduleRes.error;
  if (workoutsRes.error) throw workoutsRes.error;
  const workoutMap = new Map((workoutsRes.data || []).map((row) => {
    const normalized = normalizeWorkout(row);
    return [normalized.id, normalized];
  }));
  const scheduleRows = (scheduleRes.data || []).map(normalizeWorkoutSchedule);
  return Array.from({ length: 7 }).map((_, day) => {
    const row = scheduleRows.find((entry) => entry.day_of_week === day);
    return row
      ? { ...row, workout: row.workout_id ? workoutMap.get(row.workout_id) ?? null : null }
      : {
          id: `schedule-${day}`,
          user_id: userId ?? "guest",
          day_of_week: day,
          workout_id: null,
          is_rest_day: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          workout: null,
        };
  });
};

export const saveWorkoutScheduleDay = async (
  userId: string | null,
  dayOfWeek: number,
  workoutId: string | null,
  isRestDay = false,
  options?: TrainingOptions,
) => {
  const now = new Date().toISOString();
  if (options?.isGuest) {
    const state = readGuestState();
    const existing = state.schedule.find((row) => row.day_of_week === dayOfWeek);
    const nextRow: WorkoutScheduleRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      user_id: userId ?? "guest",
      day_of_week: dayOfWeek,
      workout_id: workoutId,
      is_rest_day: isRestDay,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    saveGuestState({
      ...state,
      schedule: [...state.schedule.filter((row) => row.day_of_week !== dayOfWeek), nextRow],
    });
    return nextRow;
  }
  if (!userId) throw new Error("No se encontro el usuario.");
  const { data, error } = await supabase
    .from("workout_schedule")
    .upsert(
      {
        user_id: userId,
        day_of_week: dayOfWeek,
        workout_id: workoutId,
        is_rest_day: isRestDay,
        updated_at: now,
      },
      { onConflict: "user_id,day_of_week" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return normalizeWorkoutSchedule(data);
};

const getLastPerformanceMap = async (
  userId: string | null,
  exerciseIds: string[],
  currentSessionId: string | null,
  options?: TrainingOptions,
): Promise<Map<string, LastExercisePerformance>> => {
  if (exerciseIds.length === 0) return new Map();

  let sessions: WorkoutSessionRecord[] = [];
  let sets: ExerciseSetRecord[] = [];

  if (options?.isGuest) {
    const state = readGuestState();
    sessions = state.sessions.filter((row) => row.status === "completed" && row.id !== currentSessionId);
    sets = state.sets.filter((row) => exerciseIds.includes(row.exercise_id) && row.completed);
  } else {
    if (!userId) return new Map();
    const [{ data: sessionData, error: sessionError }, { data: setData, error: setError }] = await Promise.all([
      supabase.from("workout_sessions").select("*").eq("user_id", userId).eq("status", "completed").order("started_at", { ascending: false }),
      supabase.from("exercise_sets").select("*").in("exercise_id", exerciseIds).eq("completed", true),
    ]);
    if (sessionError) throw sessionError;
    if (setError) throw setError;
    sessions = (sessionData || []).map(normalizeWorkoutSession).filter((row) => row.id !== currentSessionId);
    const sessionIds = new Set(sessions.map((row) => row.id));
    sets = (setData || []).map(normalizeExerciseSet).filter((row) => sessionIds.has(row.session_id));
  }

  const sessionMap = new Map(sessions.map((row) => [row.id, row]));
  const byExercise = new Map<string, ExerciseSetRecord[]>();
  sets.forEach((row) => {
    if (!sessionMap.has(row.session_id)) return;
    const current = byExercise.get(row.exercise_id) ?? [];
    current.push(row);
    byExercise.set(row.exercise_id, current);
  });

  const result = new Map<string, LastExercisePerformance>();
  exerciseIds.forEach((exerciseId) => {
    const sorted = (byExercise.get(exerciseId) ?? []).sort((a, b) => {
      const aStarted = sessionMap.get(a.session_id)?.started_at ?? "";
      const bStarted = sessionMap.get(b.session_id)?.started_at ?? "";
      return bStarted.localeCompare(aStarted) || a.set_number - b.set_number;
    });
    const latestSet = sorted[0];
    if (!latestSet) return;
    const latestSessionId = latestSet.session_id;
    const sessionSets = sorted.filter((row) => row.session_id === latestSessionId).sort((a, b) => a.set_number - b.set_number);
    result.set(exerciseId, {
      session_id: latestSessionId,
      performed_at: sessionMap.get(latestSessionId)?.started_at ?? latestSet.created_at,
      max_weight: round2(sessionSets.reduce((max, row) => Math.max(max, row.weight), 0)),
      total_volume: round2(sessionSets.reduce((sum, row) => sum + computeSetVolume(row), 0)),
      sets: sessionSets.map((row) => ({
        set_number: row.set_number,
        weight: row.weight,
        reps: row.reps,
        rir: row.rir,
      })),
    });
  });

  return result;
};

export const getWorkoutSessionDetail = async (
  userId: string | null,
  sessionId: string,
  options?: TrainingOptions,
): Promise<WorkoutSessionDetail | null> => {
  let session: WorkoutSessionRecord | null = null;
  let workout: WorkoutRecord | null = null;
  let workoutExercises: WorkoutExerciseRecord[] = [];
  let sets: ExerciseSetRecord[] = [];
  let sessionNotes: SessionExerciseNoteRecord[] = [];

  if (options?.isGuest) {
    const state = readGuestState();
    session = state.sessions.find((row) => row.id === sessionId) ?? null;
    if (!session) return null;
    workout = state.workouts.find((row) => row.id === session.workout_id) ?? null;
    workoutExercises = state.workoutExercises.filter((row) => row.workout_id === session.workout_id);
    sets = state.sets.filter((row) => row.session_id === sessionId);
    sessionNotes = state.sessionNotes.filter((row) => row.session_id === sessionId);
  } else {
    if (!userId) return null;
    const [{ data: sessionData, error: sessionError }, { data: setData, error: setError }, { data: noteData, error: noteError }] =
      await Promise.all([
        supabase.from("workout_sessions").select("*").eq("user_id", userId).eq("id", sessionId).maybeSingle(),
        supabase.from("exercise_sets").select("*").eq("session_id", sessionId).order("set_number", { ascending: true }),
        supabase.from("session_exercise_notes").select("*").eq("session_id", sessionId),
      ]);
    if (sessionError) throw sessionError;
    if (setError) throw setError;
    if (noteError) throw noteError;
    if (!sessionData) return null;
    session = normalizeWorkoutSession(sessionData);
    const [{ data: workoutData, error: workoutError }, { data: workoutExerciseData, error: workoutExerciseError }] = await Promise.all([
      supabase.from("workouts").select("*").eq("id", session.workout_id).maybeSingle(),
      supabase.from("workout_exercises").select("*").eq("workout_id", session.workout_id).order("order_index", { ascending: true }),
    ]);
    if (workoutError) throw workoutError;
    if (workoutExerciseError) throw workoutExerciseError;
    if (!workoutData) return null;
    workout = normalizeWorkout(workoutData);
    workoutExercises = (workoutExerciseData || []).map(normalizeWorkoutExercise);
    sets = (setData || []).map(normalizeExerciseSet);
    sessionNotes = (noteData || []).map(normalizeSessionNote);
  }

  if (!session || !workout) return null;
  const exerciseMap = await loadExercisesByIds(userId, workoutExercises.map((row) => row.exercise_id), options);
  const lastPerformanceMap = await getLastPerformanceMap(userId, workoutExercises.map((row) => row.exercise_id), session.id, options);
  const exercises: ActiveWorkoutExercise[] = workoutExercises
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      ...row,
      exercise: exerciseMap.get(row.exercise_id)!,
      sets: sets.filter((set) => set.exercise_id === row.exercise_id).sort((a, b) => a.set_number - b.set_number),
      sessionNote: sessionNotes.find((note) => note.exercise_id === row.exercise_id) ?? null,
      lastPerformance: lastPerformanceMap.get(row.exercise_id) ?? null,
    }));

  return {
    ...session,
    workout,
    exercises,
  };
};

export const getActiveWorkoutSession = async (userId: string | null, options?: TrainingOptions) => {
  if (options?.isGuest) {
    const active = readGuestState().sessions.filter((row) => row.status === "active").sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
    return active ? getWorkoutSessionDetail(userId, active.id, options) : null;
  }
  if (!userId) return null;
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return getWorkoutSessionDetail(userId, String(data.id), options);
};

export const startWorkoutSession = async (userId: string | null, workoutId: string, options?: TrainingOptions) => {
  const existing = await getActiveWorkoutSession(userId, options);
  if (existing) return existing;

  if (options?.isGuest) {
    const state = readGuestState();
    const next: WorkoutSessionRecord = {
      id: crypto.randomUUID(),
      user_id: userId ?? "guest",
      workout_id: workoutId,
      started_at: new Date().toISOString(),
      ended_at: null,
      status: "active",
      notes: null,
      total_volume: 0,
      created_at: new Date().toISOString(),
    };
    saveGuestState({ ...state, sessions: [next, ...state.sessions] });
    return getWorkoutSessionDetail(userId, next.id, options);
  }
  if (!userId) throw new Error("No se encontro el usuario.");
  try {
    const { data, error } = await supabase.rpc("start_workout_session_safe", {
      p_user_id: userId,
      p_workout_id: workoutId,
    });
    if (error) throw error;
    const sessionId =
      typeof data === "string"
        ? data
        : data && typeof data === "object" && "id" in data && typeof data.id === "string"
        ? data.id
        : data && typeof data === "object" && "session_id" in data && typeof data.session_id === "string"
        ? data.session_id
        : null;
    if (sessionId) return getWorkoutSessionDetail(userId, sessionId, options);
  } catch (error) {
    if (!isRpcMissingError(error)) throw error;
  }
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      workout_id: workoutId,
      started_at: new Date().toISOString(),
      status: "active",
      total_volume: 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return getWorkoutSessionDetail(userId, String(data.id), options);
};

export const upsertExerciseSet = async (userId: string | null, input: UpsertExerciseSetInput, options?: TrainingOptions) => {
  if (!Number.isInteger(input.set_number) || input.set_number < 1 || input.set_number > 50) {
    throw new Error("El numero de serie no es valido.");
  }
  if ((input.notes ?? "").trim().length > MAX_NOTES_LENGTH) {
    throw new Error("La nota de la serie es demasiado larga.");
  }
  const payload: ExerciseSetRecord = {
    id: crypto.randomUUID(),
    session_id: input.session_id,
    exercise_id: input.exercise_id,
    set_number: input.set_number,
    weight: round2(clampNonNegative(input.weight)),
    reps: Math.max(Number(input.reps) || 0, 0),
    rir: input.rir === null || input.rir === undefined ? null : Number(input.rir),
    completed: Boolean(input.completed),
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  };

  if (options?.isGuest) {
    const state = readGuestState();
    const existing = state.sets.find(
      (row) => row.session_id === input.session_id && row.exercise_id === input.exercise_id && row.set_number === input.set_number,
    );
    const next = [...state.sets.filter(
      (row) => !(row.session_id === input.session_id && row.exercise_id === input.exercise_id && row.set_number === input.set_number),
    ), existing ? { ...existing, ...payload, id: existing.id, created_at: existing.created_at } : payload];
    saveGuestState({ ...state, sets: next });
    return existing ? { ...existing, ...payload, id: existing.id, created_at: existing.created_at } : payload;
  }

  const { data, error } = await supabase
    .from("exercise_sets")
    .upsert(
      {
        session_id: input.session_id,
        exercise_id: input.exercise_id,
        set_number: input.set_number,
        weight: payload.weight,
        reps: payload.reps,
        rir: payload.rir,
        completed: payload.completed,
        notes: payload.notes,
      },
      { onConflict: "session_id,exercise_id,set_number" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return normalizeExerciseSet(data);
};

export const deleteExerciseSet = async (
  userId: string | null,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  options?: TrainingOptions,
) => {
  if (options?.isGuest) {
    const state = readGuestState();
    saveGuestState({
      ...state,
      sets: state.sets.filter(
        (row) => !(row.session_id === sessionId && row.exercise_id === exerciseId && row.set_number === setNumber),
      ),
    });
    return;
  }
  if (!userId) return;
  const { error } = await supabase
    .from("exercise_sets")
    .delete()
    .eq("session_id", sessionId)
    .eq("exercise_id", exerciseId)
    .eq("set_number", setNumber);
  if (error) throw error;
};

export const upsertSessionExerciseNote = async (
  userId: string | null,
  sessionId: string,
  exerciseId: string,
  notes: string | null,
  options?: TrainingOptions,
) => {
  if ((notes ?? "").trim().length > MAX_NOTES_LENGTH) {
    throw new Error("La nota del ejercicio es demasiado larga.");
  }
  const now = new Date().toISOString();
  if (options?.isGuest) {
    const state = readGuestState();
    const existing = state.sessionNotes.find((row) => row.session_id === sessionId && row.exercise_id === exerciseId);
    const next: SessionExerciseNoteRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      session_id: sessionId,
      exercise_id: exerciseId,
      notes,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    saveGuestState({
      ...state,
      sessionNotes: [...state.sessionNotes.filter((row) => !(row.session_id === sessionId && row.exercise_id === exerciseId)), next],
    });
    return next;
  }
  if (!userId) throw new Error("No se encontro el usuario.");
  const { data, error } = await supabase
    .from("session_exercise_notes")
    .upsert(
      {
        session_id: sessionId,
        exercise_id: exerciseId,
        notes,
        updated_at: now,
      },
      { onConflict: "session_id,exercise_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return normalizeSessionNote(data);
};

const evaluateSessionPrs = async (userId: string | null, detail: WorkoutSessionDetail, options?: TrainingOptions) => {
  const metrics = detail.exercises.flatMap((exercise) => {
    const completedSets = exercise.sets.filter((set) => set.completed);
    if (completedSets.length === 0) return [];
    const maxWeightSet = completedSets.reduce((best, current) => (current.weight > best.weight ? current : best), completedSets[0]);
    const bestOneRmSet = completedSets.reduce(
      (best, current) => (estimateOneRm(current.weight, current.reps) > estimateOneRm(best.weight, best.reps) ? current : best),
      completedSets[0],
    );
    return [
      { exercise_id: exercise.exercise_id, pr_type: "max_weight" as const, value_num: round2(maxWeightSet.weight), set_id: maxWeightSet.id, metadata: { reps: maxWeightSet.reps } },
      { exercise_id: exercise.exercise_id, pr_type: "estimated_1rm" as const, value_num: estimateOneRm(bestOneRmSet.weight, bestOneRmSet.reps), set_id: bestOneRmSet.id, metadata: { weight: bestOneRmSet.weight, reps: bestOneRmSet.reps } },
      { exercise_id: exercise.exercise_id, pr_type: "max_volume" as const, value_num: round2(completedSets.reduce((sum, set) => sum + computeSetVolume(set), 0)), set_id: null, metadata: { sets: completedSets.length } },
    ];
  });

  const exerciseIds = Array.from(new Set(metrics.map((row) => row.exercise_id)));
  let existing: ExercisePrRecord[] = [];
  if (options?.isGuest) {
    existing = readGuestState().prs.filter((row) => exerciseIds.includes(row.exercise_id));
  } else if (userId) {
    const { data, error } = await supabase.from("exercise_prs").select("*").eq("user_id", userId).in("exercise_id", exerciseIds);
    if (error) throw error;
    existing = (data || []).map(normalizeExercisePr);
  }
  const existingMap = new Map(existing.map((row) => [`${row.exercise_id}:${row.pr_type}`, row]));
  const newPrs: ExercisePrRecord[] = [];

  metrics.forEach((metric) => {
    const key = `${metric.exercise_id}:${metric.pr_type}`;
    const current = existingMap.get(key);
    if (current && current.value_num >= metric.value_num) return;
    newPrs.push({
      id: current?.id ?? crypto.randomUUID(),
      user_id: userId ?? "guest",
      exercise_id: metric.exercise_id,
      pr_type: metric.pr_type,
      value_num: round2(metric.value_num),
      achieved_at: detail.ended_at ?? new Date().toISOString(),
      session_id: detail.id,
      set_id: metric.set_id,
      metadata: metric.metadata,
      created_at: current?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  if (newPrs.length === 0) return [];
  if (options?.isGuest) {
    const state = readGuestState();
    saveGuestState({
      ...state,
      prs: [...state.prs.filter((row) => !newPrs.some((next) => next.exercise_id === row.exercise_id && next.pr_type === row.pr_type)), ...newPrs],
    });
  } else {
    const { error } = await supabase.from("exercise_prs").upsert(
      newPrs.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        exercise_id: row.exercise_id,
        pr_type: row.pr_type,
        value_num: row.value_num,
        achieved_at: row.achieved_at,
        session_id: row.session_id,
        set_id: row.set_id,
        metadata: row.metadata,
        updated_at: row.updated_at,
      })),
      { onConflict: "user_id,exercise_id,pr_type" },
    );
    if (error) throw error;
  }
  return newPrs;
};

export const finishWorkoutSession = async (
  userId: string | null,
  sessionId: string,
  params?: { notes?: string | null; status?: "completed" | "cancelled" },
  options?: TrainingOptions,
) => {
  const detail = await getWorkoutSessionDetail(userId, sessionId, options);
  if (!detail) throw new Error("No se encontro la sesion.");
  const status = params?.status ?? "completed";
  const totalVolume = round2(detail.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).reduce((inner, set) => inner + computeSetVolume(set), 0), 0));
  const endedAt = new Date().toISOString();

  if (options?.isGuest) {
    const state = readGuestState();
    saveGuestState({
      ...state,
      sessions: state.sessions.map((row) =>
        row.id === sessionId ? { ...row, status, notes: params?.notes ?? row.notes, ended_at: endedAt, total_volume: totalVolume } : row,
      ),
    });
  } else {
    const { error } = await supabase
      .from("workout_sessions")
      .update({
        status,
        notes: params?.notes ?? detail.notes,
        ended_at: endedAt,
        total_volume: totalVolume,
      })
      .eq("id", sessionId)
      .eq("user_id", userId ?? "");
    if (error) throw error;
  }

  const updated = await getWorkoutSessionDetail(userId, sessionId, options);
  if (!updated) throw new Error("No se pudo recargar la sesion.");
  const prs = status === "completed" ? await evaluateSessionPrs(userId, updated, options) : [];
  return { session: updated, prs };
};

export const listWorkoutHistory = async (userId: string | null, options?: TrainingOptions) => {
  if (options?.isGuest) {
    const state = readGuestState();
    const workoutMap = new Map(state.workouts.map((row) => [row.id, row]));
    return state.sessions
      .filter((row) => row.status !== "active")
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .map((row) => ({ ...row, workout_name: workoutMap.get(row.workout_id)?.name ?? "Rutina" }));
  }
  if (!userId) return [];
  const [{ data: sessionData, error: sessionError }, { data: workoutsData, error: workoutsError }] = await Promise.all([
    supabase.from("workout_sessions").select("*").eq("user_id", userId).neq("status", "active").order("started_at", { ascending: false }).limit(40),
    supabase.from("workouts").select("*").eq("user_id", userId),
  ]);
  if (sessionError) throw sessionError;
  if (workoutsError) throw workoutsError;
  const workoutMap = new Map((workoutsData || []).map((row) => {
    const normalized = normalizeWorkout(row);
    return [normalized.id, normalized];
  }));
  return (sessionData || []).map(normalizeWorkoutSession).map((row) => ({ ...row, workout_name: workoutMap.get(row.workout_id)?.name ?? "Rutina" }));
};

export const getExerciseHistory = async (userId: string | null, exerciseId: string, options?: TrainingOptions): Promise<ExerciseHistoryEntry[]> => {
  let sessions: WorkoutSessionRecord[] = [];
  let sets: ExerciseSetRecord[] = [];
  let workouts = new Map<string, WorkoutRecord>();

  if (options?.isGuest) {
    const state = readGuestState();
    sessions = state.sessions.filter((row) => row.status === "completed");
    sets = state.sets.filter((row) => row.exercise_id === exerciseId && row.completed);
    workouts = new Map(state.workouts.map((row) => [row.id, row]));
  } else {
    if (!userId) return [];
    const [{ data: sessionData, error: sessionError }, { data: setData, error: setError }, { data: workoutData, error: workoutError }] = await Promise.all([
      supabase.from("workout_sessions").select("*").eq("user_id", userId).eq("status", "completed").order("started_at", { ascending: false }),
      supabase.from("exercise_sets").select("*").eq("exercise_id", exerciseId).eq("completed", true),
      supabase.from("workouts").select("*").eq("user_id", userId),
    ]);
    if (sessionError) throw sessionError;
    if (setError) throw setError;
    if (workoutError) throw workoutError;
    sessions = (sessionData || []).map(normalizeWorkoutSession);
    sets = (setData || []).map(normalizeExerciseSet);
    workouts = new Map((workoutData || []).map((row) => {
      const normalized = normalizeWorkout(row);
      return [normalized.id, normalized];
    }));
  }

  const sessionMap = new Map(sessions.map((row) => [row.id, row]));
  const grouped = new Map<string, ExerciseSetRecord[]>();
  sets.forEach((row) => {
    if (!sessionMap.has(row.session_id)) return;
    const current = grouped.get(row.session_id) ?? [];
    current.push(row);
    grouped.set(row.session_id, current);
  });

  return Array.from(grouped.entries())
    .map(([sessionId, sessionSets]) => {
      const session = sessionMap.get(sessionId)!;
      return {
        session_id: sessionId,
        started_at: session.started_at,
        workout_name: workouts.get(session.workout_id)?.name ?? "Rutina",
        total_volume: round2(sessionSets.reduce((sum, set) => sum + computeSetVolume(set), 0)),
        max_weight: round2(sessionSets.reduce((max, set) => Math.max(max, set.weight), 0)),
        estimated_1rm: round1(sessionSets.reduce((max, set) => Math.max(max, estimateOneRm(set.weight, set.reps)), 0)),
        sets: sessionSets.sort((a, b) => a.set_number - b.set_number),
      };
    })
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
};

export const getExerciseProgress = async (
  userId: string | null,
  exerciseId: string,
  options?: TrainingOptions,
): Promise<ExerciseProgressPoint[]> => {
  return (await getExerciseHistory(userId, exerciseId, options))
    .map((entry) => ({
      date_key: entry.started_at.slice(0, 10),
      max_weight: entry.max_weight,
      total_volume: entry.total_volume,
      estimated_1rm: entry.estimated_1rm,
    }))
    .reverse();
};

export const getExercisePrs = async (userId: string | null, exerciseId: string, options?: TrainingOptions) => {
  if (options?.isGuest) {
    return readGuestState().prs.filter((row) => row.exercise_id === exerciseId);
  }
  if (!userId) return [];
  const { data, error } = await supabase.from("exercise_prs").select("*").eq("user_id", userId).eq("exercise_id", exerciseId);
  if (error) throw error;
  return (data || []).map(normalizeExercisePr);
};

export const getTrainingTodaySummary = async (
  userId: string | null,
  date = new Date(),
  options?: TrainingOptions,
): Promise<TrainingTodaySummary> => {
  const [schedule, activeSession] = await Promise.all([listWorkoutSchedule(userId, options), getActiveWorkoutSession(userId, options)]);
  const scheduled = schedule.find((row) => row.day_of_week === date.getDay()) ?? null;
  return {
    dateKey: getDateKeyForTimezone(date, options?.timeZone || DEFAULT_WATER_TIMEZONE),
    activeSession,
    scheduledWorkout: scheduled?.workout_id ? await getWorkoutDetail(userId, scheduled.workout_id, options) : null,
    schedule,
  };
};

export const getTrainingDayLabel = (dayOfWeek: number) => DAY_LABELS[dayOfWeek] ?? "Dia";
