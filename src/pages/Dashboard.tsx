import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  RefreshCcw,
  Settings2,
  Sparkles,
  TimerReset,
  UtensilsCrossed,
} from "lucide-react";
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

type DailyMetricCardProps = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  valueLabel: string;
  goalLabel: string;
  progressPct: number;
  accentClassName: string;
  actionHref: string;
  actionLabel: string;
};

const DashboardMetricCard = ({
  title,
  icon: Icon,
  valueLabel,
  goalLabel,
  progressPct,
  accentClassName,
  actionHref,
  actionLabel,
}: DailyMetricCardProps) => (
  <Card className="group rounded-2xl border-border/60 bg-card/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <CardContent className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-xl border border-border/60 bg-background/60 p-2", accentClassName)}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold tracking-tight">{title}</p>
        </div>
        <Link
          to={actionHref}
          aria-label={actionLabel}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/70 text-base font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {actionLabel}
        </Link>
      </div>
      <div className="space-y-1">
        <p className="text-[2rem] font-black leading-none">{valueLabel}</p>
        <p className="text-sm font-semibold text-muted-foreground">{goalLabel}</p>
      </div>
      <div className="h-2 rounded-full bg-muted/70">
        <div
          className={cn("h-2 rounded-full transition-all duration-300", accentClassName)}
          style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
        />
        </div>
    </CardContent>
  </Card>
);

const formatDurationLabel = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return "--";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  if (mins <= 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
};

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
  const visibleStackCards = useMemo(() => (showExtendedView ? stackCards : []), [showExtendedView, stackCards]);
  const isCompactDensity = cardDensity === "compact";
  const denseSectionGapClass = isCompactDensity ? "gap-2" : "gap-3";
  const denseCardContentClass = isCompactDensity ? "space-y-2 p-3 md:p-4" : "space-y-3 p-4 md:p-5";
  const denseActionContentClass = isCompactDensity ? "space-y-3 p-3 md:p-4" : "space-y-4 p-4 md:p-5";
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

  const recoveryScore = core?.recovery.score ?? 0;
  const recoveryBand = recoveryScore >= 75 ? "ALTO" : recoveryScore >= 45 ? "MEDIO" : "BAJO";
  const recoveryAccentClass = recoveryScore >= 75 ? "text-emerald-400" : recoveryScore >= 45 ? "text-amber-400" : "text-rose-400";
  const recoveryBarClass = recoveryScore >= 75 ? "bg-emerald-500" : recoveryScore >= 45 ? "bg-amber-500" : "bg-rose-500";
  const hydrationProgress = Math.min(100, Math.round(((core?.waterTodayMl ?? 0) / Math.max(core?.waterGoalMl ?? 2000, 1)) * 100));
  const sleepProgress = Math.min(
    100,
    Math.round(((core?.sleepDay?.total_minutes ?? 0) / Math.max(core?.sleepGoalMinutes ?? 480, 1)) * 100),
  );
  const energyLabel = core?.bioToday?.daily_energy !== null && core?.bioToday?.daily_energy !== undefined ? `${core.bioToday.daily_energy}/10` : "--";
  const stressLabel = core?.bioToday?.perceived_stress !== null && core?.bioToday?.perceived_stress !== undefined ? `${core.bioToday.perceived_stress}/10` : "--";

  const recommendationLabel =
    recoveryScore >= 75
      ? "Hoy puedes entrenar fuerte"
      : recoveryScore >= 45
      ? "Entrenamiento moderado recomendado"
      : "Entrenamiento ligero recomendado";
  const dayDemandLabel = recoveryScore >= 75 ? "Dia de alto rendimiento" : recoveryScore >= 45 ? "Dia de carga media" : "Dia de descarga";

  const nutritionTotals = core?.nutritionToday?.totals;
  const nutritionGoals = core?.nutritionToday?.goals;
  const consumedCalories = nutritionTotals?.calories ?? 0;
  const targetCalories = nutritionGoals?.calorie_goal ?? 2000;
  const remainingCalories = Math.max(targetCalories - consumedCalories, 0);
  const caloriesProgress = Math.min(100, Math.round((consumedCalories / Math.max(targetCalories, 1)) * 100));

  const proteinCurrent = nutritionTotals?.protein_g ?? 0;
  const carbsCurrent = nutritionTotals?.carbs_g ?? 0;
  const fatCurrent = nutritionTotals?.fat_g ?? 0;
  const proteinGoal = nutritionGoals?.protein_goal_g ?? 160;
  const carbsGoal = nutritionGoals?.carb_goal_g ?? 250;
  const fatGoal = nutritionGoals?.fat_goal_g ?? 70;

  const workoutExercises = (activeWorkout?.exercises ?? scheduledWorkout?.exercises ?? []).slice(0, 4);
  const estimatedWorkoutMinutes = Math.max(
    workoutExercises.reduce((sum, exercise) => sum + Math.max(Number(exercise.rest_seconds || 0), 45) * Math.max(Number(exercise.target_sets || 0), 1), 0) / 60,
    0,
  );
  const exerciseCountLabel = workoutExercises.length > 0 ? `${workoutExercises.length} ejercicios visibles` : "Sin ejercicios configurados";

  const weightSeries = (core?.weightSnapshot?.entries ?? [])
    .slice(0, 7)
    .reverse()
    .map((row) => Number(row.weight_kg))
    .filter((value) => Number.isFinite(value));
  const weightMin = weightSeries.length > 0 ? Math.min(...weightSeries) : 0;
  const weightMax = weightSeries.length > 0 ? Math.max(...weightSeries) : 0;
  const weightPath = weightSeries
    .map((value, index) => {
      const x = weightSeries.length > 1 ? (index / (weightSeries.length - 1)) * 100 : 0;
      const y =
        weightMax === weightMin
          ? 50
          : 100 - ((value - weightMin) / Math.max(weightMax - weightMin, 1)) * 100;
      return `${x},${Math.max(6, Math.min(94, y))}`;
    })
    .join(" ");

  const quickActions = [
    { label: "+ Agua", href: "#water" },
    { label: "+ Comida", href: "/nutrition" },
    { label: "+ Peso", href: "#weight" },
    { label: "Check-in", href: "/today#biofeedback" },
  ];

  return (
    <div className="app-shell min-h-screen px-4 pb-5 pt-1 text-foreground sm:px-6 sm:pb-8 sm:pt-2">
      <div className="mx-auto max-w-[1540px] space-y-5">
        <section aria-labelledby="dashboard-zone-hero" className="space-y-3">
          <h2 id="dashboard-zone-hero" className="sr-only">Estado del dia</h2>
          <Card className="rounded-3xl border-border/60 bg-card/80">
            <CardContent className={denseHeroContentClass}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Dashboard / Centro operativo</p>
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                    {greetingLabel}, <span className="text-primary">{profileDisplayName}</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">{core?.todayLabel ?? "Cargando fecha..."}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-10 rounded-xl px-4">
                    Dia
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 rounded-xl px-3">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Widgets y densidad
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 space-y-4">
                      <div className="space-y-2 border-b pb-4">
                        <p className="text-sm font-medium">Densidad visual</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["comfortable", "compact"] as const).map((densityOption) => (
                            <Button
                              key={densityOption}
                              type="button"
                              size="sm"
                              variant={cardDensity === densityOption ? "default" : "outline"}
                              className="justify-center"
                              onClick={() => setCardDensity(densityOption)}
                            >
                              {densityOption === "comfortable" ? "Comodo" : "Compacto"}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 border-b pb-4">
                        <p className="text-sm font-medium">Modulos de check-in</p>
                        <div className="grid max-h-56 gap-2 overflow-auto pr-1">
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
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Widgets visibles</p>
                        <div className="grid max-h-56 gap-2 overflow-auto pr-1">
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

                  <Button onClick={handleSyncDashboard} className="h-10 rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Sincronizar
                  </Button>
                </div>
              </div>

              <div className={cn("grid items-stretch xl:grid-cols-[1.9fr_1fr]", denseSectionGapClass)}>
                <Card className="rounded-2xl border-border/60 bg-background/40">
                  <CardContent className="grid gap-4 p-4 md:grid-cols-[220px_1fr] md:p-5">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/70 p-4 text-center">
                      <p className="text-5xl font-black leading-none">{recoveryScore}</p>
                      <p className="mt-1 text-lg font-semibold text-muted-foreground">/100</p>
                      <p className={cn("mt-3 text-sm font-bold tracking-[0.2em]", recoveryAccentClass)}>{recoveryBand}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Recomendacion</p>
                          <p className="text-2xl font-black leading-tight">{recommendationLabel}</p>
                        </div>
                        {primaryAction.href.startsWith("#") ? (
                          <Button asChild className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                            <a href={primaryAction.href}>{primaryAction.label}</a>
                          </Button>
                        ) : (
                          <Button asChild className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                            <Link to={primaryAction.href}>{primaryAction.label}</Link>
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Recuperacion</p>
                          <p className={cn("mt-1 text-base font-semibold", recoveryAccentClass)}>{core?.recovery.status ?? "Analizando"}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Energia</p>
                          <p className="mt-1 text-base font-semibold">{energyLabel}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Estres</p>
                          <p className="mt-1 text-base font-semibold">{stressLabel}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Hidratacion</p>
                          <p className="mt-1 text-base font-semibold">{hydrationProgress}%</p>
                        </div>
                      </div>

                      <div className="h-2 rounded-full bg-muted">
                        <div className={cn("h-2 rounded-full transition-all duration-300", recoveryBarClass)} style={{ width: `${Math.max(8, recoveryScore)}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <DashboardCardShell title="Progreso semanal" contentClassName={denseCardContentClass}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-2xl font-black">{weeklyConsistency.completedCount}/7</p>
                    <p className="text-sm text-muted-foreground">completado</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {weeklyConsistency.days.map((day) => (
                      <div
                        key={`hero-week-${day.dateKey}`}
                        className={cn(
                          "rounded-md border px-1.5 py-1 text-center text-[11px] font-semibold",
                          day.completed ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground",
                          day.isToday && "ring-1 ring-primary/40",
                        )}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{completionCount}/{dailyModules.length} controles del dia completados.</p>
                </DashboardCardShell>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="dashboard-zone-metrics" className="space-y-2">
          <h2 id="dashboard-zone-metrics" className="sr-only">Metricas diarias</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <section id="water" className="min-w-0">
              <DashboardMetricCard
                title="Agua"
                icon={Droplets}
                valueLabel={`${(core?.waterTodayMl ?? 0).toLocaleString("es-PE")} ml`}
                goalLabel={`Meta ${(core?.waterGoalMl ?? 2000).toLocaleString("es-PE")} ml`}
                progressPct={hydrationProgress}
                accentClassName="bg-sky-500/90 text-sky-100"
                actionHref="#water"
                actionLabel="+"
              />
            </section>
            <section id="nutrition" className="min-w-0">
              <DashboardMetricCard
                title="Calorias"
                icon={Flame}
                valueLabel={`${consumedCalories.toLocaleString("es-PE")} kcal`}
                goalLabel={`Meta ${targetCalories.toLocaleString("es-PE")} kcal`}
                progressPct={caloriesProgress}
                accentClassName="bg-amber-500/90 text-amber-100"
                actionHref="/nutrition"
                actionLabel="+"
              />
            </section>
            <section id="sleep" className="min-w-0">
              <DashboardMetricCard
                title="Sueno"
                icon={Moon}
                valueLabel={`${((core?.sleepDay?.total_minutes ?? 0) / 60).toFixed(1)} h`}
                goalLabel={`Meta ${((core?.sleepGoalMinutes ?? 480) / 60).toFixed(1)} h`}
                progressPct={sleepProgress}
                accentClassName="bg-violet-500/90 text-violet-100"
                actionHref="/sleep"
                actionLabel="+"
              />
            </section>
            <DashboardMetricCard
              title="Pasos"
              icon={Footprints}
              valueLabel={`${(core?.activeDays7 ?? 0).toLocaleString("es-PE")} dias`}
              goalLabel="Meta 7 dias activos"
              progressPct={Math.min(100, Math.round(((core?.activeDays7 ?? 0) / 7) * 100))}
              accentClassName="bg-emerald-500/90 text-emerald-100"
              actionHref="/calendar"
              actionLabel="+"
            />
          </div>
        </section>

        <section aria-labelledby="dashboard-zone-main" className={cn("grid xl:grid-cols-[1.6fr_1.3fr_1fr]", denseSectionGapClass)}>
          <h2 id="dashboard-zone-main" className="sr-only">Bloques principales del dashboard</h2>

          <DashboardCardShell title="Entrenamiento de hoy" className="h-full" contentClassName={denseCardContentClass}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-2xl font-black leading-tight">{workoutCardTitle}</p>
                  <p className="text-sm text-muted-foreground">{dayDemandLabel}</p>
                </div>
                <div className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {exerciseCountLabel}
                </div>
              </div>

              {workoutExercises.length > 0 ? (
                <div className="space-y-2">
                  {workoutExercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                      <p className="text-sm font-medium">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {exercise.target_sets ?? 0}x{exercise.target_reps ?? "--"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <DashboardEmptyState message={workoutCardSubtitle} />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <Link to={activeWorkout ? "/training/session" : "/training"}>Iniciar entrenamiento</Link>
                </Button>
                <Button asChild variant="outline" className="h-10 rounded-xl px-4 text-sm">
                  <Link to="/training">Ver rutina</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                <Clock3 className="mr-1 inline h-4 w-4" />
                {formatDurationLabel(Math.round(estimatedWorkoutMinutes))} estimados
              </p>
            </div>
          </DashboardCardShell>

          <DashboardCardShell title="Nutricion" className="h-full" contentClassName={denseCardContentClass}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
                <div className="relative mx-auto h-28 w-28">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="12" className="text-muted/30" fill="none" />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="text-primary"
                      fill="none"
                      strokeDasharray={`${Math.min(100, Math.max(0, caloriesProgress)) * 3.02} 999`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-muted-foreground">Calorias</p>
                    <p className="text-xl font-black">{caloriesProgress}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Consumidas / Meta</p>
                    <p className="text-lg font-bold">
                      {consumedCalories.toLocaleString("es-PE")} / {targetCalories.toLocaleString("es-PE")} kcal
                    </p>
                    <p className="text-xs text-muted-foreground">Restantes {remainingCalories.toLocaleString("es-PE")} kcal</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Perfil: {nutritionSummary?.profileName ?? "Sin perfil"} - Dia {nutritionSummary?.archetypeLabel ?? "Base"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span>Proteina</span><span>{Math.round(proteinCurrent)} g / {Math.round(proteinGoal)} g</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((proteinCurrent / Math.max(proteinGoal, 1)) * 100))}%` }} /></div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span>Carbs</span><span>{Math.round(carbsCurrent)} g / {Math.round(carbsGoal)} g</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.min(100, Math.round((carbsCurrent / Math.max(carbsGoal, 1)) * 100))}%` }} /></div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span>Grasas</span><span>{Math.round(fatCurrent)} g / {Math.round(fatGoal)} g</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-rose-500" style={{ width: `${Math.min(100, Math.round((fatCurrent / Math.max(fatGoal, 1)) * 100))}%` }} /></div>
                </div>
              </div>

              <Button asChild className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Link to="/nutrition">Registrar comida</Link>
              </Button>
            </div>
          </DashboardCardShell>

          <div className="space-y-3">
            <DashboardCardShell title="Peso y progreso" contentClassName={denseCardContentClass}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Peso actual</p>
                <p className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  {core?.latestWeightDeltaKg !== null && core?.latestWeightDeltaKg !== undefined
                    ? `${core.latestWeightDeltaKg > 0 ? "+" : ""}${core.latestWeightDeltaKg.toFixed(1)} kg`
                    : "Sin delta"}
                </p>
              </div>
              <p className="text-4xl font-black leading-none">{core?.latestMeasurementWeight ? `${core.latestMeasurementWeight.toFixed(1)} kg` : "--"}</p>
              <div className="h-24 rounded-xl border border-border/60 bg-muted/10 p-2">
                {weightPath ? (
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <polyline fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" points={weightPath} />
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin datos de tendencia</div>
                )}
              </div>
            </DashboardCardShell>

            <section className="min-w-0">
              <CalendarMiniWidget
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                activity={snapshot.monthActivity}
                loading={snapshot.monthActivityLoading}
              />
            </section>

            <DashboardCardShell title="Resumen semanal" contentClassName={denseCardContentClass}>
              <p className="text-sm text-muted-foreground">{weeklyConsistency.completedCount}/7 dias completados</p>
              <p className="text-sm text-muted-foreground">
                {upcomingItems[0]?.title ? `${upcomingItems[0].title}: ${upcomingItems[0].detail}` : "Sin eventos prioritarios hoy."}
              </p>
            </DashboardCardShell>
          </div>
        </section>

        <section aria-labelledby="dashboard-zone-actions" className={cn("grid", denseSectionGapClass)}>
          <h2 id="dashboard-zone-actions" className="sr-only">Zona de accion inmediata</h2>

          <DashboardCardShell title="Acciones rapidas" contentClassName={denseActionContentClass}>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button key={action.label} asChild variant="outline" className="h-9 rounded-xl px-3 text-sm">
                  {action.href.startsWith("#") ? <a href={action.href}>{action.label}</a> : <Link to={action.href}>{action.label}</Link>}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Avance operativo del dia</span>
                <span>{todayCompletionPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${todayCompletionPct}%` }} />
              </div>
            </div>
          </DashboardCardShell>
        </section>

        <section aria-labelledby="dashboard-zone-extension" className="space-y-4">
          <h2 id="dashboard-zone-extension" className="sr-only">Zona de extension progresiva</h2>
          {stackCards.length > 0 ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="app-outline-button rounded-xl px-4"
                onClick={() => setShowExtendedView((current) => !current)}
              >
                {showExtendedView ? "Ocultar widgets opcionales" : "Mostrar widgets opcionales"}
              </Button>
            </div>
          ) : null}

          {showExtendedView ? <DashboardCardStack cards={visibleStackCards} /> : null}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;

