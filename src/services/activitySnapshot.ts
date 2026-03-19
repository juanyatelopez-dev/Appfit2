import { format } from "date-fns";

import { createDateKeyRange, DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getBiofeedbackRange } from "@/services/dailyBiofeedback";
import { listDailyNotesByRange } from "@/services/dailyNotes";
import { getNutritionRangeSummary } from "@/services/nutrition";
import { getSleepRangeTotals } from "@/services/sleep";
import { supabase } from "@/services/supabaseClient";
import { listBodyMetricsBetween } from "@/services/bodyMetrics";
import { getWaterRangeTotals } from "@/services/waterIntake";

export type ActivityRangeDay = {
  date_key: string;
  water_ml: number;
  sleep_minutes: number;
  weight_kg: number | null;
  has_water: boolean;
  has_sleep: boolean;
  has_weight: boolean;
  has_biofeedback: boolean;
  has_note: boolean;
  has_nutrition: boolean;
  nutrition_calories: number;
};

type ActivityRangeOptions = {
  isGuest?: boolean;
  timeZone?: string;
};

const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");

const isRpcUnavailableError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("PGRST202") ||
    message.includes("42883") ||
    message.toLowerCase().includes("could not find the function")
  );
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getActivityRangeSnapshotFallback = async (
  userId: string | null,
  from: Date,
  to: Date,
  options?: ActivityRangeOptions,
): Promise<ActivityRangeDay[]> => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;

  const [
    waterTotalsResult,
    sleepTotalsResult,
    bioRowsResult,
    noteRowsResult,
    nutritionRangeResult,
    weightRowsResult,
  ] = await Promise.allSettled([
    getWaterRangeTotals(userId, from, to, { isGuest, timeZone }),
    getSleepRangeTotals(userId, from, to, { isGuest, timeZone }),
    getBiofeedbackRange(userId, from, to, { isGuest, timeZone }),
    listDailyNotesByRange(userId, from, to, { isGuest, timeZone }),
    getNutritionRangeSummary(userId, from, to, { isGuest, timeZone }),
    listBodyMetricsBetween(userId, from, to, isGuest),
  ]);

  const waterTotals =
    waterTotalsResult.status === "fulfilled" ? waterTotalsResult.value : ([] as Array<{ date_key: string; total_ml: number }>);
  const sleepTotals =
    sleepTotalsResult.status === "fulfilled" ? sleepTotalsResult.value : ([] as Array<{ date_key: string; total_minutes: number }>);
  const bioRows = bioRowsResult.status === "fulfilled" ? bioRowsResult.value : [];
  const noteRows = noteRowsResult.status === "fulfilled" ? noteRowsResult.value : [];
  const nutritionRange =
    nutritionRangeResult.status === "fulfilled"
      ? nutritionRangeResult.value
      : { days: [] as Array<{ date_key: string; calories: number }> };
  const weightRows = weightRowsResult.status === "fulfilled" ? weightRowsResult.value : [];

  const waterMap = new Map(waterTotals.map((row) => [row.date_key, toNumber(row.total_ml)]));
  const sleepMap = new Map(sleepTotals.map((row) => [row.date_key, toNumber(row.total_minutes)]));
  const bioMap = new Set(bioRows.map((row) => row.date_key));
  const notesMap = new Set(noteRows.map((row) => row.date_key));
  const nutritionMap = new Map((nutritionRange.days ?? []).map((row) => [row.date_key, toNumber(row.calories)]));
  const weightMap = new Map<string, number>();
  weightRows.forEach((row) => {
    weightMap.set(row.measured_at, toNumber(row.weight_kg));
  });

  return createDateKeyRange(from, to).map((dateKey) => {
    const waterMl = waterMap.get(dateKey) ?? 0;
    const sleepMinutes = sleepMap.get(dateKey) ?? 0;
    const nutritionCalories = nutritionMap.get(dateKey) ?? 0;
    const weightKg = weightMap.has(dateKey) ? weightMap.get(dateKey) ?? null : null;

    return {
      date_key: dateKey,
      water_ml: waterMl,
      sleep_minutes: sleepMinutes,
      weight_kg: weightKg,
      has_water: waterMl > 0,
      has_sleep: sleepMinutes > 0,
      has_weight: weightKg !== null,
      has_biofeedback: bioMap.has(dateKey),
      has_note: notesMap.has(dateKey),
      has_nutrition: nutritionCalories > 0,
      nutrition_calories: nutritionCalories,
    };
  });
};

export const getActivityRangeSnapshot = async (
  userId: string | null,
  from: Date,
  to: Date,
  options?: ActivityRangeOptions,
): Promise<ActivityRangeDay[]> => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const fromKey = getDateKeyForTimezone(from, timeZone);
  const toKey = getDateKeyForTimezone(to, timeZone);

  if (!userId || isGuest) {
    return getActivityRangeSnapshotFallback(userId, from, to, { isGuest, timeZone });
  }

  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;

  const { data, error } = await rpc("get_activity_range_snapshot", {
    p_from: fromKey,
    p_to: toKey,
    p_timezone: timeZone,
  });

  if (error) {
    if (!isRpcUnavailableError(error)) {
      console.warn("[activitySnapshot] RPC failed, using fallback.", error);
    }
    return getActivityRangeSnapshotFallback(userId, from, to, { isGuest, timeZone });
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    const waterMl = toNumber(item.water_ml);
    const sleepMinutes = toNumber(item.sleep_minutes);
    const nutritionCalories = toNumber(item.nutrition_calories);
    const weightRaw = item.weight_kg;
    const weightKg = weightRaw === null || weightRaw === undefined ? null : toNumber(weightRaw);
    return {
      date_key: String(item.date_key ?? ""),
      water_ml: waterMl,
      sleep_minutes: sleepMinutes,
      weight_kg: weightKg,
      has_water: Boolean(item.has_water ?? waterMl > 0),
      has_sleep: Boolean(item.has_sleep ?? sleepMinutes > 0),
      has_weight: Boolean(item.has_weight ?? weightKg !== null),
      has_biofeedback: Boolean(item.has_biofeedback ?? false),
      has_note: Boolean(item.has_note ?? false),
      has_nutrition: Boolean(item.has_nutrition ?? nutritionCalories > 0),
      nutrition_calories: nutritionCalories,
    } as ActivityRangeDay;
  });
};

export const mapActivityRowsByDate = (rows: ActivityRangeDay[]) => new Map(rows.map((row) => [row.date_key, row]));

export const dateToKey = toDateKey;
