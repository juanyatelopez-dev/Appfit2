import { format } from "date-fns";
import { ChevronLeft, ChevronRight, CircleHelp, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMetric } from "@/modules/nutrition/ui/nutritionConstants";
import type { NutritionProfileRecord } from "@/modules/nutrition/types";

type NutritionHeaderSectionProps = {
  selectedDate: Date;
  selectedProfileId: string | null;
  profileOptions: NutritionProfileRecord[];
  activeArchetype: string;
  archetypeDescription: string;
  planSource: "selected_template" | "initial_template" | "automatic" | "archived_snapshot";
  planSourceLabel: string;
  planSourceDescription: string;
  totalCalories: number | null | undefined;
  onPreviousDate: () => void;
  onNextDate: () => void;
  onSelectProfile: (value: string | null) => void;
  onOpenAddFood: () => void;
  onOpenTechnicalConfig: () => void;
};

export function NutritionHeaderSection({
  selectedDate,
  selectedProfileId,
  profileOptions,
  activeArchetype,
  archetypeDescription,
  planSource,
  planSourceLabel,
  planSourceDescription,
  totalCalories,
  onPreviousDate,
  onNextDate,
  onSelectProfile,
  onOpenAddFood,
  onOpenTechnicalConfig,
}: NutritionHeaderSectionProps) {
  const activeArchetypeLabel =
    NUTRITION_ARCHETYPE_META[activeArchetype as keyof typeof NUTRITION_ARCHETYPE_META]?.shortLabel ?? "Base";
  const planSourceTone =
    planSource === "selected_template"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : planSource === "initial_template"
        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
        : planSource === "archived_snapshot"
          ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
          : "border-slate-400/30 bg-slate-500/10 text-slate-200";

  return (
    <section className="space-y-4">
      <div className="space-y-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/80">Bitacora de nutricion</p>
        <h1 className="app-surface-heading text-3xl font-black tracking-tight md:text-4xl">Nutricion - Hoy</h1>
        <p className="app-surface-caption text-sm">
          Registra comidas rapido y abre el detalle tecnico solo cuando lo necesites.
        </p>
      </div>

      <div className="app-surface-hero rounded-[24px] px-4 py-5 sm:rounded-[28px] sm:px-8 sm:py-8">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_auto] xl:items-end">
          <div className="app-chip-muted rounded-2xl px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="app-surface-caption text-[10px] font-semibold uppercase tracking-[0.24em]">
                Plantilla del dia
              </div>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="app-surface-muted rounded-full p-1"
                      aria-label="Que es plantilla del dia"
                    >
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs">
                    Plantillas del dia te permiten ajustar calorias y macros segun el tipo de jornada sin duplicar comidas.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={selectedProfileId ?? "__fallback__"}
              onValueChange={(value) => onSelectProfile(value === "__fallback__" ? null : value)}
            >
              <SelectTrigger className="app-input-surface">
                <SelectValue placeholder="Selecciona perfil" />
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-xl border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${planSourceTone}`}
              >
                {planSourceLabel}
              </span>
              {planSource === "archived_snapshot" ? (
                <span className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                  Historial
                </span>
              ) : null}
            </div>
            <p className="app-surface-muted mt-2 text-sm">{planSourceDescription}</p>
            <p className="app-surface-caption mt-1 text-xs">
              {activeArchetypeLabel} | {archetypeDescription}
            </p>
          </div>

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
              <div className="app-surface-caption text-[11px] uppercase tracking-[0.24em]">Bitacora</div>
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="app-chip rounded-2xl px-4 py-3 text-right sm:min-w-[10rem]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Acumulado</div>
              <div className="text-xl font-black text-primary md:text-2xl">{formatMetric(totalCalories, " kcal")}</div>
            </div>
            <Button
              type="button"
              onClick={onOpenAddFood}
              className="rounded-2xl bg-primary px-4 text-primary-foreground hover:bg-primary/90"
            >
              + Agregar comida
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenTechnicalConfig}
              className="app-outline-button rounded-2xl"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Config tecnica
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
