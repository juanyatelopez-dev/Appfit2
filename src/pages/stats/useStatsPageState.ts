import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { deriveMeasurementSummary, filterMeasurementsByRangePreset } from "@/features/bodyMeasurements/measurementInsights";
import { calculateGoalProgress, resolveInitialWeight, type GoalDirection } from "@/features/goals/goalProgress";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getErrorMessage } from "@/lib/errors";
import { getBiofeedbackRange, getBiofeedbackWeeklyAverages } from "@/services/dailyBiofeedback";
import {
  getGuestBodyMetrics,
  getGuestWeightGoal,
  getWeightTrendAnalysis,
  listBodyMetricsByRange,
  type BodyMetricEntry,
} from "@/services/bodyMetrics";
import { listBodyMeasurements } from "@/services/bodyMeasurements";
import { getNutritionGoals, getNutritionRangeSummary } from "@/modules/nutrition/services";
import { getSleepGoal, getSleepRangeTotals } from "@/services/sleep";
import { getWeeklyReviewObservation, getWeeklyReviewSummary, upsertWeeklyReviewObservation } from "@/services/weeklyReview";
import type {
  BiofeedbackChartPoint,
  BodyFatChartPoint,
  HydrationState,
  NutritionTrendPoint,
  Range,
  TrainingPerformance,
  WeightChartPoint,
} from "@/pages/stats/types";

const findOnOrBefore = (entriesAsc: BodyMetricEntry[], targetISO: string) => {
  const candidates = entriesAsc.filter((entry) => entry.measured_at <= targetISO);
  if (candidates.length > 0) return candidates[candidates.length - 1];
  return entriesAsc[0] ?? null;
};

export const formatNumber = (value: number | null) => (value === null ? "--" : value.toFixed(1));

export const trendLabel = (trend: "up" | "down" | "stable" | null) => {
  if (trend === "up") return "Subiendo";
  if (trend === "down") return "Bajando";
  if (trend === "stable") return "Estable";
  return "--";
};

export const formatChartDate = (value: string | number, mobile: boolean) => {
  const date = new Date(value);
  return mobile ? date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }) : date.toLocaleDateString();
};

export function useStatsPageState() {
  const { user, isGuest, profile } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const timeZone = profile?.timezone || DEFAULT_WATER_TIMEZONE;
  const metabolicProfileKey = [
    profile?.weight ?? "",
    profile?.height ?? "",
    profile?.birth_date ?? "",
    profile?.biological_sex ?? "",
    profile?.activity_level ?? "",
    profile?.nutrition_goal_type ?? "",
    profile?.day_archetype ?? "",
    profile?.goal_type ?? "",
  ].join("|");

  const [range, setRange] = useState<Range>("30d");
  const weekStartDate = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekKey = weekStartDate.toISOString().slice(0, 10);
  const [hydrationState, setHydrationState] = useState<HydrationState>("variable");
  const [trainingPerformance, setTrainingPerformance] = useState<TrainingPerformance>("same");
  const [weeklyNotes, setWeeklyNotes] = useState("");

  const queryEnabled = Boolean(user?.id) || isGuest;

  const { data: chartEntries = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, range],
    queryFn: () => listBodyMetricsByRange(user?.id ?? null, range, isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const { data: allEntriesFromDb = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, "all"],
    queryFn: () => listBodyMetricsByRange(user?.id ?? null, "all", isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const { data: weightTrendData } = useQuery({
    queryKey: ["stats_weight_trend", user?.id, isGuest],
    queryFn: () => getWeightTrendAnalysis(user?.id ?? null, isGuest),
    enabled: queryEnabled,
  });

  const guestEntries = useMemo(
    () => (isGuest ? getGuestBodyMetrics().sort((a, b) => a.measured_at.localeCompare(b.measured_at)) : []),
    [isGuest],
  );

  const allEntries = isGuest ? guestEntries : allEntriesFromDb;
  const entriesForChart = isGuest
    ? guestEntries.filter((entry) => {
        if (range === "all") return true;
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        return entry.measured_at >= fromDate.toISOString().slice(0, 10);
      })
    : chartEntries;

  const latest = allEntries.length ? allEntries[allEntries.length - 1] : null;
  const latestWeight = latest ? Number(latest.weight_kg) : null;
  const initialWeight = resolveInitialWeight(allEntries, profile?.weight ?? null);

  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  }, []);

  const ref7 = findOnOrBefore(allEntries, sevenDaysAgo);
  const ref30 = findOnOrBefore(allEntries, thirtyDaysAgo);
  const delta7 = latestWeight !== null && ref7 ? latestWeight - Number(ref7.weight_kg) : null;
  const delta30 = latestWeight !== null && ref30 ? latestWeight - Number(ref30.weight_kg) : null;

  const last7Entries = allEntries.filter((entry) => entry.measured_at >= sevenDaysAgo);
  const weeklyAvg = last7Entries.length > 0 ? last7Entries.reduce((sum, entry) => sum + Number(entry.weight_kg), 0) / last7Entries.length : null;

  const guestGoal = isGuest ? getGuestWeightGoal() : null;
  const target = (isGuest ? guestGoal?.target_weight_kg : profile?.target_weight_kg) ?? null;
  const start = (isGuest ? guestGoal?.start_weight_kg : profile?.start_weight_kg) ?? initialWeight;
  const goalDirection = ((isGuest ? guestGoal?.goal_direction : profile?.goal_direction) as GoalDirection | null) ?? null;
  const targetDate = (isGuest ? guestGoal?.target_date : profile?.target_date) ?? "--";
  const remaining = target !== null && latestWeight !== null ? target - latestWeight : null;
  const progress = calculateGoalProgress({
    start,
    target,
    current: latestWeight,
    direction: goalDirection,
  });

  const chartData: WeightChartPoint[] = entriesForChart.map((entry, index) => {
    const from = Math.max(0, index - 6);
    const slice = entriesForChart.slice(from, index + 1);
    const movingAvg7 = slice.length ? slice.reduce((sum, row) => sum + Number(row.weight_kg), 0) / slice.length : null;
    return {
      date: entry.measured_at,
      weight: Number(entry.weight_kg),
      movingAvg7: movingAvg7 !== null ? Number(movingAvg7.toFixed(2)) : null,
    };
  });

  const { data: sleepGoalData = { sleep_goal_minutes: 480 } } = useQuery({
    queryKey: ["sleep_goal", user?.id],
    queryFn: () => getSleepGoal(user?.id ?? null, { isGuest }),
    enabled: queryEnabled,
  });

  const { data: sleepWeekTotals = [] } = useQuery({
    queryKey: ["sleep_stats_week", user?.id],
    queryFn: async () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      return getSleepRangeTotals(user?.id ?? null, from, to, { isGuest, timeZone });
    },
    enabled: queryEnabled,
  });

  const { data: sleepMonthTotals = [] } = useQuery({
    queryKey: ["sleep_stats_month", user?.id],
    queryFn: async () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      return getSleepRangeTotals(user?.id ?? null, from, to, { isGuest, timeZone });
    },
    enabled: queryEnabled,
  });

  const sleepWeekAvg = sleepWeekTotals.length ? sleepWeekTotals.reduce((sum, row) => sum + row.total_minutes, 0) / sleepWeekTotals.length : 0;
  const sleepMonthAvg = sleepMonthTotals.length ? sleepMonthTotals.reduce((sum, row) => sum + row.total_minutes, 0) / sleepMonthTotals.length : 0;
  const sleepWeekMet = sleepWeekTotals.filter((row) => row.total_minutes >= sleepGoalData.sleep_goal_minutes).length;

  const { data: biofeedbackWeek } = useQuery({
    queryKey: ["stats_biofeedback_week", user?.id, isGuest, timeZone],
    queryFn: () => getBiofeedbackWeeklyAverages(user?.id ?? null, new Date(), { isGuest, timeZone }),
    enabled: queryEnabled,
  });

  const { data: biofeedbackRows = [] } = useQuery({
    queryKey: ["stats_biofeedback_range", user?.id, isGuest, timeZone],
    queryFn: async () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      return getBiofeedbackRange(user?.id ?? null, from, to, { isGuest, timeZone });
    },
    enabled: queryEnabled,
  });

  const { data: allBodyMeasurementRows = [] } = useQuery({
    queryKey: ["body_measurements_all", user?.id, isGuest, "stats"],
    queryFn: () => listBodyMeasurements(user?.id ?? null, { isGuest }),
    enabled: queryEnabled,
  });

  const latestMeasurement = useMemo(() => deriveMeasurementSummary(allBodyMeasurementRows).latest, [allBodyMeasurementRows]);
  const bodyMeasurementRows = useMemo(() => filterMeasurementsByRangePreset(allBodyMeasurementRows, "180d"), [allBodyMeasurementRows]);

  const { data: weeklyReview } = useQuery({
    queryKey: ["stats_weekly_review", user?.id, isGuest, timeZone],
    queryFn: () => getWeeklyReviewSummary(user?.id ?? null, new Date(), { isGuest, timeZone }),
    enabled: queryEnabled,
  });

  const { data: weeklyObservation } = useQuery({
    queryKey: ["weekly_review_observation", user?.id, weekKey, isGuest],
    queryFn: () => getWeeklyReviewObservation(user?.id ?? null, weekStartDate, { isGuest }),
    enabled: queryEnabled,
  });

  const { data: nutritionGoals } = useQuery({
    queryKey: ["stats_nutrition_goals", user?.id, isGuest, metabolicProfileKey],
    queryFn: () =>
      getNutritionGoals(user?.id ?? null, { isGuest, profile }).catch(() => ({
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
    enabled: queryEnabled,
  });

  const { data: nutrition7d } = useQuery({
    queryKey: ["stats_nutrition_7d", user?.id, isGuest, timeZone],
    queryFn: async () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      return getNutritionRangeSummary(user?.id ?? null, from, to, { isGuest, timeZone }).catch(() => ({
        days: [],
        averages: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      }));
    },
    enabled: queryEnabled,
  });

  const { data: nutrition30d } = useQuery({
    queryKey: ["stats_nutrition_30d", user?.id, isGuest, timeZone],
    queryFn: async () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      return getNutritionRangeSummary(user?.id ?? null, from, to, { isGuest, timeZone }).catch(() => ({
        days: [],
        averages: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      }));
    },
    enabled: queryEnabled,
  });

  const bodyFatChartData: BodyFatChartPoint[] = bodyMeasurementRows
    .filter((row) => row.body_fat_pct !== null)
    .map((row) => ({
      date: row.date_key,
      body_fat_pct: Number(row.body_fat_pct),
    }));

  const biofeedbackChartData: BiofeedbackChartPoint[] = biofeedbackRows.map((row) => ({
    date: row.date_key,
    energy: row.daily_energy,
    stress: row.perceived_stress,
    sleep_quality: row.sleep_quality,
  }));

  const nutrition7dData: NutritionTrendPoint[] = (nutrition7d?.days ?? []).map((row) => ({
    date: row.date_key,
    calories: row.calories,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
  }));

  const nutrition30dData: NutritionTrendPoint[] = (nutrition30d?.days ?? []).map((row) => ({
    date: row.date_key,
    calories: row.calories,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
  }));

  const hasInitialFallback = initialWeight === null;
  const weightChartHeight = isMobile ? 240 : 320;
  const secondaryChartHeight = isMobile ? 220 : 280;
  const chartMargin = isMobile ? { top: 8, right: 6, left: -28, bottom: 0 } : { top: 8, right: 16, left: 0, bottom: 0 };
  const yAxisWidth = isMobile ? 34 : 44;

  useEffect(() => {
    if (!weeklyObservation) {
      setHydrationState("variable");
      setTrainingPerformance("same");
      setWeeklyNotes("");
      return;
    }
    setHydrationState(weeklyObservation.hydration_state);
    setTrainingPerformance(weeklyObservation.training_performance);
    setWeeklyNotes(weeklyObservation.notes || "");
  }, [weeklyObservation]);

  const saveWeeklyReviewMutation = useMutation({
    mutationFn: async () =>
      upsertWeeklyReviewObservation(
        {
          userId: user?.id ?? null,
          weekStartDate,
          hydration_state: hydrationState,
          training_performance: trainingPerformance,
          notes: weeklyNotes.trim() || null,
        },
        { isGuest },
      ),
    onSuccess: async () => {
      toast.success("Revision semanal guardada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["weekly_review_observation"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_weekly_review"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "No se pudo guardar la revision semanal."));
    },
  });

  return {
    isGuest,
    range,
    setRange,
    latestWeight,
    initialWeight,
    hasInitialFallback,
    target,
    targetDate,
    remaining,
    progress,
    delta7,
    delta30,
    weeklyAvg,
    weightTrendData,
    sleepGoalData,
    sleepWeekAvg,
    sleepMonthAvg,
    sleepWeekMet,
    nutritionGoals,
    nutrition7d,
    nutrition30d,
    biofeedbackWeek,
    latestMeasurement,
    weeklyReview,
    chartData,
    nutrition7dData,
    nutrition30dData,
    biofeedbackChartData,
    bodyFatChartData,
    weightChartHeight,
    secondaryChartHeight,
    chartMargin,
    yAxisWidth,
    isMobile,
    hydrationState,
    setHydrationState,
    trainingPerformance,
    setTrainingPerformance,
    weeklyNotes,
    setWeeklyNotes,
    saveWeeklyReviewMutation,
  };
}
