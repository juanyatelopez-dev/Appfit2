import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Droplets, FileText, HeartPulse, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getGuestBodyMetrics, listBodyMetricsByRange, type BodyMetricEntry } from "@/services/bodyMetrics";
import { getBiofeedbackRange, getDailyBiofeedback } from "@/services/dailyBiofeedback";
import { getDailyNote, listDailyNotesByRange, upsertDailyNote } from "@/services/dailyNotes";
import { getNutritionDaySummary, getNutritionRangeSummary } from "@/modules/nutrition/services";
import { getSleepDay, getSleepGoal, getSleepRangeTotals, type SleepLog } from "@/services/sleep";
import { getWaterGoal, getWaterLogsByDate, getWaterRangeTotals, type WaterLog } from "@/services/waterIntake";
import { getErrorMessage } from "@/lib/errors";

export type CalendarDayData = {
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

export type TimelineItem = {
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
  accentClassName: string;
};

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");
const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);
export const TIMELINE_HOUR_HEIGHT = 72;
const DAY_TOTAL_MINUTES = 24 * 60;

const clampMinutes = (value: number) => Math.min(DAY_TOTAL_MINUTES, Math.max(0, Math.round(value)));

const getMinutesForTimestamp = (value: string | null | undefined, dateKey: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const start = fromDateKey(dateKey).getTime();
  return clampMinutes((parsed.getTime() - start) / 60000);
};

export const getTimelineRangeLabel = (startMinutes: number, durationMinutes: number, locale: string) => {
  const start = new Date(fromDateKey("2026-01-01").getTime() + startMinutes * 60000);
  const end = new Date(fromDateKey("2026-01-01").getTime() + Math.min(DAY_TOTAL_MINUTES, startMinutes + durationMinutes) * 60000);
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

export const getHourLabel = (hour: number, locale: string) =>
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

export function useCalendarPageState() {
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

  const timezone = profile?.timezone || DEFAULT_WATER_TIMEZONE;
  const todayKey = getDateKeyForTimezone(new Date(), timezone);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const profileKey = [profile?.weight ?? "", profile?.height ?? "", profile?.goal_type ?? ""].join("|");
  const queryEnabled = Boolean(user?.id) || isGuest;

  const { data: waterGoal = { water_goal_ml: 2000 } } = useQuery({
    queryKey: ["water_goal", user?.id, isGuest],
    queryFn: () => getWaterGoal(user?.id ?? null, { isGuest }),
    enabled: queryEnabled,
  });

  const { data: sleepGoal = { sleep_goal_minutes: 480 } } = useQuery({
    queryKey: ["sleep_goal", user?.id, isGuest],
    queryFn: () => getSleepGoal(user?.id ?? null, { isGuest }),
    enabled: queryEnabled,
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
        const nutritionDays = nutritionRange?.days ?? [];
        const nutritionMap = new Map(nutritionDays.map((row) => [row.date_key, Number(row.calories || 0)]));
        const weightMap = new Map<string, number>();

        weightEntries.forEach((entry: BodyMetricEntry) => {
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
    enabled: queryEnabled,
  });

  const { data: dayLogs = [] } = useQuery({
    queryKey: ["calendar_day_logs", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getWaterLogsByDate(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: queryEnabled,
  });

  const { data: selectedSleepDay } = useQuery({
    queryKey: ["calendar_day_sleep", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getSleepDay(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: queryEnabled,
  });

  const { data: selectedBiofeedback } = useQuery({
    queryKey: ["calendar_day_biofeedback", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getDailyBiofeedback(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: queryEnabled,
  });

  const { data: selectedNote } = useQuery({
    queryKey: ["calendar_day_note", user?.id, selectedDateKey, timezone, isGuest],
    queryFn: () => getDailyNote(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone }),
    enabled: queryEnabled,
  });

  const { data: selectedNutrition } = useQuery({
    queryKey: ["calendar_day_nutrition", user?.id, selectedDateKey, timezone, isGuest, profileKey],
    queryFn: () =>
      getNutritionDaySummary(user?.id ?? null, fromDateKey(selectedDateKey), { isGuest, timeZone: timezone, profile }).catch(() => null),
    enabled: queryEnabled,
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
  const weekdayLabels = Array.from({ length: 7 }).map((_, idx) =>
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), idx).toLocaleDateString(locale, { weekday: "short" }),
  );

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
    const modules: Array<{ key: string; label: string; href?: string }> = [];
    if (!selectedDay.hasWeight) modules.push({ key: "weight", label: "Peso", href: `/weight?date=${selectedDateKey}` });
    if (!selectedDay.hasWater) modules.push({ key: "water", label: "Agua", href: `/water?date=${selectedDateKey}` });
    if (!selectedDay.hasSleep) modules.push({ key: "sleep", label: "Sueno", href: `/sleep?date=${selectedDateKey}` });
    if (!selectedDay.hasBiofeedback) modules.push({ key: "biofeedback", label: "Biofeedback", href: `/biofeedback?date=${selectedDateKey}` });
    if (!selectedDay.hasNutrition) modules.push({ key: "nutrition", label: "Alimentacion", href: `/nutrition?date=${selectedDateKey}` });
    return modules;
  }, [selectedDay, selectedDateKey]);

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const mealLabels: Record<string, string> =
      language === "es"
        ? { breakfast: "Desayuno", lunch: "Almuerzo", dinner: "Cena", snack: "Snack" }
        : { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

    dayLogs
      .slice()
      .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
      .forEach((log: WaterLog) => {
        const waterMinutes = getMinutesForTimestamp(log.logged_at, selectedDateKey);
        if (waterMinutes === null) return;
        items.push({
          id: `water-${log.id}`,
          title: language === "es" ? "Agua" : "Water",
          detail: `${log.consumed_ml} ml`,
          startMinutes: waterMinutes,
          durationMinutes: 25,
          variant: "logged",
          icon: Droplets,
          surfaceClassName: "border-cyan-400/55 bg-[#071824] text-white shadow-[0_10px_24px_rgba(6,25,39,0.42)]",
          accentClassName: "bg-cyan-400",
          badge: `${log.consumed_ml} ml`,
        });
      });

    (selectedSleepDay?.logs ?? [])
      .slice()
      .sort((a: SleepLog, b: SleepLog) => a.created_at.localeCompare(b.created_at))
      .forEach((log: SleepLog, index: number) => {
        if (!log.sleep_start && !log.sleep_end) return;
        const placement = getSleepTimelinePlacement(log, selectedDateKey);
        items.push({
          id: `sleep-${log.id ?? index}`,
          title: language === "es" ? "Sueno" : "Sleep",
          detail: log.notes?.trim() || `${(Number(log.total_minutes || 0) / 60).toFixed(1)} h`,
          startMinutes: placement.startMinutes,
          durationMinutes: placement.durationMinutes,
          variant: "logged",
          icon: Moon,
          surfaceClassName: "border-indigo-400/55 bg-[#101527] text-white shadow-[0_10px_24px_rgba(15,23,42,0.45)]",
          accentClassName: "bg-indigo-400",
          badge: `${(Number(log.total_minutes || 0) / 60).toFixed(1)} h`,
        });
      });

    if (selectedBiofeedback) {
      const bioMinutes = getMinutesForTimestamp(selectedBiofeedback.created_at, selectedDateKey);
      if (bioMinutes !== null) {
        items.push({
          id: `bio-${selectedBiofeedback.id}`,
          title: "Biofeedback",
          detail: selectedBiofeedback.notes?.trim() || `${language === "es" ? "Energia" : "Energy"} ${selectedBiofeedback.daily_energy}/10`,
          startMinutes: bioMinutes,
          durationMinutes: 35,
          variant: "context",
          icon: HeartPulse,
          surfaceClassName: "border-rose-400/55 bg-[#1b1020] text-white shadow-[0_10px_24px_rgba(31,10,24,0.45)]",
          accentClassName: "bg-rose-400",
          badge: `${selectedBiofeedback.daily_energy}/10`,
        });
      }
    }

    if (selectedNutrition?.groups) {
      Object.entries(selectedNutrition.groups).forEach(([mealKey, entries]) => {
        if (!entries.length) return;
        const normalizedMealKey = mealKey as keyof typeof selectedNutrition.groups;
        const mealTotals = selectedNutrition.mealTotals?.[normalizedMealKey];
        const firstEntryMinutes = getMinutesForTimestamp(entries[0]?.created_at, selectedDateKey);
        if (firstEntryMinutes === null) return;
        items.push({
          id: `meal-${normalizedMealKey}-${selectedDateKey}`,
          title: mealLabels[normalizedMealKey],
          detail: mealTotals?.calories
            ? `${mealTotals.calories} kcal | ${entries.length} ${language === "es" ? "registros" : "entries"}`
            : `${entries.length} ${language === "es" ? "registros" : "entries"}`,
          startMinutes: firstEntryMinutes,
          durationMinutes: Math.max(40, entries.length * 18),
          variant: "logged",
          icon: UtensilsCrossed,
          surfaceClassName: "border-emerald-400/55 bg-[#0c1b16] text-white shadow-[0_10px_24px_rgba(8,28,22,0.45)]",
          accentClassName: "bg-emerald-400",
          badge: mealTotals?.calories ? `${mealTotals.calories} kcal` : undefined,
        });
      });
    }

    if (selectedNote) {
      const noteMinutes = getMinutesForTimestamp(selectedNote.created_at, selectedDateKey);
      if (noteMinutes !== null) {
        items.push({
          id: `note-${selectedNote.id}`,
          title: selectedNote.title?.trim() || (language === "es" ? "Nota diaria" : "Daily note"),
          detail: selectedNote.content,
          startMinutes: noteMinutes,
          durationMinutes: 50,
          variant: "context",
          icon: FileText,
          surfaceClassName: "border-amber-400/60 bg-[#1d1608] text-white shadow-[0_10px_24px_rgba(36,27,8,0.48)]",
          accentClassName: "bg-amber-400",
          badge: language === "es" ? "Nota" : "Note",
        });
      }
    }

    return items.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.title.localeCompare(b.title);
    });
  }, [dayLogs, language, selectedBiofeedback, selectedDateKey, selectedNutrition, selectedNote, selectedSleepDay?.logs]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isTodaySelected = selectedDateKey === todayKey;
  const timelineHours = Array.from({ length: 24 }, (_, hour) => hour);

  const hourBuckets = useMemo(
    () =>
      timelineHours.map((hour) => ({
        hour,
        items: timelineItems.filter((item) => Math.floor(item.startMinutes / 60) === hour),
      })),
    [timelineHours, timelineItems],
  );

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
    const targetHour = isTodaySelected ? now.getHours() : timelineItems[0] ? Math.floor(timelineItems[0].startMinutes / 60) : 0;
    const targetOffset = targetHour * TIMELINE_HOUR_HEIGHT;
    const nextScrollTop = Math.max(0, targetOffset - container.clientHeight * 0.35);
    container.scrollTo({ top: nextScrollTop, behavior: "smooth" });
  }, [calendarView, isTodaySelected, now, selectedDateKey, timelineItems]);

  const refreshCalendar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_logs"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_sleep"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_biofeedback"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_note"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
    ]);

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
      await refreshCalendar();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "No se pudo guardar la nota.")),
  });

  const dayCellClasses = (day: CalendarDayData | undefined, inCurrentMonth: boolean) => {
    if (!day) return inCurrentMonth ? "bg-card" : "bg-muted/40";
    const intensity = [day.hasWater, day.hasWeight, day.hasSleep, day.hasBiofeedback, day.hasNote, day.hasNutrition, day.metWaterGoal, day.metSleepGoal].filter(Boolean).length;
    const heat = intensity <= 1 ? "bg-card" : intensity === 2 ? "bg-primary/10" : intensity === 3 ? "bg-primary/20" : "bg-primary/30";
    return `${heat} ${inCurrentMonth ? "" : "opacity-65"}`;
  };

  const selectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setCurrentMonth(startOfMonth(fromDateKey(dateKey)));
  };

  const changeMonth = (offset: number) => {
    const nextMonth = startOfMonth(addMonths(currentMonth, offset));
    setCurrentMonth(nextMonth);
    setSelectedDateKey(formatDateKey(nextMonth));
  };

  const goToToday = () => {
    setCurrentMonth(startOfMonth(new Date()));
    setSelectedDateKey(todayKey);
  };

  return {
    language,
    t,
    currentMonth,
    selectedDateKey,
    calendarView,
    setCalendarView,
    noteTitle,
    setNoteTitle,
    noteContent,
    setNoteContent,
    selectedTimelineItemId,
    setSelectedTimelineItemId,
    timelineScrollRef,
    todayKey,
    monthLabel,
    selectedDateLabel,
    weekdayLabels,
    visibleDays,
    calendarData,
    isLoading,
    selectedDay,
    agendaDays,
    getTrackedItemsCount,
    missingModules,
    timelineItems,
    now,
    nowMinutes,
    isTodaySelected,
    hourBuckets,
    activeTimelineItem,
    waterGoal,
    selectedNote,
    selectedBiofeedback,
    saveNoteMutation,
    dayCellClasses,
    selectDate,
    changeMonth,
    goToToday,
    locale,
    isSameMonth,
    formatDateKey,
    fromDateKey,
    getTimelineRangeLabel,
    getHourLabel,
  };
}
