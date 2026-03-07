import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { CheckCircle2, Flame, ListChecks, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getGuestBodyMetrics, listBodyMetricsByRange } from "@/services/bodyMetrics";
import { getBodyMeasurementsRange } from "@/services/bodyMeasurements";
import { getBiofeedbackRange } from "@/services/dailyBiofeedback";
import { listDailyNotesByRange } from "@/services/dailyNotes";
import {
  DAILY_METRIC_TASK_DEFINITIONS,
  DEFAULT_DAILY_METRIC_TASKS,
  type DailyMetricTaskKey,
  getDailyMetricTaskPreferences,
  saveDailyMetricTaskPreferences,
} from "@/services/dailyMetricTasks";
import { getSleepRangeTotals } from "@/services/sleep";
import { getWaterRangeTotals } from "@/services/waterIntake";

type DashboardCore = {
  waterTodayMl: number;
  sleepDay?: { total_minutes?: number } | null;
  weightSnapshot?: { entries?: Array<{ measured_at: string }> } | null;
  bioToday?: unknown | null;
  noteToday?: unknown | null;
  latestMeasurement?: { date_key: string } | null;
};

type DailyStatusMap = Record<DailyMetricTaskKey, boolean>;
type DailyHistoryMap = Record<string, DailyStatusMap>;

const STREAK_LOOKBACK_DAYS = 90;

const buildStatusMap = (initial = false): DailyStatusMap => ({
  water: initial,
  sleep: initial,
  weight: initial,
  biofeedback: initial,
  notes: initial,
  measurements: initial,
});

const DailyMetricsTodoCard = ({ core }: { core: DashboardCore | null | undefined }) => {
  const queryClient = useQueryClient();
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
  const timeZone = (profile as { timezone?: string } | null)?.timezone || DEFAULT_WATER_TIMEZONE;
  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKeyForTimezone(today, timeZone);
  const preferencesKey = ["dashboard", "metric_task_preferences", userId, isGuest] as const;

  const preferencesQuery = useQuery({
    queryKey: preferencesKey,
    queryFn: () => getDailyMetricTaskPreferences(userId, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const selectedTasks = preferencesQuery.data ?? DEFAULT_DAILY_METRIC_TASKS;

  const historyQuery = useQuery({
    queryKey: ["dashboard", "metric_task_history", userId, isGuest, timeZone, todayKey],
    queryFn: async () => {
      const end = new Date(today);
      end.setHours(0, 0, 0, 0);
      const start = addDays(end, -(STREAK_LOOKBACK_DAYS - 1));

      const [waterTotals, sleepTotals, bioRows, noteRows, weightRows, measurementRows] = await Promise.all([
        getWaterRangeTotals(userId, start, end, { isGuest, timeZone }),
        getSleepRangeTotals(userId, start, end, { isGuest, timeZone }),
        getBiofeedbackRange(userId, start, end, { isGuest, timeZone }),
        listDailyNotesByRange(userId, start, end, { isGuest, timeZone }),
        isGuest ? Promise.resolve(getGuestBodyMetrics()) : listBodyMetricsByRange(userId, "all", false),
        getBodyMeasurementsRange(userId, start, end, { isGuest, timeZone }),
      ]);

      const history: DailyHistoryMap = {};
      let cursor = new Date(start);
      while (cursor <= end) {
        history[getDateKeyForTimezone(cursor, timeZone)] = buildStatusMap(false);
        cursor = addDays(cursor, 1);
      }

      waterTotals.forEach((row) => {
        if (history[row.date_key]) history[row.date_key].water = Number(row.total_ml || 0) > 0;
      });
      sleepTotals.forEach((row) => {
        if (history[row.date_key]) history[row.date_key].sleep = Number(row.total_minutes || 0) > 0;
      });
      bioRows.forEach((row) => {
        if (history[row.date_key]) history[row.date_key].biofeedback = true;
      });
      noteRows.forEach((row) => {
        if (history[row.date_key]) history[row.date_key].notes = true;
      });
      weightRows.forEach((row) => {
        if (history[row.measured_at]) history[row.measured_at].weight = true;
      });
      measurementRows.forEach((row) => {
        if (history[row.date_key]) history[row.date_key].measurements = true;
      });

      return history;
    },
    enabled: Boolean(userId) || isGuest,
  });

  const todayStatus = useMemo(() => {
    const fallback = buildStatusMap(false);
    fallback.water = Number(core?.waterTodayMl || 0) > 0;
    fallback.sleep = Number(core?.sleepDay?.total_minutes || 0) > 0;
    fallback.weight = (core?.weightSnapshot?.entries || []).some((entry) => entry.measured_at === todayKey);
    fallback.biofeedback = Boolean(core?.bioToday);
    fallback.notes = Boolean(core?.noteToday);
    fallback.measurements = core?.latestMeasurement?.date_key === todayKey;

    return historyQuery.data?.[todayKey] ?? fallback;
  }, [core, historyQuery.data, todayKey]);

  const streakDays = useMemo(() => {
    if (selectedTasks.length === 0) return 0;
    let streak = 0;
    let cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);

    for (let i = 0; i < STREAK_LOOKBACK_DAYS; i += 1) {
      const key = getDateKeyForTimezone(cursor, timeZone);
      const day = historyQuery.data?.[key];
      if (!day) break;
      const completedAll = selectedTasks.every((taskKey) => day[taskKey]);
      if (!completedAll) break;
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }, [historyQuery.data, selectedTasks, timeZone, today]);

  const savePreferencesMutation = useMutation({
    mutationFn: (next: DailyMetricTaskKey[]) => saveDailyMetricTaskPreferences(userId, next, { isGuest }),
    onSuccess: (saved) => {
      queryClient.setQueryData(preferencesKey, saved);
      toast.success("Tareas del To-Do actualizadas.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudieron guardar las tareas.");
    },
  });

  const handleToggleTask = (task: DailyMetricTaskKey, enabled: boolean) => {
    const base = selectedTasks;
    const next = enabled ? Array.from(new Set([...base, task])) : base.filter((item) => item !== task);
    if (next.length === 0) {
      toast.error("Debes mantener al menos una tarea activa.");
      return;
    }
    savePreferencesMutation.mutate(next);
  };

  const completedCount = selectedTasks.filter((key) => todayStatus[key]).length;
  const totalCount = selectedTasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const selectedDefinitions = DAILY_METRIC_TASK_DEFINITIONS.filter((item) => selectedTasks.includes(item.key));

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">To-Do diario</p>
            <h3 className="text-lg font-semibold">Metricas pendientes de hoy</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Flame className="mr-1 h-3.5 w-3.5" />
              Racha: {streakDays} dia{streakDays === 1 ? "" : "s"}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Personalizar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-3">
                <p className="text-sm font-medium">Selecciona tus tareas diarias</p>
                <div className="space-y-2">
                  {DAILY_METRIC_TASK_DEFINITIONS.map((task) => {
                    const checked = selectedTasks.includes(task.key);
                    return (
                      <div key={task.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`task-${task.key}`}
                          checked={checked}
                          onCheckedChange={(value) => handleToggleTask(task.key, Boolean(value))}
                          disabled={savePreferencesMutation.isPending}
                        />
                        <Label htmlFor={`task-${task.key}`} className="text-sm font-normal">
                          {task.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>
              Completadas: {completedCount}/{totalCount}
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {selectedDefinitions.map((task) => {
            const isDone = todayStatus[task.key];
            return (
              <div
                key={task.key}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  isDone ? "border-primary/40 bg-primary/5" : "border-border/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${isDone ? "text-foreground" : "text-muted-foreground"}`}>{task.label}</span>
                </div>
                {!isDone && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={task.route}>Ir</Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyMetricsTodoCard;
