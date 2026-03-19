import { addDays, format, startOfWeek } from "date-fns";

import type { DashboardCheckinModuleKey } from "@/services/dashboardCheckinPreferences";
import type {
  DashboardDailyModule,
  DashboardPrimaryAction,
  DashboardUpcomingItem,
  DashboardViewModel,
} from "@/features/dashboard/dashboardTypes";

type DashboardMonthActivityDay = {
  hasWater?: boolean;
  hasSleep?: boolean;
  hasWeight?: boolean;
  hasBiofeedback?: boolean;
  hasNutrition?: boolean;
};

type DashboardCoreSlice = {
  waterTodayMl?: number;
  waterGoalMl?: number;
  sleepDay?: { total_minutes?: number } | null;
  weightSnapshot?: { entries?: Array<{ measured_at: string }> } | null;
  latestMeasurement?: { date_key?: string | null } | null;
  bioToday?: unknown;
};

type DashboardWorkoutSummary = {
  name?: string | null;
};

type DashboardViewModelInput = {
  core: DashboardCoreSlice | null | undefined;
  todayKey: string;
  todayActivity: DashboardMonthActivityDay | undefined;
  monthActivity: Map<string, DashboardMonthActivityDay> | undefined;
  selectedModuleKeys: DashboardCheckinModuleKey[];
  activeWorkout: DashboardWorkoutSummary | null;
  scheduledWorkout: DashboardWorkoutSummary | null;
};

const buildDailyModules = (
  core: DashboardCoreSlice | null | undefined,
  todayKey: string,
  todayActivity: DashboardMonthActivityDay | undefined,
): DashboardDailyModule[] => [
  { key: "water", label: "Agua", href: "#water", completed: (core?.waterTodayMl ?? 0) > 0 },
  { key: "sleep", label: "Sueno", href: "#sleep", completed: (core?.sleepDay?.total_minutes ?? 0) > 0 },
  {
    key: "weight",
    label: "Peso",
    href: "#weight",
    completed: (core?.weightSnapshot?.entries ?? []).some((entry) => entry.measured_at === todayKey),
  },
  {
    key: "measurements",
    label: "Medidas",
    href: "/body",
    completed: core?.latestMeasurement?.date_key === todayKey,
  },
  { key: "biofeedback", label: "Biofeedback", href: "#biofeedback", completed: Boolean(core?.bioToday) },
  { key: "nutrition", label: "Comidas", href: "#nutrition", completed: Boolean(todayActivity?.hasNutrition) },
];

const buildPrimaryAction = (
  activeWorkout: DashboardWorkoutSummary | null,
  scheduledWorkout: DashboardWorkoutSummary | null,
  nextModule: DashboardDailyModule | null,
): DashboardPrimaryAction => {
  if (activeWorkout) {
    return {
      label: "Continuar entrenamiento",
      href: "/training?tab=today",
    };
  }

  if (scheduledWorkout) {
    return {
      label: "Iniciar entrenamiento",
      href: "/training?tab=today",
    };
  }

  if (nextModule) {
    return {
      label: `Registrar ${nextModule.label.toLowerCase()}`,
      href: nextModule.href,
    };
  }

  return {
    label: "Ver progreso semanal",
    href: "/progress",
  };
};

export const buildWeeklyConsistency = (
  monthActivity: Map<string, DashboardMonthActivityDay> | undefined,
  todayKey: string,
) => {
  const todayDate = new Date(`${todayKey}T12:00:00`);
  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const labels = ["L", "M", "M", "J", "V", "S", "D"];

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(weekStart, index);
    const dateKey = format(date, "yyyy-MM-dd");
    const activity = monthActivity?.get(dateKey);
    const completedChecks =
      Number(Boolean(activity?.hasWater)) +
      Number(Boolean(activity?.hasSleep)) +
      Number(Boolean(activity?.hasNutrition)) +
      Number(Boolean(activity?.hasWeight)) +
      Number(Boolean(activity?.hasBiofeedback));

    return {
      dateKey,
      label: labels[index] ?? "",
      completed: completedChecks >= 2,
      isToday: dateKey === todayKey,
    };
  });

  return {
    days,
    completedCount: days.filter((day) => day.completed).length,
  };
};

const buildUpcomingItems = (
  core: DashboardCoreSlice | null | undefined,
  activeWorkout: DashboardWorkoutSummary | null,
  scheduledWorkout: DashboardWorkoutSummary | null,
  nextModule: DashboardDailyModule | null,
): DashboardUpcomingItem[] => {
  const items: DashboardUpcomingItem[] = [];

  if (activeWorkout) {
    items.push({
      title: "Sesion activa",
      detail: activeWorkout.name ?? "Continua con tu entrenamiento de hoy",
    });
  } else if (scheduledWorkout) {
    items.push({
      title: "Entrenamiento de hoy",
      detail: scheduledWorkout.name ?? "Rutina programada para hoy",
    });
  }

  if (nextModule) {
    items.push({
      title: "Siguiente registro",
      detail: `${nextModule.label}: pendiente por completar`,
    });
  }

  const remainingWater = Math.max((core?.waterGoalMl ?? 2000) - (core?.waterTodayMl ?? 0), 0);
  if (remainingWater > 0) {
    items.push({
      title: "Hidratacion",
      detail: `Te faltan ${remainingWater} ml para tu objetivo diario`,
    });
  }

  if ((core?.sleepDay?.total_minutes ?? 0) === 0) {
    items.push({
      title: "Sueno",
      detail: "Registra tu descanso para completar el control diario",
    });
  }

  return items.slice(0, 3);
};

export const buildDashboardViewModel = ({
  core,
  todayKey,
  todayActivity,
  monthActivity,
  selectedModuleKeys,
  activeWorkout,
  scheduledWorkout,
}: DashboardViewModelInput): DashboardViewModel => {
  const allDailyModules = buildDailyModules(core, todayKey, todayActivity);
  const dailyModules = allDailyModules.filter((module) => selectedModuleKeys.includes(module.key));
  const completionCount = dailyModules.filter((module) => module.completed).length;
  const missingModules = dailyModules.filter((module) => !module.completed);
  const nextModule = missingModules[0] ?? null;
  const remainingModuleCount = Math.max(missingModules.length - 1, 0);
  const todayCompletionPct = dailyModules.length > 0 ? Math.round((completionCount / dailyModules.length) * 100) : 0;
  const pendingChecklist = missingModules.slice(0, 3);
  const nextActionLabel = nextModule
    ? `${nextModule.label}: siguiente registro recomendado`
    : "Dia operativo completo. Revisa progreso o nutricion para interpretar tendencias.";

  return {
    dailyModules,
    completionCount,
    missingModules,
    nextModule,
    remainingModuleCount,
    todayCompletionPct,
    pendingChecklist,
    nextActionLabel,
    primaryAction: buildPrimaryAction(activeWorkout, scheduledWorkout, nextModule),
    weeklyConsistency: buildWeeklyConsistency(monthActivity, todayKey),
    upcomingItems: buildUpcomingItems(core, activeWorkout, scheduledWorkout, nextModule),
  };
};
