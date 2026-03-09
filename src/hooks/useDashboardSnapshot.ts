import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getBodyWeightSnapshot, getGuestBodyMetrics, getWeightTrendAnalysis, listBodyMetricsByRange } from "@/services/bodyMetrics";
import { getBiofeedbackRange, getDailyBiofeedback } from "@/services/dailyBiofeedback";
import { getBodyMeasurementsRange, getLatestBodyMeasurement } from "@/services/bodyMeasurements";
import { getDailyNote, getLatestDailyNote, listDailyNotesByRange, upsertDailyNote } from "@/services/dailyNotes";
import { getGoalProgress, getUserGoal } from "@/services/goals";
import { getSleepDay, getSleepGoal, getSleepRangeTotals } from "@/services/sleep";
import { getWaterDayTotal, getWaterGoal, getWaterRangeTotals } from "@/services/waterIntake";
import { computeRecoveryScore } from "@/utils/dashboard";

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");

export const useDashboardSnapshot = (currentMonth: Date) => {
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
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
      const [waterTotals, sleepTotals, bioRows, notesRows, weightRows] = await Promise.all([
        getWaterRangeTotals(userId, gridStart, gridEnd, { isGuest, timeZone }),
        getSleepRangeTotals(userId, gridStart, gridEnd, { isGuest, timeZone }),
        getBiofeedbackRange(userId, gridStart, gridEnd, { isGuest, timeZone }),
        listDailyNotesByRange(userId, gridStart, gridEnd, { isGuest, timeZone }),
        isGuest ? Promise.resolve(getGuestBodyMetrics()) : listBodyMetricsByRange(userId, "all", false),
      ]);

      const waterMap = new Map<string, number>();
      waterTotals.forEach((row) => waterMap.set(row.date_key, Number(row.total_ml || 0)));
      const sleepMap = new Map<string, number>();
      sleepTotals.forEach((row) => sleepMap.set(row.date_key, Number(row.total_minutes || 0)));
      const bioMap = new Map<string, boolean>();
      bioRows.forEach((row) => bioMap.set(row.date_key, true));
      const notesMap = new Map<string, boolean>();
      notesRows.forEach((row) => notesMap.set(row.date_key, true));
      const weightMap = new Map<string, number>();
      weightRows.forEach((row) => {
        if (row.measured_at >= formatDateKey(gridStart) && row.measured_at <= formatDateKey(gridEnd)) {
          weightMap.set(row.measured_at, Number(row.weight_kg));
        }
      });

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
        }
      >();

      let cursor = new Date(gridStart);
      while (cursor <= gridEnd) {
        const dateKey = formatDateKey(cursor);
        const waterMl = waterMap.get(dateKey) ?? 0;
        const sleepMinutes = sleepMap.get(dateKey) ?? 0;
        const weightKg = weightMap.get(dateKey) ?? null;
        days.set(dateKey, {
          dateKey,
          waterMl,
          sleepMinutes,
          weightKg,
          hasWater: waterMl > 0,
          hasSleep: sleepMinutes > 0,
          hasWeight: weightKg !== null,
          hasBiofeedback: bioMap.get(dateKey) ?? false,
          hasNote: notesMap.get(dateKey) ?? false,
        });
        cursor = addDays(cursor, 1);
      }

      return days;
    },
    enabled: Boolean(userId) || isGuest,
  });

  const coreQuery = useQuery({
    queryKey: ["dashboard_snapshot", "core", userId, todayKey, isGuest, timeZone, metabolicProfileKey],
    queryFn: async () => {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

      const [
        weightSnapshot,
        weightTrend,
        waterTodayMl,
        waterGoal,
        water7d,
        sleepDay,
        sleepGoal,
        sleep7d,
        bioToday,
        bio7d,
        notes7d,
        latestMeasurement,
        measurementRange,
        noteToday,
        noteLatest,
      ] = await Promise.all([
        getBodyWeightSnapshot(userId, isGuest),
        getWeightTrendAnalysis(userId, isGuest),
        getWaterDayTotal(userId, today, { isGuest, timeZone }),
        getWaterGoal(userId, { isGuest }),
        getWaterRangeTotals(userId, sevenDaysAgo, today, { isGuest, timeZone }),
        getSleepDay(userId, today, { isGuest, timeZone }),
        getSleepGoal(userId, { isGuest }),
        getSleepRangeTotals(userId, sevenDaysAgo, today, { isGuest, timeZone }),
        getDailyBiofeedback(userId, today, { isGuest, timeZone }),
        getBiofeedbackRange(userId, sevenDaysAgo, today, { isGuest, timeZone }),
        listDailyNotesByRange(userId, sevenDaysAgo, today, { isGuest, timeZone }),
        getLatestBodyMeasurement(userId, { isGuest }),
        getBodyMeasurementsRange(userId, thirtyDaysAgo, today, { isGuest, timeZone }),
        getDailyNote(userId, today, { isGuest, timeZone }),
        getLatestDailyNote(userId, { isGuest }),
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
      water7d.forEach((row) => row.total_ml > 0 && activeDays7.add(row.date_key));
      sleep7d.forEach((row) => row.total_minutes > 0 && activeDays7.add(row.date_key));
      bio7d.forEach((row) => activeDays7.add(row.date_key));
      notes7d.forEach((row) => activeDays7.add(row.date_key));
      weightSnapshot.entries
        .filter((row) => row.measured_at >= formatDateKey(sevenDaysAgo) && row.measured_at <= formatDateKey(today))
        .forEach((row) => activeDays7.add(row.measured_at));

      const recovery = computeRecoveryScore({
        sleepMinutes: sleepDay.total_minutes,
        sleepGoalMinutes: sleepGoal.sleep_goal_minutes,
        sleepQuality: bioToday?.sleep_quality ?? null,
        dailyEnergy: bioToday?.daily_energy ?? null,
        perceivedStress: bioToday?.perceived_stress ?? null,
        trainingEnergy: bioToday?.training_energy ?? null,
        hydrationMl: waterTodayMl,
        hydrationGoalMl: waterGoal.water_goal_ml,
        activeDays7: activeDays7.size,
      });

      const measurementRowsDesc = [...measurementRange].sort((a, b) => b.date_key.localeCompare(a.date_key));
      const previousMeasurement = measurementRowsDesc.find((row) => row.id !== latestMeasurement?.id) ?? null;
      const weekRefDate = new Date(today);
      weekRefDate.setDate(weekRefDate.getDate() - 7);
      const weekRefKey = formatDateKey(weekRefDate);
      const weeklyReferenceMeasurement =
        measurementRowsDesc.find((row) => row.date_key <= weekRefKey && row.id !== latestMeasurement?.id) ?? previousMeasurement;
      const weeklyWaistDeltaCm =
        latestMeasurement && weeklyReferenceMeasurement
          ? Number((Number(latestMeasurement.waist_cm) - Number(weeklyReferenceMeasurement.waist_cm)).toFixed(1))
          : null;

      return {
        displayName: isGuest ? "Guest" : profile?.full_name?.trim() || user?.email || "User",
        todayLabel: new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone }).format(today),
        goal,
        goalProgress,
        latestWeight,
        initialWeight,
        weightSnapshot,
        weightTrend,
        waterTodayMl,
        waterGoalMl: waterGoal.water_goal_ml,
        water7d,
        sleepDay,
        sleepGoalMinutes: sleepGoal.sleep_goal_minutes,
        sleep7d,
        bioToday,
        bio7d,
        notes7d,
        activeDays7: activeDays7.size,
        recovery,
        latestMeasurement,
        measurementRange,
        previousMeasurement,
        weeklyWaistDeltaCm,
        noteToday,
        noteLatest,
      };
    },
    enabled: Boolean(userId) || isGuest,
  });

  const trends = useMemo(() => {
    const weightRows = coreQuery.data?.weightSnapshot?.entries ?? [];
    const weightMap = new Map<string, number>();
    weightRows.forEach((row) => weightMap.set(row.measured_at, Number(row.weight_kg)));
    const bioMap = new Map<string, any>();
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
