import type { LocalizedText, SaveExerciseInput, SaveWorkoutInput } from "@/types/training";

const MAX_TEXT_LENGTH = 160;
export const MAX_NOTES_LENGTH = 1000;
const MAX_INSTRUCTIONS_LENGTH = 4000;

export const normalizeLocalizedText = (value: unknown): LocalizedText | null => {
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
