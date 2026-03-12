import { Activity, ArrowRight, Crosshair, Dumbbell, Scale, Shrink, Target } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardPhysicalSummary } from "@/features/dashboard/physicalProgress";

type Props = {
  loading?: boolean;
  summary: DashboardPhysicalSummary | null | undefined;
};

const compactDelta = (value: number | null, unit: string) => {
  if (value === null) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} ${unit}`;
};

const PhysicalProgressHub = ({ loading = false, summary }: Props) => {
  if (loading) {
    return (
      <Card className="rounded-[28px] border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Progreso fisico</CardTitle>
          <CardDescription>Lectura central del estado corporal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`physical-skeleton-${index}`} className="h-28 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const focusIcon =
    summary?.focusMode === "fat_loss" ? Shrink : summary?.focusMode === "muscle_gain" ? Dumbbell : Crosshair;
  const FocusIcon = focusIcon;
  const focusMetrics =
    summary?.focusMode === "fat_loss"
      ? [
          { label: "Peso actual", value: summary.latestWeightKg !== null ? `${summary.latestWeightKg.toFixed(1)} kg` : "--", icon: Scale },
          { label: "Cambio reciente", value: compactDelta(summary.recentWeightChangeKg, "kg"), icon: Activity },
          { label: "Cambio cintura", value: compactDelta(summary.waistChangeCm, "cm"), icon: Shrink, helper: summary.waistChangeLabel },
          { label: "% graso", value: summary.bodyFatPct !== null ? `${summary.bodyFatPct.toFixed(1)}%` : "--", icon: Target },
        ]
      : summary?.focusMode === "muscle_gain"
      ? [
          { label: "Peso actual", value: summary.latestWeightKg !== null ? `${summary.latestWeightKg.toFixed(1)} kg` : "--", icon: Scale },
          { label: "Masa magra", value: summary.leanMassKg !== null ? `${summary.leanMassKg.toFixed(1)} kg` : "--", icon: Dumbbell },
          { label: "Brazo", value: summary.armCm !== null ? `${summary.armCm.toFixed(1)} cm` : "--", icon: Activity },
          { label: "Muslo", value: summary.thighCm !== null ? `${summary.thighCm.toFixed(1)} cm` : "--", icon: Crosshair },
        ]
      : [
          { label: "Peso actual", value: summary?.latestWeightKg !== null ? `${summary.latestWeightKg.toFixed(1)} kg` : "--", icon: Scale },
          { label: "Cambio reciente", value: compactDelta(summary?.recentWeightChangeKg ?? null, "kg"), icon: Activity },
          { label: "Cintura", value: compactDelta(summary?.waistChangeCm ?? null, "cm"), icon: Shrink, helper: summary?.waistChangeLabel },
          { label: "% graso", value: summary?.bodyFatPct !== null ? `${summary.bodyFatPct.toFixed(1)}%` : "--", icon: Target },
        ];

  return (
    <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-sm md:rounded-[28px]">
      <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div>
          <CardTitle>Progreso fisico</CardTitle>
          <CardDescription>Estado actual del cuerpo, orientado por tu meta activa.</CardDescription>
        </div>
          <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {summary?.lastUpdatedLabel ?? "Sin datos"}
          </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-3 md:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Foco actual</p>
              <h3 className="mt-2 text-lg font-semibold md:text-xl">{summary?.goalHeading ?? "Sin meta activa"}</h3>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{summary?.goalSupport ?? "Registra peso y medidas para activar el resumen fisico."}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card px-3 py-2">
              <FocusIcon className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Progreso hacia la meta</span>
                <span className="font-medium">{summary?.goalProgressPct !== null && summary?.goalProgressPct !== undefined ? `${summary.goalProgressPct.toFixed(0)}%` : "--"}</span>
              </div>
              <Progress value={summary?.goalProgressPct ?? 0} className="mt-2 h-2" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5" />
              {summary?.latestMeasurementDateKey ? `Medidas: ${summary.latestMeasurementDateKey}` : "Sin medicion corporal"}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 md:gap-3 xl:grid-cols-4">
          {focusMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-2xl border border-border/60 bg-background/50 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xl font-semibold md:mt-3 md:text-2xl">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.helper ?? "Lectura principal del progreso actual"}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PhysicalProgressHub;
