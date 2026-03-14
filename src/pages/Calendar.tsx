import { CheckCircle2, ChevronLeft, ChevronRight, Droplets, FileText, HeartPulse, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

import { AppPageIntro } from "@/components/layout/AppPageIntro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TIMELINE_HOUR_HEIGHT, useCalendarPageState } from "@/pages/calendar/useCalendarPageState";

const Calendar = () => {
  const {
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
  } = useCalendarPageState();

  const monthCalendarCard = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="capitalize">{monthLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground md:gap-2 md:text-xs">
          {weekdayLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("calendar.loading")}</p>
        ) : (
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {visibleDays.map((dayDate) => {
              const key = formatDateKey(dayDate);
              const day = calendarData?.get(key);
              const inCurrentMonth = isSameMonth(dayDate, currentMonth);
              const isSelected = key === selectedDateKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDate(key)}
                  className={`min-h-[4.5rem] rounded-lg border p-1.5 text-left transition md:min-h-24 md:p-2 ${dayCellClasses(day, inCurrentMonth)} ${isSelected ? "ring-2 ring-primary" : "hover:border-primary/60"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium md:text-sm">{dayDate.getDate()}</span>
                    {day?.metWaterGoal ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-0.5 text-[10px] md:mt-2 md:gap-1 md:text-xs">
                    {day?.hasWater ? <Droplets className="h-3 w-3 text-primary" /> : null}
                    {day?.hasWeight ? <Scale className="h-3 w-3 text-muted-foreground" /> : null}
                    {day?.hasSleep ? <Moon className="h-3 w-3 text-indigo-500" /> : null}
                    {day?.hasBiofeedback ? <HeartPulse className="h-3 w-3 text-rose-500" /> : null}
                    {day?.hasNote ? <FileText className="h-3 w-3 text-amber-500" /> : null}
                    {day?.hasNutrition ? <UtensilsCrossed className="h-3 w-3 text-emerald-400" /> : null}
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
              <CardTitle>{language === "es" ? "Timeline del dia" : "Day timeline"}</CardTitle>
              <CardDescription className="capitalize">{selectedDateLabel}</CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 md:min-w-[18rem]">
              <div className="rounded-[16px] border px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{language === "es" ? "Bloques" : "Blocks"}</p>
                <p className="text-lg font-semibold">{timelineItems.length}</p>
              </div>
              <div className="rounded-[16px] border px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{language === "es" ? "Pendientes" : "Pending"}</p>
                <p className="text-lg font-semibold">{missingModules.length}</p>
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
                      ? "Estas acciones siguen pendientes y aun no aparecen en la timeline porque no tienen hora real."
                      : "Las acciones pendientes se gestionan aparte y solo entran a la timeline cuando tengan una hora real."}
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

          <div ref={timelineScrollRef} className="max-h-[68vh] overflow-y-auto rounded-[22px] border bg-background/60">
            {hourBuckets.every((bucket) => bucket.items.length === 0) ? (
              <div className="flex min-h-[22rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {language === "es" ? "Aun no hay bloques para este dia. Registra algo o crea una nota para empezar a poblar la agenda." : "No blocks for this day yet. Log something or create a note to start building the day."}
              </div>
            ) : (
              hourBuckets.map(({ hour, items }) => {
                const isCurrentHour = isTodaySelected && now.getHours() === hour;
                const currentMinuteOffset = ((nowMinutes % 60) / 60) * TIMELINE_HOUR_HEIGHT;

                return (
                  <div key={hour} className="relative flex border-t border-border/70 first:border-t-0">
                    <div className="w-16 shrink-0 border-r border-border/70 px-2 pt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:w-20">
                      {getHourLabel(hour, locale)}
                    </div>
                    <div className="relative min-h-[72px] flex-1 px-3 py-2">
                      {isCurrentHour ? (
                        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: `${currentMinuteOffset}px` }}>
                          <div className="ml-1.5 h-3 w-3 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" />
                          <div className="h-[2px] flex-1 bg-red-500" />
                        </div>
                      ) : null}

                      {items.length === 0 ? (
                        <div className="h-[56px]" />
                      ) : (
                        <div className="space-y-2">
                          {items.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTimelineItem?.id === item.id;
                            const sharedProps = {
                              className: `w-full rounded-[18px] border px-3 py-3 text-left shadow-sm transition hover:border-primary/60 ${item.surfaceClassName} ${isActive ? "ring-2 ring-primary/70" : ""}`,
                            };
                            const innerContent = (
                              <div className="flex items-start gap-3">
                                <span className={`mt-0.5 h-12 w-1.5 shrink-0 rounded-full ${item.accentClassName}`} />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                                      <Icon className="h-4 w-4 shrink-0" />
                                      <span className="truncate">{item.title}</span>
                                    </p>
                                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                      {getTimelineRangeLabel(item.startMinutes, item.durationMinutes, locale)}
                                    </span>
                                  </div>
                                  <p className="line-clamp-2 text-xs text-slate-300">{item.detail}</p>
                                </div>
                                {item.badge ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/78">{item.badge}</span> : null}
                              </div>
                            );

                            return item.href ? (
                              <Link key={item.id} to={item.href} onClick={() => setSelectedTimelineItemId(item.id)} {...sharedProps}>
                                {innerContent}
                              </Link>
                            ) : (
                              <button key={item.id} type="button" onClick={() => setSelectedTimelineItemId(item.id)} {...sharedProps}>
                                {innerContent}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
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
                {activeTimelineItem.id.startsWith("bio-") && selectedBiofeedback ? (
                  <div className="rounded-[18px] border p-4 text-sm text-muted-foreground">
                    {language === "es" ? "Energia" : "Energy"} {selectedBiofeedback.daily_energy}/10 | {language === "es" ? "Estres" : "Stress"} {selectedBiofeedback.perceived_stress}/10 | {language === "es" ? "Hambre" : "Hunger"} {selectedBiofeedback.hunger_level}/10
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
              {language === "es"
                ? "La nota se guarda en la fecha seleccionada y aparece como bloque en la timeline segun la hora en que la registres."
                : "The note is saved on the selected date and appears on the timeline using the time you save it."}
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
        {[{ key: "agenda", label: language === "es" ? "Historial" : "Agenda" }, { key: "day", label: language === "es" ? "Dia" : "Day" }, { key: "month", label: language === "es" ? "Mes" : "Month" }].map((view) => (
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
        <CardDescription>{language === "es" ? "Lista cronologica de dias con actividad durante el mes." : "Chronological list of active days in the month."}</CardDescription>
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
                onClick={() => selectDate(day.dateKey)}
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

  const selectedDaySummaryPanel = (
    <Card>
      <CardHeader>
        <CardTitle>{language === "es" ? "Resumen del dia seleccionado" : "Selected day summary"}</CardTitle>
        <CardDescription className="capitalize">{selectedDateLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedDay ? (
          <p className="text-sm text-muted-foreground">{language === "es" ? "Sin informacion para este dia." : "No information for this day."}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{language === "es" ? "Registros" : "Tracked"}</p>
                <p className="mt-2 text-lg font-semibold">{getTrackedItemsCount(selectedDay)}/6</p>
              </div>
              <div className="rounded-[18px] border p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{language === "es" ? "Pendientes" : "Pending"}</p>
                <p className="mt-2 text-lg font-semibold">{missingModules.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {selectedDay.hasWeight ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Scale className="h-3.5 w-3.5" />{selectedDay.weightKg} kg</span> : null}
              {selectedDay.hasWater ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Droplets className="h-3.5 w-3.5 text-primary" />{selectedDay.totalWaterMl} ml</span> : null}
              {selectedDay.hasSleep ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Moon className="h-3.5 w-3.5 text-indigo-500" />{(selectedDay.totalSleepMinutes / 60).toFixed(1)} h</span> : null}
              {selectedDay.hasNutrition ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><UtensilsCrossed className="h-3.5 w-3.5 text-emerald-500" />{selectedDay.nutritionCalories} kcal</span> : null}
              {selectedDay.hasBiofeedback ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><HeartPulse className="h-3.5 w-3.5 text-rose-500" />Biofeedback</span> : null}
              {selectedDay.hasNote ? <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><FileText className="h-3.5 w-3.5 text-amber-500" />{language === "es" ? "Nota" : "Note"}</span> : null}
            </div>
            {selectedNote?.content ? (
              <div className="rounded-[18px] border p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{language === "es" ? "Nota del dia" : "Daily note"}</p>
                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{selectedNote.title?.trim() || selectedNote.content}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setCalendarView("day")} className="w-full sm:w-auto">
                {language === "es" ? "Abrir timeline del dia" : "Open day timeline"}
              </Button>
              <Button variant="outline" onClick={() => setCalendarView("month")} className="w-full sm:w-auto">
                {language === "es" ? "Ver en mes" : "View in month"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="app-shell min-h-screen px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <AppPageIntro
          eyebrow="Activity Ledger"
          title={t("calendar.title")}
          description={t("calendar.description")}
          actions={(
            <div className="hidden gap-2 md:flex">
              <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}><ChevronLeft className="mr-1 h-4 w-4" />{t("calendar.prevMonth")}</Button>
              <Button variant="outline" size="sm" onClick={goToToday}>{t("calendar.today")}</Button>
              <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>{t("calendar.nextMonth")}<ChevronRight className="ml-1 h-4 w-4" /></Button>
            </div>
          )}
        />

        <div className="space-y-4 md:hidden">
        {viewTabs}
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-5">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-0 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{calendarView === "day" ? (language === "es" ? "Dia seleccionado" : "Selected day") : t("calendar.title")}</p>
              <p className="truncate text-lg font-semibold capitalize">{calendarView === "day" ? selectedDateLabel : monthLabel}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          </CardContent>
          <CardContent className="pt-0">
            <Button className="w-full" variant="outline" size="sm" onClick={goToToday}>{t("calendar.today")}</Button>
          </CardContent>
        </Card>
        {calendarView === "agenda" ? <div className="space-y-4">{agendaPanel}{selectedDaySummaryPanel}</div> : null}
        {calendarView === "day" ? dayPanel : null}
        {calendarView === "month" ? <div className="space-y-4">{monthCalendarCard}{selectedDaySummaryPanel}</div> : null}
        </div>

        <div className="hidden gap-4 md:flex md:flex-col">
        <div className="max-w-sm">{viewTabs}</div>
        {calendarView === "agenda" ? <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.9fr]">{agendaPanel}{selectedDaySummaryPanel}</div> : null}
        {calendarView === "day" ? <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">{dayPanel}{monthCalendarCard}</div> : null}
        {calendarView === "month" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.8fr_1fr]">{monthCalendarCard}{selectedDaySummaryPanel}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
