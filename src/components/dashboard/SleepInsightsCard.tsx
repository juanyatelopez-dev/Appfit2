import { Moon, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SleepDayTotal = {
  date_key: string;
  total_minutes: number;
};

type SleepInsightsCardProps = {
  sleepMinutes: number;
  goalMinutes: number;
  quality: number | null;
  weekTotals: SleepDayTotal[];
  loading?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const qualityLabel = (value: number | null) => {
  if (value === null) return "Sin registro";
  if (value >= 8) return "Excelente";
  if (value >= 6) return "Buena";
  if (value >= 4) return "Regular";
  return "Baja";
};

const SleepInsightsCard = ({ sleepMinutes, goalMinutes, quality, weekTotals, loading = false }: SleepInsightsCardProps) => {
  const safeGoal = Math.max(1, Number(goalMinutes || 0));
  const safeSleep = Math.max(0, Number(sleepMinutes || 0));
  const progress = clamp((safeSleep / safeGoal) * 100, 0, 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;
  const goalMet = safeSleep >= safeGoal;

  const weekMaxMinutes = Math.max(safeGoal, ...weekTotals.map((day) => Number(day.total_minutes || 0)), 1);
  const latestWeek = weekTotals.slice(-7);
  const weekBars =
    latestWeek.length === 7
      ? latestWeek
      : Array.from({ length: 7 }).map((_, index) => latestWeek[index] ?? { date_key: `empty-${index}`, total_minutes: 0 });

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sueño hoy</p>
          <Moon className={`h-4 w-4 ${goalMet ? "text-primary" : "text-muted-foreground"}`} />
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted) / 0.55)" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-500"
                style={{
                  filter: goalMet ? "drop-shadow(0 0 9px hsl(var(--primary) / 0.45))" : "none",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg font-semibold leading-none">{loading ? "--" : `${(safeSleep / 60).toFixed(1)}h`}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Objetivo: <span className="font-medium text-foreground">{(safeGoal / 60).toFixed(1)} h</span>
            </p>
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Calidad: {quality === null ? "--" : `${quality}/10`} ({qualityLabel(quality)})
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Últimos 7 días</p>
          <div className="grid grid-cols-7 gap-1.5 items-end h-16 rounded-lg border border-border/60 px-2 py-2">
            {weekBars.map((day) => {
              const value = Number(day.total_minutes || 0);
              const heightPct = clamp((value / weekMaxMinutes) * 100, 6, 100);
              const metDayGoal = value >= safeGoal;
              return (
                <div key={day.date_key} className="flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full rounded-sm ${metDayGoal ? "bg-primary/80" : "bg-muted-foreground/45"}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${Math.round(value / 60)}h`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/sleep">Ir a Sueño</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default SleepInsightsCard;
