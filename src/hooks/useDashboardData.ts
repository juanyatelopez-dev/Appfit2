import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { getBodyWeightSnapshot, getWeightTrendAnalysis } from "@/services/bodyMetrics";
import { getBiofeedbackWeeklyAverages, getDailyBiofeedback, listRecentBiofeedback } from "@/services/dailyBiofeedback";
import { getLatestBodyMeasurement } from "@/services/bodyMeasurements";
import { getDailyNote, getLatestDailyNote } from "@/services/dailyNotes";
import { getWeeklyReviewSummary } from "@/services/weeklyReview";
import { getGoalProgress, getUserGoal } from "@/services/goals";
import { getWaterDayTotal, getWaterGoal, getWaterRangeTotals, getWaterWeeklySummary, listRecentWaterLogs } from "@/services/waterIntake";
import { getSleepDay, getSleepGoal, getSleepRangeTotals, getSleepWeeklySummary, listRecentSleepLogs } from "@/services/sleep";
import { calculateWaterProgress, DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";

export const useDashboardData = () => {
  // Aggregates dashboard data in parallel so cards can render independently.
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
  const timeZone = profile?.timezone || DEFAULT_WATER_TIMEZONE;
  const today = useMemo(() => new Date(), []);
  const dayKey = getDateKeyForTimezone(today, timeZone);

  const weightQuery = useQuery({
    queryKey: ["dashboard", "weight_snapshot", userId],
    queryFn: () => getBodyWeightSnapshot(userId, isGuest),
    enabled: Boolean(userId) || isGuest,
  });
  const weightTrendQuery = useQuery({
    queryKey: ["dashboard", "weight_trend", userId],
    queryFn: () => getWeightTrendAnalysis(userId, isGuest),
    enabled: Boolean(userId) || isGuest,
  });

  const waterTodayQuery = useQuery({
    queryKey: ["dashboard", "water_today", userId, dayKey],
    queryFn: () => getWaterDayTotal(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });

  const waterGoalQuery = useQuery({
    queryKey: ["dashboard", "water_goal", userId],
    queryFn: () => getWaterGoal(userId, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const waterWeekQuery = useQuery({
    queryKey: ["dashboard", "water_week", userId, dayKey],
    queryFn: () => getWaterWeeklySummary(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });

  const recentWaterQuery = useQuery({
    queryKey: ["dashboard", "recent_water", userId],
    queryFn: () => listRecentWaterLogs(userId, 3, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const waterMonthQuery = useQuery({
    queryKey: ["dashboard", "water_month", userId, dayKey],
    queryFn: async () => {
      const to = new Date(today);
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      const totals = await getWaterRangeTotals(userId, from, to, { isGuest, timeZone });
      if (totals.length === 0) return 0;
      return Math.round(totals.reduce((acc, item) => acc + item.total_ml, 0) / totals.length);
    },
    enabled: Boolean(userId) || isGuest,
  });

  const sleepDayQuery = useQuery({
    queryKey: ["dashboard", "sleep_day", userId, dayKey],
    queryFn: () => getSleepDay(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });

  const sleepGoalQuery = useQuery({
    queryKey: ["dashboard", "sleep_goal", userId],
    queryFn: () => getSleepGoal(userId, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const sleepWeekQuery = useQuery({
    queryKey: ["dashboard", "sleep_week", userId, dayKey],
    queryFn: () => getSleepWeeklySummary(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });

  const sleepMonthQuery = useQuery({
    queryKey: ["dashboard", "sleep_month", userId, dayKey],
    queryFn: async () => {
      const to = new Date(today);
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      const totals = await getSleepRangeTotals(userId, from, to, { isGuest, timeZone });
      if (totals.length === 0) return 0;
      return Math.round(totals.reduce((acc, item) => acc + item.total_minutes, 0) / totals.length);
    },
    enabled: Boolean(userId) || isGuest,
  });

  const recentSleepQuery = useQuery({
    queryKey: ["dashboard", "recent_sleep", userId],
    queryFn: () => listRecentSleepLogs(userId, 3, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });
  const biofeedbackTodayQuery = useQuery({
    queryKey: ["dashboard", "biofeedback_today", userId, dayKey],
    queryFn: () => getDailyBiofeedback(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });
  const biofeedbackWeekQuery = useQuery({
    queryKey: ["dashboard", "biofeedback_week", userId, dayKey],
    queryFn: () => getBiofeedbackWeeklyAverages(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });
  const recentBiofeedbackQuery = useQuery({
    queryKey: ["dashboard", "biofeedback_recent", userId],
    queryFn: () => listRecentBiofeedback(userId, 3, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });
  const bodyCompositionQuery = useQuery({
    queryKey: ["dashboard", "body_composition", userId],
    queryFn: () => getLatestBodyMeasurement(userId, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });
  const weeklyReviewQuery = useQuery({
    queryKey: ["dashboard", "weekly_review", userId, dayKey],
    queryFn: () => getWeeklyReviewSummary(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });
  const todayNoteQuery = useQuery({
    queryKey: ["dashboard", "daily_note_today", userId, dayKey],
    queryFn: () => getDailyNote(userId, today, { isGuest, timeZone }),
    enabled: Boolean(userId) || isGuest,
  });
  const latestNoteQuery = useQuery({
    queryKey: ["dashboard", "daily_note_latest", userId],
    queryFn: () => getLatestDailyNote(userId, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const goal = getUserGoal(profile, isGuest);
  const latestWeight = weightQuery.data?.latest ? Number(weightQuery.data.latest.weight_kg) : null;
  const initialWeight = weightQuery.data?.first ? Number(weightQuery.data.first.weight_kg) : (profile?.weight ?? null);
  const goalProgress = getGoalProgress({
    current: latestWeight,
    initial: initialWeight,
    goal: goal.target_weight_kg,
    start: goal.start_weight_kg,
    direction: goal.goal_direction,
  });
  const remainingKg =
    goal.target_weight_kg !== null && latestWeight !== null
      ? Number(goal.target_weight_kg - latestWeight)
      : null;
  const waterGoalMl = waterGoalQuery.data?.water_goal_ml ?? (profile?.water_goal_ml ?? 2000);
  const waterTodayMl = waterTodayQuery.data ?? 0;
  const waterProgress = calculateWaterProgress(waterTodayMl, waterGoalMl);
  const sleepTodayMinutes = sleepDayQuery.data?.total_minutes ?? 0;
  const sleepGoalMinutes = sleepGoalQuery.data?.sleep_goal_minutes ?? (profile?.sleep_goal_minutes ?? 480);
  const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

  const sleepQualityNorm =
    biofeedbackTodayQuery.data?.sleep_quality !== undefined && biofeedbackTodayQuery.data?.sleep_quality !== null
      ? clamp(biofeedbackTodayQuery.data.sleep_quality / 10)
      : clamp(sleepTodayMinutes / Math.max(sleepGoalMinutes, 1));
  const dailyEnergyNorm = clamp((biofeedbackTodayQuery.data?.daily_energy ?? biofeedbackWeekQuery.data?.avg_energy ?? 5) / 10);
  const stressNorm = clamp(1 - (biofeedbackTodayQuery.data?.perceived_stress ?? biofeedbackWeekQuery.data?.avg_stress ?? 5) / 10);
  const trainingEnergyNorm = clamp(
    (biofeedbackTodayQuery.data?.training_energy ?? biofeedbackWeekQuery.data?.avg_training_energy ?? 5) / 10,
  );
  const hydrationNorm = clamp(waterTodayMl / Math.max(waterGoalMl, 1));

  const recoveryScore = Math.round(
    100 * (sleepQualityNorm * 0.3 + dailyEnergyNorm * 0.2 + stressNorm * 0.2 + trainingEnergyNorm * 0.15 + hydrationNorm * 0.15),
  );
  const recoveryStatus =
    recoveryScore >= 75 ? "Recuperacion alta" : recoveryScore >= 50 ? "Recuperacion moderada" : "Recuperacion baja";

  const recoveryFactors: string[] = [];
  if (sleepQualityNorm < 0.5) recoveryFactors.push("Sueno bajo");
  if (dailyEnergyNorm < 0.5) recoveryFactors.push("Energia diaria baja");
  if (stressNorm < 0.45) recoveryFactors.push("Estres alto");
  if (trainingEnergyNorm < 0.5) recoveryFactors.push("Energia de entrenamiento baja");
  if (hydrationNorm < 0.6) recoveryFactors.push("Hidratacion insuficiente");
  if (recoveryFactors.length === 0) recoveryFactors.push("Variables estables");

  const weightTrend = useMemo(() => {
    const trend = weightTrendQuery.data?.trend;
    if (!trend) return "sin datos suficientes";
    if (trend === "up") return "subiendo";
    if (trend === "down") return "bajando";
    return "estable";
  }, [weightTrendQuery.data?.trend]);

  const displayName = isGuest ? "Guest" : profile?.full_name?.trim() || user?.email || "User";
  const todayLabel = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full",
    timeZone,
  }).format(today);

  return {
    displayName,
    todayLabel,
    isGuest,
    weight: {
      latest: latestWeight,
      initial: initialWeight,
      initialDate: weightQuery.data?.first?.measured_at ?? null,
      weeklyDelta: weightTrendQuery.data?.weeklyChange ?? weightQuery.data?.weeklyDelta ?? null,
      movingAvg7: weightTrendQuery.data?.movingAvg7 ?? null,
      prevMovingAvg7: weightTrendQuery.data?.prevMovingAvg7 ?? null,
      trend: weightTrend,
      latestEntry: weightQuery.data?.latest ?? null,
      loading: weightQuery.isLoading || weightTrendQuery.isLoading,
      error: weightQuery.error || weightTrendQuery.error,
    },
    goal: {
      target: goal.target_weight_kg,
      progress: goalProgress,
      remainingKg,
      loading: weightQuery.isLoading,
      error: weightQuery.error,
    },
    water: {
      todayMl: waterTodayMl,
      goalMl: waterGoalMl,
      progress: waterProgress,
      weekAverageMl: waterWeekQuery.data?.average_ml ?? 0,
      monthAverageMl: waterMonthQuery.data ?? 0,
      weekDaysMet: waterWeekQuery.data?.days_met ?? 0,
      weekDaysTotal: waterWeekQuery.data?.days_total ?? 7,
      loading: waterTodayQuery.isLoading || waterGoalQuery.isLoading || waterWeekQuery.isLoading || waterMonthQuery.isLoading,
      error: waterTodayQuery.error || waterGoalQuery.error || waterWeekQuery.error || waterMonthQuery.error,
      recentLogs: recentWaterQuery.data ?? [],
    },
    sleep: {
      todayMinutes: sleepTodayMinutes,
      goalMinutes: sleepGoalMinutes,
      weekAverageMinutes: sleepWeekQuery.data?.average_minutes ?? 0,
      monthAverageMinutes: sleepMonthQuery.data ?? 0,
      weekDaysMet: sleepWeekQuery.data?.days_met ?? 0,
      weekDaysTotal: sleepWeekQuery.data?.days_total ?? 7,
      loading: sleepDayQuery.isLoading || sleepGoalQuery.isLoading || sleepWeekQuery.isLoading || sleepMonthQuery.isLoading,
      error: sleepDayQuery.error || sleepGoalQuery.error || sleepWeekQuery.error || sleepMonthQuery.error,
      recentLogs: recentSleepQuery.data ?? [],
    },
    biofeedback: {
      today: biofeedbackTodayQuery.data,
      weekAverages: biofeedbackWeekQuery.data ?? {
        days_logged: 0,
        avg_sleep_quality: 0,
        avg_energy: 0,
        avg_stress: 0,
        avg_training_energy: 0,
      },
      recentLogs: recentBiofeedbackQuery.data ?? [],
      loading: biofeedbackTodayQuery.isLoading || biofeedbackWeekQuery.isLoading || recentBiofeedbackQuery.isLoading,
      error: biofeedbackTodayQuery.error || biofeedbackWeekQuery.error || recentBiofeedbackQuery.error,
    },
    bodyComposition: {
      latest: bodyCompositionQuery.data ?? null,
      loading: bodyCompositionQuery.isLoading,
      error: bodyCompositionQuery.error,
    },
    weeklyReview: {
      summary: weeklyReviewQuery.data ?? null,
      loading: weeklyReviewQuery.isLoading,
      error: weeklyReviewQuery.error,
    },
    recovery: {
      score: recoveryScore,
      status: recoveryStatus,
      factors: recoveryFactors,
      hydrationPct: Math.round(hydrationNorm * 100),
      loading: waterTodayQuery.isLoading || waterGoalQuery.isLoading || biofeedbackTodayQuery.isLoading || biofeedbackWeekQuery.isLoading,
      error: waterTodayQuery.error || waterGoalQuery.error || biofeedbackTodayQuery.error || biofeedbackWeekQuery.error,
    },
    notes: {
      today: todayNoteQuery.data ?? null,
      latest: latestNoteQuery.data ?? null,
      loading: todayNoteQuery.isLoading || latestNoteQuery.isLoading,
      error: todayNoteQuery.error || latestNoteQuery.error,
    },
  };
};
