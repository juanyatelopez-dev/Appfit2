import { describe, expect, it } from "vitest";

import { getLocalizedText, validateExerciseInput, validateWorkoutInput } from "@/services/training";

describe("training helpers", () => {
  it("prefers the requested language for localized text", () => {
    expect(getLocalizedText({ en: "Bench Press", es: "Press banca" }, "es", "Bench Press")).toBe("Press banca");
    expect(getLocalizedText({ en: "Bench Press", es: "Press banca" }, "en", "Press banca")).toBe("Bench Press");
  });

  it("falls back to the alternate language and then to the base field", () => {
    expect(getLocalizedText({ en: "Bench Press" }, "es", "Fallback")).toBe("Bench Press");
    expect(getLocalizedText(null, "es", "Fallback")).toBe("Fallback");
  });

  it("rejects invalid workout payloads", () => {
    expect(() =>
      validateWorkoutInput({
        name: "  ",
        exercises: [],
      }),
    ).toThrow("La rutina necesita un nombre.");

    expect(() =>
      validateWorkoutInput({
        name: "Push day",
        exercises: [{ exercise_id: "1", order_index: 0, target_sets: 0, target_reps: "8-10", rest_seconds: 90 }],
      }),
    ).toThrow("Las series objetivo del ejercicio 1 deben estar entre 1 y 20.");
  });

  it("rejects invalid custom exercise payloads", () => {
    expect(() =>
      validateExerciseInput({
        name: "Curl",
        muscle_group: "biceps",
        equipment: "dumbbell",
        movement_type: "isolation",
        difficulty: "beginner",
        video_url: "nota-url",
      }),
    ).toThrow("La URL del video no es valida.");
  });
});
