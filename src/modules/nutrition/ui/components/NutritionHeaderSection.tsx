import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, CircleHelp, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import type { NutritionProfileRecord } from "@/modules/nutrition/types";

type NutritionHeaderSectionProps = {
  selectedDate: Date;
  selectedProfileId: string | null;
  selectedPlanName: string;
  profileOptions: NutritionProfileRecord[];
  activeArchetype: string;
  archetypeDescription: string;
  planSource: "selected_template" | "initial_template" | "automatic" | "archived_snapshot";
  planSourceLabel: string;
  planSourceDescription: string;
  onPreviousDate: () => void;
  onNextDate: () => void;
  onSelectProfile: (value: string | null) => void;
  onApplyWeeklyPlan: (entries: Array<{ date: Date; profileId: string | null }>) => void;
  isApplyingWeeklyPlan?: boolean;
  onOpenTechnicalConfig: () => void;
  showIntro?: boolean;
};

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

export function NutritionHeaderSection({
  selectedDate,
  selectedProfileId,
  selectedPlanName,
  profileOptions,
  activeArchetype,
  archetypeDescription,
  planSource,
  planSourceLabel,
  planSourceDescription,
  onPreviousDate,
  onNextDate,
  onSelectProfile,
  onApplyWeeklyPlan,
  isApplyingWeeklyPlan = false,
  onOpenTechnicalConfig,
  showIntro = true,
}: NutritionHeaderSectionProps) {
  const [weeklyPlannerOpen, setWeeklyPlannerOpen] = useState(false);
  const [weeklyDraft, setWeeklyDraft] = useState<Record<string, string>>({});

  const weekStart = useMemo(() => addDays(selectedDate, -selectedDate.getDay()), [selectedDate]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return { date, key: format(date, "yyyy-MM-dd"), label: DAY_LABELS[date.getDay()] };
      }),
    [weekStart],
  );

  const activeArchetypeLabel =
    NUTRITION_ARCHETYPE_META[activeArchetype as keyof typeof NUTRITION_ARCHETYPE_META]?.shortLabel ?? "Base";

  const openWeeklyPlanner = () => {
    const base: Record<string, string> = {};
    weekDays.forEach((day) => {
      base[day.key] = "__skip__";
    });
    const selectedKey = format(selectedDate, "yyyy-MM-dd");
    base[selectedKey] = selectedProfileId ?? "__fallback__";
    setWeeklyDraft(base);
    setWeeklyPlannerOpen(true);
  };

  const applyWeeklyPlan = () => {
    const entries = weekDays
      .map((day) => {
        const value = weeklyDraft[day.key];
        if (!value || value === "__skip__") return null;
        return {
          date: day.date,
          profileId: value === "__fallback__" ? null : value,
        };
      })
      .filter((entry): entry is { date: Date; profileId: string | null } => entry !== null);
    if (entries.length === 0) return;
    onApplyWeeklyPlan(entries);
    setWeeklyPlannerOpen(false);
  };

  return (
    <section className="space-y-4">
      {showIntro ? <div className="space-y-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/80">Bitacora de nutricion</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="app-surface-heading text-3xl font-black tracking-tight md:text-4xl">Nutricion - Hoy</h1>
          <div className="app-chip-muted grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground"
              onClick={onPreviousDate}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 text-center">
              <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Bitacora</div>
              <div className="app-surface-heading text-sm font-semibold">{format(selectedDate, "dd/MM/yyyy")}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground"
              onClick={onNextDate}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="app-surface-caption text-sm">Registra rapido y entiende exactamente que plan nutricional estas usando.</p>
      </div> : null}

      <div className="app-surface-hero rounded-[24px] px-4 py-5 sm:rounded-[28px] sm:px-6 sm:py-6">
        <div className="grid gap-3 xl:grid-cols-1 xl:items-stretch">
          <article className="app-chip-muted rounded-2xl px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="app-surface-caption text-[10px] font-semibold uppercase tracking-[0.24em]">Perfil nutricional diario</div>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="app-surface-muted rounded-full p-1" aria-label="Que es perfil nutricional diario">
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] text-xs">
                      <p>
                        Las plantillas de alimentacion ajustan tus calorias segun el tipo de dia: descanso (-300), esfuerzo alto (+150) o base (sin ajuste). Este ajuste se suma al calculo principal de tu Perfil Fitness.
                      </p>
                      <p className="mt-2">
                        Puedes guardar plantillas, marcar una como inicial, aplicarlas por fecha y conservar snapshots diarios para no alterar tu historial.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button type="button" variant="outline" size="sm" className="app-outline-button rounded-xl" onClick={onOpenTechnicalConfig}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Config tecnica
              </Button>
            </div>
            <Select
              value={selectedProfileId ?? "__fallback__"}
              onValueChange={(value) => onSelectProfile(value === "__fallback__" ? null : value)}
            >
              <SelectTrigger className="app-input-surface">
                <SelectValue placeholder="Selecciona plantilla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__fallback__">Automatico</SelectItem>
                {profileOptions
                  .filter((row) => !row.is_archived)
                  .map((profileRow) => (
                    <SelectItem key={profileRow.id} value={profileRow.id}>
                      {profileRow.name} - {NUTRITION_ARCHETYPE_META[profileRow.archetype].shortLabel}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="app-surface-caption text-xs">
                {activeArchetypeLabel} | {archetypeDescription}
              </p>
              <Button type="button" variant="outline" size="sm" className="app-outline-button rounded-xl" onClick={openWeeklyPlanner}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Plan semanal
              </Button>
            </div>
          </article>

        </div>
      </div>

      <Dialog open={weeklyPlannerOpen} onOpenChange={setWeeklyPlannerOpen}>
        <DialogContent className="app-dialog-surface max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan semanal de perfil nutricional</DialogTitle>
            <DialogDescription>Asigna una plantilla por dia. Solo se aplicaran los dias que no esten en \"Sin cambios\".</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {weekDays.map((day) => {
              const isToday = format(day.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              return (
                <div key={day.key} className="app-panel-block rounded-2xl px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="app-surface-heading text-sm font-semibold">{day.label}</div>
                    {isToday ? (
                      <span className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                        Hoy
                      </span>
                    ) : null}
                  </div>
                  <Select
                    value={weeklyDraft[day.key] ?? "__skip__"}
                    onValueChange={(value) => setWeeklyDraft((current) => ({ ...current, [day.key]: value }))}
                  >
                    <SelectTrigger className="app-input-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Sin cambios</SelectItem>
                      <SelectItem value="__fallback__">Automatico</SelectItem>
                      {profileOptions
                        .filter((row) => !row.is_archived)
                        .map((profileRow) => (
                          <SelectItem key={profileRow.id} value={profileRow.id}>
                            {profileRow.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="app-outline-button" onClick={() => setWeeklyPlannerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={applyWeeklyPlan} disabled={isApplyingWeeklyPlan}>
              {isApplyingWeeklyPlan ? "Aplicando..." : "Aplicar plan semanal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
