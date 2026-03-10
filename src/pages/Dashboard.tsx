import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import { CalendarDays, CheckCircle2, Crosshair, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import BodyMeasurementsCard from "@/components/dashboard/BodyMeasurementsCard";
import CalendarMiniWidget from "@/components/dashboard/CalendarMiniWidget";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import PhysicalProgressHub from "@/components/dashboard/PhysicalProgressHub";
import RecoveryCard from "@/components/dashboard/RecoveryCard";
import TacticalNotesCard from "@/components/dashboard/TacticalNotesCard";
import TodayStatusRow from "@/components/dashboard/TodayStatusRow";
import TodayBiofeedbackModule from "@/components/daily/TodayBiofeedbackModule";
import TodayMealsModule from "@/components/daily/TodayMealsModule";
import TodayWeightModule from "@/components/daily/TodayWeightModule";
import SleepCard from "@/components/dashboard/SleepCard";
import WaterCard from "@/components/dashboard/WaterCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
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
  const todayActivity = snapshot.monthActivity?.get(snapshot.todayKey);
  const dailyModules = [
    { key: "water", label: "Agua", href: "#water", completed: (core?.waterTodayMl ?? 0) > 0 },
    { key: "sleep", label: "Sueno", href: "#sleep", completed: (core?.sleepDay?.total_minutes ?? 0) > 0 },
    { key: "weight", label: "Peso", href: "#weight", completed: (core?.weightSnapshot?.entries || []).some((entry) => entry.measured_at === snapshot.todayKey) },
    { key: "measurements", label: "Medidas", href: "/body", completed: core?.latestMeasurement?.date_key === snapshot.todayKey },
    { key: "biofeedback", label: "Biofeedback", href: "#biofeedback", completed: Boolean(core?.bioToday) },
    { key: "nutrition", label: "Comidas", href: "#nutrition", completed: Boolean(todayActivity?.hasNutrition) },
  ] as const;
  const completionCount = dailyModules.filter((module) => module.completed).length;
  const missingModules = dailyModules.filter((module) => !module.completed);
  const nextActionLabel =
    missingModules.length > 0 ? `${missingModules[0].label}: siguiente registro recomendado` : "Dia operativo completo. Revisa progreso o nutricion para interpretar tendencias.";

  return (
    <div className="space-y-6 py-4">
      <Card className="app-surface-hero overflow-hidden rounded-[32px] text-slate-100">
        <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-4">
            <div className="app-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
              <Crosshair className="h-3.5 w-3.5" />
              Daily Check-In
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Hoy es tu centro operativo</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Registra peso, hidratacion, sueno, medidas, biofeedback y comidas desde una sola pantalla. La idea es entender en segundos como vas y que deberias registrar despues.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1.25fr_1fr]">
              <div className="app-surface-tile rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Fecha</div>
                <div className="mt-2 text-lg font-semibold text-white">{core?.todayLabel ?? "Cargando..."}</div>
              </div>
              <div className="app-surface-tile rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Modulos completos</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {completionCount}/{dailyModules.length}
                </div>
                <div className="mt-3 space-y-2">
                  {snapshot.coreLoading || snapshot.monthActivityLoading ? (
                    <p className="text-sm text-slate-400">Analizando modulos pendientes...</p>
                  ) : missingModules.length === 0 ? (
                    <p className="text-sm text-slate-300">Dia operativo completo. No hay registros pendientes.</p>
                  ) : (
                    missingModules.map((module) => (
                      <div key={module.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        <span className="text-sm text-slate-200">{module.label}</span>
                        <Button asChild size="sm" className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                          {module.href.startsWith("#") ? <a href={module.href}>Registrar</a> : <Link to={module.href}>Registrar</Link>}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="app-surface-tile rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Consistencia 7d</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <TimerReset className="h-4 w-4 text-primary" />
                  {core?.activeDays7 ?? 0} dias activos
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="app-surface-tile rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recuperacion</div>
              <div className="mt-2 text-4xl font-black text-white">{core?.recovery.score ?? 0}</div>
              <p className="mt-2 text-sm text-slate-300">{core?.recovery.status ?? "Analizando..."}</p>
            </div>
            <div className="app-surface-tile rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                Enfoque
              </div>
              <p className="mt-2 text-sm text-slate-300">{nextActionLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <PhysicalProgressHub loading={snapshot.coreLoading} summary={core?.physicalSummary ?? null} />
        <DashboardQuickActions nextActionLabel={nextActionLabel} />
      </div>

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

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <section id="nutrition" className="min-w-0">
          <TodayMealsModule />
        </section>
        <div className="grid gap-4 xl:grid-cols-2">
          <section id="water" className="xl:col-span-2">
            <WaterCard showHistoryButton={false} />
          </section>
          <section id="weight">
            <TodayWeightModule />
          </section>
          <section id="sleep">
            <SleepCard />
          </section>
          <section id="biofeedback" className="xl:col-span-2">
            <TodayBiofeedbackModule />
          </section>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <BodyMeasurementsCard
          loading={snapshot.coreLoading}
          latest={core?.latestMeasurement ?? null}
          previous={core?.previousMeasurement ?? null}
          latestWeight={core?.latestMeasurementWeight ?? null}
          waistComparison={core?.waistComparison ?? { deltaCm: null, label: "Sin referencia previa", referenceDateKey: null }}
          goalDirection={core?.goal?.goal_direction ?? null}
        />
        <TacticalNotesCard
          loading={snapshot.coreLoading}
          todayNote={core?.noteToday ?? null}
          latestNote={core?.noteLatest ?? null}
          onSave={(payload) => saveNoteMutation.mutateAsync(payload).then(() => undefined)}
        />
        <RecoveryCard
          loading={snapshot.coreLoading}
          score={core?.recovery.score ?? 0}
          status={core?.recovery.status ?? "Recuperacion moderada"}
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
    </div>
  );
};

export default Dashboard;
