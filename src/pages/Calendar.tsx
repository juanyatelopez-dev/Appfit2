import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Droplets, FileText, HeartPulse, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getWaterGoal, getWaterLogsByDate, getWaterRangeTotals, type WaterLog } from "@/services/waterIntake";
import { getSleepDay, getSleepGoal, getSleepRangeTotals, type SleepLog } from "@/services/sleep";
import { getBiofeedbackRange, getDailyBiofeedback } from "@/services/dailyBiofeedback";
import { getDailyNote, listDailyNotesByRange, upsertDailyNote } from "@/services/dailyNotes";
import { getNutritionDaySummary, getNutritionRangeSummary } from "@/services/nutrition";
import { getGuestBodyMetrics, listBodyMetricsByRange } from "@/services/bodyMetrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type CalendarDayData = {
  dateKey: string;
  totalWaterMl: number;
  totalSleepMinutes: number;
  weightKg: number | null;
  hasWater: boolean;
  hasWeight: boolean;
  hasSleep: boolean;
  hasBiofeedback: boolean;
  hasNote: boolean;
  hasNutrition: boolean;
  metWaterGoal: boolean;
  metSleepGoal: boolean;
  nutritionCalories: number;
};

type TimelineItem = {
  id: string;
  title: string;
  detail: string;
  startMinutes: number;
  durationMinutes: number;
  variant: "logged" | "pending" | "context";
  href?: string;
  icon: typeof Droplets;
  badge?: string;
  surfaceClassName: string;
};

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");
const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);
const TIMELINE_HOUR_HEIGHT = 72;
const DAY_TOTAL_MINUTES = 24 * 60;
const PENDING_TIME_MAP: Record<string, number> = {
  weight: 7 * 60,
  sleep: 8 * 60,
  biofeedback: 9 * 60,
  nutrition: 13 * 60,
  water: 21 * 60,
};

const clampMinutes = (value: number) => Math.min(DAY_TOTAL_MINUTES, Math.max(0, Math.round(value)));

const getMinutesForTimestamp = (value: string | null | undefined, dateKey: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const start = fromDateKey(dateKey).getTime();
  return clampMinutes((parsed.getTime() - start) / 60000);
};

const getTimelineRangeLabel = (startMinutes: number, durationMinutes: number, locale: string) => {
  const start = new Date(fromDateKey("2026-01-01").getTime() + startMinutes * 60000);
  const end = new Date(fromDateKey("2026-01-01").getTime() + Math.min(DAY_TOTAL_MINUTES, startMinutes + durationMinutes) * 60000);
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const getHourLabel = (hour: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(new Date(2026, 0, 1, hour, 0, 0));

const getSleepTimelinePlacement = (log: SleepLog, dateKey: string) => {
  const dayStart = fromDateKey(dateKey).getTime();
  const dayEnd = dayStart + DAY_TOTAL_MINUTES * 60000;
  const fallbackEnd = dayStart + 7 * 60 * 60000;
  const rawEnd = log.sleep_end ? new Date(log.sleep_end).getTime() : fallbackEnd;
  const rawStart = log.sleep_start ? new Date(log.sleep_start).getTime() : rawEnd - Number(log.total_minutes || 0) * 60000;
  const start = Math.max(rawStart, dayStart);
  const end = Math.min(rawEnd, dayEnd);
  const startMinutes = clampMinutes((start - dayStart) / 60000);
  const durationMinutes = Math.max(45, clampMinutes((end - start) / 60000) || Number(log.total_minutes || 0));
  return { startMinutes, durationMinutes };
};

const Calendar = () => {
  const { user, isGuest, profile } = useAuth();
  const { language, t } = usePreferences();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [calendarView, setCalendarView] = useState<"agenda" | "day" | "month">("agenda");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

  const timezone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const todayKey = getDateKeyForTimezone(new Date(), timezone);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const profileKey = [profile?.weight ?? "", profile?.height ?? "", profile?.goal_type ?? ""].join("|");

  const { data: waterGoal = { water_goal_ml: 2000 } } = useQuery({
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
    queryKey: ["calendar_data", user?.id, formatDateKey(gridStart), formatDateKey(gridEnd), timezone, isGuest, waterGoal.water_goal_ml, sleepGoal.sleep_goal_minutes],
    queryFn: async () => {
      const [waterTotals, weightEntries, sleepTotals, bioRows, noteRows, nutritionRange] = await Promise.all([
        getWaterRangeTotals(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        isGuest ? Promise.resolve(getGuestBodyMetrics()) : listBodyMetricsByRange(user?.id ?? null, "all", false),
        getSleepRangeTotals(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        getBiofeedbackRange(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        listDailyNotesByRange(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }),
        getNutritionRangeSummary(user?.id ?? null, gridStart, gridEnd, { isGuest, timeZone: timezone }).catch(() => ({ days: [] })),
      ]);

      const waterMap = new Map(waterTotals.map((row) => [row.date_key, Number(row.total_ml || 0)]));
      const sleepMap = new Map(sleepTotals.map((row) => [row.date_key, Number(row.total_minutes || 0)]));
      const bioMap = new Map(bioRows.map((row) => [row.date_key, true]));
      const noteMap = new Map(noteRows.map((row) => [row.date_key, true]));
      const nutritionMap = new Map((nutritionRange as any).days.map((row: any) => [row.date_key, Number(row.calories || 0)]));
      const weightMap = new Map<string, number>();

      weightEntries.forEach((entry: any) => {
        if (entry.measured_at >= formatDateKey(gridStart) && entry.measured_at <= formatDateKey(gridEnd)) {
          weightMap.set(entry.measured_at, Number(entry.weight_kg));
        }
      });

      const daily = new Map<string, CalendarDayData>();
      let cursor = new Date(gridStart);
      while (cursor <= gridEnd) {
        const dateKey = formatDateKey(cursor);
        const totalWaterMl = waterMap.get(dateKey) ?? 0;
        const totalSleepMinutes = sleepMap.get(dateKey) ?? 0;
        const weightKg = weightMap.get(dateKey) ?? null;
        const nutritionCalories = nutritionMap.get(dateKey) ?? 0;
        daily.set(dateKey, {
          dateKey,
          totalWaterMl,
          totalSleepMinutes,
          weightKg,
          hasWater: totalWaterMl > 0,
          hasWeight: weightKg !== null,
          hasSleep: totalSleepMinutes > 0,
          hasBiofeedback: bioMap.get(dateKey) ?? false,
          hasNote: noteMap.get(dateKey) ?? false,
          hasNutrition: nutritionCalories > 0,
          metWaterGoal: totalWaterMl >= waterGoal.water_goal_ml,
          metSleepGoal: totalSleepMinutes >= sleepGoal.sleep_goal_minutes,
          nutritionCalories,
        });
        cursor = addDays(cursor, 1);
      }

      return daily;
    },
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: dayLogs = [] } = useQuery({
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
    queryKey: ["calendar_day_nutrition", user?.id, selectedDateKey, timezone, isGuest, profileKey],
    queryFn: () => getNutritionDaySummary(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone, profile: profile as any }).catch(() => null),
    enabled: Boolean(user?.id) || isGuest,
  });

  useEffect(() => {
    setNoteTitle(selectedNote?.title ?? "");
    setNoteContent(selectedNote?.content ?? "");
  }, [selectedNote?.title, selectedNote?.content]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const selectedDay = calendarData?.get(selectedDateKey);
  const locale = language === "es" ? "es-ES" : "en-US";
  const monthLabel = currentMonth.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "long", year: "numeric" });
  const selectedDateLabel = fromDateKey(selectedDateKey).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const weekdayLabels = Array.from({ length: 7 }).map((_, idx) => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), idx).toLocaleDateString(locale, { weekday: "short" }));
  const visibleDays = useMemo(() => {
    const days: Date[] = [];
    let cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [gridStart, gridEnd]);

  const agendaDays = useMemo(() => {
    if (!calendarData) return [];
    return Array.from(calendarData.values())
      .filter((day) => day.dateKey >= formatDateKey(monthStart) && day.dateKey <= formatDateKey(monthEnd))
      .filter((day) => day.hasWater || day.hasWeight || day.hasSleep || day.hasBiofeedback || day.hasNote || day.hasNutrition || day.dateKey === selectedDateKey)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [calendarData, monthStart, monthEnd, selectedDateKey]);

  const getTrackedItemsCount = (day: CalendarDayData | undefined) => {
    if (!day) return 0;
    return [day.hasWater, day.hasWeight, day.hasSleep, day.hasBiofeedback, day.hasNutrition, day.hasNote].filter(Boolean).length;
  };

  const missingModules = useMemo(() => {
    if (!selectedDay) return [];
    const modules: Array<{ key: string; label: string; href?: string; target?: string }> = [];
    if (!selectedDay.hasWeight) modules.push({ key: "weight", label: "Peso", href: `/weight?date=${selectedDateKey}` });
    if (!selectedDay.hasWater) modules.push({ key: "water", label: "Agua", href: `/water?date=${selectedDateKey}` });
    if (!selectedDay.hasSleep) modules.push({ key: "sleep", label: "Sueno", href: `/sleep?date=${selectedDateKey}` });
    if (!selectedDay.hasBiofeedback) modules.push({ key: "biofeedback", label: "Biofeedback", href: `/biofeedback?date=${selectedDateKey}` });
    if (!selectedDay.hasNutrition) modules.push({ key: "nutrition", label: "Alimentacion", href: `/nutrition?date=${selectedDateKey}` });
    return modules;
  }, [selectedDay, selectedDateKey]);

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const mealLabels: Record<string, string> = language === "es"
      ? { breakfast: "Desayuno", lunch: "Almuerzo", dinner: "Cena", snack: "Snack" }
      : { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

    if (selectedDay?.hasWeight && selectedDay.weightKg !== null) {
      items.push({
        id: `weight-${selectedDateKey}`,
        title: language === "es" ? "Peso registrado" : "Weight logged",
        detail: `${selectedDay.weightKg} kg`,
        startMinutes: 7 * 60,
        durationMinutes: 30,
        variant: "logged",
        icon: Scale,
        surfaceClassName: "border-slate-400/25 bg-slate-500/10 text-slate-50",
        badge: language === "es" ? "Medicion" : "Measurement",
      });
    }

    dayLogs
      .slice()
      .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
      .forEach((log: WaterLog) => {
        items.push({
          id: `water-${log.id}`,
          title: language === "es" ? "Agua" : "Water",
          detail: `${log.consumed_ml} ml`,
          startMinutes: getMinutesForTimestamp(log.logged_at, selectedDateKey) ?? 12 * 60,
          durationMinutes: 25,
          variant: "logged",
          icon: Droplets,
          surfaceClassName: "border-cyan-400/30 bg-cyan-500/12 text-cyan-50",
          badge: `${log.consumed_ml} ml`,
        });
      });

    (selectedSleepDay?.logs ?? [])
      .slice()
      .sort((a: SleepLog, b: SleepLog) => a.created_at.localeCompare(b.created_at))
      .forEach((log: SleepLog, index: number) => {
        const placement = getSleepTimelinePlacement(log, selectedDateKey);
        items.push({
          id: `sleep-${log.id ?? index}`,
          title: language === "es" ? "Sueno" : "Sleep",
          detail: log.notes?.trim() || `${(Number(log.total_minutes || 0) / 60).toFixed(1)} h`,
          startMinutes: placement.startMinutes,
          durationMinutes: placement.durationMinutes,
          variant: "logged",
          icon: Moon,
          surfaceClassName: "border-indigo-400/30 bg-indigo-500/14 text-indigo-50",
          badge: `${(Number(log.total_minutes || 0) / 60).toFixed(1)} h`,
        });
      });

    if (selectedBiofeedback) {
      items.push({
        id: `bio-${selectedBiofeedback.id}`,
        title: language === "es" ? "Biofeedback" : "Biofeedback",
        detail: selectedBiofeedback.notes?.trim() || `${language === "es" ? "Energia" : "Energy"} ${selectedBiofeedback.daily_energy}/10`,
        startMinutes: getMinutesForTimestamp(selectedBiofeedback.created_at, selectedDateKey) ?? 9 * 60,
        durationMinutes: 35,
        variant: "context",
        icon: HeartPulse,
        surfaceClassName: "border-rose-400/30 bg-rose-500/12 text-rose-50",
        badge: `${selectedBiofeedback.daily_energy}/10`,
      });
    }

    if (selectedNutrition?.groups) {
      Object.entries(selectedNutrition.groups as Record<string, Array<{ id: string; created_at: string; food_name: string }>>).forEach(([mealKey, entries]) => {
        if (!entries.length) return;
        const normalizedMealKey = mealKey as keyof typeof selectedNutrition.groups;
        const mealTotals = selectedNutrition.mealTotals?.[normalizedMealKey];
        const firstEntryMinutes = getMinutesForTimestamp(entries[0]?.created_at, selectedDateKey);
        items.push({
          id: `meal-${normalizedMealKey}-${selectedDateKey}`,
          title: mealLabels[normalizedMealKey],
          detail: mealTotals?.calories ? `${mealTotals.calories} kcal | ${entries.length} ${language === "es" ? "registros" : "entries"}` : `${entries.length} ${language === "es" ? "registros" : "entries"}`,
          startMinutes: firstEntryMinutes ?? PENDING_TIME_MAP.nutrition,
          durationMinutes: Math.max(40, entries.length * 18),
          variant: "logged",
          icon: UtensilsCrossed,
          surfaceClassName: "border-emerald-400/30 bg-emerald-500/12 text-emerald-50",
          badge: mealTotals?.calories ? `${mealTotals.calories} kcal` : undefined,
        });
      });
    }

    if (selectedNote) {
      items.push({
        id: `note-${selectedNote.id}`,
        title: selectedNote.title?.trim() || (language === "es" ? "Nota diaria" : "Daily note"),
        detail: selectedNote.content,
        startMinutes: getMinutesForTimestamp(selectedNote.created_at, selectedDateKey) ?? 20 * 60 + 30,
        durationMinutes: 50,
        variant: "context",
        icon: FileText,
        surfaceClassName: "border-amber-400/30 bg-amber-500/12 text-amber-50",
        badge: language === "es" ? "Nota" : "Note",
      });
    }

    missingModules.forEach((module) => {
      items.push({
        id: `pending-${module.key}-${selectedDateKey}`,
        title: `${language === "es" ? "Pendiente" : "Pending"}: ${module.label}`,
        detail: language === "es" ? "Registro sugerido para completar el dia." : "Suggested slot to complete the day.",
        startMinutes: PENDING_TIME_MAP[module.key] ?? 12 * 60,
        durationMinutes: 40,
        variant: "pending",
        icon: CheckCircle2,
        href: module.href,
        surfaceClassName: "border-primary/45 bg-primary/10 text-primary-foreground/95",
        badge: language === "es" ? "Pendiente" : "Pending",
      });
    });

    return items.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      if (a.variant === b.variant) return a.title.localeCompare(b.title);
      if (a.variant === "pending") return 1;
      if (b.variant === "pending") return -1;
      return 0;
    });
  }, [dayLogs, language, missingModules, selectedBiofeedback, selectedDateKey, selectedDay, selectedNutrition, selectedNote, selectedSleepDay?.logs]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isTodaySelected = selectedDateKey === todayKey;
  const currentTimeOffset = (nowMinutes / 60) * TIMELINE_HOUR_HEIGHT;
  const timelineHours = Array.from({ length: 24 }, (_, hour) => hour);
  const activeTimelineItem = timelineItems.find((item) => item.id === selectedTimelineItemId) ?? timelineItems[0] ?? null;

  useEffect(() => {
    setSelectedTimelineItemId((current) => {
      if (current && timelineItems.some((item) => item.id === current)) return current;
      return timelineItems[0]?.id ?? null;
    });
  }, [timelineItems]);

  useEffect(() => {
    if (calendarView !== "day") return;
    const container = timelineScrollRef.current;
    if (!container) return;
    const firstItemOffset = timelineItems[0] ? (timelineItems[0].startMinutes / 60) * TIMELINE_HOUR_HEIGHT : 0;
    const liveNow = new Date();
    const liveOffset = ((liveNow.getHours() * 60 + liveNow.getMinutes()) / 60) * TIMELINE_HOUR_HEIGHT;
    const targetOffset = isTodaySelected ? liveOffset : firstItemOffset;
    const nextScrollTop = Math.max(0, targetOffset - container.clientHeight * 0.35);
    container.scrollTo({ top: nextScrollTop, behavior: "smooth" });
  }, [calendarView, isTodaySelected, selectedDateKey, timelineItems]);

  const refreshCalendar = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_logs"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_sleep"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_biofeedback"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_note"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
  ]);
  const saveNoteMutation = useMutation({
    mutationFn: () => upsertDailyNote({ userId: user?.id ?? null, date: fromDateKey(selectedDateKey), title: noteTitle.trim() || null, content: noteContent, isGuest, timeZone: timezone }),
    onSuccess: async () => { toast.success("Nota del dia guardada."); await refreshCalendar(); },
    onError: (error: any) => toast.error(error?.message || "No se pudo guardar la nota."),
  });

  const dayCellClasses = (day: CalendarDayData | undefined, inCurrentMonth: boolean) => {
    if (!day) return inCurrentMonth ? "bg-card" : "bg-muted/40";
    const intensity = [day.hasWater, day.hasWeight, day.hasSleep, day.hasBiofeedback, day.hasNote, day.hasNutrition, day.metWaterGoal, day.metSleepGoal].filter(Boolean).length;
    const heat = intensity <= 1 ? "bg-card" : intensity === 2 ? "bg-primary/10" : intensity === 3 ? "bg-primary/20" : "bg-primary/30";
    return `${heat} ${inCurrentMonth ? "" : "opacity-65"}`;
  };

  const selectDate = (dateKey: string) => { setSelectedDateKey(dateKey); setCurrentMonth(startOfMonth(fromDateKey(dateKey))); };
  const changeMonth = (offset: number) => { const nextMonth = startOfMonth(addMonths(currentMonth, offset)); setCurrentMonth(nextMonth); setSelectedDateKey(formatDateKey(nextMonth)); };
  const goToToday = () => { setCurrentMonth(startOfMonth(new Date())); setSelectedDateKey(todayKey); };

  const monthCalendarCard = (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="capitalize">{monthLabel}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground md:gap-2 md:text-xs">{weekdayLabels.map((label) => <div key={label}>{label}</div>)}</div>
        {isLoading ? <p className="text-sm text-muted-foreground">{t("calendar.loading")}</p> : (
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {visibleDays.map((dayDate) => {
              const key = formatDateKey(dayDate);
              const day = calendarData?.get(key);
              const inCurrentMonth = isSameMonth(dayDate, currentMonth);
              const isSelected = key === selectedDateKey;
              return (
                <button key={key} type="button" onClick={() => selectDate(key)} className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition md:min-h-24 md:p-2 ${dayCellClasses(day, inCurrentMonth)} ${isSelected ? "ring-2 ring-primary" : "hover:border-primary/60"}`}>
                  <div className="flex items-center justify-between"><span className="text-xs font-medium md:text-sm">{dayDate.getDate()}</span>{day?.metWaterGoal && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}</div>
                  <div className="mt-1.5 flex flex-wrap gap-0.5 text-[10px] md:mt-2 md:gap-1 md:text-xs">
                    {day?.hasWater && <Droplets className="h-3 w-3 text-primary" />}
                    {day?.hasWeight && <Scale className="h-3 w-3 text-muted-foreground" />}
                    {day?.hasSleep && <Moon className="h-3 w-3 text-indigo-500" />}
                    {day?.hasBiofeedback && <HeartPulse className="h-3 w-3 text-rose-500" />}
                    {day?.hasNote && <FileText className="h-3 w-3 text-amber-500" />}
                    {day?.hasNutrition && <UtensilsCrossed className="h-3 w-3 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const dayPanel = (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle>{language === "es" ? "Agenda del dia" : "Day timeline"}</CardTitle>
              <CardDescription className="capitalize">{selectedDateLabel}</CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 md:min-w-[18rem]">
              <div className="rounded-[16px] border px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{language === "es" ? "Bloques" : "Blocks"}</p>
                <p className="text-lg font-semibold">{timelineItems.filter((item) => item.variant !== "pending").length}</p>
              </div>
              <div className="rounded-[16px] border px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{language === "es" ? "Pendientes" : "Pending"}</p>
                <p className="text-lg font-semibold">{timelineItems.filter((item) => item.variant === "pending").length}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {selectedDay?.hasWeight ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Scale className="h-3.5 w-3.5" />{selectedDay.weightKg} kg</span> : null}
            {selectedDay?.hasWater ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Droplets className="h-3.5 w-3.5 text-primary" />{selectedDay.totalWaterMl} / {waterGoal.water_goal_ml} ml</span> : null}
            {selectedDay?.hasSleep ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Moon className="h-3.5 w-3.5 text-indigo-500" />{(selectedDay.totalSleepMinutes / 60).toFixed(1)} h</span> : null}
            {selectedDay?.hasNutrition ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><UtensilsCrossed className="h-3.5 w-3.5 text-emerald-500" />{selectedDay.nutritionCalories} kcal</span> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingModules.length > 0 ? (
            <div className="rounded-[18px] border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{language === "es" ? "Completar este dia" : "Complete this day"}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDateKey < todayKey
                      ? "Si olvidaste registrar algo, todavia puedes ubicarlo en su bloque sugerido."
                      : "Los bloques pendientes ya quedaron colocados en la timeline para que los cierres a tiempo."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingModules.map((module) => (
                    <Button key={module.key} asChild size="sm" variant="outline">
                      <Link to={module.href ?? "#"}>Registrar {module.label}</Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div ref={timelineScrollRef} className="relative max-h-[68vh] overflow-y-auto rounded-[22px] border bg-background/60">
            <div className="relative" style={{ height: `${TIMELINE_HOUR_HEIGHT * 24}px` }}>
              {timelineHours.map((hour) => (
                <div key={hour} className="absolute inset-x-0 flex border-t border-border/70" style={{ top: `${hour * TIMELINE_HOUR_HEIGHT}px`, height: `${TIMELINE_HOUR_HEIGHT}px` }}>
                  <div className="w-16 shrink-0 border-r border-border/70 px-2 pt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:w-20">
                    {getHourLabel(hour, locale)}
                  </div>
                  <div className="flex-1" />
                </div>
              ))}

              {isTodaySelected ? (
                <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: `${currentTimeOffset}px` }}>
                  <div className="ml-[3.55rem] h-3 w-3 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)] md:ml-[4.65rem]" />
                  <div className="h-[2px] flex-1 bg-red-500" />
                </div>
              ) : null}

              <div className="absolute inset-0 left-16 md:left-20">
                {timelineItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    {language === "es" ? "Aun no hay bloques para este dia. Registra algo o crea una nota para empezar a poblar la agenda." : "No blocks for this day yet. Log something or create a note to start building the day."}
                  </div>
                ) : (
                  timelineItems.map((item) => {
                    const Icon = item.icon;
                    const top = (item.startMinutes / 60) * TIMELINE_HOUR_HEIGHT;
                    const height = Math.max(44, (item.durationMinutes / 60) * TIMELINE_HOUR_HEIGHT);
                    const isActive = activeTimelineItem?.id === item.id;
                    const sharedProps = {
                      className: `absolute left-2 right-3 rounded-[18px] border px-3 py-2 text-left shadow-sm transition hover:border-primary/60 ${item.surfaceClassName} ${isActive ? "ring-2 ring-primary/70" : ""}`,
                      style: { top: `${top}px`, height: `${height}px` },
                    };
                    const innerContent = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </p>
                            <p className="line-clamp-2 text-xs text-white/78">{item.detail}</p>
                          </div>
                          {item.badge ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/78">{item.badge}</span> : null}
                        </div>
                      </>
                    );

                    if (item.href) {
                      return (
                        <Link key={item.id} to={item.href} onClick={() => setSelectedTimelineItemId(item.id)} {...sharedProps}>
                          {innerContent}
                        </Link>
                      );
                    }

                    return (
                      <button key={item.id} type="button" onClick={() => setSelectedTimelineItemId(item.id)} {...sharedProps}>
                        {innerContent}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Detalle del bloque" : "Block detail"}</CardTitle>
            <CardDescription>
              {activeTimelineItem
                ? getTimelineRangeLabel(activeTimelineItem.startMinutes, activeTimelineItem.durationMinutes, locale)
                : language === "es"
                  ? "Selecciona un bloque para ver su contexto."
                  : "Select a block to inspect its context."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTimelineItem ? (
              <>
                <div className={`rounded-[18px] border p-4 ${activeTimelineItem.surfaceClassName}`}>
                  <p className="text-sm font-semibold">{activeTimelineItem.title}</p>
                  <p className="mt-1 text-sm text-white/80">{activeTimelineItem.detail}</p>
                </div>
                {activeTimelineItem.variant === "pending" && activeTimelineItem.href ? (
                  <Button asChild className="w-full">
                    <Link to={activeTimelineItem.href}>{language === "es" ? "Abrir registro sugerido" : "Open suggested log"}</Link>
                  </Button>
                ) : null}
                {activeTimelineItem.id.startsWith("bio-") && selectedBiofeedback ? (
                  <div className="rounded-[18px] border p-4 text-sm text-muted-foreground">
                    {language === "es" ? "Energia" : "Energy"} {selectedBiofeedback.daily_energy}/10 | {language === "es" ? "Estres" : "Stress"} {selectedBiofeedback.perceived_stress}/10 | {language === "es" ? "Hambre" : "Hunger"} {selectedBiofeedback.hunger_level}/10
                  </div>
                ) : null}
                {activeTimelineItem.id.startsWith("weight-") && selectedDay?.weightKg !== null ? (
                  <div className="rounded-[18px] border p-4 text-sm text-muted-foreground">
                    {language === "es" ? "Peso actual para la fecha seleccionada." : "Current weight for the selected date."} {selectedDay.weightKg} kg
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{language === "es" ? "No hay detalle disponible todavia." : "No detail available yet."}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Nota del dia" : "Daily note"}</CardTitle>
            <CardDescription>
              {language === "es" ? "La nota se guarda en la fecha seleccionada y aparece como bloque en la timeline segun la hora en que la registres." : "The note is saved on the selected date and appears on the timeline using the time you save it."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Titulo opcional" className="min-h-[72px]" maxLength={120} />
            <Textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Observaciones tacticas del dia..." className="min-h-[160px]" />
            <Button onClick={() => saveNoteMutation.mutate()} disabled={saveNoteMutation.isPending || !noteContent.trim()} className="w-full sm:w-auto">
              {saveNoteMutation.isPending ? (language === "es" ? "Guardando..." : "Saving...") : language === "es" ? "Guardar nota" : "Save note"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const viewTabs = (
    <div className="rounded-[18px] border bg-card/90 p-1">
      <div className="grid grid-cols-3 gap-1">
        {[{ key: "agenda", label: "Agenda" }, { key: "day", label: language === "es" ? "Dia" : "Day" }, { key: "month", label: language === "es" ? "Mes" : "Month" }].map((view) => (
          <button
            key={view.key}
            type="button"
            onClick={() => setCalendarView(view.key as "agenda" | "day" | "month")}
            className={`rounded-[14px] px-3 py-2 text-sm font-medium transition ${calendarView === view.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );

  const agendaPanel = (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{monthLabel}</CardTitle>
        <CardDescription>{language === "es" ? "Historial del mes por dia." : "Month history by day."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {agendaDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">{language === "es" ? "Sin actividad en este mes." : "No activity this month."}</p>
        ) : (
          agendaDays.map((day) => {
            const date = fromDateKey(day.dateKey);
            const isSelected = day.dateKey === selectedDateKey;
            const notePreview = isSelected && selectedNote?.content ? selectedNote.title?.trim() || selectedNote.content.trim().slice(0, 72) : day.hasNote ? (language === "es" ? "Nota diaria guardada" : "Daily note saved") : null;
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => { selectDate(day.dateKey); setCalendarView("day"); }}
                className={`block w-full rounded-[18px] border p-4 text-left transition ${isSelected ? "border-primary/60 bg-primary/5" : "bg-card"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-[3rem] rounded-[14px] border px-2 py-2 text-center">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { weekday: "short" })}</p>
                      <p className="text-xl font-semibold">{date.getDate()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold capitalize">{date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "long", day: "numeric" })}</p>
                      <p className="text-sm text-muted-foreground">{getTrackedItemsCount(day)}/6 {language === "es" ? "bloques registrados" : "tracked blocks"}</p>
                      {notePreview ? <p className="line-clamp-2 text-xs text-muted-foreground">{notePreview}</p> : null}
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {day.hasWater ? <span className="inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-primary" />{day.totalWaterMl} ml</span> : null}
                  {day.hasWeight ? <span className="inline-flex items-center gap-1"><Scale className="h-3.5 w-3.5" />{day.weightKg} kg</span> : null}
                  {day.hasSleep ? <span className="inline-flex items-center gap-1"><Moon className="h-3.5 w-3.5 text-indigo-500" />{(day.totalSleepMinutes / 60).toFixed(1)}h</span> : null}
                  {day.hasBiofeedback ? <span className="inline-flex items-center gap-1"><HeartPulse className="h-3.5 w-3.5 text-rose-500" />Biofeedback</span> : null}
                  {day.hasNutrition ? <span className="inline-flex items-center gap-1"><UtensilsCrossed className="h-3.5 w-3.5 text-emerald-500" />{day.nutritionCalories} kcal</span> : null}
                  {day.hasNote ? <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-amber-500" />{language === "es" ? "Nota" : "Note"}</span> : null}
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-7xl space-y-5 py-6 md:space-y-6 md:py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-2xl font-bold md:text-3xl">{t("calendar.title")}</h1><p className="text-sm text-muted-foreground">{t("calendar.description")}</p></div>
        <div className="hidden gap-2 md:flex">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}><ChevronLeft className="mr-1 h-4 w-4" />{t("calendar.prevMonth")}</Button>
          <Button variant="outline" size="sm" onClick={goToToday}>{t("calendar.today")}</Button>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>{t("calendar.nextMonth")}<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {viewTabs}
        <Card><CardContent className="flex items-center justify-between gap-3 pt-5"><Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button><div className="min-w-0 text-center"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{calendarView === "day" ? (language === "es" ? "Dia seleccionado" : "Selected day") : t("calendar.title")}</p><p className="truncate text-lg font-semibold capitalize">{calendarView === "day" ? selectedDateLabel : monthLabel}</p></div><Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button></CardContent><CardContent className="pt-0"><Button className="w-full" variant="outline" size="sm" onClick={goToToday}>{t("calendar.today")}</Button></CardContent></Card>
        {calendarView === "agenda" && agendaPanel}
        {calendarView === "day" && dayPanel}
        {calendarView === "month" && <div className="space-y-4">{monthCalendarCard}{dayPanel}</div>}
      </div>

      <div className="hidden gap-4 md:flex md:flex-col">
        <div className="max-w-sm">{viewTabs}</div>
        {calendarView === "agenda" && <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">{agendaPanel}{dayPanel}</div>}
        {calendarView === "day" && <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">{dayPanel}{monthCalendarCard}</div>}
        {calendarView === "month" && <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.8fr_1fr]">{monthCalendarCard}{dayPanel}</div>}
      </div>
    </div>
  );
};

export default Calendar;
