import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ClipboardList, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { calculateGoalProgress, resolveInitialWeight, type GoalDirection } from "@/features/goals/goalProgress";
import {
  BodyMetricEntry,
  getGuestBodyMetrics,
  getGuestWeightGoal,
  getWeightTrendAnalysis,
  listBodyMetricsByRange,
} from "@/services/bodyMetrics";
import { getSleepGoal, getSleepRangeTotals } from "@/services/sleep";
import { getBiofeedbackRange, getBiofeedbackWeeklyAverages } from "@/services/dailyBiofeedback";
import { getBodyMeasurementsRange, getLatestBodyMeasurement } from "@/services/bodyMeasurements";
import { getNutritionGoals, getNutritionRangeSummary } from "@/services/nutrition";
import { getWeeklyReviewObservation, getWeeklyReviewSummary, upsertWeeklyReviewObservation } from "@/services/weeklyReview";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Range = "7d" | "30d" | "90d" | "all";
type HydrationState = "dry" | "retention" | "variable";
type TrainingPerformance = "better" | "same" | "worse";

const formatNumber = (n: number | null) => (n === null ? "--" : n.toFixed(1));

const findOnOrBefore = (entriesAsc: BodyMetricEntry[], targetISO: string) => {
  const candidates = entriesAsc.filter((e) => e.measured_at <= targetISO);
  if (candidates.length > 0) return candidates[candidates.length - 1];
  return entriesAsc[0] ?? null;
};

const trendLabel = (trend: "up" | "down" | "stable" | null) => {
  if (trend === "up") return "Subiendo";
  if (trend === "down") return "Bajando";
  if (trend === "stable") return "Estable";
  return "--";
};

const Stats = () => {
  const { user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();
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
  const [range, setRange] = useState<Range>("30d");
  const weekStartDate = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekKey = weekStartDate.toISOString().slice(0, 10);
  const [hydrationState, setHydrationState] = useState<HydrationState>("variable");
  const [trainingPerformance, setTrainingPerformance] = useState<TrainingPerformance>("same");
  const [weeklyNotes, setWeeklyNotes] = useState("");

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
    enabled: Boolean(user?.id) || isGuest,
  });

  const guestEntries = useMemo(
    () => (isGuest ? getGuestBodyMetrics().sort((a, b) => a.measured_at.localeCompare(b.measured_at)) : []),
    [isGuest],
  );
  const allEntries = isGuest ? guestEntries : allEntriesFromDb;
  const entriesForChart = isGuest
    ? guestEntries.filter((e) => {
        if (range === "all") return true;
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        return e.measured_at >= fromDate.toISOString().slice(0, 10);
      })
    : chartEntries;

  const latest = allEntries.length ? allEntries[allEntries.length - 1] : null;
  const latestWeight = latest ? Number(latest.weight_kg) : null;
  const initialWeight = resolveInitialWeight(allEntries, profile?.weight ?? null);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const ref7 = findOnOrBefore(allEntries, sevenDaysAgo);
  const ref30 = findOnOrBefore(allEntries, thirtyDaysAgo);
  const delta7 = latestWeight !== null && ref7 ? latestWeight - Number(ref7.weight_kg) : null;
  const delta30 = latestWeight !== null && ref30 ? latestWeight - Number(ref30.weight_kg) : null;

  const last7Entries = allEntries.filter((e) => e.measured_at >= sevenDaysAgo);
  const weeklyAvg =
    last7Entries.length > 0
      ? last7Entries.reduce((acc, e) => acc + Number(e.weight_kg), 0) / last7Entries.length
      : null;

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

  const chartData = entriesForChart.map((entry, index) => {
    const from = Math.max(0, index - 6);
    const slice = entriesForChart.slice(from, index + 1);
    const movingAvg7 = slice.length ? slice.reduce((acc, row) => acc + Number(row.weight_kg), 0) / slice.length : null;
    return {
      date: entry.measured_at,
      weight: Number(entry.weight_kg),
      movingAvg7: movingAvg7 !== null ? Number(movingAvg7.toFixed(2)) : null,
    };
  });

  const { data: sleepGoalData = { sleep_goal_minutes: 480 } } = useQuery({
    queryKey: ["sleep_goal", user?.id],
    queryFn: () => getSleepGoal(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
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
    enabled: Boolean(user?.id) || isGuest,
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
    enabled: Boolean(user?.id) || isGuest,
  });
  const sleepWeekAvg = sleepWeekTotals.length
    ? sleepWeekTotals.reduce((sum, row) => sum + row.total_minutes, 0) / sleepWeekTotals.length
    : 0;
  const sleepMonthAvg = sleepMonthTotals.length
    ? sleepMonthTotals.reduce((sum, row) => sum + row.total_minutes, 0) / sleepMonthTotals.length
    : 0;
  const sleepWeekMet = sleepWeekTotals.filter((row) => row.total_minutes >= sleepGoalData.sleep_goal_minutes).length;

  const { data: biofeedbackWeek } = useQuery({
    queryKey: ["stats_biofeedback_week", user?.id, isGuest, timeZone],
    queryFn: () => getBiofeedbackWeeklyAverages(user?.id ?? null, new Date(), { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
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
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: latestMeasurement } = useQuery({
    queryKey: ["stats_latest_measurement", user?.id, isGuest],
    queryFn: () => getLatestBodyMeasurement(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: bodyMeasurementRows = [] } = useQuery({
    queryKey: ["stats_measurements_range", user?.id, isGuest, timeZone],
    queryFn: async () => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 180);
      return getBodyMeasurementsRange(user?.id ?? null, from, to, { isGuest, timeZone });
    },
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: weeklyReview } = useQuery({
    queryKey: ["stats_weekly_review", user?.id, isGuest, timeZone],
    queryFn: () => getWeeklyReviewSummary(user?.id ?? null, new Date(), { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: weeklyObservation } = useQuery({
    queryKey: ["weekly_review_observation", user?.id, weekKey, isGuest],
    queryFn: () => getWeeklyReviewObservation(user?.id ?? null, weekStartDate, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: nutritionGoals } = useQuery({
    queryKey: ["stats_nutrition_goals", user?.id, isGuest, metabolicProfileKey],
    queryFn: () =>
      getNutritionGoals(user?.id ?? null, { isGuest, profile: profile as any }).catch(() => ({
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
    enabled: Boolean(user?.id) || isGuest,
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
    enabled: Boolean(user?.id) || isGuest,
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
    enabled: Boolean(user?.id) || isGuest,
  });

  const bodyFatChartData = bodyMeasurementRows
    .filter((row) => row.body_fat_pct !== null)
    .map((row) => ({
      date: row.date_key,
      body_fat_pct: Number(row.body_fat_pct),
    }));

  const biofeedbackChartData = biofeedbackRows.map((row) => ({
    date: row.date_key,
    energy: row.daily_energy,
    stress: row.perceived_stress,
    sleep_quality: row.sleep_quality,
  }));

  const hasInitialFallback = initialWeight === null;

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
      toast.success("Revisión semanal guardada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["weekly_review_observation"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_weekly_review"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar la revisión semanal.");
    },
  });

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {isGuest && <GuestWarningBanner />}

      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Progreso</h1>
          <p className="text-sm text-muted-foreground">Análisis longitudinal, tendencias y revisión semanal en un solo contexto.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumen de meta de peso
          </CardTitle>
          <CardDescription>Las metas se gestionan en Perfil Fitness.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-6">
            <div>
              <p className="text-muted-foreground">Actual</p>
              <p className="font-semibold">{formatNumber(latestWeight)} kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Inicial</p>
              <p className="font-semibold">{hasInitialFallback ? "Aún no definido" : `${formatNumber(initialWeight)} kg`}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Objetivo</p>
              <p className="font-semibold">{formatNumber(target)} kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fecha objetivo</p>
              <p className="font-semibold">{targetDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Restante</p>
              <p className="font-semibold">{remaining === null ? "--" : `${remaining > 0 ? "+" : ""}${remaining.toFixed(1)} kg`}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Progreso</p>
              <p className="font-semibold">{progress === null ? "--" : `${progress.toFixed(0)}%`}</p>
            </div>
          </div>

          {hasInitialFallback && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/today#weight">Registrar peso</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/onboarding">Completar onboarding</Link>
              </Button>
            </div>
          )}

          <Button asChild>
            <Link to="/fitness-profile">{target === null ? "Crear meta" : "Gestionar meta"}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Peso mas reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(latestWeight)} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cambio vs 7d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{delta7 === null ? "--" : `${delta7 > 0 ? "+" : ""}${delta7.toFixed(1)} kg`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Promedio movil 7d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {weightTrendData?.movingAvg7 === null || weightTrendData?.movingAvg7 === undefined
                ? "--"
                : `${weightTrendData.movingAvg7.toFixed(2)} kg`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tendencia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{trendLabel(weightTrendData?.trend ?? null)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Resumen de sueño</CardTitle>
          <CardDescription>Meta y tendencias desde registros de sueño.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-xl font-semibold">{(sleepGoalData.sleep_goal_minutes / 60).toFixed(1)} h</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Promedio (7d)</p>
            <p className="text-xl font-semibold">{(sleepWeekAvg / 60).toFixed(1)} h</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Promedio (30d)</p>
            <p className="text-xl font-semibold">{(sleepMonthAvg / 60).toFixed(1)} h</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Días cumplidos</p>
            <p className="text-xl font-semibold">{sleepWeekMet}/7</p>
          </div>
          <div className="md:col-span-4">
            <Button asChild variant="outline">
              <Link to="/today#sleep">Sueño</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de alimentación</CardTitle>
          <CardDescription>Calorías y macros promedio en 7 y 30 días.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Calorías (7d)</p>
            <p className="text-xl font-semibold">{nutrition7d?.averages.calories ?? 0} kcal</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Proteína (7d)</p>
            <p className="text-xl font-semibold">{nutrition7d?.averages.protein_g ?? 0} g</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Carbs (30d)</p>
            <p className="text-xl font-semibold">{nutrition30d?.averages.carbs_g ?? 0} g</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Grasas (30d)</p>
            <p className="text-xl font-semibold">{nutrition30d?.averages.fat_g ?? 0} g</p>
          </div>
          <div className="md:col-span-4 text-xs text-muted-foreground">
            Objetivos: {nutritionGoals?.calorie_goal ?? 2000} kcal | P {nutritionGoals?.protein_goal_g ?? 150}g | C{" "}
            {nutritionGoals?.carb_goal_g ?? 250}g | G {nutritionGoals?.fat_goal_g ?? 70}g
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Biofeedback semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">Energía: {biofeedbackWeek?.avg_energy ?? 0}/10</p>
            <p className="font-semibold">Estrés: {biofeedbackWeek?.avg_stress ?? 0}/10</p>
            <p className="font-semibold">Calidad de sueño: {biofeedbackWeek?.avg_sleep_quality ?? 0}/10</p>
            <p className="text-xs text-muted-foreground">Días registrados: {biofeedbackWeek?.days_logged ?? 0}/7</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/today#biofeedback">Abrir biofeedback</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
          <CardTitle className="text-sm">Composición corporal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">
              Grasa corporal:{" "}
              {latestMeasurement?.body_fat_pct === null || latestMeasurement?.body_fat_pct === undefined
                ? "--"
                : `${Number(latestMeasurement.body_fat_pct).toFixed(1)}%`}
            </p>
            <p className="font-semibold">
              Masa grasa:{" "}
              {latestMeasurement?.fat_mass_kg === null || latestMeasurement?.fat_mass_kg === undefined
                ? "--"
                : `${Number(latestMeasurement.fat_mass_kg).toFixed(1)} kg`}
            </p>
            <p className="font-semibold">
              Masa magra:{" "}
              {latestMeasurement?.lean_mass_kg === null || latestMeasurement?.lean_mass_kg === undefined
                ? "--"
                : `${Number(latestMeasurement.lean_mass_kg).toFixed(1)} kg`}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/body">Abrir medidas</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
          <CardTitle className="text-sm">Revisión semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">
              Adherencia agua: {weeklyReview?.waterDaysMet ?? 0}/{weeklyReview?.waterDaysTotal ?? 7}
            </p>
            <p className="font-semibold">Días activos: {weeklyReview?.activeDays ?? 0}/7</p>
            <p className="font-semibold">Tendencia de peso: {trendLabel(weeklyReview?.weightTrend ?? null)}</p>
            <p className="text-xs text-muted-foreground">
              Cambio semanal:{" "}
              {weeklyReview?.weightWeeklyChange === null || weeklyReview?.weightWeeklyChange === undefined
                ? "--"
                : `${weeklyReview.weightWeeklyChange > 0 ? "+" : ""}${weeklyReview.weightWeeklyChange.toFixed(2)} kg`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tendencia de peso</CardTitle>
            <CardDescription>Peso corporal y promedio móvil en el tiempo</CardDescription>
          </div>
          <div className="flex gap-2">
            {(["7d", "30d", "90d", "all"] as Range[]).map((r) => (
              <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
                {r.toUpperCase()}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay datos de peso para este rango.</p>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                    formatter={(value: number, name: string) => [`${value} kg`, name === "weight" ? "Peso" : "Promedio móvil 7d"]}
                  />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="movingAvg7" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencias de alimentación (7d)</CardTitle>
            <CardDescription>Última semana de calorías y macros.</CardDescription>
          </CardHeader>
          <CardContent>
            {!nutrition7d?.days?.length ? (
              <p className="text-sm text-muted-foreground">Aún no hay datos de alimentación.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={nutrition7d.days.map((row) => ({
                      date: row.date_key,
                      calories: row.calories,
                      protein_g: row.protein_g,
                      carbs_g: row.carbs_g,
                      fat_g: row.fat_g,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleDateString()} />
                    <Line type="monotone" dataKey="calories" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="protein_g" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="carbs_g" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fat_g" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencias de alimentación (30d)</CardTitle>
            <CardDescription>Calorías y macros por día.</CardDescription>
          </CardHeader>
          <CardContent>
            {!nutrition30d?.days?.length ? (
              <p className="text-sm text-muted-foreground">Aún no hay datos de alimentación.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={nutrition30d.days.map((row) => ({
                      date: row.date_key,
                      calories: row.calories,
                      protein_g: row.protein_g,
                      carbs_g: row.carbs_g,
                      fat_g: row.fat_g,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleDateString()} />
                    <Line type="monotone" dataKey="calories" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="protein_g" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="carbs_g" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fat_g" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biofeedback (30d)</CardTitle>
            <CardDescription>Energía, estrés y calidad de sueño por día.</CardDescription>
          </CardHeader>
          <CardContent>
            {biofeedbackChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay datos de biofeedback.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={biofeedbackChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <YAxis domain={[1, 10]} />
                    <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleDateString()} />
                    <Line type="monotone" dataKey="energy" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sleep_quality" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia de grasa corporal</CardTitle>
            <CardDescription>Estimación de grasa corporal desde medidas corporales.</CardDescription>
          </CardHeader>
          <CardContent>
            {bodyFatChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay medidas corporales con grasa corporal.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyFatChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                       formatter={(value: number) => [`${value}%`, "Grasa corporal"]}
                    />
                    <Line type="monotone" dataKey="body_fat_pct" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cambio vs 30d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{delta30 === null ? "--" : `${delta30 > 0 ? "+" : ""}${delta30.toFixed(1)} kg`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Promedio semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{weeklyAvg === null ? "--" : `${weeklyAvg.toFixed(1)} kg`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Promedio movil previo 7d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {weightTrendData?.prevMovingAvg7 === null || weightTrendData?.prevMovingAvg7 === undefined
                ? "--"
                : `${weightTrendData.prevMovingAvg7.toFixed(2)} kg`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card id="weekly-review">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Revisión semanal
          </CardTitle>
          <CardDescription>Observaciones cualitativas para contextualizar las tendencias de la semana.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Adherencia agua</p>
              <p className="text-2xl font-semibold">
                {weeklyReview?.waterDaysMet ?? 0}/{weeklyReview?.waterDaysTotal ?? 7}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Sueño promedio</p>
              <p className="text-2xl font-semibold">{weeklyReview ? (weeklyReview.avgSleepMinutes / 60).toFixed(1) : "0.0"} h</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Días activos</p>
              <p className="text-2xl font-semibold">{weeklyReview?.activeDays ?? 0}/7</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Peso semanal</p>
              <p className="text-2xl font-semibold">
                {weeklyReview?.weightWeeklyChange === null || weeklyReview?.weightWeeklyChange === undefined
                  ? "--"
                  : `${weeklyReview.weightWeeklyChange > 0 ? "+" : ""}${weeklyReview.weightWeeklyChange.toFixed(2)} kg`}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hydration-state">Estado hídrico</Label>
              <select
                id="hydration-state"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={hydrationState}
                onChange={(event) => setHydrationState(event.target.value as HydrationState)}
              >
                <option value="dry">Seco</option>
                <option value="retention">Retención</option>
                <option value="variable">Variable</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-performance">Rendimiento entrenamiento</Label>
              <select
                id="training-performance"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={trainingPerformance}
                onChange={(event) => setTrainingPerformance(event.target.value as TrainingPerformance)}
              >
                <option value="better">Mejor</option>
                <option value="same">Igual</option>
                <option value="worse">Peor</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekly-notes">Notas de la semana</Label>
            <Textarea
              id="weekly-notes"
              value={weeklyNotes}
              onChange={(event) => setWeeklyNotes(event.target.value)}
              placeholder="Factores que explican el rendimiento, adherencia o recuperación de esta semana..."
            />
          </div>

          <Button onClick={() => saveWeeklyReviewMutation.mutate()} disabled={saveWeeklyReviewMutation.isPending}>
            {saveWeeklyReviewMutation.isPending ? "Guardando..." : "Guardar revisión semanal"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;
