import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  CircleHelp,
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
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import DashboardCardShell from "@/components/dashboard/DashboardCardShell";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import CalendarMiniWidget from "@/components/dashboard/CalendarMiniWidget";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import TacticalNotesCard from "@/components/dashboard/TacticalNotesCard";
import TodayStatusRow from "@/components/dashboard/TodayStatusRow";
import TodayMealsModule from "@/components/daily/TodayMealsModule";
import TodayWeightModule from "@/components/daily/TodayWeightModule";
import SleepCard from "@/components/dashboard/SleepCard";
import WaterCard from "@/components/dashboard/WaterCard";
import WaterWorkspace from "@/components/water/WaterWorkspace";
import SleepWorkspace from "@/components/sleep/SleepWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppPageIntro } from "@/components/layout/AppPageIntro";
import { useAuth } from "@/context/AuthContext";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  loadDashboardCardDensity,
  saveDashboardCardDensity,
  type DashboardCardDensity,
} from "@/features/dashboard/dashboardDensity";
import { buildDashboardViewModel } from "@/features/dashboard/dashboardViewModel";
import type { DashboardStackCard } from "@/features/dashboard/dashboardTypes";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { getTrainingTodaySummary, getWorkoutDetail, listWorkouts, saveWorkoutScheduleDay, startWorkoutSession } from "@/modules/training/services";
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
  onActionClick?: () => void;
  comingSoon?: boolean;
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
  onActionClick,
  comingSoon = false,
}: DailyMetricCardProps) => (
  <Card className="group rounded-3xl border-border/60 bg-card/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <CardContent className="space-y-3 !p-4 md:!p-4">
      <div className="flex min-h-7 items-center justify-between gap-2 sm:min-h-8">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-xl border border-border/50 p-1.5", accentClassName)}>
            <Icon className="h-3 w-3" />
          </div>
          <p className="text-[1.05rem] font-semibold tracking-tight text-foreground">{title}</p>
        </div>
        {comingSoon ? (
          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-600 sm:px-2 sm:text-[11px] dark:text-amber-300">
            Proximamente
          </span>
        ) : (
          <>
            {onActionClick ? (
              <button
                type="button"
                onClick={onActionClick}
                aria-label={actionLabel}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full border border-border/60 bg-background/40 text-sm font-medium leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {actionLabel}
              </button>
            ) : (
              <Link
                to={actionHref}
                aria-label={actionLabel}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full border border-border/60 bg-background/40 text-sm font-medium leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {actionLabel}
              </Link>
            )}
          </>
        )}
      </div>
      <div className="flex items-end justify-between gap-3 pt-0.5">
        <p className="whitespace-nowrap text-[0.95rem] font-black leading-none tracking-tight text-foreground">{valueLabel}</p>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap text-[0.65rem] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground/80">
            Meta {goalLabel}
          </p>
        </div>
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

const SHOW_CALENDAR_CARD_IN_DASHBOARD = false;
const USE_MOBILE_HORIZONTAL_SCROLL = true;
const DASHBOARD_MODULE_ROUTE_FALLBACK: Record<string, string> = {
  "#water": "/water",
  "#sleep": "/sleep",
  "#weight": "/weight",
  "#biofeedback": "/biofeedback",
  "#nutrition": "/nutrition",
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isGuest, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const snapshot = useDashboardSnapshot(currentMonth);
  const [visibleModuleKey, setVisibleModuleKey] = useState<string | null>(null);
  const [isModuleTransitioning, setIsModuleTransitioning] = useState(false);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isTrainingSummaryOpen, setIsTrainingSummaryOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedTrainingWorkoutId, setSelectedTrainingWorkoutId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [isSecondaryExpanded, setIsSecondaryExpanded] = useState(false);
  const [isTodayDetailsExpanded, setIsTodayDetailsExpanded] = useState(false);
  const [mobileCarouselIndex, setMobileCarouselIndex] = useState(0);
  const [cardDensity, setCardDensity] = useState<DashboardCardDensity>(() => loadDashboardCardDensity());
  const mobileCarouselRef = useRef<HTMLDivElement | null>(null);
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
  const availableWorkoutsQuery = useQuery({
    queryKey: ["dashboard_training_workouts", user?.id, isGuest, timeZone],
    queryFn: () => listWorkouts(user?.id ?? null, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const scheduledWorkout = trainingTodayQuery.data?.scheduledWorkout ?? null;
  const activeSession = trainingTodayQuery.data?.activeSession ?? null;
  const activeWorkout = trainingTodayQuery.data?.activeSession?.workout ?? null;
  const selectedTrainingWorkoutQuery = useQuery({
    queryKey: ["dashboard_training_selected_workout", user?.id, isGuest, timeZone, selectedTrainingWorkoutId],
    queryFn: () => getWorkoutDetail(user?.id ?? null, selectedTrainingWorkoutId!, { isGuest, timeZone }),
    enabled: Boolean(selectedTrainingWorkoutId) && (Boolean(user?.id) || isGuest),
  });
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

  const saveTrainingScheduleMutation = useMutation({
    mutationFn: ({ dayOfWeek, workoutId }: { dayOfWeek: number; workoutId: string | null }) =>
      saveWorkoutScheduleDay(user?.id ?? null, dayOfWeek, workoutId, false, { isGuest, timeZone }),
  });
  const startTrainingSessionMutation = useMutation({
    mutationFn: (workoutId: string) => startWorkoutSession(user?.id ?? null, workoutId, { isGuest, timeZone }),
  });
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
    missingModules,
    nextModule,
    todayCompletionPct,
    primaryAction,
    weeklyConsistency,
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

  useEffect(() => {
    if (!isTrainingSummaryOpen) return;
    const preferredWorkoutId = activeWorkout?.id ?? scheduledWorkout?.id ?? availableWorkoutsQuery.data?.[0]?.id ?? null;
    setSelectedTrainingWorkoutId((current) => current ?? preferredWorkoutId);
  }, [activeWorkout?.id, availableWorkoutsQuery.data, isTrainingSummaryOpen, scheduledWorkout?.id]);

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

    if (!isMobile && SHOW_CALENDAR_CARD_IN_DASHBOARD && widgetIsVisible("calendar")) {
      cards.push({
        key: "calendar",
        placement: {
          weight: 5,
          preferredColumn: "right",
          mobileOrder: 50,
        },
        node: (
          <section className="min-w-0">
            <CalendarMiniWidget
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              activity={snapshot.monthActivity}
              loading={snapshot.monthActivityLoading}
            />
          </section>
        ),
      });
    }

    return cards;
  }, [
    currentMonth,
    isMobile,
    visibleWidgetKeySet,
    setCurrentMonth,
    snapshot.monthActivity,
    snapshot.monthActivityLoading,
  ]);
  const isCompactDensity = cardDensity === "compact";
  const denseSectionGapClass = isCompactDensity ? "gap-2" : "gap-3";
  const denseCardContentClass = isCompactDensity ? "space-y-2 p-3 md:p-4" : "space-y-3 p-4 md:p-5";
  const denseActionContentClass = isCompactDensity ? "space-y-3 p-3 md:p-4" : "space-y-4 p-4 md:p-5";
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
  const todayDateLabel = useMemo(() => {
    const rawLabel = core?.todayLabel?.trim();
    if (rawLabel) {
      const parts = rawLabel.split(",");
      if (parts.length > 1) {
        return parts.slice(1).join(",").trim();
      }
      return rawLabel;
    }

    return new Date().toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [core?.todayLabel]);

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
  const recoveryStrokeClass = recoveryScore >= 75 ? "stroke-emerald-500" : recoveryScore >= 45 ? "stroke-amber-500" : "stroke-rose-500";
  const recoveryStatusLabel = core?.recovery.status ?? "Recuperacion moderada";
  const recoveryDrivers = core?.recovery.drivers ?? [];
  const recoveryDriversLabel = recoveryDrivers.length > 0 ? recoveryDrivers.join(" | ") : "Sin drivers relevantes";
  const recoverySubscores = core?.recovery.subscores ?? { sleep: 0, biofeedback: 0, hydration: 0, consistency: 0 };
  const recoveryRingRadius = 38;
  const recoveryRingCircumference = 2 * Math.PI * recoveryRingRadius;
  const recoveryRingDash = Math.max(0, Math.min(recoveryRingCircumference, (recoveryScore / 100) * recoveryRingCircumference));
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
  const proteinProgress = Math.min(100, Math.round((proteinCurrent / Math.max(proteinGoal, 1)) * 100));
  const carbsProgress = Math.min(100, Math.round((carbsCurrent / Math.max(carbsGoal, 1)) * 100));
  const fatProgress = Math.min(100, Math.round((fatCurrent / Math.max(fatGoal, 1)) * 100));

  const workoutExercises = activeWorkout?.exercises ?? scheduledWorkout?.exercises ?? [];
  const estimatedWorkoutMinutes = Math.max(
    workoutExercises.reduce((sum, exercise) => sum + Math.max(Number(exercise.rest_seconds || 0), 45) * Math.max(Number(exercise.target_sets || 0), 1), 0) / 60,
    0,
  );
  const exerciseCountLabel = workoutExercises.length > 0 ? `${workoutExercises.length} ejercicios` : "Sin ejercicios configurados";

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
  const weightGoalProgress = core?.goalProgress ?? null;
  const weightGoalProgressSafe = weightGoalProgress !== null ? Math.max(0, Math.min(100, Math.round(weightGoalProgress))) : null;
  const weightDelta = core?.latestWeightDeltaKg ?? null;
  const weightTrendLabel =
    core?.weightTrend?.trend === "up" ? "Subiendo" : core?.weightTrend?.trend === "down" ? "Bajando" : core?.weightTrend?.trend === "stable" ? "Estable" : "Sin tendencia";
  const weightStatus =
    core?.latestMeasurementWeight === null || core?.latestMeasurementWeight === undefined || weightGoalProgressSafe === null
      ? { label: "Sin datos", className: "border-border/60 bg-muted/40 text-muted-foreground" }
      : weightGoalProgressSafe >= 70
        ? { label: "En ritmo", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300" }
        : weightGoalProgressSafe >= 35
          ? { label: "Progreso", className: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300" }
          : { label: "Atencion", className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300" };
  const weightDeltaLabel = weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg` : "--";
  const weightDeltaToneClass =
    weightDelta === null
      ? "text-muted-foreground"
      : weightDelta > 0
        ? "text-amber-600 dark:text-amber-300"
        : weightDelta < 0
          ? "text-emerald-600 dark:text-emerald-300"
          : "text-muted-foreground";
  const physicalSummary = core?.physicalSummary ?? null;
  const focusHeading = (physicalSummary?.goalHeading ?? "Sin meta activa").replace(/^Meta activa:\s*/i, "");
  const compactPhysicalMetrics =
    physicalSummary?.focusMode === "muscle_gain"
      ? [
          { label: "Masa magra", value: physicalSummary.leanMassKg !== null ? `${physicalSummary.leanMassKg.toFixed(1)} kg` : "--" },
          { label: "Brazo", value: physicalSummary.armCm !== null ? `${physicalSummary.armCm.toFixed(1)} cm` : "--" },
          { label: "Muslo", value: physicalSummary.thighCm !== null ? `${physicalSummary.thighCm.toFixed(1)} cm` : "--" },
        ]
      : [
          {
            label: "Cintura",
            value:
              physicalSummary?.waistChangeCm !== null && physicalSummary?.waistChangeCm !== undefined
                ? `${physicalSummary.waistChangeCm > 0 ? "+" : ""}${physicalSummary.waistChangeCm.toFixed(1)} cm`
                : "--",
          },
          {
            label: "% graso",
            value:
              physicalSummary?.bodyFatPct !== null && physicalSummary?.bodyFatPct !== undefined
                ? `${physicalSummary.bodyFatPct.toFixed(1)}%`
                : "--",
          },
          { label: "Cambio 7d", value: weightDeltaLabel },
        ];

  const remainingActionsCount = Math.max(missingModules.length, 0);
  const quickActionsVisible = isWidgetVisible("quick_actions");
  const mobilePhysicalHighlights = compactPhysicalMetrics.slice(0, 2);
  const targetWeightKg = core?.goal?.target_weight_kg ?? null;
  const currentWeightKg = core?.latestMeasurementWeight ?? core?.latestWeight ?? null;
  const goalGapKg =
    targetWeightKg !== null && currentWeightKg !== null
      ? Math.abs(targetWeightKg - currentWeightKg)
      : null;
  const goalGapLabel =
    goalGapKg === null
      ? "Define una meta de peso para ver distancia."
      : goalGapKg < 0.05
        ? "Meta de peso alcanzada."
        : `Te faltan ${goalGapKg.toFixed(1)} kg para tu meta.`;
  const nextRequiredActionLabel = nextModule ? `Registrar ${nextModule.label.toLowerCase()}` : "Dia completado";
  const nextRequiredActionHref = nextModule?.href ?? primaryAction.href;
  const nextRequiredActionModal = nextRequiredActionHref === "#water"
    ? "water"
    : nextRequiredActionHref === "#sleep"
      ? "sleep"
      : nextRequiredActionHref === "#weight"
        ? "weight"
        : null;
  const resolvedNextRequiredActionHref =
    nextRequiredActionHref.startsWith("#")
      ? DASHBOARD_MODULE_ROUTE_FALLBACK[nextRequiredActionHref] ?? "/today"
      : nextRequiredActionHref;
  const nextRequiredActionButtonLabel = nextModule ? "Ir al registro" : primaryAction.label;
  const handleNextRequiredAction = () => {
    if (nextRequiredActionModal === "water") {
      setIsWaterModalOpen(true);
      return;
    }
    if (nextRequiredActionModal === "sleep") {
      setIsSleepModalOpen(true);
      return;
    }
    if (nextRequiredActionModal === "weight") {
      setIsWeightModalOpen(true);
      return;
    }
    navigate(resolvedNextRequiredActionHref);
  };
  const showSecondaryDashboardZones = !isMobile;
  const getWorkoutExerciseName = (exercise: {
    name?: string | null;
    exercise?: { name?: string | null; name_i18n?: { es?: string; en?: string } | null } | null;
  }) => {
    const direct = exercise.name?.trim();
    if (direct) return direct;
    const localizedEs = exercise.exercise?.name_i18n?.es?.trim();
    if (localizedEs) return localizedEs;
    const localizedEn = exercise.exercise?.name_i18n?.en?.trim();
    if (localizedEn) return localizedEn;
    const nested = exercise.exercise?.name?.trim();
    if (nested) return nested;
    return "Ejercicio sin nombre";
  };
  const selectedTrainingWorkout =
    selectedTrainingWorkoutQuery.data ??
    (selectedTrainingWorkoutId && selectedTrainingWorkoutId === activeWorkout?.id
      ? activeWorkout
      : selectedTrainingWorkoutId && selectedTrainingWorkoutId === scheduledWorkout?.id
        ? scheduledWorkout
        : null);
  const selectedTrainingExercises = selectedTrainingWorkout?.exercises ?? [];
  const selectedTrainingExercisePreview = selectedTrainingExercises.slice(0, 5);
  const selectedTrainingMinutes = Math.max(
    selectedTrainingExercises.reduce(
      (sum, exercise) => sum + Math.max(Number(exercise.rest_seconds || 0), 45) * Math.max(Number(exercise.target_sets || 0), 1),
      0,
    ) / 60,
    0,
  );
  const handleOpenTrainingSummary = () => {
    setIsTrainingSummaryOpen(true);
  };
  const handleLaunchTraining = async () => {
    try {
      if (activeSession) {
        setIsTrainingSummaryOpen(false);
        navigate("/training?tab=today");
        return;
      }
      if (!selectedTrainingWorkoutId) {
        toast.error("Selecciona una rutina para hoy.");
        return;
      }
      if (selectedTrainingWorkoutId !== (scheduledWorkout?.id ?? null)) {
        await saveTrainingScheduleMutation.mutateAsync({ dayOfWeek: new Date().getDay(), workoutId: selectedTrainingWorkoutId });
      }
      await startTrainingSessionMutation.mutateAsync(selectedTrainingWorkoutId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard_training_today"] }),
        queryClient.invalidateQueries({ queryKey: ["training", "today"] }),
        queryClient.invalidateQueries({ queryKey: ["training", "schedule"] }),
      ]);
      setIsTrainingSummaryOpen(false);
      toast.success("Sesion iniciada.");
      navigate("/training?tab=today");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo iniciar el entrenamiento."));
    }
  };
  const isTrainingLaunchPending = saveTrainingScheduleMutation.isPending || startTrainingSessionMutation.isPending;
  const renderTrainingRecoveryPanel = () => (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Recovery score</p>
          <p className="text-xs text-muted-foreground">
            Capacidad de carga recomendada para entrenar hoy: <span className={cn("font-semibold", recoveryAccentClass)}>{recoveryBand}</span>
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Como funciona el recovery score"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-80 space-y-2">
            <p className="text-sm font-semibold">Como funciona este card</p>
            <p className="text-xs text-muted-foreground">
              El score (0-100) combina sueno, biofeedback, hidratacion y consistencia semanal para estimar tu capacidad de carga del dia.
            </p>
            <p className="text-xs text-muted-foreground">
              Rangos: 0-44 (ligero), 45-74 (moderado), 75-100 (fuerte). Es una guia de intensidad, no un diagnostico medico.
            </p>
            <p className="text-xs text-muted-foreground">Drivers: {recoveryDriversLabel}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-md border border-border/60 px-2 py-1.5">
                <p className="text-[11px] text-muted-foreground">Sueno</p>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", recoveryBarClass)} style={{ width: `${Math.max(0, Math.min(100, recoverySubscores.sleep))}%` }} /></div>
              </div>
              <div className="rounded-md border border-border/60 px-2 py-1.5">
                <p className="text-[11px] text-muted-foreground">Biofeedback</p>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", recoveryBarClass)} style={{ width: `${Math.max(0, Math.min(100, recoverySubscores.biofeedback))}%` }} /></div>
              </div>
              <div className="rounded-md border border-border/60 px-2 py-1.5">
                <p className="text-[11px] text-muted-foreground">Hidratacion</p>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", recoveryBarClass)} style={{ width: `${Math.max(0, Math.min(100, recoverySubscores.hydration))}%` }} /></div>
              </div>
              <div className="rounded-md border border-border/60 px-2 py-1.5">
                <p className="text-[11px] text-muted-foreground">Consistencia</p>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", recoveryBarClass)} style={{ width: `${Math.max(0, Math.min(100, recoverySubscores.consistency))}%` }} /></div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2 md:grid-cols-[minmax(180px,220px)_1fr] md:gap-3">
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5 md:p-3">
          <div className="flex items-center gap-3 md:flex-col md:items-center md:gap-2">
            <div className="relative h-20 w-20 shrink-0 md:h-28 md:w-28">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={recoveryRingRadius} className="fill-none stroke-muted/40" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r={recoveryRingRadius}
                  className={cn("fill-none", recoveryStrokeClass)}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${recoveryRingDash} ${recoveryRingCircumference - recoveryRingDash}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className={cn("text-2xl font-black leading-none md:text-3xl", recoveryAccentClass)}>{recoveryScore}</p>
                <p className="text-[10px] uppercase text-muted-foreground">/100</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5 md:p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Recomendacion de carga</p>
          <p className="mt-1 text-sm font-black leading-tight md:text-base">{recommendationLabel}</p>
          <p className={cn("mt-1 text-xs font-semibold", recoveryAccentClass)}>{recoveryStatusLabel}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            Detalles en el boton
            <CircleHelp className="h-3.5 w-3.5" />
          </p>
        </div>
      </div>
    </div>
  );

  const handleMobileCarouselScroll = () => {
    const container = mobileCarouselRef.current;
    if (!container) return;
    const firstSlide = container.firstElementChild as HTMLElement | null;
    if (!firstSlide) return;
    const slideWidth = firstSlide.offsetWidth + 12;
    if (!slideWidth) return;
    const nextIndex = Math.round(container.scrollLeft / slideWidth);
    const maxIndex = Math.max(0, container.childElementCount - 1);
    setMobileCarouselIndex(Math.max(0, Math.min(maxIndex, nextIndex)));
  };

  useEffect(() => {
    if (!isMobile || !USE_MOBILE_HORIZONTAL_SCROLL) return;
    const container = mobileCarouselRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTo({ left: 0, behavior: "auto" });
      setMobileCarouselIndex(0);
    });
  }, [isMobile, core?.todayKey]);

  return (
    <div className={cn(
      "app-shell min-h-0 w-full px-4 pb-5 pt-1 text-foreground sm:px-6 sm:pb-8 sm:pt-2",
      isMobile && USE_MOBILE_HORIZONTAL_SCROLL && "h-full overflow-hidden pb-0",
    )}>
      <div className={cn("mx-auto flex max-w-[1540px] flex-col gap-5", isMobile && USE_MOBILE_HORIZONTAL_SCROLL && "h-full min-h-0 gap-2")}>
        <AppPageIntro
          className={cn("order-[-3]", isMobile && USE_MOBILE_HORIZONTAL_SCROLL && "shrink-0 gap-2")}
          eyebrow="Dashboard / Centro operativo"
          title={
            <>
              {greetingLabel}, <span className="text-primary">{profileDisplayName}</span>
            </>
          }
          description={todayDateLabel}
          actions={
            <div className="hidden items-center gap-2 md:flex">
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
                      {DASHBOARD_HOME_WIDGET_DEFINITIONS.filter((widget) => widget.key !== "hero_modules" && widget.key !== "physical_progress").map((widget) => {
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
          }
        />
        <section aria-label="Dia de la semana" className={cn("order-[-3] space-y-2 px-1 md:hidden", isMobile && USE_MOBILE_HORIZONTAL_SCROLL && "shrink-0 space-y-1.5")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Dia de la semana</p>
          <div className="grid grid-cols-7 gap-2">
            {weeklyConsistency.days.map((day) => (
              <div
                key={day.dateKey}
                className={cn(
                  "rounded-lg border px-2 py-2 text-center text-xs font-semibold",
                  day.completed && !day.isToday && "border-emerald-500/40 bg-emerald-500/10 text-foreground",
                  !day.completed && !day.isToday && "border-border/60 bg-background/60 text-muted-foreground",
                  day.isToday && "border-primary/60 bg-primary/15 text-foreground ring-1 ring-primary/35",
                )}
              >
                {day.label}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{weeklyConsistency.completedCount}/7 dias completados</p>
        </section>


        {!isMobile || !USE_MOBILE_HORIZONTAL_SCROLL ? (
        <section aria-labelledby="dashboard-zone-actions" className={cn("order-[-2] grid", denseSectionGapClass)}>
          <h2 id="dashboard-zone-actions" className="sr-only">Control operativo de hoy</h2>
          <div className={cn("grid", denseSectionGapClass, "xl:grid-cols-5")}>
            <DashboardCardShell
              title="Que hacer hoy"
              contentClassName={denseActionContentClass}
              className="xl:col-span-2"
            >
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-[1.05rem] font-bold">Hoy estas al {todayCompletionPct}% completado</p>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${todayCompletionPct}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Siguiente paso</p>
                      <p className="text-base font-semibold">{nextRequiredActionLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        Te falta {remainingActionsCount} {remainingActionsCount === 1 ? "accion" : "acciones"} para completar el dia
                      </p>
                    </div>
                  </div>
                  <Button type="button" className="h-10 rounded-xl px-4 text-sm font-semibold" onClick={handleNextRequiredAction}>
                    {nextRequiredActionButtonLabel}
                  </Button>
                </div>

                {isMobile ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full justify-between rounded-xl px-3 text-xs"
                    onClick={() => setIsTodayDetailsExpanded((prev) => !prev)}
                  >
                    <span>{isTodayDetailsExpanded ? "Ocultar acciones rapidas" : "Ver acciones rapidas"}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isTodayDetailsExpanded && "rotate-180")} />
                  </Button>
                ) : null}

                {!isMobile || isTodayDetailsExpanded ? (
                  <div className="space-y-3">
                    {isWidgetVisible("quick_actions") ? (
                      <DashboardQuickActions
                        embedded
                        excludeKeys={!isMobile ? ["measurements", "nutrition"] : []}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </DashboardCardShell>

            {!isMobile ? (
              <DashboardCardShell title="Progreso corporal" contentClassName={denseCardContentClass} className="xl:col-span-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foco</p>
                  <p className="line-clamp-1 text-sm font-semibold">{focusHeading}</p>
                </div>
                <p className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", weightStatus.className)}>
                  {weightStatus.label}
                </p>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Peso actual</p>
                  <p className="text-3xl font-black leading-none">{core?.latestMeasurementWeight ? `${core.latestMeasurementWeight.toFixed(1)} kg` : "--"}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold", weightDeltaToneClass)}>7d: {weightDeltaLabel}</p>
                  <p className="text-xs text-muted-foreground">{weightTrendLabel}</p>
                </div>
              </div>

              <div className="h-12 rounded-xl border border-border/60 bg-muted/10 p-2 md:h-16">
                {weightPath ? (
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <polyline fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" points={weightPath} />
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin tendencia</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" className="h-9 rounded-xl px-3 text-xs font-semibold" onClick={() => setIsWeightModalOpen(true)}>
                  Registrar peso
                </Button>
                <Button asChild type="button" variant="outline" className="h-9 rounded-xl px-3 text-xs font-semibold">
                  <Link to="/body">Ir a medidas</Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {compactPhysicalMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-border/60 bg-muted/10 px-2 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-sm font-semibold leading-tight">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Meta</span>
                  <span>{weightGoalProgressSafe !== null ? `${weightGoalProgressSafe}%` : "--"}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${weightGoalProgressSafe ?? 0}%` }} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{physicalSummary?.lastUpdatedLabel ?? "Sin actualizaciones fisicas"}</p>
              </DashboardCardShell>
            ) : null}

            {!isMobile ? (
              <div className="space-y-3 xl:col-span-1">
                <section id="water" className="min-w-0">
                  <DashboardMetricCard
                    title="Agua"
                    icon={Droplets}
                    valueLabel={`${(core?.waterTodayMl ?? 0).toLocaleString("es-PE")} ml`}
                    goalLabel={`${(core?.waterGoalMl ?? 2000).toLocaleString("es-PE")} ml`}
                    progressPct={hydrationProgress}
                    accentClassName="bg-sky-500/90 text-sky-100"
                    actionHref="/water"
                    actionLabel="+"
                    onActionClick={() => setIsWaterModalOpen(true)}
                  />
                </section>
                <section id="nutrition-mini" className="min-w-0">
                  <DashboardMetricCard
                    title="Calorias"
                    icon={Flame}
                    valueLabel={`${consumedCalories.toLocaleString("es-PE")} kcal`}
                    goalLabel={`${targetCalories.toLocaleString("es-PE")} kcal`}
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
                    goalLabel={`${((core?.sleepGoalMinutes ?? 480) / 60).toFixed(1)} h`}
                    progressPct={sleepProgress}
                    accentClassName="bg-violet-500/90 text-violet-100"
                    actionHref="/sleep"
                    actionLabel="+"
                    onActionClick={() => setIsSleepModalOpen(true)}
                  />
                </section>
                <section id="steps" className="min-w-0">
                  <DashboardMetricCard
                    title="Pasos"
                    icon={Footprints}
                    valueLabel="Proximamente..."
                    goalLabel="8,000 pasos"
                    progressPct={0}
                    accentClassName="bg-emerald-500/90 text-emerald-100"
                    actionHref="/calendar"
                    actionLabel="+"
                  />
                </section>
              </div>
            ) : null}
          </div>
        </section>
        ) : null}

        {isMobile && USE_MOBILE_HORIZONTAL_SCROLL ? (
          <section aria-label="Centro de mando movil" className="order-[-2] flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div
              ref={mobileCarouselRef}
              onScroll={handleMobileCarouselScroll}
              className="-mx-1 hide-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overflow-y-hidden px-1 pb-1"
            >
              <div className="min-w-[88%] snap-start space-y-3 overflow-hidden">
                <DashboardCardShell
                  title="Que hacer hoy"
                  contentClassName={denseActionContentClass}
                >
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-[1.05rem] font-bold">Hoy estas al {todayCompletionPct}% completado</p>
                      <div className="h-2.5 rounded-full bg-muted">
                        <div className="h-2.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${todayCompletionPct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2 text-primary">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Siguiente paso</p>
                          <p className="text-base font-semibold">{nextRequiredActionLabel}</p>
                          <p className="text-sm text-muted-foreground">
                            Te falta {remainingActionsCount} {remainingActionsCount === 1 ? "accion" : "acciones"} para completar el dia
                          </p>
                        </div>
                      </div>
                      <Button type="button" className="h-10 rounded-xl px-4 text-sm font-semibold" onClick={handleNextRequiredAction}>
                        {nextRequiredActionButtonLabel}
                      </Button>
                    </div>

                    {quickActionsVisible ? (
                      <DashboardQuickActions embedded excludeKeys={["measurements", "nutrition"]} />
                    ) : null}
                  </div>
                </DashboardCardShell>

                <DashboardCardShell title="Nota del dia" contentClassName="space-y-2 p-3">
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {core?.noteToday?.content?.trim() ? core.noteToday.content.trim() : "Agregar nota del dia y sincronizar al calendario."}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 w-full rounded-xl px-3 text-xs font-semibold"
                    onClick={() => setIsNotesModalOpen(true)}
                  >
                    Abrir nota
                  </Button>
                </DashboardCardShell>
              </div>

              <div className="min-w-[88%] snap-start overflow-hidden">
                <DashboardCardShell title="Progreso corporal" contentClassName={denseCardContentClass}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foco</p>
                      <p className="line-clamp-1 text-sm font-semibold">{focusHeading}</p>
                    </div>
                    <p className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", weightStatus.className)}>
                      {weightStatus.label}
                    </p>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Peso actual</p>
                        <p className="text-3xl font-black leading-none">{core?.latestMeasurementWeight ? `${core.latestMeasurementWeight.toFixed(1)} kg` : "--"}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-semibold", weightDeltaToneClass)}>7d: {weightDeltaLabel}</p>
                        <p className="text-xs text-muted-foreground">{weightTrendLabel}</p>
                      </div>
                    </div>
                    <div className="h-12 rounded-xl border border-border/60 bg-muted/10 p-2">
                      {weightPath ? (
                        <svg viewBox="0 0 100 100" className="h-full w-full">
                          <polyline fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" points={weightPath} />
                        </svg>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin tendencia</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Meta</span>
                        <span>{weightGoalProgressSafe !== null ? `${weightGoalProgressSafe}%` : "--"}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${weightGoalProgressSafe ?? 0}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{goalGapLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {mobilePhysicalHighlights.map((metric) => (
                        <div key={`mobile-physical-${metric.label}`} className="rounded-lg border border-border/60 bg-muted/10 px-2 py-2">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</p>
                          <p className="mt-0.5 text-xs font-semibold">{metric.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {!quickActionsVisible ? (
                        <Button
                          type="button"
                          className="h-9 rounded-xl px-3 text-xs font-semibold"
                          onClick={() => setIsWeightModalOpen(true)}
                        >
                          Registrar peso
                        </Button>
                      ) : null}
                      <Button asChild type="button" variant="outline" className="h-9 rounded-xl px-3 text-xs font-semibold">
                        <Link to="/body">Ver medidas</Link>
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{physicalSummary?.lastUpdatedLabel ?? "Sin actualizaciones fisicas"}</span>
                      <span>{isGuest ? "Guardado local" : "Sincronizado"}</span>
                    </div>
                  </div>
                </DashboardCardShell>
              </div>

              <div className="min-w-[88%] snap-start overflow-hidden">
                <DashboardCardShell title="Entrenamiento" className="h-full xl:col-span-2" contentClassName={denseCardContentClass}>
                  <div className="space-y-3">
                    {renderTrainingRecoveryPanel()}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Rutina de hoy</p>
                        <p className="text-2xl font-black leading-tight">{workoutCardTitle}</p>
                        <p className="text-sm text-muted-foreground">{dayDemandLabel}</p>
                      </div>
                      <div className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {exerciseCountLabel}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">El resumen de ejercicios se muestra al iniciar entrenamiento.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" onClick={handleOpenTrainingSummary}>
                        {activeSession ? "Continuar entrenamiento" : "Iniciar entrenamiento"}
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
              </div>

              <div className="min-w-[88%] snap-start overflow-hidden">
                <DashboardCardShell title="Nutricion" className="h-full" contentClassName={denseCardContentClass}>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
                      <div className="relative mx-auto h-24 w-24">
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
                      </div>
                    </div>
                    <Button asChild className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                      <Link to="/nutrition">Registrar comida</Link>
                    </Button>
                  </div>
                </DashboardCardShell>
              </div>

              <div className="min-w-[88%] snap-start overflow-hidden"><section id="water" className="min-w-0"><DashboardMetricCard title="Agua" icon={Droplets} valueLabel={`${(core?.waterTodayMl ?? 0).toLocaleString("es-PE")} ml`} goalLabel={`${(core?.waterGoalMl ?? 2000).toLocaleString("es-PE")} ml`} progressPct={hydrationProgress} accentClassName="bg-sky-500/90 text-sky-100" actionHref="/water" actionLabel="+" onActionClick={() => setIsWaterModalOpen(true)} /></section></div>
              <div className="min-w-[88%] snap-start overflow-hidden"><section id="nutrition" className="min-w-0"><DashboardMetricCard title="Calorias" icon={Flame} valueLabel={`${consumedCalories.toLocaleString("es-PE")} kcal`} goalLabel={`${targetCalories.toLocaleString("es-PE")} kcal`} progressPct={caloriesProgress} accentClassName="bg-amber-500/90 text-amber-100" actionHref="/nutrition" actionLabel="+" /></section></div>
              <div className="min-w-[88%] snap-start overflow-hidden"><section id="sleep" className="min-w-0"><DashboardMetricCard title="Sueno" icon={Moon} valueLabel={`${((core?.sleepDay?.total_minutes ?? 0) / 60).toFixed(1)} h`} goalLabel={`${((core?.sleepGoalMinutes ?? 480) / 60).toFixed(1)} h`} progressPct={sleepProgress} accentClassName="bg-violet-500/90 text-violet-100" actionHref="/sleep" actionLabel="+" onActionClick={() => setIsSleepModalOpen(true)} /></section></div>
              <div className="min-w-[88%] snap-start overflow-hidden"><DashboardMetricCard title="Pasos" icon={Footprints} valueLabel="Proximamente..." goalLabel="8,000 pasos" progressPct={0} accentClassName="bg-emerald-500/90 text-emerald-100" actionHref="/calendar" actionLabel="+" /></div>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={`mobile-slide-dot-${index}`}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-muted-foreground/35 transition-all",
                    mobileCarouselIndex === index && "w-4 bg-primary",
                  )}
                />
              ))}
            </div>
          </section>
        ) : null}

        {isMobile && !USE_MOBILE_HORIZONTAL_SCROLL ? (
          <section aria-labelledby="dashboard-zone-metrics" className="order-[-1] space-y-2 pt-1">
            <h2 id="dashboard-zone-metrics" className="sr-only">Metricas diarias</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <section id="water" className="min-w-0">
                <DashboardMetricCard
                  title="Agua"
                  icon={Droplets}
                  valueLabel={`${(core?.waterTodayMl ?? 0).toLocaleString("es-PE")} ml`}
                  goalLabel={`${(core?.waterGoalMl ?? 2000).toLocaleString("es-PE")} ml`}
                  progressPct={hydrationProgress}
                  accentClassName="bg-sky-500/90 text-sky-100"
                  actionHref="/water"
                  actionLabel="+"
                  onActionClick={() => setIsWaterModalOpen(true)}
                />
              </section>
              <section id="nutrition" className="min-w-0">
                <DashboardMetricCard
                  title="Calorias"
                  icon={Flame}
                  valueLabel={`${consumedCalories.toLocaleString("es-PE")} kcal`}
                  goalLabel={`${targetCalories.toLocaleString("es-PE")} kcal`}
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
                  goalLabel={`${((core?.sleepGoalMinutes ?? 480) / 60).toFixed(1)} h`}
                  progressPct={sleepProgress}
                  accentClassName="bg-violet-500/90 text-violet-100"
                  actionHref="/sleep"
                  actionLabel="+"
                  onActionClick={() => setIsSleepModalOpen(true)}
                />
              </section>
              <DashboardMetricCard
                title="Pasos"
                icon={Footprints}
                valueLabel="Proximamente..."
                goalLabel="8,000 pasos"
                progressPct={0}
                accentClassName="bg-emerald-500/90 text-emerald-100"
                actionHref="/calendar"
                actionLabel="+"
              />
            </div>
          </section>
        ) : null}

        {isMobile && !USE_MOBILE_HORIZONTAL_SCROLL ? (
          <section aria-label="Contenido secundario del dia" className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between rounded-xl px-4"
              onClick={() => setIsSecondaryExpanded((prev) => !prev)}
            >
              <span className="text-sm font-semibold">
                {isSecondaryExpanded ? "Ocultar contenido secundario" : "Ver entrenamiento, nutricion y calendario"}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isSecondaryExpanded && "rotate-180")} />
            </Button>
            <p className="text-xs text-muted-foreground">
              Priorizamos registro rapido. El contenido operativo extendido queda en esta seccion.
            </p>
          </section>
        ) : null}

        <Dialog open={isTrainingSummaryOpen} onOpenChange={setIsTrainingSummaryOpen}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>{activeSession ? "Sesion activa" : "Resumen de entrenamiento de hoy"}</DialogTitle>
              <DialogDescription>
                Revisa la rutina, cambia la asignacion si hace falta y empieza la sesion sin salir del centro operativo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dashboard-training-workout-select">Rutina del dia</Label>
                <Select
                  value={selectedTrainingWorkoutId ?? "__none__"}
                  onValueChange={(value) => setSelectedTrainingWorkoutId(value === "__none__" ? null : value)}
                  disabled={Boolean(activeSession) || availableWorkoutsQuery.isLoading}
                >
                  <SelectTrigger id="dashboard-training-workout-select">
                    <SelectValue placeholder="Selecciona una rutina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin rutina asignada</SelectItem>
                    {(availableWorkoutsQuery.data ?? []).map((workout) => (
                      <SelectItem key={workout.id} value={workout.id}>
                        {workout.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeSession ? <p className="text-xs text-muted-foreground">Hay una sesion activa; no puedes cambiar rutina hasta cerrarla.</p> : null}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Resumen</p>
                <p className="mt-1 text-lg font-bold">{selectedTrainingWorkout?.name ?? "Sin rutina asignada"}</p>
                <p className="text-sm text-muted-foreground">{selectedTrainingWorkout?.description || workoutCardSubtitle}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {(selectedTrainingExercises.length > 0 ? `${selectedTrainingExercises.length} ejercicios` : "Sin ejercicios")} ·{" "}
                  {formatDurationLabel(Math.round(selectedTrainingMinutes))} estimados
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Vista rapida</p>
                {selectedTrainingExercisePreview.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedTrainingExercisePreview.map((exercise) => (
                      <div key={exercise.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                        <p className="text-sm font-medium">{getWorkoutExerciseName(exercise)}</p>
                        <p className="text-xs text-muted-foreground">
                          {exercise.target_sets ?? 0}x{exercise.target_reps ?? "--"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No hay ejercicios cargados para esta rutina.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" className="h-10 rounded-xl px-4 text-sm font-semibold" onClick={handleLaunchTraining} disabled={isTrainingLaunchPending}>
                  {activeSession ? "Ir a sesion activa" : "Iniciar entrenamiento"}
                </Button>
                <Button asChild type="button" variant="outline" className="h-10 rounded-xl px-4 text-sm">
                  <Link to="/training">Gestionar rutinas</Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isWaterModalOpen} onOpenChange={setIsWaterModalOpen}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Agua</DialogTitle>
              <DialogDescription>Registro completo de hidratacion sin salir del centro operativo.</DialogDescription>
            </DialogHeader>
            <WaterWorkspace embedded />
          </DialogContent>
        </Dialog>

        <Dialog open={isSleepModalOpen} onOpenChange={setIsSleepModalOpen}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Sueno</DialogTitle>
              <DialogDescription>Registro completo de sueno sin salir del centro operativo.</DialogDescription>
            </DialogHeader>
            <SleepWorkspace embedded />
          </DialogContent>
        </Dialog>

        <Dialog open={isWeightModalOpen} onOpenChange={setIsWeightModalOpen}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Peso</DialogTitle>
              <DialogDescription>Registro completo de peso sin salir del centro operativo.</DialogDescription>
            </DialogHeader>
            <TodayWeightModule />
          </DialogContent>
        </Dialog>

        <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Nota del dia</DialogTitle>
              <DialogDescription>Captura rapida con guardado automatico al calendario.</DialogDescription>
            </DialogHeader>
            <TacticalNotesCard
              loading={snapshot.coreLoading}
              todayNote={core?.noteToday ?? null}
              latestNote={core?.noteLatest ?? null}
              onSave={(payload) => saveNoteMutation.mutateAsync(payload).then(() => undefined)}
            />
          </DialogContent>
        </Dialog>

        {showSecondaryDashboardZones ? (
          <section aria-labelledby="dashboard-zone-main" className={cn("grid xl:grid-cols-[1.6fr_1.3fr_1fr]", denseSectionGapClass)}>
            <h2 id="dashboard-zone-main" className="sr-only">Bloques principales del dashboard</h2>

          {!isMobile ? (
            <DashboardCardShell title="Entrenamiento" className="h-full" contentClassName={denseCardContentClass}>
              <div className="space-y-3">
              {renderTrainingRecoveryPanel()}

                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Rutina de hoy</p>
                    <p className="text-2xl font-black leading-tight">{workoutCardTitle}</p>
                    <p className="text-sm text-muted-foreground">{dayDemandLabel}</p>
                  </div>
                  <div className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {exerciseCountLabel}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  El resumen de ejercicios se muestra al iniciar entrenamiento.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" onClick={handleOpenTrainingSummary}>
                    {activeSession ? "Continuar entrenamiento" : "Iniciar entrenamiento"}
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
          ) : null}

          <DashboardCardShell title="Nutricion" className="h-full" contentClassName={denseCardContentClass}>
            <div className="flex h-full flex-col justify-between gap-4">
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

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-muted/10 px-2.5 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Proteina</span>
                      <span>{proteinProgress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${proteinProgress}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(proteinCurrent)} / {Math.round(proteinGoal)} g</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/10 px-2.5 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Carbs</span>
                      <span>{carbsProgress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${carbsProgress}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(carbsCurrent)} / {Math.round(carbsGoal)} g</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/10 px-2.5 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Grasas</span>
                      <span>{fatProgress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-rose-500" style={{ width: `${fatProgress}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(fatCurrent)} / {Math.round(fatGoal)} g</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border border-border/60 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
                  Restan <span className="font-semibold text-foreground">{remainingCalories.toLocaleString("es-PE")} kcal</span> para cumplir tu objetivo de hoy.
                </div>
                <Button asChild className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <Link to="/nutrition">Registrar comida</Link>
                </Button>
              </div>
            </div>
          </DashboardCardShell>

          {!isMobile && isWidgetVisible("notes") ? (
            <div className="space-y-3">
              <section className="min-w-0">
                <TacticalNotesCard
                  loading={snapshot.coreLoading}
                  todayNote={core?.noteToday ?? null}
                  latestNote={core?.noteLatest ?? null}
                  onSave={(payload) => saveNoteMutation.mutateAsync(payload).then(() => undefined)}
                />
              </section>
            </div>
          ) : null}
          </section>
        ) : null}

        {showSecondaryDashboardZones ? (
          <section aria-labelledby="dashboard-zone-extension" className="space-y-4">
            <h2 id="dashboard-zone-extension" className="sr-only">Zona de extension progresiva</h2>
            {stackCards.length > 0 ? (
              <div className={cn("space-y-4", !isMobile && "grid gap-4 space-y-0 lg:grid-cols-2")}>
                {stackCards.map((card) => <div key={card.key}>{card.node}</div>)}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;

