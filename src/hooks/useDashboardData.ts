import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { getBodyWeightSnapshot } from "@/services/bodyMetrics";
import { getGoalProgress, getUserGoal } from "@/services/goals";
import { getWaterDayTotal, getWaterGoal, getWaterRangeTotals, getWaterWeeklySummary, listRecentWaterLogs } from "@/services/waterIntake";
import { calculateWaterProgress, DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";

export const useDashboardData = () => {
  // Aggregates dashboard data in parallel so cards can render independently.
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const today = useMemo(() => new Date(), []);
  const dayKey = getDateKeyForTimezone(today, timeZone);

  const weightQuery = useQuery({
    queryKey: ["dashboard", "weight_snapshot", userId],
    queryFn: () => getBodyWeightSnapshot(userId, isGuest),
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

  const weightTrend = useMemo(() => {
    const delta = weightQuery.data?.weeklyDelta;
    if (delta === null || delta === undefined) return "sin datos suficientes";
    if (Math.abs(delta) < 0.2) return "estable";
    return delta < 0 ? "bajando" : "subiendo";
  }, [weightQuery.data?.weeklyDelta]);

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
      weeklyDelta: weightQuery.data?.weeklyDelta ?? null,
      trend: weightTrend,
      latestEntry: weightQuery.data?.latest ?? null,
      loading: weightQuery.isLoading,
      error: weightQuery.error,
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
  };
};
