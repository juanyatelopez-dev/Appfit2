export type RecoveryInputs = {
  sleepMinutes: number;
  sleepGoalMinutes: number;
  sleepQuality?: number | null; // 1-10
  dailyEnergy?: number | null; // 1-10
  perceivedStress?: number | null; // 1-10 (higher = worse)
  trainingEnergy?: number | null; // 1-10
  hydrationMl: number;
  hydrationGoalMl: number;
  activeDays7: number; // 0-7
};

export type RecoveryResult = {
  score: number;
  status: "Recuperacion Alta" | "Recuperacion Moderada" | "Recuperacion Baja";
  drivers: string[];
  subscores: {
    sleep: number;
    biofeedback: number;
    hydration: number;
    consistency: number;
  };
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export const getDateKeyLocal = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatUnits = (value: number | null | undefined, unit: string, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toFixed(digits)} ${unit}`;
};

export const computeRecoveryScore = (input: RecoveryInputs): RecoveryResult => {
  const sleepDurationNorm = clamp(input.sleepMinutes / Math.max(input.sleepGoalMinutes, 1));
  const sleepQualityNorm =
    input.sleepQuality !== null && input.sleepQuality !== undefined
      ? clamp(input.sleepQuality / 10)
      : sleepDurationNorm;
  const sleepSub = clamp(sleepDurationNorm * 0.6 + sleepQualityNorm * 0.4);

  const energyNorm = clamp((input.dailyEnergy ?? 5) / 10);
  const stressNorm = clamp(1 - (input.perceivedStress ?? 5) / 10);
  const trainingNorm = clamp((input.trainingEnergy ?? 5) / 10);
  const bioSub = clamp(energyNorm * 0.4 + stressNorm * 0.4 + trainingNorm * 0.2);

  const hydrationSub = clamp(input.hydrationMl / Math.max(input.hydrationGoalMl, 1));
  const consistencySub = clamp(input.activeDays7 / 7);

  const score = Math.round(100 * (sleepSub * 0.4 + bioSub * 0.3 + hydrationSub * 0.2 + consistencySub * 0.1));
  const status = score >= 75 ? "Recuperacion Alta" : score >= 50 ? "Recuperacion Moderada" : "Recuperacion Baja";

  const drivers: string[] = [];
  if (sleepSub < 0.65) drivers.push("Sueño bajo");
  if (stressNorm < 0.45) drivers.push("Estres alto");
  if (energyNorm < 0.5) drivers.push("Energia baja");
  if (hydrationSub < 0.7) drivers.push("Agua insuficiente");
  if (consistencySub < 0.6) drivers.push("Baja consistencia semanal");
  if (drivers.length === 0) drivers.push("Buen balance general");

  return {
    score,
    status,
    drivers,
    subscores: {
      sleep: Math.round(sleepSub * 100),
      biofeedback: Math.round(bioSub * 100),
      hydration: Math.round(hydrationSub * 100),
      consistency: Math.round(consistencySub * 100),
    },
  };
};
