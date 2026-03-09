import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek } from "date-fns";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { getWeeklyReviewObservation, getWeeklyReviewSummary, upsertWeeklyReviewObservation } from "@/services/weeklyReview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type HydrationState = "dry" | "retention" | "variable";
type TrainingPerformance = "better" | "same" | "worse";
const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const trendLabel = (value: "up" | "down" | "stable") => {
  if (value === "up") return "Subiendo";
  if (value === "down") return "Bajando";
  return "Estable";
};

const WeeklyReview = () => {
  const { user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();

  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const weekStartDate = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekKey = toDateKey(weekStartDate);

  const [hydrationState, setHydrationState] = useState<HydrationState>("variable");
  const [trainingPerformance, setTrainingPerformance] = useState<TrainingPerformance>("same");
  const [notes, setNotes] = useState("");

  const { data: summary } = useQuery({
    queryKey: ["weekly_review_summary", user?.id, weekKey, isGuest, timeZone],
    queryFn: () => getWeeklyReviewSummary(user?.id ?? null, weekStartDate, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: observation } = useQuery({
    queryKey: ["weekly_review_observation", user?.id, weekKey, isGuest],
    queryFn: () => getWeeklyReviewObservation(user?.id ?? null, weekStartDate, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  useEffect(() => {
    if (!observation) {
      setHydrationState("variable");
      setTrainingPerformance("same");
      setNotes("");
      return;
    }
    setHydrationState(observation.hydration_state);
    setTrainingPerformance(observation.training_performance);
    setNotes(observation.notes || "");
  }, [observation]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      upsertWeeklyReviewObservation(
        {
          userId: user?.id ?? null,
          weekStartDate,
          hydration_state: hydrationState,
          training_performance: trainingPerformance,
          notes: notes.trim() || null,
        },
        { isGuest },
      ),
    onSuccess: async () => {
      toast.success("Revision semanal guardada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["weekly_review_observation"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar la revision semanal.");
    },
  });

  const waterAdherencePct =
    summary && summary.waterDaysTotal > 0 ? Math.round((summary.waterDaysMet / summary.waterDaysTotal) * 100) : 0;
  const weekEndLabel = summary?.weekEnd ? new Date(summary.weekEnd).toLocaleDateString() : "-";

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Revision semanal</h1>
          <p className="text-sm text-muted-foreground">Resumen automático de los últimos 7 días + observaciones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Adherencia agua</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{waterAdherencePct}%</p>
            <p className="text-xs text-muted-foreground">
              {summary?.waterDaysMet ?? 0}/{summary?.waterDaysTotal ?? 7} días con meta
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sueño promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary ? (summary.avgSleepMinutes / 60).toFixed(1) : "0.0"} h</p>
            <p className="text-xs text-muted-foreground">Promedio de 7 días</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dias activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary?.activeDays ?? 0}/7</p>
            <p className="text-xs text-muted-foreground">Agua, sueño o biofeedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Adherencia nutricion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary?.nutritionCalorieDaysMet ?? 0}/{summary?.nutritionDaysTotal ?? 7}
            </p>
            <p className="text-xs text-muted-foreground">Días cumpliendo calorías objetivo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de progreso</CardTitle>
          <CardDescription>
            Semana del {weekStartDate.toLocaleDateString()} al {weekEndLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Biofeedback</p>
            <p className="font-medium">Energia: {summary?.avgBioEnergy ?? 0}/10</p>
            <p className="font-medium">Estres: {summary?.avgBioStress ?? 0}/10</p>
            <p className="font-medium">Sueño subjetivo: {summary?.avgBioSleepQuality ?? 0}/10</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Peso</p>
            <p className="font-medium">Tendencia: {summary ? trendLabel(summary.weightTrend) : "Estable"}</p>
            <p className="font-medium">
              Cambio semanal:{" "}
              {summary?.weightWeeklyChange === null || summary?.weightWeeklyChange === undefined
                ? "--"
                : `${summary.weightWeeklyChange > 0 ? "+" : ""}${summary.weightWeeklyChange.toFixed(2)} kg`}
            </p>
            <p className="font-medium">
              Media móvil 7d:{" "}
              {summary?.weightMovingAvg7 === null || summary?.weightMovingAvg7 === undefined
                ? "--"
                : `${summary.weightMovingAvg7.toFixed(2)} kg`}
            </p>
          </div>
          <div className="rounded-lg border p-3 md:col-span-2">
            <p className="text-sm text-muted-foreground">Nutricion</p>
            <p className="font-medium">
              Dias con registros: {summary?.nutritionDaysWithData ?? 0}/{summary?.nutritionDaysTotal ?? 7}
            </p>
            <p className="font-medium">
              Calorias en meta: {summary?.nutritionCalorieDaysMet ?? 0}/{summary?.nutritionDaysTotal ?? 7}
            </p>
            <p className="font-medium">
              Proteina en meta: {summary?.nutritionProteinDaysMet ?? 0}/{summary?.nutritionDaysTotal ?? 7}
            </p>
            <p className="text-xs text-muted-foreground">
              Promedio: {summary?.avgCalories ?? 0} kcal | Proteina: {summary?.avgProteinG ?? 0} g
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observaciones de la semana</CardTitle>
          <CardDescription>Autoevaluacion para contextualizar tendencias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hydration-state">Estado hídrico</Label>
              <select
                id="hydration-state"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={hydrationState}
                onChange={(e) => setHydrationState(e.target.value as HydrationState)}
              >
                <option value="dry">Seco</option>
                <option value="retention">Retencion</option>
                <option value="variable">Variable</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-performance">Rendimiento entrenamiento</Label>
              <select
                id="training-performance"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={trainingPerformance}
                onChange={(e) => setTrainingPerformance(e.target.value as TrainingPerformance)}
              >
                <option value="better">Mejor</option>
                <option value="same">Igual</option>
                <option value="worse">Peor</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekly-notes">Notas</Label>
            <Textarea
              id="weekly-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Que factores impactaron tu semana?"
            />
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Guardar observaciones
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyReview;
