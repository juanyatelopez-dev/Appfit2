import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { getBiofeedbackWeeklyAverages, getDailyBiofeedback, upsertDailyBiofeedback } from "@/services/dailyBiofeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";

type BiofeedbackValues = {
  sleep_quality: number;
  hunger_level: number;
  daily_energy: number;
  training_energy: number;
  perceived_stress: number;
  libido: number;
  digestion: number;
};

const defaultValues = (): BiofeedbackValues => ({
  sleep_quality: 5,
  hunger_level: 5,
  daily_energy: 5,
  training_energy: 5,
  perceived_stress: 5,
  libido: 5,
  digestion: 5,
});

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const toPercent10 = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return Math.max(0, Math.min(100, value * 10));
};

const formatScore10 = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "--";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const getReadinessTone = (score: number) => {
  if (score >= 75) {
    return {
      label: "ALTA",
      ringClass: "text-emerald-400",
      strokeClass: "stroke-emerald-400",
      recommendation: "Carga alta recomendada",
      recommendationClass: "text-emerald-400",
    };
  }
  if (score >= 50) {
    return {
      label: "MEDIA",
      ringClass: "text-amber-400",
      strokeClass: "stroke-amber-400",
      recommendation: "Entrenamiento moderado recomendado",
      recommendationClass: "text-amber-400",
    };
  }
  return {
    label: "BAJA",
    ringClass: "text-rose-400",
    strokeClass: "stroke-rose-400",
    recommendation: "Carga baja recomendada",
    recommendationClass: "text-rose-400",
  };
};

const MetricInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <span className="text-sm font-semibold">{value}/10</span>
    </div>
    <Slider min={1} max={10} step={1} value={[value]} onValueChange={(next) => onChange(next[0] ?? value)} />
  </div>
);

const TodayBiofeedbackModule = () => {
  const { user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<BiofeedbackValues>(() => defaultValues());

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const timeZone = profile?.timezone || DEFAULT_WATER_TIMEZONE;

  const { data: todayData } = useQuery({
    queryKey: ["daily_biofeedback", user?.id, todayKey, isGuest, timeZone],
    queryFn: () => getDailyBiofeedback(user?.id ?? null, today, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: weeklyAverages } = useQuery({
    queryKey: ["daily_biofeedback_weekly", user?.id, todayKey, isGuest, timeZone],
    queryFn: () => getBiofeedbackWeeklyAverages(user?.id ?? null, today, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  useEffect(() => {
    if (!todayData) {
      setValues(defaultValues());
      setNotes("");
      return;
    }

    setValues({
      sleep_quality: todayData.sleep_quality,
      hunger_level: todayData.hunger_level,
      daily_energy: todayData.daily_energy,
      training_energy: todayData.training_energy,
      perceived_stress: todayData.perceived_stress,
      libido: todayData.libido,
      digestion: todayData.digestion,
    });
    setNotes(todayData.notes || "");
  }, [todayData]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      upsertDailyBiofeedback({
        userId: user?.id ?? null,
        date: today,
        isGuest,
        timeZone,
        notes: notes.trim() || null,
        ...values,
      }),
    onSuccess: async () => {
      setDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback"] }),
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_weekly"] }),
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_recent"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
      toast.success(todayData ? "Check-in fisiologico actualizado." : "Check-in fisiologico guardado.");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "No se pudo guardar el check-in."));
    },
  });

  const energyToday = todayData?.daily_energy ?? null;
  const stressToday = todayData?.perceived_stress ?? null;
  const sleepToday = todayData?.sleep_quality ?? null;
  const energy7d = weeklyAverages?.avg_energy ?? null;
  const stress7d = weeklyAverages?.avg_stress ?? null;
  const sleep7d = weeklyAverages?.avg_sleep_quality ?? null;

  const readinessScore = clampScore(
    Math.round(
      ((energyToday ?? energy7d ?? 5) * 0.4 +
        (10 - (stressToday ?? stress7d ?? 5)) * 0.35 +
        (sleepToday ?? sleep7d ?? 5) * 0.25) *
        10,
    ),
  );
  const readinessTone = getReadinessTone(readinessScore);
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = Math.max(0, Math.min(ringCircumference, (readinessScore / 100) * ringCircumference));

  const metricRows = [
    { key: "energy", label: "Energia", today: energyToday, avg7d: energy7d },
    { key: "stress", label: "Estres", today: stressToday, avg7d: stress7d },
    { key: "sleep", label: "Sueno", today: sleepToday, avg7d: sleep7d },
  ] as const;

  return (
    <Card className="h-full rounded-[22px] border-border/50 bg-card/80 md:rounded-[24px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          Estado fisiologico
        </CardTitle>
        <CardDescription>Check-in subjetivo rapido para energia, estres y recuperacion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <div className="rounded-2xl border border-border/60 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Readiness hoy</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Capacidad de carga recomendada para entrenar hoy:{" "}
              <span className={`font-semibold ${readinessTone.recommendationClass}`}>{readinessTone.label}</span>
            </p>
            <div className="mt-3 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-2.5 sm:grid-cols-[96px_minmax(0,1fr)]">
              <div className="relative h-[88px] w-[88px] shrink-0 sm:h-[96px] sm:w-[96px]">
                <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
                  <circle cx="48" cy="48" r={ringRadius} className="fill-none stroke-muted/35" strokeWidth="8" />
                  <circle
                    cx="48"
                    cy="48"
                    r={ringRadius}
                    className={`fill-none ${readinessTone.strokeClass}`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${ringDash} ${ringCircumference - ringDash}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={`text-[30px] font-bold leading-none ${readinessTone.ringClass}`}>{readinessScore}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">/100</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recomendacion de carga</p>
                <p className="text-sm font-semibold leading-tight text-foreground sm:text-base">{readinessTone.recommendation}</p>
                <p className="text-xs text-muted-foreground">Basado en energia, estres y sueno.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tendencia hoy vs promedio 7d</p>
            <div className="mt-3 space-y-3">
              {metricRows.map((metric) => (
                <div key={metric.key} className="rounded-xl border border-border/50 bg-background/40 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-[0.08em] text-foreground">{metric.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      Hoy {formatScore10(metric.today)}/10 | 7d {formatScore10(metric.avg7d)}/10
                    </span>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Hoy</span>
                      <Progress value={toPercent10(metric.today)} className="h-1.5 flex-1 bg-secondary/60" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">7d</span>
                      <Progress value={toPercent10(metric.avg7d)} className="h-1.5 flex-1 bg-secondary/60" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
          <p className="text-sm text-muted-foreground">
            {todayData ? "Ya tienes check-in hoy. Puedes ajustarlo sin cambiar de pantalla." : "Aun no registras tu estado fisiologico de hoy."}
          </p>
          <Button className="mt-3" onClick={() => setDialogOpen(true)}>
            {todayData ? "Editar check-in" : "Registrar check-in"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Check-in fisiologico de hoy</DialogTitle>
            <DialogDescription>Registra tus sensaciones del dia para dejar contexto de recuperacion, estres y energia.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricInput label="Calidad de sueno" value={values.sleep_quality} onChange={(next) => setValues((prev) => ({ ...prev, sleep_quality: next }))} />
            <MetricInput label="Hambre" value={values.hunger_level} onChange={(next) => setValues((prev) => ({ ...prev, hunger_level: next }))} />
            <MetricInput label="Energia diaria" value={values.daily_energy} onChange={(next) => setValues((prev) => ({ ...prev, daily_energy: next }))} />
            <MetricInput label="Energia entrenando" value={values.training_energy} onChange={(next) => setValues((prev) => ({ ...prev, training_energy: next }))} />
            <MetricInput label="Estres" value={values.perceived_stress} onChange={(next) => setValues((prev) => ({ ...prev, perceived_stress: next }))} />
            <MetricInput label="Digestion" value={values.digestion} onChange={(next) => setValues((prev) => ({ ...prev, digestion: next }))} />
            <MetricInput label="Libido" value={values.libido} onChange={(next) => setValues((prev) => ({ ...prev, libido: next }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="today-bio-notes">Notas</Label>
            <Textarea
              id="today-bio-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Contexto del dia, molestias, sensaciones..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TodayBiofeedbackModule;
