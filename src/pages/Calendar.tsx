import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Droplets, FileText, HeartPulse, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { addWaterIntake, getWaterGoal, getWaterLogsByDate, getWaterRangeTotals, type WaterLog } from "@/services/waterIntake";
import { addSleepLog, getSleepDay, getSleepGoal, getSleepRangeTotals } from "@/services/sleep";
import { getBiofeedbackRange, getDailyBiofeedback } from "@/services/dailyBiofeedback";
import { getDailyNote, listDailyNotesByRange, upsertDailyNote } from "@/services/dailyNotes";
import { getNutritionDaySummary, getNutritionRangeSummary } from "@/services/nutrition";
import { getGuestBodyMetrics, listBodyMetricsByRange, saveGuestBodyMetrics, upsertBodyMetric, type BodyMetricEntry } from "@/services/bodyMetrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");
const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);

const Calendar = () => {
  const { user, isGuest, profile } = useAuth();
  const { language, t } = usePreferences();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [mobileView, setMobileView] = useState<"agenda" | "day" | "month">("agenda");
  const [quickWaterMl, setQuickWaterMl] = useState("");
  const [quickWeightKg, setQuickWeightKg] = useState("");
  const [quickSleepMinutes, setQuickSleepMinutes] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const timezone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const todayKey = getDateKeyForTimezone(new Date(), timezone);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const profileKey = [profile?.weight ?? "", profile?.height ?? "", profile?.goal_type ?? ""].join("|");

  useEffect(() => {
    if (!isMobile) setMobileView("agenda");
  }, [isMobile]);

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

  const selectedDay = calendarData?.get(selectedDateKey);
  const monthLabel = currentMonth.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "long", year: "numeric" });
  const selectedDateLabel = fromDateKey(selectedDateKey).toLocaleDateString(language === "es" ? "es-ES" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const weekdayLabels = Array.from({ length: 7 }).map((_, idx) => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), idx).toLocaleDateString(language === "es" ? "es-ES" : "en-US", { weekday: "short" }));
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
    if (!selectedDay.hasWeight) modules.push({ key: "weight", label: "Peso", target: "quick-weight" });
    if (!selectedDay.hasWater) modules.push({ key: "water", label: "Agua", target: "quick-water" });
    if (!selectedDay.hasSleep) modules.push({ key: "sleep", label: "Sueno", target: "quick-sleep" });
    if (!selectedDay.hasBiofeedback) modules.push({ key: "biofeedback", label: "Biofeedback", href: `/biofeedback?date=${selectedDateKey}` });
    if (!selectedDay.hasNutrition) modules.push({ key: "nutrition", label: "Alimentacion", href: `/nutrition?date=${selectedDateKey}` });
    return modules;
  }, [selectedDay, selectedDateKey]);

  const scrollToQuickAdd = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const refreshCalendar = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_logs"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_sleep"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_note"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
  ]);

  const addWaterMutation = useMutation({
    mutationFn: () => addWaterIntake({ userId: user?.id ?? null, consumed_ml: Number(quickWaterMl), date: new Date(`${selectedDateKey}T12:00:00`), timeZone: timezone, isGuest }),
    onSuccess: async () => { setQuickWaterMl(""); toast.success(t("calendar.quickAdd.savedWater")); await refreshCalendar(); },
    onError: (error: any) => toast.error(error?.message || t("calendar.quickAdd.saveError")),
  });
  const addWeightMutation = useMutation({
    mutationFn: async () => {
      const parsedWeight = Number(quickWeightKg);
      if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 400) throw new Error("El peso debe estar entre 20 y 400 kg.");
      if (isGuest) {
        const entries = getGuestBodyMetrics().filter((item) => item.measured_at !== selectedDateKey);
        const newEntry: BodyMetricEntry = { id: crypto.randomUUID(), user_id: "guest", measured_at: selectedDateKey, weight_kg: parsedWeight, notes: null, created_at: new Date().toISOString() };
        entries.push(newEntry);
        entries.sort((a, b) => b.measured_at.localeCompare(a.measured_at));
        saveGuestBodyMetrics(entries);
        return;
      }
      await upsertBodyMetric({ userId: user?.id ?? null, isGuest: false, measured_at: selectedDateKey, weight_kg: parsedWeight, notes: null });
    },
    onSuccess: async () => { setQuickWeightKg(""); toast.success(t("calendar.quickAdd.savedWeight")); await refreshCalendar(); },
    onError: (error: any) => toast.error(error?.message || t("calendar.quickAdd.saveError")),
  });
  const addSleepMutation = useMutation({
    mutationFn: () => addSleepLog({ userId: user?.id ?? null, date: fromDateKey(selectedDateKey), total_minutes: Number(quickSleepMinutes), isGuest, timeZone: timezone }),
    onSuccess: async () => { setQuickSleepMinutes(""); toast.success(t("calendar.quickAdd.savedSleep")); await refreshCalendar(); },
    onError: (error: any) => toast.error(error?.message || t("calendar.quickAdd.saveError")),
  });
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
      {missingModules.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Completar este dia</CardTitle>
            <CardDescription>{selectedDateKey < todayKey ? "Si olvidaste registrar algo, puedes completar este dia ahora mismo." : "Todavia faltan registros para cerrar este dia."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Faltan: {missingModules.map((module) => module.label).join(", ")}.</p>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              {missingModules.map((module) => module.href ? (
                <Button key={module.key} asChild size="sm" variant="outline" className="w-full sm:w-auto"><Link to={module.href}>Registrar {module.label}</Link></Button>
              ) : (
                <Button key={module.key} size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => scrollToQuickAdd(module.target!)}>Registrar {module.label}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("calendar.summaryTitle")}</CardTitle><CardDescription className="capitalize">{selectedDateLabel}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {!selectedDay ? <p className="text-sm text-muted-foreground">{t("calendar.summaryEmpty")}</p> : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 rounded-md border p-3"><p className="text-sm text-muted-foreground">Peso</p><p className="text-lg font-semibold">{selectedDay.weightKg !== null ? `${selectedDay.weightKg} kg` : "Sin registro"}</p></div>
                <div className="space-y-2 rounded-md border p-3"><p className="text-sm text-muted-foreground">Agua</p><p className="text-lg font-semibold">{selectedDay.totalWaterMl > 0 ? `${selectedDay.totalWaterMl} / ${waterGoal.water_goal_ml} ml` : "Sin registro"}</p></div>
              </div>
              <div className="space-y-2 rounded-md border p-3"><p className="text-sm text-muted-foreground">Sueno</p><p className="text-lg font-semibold">{selectedDay.totalSleepMinutes > 0 ? `${(selectedDay.totalSleepMinutes / 60).toFixed(1)}h` : "Sin registro"}</p></div>
              <div className="space-y-2 rounded-md border p-3"><p className="text-sm text-muted-foreground">Biofeedback</p><p className="text-sm text-muted-foreground">{selectedBiofeedback ? `Energia ${selectedBiofeedback.daily_energy}/10 | Estres ${selectedBiofeedback.perceived_stress}/10` : "Sin check-in para este dia."}</p></div>
              <div className="space-y-2 rounded-md border p-3"><p className="text-sm text-muted-foreground">Alimentacion</p><p className="text-sm text-muted-foreground">{selectedNutrition?.totals?.calories ? `${selectedNutrition.totals.calories} / ${selectedNutrition.goals.calorie_goal} kcal` : "Sin registros de alimentacion."}</p></div>
              <div className="space-y-2 rounded-md border p-3"><p className="text-sm text-muted-foreground">Logs de agua</p>{dayLogs.length === 0 ? <p className="text-sm text-muted-foreground">{t("calendar.summary.noLogs")}</p> : <div className="space-y-2">{dayLogs.map((log: WaterLog) => <div key={log.id} className="flex items-center justify-between text-sm"><span>{log.consumed_ml} ml</span><span className="text-muted-foreground">{new Date(log.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div>}</div>
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Notas diarias</p><span className="text-xs text-muted-foreground">{selectedNote ? "Con nota" : "Sin nota"}</span></div>
                <Input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Titulo" maxLength={120} />
                <Textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Observaciones tacticas del dia..." className="min-h-24" />
                <Button onClick={() => saveNoteMutation.mutate()} disabled={saveNoteMutation.isPending || !noteContent.trim()}>Guardar nota</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card id="calendar-quick-add">
        <CardHeader><CardTitle>{t("calendar.quickAddTitle")}</CardTitle><CardDescription>Los registros rapidos se guardaran en {selectedDateKey}.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div id="quick-water" className="space-y-2"><label className="flex items-center gap-2 text-sm"><Droplets className="h-4 w-4" />{t("calendar.quickAdd.water")}</label><div className="flex flex-col gap-2 sm:flex-row"><Input type="number" value={quickWaterMl} onChange={(e) => setQuickWaterMl(e.target.value)} placeholder={t("calendar.quickAdd.waterPlaceholder")} /><Button className="w-full sm:w-auto" onClick={() => addWaterMutation.mutate()} disabled={addWaterMutation.isPending}>{t("calendar.quickAdd.addWater")}</Button></div></div>
          <div id="quick-weight" className="space-y-2"><label className="flex items-center gap-2 text-sm"><Scale className="h-4 w-4" />{t("calendar.quickAdd.weight")}</label><div className="flex flex-col gap-2 sm:flex-row"><Input type="number" value={quickWeightKg} onChange={(e) => setQuickWeightKg(e.target.value)} step="0.1" placeholder={t("calendar.quickAdd.weightPlaceholder")} /><Button className="w-full sm:w-auto" onClick={() => addWeightMutation.mutate()} disabled={addWeightMutation.isPending}>{t("calendar.quickAdd.addWeight")}</Button></div></div>
          <div id="quick-sleep" className="space-y-2"><label className="flex items-center gap-2 text-sm"><Moon className="h-4 w-4" />{t("calendar.quickAdd.sleep")}</label><div className="flex flex-col gap-2 sm:flex-row"><Input type="number" value={quickSleepMinutes} onChange={(e) => setQuickSleepMinutes(e.target.value)} placeholder={t("calendar.quickAdd.sleepPlaceholder")} /><Button className="w-full sm:w-auto" onClick={() => addSleepMutation.mutate()} disabled={addSleepMutation.isPending}>{t("calendar.quickAdd.addSleep")}</Button></div></div>
        </CardContent>
      </Card>
    </div>
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
        <div className="rounded-[18px] border bg-card/90 p-1"><div className="grid grid-cols-3 gap-1">{[{ key: "agenda", label: "Agenda" }, { key: "day", label: language === "es" ? "Dia" : "Day" }, { key: "month", label: language === "es" ? "Mes" : "Month" }].map((view) => <button key={view.key} type="button" onClick={() => setMobileView(view.key as "agenda" | "day" | "month")} className={`rounded-[14px] px-3 py-2 text-sm font-medium transition ${mobileView === view.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{view.label}</button>)}</div></div>
        <Card><CardContent className="flex items-center justify-between gap-3 pt-5"><Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button><div className="min-w-0 text-center"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{mobileView === "day" ? (language === "es" ? "Dia seleccionado" : "Selected day") : t("calendar.title")}</p><p className="truncate text-lg font-semibold capitalize">{mobileView === "day" ? selectedDateLabel : monthLabel}</p></div><Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button></CardContent><CardContent className="pt-0"><Button className="w-full" variant="outline" size="sm" onClick={goToToday}>{t("calendar.today")}</Button></CardContent></Card>
        {mobileView === "agenda" && (
          <div className="space-y-3">
            {agendaDays.length === 0 ? <Card><CardContent className="pt-5 text-sm text-muted-foreground">{language === "es" ? "Sin actividad en este mes." : "No activity this month."}</CardContent></Card> : agendaDays.map((day) => {
              const date = fromDateKey(day.dateKey);
              const isSelected = day.dateKey === selectedDateKey;
              const notePreview = isSelected && selectedNote?.content ? selectedNote.title?.trim() || selectedNote.content.trim().slice(0, 72) : day.hasNote ? (language === "es" ? "Nota diaria guardada" : "Daily note saved") : null;
              return (
                <button key={day.dateKey} type="button" onClick={() => { selectDate(day.dateKey); setMobileView("day"); }} className={`block w-full rounded-[18px] border p-4 text-left transition ${isSelected ? "border-primary/60 bg-primary/5" : "bg-card"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-[3rem] rounded-[14px] border px-2 py-2 text-center"><p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { weekday: "short" })}</p><p className="text-xl font-semibold">{date.getDate()}</p></div>
                      <div className="space-y-1"><p className="text-sm font-semibold capitalize">{date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "long", day: "numeric" })}</p><p className="text-sm text-muted-foreground">{getTrackedItemsCount(day)}/6 {language === "es" ? "bloques registrados" : "tracked blocks"}</p>{notePreview ? <p className="line-clamp-2 text-xs text-muted-foreground">{notePreview}</p> : null}</div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">{day.hasWater ? <span className="inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-primary" />{day.totalWaterMl} ml</span> : null}{day.hasWeight ? <span className="inline-flex items-center gap-1"><Scale className="h-3.5 w-3.5" />{day.weightKg} kg</span> : null}{day.hasSleep ? <span className="inline-flex items-center gap-1"><Moon className="h-3.5 w-3.5 text-indigo-500" />{(day.totalSleepMinutes / 60).toFixed(1)}h</span> : null}{day.hasBiofeedback ? <span className="inline-flex items-center gap-1"><HeartPulse className="h-3.5 w-3.5 text-rose-500" />Biofeedback</span> : null}{day.hasNutrition ? <span className="inline-flex items-center gap-1"><UtensilsCrossed className="h-3.5 w-3.5 text-emerald-500" />{day.nutritionCalories} kcal</span> : null}{day.hasNote ? <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-amber-500" />{language === "es" ? "Nota" : "Note"}</span> : null}</div>
                </button>
              );
            })}
          </div>
        )}
        {mobileView === "day" && dayPanel}
        {mobileView === "month" && <div className="space-y-4">{monthCalendarCard}{dayPanel}</div>}
      </div>

      <div className="hidden grid-cols-1 gap-6 md:grid lg:grid-cols-[1.8fr_1fr]">{monthCalendarCard}{dayPanel}</div>
    </div>
  );
};

export default Calendar;
