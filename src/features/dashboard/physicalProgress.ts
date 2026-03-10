import type { BodyMeasurement } from "@/services/bodyMeasurements";
import type { BodyMetricEntry } from "@/services/bodyMetrics";

type GoalDirection = "lose" | "gain" | "maintain" | null;

export type DashboardPhysicalSummary = {
  lastUpdatedLabel: string;
  lastUpdatedDateKey: string | null;
  goalHeading: string;
  goalSupport: string;
  focusMode: "fat_loss" | "muscle_gain" | "maintenance";
  latestWeightKg: number | null;
  recentWeightChangeKg: number | null;
  latestMeasurementDateKey: string | null;
  waistChangeCm: number | null;
  waistChangeLabel: string;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  armCm: number | null;
  thighCm: number | null;
  goalProgressPct: number | null;
};

const toDateKeyMs = (dateKey: string | null | undefined) => {
  if (!dateKey) return null;
  const ms = new Date(`${dateKey}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export const deriveDashboardPhysicalSummary = (params: {
  latestMeasurement: BodyMeasurement | null;
  recentWeightChangeKg: number | null;
  latestWeightKg: number | null;
  latestWeightEntry: BodyMetricEntry | null;
  goalDirection: GoalDirection;
  goalProgressPct: number | null;
  waistChange: { deltaCm: number | null; label: string; referenceDateKey: string | null };
}) => {
  const {
    latestMeasurement,
    recentWeightChangeKg,
    latestWeightKg,
    latestWeightEntry,
    goalDirection,
    goalProgressPct,
    waistChange,
  } = params;

  const weightDateMs = toDateKeyMs(latestWeightEntry?.measured_at);
  const measurementDateMs = toDateKeyMs(latestMeasurement?.date_key);
  const lastUpdatedDateKey =
    measurementDateMs !== null && (weightDateMs === null || measurementDateMs >= weightDateMs)
      ? latestMeasurement?.date_key ?? null
      : latestWeightEntry?.measured_at ?? null;

  const focusMode = goalDirection === "gain" ? "muscle_gain" : goalDirection === "lose" ? "fat_loss" : "maintenance";
  const goalHeading =
    focusMode === "fat_loss"
      ? "Meta activa: reducir grasa"
      : focusMode === "muscle_gain"
      ? "Meta activa: ganar masa"
      : "Meta activa: mantener rumbo";
  const goalSupport =
    focusMode === "fat_loss"
      ? "Prioriza peso, cintura y porcentaje graso para confirmar que la perdida viene de tejido adiposo."
      : focusMode === "muscle_gain"
      ? "Prioriza masa magra, brazo y muslo para validar que la subida de peso sea productiva."
      : "Usa peso, cintura y consistencia para mantener estabilidad sin perder composicion corporal.";

  return {
    lastUpdatedLabel: lastUpdatedDateKey ? `Actualizado: ${lastUpdatedDateKey}` : "Sin actualizaciones fisicas",
    lastUpdatedDateKey,
    goalHeading,
    goalSupport,
    focusMode,
    latestWeightKg,
    recentWeightChangeKg,
    latestMeasurementDateKey: latestMeasurement?.date_key ?? null,
    waistChangeCm: waistChange.deltaCm,
    waistChangeLabel: waistChange.label,
    bodyFatPct: latestMeasurement?.body_fat_pct !== null && latestMeasurement?.body_fat_pct !== undefined ? Number(latestMeasurement.body_fat_pct) : null,
    leanMassKg: latestMeasurement?.lean_mass_kg !== null && latestMeasurement?.lean_mass_kg !== undefined ? Number(latestMeasurement.lean_mass_kg) : null,
    armCm: latestMeasurement?.arm_cm !== null && latestMeasurement?.arm_cm !== undefined ? Number(latestMeasurement.arm_cm) : null,
    thighCm: latestMeasurement?.thigh_cm !== null && latestMeasurement?.thigh_cm !== undefined ? Number(latestMeasurement.thigh_cm) : null,
    goalProgressPct: goalProgressPct !== null && goalProgressPct !== undefined ? Number(goalProgressPct) : null,
  } satisfies DashboardPhysicalSummary;
};
