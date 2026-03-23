import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { ACTIVITY_LABELS, formatMetric, GOAL_LABELS } from "@/modules/nutrition/ui/nutritionConstants";
import type {
  NutritionGoals,
  NutritionMacroTotals,
  NutritionMetabolicProfile,
  NutritionTargetBreakdown,
} from "@/modules/nutrition/types";

type NutritionSidebarPanelProps = {
  effectiveProfileLabel: string;
  activeArchetype: string;
  planSource: "selected_template" | "initial_template" | "automatic" | "archived_snapshot";
  planSourceLabel: string;
  weightSource: "closest_on_or_before" | "latest_available" | "profile_fallback" | undefined;
  target: NutritionTargetBreakdown | null | undefined;
  goals: NutritionGoals | null | undefined;
  totals: NutritionMacroTotals | null | undefined;
  remaining: { calories: number | null | undefined } | null | undefined;
  metabolicProfile: NutritionMetabolicProfile | null | undefined;
  caloriesPct: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  onOpenTechnicalConfig: () => void;
  showPlanCard?: boolean;
};

export function NutritionSidebarPanel({
  effectiveProfileLabel,
  activeArchetype,
  planSource,
  planSourceLabel,
  weightSource,
  target,
  goals,
  totals,
  remaining,
  metabolicProfile,
  caloriesPct,
  proteinPct,
  carbsPct,
  fatPct,
  onOpenTechnicalConfig,
  showPlanCard = true,
}: NutritionSidebarPanelProps) {
  const archetypeMeta =
    NUTRITION_ARCHETYPE_META[activeArchetype as keyof typeof NUTRITION_ARCHETYPE_META] ??
    NUTRITION_ARCHETYPE_META.base;
  const planSourceTone =
    planSource === "selected_template"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : planSource === "initial_template"
        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
        : planSource === "archived_snapshot"
          ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
          : "border-slate-400/30 bg-slate-500/10 text-slate-200";
  const activityLabel = ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--";
  const goalLabel = GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--";
  const weightLabel = weightSource === "profile_fallback" ? "Peso perfil" : "Peso registrado";

  const renderInfoChip = (label: string, description: string) => (
    <>
      <div className="hidden sm:block">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
              {label}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {description}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="sm:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
              {label}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-[min(18rem,calc(100vw-2rem))] text-xs">
            {description}
          </PopoverContent>
        </Popover>
      </div>
    </>
  );

  return (
    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      {showPlanCard ? <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Plan de hoy</p>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="app-surface-muted rounded-full p-1" aria-label="Ayuda plan de hoy">
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs">
                    El plan de hoy se resuelve por plantilla elegida, plantilla inicial o modo automatico.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <h3 className="app-surface-heading mt-1 text-lg font-bold">{effectiveProfileLabel}</h3>
          </div>
          <div className="app-chip rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">{archetypeMeta.label}</div>
        </div>
        <div
          className={`mt-3 inline-flex rounded-xl border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${planSourceTone}`}
        >
          {planSource === "automatic" ? "Automatico" : `Plantilla elegida: ${effectiveProfileLabel}`}
        </div>
        <TooltipProvider delayDuration={90}>
          <div className="mt-3 flex flex-wrap gap-2">
            {renderInfoChip(
              activityLabel,
              `Tu nivel de actividad configurado en Perfil Fitness es ${String(activityLabel).toLowerCase()} y afecta el calculo diario.`,
            )}
            {renderInfoChip(
              goalLabel,
              `Tu objetivo designado en tu Perfil Fitness es ${String(goalLabel).toLowerCase()}.`,
            )}
            {renderInfoChip(
              weightLabel,
              weightSource === "profile_fallback"
                ? "Hoy no hay peso registrado cercano y se usa el peso base de tu Perfil Fitness."
                : "El calculo de hoy esta usando un peso registrado en tu historial.",
            )}
          </div>
        </TooltipProvider>
        <p className="app-surface-caption mt-2 text-xs leading-relaxed">
          Actividad: {String(activityLabel).toLowerCase()}
          {" | "}
          Objetivo: {String(goalLabel).toLowerCase()}
        </p>
        <div className="app-surface-caption mt-4 grid gap-2 text-xs uppercase tracking-[0.2em]">
          <div className="flex items-center justify-between"><span>TDEE base</span><span>{formatMetric(target?.tdee)}</span></div>
          <div className="flex items-center justify-between"><span>Ajuste</span><span>{target ? `${target.archetypeDelta >= 0 ? "+" : ""}${target.archetypeDelta}` : "--"}</span></div>
          <div className="flex items-center justify-between"><span>Meta final</span><span>{formatMetric(goals?.calorie_goal, " kcal")}</span></div>
        </div>
        <Button type="button" variant="outline" className="mt-4 w-full app-outline-button" onClick={onOpenTechnicalConfig}>
          Ver configuracion tecnica
        </Button>
      </div> : null}

      <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.26em]">Balance energetico</div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Consumido</div>
            <div className="app-surface-heading text-3xl font-black md:text-4xl">{formatMetric(totals?.calories)}</div>
          </div>
          <div className="sm:text-right">
            <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Meta</div>
            <div className="text-2xl font-black text-primary md:text-3xl">{formatMetric(goals?.calorie_goal)}</div>
          </div>
        </div>
        <Progress value={caloriesPct} className="app-progress-track mt-4 h-3" />
        <div className="app-surface-caption mt-3 flex justify-between text-xs"><span>Restante</span><span>{formatMetric(remaining?.calories, " kcal")}</span></div>
      </div>

      <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Macros</div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="font-medium text-emerald-300">Proteinas</span>
              <span className="text-right text-slate-400">
                {formatMetric(totals?.protein_g, "g")} / {formatMetric(goals?.protein_goal_g, "g")}
              </span>
            </div>
            <Progress value={proteinPct} className="h-2.5 app-progress-track [&>div]:bg-emerald-400" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="font-medium text-cyan-300">Carbohidratos</span>
              <span className="text-right text-slate-400">
                {formatMetric(totals?.carbs_g, "g")} / {formatMetric(goals?.carb_goal_g, "g")}
              </span>
            </div>
            <Progress value={carbsPct} className="h-2.5 app-progress-track [&>div]:bg-cyan-400" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="font-medium text-amber-300">Grasas</span>
              <span className="text-right text-slate-400">
                {formatMetric(totals?.fat_g, "g")} / {formatMetric(goals?.fat_goal_g, "g")}
              </span>
            </div>
            <Progress value={fatPct} className="h-2.5 app-progress-track [&>div]:bg-amber-400" />
          </div>
        </div>
      </div>
    </aside>
  );
}
