import { useState } from "react";
import type { ComponentType } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import { BarChart3, CalendarDays, LayoutDashboard, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import BodyMeasurementsCard from "@/components/dashboard/BodyMeasurementsCard";
import CalendarMiniWidget from "@/components/dashboard/CalendarMiniWidget";
import GoalCard from "@/components/dashboard/GoalCard";
import RecoveryCard from "@/components/dashboard/RecoveryCard";
import TacticalNotesCard from "@/components/dashboard/TacticalNotesCard";
import TodayStatusRow from "@/components/dashboard/TodayStatusRow";
import WeeklyTrendsCard from "@/components/dashboard/WeeklyTrendsCard";
import WeightCard from "@/components/dashboard/WeightCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";

type TabKey = "overview" | "analytics" | "calendar" | "settings";

const tabItems: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "settings", label: "Settings", icon: Settings },
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

          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
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
            <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Agua hoy</p>
                <p className="text-3xl font-semibold">{core?.waterTodayMl ?? 0} ml</p>
                <p className="text-xs text-muted-foreground">Objetivo: {core?.waterGoalMl ?? 2000} ml</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/water">Ir a Agua</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sueno hoy</p>
                <p className="text-3xl font-semibold">{((core?.sleepDay?.total_minutes ?? 0) / 60).toFixed(1)} h</p>
                <p className="text-xs text-muted-foreground">Objetivo: {((core?.sleepGoalMinutes ?? 480) / 60).toFixed(1)} h</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/sleep">Ir a Sueno</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <BodyMeasurementsCard
            loading={snapshot.coreLoading}
            latest={core?.latestMeasurement ?? null}
            previous={core?.previousMeasurement ?? null}
            latestWeight={core?.latestWeight ?? null}
            weeklyWaistDeltaCm={core?.weeklyWaistDeltaCm ?? null}
            goalDirection={core?.goal?.goal_direction ?? null}
          />

          <WeeklyTrendsCard loading={snapshot.coreLoading} data={snapshot.trends} />

          <TacticalNotesCard
            loading={snapshot.coreLoading}
            todayNote={core?.noteToday ?? null}
            latestNote={core?.noteLatest ?? null}
            onSave={(payload) => saveNoteMutation.mutateAsync(payload).then(() => undefined)}
          />
        </>
      )}

      {tab === "analytics" && <WeeklyTrendsCard loading={snapshot.coreLoading} data={snapshot.trends} />}

      {tab === "calendar" && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <CalendarMiniWidget
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            activity={snapshot.monthActivity}
            loading={snapshot.monthActivityLoading}
          />
          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <p className="text-lg font-semibold">Actividad mensual</p>
              <p className="text-sm text-muted-foreground">
                Abre el calendario completo para revisar agua, sueno, peso, biofeedback y notas por dia.
              </p>
              <Button asChild>
                <Link to="/calendar">Abrir calendario completo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <p className="text-lg font-semibold">Configuracion rapida</p>
            <p className="text-sm text-muted-foreground">Gestiona perfil, objetivos y preferencias desde Ajustes.</p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/profile">Perfil</Link>
              </Button>
              <Button asChild>
                <Link to="/settings">Ajustes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
