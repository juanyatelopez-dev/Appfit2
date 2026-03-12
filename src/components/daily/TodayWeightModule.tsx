import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Scale } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  getGuestBodyMetrics,
  getWeightTrendAnalysis,
  listBodyMetrics,
  saveGuestBodyMetrics,
  upsertBodyMetric,
  type BodyMetricEntry,
} from "@/services/bodyMetrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientId } from "@/lib/id";

const todayDateKey = () => new Date().toISOString().slice(0, 10);

const TodayWeightModule = () => {
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();

  const [weightKg, setWeightKg] = useState("");

  const todayKey = useMemo(() => todayDateKey(), []);

  const { data: dbEntries = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, "today-module"],
    queryFn: () => listBodyMetrics(user?.id ?? null, isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const { data: trendAnalysis } = useQuery({
    queryKey: ["body_metrics_trend", user?.id, isGuest],
    queryFn: () => getWeightTrendAnalysis(user?.id ?? null, isGuest),
    enabled: Boolean(user?.id) || isGuest,
  });

  const entries = useMemo(() => (isGuest ? getGuestBodyMetrics() : dbEntries), [dbEntries, isGuest]);
  const todayEntry = useMemo(() => entries.find((entry) => entry.measured_at === todayKey) ?? null, [entries, todayKey]);
  const latestEntry = useMemo(() => entries[0] ?? null, [entries]);

  useEffect(() => {
    setWeightKg(todayEntry ? String(todayEntry.weight_kg) : "");
  }, [todayEntry]);

  const invalidateWeightQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["body_metrics"] }),
      queryClient.invalidateQueries({ queryKey: ["body_metrics_trend"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
      queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
      queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (nextWeight: number) => {
      if (isGuest) {
        const nextEntries = getGuestBodyMetrics().filter((entry) => entry.measured_at !== todayKey);
        const nextEntry: BodyMetricEntry = {
          id: todayEntry?.id || createClientId(),
          user_id: "guest",
          measured_at: todayKey,
          weight_kg: nextWeight,
          notes: todayEntry?.notes ?? null,
          created_at: todayEntry?.created_at || new Date().toISOString(),
        };
        nextEntries.push(nextEntry);
        nextEntries.sort((a, b) => b.measured_at.localeCompare(a.measured_at));
        saveGuestBodyMetrics(nextEntries);
        return;
      }

      await upsertBodyMetric({
        userId: user?.id ?? null,
        isGuest: false,
        measured_at: todayKey,
        weight_kg: nextWeight,
        notes: todayEntry?.notes ?? null,
      });
    },
    onSuccess: async () => {
      await invalidateWeightQueries();
      toast.success(todayEntry ? "Peso de hoy actualizado." : "Peso de hoy registrado.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar el peso.");
    },
  });

  const handleSave = async () => {
    const parsedWeight = Number(weightKg);
    if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 400) {
      toast.error("El peso debe estar entre 20 y 400 kg.");
      return;
    }

    await saveMutation.mutateAsync(parsedWeight);
  };

  const trendLabel = useMemo(() => {
    if (!trendAnalysis) return "Sin datos";
    if (trendAnalysis.trend === "up") return "Subiendo";
    if (trendAnalysis.trend === "down") return "Bajando";
    return "Estable";
  }, [trendAnalysis]);

  return (
    <Card className="h-full rounded-[24px] border-border/60 bg-card/80 shadow-sm md:rounded-[28px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Peso de hoy
        </CardTitle>
        <CardDescription>Actualiza tu peso diario sin salir del check-in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ultimo registro</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-xl font-semibold md:text-2xl">{latestEntry ? `${Number(latestEntry.weight_kg).toFixed(1)} kg` : "--"}</p>
              <p className="text-xs text-right text-muted-foreground">{latestEntry?.measured_at ?? "Sin historial"}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Media movil 7d</p>
            <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-xl font-semibold md:text-2xl">
                {trendAnalysis?.movingAvg7 === null || trendAnalysis?.movingAvg7 === undefined
                  ? "--"
                  : `${trendAnalysis.movingAvg7.toFixed(2)} kg`}
              </p>
              <p className="text-xs text-right text-muted-foreground">Contexto de tendencia</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tendencia</p>
            <div className="mt-2 flex items-end justify-between gap-3">
                <p className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
                <Activity className="h-4 w-4 text-primary" />
                {trendLabel}
              </p>
              <p className="text-xs text-right text-muted-foreground">
                Cambio 7d:{" "}
                {trendAnalysis?.weeklyChange === null || trendAnalysis?.weeklyChange === undefined
                  ? "--"
                  : `${trendAnalysis.weeklyChange > 0 ? "+" : ""}${trendAnalysis.weeklyChange.toFixed(2)} kg`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/40 p-3 md:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="today-weight-input">Peso registrado hoy</Label>
              <Input
                id="today-weight-input"
                type="number"
                step="0.1"
                min="20"
                max="400"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                placeholder="73.7"
              />
            </div>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : todayEntry ? "Actualizar peso" : "Guardar peso"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Se guarda sobre la fecha de hoy ({todayKey}). Si ya tenias un registro, esta accion lo actualiza.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayWeightModule;
