import { useState } from "react";
import type { ComponentType } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import { BarChart3, Droplets, LayoutDashboard, Moon, Scale, Target, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import BodyMeasurementsCard from "@/components/dashboard/BodyMeasurementsCard";
import CalendarMiniWidget from "@/components/dashboard/CalendarMiniWidget";
import DailyMetricsTodoCard from "@/components/dashboard/DailyMetricsTodoCard";
import GoalCard from "@/components/dashboard/GoalCard";
import NutritionCard from "@/components/dashboard/NutritionCard";
import RecoveryCard from "@/components/dashboard/RecoveryCard";
import SleepInsightsCard from "@/components/dashboard/SleepInsightsCard";
import TacticalNotesCard from "@/components/dashboard/TacticalNotesCard";
import TodayStatusRow from "@/components/dashboard/TodayStatusRow";
import WaterGoalRingCard from "@/components/dashboard/WaterGoalRingCard";
import WeeklyTrendsCard from "@/components/dashboard/WeeklyTrendsCard";
import WeightCard from "@/components/dashboard/WeightCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";

type TabKey = "overview" | "analytics";

const tabItems: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "overview", label: "Resumen", icon: LayoutDashboard },
  { key: "analytics", label: "Analisis", icon: BarChart3 },
];

const quickActions: Array<{ label: string; href: string; icon: ComponentType<{ className?: string }> }> = [
  { label: "Registrar agua", href: "/water", icon: Droplets },
  { label: "Registrar sueno", href: "/sleep", icon: Moon },
  { label: "Registrar comida", href: "/nutrition", icon: UtensilsCrossed },
  { label: "Registrar peso", href: "/weight", icon: Scale },
  { label: "Ajustar objetivos", href: "/goals", icon: Target },
];

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [tab, setTab] = useState<TabKey>("overview");
  const snapshot = useDashboardSnapshot(currentMonth);

  const saveNoteMutation = useMutation({
    mutationFn: (payload: { title?: string | null; content: string }) => snapshot.saveTodayNote(payload),
    onSuccess: async () => {
      toast.success("Nota diaria guardada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar la nota.");
    },
  });

  const core = snapshot.core;
  const goalRemaining =
    core?.goal?.target_weight_kg !== null &&
    core?.goal?.target_weight_kg !== undefined &&
    core?.latestWeight !== null &&
    core?.latestWeight !== undefined
      ? Number(core.goal.target_weight_kg) - Number(core.latestWeight)
      : null;

  return (
    <div className="space-y-6 py-4">
      <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-card to-card/70 shadow-sm">
        <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Hola, {core?.displayName ?? "Usuario"}</h1>
            <p className="text-sm text-muted-foreground">{core?.todayLabel ?? "Cargando fecha..."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background/60 p-1">
            {tabItems.map((item) => {
              const active = tab === item.key;
              return (
                <Button
                  key={item.key}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab(item.key)}
                  className={`rounded-full px-4 ${active ? "bg-primary text-primary-foreground hover:bg-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {tab === "overview" && <DailyMetricsTodoCard core={core} />}

      {tab === "overview" && (
        <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Accesos rapidos</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {quickActions.map((action) => (
                <Button key={action.href} asChild variant="outline" className="justify-start">
                  <Link to={action.href}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(tab === "overview" || tab === "analytics") && (
        <TodayStatusRow
          loading={snapshot.coreLoading}
          waterMl={core?.waterTodayMl ?? 0}
          waterGoalMl={core?.waterGoalMl ?? 2000}
          sleepMinutes={core?.sleepDay?.total_minutes ?? 0}
          sleepGoalMinutes={core?.sleepGoalMinutes ?? 480}
          energy={core?.bioToday?.daily_energy ?? null}
          stress={core?.bioToday?.perceived_stress ?? null}
          streakDays={core?.activeDays7 ?? 0}
        />
      )}

      {tab === "overview" && (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <RecoveryCard
              loading={snapshot.coreLoading}
              score={core?.recovery.score ?? 0}
              status={core?.recovery.status ?? "Recuperacion Moderada"}
              drivers={core?.recovery.drivers ?? []}
              subscores={
                core?.recovery.subscores ?? {
                  sleep: 0,
                  biofeedback: 0,
                  hydration: 0,
                  consistency: 0,
                }
              }
            />
            <CalendarMiniWidget
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              activity={snapshot.monthActivity}
              loading={snapshot.monthActivityLoading}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-5">
            <WeightCard
              latest={core?.latestWeight ?? null}
              initial={core?.initialWeight ?? null}
              initialDate={core?.weightSnapshot.first?.measured_at ?? null}
              weeklyDelta={core?.weightTrend.weeklyChange ?? null}
              movingAvg7={core?.weightTrend.movingAvg7 ?? null}
              trend={core?.weightTrend.trend === "up" ? "subiendo" : core?.weightTrend.trend === "down" ? "bajando" : "estable"}
              loading={snapshot.coreLoading}
              error={snapshot.coreError}
            />
            <GoalCard
              target={core?.goal?.target_weight_kg ?? null}
              progress={core?.goalProgress ?? null}
              remainingKg={goalRemaining}
              loading={snapshot.coreLoading}
              error={snapshot.coreError}
            />
            <WaterGoalRingCard
              waterMl={core?.waterTodayMl ?? 0}
              goalMl={core?.waterGoalMl ?? 2000}
              loading={snapshot.coreLoading}
            />
            <NutritionCard />
            <SleepInsightsCard
              sleepMinutes={core?.sleepDay?.total_minutes ?? 0}
              goalMinutes={core?.sleepGoalMinutes ?? 480}
              quality={core?.bioToday?.sleep_quality ?? null}
              weekTotals={core?.sleep7d ?? []}
              loading={snapshot.coreLoading}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <BodyMeasurementsCard
              className="h-full"
              loading={snapshot.coreLoading}
              latest={core?.latestMeasurement ?? null}
              previous={core?.previousMeasurement ?? null}
              latestWeight={core?.latestWeight ?? null}
              weeklyWaistDeltaCm={core?.weeklyWaistDeltaCm ?? null}
              goalDirection={core?.goal?.goal_direction ?? null}
            />
            <WeeklyTrendsCard loading={snapshot.coreLoading} data={snapshot.trends} />
          </div>

          <TacticalNotesCard
            loading={snapshot.coreLoading}
            todayNote={core?.noteToday ?? null}
            latestNote={core?.noteLatest ?? null}
            onSave={(payload) => saveNoteMutation.mutateAsync(payload).then(() => undefined)}
          />
        </>
      )}

      {tab === "analytics" && <WeeklyTrendsCard loading={snapshot.coreLoading} data={snapshot.trends} />}
    </div>
  );
};

export default Dashboard;
