import { NutritionActivityLevel, NutritionGoalType } from "@/types/nutrition";

export type ActivityOption = {
  value: NutritionActivityLevel;
  label: string;
  description: string;
};

export type GoalOption = {
  value: NutritionGoalType;
  label: string;
  description: string;
  legacyGoalTypeLabel: string;
};

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    value: "low",
    label: "Bajo",
    description: "Vida sedentaria o poco ejercicio.",
  },
  {
    value: "moderate",
    label: "Moderado",
    description: "Ejercicio ligero 1 a 3 dias por semana.",
  },
  {
    value: "high",
    label: "Alto",
    description: "Entrenamiento intenso 3 a 5 dias por semana.",
  },
  {
    value: "very_high",
    label: "Muy alto",
    description: "Entrenamiento diario con NEAT elevado.",
  },
  {
    value: "hyperactive",
    label: "Hiperactivo",
    description: "Trabajo fisico extremo o actividad atletica profesional.",
  },
];

export const GOAL_OPTIONS: GoalOption[] = [
  {
    value: "lose",
    label: "Perder peso",
    description: "Deficit agresivo para bajar peso mas rapido.",
    legacyGoalTypeLabel: "Lose Weight",
  },
  {
    value: "lose_slow",
    label: "Perder peso lentamente",
    description: "Deficit moderado para una reduccion mas gradual.",
    legacyGoalTypeLabel: "Lose Weight Slowly",
  },
  {
    value: "maintain",
    label: "Mantener peso",
    description: "Calorias de mantenimiento para sostener el peso actual.",
    legacyGoalTypeLabel: "Maintain Weight",
  },
  {
    value: "gain_slow",
    label: "Aumentar peso lentamente",
    description: "Superavit moderado para subir de forma controlada.",
    legacyGoalTypeLabel: "Gain Weight Slowly",
  },
  {
    value: "gain",
    label: "Aumentar peso",
    description: "Superavit alto para subir peso mas rapido.",
    legacyGoalTypeLabel: "Gain Weight",
  },
];

export const findGoalOption = (value: string | null | undefined) =>
  GOAL_OPTIONS.find((option) => option.value === value) ?? GOAL_OPTIONS[2];

export const findActivityOption = (value: string | null | undefined) =>
  ACTIVITY_OPTIONS.find((option) => option.value === value) ?? ACTIVITY_OPTIONS[1];
