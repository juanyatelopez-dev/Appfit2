import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Droplets, FileText, HeartPulse, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { addWaterIntake, getWaterGoal, getWaterLogsByDate, getWaterRangeTotals, type WaterLog } from "@/services/waterIntake";
import {
  getGuestBodyMetrics,
  listBodyMetricsByRange,
  saveGuestBodyMetrics,
  upsertBodyMetric,
  type BodyMetricEntry,
} from "@/services/bodyMetrics";
import { addSleepLog, getSleepDay, getSleepGoal, getSleepRangeTotals } from "@/services/sleep";
import { getBiofeedbackRange, getDailyBiofeedback } from "@/services/dailyBiofeedback";
import { getDailyNote, listDailyNotesByRange, upsertDailyNote } from "@/services/dailyNotes";
import { getNutritionDaySummary, getNutritionRangeSummary } from "@/services/nutrition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CalendarDayData = {
  dateKey: string;
  totalWaterMl: number;
  totalSleepMinutes: number;
  weightKg: number | null;
  metWaterGoal: boolean;
  metSleepGoal: boolean;
  hasWater: boolean;
  hasWeight: boolean;
  hasSleep: boolean;
  hasBiofeedback: boolean;
  hasNote: boolean;
  hasNutrition: boolean;
  nutritionCalories: number;
};

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");
const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);

const Calendar = () => {
  const { user, isGuest, profile } = useAuth();
  const { language, t } = usePreferences();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [quickWaterMl, setQuickWaterMl] = useState("");
  const [quickWeightKg, setQuickWeightKg] = useState("");
  const [quickSleepMinutes, setQuickSleepMinutes] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const timezone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { data: waterGoal = { water_goal_ml: 2000, water_quick_options_ml: [250, 500, 1000, 2000] } } = useQuery({
    queryKey: ["water_goal", user?.id, isGuest],
    queryFn: () => getWaterGoal(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: sleepGoal = { sleep_goal_minutes: 480 } } = useQuery({
    queryKey: ["sleep_goal", user?.id, isGuest],
    queryFn: () => getSleepGoal(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: calendarData, isLoading } = useQuery({
    queryKey: [
      "calendar_data",
      user?.id,
      formatDateKey(gridStart),
      formatDateKey(gridEnd),
      timezone,
      isGuest,
      waterGoal.water_goal_ml,
      sleepGoal.sleep_goal_minutes,
    ],
    queryFn: async () => {
      const [waterTotals, weightEntries, sleepTotals, biofeedbackRows, notesRows, nutritionRange] = await Promise.all([
        getWaterRangeTotals(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        isGuest ? Promise.resolve(getGuestBodyMetrics()) : listBodyMetricsByRange(user?.id ?? null, "all", false),
        getSleepRangeTotals(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        getBiofeedbackRange(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        listDailyNotesByRange(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        getNutritionRangeSummary(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }).catch(() => ({
          days: [],
          averages: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        })),
      ]);

      const waterMap = new Map<string, number>();
      waterTotals.forEach((row) => waterMap.set(row.date_key, Number(row.total_ml || 0)));

      const weightMap = new Map<string, number>();
      weightEntries.forEach((entry) => {
        if (entry.measured_at >= formatDateKey(gridStart) && entry.measured_at <= formatDateKey(gridEnd)) {
          weightMap.set(entry.measured_at, Number(entry.weight_kg));
        }
      });

      const sleepMap = new Map<string, number>();
      sleepTotals.forEach((row) => sleepMap.set(row.date_key, Number(row.total_minutes || 0)));

      const biofeedbackMap = new Map<string, boolean>();
      biofeedbackRows.forEach((row) => biofeedbackMap.set(row.date_key, true));
      const notesMap = new Map<string, boolean>();
      notesRows.forEach((row) => notesMap.set(row.date_key, true));
      const nutritionMap = new Map<string, number>();
      nutritionRange.days.forEach((row) => nutritionMap.set(row.date_key, Number(row.calories || 0)));

      const daily = new Map<string, CalendarDayData>();
      let cursor = new Date(gridStart);
      while (cursor <= gridEnd) {
        const dateKey = formatDateKey(cursor);
        const totalWaterMl = waterMap.get(dateKey) ?? 0;
        const totalSleepMinutes = sleepMap.get(dateKey) ?? 0;
        const weightKg = weightMap.get(dateKey) ?? null;
        const metWaterGoal = totalWaterMl >= waterGoal.water_goal_ml;
        const metSleepGoal = totalSleepMinutes >= sleepGoal.sleep_goal_minutes;
        const hasWater = totalWaterMl > 0;
        const hasWeight = weightKg !== null;
        const hasSleep = totalSleepMinutes > 0;
        const hasBiofeedback = biofeedbackMap.get(dateKey) ?? false;
        const hasNote = notesMap.get(dateKey) ?? false;
        const nutritionCalories = nutritionMap.get(dateKey) ?? 0;
        const hasNutrition = nutritionCalories > 0;
        daily.set(dateKey, {
          dateKey,
          totalWaterMl,
          totalSleepMinutes,
          weightKg,
          metWaterGoal,
          metSleepGoal,
          hasWater,
          hasWeight,
          hasSleep,
          hasBiofeedback,
          hasNote,
          hasNutrition,
          nutritionCalories,
        });
        cursor = addDays(cursor, 1);
      }

      return { daily };
    },
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: selectedDayLogs = [] } = useQuery({
    queryKey: ["calendar_day_logs", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getWaterLogsByDate(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: selectedSleepDay } = useQuery({
    queryKey: ["calendar_day_sleep", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getSleepDay(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: selectedBiofeedback } = useQuery({
    queryKey: ["calendar_day_biofeedback", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getDailyBiofeedback(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: selectedNote } = useQuery({
    queryKey: ["calendar_day_note", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getDailyNote(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: selectedNutrition } = useQuery({
    queryKey: ["calendar_day_nutrition", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () =>
      getNutritionDaySummary(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone, profile: profile as any }).catch(
        () => null,
      ),
    enabled: Boolean(user?.id) || isGuest,
  });

  useEffect(() => {
    setNoteTitle(selectedNote?.title ?? "");
    setNoteContent(selectedNote?.content ?? "");
  }, [selectedNote?.content, selectedNote?.title]);

  const selectedDay = calendarData?.daily.get(selectedDateKey);

  const monthStats = useMemo(() => {
    if (!calendarData) {
      return {
        activeDays: 0,
        metGoalDays: 0,
        avgWaterMl: 0,
        avgWeightKg: null as number | null,
      };
    }

    const monthDays = Array.from(calendarData.daily.values()).filter(
      (day) => day.dateKey >= formatDateKey(monthStart) && day.dateKey <= formatDateKey(monthEnd),
    );

    const activeDays = monthDays.filter((day) => day.hasWater || day.hasWeight || day.hasSleep || day.hasBiofeedback || day.hasNote || day.hasNutrition).length;
    const metGoalDays = monthDays.filter((day) => day.metWaterGoal).length;
    const avgWaterMl =
      monthDays.length > 0
        ? Math.round(monthDays.reduce((sum, day) => sum + day.totalWaterMl, 0) / monthDays.length)
        : 0;

    const weightDays = monthDays.filter((day) => day.weightKg !== null);
    const avgWeightKg =
      weightDays.length > 0
        ? Number((weightDays.reduce((sum, day) => sum + Number(day.weightKg), 0) / weightDays.length).toFixed(1))
        : null;

    return { activeDays, metGoalDays, avgWaterMl, avgWeightKg };
  }, [calendarData, monthEnd, monthStart]);

  const visibleDays = useMemo(() => {
    const days: Date[] = [];
    let cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [gridEnd, gridStart]);

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, idx) =>
      addDays(start, idx).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
        weekday: "short",
      }),
    );
  }, [language]);

  const addWaterMutation = useMutation({
    mutationFn: async () => {
      const ml = Number(quickWaterMl);
      await addWaterIntake({
        userId: user?.id ?? null,
        consumed_ml: ml,
        date: new Date(`${selectedDateKey}T12:00:00`),
        timeZone: timezone,
        isGuest,
      });
    },
    onSuccess: async () => {
      setQuickWaterMl("");
      toast.success(t("calendar.quickAdd.savedWater"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_day_logs"] }),
        queryClient.invalidateQueries({ queryKey: ["water_day_total"] }),
        queryClient.invalidateQueries({ queryKey: ["water_range"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || t("calendar.quickAdd.saveError"));
    },
  });

  const addWeightMutation = useMutation({
    mutationFn: async () => {
      const parsedWeight = Number(quickWeightKg);
      if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 400) {
        throw new Error("El peso debe estar entre 20 y 400 kg.");
      }

      if (isGuest) {
        const entries = getGuestBodyMetrics().filter((item) => item.measured_at !== selectedDateKey);
        const newEntry: BodyMetricEntry = {
          id: crypto.randomUUID(),
          user_id: "guest",
          measured_at: selectedDateKey,
          weight_kg: parsedWeight,
          notes: null,
          created_at: new Date().toISOString(),
        };
        entries.push(newEntry);
        entries.sort((a, b) => b.measured_at.localeCompare(a.measured_at));
        saveGuestBodyMetrics(entries);
        return;
      }

      await upsertBodyMetric({
        userId: user?.id ?? null,
        isGuest: false,
        measured_at: selectedDateKey,
        weight_kg: parsedWeight,
        notes: null,
      });
    },
    onSuccess: async () => {
      setQuickWeightKg("");
      toast.success(t("calendar.quickAdd.savedWeight"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["body_metrics"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || t("calendar.quickAdd.saveError"));
    },
  });

  const addSleepMutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(quickSleepMinutes);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1440) {
        throw new Error(t("settings.sleepGoalError"));
      }
      await addSleepLog({
        userId: user?.id ?? null,
        date: fromDateKey(selectedDateKey),
        total_minutes: parsed,
        isGuest,
        timeZone: timezone,
      });
    },
    onSuccess: async () => {
      setQuickSleepMinutes("");
      toast.success(t("calendar.quickAdd.savedSleep"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_day_sleep"] }),
        queryClient.invalidateQueries({ queryKey: ["sleep_day"] }),
        queryClient.invalidateQueries({ queryKey: ["sleep_range"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || t("calendar.quickAdd.saveError"));
    },
  });

  const dayCellClasses = (day: CalendarDayData | undefined, inCurrentMonth: boolean) => {
    if (!day) return inCurrentMonth ? "bg-card" : "bg-muted/40";

    const intensity =
      (day.hasWater ? 1 : 0) +
      (day.hasWeight ? 1 : 0) +
      (day.hasSleep ? 1 : 0) +
      (day.hasBiofeedback ? 1 : 0) +
      (day.hasNote ? 1 : 0) +
      (day.hasNutrition ? 1 : 0) +
      (day.metWaterGoal ? 1 : 0) +
      (day.metSleepGoal ? 1 : 0);
    const heatClass =
      intensity <= 1
        ? "bg-card"
        : intensity === 2
        ? "bg-primary/10"
        : intensity === 3
        ? "bg-primary/20"
        : "bg-primary/30";

    return `${heatClass} ${inCurrentMonth ? "" : "opacity-65"}`;
  };

  const saveNoteMutation = useMutation({
    mutationFn: () =>
      upsertDailyNote({
        userId: user?.id ?? null,
        date: fromDateKey(selectedDateKey),
        title: noteTitle.trim() || null,
        content: noteContent,
        isGuest,
        timeZone: timezone,
      }),
    onSuccess: async () => {
      toast.success("Nota del dia guardada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_day_note"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar la nota.");
    },
  });

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("calendar.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("calendar.description")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("calendar.prevMonth")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
            {t("calendar.today")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}>
            {t("calendar.nextMonth")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("calendar.monthStats.activeDays")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{monthStats.activeDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("calendar.monthStats.waterGoalDays")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{monthStats.metGoalDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("calendar.monthStats.avgWater")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{monthStats.avgWaterMl} ml</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("calendar.monthStats.avgWeight")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{monthStats.avgWeightKg !== null ? `${monthStats.avgWeightKg} kg` : "--"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {currentMonth.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
              {weekdayLabels.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("calendar.loading")}</p>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {visibleDays.map((dayDate) => {
                  const key = formatDateKey(dayDate);
                  const day = calendarData?.daily.get(key);
                  const inCurrentMonth = isSameMonth(dayDate, currentMonth);
                  const isSelected = key === selectedDateKey;

                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDateKey(key)}
                      className={`min-h-24 rounded-lg border p-2 text-left transition ${dayCellClasses(day, inCurrentMonth)} ${
                        isSelected ? "ring-2 ring-primary" : "hover:border-primary/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dayDate.getDate()}</span>
                        {day?.metWaterGoal && <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        {day?.hasWater && <Droplets className="h-3 w-3 text-primary" aria-label={t("calendar.summary.water")} />}
                        {day?.hasWeight && <Scale className="h-3 w-3 text-muted-foreground" aria-label={t("calendar.summary.weight")} />}
                        {day?.hasSleep && <Moon className="h-3 w-3 text-indigo-500" aria-label={t("calendar.summary.sleep")} />}
                        {day?.hasBiofeedback && <HeartPulse className="h-3 w-3 text-rose-500" aria-label="Biofeedback" />}
                        {day?.hasNote && <FileText className="h-3 w-3 text-amber-500" aria-label="Daily note" />}
                        {day?.hasNutrition && <UtensilsCrossed className="h-3 w-3 text-emerald-400" aria-label="Alimentacion" />}
                        {day?.metSleepGoal && <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("calendar.summaryTitle")}</CardTitle>
              <CardDescription>
                {fromDateKey(selectedDateKey).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDay ? (
                <p className="text-sm text-muted-foreground">{t("calendar.summaryEmpty")}</p>
              ) : (
                <>
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm text-muted-foreground">{t("calendar.summary.weight")}</p>
                    <p className="text-lg font-semibold">
                      {selectedDay.weightKg !== null ? `${selectedDay.weightKg} kg` : t("calendar.summary.noWeight")}
                    </p>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm text-muted-foreground">{t("calendar.summary.water")}</p>
                    <p className="text-lg font-semibold">
                      {selectedDay.totalWaterMl > 0
                        ? `${selectedDay.totalWaterMl} / ${waterGoal.water_goal_ml} ml`
                        : t("calendar.summary.noWater")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDay.metWaterGoal ? t("calendar.summary.goalReached") : t("calendar.summary.goalPending")}
                    </p>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm text-muted-foreground">{t("calendar.summary.sleep")}</p>
                    <p className="text-lg font-semibold">
                      {selectedDay.totalSleepMinutes > 0
                        ? `${(selectedDay.totalSleepMinutes / 60).toFixed(1)}h / ${(sleepGoal.sleep_goal_minutes / 60).toFixed(1)}h`
                        : t("calendar.summary.noSleep")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDay.metSleepGoal ? t("calendar.summary.goalReached") : t("calendar.summary.goalPending")}
                    </p>
                    {selectedSleepDay?.logs?.length ? (
                      <p className="text-xs text-muted-foreground">
                        {selectedSleepDay.logs.length} {t("sleep.page.logs").toLowerCase()}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm font-medium">{t("calendar.summary.logsTitle")}</p>
                    {selectedDayLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("calendar.summary.noLogs")}</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayLogs.map((log: WaterLog) => (
                          <div key={log.id} className="flex items-center justify-between text-sm">
                            <span>{log.consumed_ml} ml</span>
                            <span className="text-muted-foreground">
                              {new Date(log.logged_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm text-muted-foreground">Biofeedback</p>
                    {!selectedBiofeedback ? (
                      <p className="text-sm text-muted-foreground">Sin check-in para este dia.</p>
                    ) : (
                      <>
                        <p className="text-lg font-semibold">Check-in completado</p>
                        <p className="text-xs text-muted-foreground">
                          Energia {selectedBiofeedback.daily_energy}/10 | Estres {selectedBiofeedback.perceived_stress}/10 | Sueno{" "}
                          {selectedBiofeedback.sleep_quality}/10
                        </p>
                        {selectedBiofeedback.notes ? (
                          <p className="text-xs text-muted-foreground">{selectedBiofeedback.notes}</p>
                        ) : null}
                      </>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/biofeedback?date=${selectedDateKey}`}>Abrir check-in</Link>
                    </Button>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm text-muted-foreground">Alimentacion</p>
                    {!selectedNutrition || selectedNutrition.totals.calories <= 0 ? (
                      <p className="text-sm text-muted-foreground">Sin registros de alimentacion.</p>
                    ) : (
                      <>
                        <p className="text-lg font-semibold">
                          {selectedNutrition.totals.calories} / {selectedNutrition.goals.calorie_goal} kcal
                        </p>
                        <p className="text-xs text-muted-foreground">
                          P {selectedNutrition.totals.protein_g}g | C {selectedNutrition.totals.carbs_g}g | G {selectedNutrition.totals.fat_g}g
                        </p>
                      </>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/nutrition?date=${selectedDateKey}`}>Abrir alimentacion</Link>
                    </Button>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm text-muted-foreground">Notas diarias</p>
                    <Input
                      value={noteTitle}
                      onChange={(event) => setNoteTitle(event.target.value)}
                      placeholder="Titulo"
                      maxLength={120}
                    />
                    <Textarea
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                      placeholder="Observaciones tacticas del dia..."
                      className="min-h-24"
                    />
                    {selectedNote ? (
                      <p className="text-xs text-muted-foreground">Nota existente para {selectedDateKey}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sin nota para este dia.</p>
                    )}
                    <Button onClick={() => saveNoteMutation.mutate()} disabled={saveNoteMutation.isPending || !noteContent.trim()}>
                      Guardar nota
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("calendar.quickAddTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  {t("calendar.quickAdd.water")}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={quickWaterMl}
                    onChange={(e) => setQuickWaterMl(e.target.value)}
                    placeholder={t("calendar.quickAdd.waterPlaceholder")}
                  />
                  <Button onClick={() => addWaterMutation.mutate()} disabled={addWaterMutation.isPending}>
                    {t("calendar.quickAdd.addWater")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  {t("calendar.quickAdd.weight")}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={quickWeightKg}
                    onChange={(e) => setQuickWeightKg(e.target.value)}
                    step="0.1"
                    placeholder={t("calendar.quickAdd.weightPlaceholder")}
                  />
                  <Button onClick={() => addWeightMutation.mutate()} disabled={addWeightMutation.isPending}>
                    {t("calendar.quickAdd.addWeight")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  {t("calendar.quickAdd.sleep")}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={quickSleepMinutes}
                    onChange={(e) => setQuickSleepMinutes(e.target.value)}
                    placeholder={t("calendar.quickAdd.sleepPlaceholder")}
                  />
                  <Button onClick={() => addSleepMutation.mutate()} disabled={addSleepMutation.isPending}>
                    {t("calendar.quickAdd.addSleep")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
