import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import { CalendarDays, CheckCircle2, Crosshair, TimerReset } from "lucide-react";
import { toast } from "sonner";

import CalendarMiniWidget from "@/components/dashboard/CalendarMiniWidget";
import RecoveryCard from "@/components/dashboard/RecoveryCard";
import TacticalNotesCard from "@/components/dashboard/TacticalNotesCard";
import TodayStatusRow from "@/components/dashboard/TodayStatusRow";
import SleepCard from "@/components/dashboard/SleepCard";
import WaterCard from "@/components/dashboard/WaterCard";
import TodayBiofeedbackModule from "@/components/daily/TodayBiofeedbackModule";
import TodayMealsModule from "@/components/daily/TodayMealsModule";
import TodayWeightModule from "@/components/daily/TodayWeightModule";
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
  const completionCount =
    Number((core?.waterTodayMl ?? 0) > 0) +
    Number((core?.sleepDay?.total_minutes ?? 0) > 0) +
    Number((core?.latestWeight ?? null) !== null) +
    Number(Boolean(core?.bioToday)) +
    Number((core?.noteToday?.content ?? "").trim().length > 0);

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
                Registra peso, hidratacion, sueno, biofeedback y comidas del dia desde una sola pantalla. El objetivo es completar el tracking diario en menos de un minuto.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="app-surface-tile rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Fecha</div>
                <div className="mt-2 text-lg font-semibold text-white">{core?.todayLabel ?? "Cargando..."}</div>
              </div>
              <div className="app-surface-tile rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Modulos completos</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {completionCount}/5
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
              <p className="mt-2 text-sm text-slate-300">
                Primero registra el dia. Luego usa Progreso y Calendario para interpretar tendencias y revisar adherencia.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section id="nutrition">
          <TodayMealsModule />
        </section>
        <section id="water">
          <WaterCard showHistoryButton={false} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section id="weight">
          <TodayWeightModule />
        </section>
        <section id="sleep">
          <SleepCard />
        </section>
        <section id="biofeedback">
          <TodayBiofeedbackModule />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <TacticalNotesCard
          loading={snapshot.coreLoading}
          todayNote={core?.noteToday ?? null}
          latestNote={core?.noteLatest ?? null}
          onSave={(payload) => saveNoteMutation.mutateAsync(payload).then(() => undefined)}
        />
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
    </div>
  );
};

export default Dashboard;
