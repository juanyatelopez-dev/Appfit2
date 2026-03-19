import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { deriveMeasurementSummary, filterMeasurementsByRangePreset } from "@/features/bodyMeasurements/measurementInsights";
import { deriveDashboardPhysicalSummary } from "@/features/dashboard/physicalProgress";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import {
  getBodyWeightSnapshot,
  getWeightTrendAnalysis,
  resolveWeightReferenceFromEntries,
} from "@/services/bodyMetrics";
import { listBodyMeasurements } from "@/services/bodyMeasurements";
import { upsertDailyNote } from "@/services/dailyNotes";
import { getNutritionDaySummary } from "@/services/nutrition";
import { getGoalProgress, getUserGoal } from "@/services/goals";
import { getActivityRangeSnapshot } from "@/services/activitySnapshot";
import { getDashboardOperationalSnapshot } from "@/services/dashboardOperationalSnapshot";
import { computeRecoveryScore } from "@/utils/dashboard";
import type { DailyBiofeedback } from "@/services/dailyBiofeedback";

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");

export const useDashboardSnapshot = (currentMonth: Date) => {
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
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
  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKeyForTimezone(today, timeZone);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthActivityQuery = useQuery({
    queryKey: ["dashboard_snapshot", "month_activity", userId, formatDateKey(gridStart), formatDateKey(gridEnd), isGuest, timeZone],
    queryFn: async () => {
      const activityRows = await getActivityRangeSnapshot(userId, gridStart, gridEnd, { isGuest, timeZone });

      const days = new Map<
        string,
        {
          dateKey: string;
          waterMl: number;
          sleepMinutes: number;
          weightKg: number | null;
          hasWater: boolean;
          hasSleep: boolean;
          hasWeight: boolean;
          hasBiofeedback: boolean;
          hasNote: boolean;
          hasNutrition: boolean;
        }
      >();

      let cursor = new Date(gridStart);
      while (cursor <= gridEnd) {
        const dateKey = formatDateKey(cursor);
        const row = activityRows.find((item) => item.date_key === dateKey);
        days.set(dateKey, {
          dateKey,
          waterMl: row?.water_ml ?? 0,
          sleepMinutes: row?.sleep_minutes ?? 0,
          weightKg: row?.weight_kg ?? null,
          hasWater: row?.has_water ?? false,
          hasSleep: row?.has_sleep ?? false,
          hasWeight: row?.has_weight ?? false,
          hasBiofeedback: row?.has_biofeedback ?? false,
          hasNote: row?.has_note ?? false,
          hasNutrition: row?.has_nutrition ?? false,
        });
        cursor = addDays(cursor, 1);
      }

      return days;
    },
    enabled: Boolean(userId) || isGuest,
    staleTime: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const coreQuery = useQuery({
    queryKey: ["dashboard_snapshot", "core", userId, todayKey, isGuest, timeZone, metabolicProfileKey],
    queryFn: async () => {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const [
        weightSnapshot,
        weightTrend,
        operationalSnapshot,
        allMeasurements,
        nutritionToday,
      ] = await Promise.all([
        getBodyWeightSnapshot(userId, isGuest),
        getWeightTrendAnalysis(userId, isGuest),
        getDashboardOperationalSnapshot(userId, today, { isGuest, timeZone }),
        listBodyMeasurements(userId, { isGuest }),
        getNutritionDaySummary(userId, today, { isGuest, timeZone, profile }).catch(() => null),
      ]);

      const goal = getUserGoal(profile, isGuest);
      const latestWeight = weightSnapshot.latest ? Number(weightSnapshot.latest.weight_kg) : null;
      const initialWeight = weightSnapshot.first ? Number(weightSnapshot.first.weight_kg) : profile?.weight ?? null;
      const goalProgress = getGoalProgress({
        current: latestWeight,
        initial: initialWeight,
        goal: goal.target_weight_kg,
        start: goal.start_weight_kg,
        direction: goal.goal_direction,
      });

      const activeDays7 = new Set<string>();
      operationalSnapshot.water7d.forEach((row) => row.total_ml > 0 && activeDays7.add(row.date_key));
      operationalSnapshot.sleep7d.forEach((row) => row.total_minutes > 0 && activeDays7.add(row.date_key));
      operationalSnapshot.bio7d.forEach((row) => activeDays7.add(row.date_key));
      operationalSnapshot.notes7d.forEach((row) => activeDays7.add(row.date_key));
      weightSnapshot.entries
        .filter((row) => row.measured_at >= formatDateKey(sevenDaysAgo) && row.measured_at <= formatDateKey(today))
        .forEach((row) => activeDays7.add(row.measured_at));

      const recovery = computeRecoveryScore({
        sleepMinutes: operationalSnapshot.sleepDay.total_minutes,
        sleepGoalMinutes: operationalSnapshot.sleepGoalMinutes,
        sleepQuality: operationalSnapshot.bioToday?.sleep_quality ?? null,
        dailyEnergy: operationalSnapshot.bioToday?.daily_energy ?? null,
        perceivedStress: operationalSnapshot.bioToday?.perceived_stress ?? null,
        trainingEnergy: operationalSnapshot.bioToday?.training_energy ?? null,
        hydrationMl: operationalSnapshot.waterTodayMl,
        hydrationGoalMl: operationalSnapshot.waterGoalMl,
        activeDays7: activeDays7.size,
      });

      const measurementSummary = deriveMeasurementSummary(allMeasurements);
      const measurementRange = filterMeasurementsByRangePreset(allMeasurements, "30d");
      const latestMeasurementWeight =
        measurementSummary.latest !== null
          ? resolveWeightReferenceFromEntries(weightSnapshot.entries, measurementSummary.latest.date_key).entry
          : null;
      const physicalSummary = deriveDashboardPhysicalSummary({
        latestMeasurement: measurementSummary.latest,
        recentWeightChangeKg: weightTrend.weeklyChange ?? null,
        latestWeightKg: latestWeight,
        latestWeightEntry: weightSnapshot.latest,
        goalDirection: goal.goal_direction ?? null,
        goalProgressPct: goalProgress,
        waistChange: measurementSummary.waistComparison,
      });

      return {
        displayName: isGuest ? "Guest" : profile?.full_name?.trim() || user?.email || "User",
        todayLabel: new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone }).format(today),
        goal,
        goalProgress,
        latestWeight,
        initialWeight,
        weightSnapshot,
        weightTrend,
        waterTodayMl: operationalSnapshot.waterTodayMl,
        waterGoalMl: operationalSnapshot.waterGoalMl,
        water7d: operationalSnapshot.water7d,
        sleepDay: operationalSnapshot.sleepDay,
        sleepGoalMinutes: operationalSnapshot.sleepGoalMinutes,
        sleep7d: operationalSnapshot.sleep7d,
        bioToday: operationalSnapshot.bioToday,
        bio7d: operationalSnapshot.bio7d,
        notes7d: operationalSnapshot.notes7d,
        activeDays7: activeDays7.size,
        recovery,
        latestMeasurement: measurementSummary.latest,
        latestMeasurementWeight: latestMeasurementWeight ? Number(latestMeasurementWeight.weight_kg) : null,
        nutritionToday,
        measurementRange,
        previousMeasurement: measurementSummary.previous,
        waistComparison: measurementSummary.waistComparison,
        physicalSummary,
        noteToday: operationalSnapshot.noteToday,
        noteLatest: operationalSnapshot.noteLatest,
      };
    },
    enabled: Boolean(userId) || isGuest,
    staleTime: 10_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const trends = useMemo(() => {
    const weightRows = coreQuery.data?.weightSnapshot?.entries ?? [];
    const weightMap = new Map<string, number>();
    weightRows.forEach((row) => weightMap.set(row.measured_at, Number(row.weight_kg)));
    const bioMap = new Map<string, DailyBiofeedback>();
    (coreQuery.data?.bio7d ?? []).forEach((row) => bioMap.set(row.date_key, row));
    const notesMap = new Set((coreQuery.data?.notes7d ?? []).map((row) => row.date_key));
    const measurementMap = new Map<string, { waistCm: number | null; bodyFatPct: number | null }>();
    (coreQuery.data?.measurementRange ?? []).forEach((row) =>
      measurementMap.set(row.date_key, {
        waistCm: row.waist_cm !== null && row.waist_cm !== undefined ? Number(row.waist_cm) : null,
        bodyFatPct: row.body_fat_pct !== null && row.body_fat_pct !== undefined ? Number(row.body_fat_pct) : null,
      }),
    );

    const waterGoalMl = Number(coreQuery.data?.waterGoalMl ?? 2000);
    const sleepGoalMinutes = Number(coreQuery.data?.sleepGoalMinutes ?? 480);

    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateKey = formatDateKey(date);
      const water = coreQuery.data?.water7d?.find((row) => row.date_key === dateKey)?.total_ml ?? 0;
      const sleep = coreQuery.data?.sleep7d?.find((row) => row.date_key === dateKey)?.total_minutes ?? 0;
      const weight = weightMap.get(dateKey) ?? null;
      const bio = bioMap.get(dateKey);
      const measurement = measurementMap.get(dateKey);
      const hasBio = Boolean(bio);
      const hasMeasurement = Boolean(measurement);
      const completionCount =
        Number(water > 0) +
        Number(sleep > 0) +
        Number(weight !== null) +
        Number(hasBio) +
        Number(notesMap.has(dateKey)) +
        Number(hasMeasurement);
      const goalHits = Number(water >= waterGoalMl) + Number(sleep >= sleepGoalMinutes);

      return {
        dateKey,
        label: format(date, "dd/MM"),
        water,
        sleep,
        sleep_hours: Number((sleep / 60).toFixed(2)),
        weight,
        sleep_quality: bio?.sleep_quality ?? null,
        energy: bio?.daily_energy ?? null,
        stress: bio?.perceived_stress ?? null,
        training_energy: bio?.training_energy ?? null,
        hunger: bio?.hunger_level ?? null,
        digestion: bio?.digestion ?? null,
        libido: bio?.libido ?? null,
        waist_cm: measurement?.waistCm ?? null,
        body_fat_pct: measurement?.bodyFatPct ?? null,
        completion_count: completionCount,
        goal_hits: goalHits,
      };
    });
    return days;
  }, [
    coreQuery.data?.bio7d,
    coreQuery.data?.measurementRange,
    coreQuery.data?.notes7d,
    coreQuery.data?.sleep7d,
    coreQuery.data?.sleepGoalMinutes,
    coreQuery.data?.water7d,
    coreQuery.data?.waterGoalMl,
    coreQuery.data?.weightSnapshot?.entries,
    today,
  ]);

  return {
    todayKey,
    monthRange: { monthStart, monthEnd, gridStart, gridEnd },
    monthActivity: monthActivityQuery.data,
    monthActivityLoading: monthActivityQuery.isLoading,
    monthActivityError: monthActivityQuery.error,
    core: coreQuery.data,
    coreLoading: coreQuery.isLoading,
    coreError: coreQuery.error,
    trends,
    saveTodayNote: async (params: { title?: string | null; content: string }) =>
      upsertDailyNote({
        userId,
        date: today,
        title: params.title ?? null,
        content: params.content,
        isGuest,
        timeZone,
      }),
  };
};
