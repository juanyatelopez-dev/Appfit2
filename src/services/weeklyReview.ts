import { endOfWeek, startOfWeek } from "date-fns";

import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { getWaterGoal, getWaterRangeTotals } from "@/services/waterIntake";
import { getSleepRangeTotals } from "@/services/sleep";
import { getBiofeedbackRange } from "@/services/dailyBiofeedback";
import { getWeightTrendAnalysis } from "@/services/bodyMetrics";
import { getNutritionGoals, getNutritionRangeSummary } from "@/services/nutrition";
import { supabase } from "@/services/supabaseClient";

export type WeeklyReviewRecord = {
  id: string;
  user_id: string;
  week_start_date: string;
  hydration_state: "dry" | "retention" | "variable";
  training_performance: "better" | "same" | "worse";
  notes: string | null;
  created_at: string;
};

const GUEST_WEEKLY_REVIEW_KEY = "appfit_guest_weekly_reviews";

const parseGuestReviews = (): WeeklyReviewRecord[] => {
  const raw = localStorage.getItem(GUEST_WEEKLY_REVIEW_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as WeeklyReviewRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const saveGuestReviews = (rows: WeeklyReviewRecord[]) => localStorage.setItem(GUEST_WEEKLY_REVIEW_KEY, JSON.stringify(rows));
const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getWeeklyReviewSummary = async (
  userId: string | null,
  referenceDate = new Date(),
  options?: { isGuest?: boolean; timeZone?: string },
) => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });

  const [waterTotals, waterGoal, sleepTotals, biofeedbackRows, weightTrend, nutritionRange, nutritionGoals] = await Promise.all([
    getWaterRangeTotals(userId, weekStart, weekEnd, { isGuest, timeZone }),
    getWaterGoal(userId, { isGuest }),
    getSleepRangeTotals(userId, weekStart, weekEnd, { isGuest, timeZone }),
    getBiofeedbackRange(userId, weekStart, weekEnd, { isGuest, timeZone }),
    getWeightTrendAnalysis(userId, isGuest),
    getNutritionRangeSummary(userId, weekStart, weekEnd, { isGuest, timeZone }).catch(() => ({
      days: [],
      averages: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    })),
    getNutritionGoals(userId, { isGuest }).catch(() => ({
      calorie_goal: 2000,
      protein_goal_g: 150,
      carb_goal_g: 250,
      fat_goal_g: 70,
      day_archetype: "base",
      bmr: 0,
      tdee: 0,
      activity_multiplier: 1.375,
      goal_multiplier: 1,
      archetype_delta: 0,
      calorie_target: 2000,
      final_target_calories: 2000,
    })),
  ]);

  const waterDaysMet = waterTotals.filter((row) => row.total_ml >= waterGoal.water_goal_ml).length;
  const avgSleepMinutes = sleepTotals.length
    ? Math.round(sleepTotals.reduce((sum, row) => sum + row.total_minutes, 0) / sleepTotals.length)
    : 0;

  const avg = (selector: (row: (typeof biofeedbackRows)[number]) => number) =>
    biofeedbackRows.length
      ? Number((biofeedbackRows.reduce((sum, row) => sum + selector(row), 0) / biofeedbackRows.length).toFixed(1))
      : 0;

  const daySet = new Set<string>();
  waterTotals.forEach((row) => row.total_ml > 0 && daySet.add(row.date_key));
  sleepTotals.forEach((row) => row.total_minutes > 0 && daySet.add(row.date_key));
  biofeedbackRows.forEach((row) => daySet.add(row.date_key));
  const nutritionDaysWithData = nutritionRange.days.filter((day) => day.calories > 0).length;
  const nutritionCalorieDaysMet = nutritionRange.days.filter((day) => day.calories >= nutritionGoals.calorie_goal).length;
  const nutritionProteinDaysMet = nutritionRange.days.filter((day) => day.protein_g >= nutritionGoals.protein_goal_g).length;

  return {
    weekStart,
    weekEnd,
    waterDaysMet,
    waterDaysTotal: waterTotals.length || 7,
    avgSleepMinutes,
    avgBioSleepQuality: avg((r) => r.sleep_quality),
    avgBioEnergy: avg((r) => r.daily_energy),
    avgBioStress: avg((r) => r.perceived_stress),
    weightWeeklyChange: weightTrend.weeklyChange,
    weightTrend: weightTrend.trend,
    weightMovingAvg7: weightTrend.movingAvg7,
    activeDays: daySet.size,
    nutritionDaysTotal: nutritionRange.days.length || 7,
    nutritionDaysWithData,
    nutritionCalorieDaysMet,
    nutritionProteinDaysMet,
    avgCalories: nutritionRange.averages.calories,
    avgProteinG: nutritionRange.averages.protein_g,
  };
};

export const upsertWeeklyReviewObservation = async (
  params: {
    userId: string | null;
    weekStartDate: Date;
    hydration_state: "dry" | "retention" | "variable";
    training_performance: "better" | "same" | "worse";
    notes?: string | null;
  },
  options?: { isGuest?: boolean },
) => {
  const isGuest = options?.isGuest || false;
  const weekKey = toDateKey(params.weekStartDate);
  const payload = {
    week_start_date: weekKey,
    hydration_state: params.hydration_state,
    training_performance: params.training_performance,
    notes: params.notes || null,
  };

  if (isGuest) {
    const rows = parseGuestReviews().filter((row) => row.week_start_date !== weekKey);
    const next: WeeklyReviewRecord = {
      id: crypto.randomUUID(),
      user_id: "guest",
      created_at: new Date().toISOString(),
      ...payload,
    };
    rows.push(next);
    rows.sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
    saveGuestReviews(rows);
    return next;
  }
  if (!params.userId) return null;

  const { data, error } = await supabase
    .from("weekly_reviews")
    .upsert({ user_id: params.userId, ...payload }, { onConflict: "user_id,week_start_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data as WeeklyReviewRecord;
};

export const getWeeklyReviewObservation = async (
  userId: string | null,
  weekStartDate: Date,
  options?: { isGuest?: boolean },
) => {
  const isGuest = options?.isGuest || false;
  const weekKey = toDateKey(weekStartDate);
  if (isGuest) {
    return parseGuestReviews().find((row) => row.week_start_date === weekKey) ?? null;
  }
  if (!userId) return null;

  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekKey)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as WeeklyReviewRecord | null) ?? null;
};
