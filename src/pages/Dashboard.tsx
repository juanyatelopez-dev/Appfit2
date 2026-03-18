import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import { CalendarDays, CheckCircle2, Crosshair, Dumbbell, Settings2, TimerReset } from "lucide-react";
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
import { AppPageIntro } from "@/components/layout/AppPageIntro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { getTrainingTodaySummary } from "@/modules/training/services";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import {
  DASHBOARD_CHECKIN_MODULE_DEFINITIONS,
  DEFAULT_DASHBOARD_CHECKIN_MODULES,
  type DashboardCheckinModuleKey,
  getDashboardCheckinModulePreferences,
  saveDashboardCheckinModulePreferences,
} from "@/services/dashboardCheckinPreferences";
import {
  DASHBOARD_HOME_WIDGET_DEFINITIONS,
  DEFAULT_DASHBOARD_HOME_WIDGETS,
  type DashboardHomeWidgetKey,
  getDashboardHomeWidgetPreferences,
  saveDashboardHomeWidgetPreferences,
} from "@/services/dashboardHomePreferences";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type DashboardStackCard = {
  key: string;
  weight: number;
  preferredColumn: "left" | "right";
  mobileOrder: number;
  node: ReactNode;
};

const balanceDashboardColumns = (cards: DashboardStackCard[]) => {
  const orderedCards = [...cards].sort((a, b) => a.mobileOrder - b.mobileOrder);
  const left: DashboardStackCard[] = [];
  const right: DashboardStackCard[] = [];
  let leftWeight = 0;
  let rightWeight = 0;

  orderedCards.forEach((card) => {
    const preferredWeight = card.preferredColumn === "left" ? leftWeight : rightWeight;
    const alternateWeight = card.preferredColumn === "left" ? rightWeight : leftWeight;
    const shouldUsePreferredColumn = preferredWeight <= alternateWeight + 2;

    if (card.preferredColumn === "left" && (shouldUsePreferredColumn || leftWeight <= rightWeight)) {
      left.push(card);
      leftWeight += card.weight;
      return;
    }

    if (card.preferredColumn === "right" && (shouldUsePreferredColumn || rightWeight <= leftWeight)) {
      right.push(card);
      rightWeight += card.weight;
      return;
    }

    if (leftWeight <= rightWeight) {
      left.push(card);
      leftWeight += card.weight;
      return;
    }

    right.push(card);
    rightWeight += card.weight;
  });

  return { orderedCards, left, right };
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { user, isGuest, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const snapshot = useDashboardSnapshot(currentMonth);
  const [visibleModuleKey, setVisibleModuleKey] = useState<string | null>(null);
  const [isModuleTransitioning, setIsModuleTransitioning] = useState(false);
  const timeZone = profile?.timezone || DEFAULT_WATER_TIMEZONE;

  const saveNoteMutation = useMutation({
    mutationFn: (payload: { title?: string | null; content: string }) => snapshot.saveTodayNote(payload),
    onSuccess: async () => {
      toast.success("Nota diaria guardada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "No se pudo guardar la nota."));
    },
  });

  const core = snapshot.core;
  const todayActivity = snapshot.monthActivity?.get(snapshot.todayKey);
  const modulePreferencesKey = ["dashboard", "checkin_module_preferences", user?.id, isGuest] as const;
  const widgetPreferencesKey = ["dashboard", "home_widget_preferences", user?.id, isGuest] as const;
  const trainingTodayQuery = useQuery({
    queryKey: ["dashboard_training_today", user?.id, isGuest, timeZone],
    queryFn: () => getTrainingTodaySummary(user?.id ?? null, new Date(), { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const scheduledWorkout = trainingTodayQuery.data?.scheduledWorkout ?? null;
  const activeWorkout = trainingTodayQuery.data?.activeSession?.workout ?? null;
  const workoutCardTitle = activeWorkout?.name ?? scheduledWorkout?.name ?? "Sin rutina asignada";
  const workoutCardSubtitle = activeWorkout
    ? "Sesion activa en curso."
    : scheduledWorkout
      ? "Rutina programada para hoy."
      : "Asigna una rutina para ver tu bloque del dia aqui.";
  const modulePreferencesQuery = useQuery({
    queryKey: modulePreferencesKey,
    queryFn: () => getDashboardCheckinModulePreferences(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const widgetPreferencesQuery = useQuery({
    queryKey: widgetPreferencesKey,
    queryFn: () => getDashboardHomeWidgetPreferences(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const selectedModuleKeys = modulePreferencesQuery.data ?? DEFAULT_DASHBOARD_CHECKIN_MODULES;
  const selectedWidgetKeys = widgetPreferencesQuery.data ?? DEFAULT_DASHBOARD_HOME_WIDGETS;
  const allDailyModules = [
    { key: "water", label: "Agua", href: "#water", completed: (core?.waterTodayMl ?? 0) > 0 },
    { key: "sleep", label: "Sueno", href: "#sleep", completed: (core?.sleepDay?.total_minutes ?? 0) > 0 },
    { key: "weight", label: "Peso", href: "#weight", completed: (core?.weightSnapshot?.entries || []).some((entry) => entry.measured_at === snapshot.todayKey) },
    { key: "measurements", label: "Medidas", href: "/body", completed: core?.latestMeasurement?.date_key === snapshot.todayKey },
    { key: "biofeedback", label: "Biofeedback", href: "#biofeedback", completed: Boolean(core?.bioToday) },
    { key: "nutrition", label: "Comidas", href: "#nutrition", completed: Boolean(todayActivity?.hasNutrition) },
  ] as const;
  const dailyModules = allDailyModules.filter((module) => selectedModuleKeys.includes(module.key));
  const completionCount = dailyModules.filter((module) => module.completed).length;
  const missingModules = dailyModules.filter((module) => !module.completed);
  const nextModule = missingModules[0] ?? null;
  const remainingModuleCount = Math.max(missingModules.length - 1, 0);
  const nextActionLabel =
    nextModule ? `${nextModule.label}: siguiente registro recomendado` : "Dia operativo completo. Revisa progreso o nutricion para interpretar tendencias.";

  useEffect(() => {
    if (!nextModule) {
      setVisibleModuleKey(null);
      setIsModuleTransitioning(false);
      return;
    }

    if (!visibleModuleKey) {
      setVisibleModuleKey(nextModule.key);
      setIsModuleTransitioning(false);
      return;
    }

    if (visibleModuleKey === nextModule.key) return;

    setIsModuleTransitioning(true);
    const timeoutId = window.setTimeout(() => {
      setVisibleModuleKey(nextModule.key);
      setIsModuleTransitioning(false);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [nextModule, visibleModuleKey]);

  const visibleModule = missingModules.find((module) => module.key === visibleModuleKey) ?? nextModule;
  const visibleWidgetKeySet = useMemo(() => new Set<DashboardHomeWidgetKey>(selectedWidgetKeys), [selectedWidgetKeys]);
  const isWidgetVisible = (widgetKey: DashboardHomeWidgetKey) => widgetKey === "hero_modules" || visibleWidgetKeySet.has(widgetKey);

  const saveModulePreferencesMutation = useMutation({
    mutationFn: (next: DashboardCheckinModuleKey[]) => saveDashboardCheckinModulePreferences(user?.id ?? null, next, { isGuest }),
    onSuccess: (saved) => {
      queryClient.setQueryData(modulePreferencesKey, saved);
      toast.success("Modulos del check-in actualizados.");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "No se pudieron guardar los modulos."));
    },
  });
  const saveWidgetPreferencesMutation = useMutation({
    mutationFn: (next: DashboardHomeWidgetKey[]) => saveDashboardHomeWidgetPreferences(user?.id ?? null, next, { isGuest }),
    onSuccess: (saved) => {
      queryClient.setQueryData(widgetPreferencesKey, saved);
      toast.success("Widgets del dashboard actualizados.");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "No se pudieron guardar los widgets."));
    },
  });

  const handleToggleModule = (moduleKey: DashboardCheckinModuleKey, enabled: boolean) => {
    const next = enabled
      ? Array.from(new Set([...selectedModuleKeys, moduleKey]))
      : selectedModuleKeys.filter((key) => key !== moduleKey);
    if (next.length === 0) {
      toast.error("Debes mantener al menos un modulo activo.");
      return;
    }
    saveModulePreferencesMutation.mutate(next);
  };

  const handleToggleWidget = (widgetKey: DashboardHomeWidgetKey, enabled: boolean) => {
    const next = enabled
      ? Array.from(new Set([...selectedWidgetKeys, widgetKey]))
      : selectedWidgetKeys.filter((key) => key !== widgetKey);
    if (next.length === 0) {
      toast.error("Debes mantener al menos un widget visible.");
      return;
    }
    saveWidgetPreferencesMutation.mutate(next);
  };

  const nutritionSummary = useMemo(
    () => {
      if (!core?.nutritionToday) return null;
      const archetypeKey = core.nutritionToday.targetBreakdown?.dayArchetype ?? "base";
      const archetypeMeta = NUTRITION_ARCHETYPE_META[archetypeKey] ?? NUTRITION_ARCHETYPE_META.base;
      return {
        profileName:
          core.nutritionToday.selectedProfile?.name ?? core.nutritionToday.dailyLog?.profile_name_snapshot ?? "Sin perfil",
        archetypeLabel: archetypeMeta.label,
        targetCalories: core.nutritionToday.goals.calorie_goal,
        consumedCalories: core.nutritionToday.totals.calories,
        proteinGoal: core.nutritionToday.goals.protein_goal_g,
        carbsGoal: core.nutritionToday.goals.carb_goal_g,
        fatGoal: core.nutritionToday.goals.fat_goal_g,
      };
    },
    [core?.nutritionToday],
  );
  const visibleRightCards = useMemo(
    () => visibleWidgetKeySet.has("hero_recovery") || visibleWidgetKeySet.has("hero_focus"),
    [visibleWidgetKeySet],
  );
  const visibleStatusRow = isWidgetVisible("status_row");
  const stackCards = useMemo(() => {
    const cards: DashboardStackCard[] = [];
    const widgetIsVisible = (widgetKey: DashboardHomeWidgetKey) =>
      widgetKey === "hero_modules" || visibleWidgetKeySet.has(widgetKey);

    if (widgetIsVisible("physical_progress")) {
      cards.push({
        key: "physical_progress",
        weight: 5,
        preferredColumn: "left",
        mobileOrder: 10,
        node: <PhysicalProgressHub loading={snapshot.coreLoading} summary={core?.physicalSummary ?? null} />,
      });
    }

    if (widgetIsVisible("quick_actions")) {
      cards.push({
        key: "quick_actions",
        weight: 4,
        preferredColumn: "right",
        mobileOrder: 20,
        node: <DashboardQuickActions nextActionLabel={nextActionLabel} nutritionSummary={nutritionSummary} />,
      });
    }

    if (widgetIsVisible("nutrition")) {
      cards.push({
        key: "nutrition",
        weight: 8,
        preferredColumn: "left",
        mobileOrder: 30,
        node: (
          <section id="nutrition" className="min-w-0">
            <TodayMealsModule />
          </section>
        ),
      });
    }

    if (widgetIsVisible("water")) {
      cards.push({
        key: "water",
        weight: 5,
        preferredColumn: "right",
        mobileOrder: 40,
        node: (
          <section id="water" className="min-w-0">
            <WaterCard showHistoryButton={false} />
          </section>
        ),
      });
    }

    if (widgetIsVisible("weight")) {
      cards.push({
        key: "weight",
        weight: 4,
        preferredColumn: "right",
        mobileOrder: 50,
        node: (
          <section id="weight" className="min-w-0">
            <TodayWeightModule />
          </section>
        ),
      });
    }

    if (widgetIsVisible("sleep")) {
      cards.push({
        key: "sleep",
        weight: 4,
        preferredColumn: "right",
        mobileOrder: 60,
        node: (
          <section id="sleep" className="min-w-0">
            <SleepCard />
          </section>
        ),
      });
    }

    if (widgetIsVisible("biofeedback")) {
      cards.push({
        key: "biofeedback",
        weight: 5,
        preferredColumn: "right",
        mobileOrder: 70,
        node: (
          <section id="biofeedback" className="min-w-0">
            <TodayBiofeedbackModule />
          </section>
        ),
      });
    }

    if (widgetIsVisible("body_measurements")) {
      cards.push({
        key: "body_measurements",
        weight: 6,
        preferredColumn: "left",
        mobileOrder: 80,
        node: (
          <BodyMeasurementsCard
            loading={snapshot.coreLoading}
            latest={core?.latestMeasurement ?? null}
            previous={core?.previousMeasurement ?? null}
            latestWeight={core?.latestMeasurementWeight ?? null}
            waistComparison={core?.waistComparison ?? { deltaCm: null, label: "Sin referencia previa", referenceDateKey: null }}
            goalDirection={core?.goal?.goal_direction ?? null}
          />
        ),
      });
    }

    if (widgetIsVisible("notes")) {
      cards.push({
        key: "notes",
        weight: 5,
        preferredColumn: "right",
        mobileOrder: 90,
        node: (
          <TacticalNotesCard
            loading={snapshot.coreLoading}
            todayNote={core?.noteToday ?? null}
            latestNote={core?.noteLatest ?? null}
            onSave={(payload) => saveNoteMutation.mutateAsync(payload).then(() => undefined)}
          />
        ),
      });
    }

    if (widgetIsVisible("recovery_card")) {
      cards.push({
        key: "recovery_card",
        weight: 5,
        preferredColumn: "right",
        mobileOrder: 100,
        node: (
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
        ),
      });
    }

    if (widgetIsVisible("calendar")) {
      cards.push({
        key: "calendar",
        weight: 5,
        preferredColumn: "left",
        mobileOrder: 110,
        node: (
          <CalendarMiniWidget
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            activity={snapshot.monthActivity}
            loading={snapshot.monthActivityLoading}
          />
        ),
      });
    }

    return cards;
  }, [
    core?.goal?.goal_direction,
    core?.latestMeasurement,
    core?.latestMeasurementWeight,
    core?.noteLatest,
    core?.noteToday,
    core?.physicalSummary,
    core?.previousMeasurement,
    core?.recovery.drivers,
    core?.recovery.score,
    core?.recovery.status,
    core?.recovery.subscores,
    core?.waistComparison,
    currentMonth,
    visibleWidgetKeySet,
    nextActionLabel,
    nutritionSummary,
    saveNoteMutation,
    snapshot.coreLoading,
    snapshot.monthActivity,
    snapshot.monthActivityLoading,
  ]);
  const desktopColumns = useMemo(() => balanceDashboardColumns(stackCards), [stackCards]);

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <AppPageIntro
          eyebrow="Panel diario"
          icon={<Crosshair className="h-3.5 w-3.5" />}
          title="Centro operativo"
          description="Registra peso, hidratacion, sueno, medidas, biofeedback y comidas desde una sola pantalla."
          titleClassName="text-2xl sm:text-3xl"
          descriptionClassName="max-w-2xl"
          actions={<Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="app-outline-button rounded-2xl">
              <Settings2 className="mr-2 h-4 w-4" />
              Widgets visibles
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-sm space-y-4 sm:w-96">
            <div className="space-y-2">
              <p className="text-sm font-medium">Centro operativo</p>
              <p className="text-xs text-muted-foreground">Controla que tarjetas aparecen en la pestana Centro operativo.</p>
              <div className="grid max-h-72 gap-2 overflow-auto pr-1">
                {DASHBOARD_HOME_WIDGET_DEFINITIONS.filter((widget) => widget.key !== "hero_modules").map((widget) => {
                  const checked = selectedWidgetKeys.includes(widget.key);
                  return (
                    <div key={widget.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dashboard-widget-${widget.key}`}
                        checked={checked}
                        onCheckedChange={(value) => handleToggleWidget(widget.key, Boolean(value))}
                        disabled={saveWidgetPreferencesMutation.isPending}
                      />
                      <Label htmlFor={`dashboard-widget-${widget.key}`} className="text-sm font-normal">
                        {widget.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
          </Popover>}
        />

        <Card className="app-surface-hero overflow-hidden rounded-[22px] md:rounded-[28px]">
        <CardContent className={cn("grid gap-3 p-3 sm:gap-4 sm:p-4 md:gap-6 md:p-6", visibleRightCards && "xl:grid-cols-[1.5fr_0.9fr]")}>
          <div className="space-y-4">
            {isWidgetVisible("hero_routine") ? (
            <div className="app-surface-tile rounded-2xl p-3 md:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="app-surface-caption flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                    <Dumbbell className="h-3.5 w-3.5" />
                    Rutina de hoy
                  </div>
                  <div className="app-surface-heading mt-2 text-base font-semibold md:text-lg">{trainingTodayQuery.isLoading ? "Cargando..." : workoutCardTitle}</div>
                  <p className="app-surface-muted mt-1 text-sm">{workoutCardSubtitle}</p>
                </div>
                <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                  <Button asChild variant="outline" className="app-outline-button w-full sm:w-auto">
                    <Link to="/training?tab=today">Ver rutina</Link>
                  </Button>
                  <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                    <Link to="/training?tab=library">Ir a ejercicios</Link>
                  </Button>
                </div>
              </div>
            </div>
            ) : null}
            <div className="grid gap-2 md:gap-3 md:grid-cols-[1fr_1.25fr_1fr]">
              {isWidgetVisible("hero_date") ? (
              <div className="app-surface-tile rounded-2xl p-3 md:p-4">
                <div className="app-surface-caption text-[11px] uppercase tracking-[0.14em]">Fecha</div>
                <div className="app-surface-heading mt-2 text-base font-semibold md:text-lg">{core?.todayLabel ?? "Cargando..."}</div>
              </div>
              ) : null}
              <div className="app-surface-tile rounded-2xl p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="app-surface-caption text-[11px] uppercase tracking-[0.14em]">Modulos completos</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="app-surface-muted h-7 w-7 rounded-full hover:bg-background/60 hover:text-foreground">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-sm space-y-4 sm:w-96">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Check-in del dia</p>
                        <p className="text-xs text-muted-foreground">Elige que modulos cuentan para marcar tu dia como completo.</p>
                        <div className="grid gap-2">
                          {DASHBOARD_CHECKIN_MODULE_DEFINITIONS.map((module) => {
                            const checked = selectedModuleKeys.includes(module.key);
                            return (
                              <div key={module.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`dashboard-module-${module.key}`}
                                  checked={checked}
                                  onCheckedChange={(value) => handleToggleModule(module.key, Boolean(value))}
                                  disabled={saveModulePreferencesMutation.isPending}
                                />
                                <Label htmlFor={`dashboard-module-${module.key}`} className="text-sm font-normal">
                                  {module.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="hidden space-y-2 border-t pt-4">
                        <p className="hidden text-sm font-medium">Widgets visibles</p>
                        <p className="text-xs text-muted-foreground">Controla que tarjetas aparecen en la pestana Hoy.</p>
                        <div className="grid max-h-60 gap-2 overflow-auto pr-1">
                          {DASHBOARD_HOME_WIDGET_DEFINITIONS.filter((widget) => widget.key !== "hero_modules").map((widget) => {
                            const checked = selectedWidgetKeys.includes(widget.key);
                            return (
                              <div key={widget.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`dashboard-widget-${widget.key}`}
                                  checked={checked}
                                  onCheckedChange={(value) => handleToggleWidget(widget.key, Boolean(value))}
                                  disabled={saveWidgetPreferencesMutation.isPending}
                                />
                                <Label htmlFor={`dashboard-widget-${widget.key}`} className="text-sm font-normal">
                                  {widget.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="app-surface-heading mt-2 flex items-center gap-2 text-base font-semibold md:text-lg">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {completionCount}/{dailyModules.length}
                </div>
                <div className="mt-3 space-y-2">
                  {snapshot.coreLoading || snapshot.monthActivityLoading ? (
                    <p className="app-surface-muted text-sm">Analizando modulos pendientes...</p>
                  ) : missingModules.length === 0 ? (
                    <p className="app-surface-muted text-sm">Dia operativo completo. No hay registros pendientes.</p>
                  ) : (
                    <>
                      {visibleModule ? (
                        <div
                          key={visibleModule.key}
                          className={`app-surface-soft flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-all duration-200 ${
                            isModuleTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
                          }`}
                        >
                          <span className="app-surface-heading text-sm">{visibleModule.label}</span>
                          <Button asChild size="sm" className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                            {visibleModule.href.startsWith("#") ? <a href={visibleModule.href}>Registrar</a> : <Link to={visibleModule.href}>Registrar</Link>}
                          </Button>
                        </div>
                      ) : null}
                      <p className="app-surface-muted text-xs">
                        {remainingModuleCount > 0 ? `${remainingModuleCount} registros restantes...` : "Ultimo registro pendiente."}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {isWidgetVisible("hero_consistency") ? (
              <div className="app-surface-tile rounded-2xl p-3 md:p-4">
                <div className="app-surface-caption text-[11px] uppercase tracking-[0.14em]">Consistencia 7d</div>
                <div className="app-surface-heading mt-2 flex items-center gap-2 text-base font-semibold md:text-lg">
                  <TimerReset className="h-4 w-4 text-primary" />
                  {core?.activeDays7 ?? 0} dias activos
                </div>
              </div>
              ) : null}
            </div>
          </div>

          {visibleRightCards ? (
          <div className="grid gap-2 md:gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {isWidgetVisible("hero_recovery") ? (
            <div className="app-surface-tile rounded-2xl p-3 md:p-4">
              <div className="app-surface-caption text-[11px] uppercase tracking-[0.14em]">Recuperacion</div>
              <div className="app-surface-heading mt-2 text-3xl font-black md:text-4xl">{core?.recovery.score ?? 0}</div>
              <p className="app-surface-muted mt-2 text-sm">{core?.recovery.status ?? "Analizando..."}</p>
            </div>
            ) : null}
            {isWidgetVisible("hero_focus") ? (
            <div className="app-surface-tile rounded-2xl p-3 md:p-4">
              <div className="app-surface-caption flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                <CalendarDays className="h-3.5 w-3.5" />
                Enfoque
              </div>
              <p className="app-surface-muted mt-2 text-sm">{nextActionLabel}</p>
            </div>
            ) : null}
          </div>
          ) : null}
        </CardContent>
      </Card>

      {visibleStatusRow ? (
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
      ) : null}

      {stackCards.length > 0 ? (
        <>
          <div className="space-y-4 xl:hidden">
            {desktopColumns.orderedCards.map((card) => (
              <div key={`mobile-${card.key}`} className="min-w-0">
                {card.node}
              </div>
            ))}
          </div>

          <div
            className={cn(
              "hidden xl:items-start xl:gap-4",
              desktopColumns.left.length > 0 && desktopColumns.right.length > 0
                ? "xl:grid xl:grid-cols-[minmax(0,1.42fr)_minmax(320px,0.94fr)]"
                : "xl:block",
            )}
          >
            {desktopColumns.left.length > 0 ? (
              <div className="space-y-4">
                {desktopColumns.left.map((card) => (
                  <div key={`left-${card.key}`} className="min-w-0">
                    {card.node}
                  </div>
                ))}
              </div>
            ) : null}

            {desktopColumns.right.length > 0 ? (
              <div className="space-y-4">
                {desktopColumns.right.map((card) => (
                  <div key={`right-${card.key}`} className="min-w-0">
                    {card.node}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      </div>
    </div>
  );
};

export default Dashboard;
