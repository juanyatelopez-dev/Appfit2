import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import { CalendarDays, CheckCircle2, Dumbbell, RefreshCcw, Settings2, Sparkles, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import BodyMeasurementsCard from "@/components/dashboard/BodyMeasurementsCard";
import DashboardCardShell from "@/components/dashboard/DashboardCardShell";
import DashboardCardStack from "@/components/dashboard/DashboardCardStack";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import CalendarMiniWidget from "@/components/dashboard/CalendarMiniWidget";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardSectionTitle from "@/components/dashboard/DashboardSectionTitle";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";
import {
  loadDashboardCardDensity,
  saveDashboardCardDensity,
  type DashboardCardDensity,
} from "@/features/dashboard/dashboardDensity";
import { buildDashboardViewModel } from "@/features/dashboard/dashboardViewModel";
import type { DashboardStackCard } from "@/features/dashboard/dashboardTypes";
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

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { user, isGuest, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const snapshot = useDashboardSnapshot(currentMonth);
  const [visibleModuleKey, setVisibleModuleKey] = useState<string | null>(null);
  const [isModuleTransitioning, setIsModuleTransitioning] = useState(false);
  const [showExtendedView, setShowExtendedView] = useState(false);
  const [cardDensity, setCardDensity] = useState<DashboardCardDensity>(() => loadDashboardCardDensity());
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
  const dashboardViewModel = useMemo(
    () =>
      buildDashboardViewModel({
        core,
        todayKey: snapshot.todayKey,
        todayActivity,
        monthActivity: snapshot.monthActivity,
        selectedModuleKeys,
        activeWorkout,
        scheduledWorkout,
      }),
    [activeWorkout, core, scheduledWorkout, selectedModuleKeys, snapshot.monthActivity, snapshot.todayKey, todayActivity],
  );
  const {
    dailyModules,
    completionCount,
    missingModules,
    nextModule,
    remainingModuleCount,
    todayCompletionPct,
    pendingChecklist,
    nextActionLabel,
    primaryAction,
    weeklyConsistency,
    upcomingItems,
  } = dashboardViewModel;

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

  useEffect(() => {
    saveDashboardCardDensity(cardDensity);
  }, [cardDensity]);

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
  const visibleStatusRow = isWidgetVisible("status_row");
  const showPrimaryTodayGrid =
    isWidgetVisible("nutrition") ||
    isWidgetVisible("water") ||
    isWidgetVisible("sleep") ||
    isWidgetVisible("weight");
  const stackCards = useMemo(() => {
    const cards: DashboardStackCard[] = [];
    const widgetIsVisible = (widgetKey: DashboardHomeWidgetKey) =>
      widgetKey === "hero_modules" || visibleWidgetKeySet.has(widgetKey);

    if (widgetIsVisible("physical_progress")) {
      cards.push({
        key: "physical_progress",
        placement: {
          weight: 5,
          preferredColumn: "left",
          mobileOrder: 10,
        },
        node: <PhysicalProgressHub loading={snapshot.coreLoading} summary={core?.physicalSummary ?? null} />,
      });
    }

    if (widgetIsVisible("quick_actions")) {
      cards.push({
        key: "quick_actions",
        placement: {
          weight: 4,
          preferredColumn: "right",
          mobileOrder: 80,
        },
        node: <DashboardQuickActions nextActionLabel={nextActionLabel} nutritionSummary={nutritionSummary} />,
      });
    }

    if (widgetIsVisible("biofeedback")) {
      cards.push({
        key: "biofeedback",
        placement: {
          weight: 5,
          preferredColumn: "right",
          mobileOrder: 30,
        },
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
        placement: {
          weight: 6,
          preferredColumn: "left",
          mobileOrder: 40,
        },
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
        placement: {
          weight: 5,
          preferredColumn: "right",
          mobileOrder: 50,
        },
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
        placement: {
          weight: 5,
          preferredColumn: "right",
          mobileOrder: 60,
        },
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
    visibleWidgetKeySet,
    nextActionLabel,
    nutritionSummary,
    saveNoteMutation,
    snapshot.coreLoading,
  ]);
  const defaultSecondaryCardLimit = 4;
  const visibleStackCards = useMemo(
    () => (showExtendedView ? stackCards : stackCards.slice(0, defaultSecondaryCardLimit)),
    [showExtendedView, stackCards],
  );
  const isCompactDensity = cardDensity === "compact";
  const denseSectionGapClass = isCompactDensity ? "gap-2" : "gap-3";
  const denseCardContentClass = isCompactDensity ? "space-y-2 p-3 md:p-4" : "space-y-3 p-4 md:p-5";
  const denseActionContentClass = isCompactDensity ? "space-y-3 p-3 md:p-4" : "space-y-4 p-4 md:p-5";
  const densePrimaryGridClass = isCompactDensity ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-4" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";
  const denseHeroContentClass = isCompactDensity
    ? "grid gap-2 p-3 sm:gap-3 sm:p-4 md:gap-4 md:p-5"
    : "grid gap-3 p-3 sm:gap-4 sm:p-4 md:gap-6 md:p-6";
  const greetingLabel = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos dias";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  }, []);
  const profileDisplayName = useMemo(() => {
    const fullName = (profile as { full_name?: string } | null)?.full_name?.trim();
    if (!fullName) return "atleta";
    const [firstName] = fullName.split(/\s+/);
    return firstName || "atleta";
  }, [profile]);

  const handleSyncDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard_training_today"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
    ]);
    toast.success("Dashboard sincronizado.");
  };

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <section aria-labelledby="dashboard-zone-hero" className="space-y-4">
          <h2 id="dashboard-zone-hero" className="sr-only">Zona hero operativo</h2>
          <div className="app-surface-tile rounded-3xl border border-border/60 bg-card/70 p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Dashboard principal</p>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                  {greetingLabel}, <span className="text-primary">{profileDisplayName}</span>
                </h1>
                <p className="text-sm text-muted-foreground">{core?.todayLabel ?? "Cargando fecha..."}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="app-outline-button rounded-xl">
                      <Settings2 className="mr-2 h-4 w-4" />
                      Widgets y densidad
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-sm space-y-4 sm:w-96">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Densidad de cards</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={cardDensity === "compact" ? "default" : "outline"}
                          className="h-8 rounded-lg text-xs"
                          onClick={() => setCardDensity("compact")}
                        >
                          Compacto
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={cardDensity === "comfortable" ? "default" : "outline"}
                          className="h-8 rounded-lg text-xs"
                          onClick={() => setCardDensity("comfortable")}
                        >
                          Comodo
                        </Button>
                      </div>
                    </div>
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
                </Popover>
                <Button type="button" className="rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90" onClick={() => void handleSyncDashboard()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Sincronizar
                </Button>
              </div>
            </div>
          </div>

        <Card className="app-surface-hero overflow-hidden rounded-[22px] md:rounded-[28px]">
        <CardContent className={cn(denseHeroContentClass, "xl:grid-cols-[1.55fr_0.85fr]")}>
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
                    <Link to="/training?tab=library">Iniciar entrenamiento</Link>
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
                    <DashboardLoadingState className="app-surface-muted" message="Analizando modulos pendientes..." />
                  ) : missingModules.length === 0 ? (
                    <DashboardEmptyState className="app-surface-muted text-sm" message="Dia operativo completo. No hay registros pendientes." />
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

          <div className="grid gap-2 md:gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {isWidgetVisible("hero_recovery") ? (
            <div className="app-surface-tile rounded-2xl p-3 md:p-4">
              <div className="app-surface-caption text-[11px] uppercase tracking-[0.14em]">Recovery score</div>
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
              <div className="mt-3">
                {primaryAction.href.startsWith("#") ? (
                  <Button asChild size="sm" className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    <a href={primaryAction.href}>{primaryAction.label}</a>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    <Link to={primaryAction.href}>{primaryAction.label}</Link>
                  </Button>
                )}
              </div>
            </div>
            ) : null}
            <div className="app-surface-tile rounded-2xl p-3 md:p-4">
              <div className="app-surface-caption flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                <Sparkles className="h-3.5 w-3.5" />
                Progreso semanal
              </div>
              <p className="app-surface-heading mt-2 text-base font-semibold md:text-lg">{weeklyConsistency.completedCount}/7 completado</p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {weeklyConsistency.days.map((day) => (
                  <div
                    key={`hero-week-${day.dateKey}`}
                    className={cn(
                      "rounded-md border px-1.5 py-1 text-center text-[11px] font-semibold",
                      day.completed ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground",
                      day.isToday && "ring-1 ring-primary/30",
                    )}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </section>

      {visibleStatusRow ? (
        <section aria-labelledby="dashboard-zone-status" className="space-y-2">
          <h2 id="dashboard-zone-status" className="sr-only">Indicadores rapidos del dia</h2>
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
        </section>
      ) : null}

      <section aria-labelledby="dashboard-zone-actions" className={cn("grid xl:grid-cols-4", denseSectionGapClass)}>
        <h2 id="dashboard-zone-actions" className="sr-only">Zona de accion inmediata</h2>
        <DashboardCardShell title="Accion recomendada" className="h-full xl:col-span-2" contentClassName={denseActionContentClass}>
          <p className="text-sm text-muted-foreground">{nextActionLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            {primaryAction.href.startsWith("#") ? (
              <Button asChild className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 motion-reduce:transform-none motion-reduce:transition-none">
                <a href={primaryAction.href}>{primaryAction.label}</a>
              </Button>
            ) : (
              <Button asChild className="h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 motion-reduce:transform-none motion-reduce:transition-none">
                <Link to={primaryAction.href}>{primaryAction.label}</Link>
              </Button>
            )}
            <div className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {completionCount}/{dailyModules.length} completos
            </div>
            <div className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {missingModules.length} pendientes
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${todayCompletionPct}%` }} />
            </div>
            {pendingChecklist.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {pendingChecklist.slice(0, 2).map((module) => (
                  <div key={`action-${module.key}`} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                    <p className="text-xs font-medium">{module.label}</p>
                    <span className="text-[11px] text-muted-foreground">Pendiente</span>
                  </div>
                ))}
              </div>
            ) : (
              <DashboardEmptyState message="Sin pendientes criticos. Mantienes buen ritmo hoy." />
            )}
          </div>
        </DashboardCardShell>

        <DashboardCardShell title="Avance operativo del dia" className="h-full" contentClassName={denseCardContentClass}>
          <div className="flex items-end justify-between gap-3">
            <p className="text-3xl font-black leading-none">{todayCompletionPct}%</p>
            <p className="text-sm text-muted-foreground">{completionCount}/{dailyModules.length} controles completos</p>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${todayCompletionPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Incluye agua, sueno, peso, biofeedback y nutricion segun tu configuracion.</p>
        </DashboardCardShell>

        <DashboardCardShell title="Pendientes prioritarios" className="h-full" contentClassName={denseCardContentClass}>
          {pendingChecklist.length > 0 ? (
            <div className="space-y-2">
              {pendingChecklist.map((module) => (
                <div key={module.key} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-sm font-medium">{module.label}</p>
                  {module.href.startsWith("#") ? (
                    <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                      <a href={module.href}>Registrar</a>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                      <Link to={module.href}>Registrar</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmptyState message="No hay pendientes criticos. Mantienes el dia bajo control." />
          )}
        </DashboardCardShell>
      </section>

      {showPrimaryTodayGrid ? (
        <section aria-labelledby="dashboard-zone-ops" className={cn("space-y-3", isCompactDensity && "space-y-2")}>
          <h2 id="dashboard-zone-ops" className="sr-only">Zona de operacion diaria</h2>
          <div className="flex items-center justify-between gap-3 px-1">
            <DashboardSectionTitle>Registros clave de hoy</DashboardSectionTitle>
            <p className="text-xs text-muted-foreground">Solo lo necesario para operar el dia.</p>
          </div>
          <div className={densePrimaryGridClass}>
            {isWidgetVisible("water") ? (
              <section id="water" className="min-w-0 h-full">
                <WaterCard showHistoryButton={false} />
              </section>
            ) : null}
            {isWidgetVisible("nutrition") ? (
              <section id="nutrition" className="min-w-0 h-full">
                <TodayMealsModule />
              </section>
            ) : null}
            {isWidgetVisible("sleep") ? (
              <section id="sleep" className="min-w-0 h-full">
                <SleepCard />
              </section>
            ) : null}
            {isWidgetVisible("weight") ? (
              <section id="weight" className="min-w-0 h-full">
                <TodayWeightModule />
              </section>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="dashboard-zone-insights" className={cn("grid xl:grid-cols-[1.2fr_1fr_1fr]", denseSectionGapClass)}>
        <h2 id="dashboard-zone-insights" className="sr-only">Zona de insights y contexto</h2>
        <DashboardCardShell
          title="Consistencia semanal"
          titleRight={<p className="text-sm font-semibold">{weeklyConsistency.completedCount}/7</p>}
          contentClassName={denseCardContentClass}
        >
          <div className="grid grid-cols-7 gap-2">
            {weeklyConsistency.days.map((day) => (
              <div
                key={day.dateKey}
                className={cn(
                  "rounded-lg border px-2 py-2 text-center text-xs font-semibold",
                  day.completed ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground",
                  day.isToday && "ring-1 ring-primary/40",
                )}
              >
                {day.label}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Se marca como completo cuando registras al menos dos controles del dia.</p>
        </DashboardCardShell>

        <DashboardCardShell title="Proximos" contentClassName={denseCardContentClass}>
          {upcomingItems.length > 0 ? (
            <div className="space-y-2">
              {upcomingItems.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmptyState message="No hay pendientes criticos para hoy. Continua con tu plan." />
          )}
        </DashboardCardShell>

        <section className="min-w-0">
          <CalendarMiniWidget
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            activity={snapshot.monthActivity}
            loading={snapshot.monthActivityLoading}
          />
        </section>
      </section>

      <section aria-labelledby="dashboard-zone-extension" className="space-y-4">
        <h2 id="dashboard-zone-extension" className="sr-only">Zona de extension progresiva</h2>
        {stackCards.length > defaultSecondaryCardLimit ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="app-outline-button rounded-xl px-4"
              onClick={() => setShowExtendedView((current) => !current)}
            >
              {showExtendedView ? "Ver menos modulos" : "Ver mas modulos"}
            </Button>
          </div>
        ) : null}

        <DashboardCardStack cards={visibleStackCards} />
      </section>
      </div>
    </div>
  );
};

export default Dashboard;
