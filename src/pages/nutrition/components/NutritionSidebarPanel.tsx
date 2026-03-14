import { Flame, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { ACTIVITY_LABELS, formatMetric, GOAL_LABELS } from "@/pages/nutrition/nutritionConstants";
import type {
  NutritionGoals,
  NutritionMacroTotals,
  NutritionMetabolicProfile,
  NutritionProfileRecord,
  NutritionTargetBreakdown,
} from "@/services/nutrition";

type NutritionSidebarPanelProps = {
  effectiveProfileLabel: string;
  activeArchetype: string;
  weightSource: "closest_on_or_before" | "latest_available" | "profile_fallback" | undefined;
  target: NutritionTargetBreakdown | null | undefined;
  goals: NutritionGoals | null | undefined;
  totals: NutritionMacroTotals | null | undefined;
  remaining: { calories: number | null | undefined } | null | undefined;
  metabolicProfile: NutritionMetabolicProfile | null | undefined;
  profileOptions: NutritionProfileRecord[];
  caloriesPct: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  onCreateProfile: () => void;
  onEditProfile: (profile: NutritionProfileRecord) => void;
  onSetDefaultProfile: (profileId: string) => void;
  onArchiveProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
};

export function NutritionSidebarPanel({
  effectiveProfileLabel,
  activeArchetype,
  weightSource,
  target,
  goals,
  totals,
  remaining,
  metabolicProfile,
  profileOptions,
  caloriesPct,
  proteinPct,
  carbsPct,
  fatPct,
  onCreateProfile,
  onEditProfile,
  onSetDefaultProfile,
  onArchiveProfile,
  onDeleteProfile,
}: NutritionSidebarPanelProps) {
  const archetypeMeta = NUTRITION_ARCHETYPE_META[activeArchetype as keyof typeof NUTRITION_ARCHETYPE_META];

  return (
    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Perfil del dia</p>
            <h3 className="app-surface-heading mt-1 text-lg font-bold">{effectiveProfileLabel}</h3>
          </div>
          <div className="app-chip rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">{archetypeMeta.label}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
            {ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--"}
          </div>
          <div className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
            {GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--"}
          </div>
          <div className="app-surface-soft rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
            {weightSource === "profile_fallback" ? "Peso perfil" : "Peso registrado"}
          </div>
        </div>
        <p className="app-surface-caption mt-2 text-xs">
          Actividad: {String((ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--")).toLowerCase()} | Objetivo: {String((GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--")).toLowerCase()}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border app-surface-soft p-4">
            <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">TDEE base</div>
            <div className="app-surface-heading mt-2 text-2xl font-black md:text-3xl">{formatMetric(target?.tdee)}</div>
            <div className="app-surface-caption text-xs">antes del arquetipo</div>
          </div>
          <div className="rounded-2xl border app-surface-soft p-4">
            <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Ajuste</div>
            <div className="app-surface-heading mt-2 text-2xl font-black md:text-3xl">{target ? `${target.archetypeDelta >= 0 ? "+" : ""}${target.archetypeDelta}` : "--"}</div>
            <div className="app-surface-caption text-xs">kcal del arquetipo</div>
          </div>
        </div>
        <div className="app-surface-caption mt-4 grid gap-2 text-xs uppercase tracking-[0.2em]">
          <div className="flex items-center justify-between"><span>Meta final</span><span>{formatMetric(goals?.calorie_goal, " kcal")}</span></div>
          <div className="flex items-center justify-between"><span>Peso de calculo</span><span>{formatMetric(metabolicProfile?.weightKg, " kg", 1)}</span></div>
        </div>
      </div>

      <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.26em]">Balance energetico</div>
        <div className="mt-4 flex items-end justify-between">
          <div><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Consumido</div><div className="app-surface-heading text-3xl font-black md:text-4xl">{formatMetric(totals?.calories)}</div></div>
          <div className="text-right"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Meta</div><div className="text-2xl font-black text-primary md:text-3xl">{formatMetric(goals?.calorie_goal)}</div></div>
        </div>
        <Progress value={caloriesPct} className="app-progress-track mt-4 h-3" />
        <div className="app-surface-caption mt-3 flex justify-between text-xs"><span>Restante</span><span>{formatMetric(remaining?.calories, " kcal")}</span></div>
      </div>

      <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Macros</div>
        <div className="mt-4 space-y-4">
          <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-emerald-300">Proteinas</span><span className="text-slate-400">{formatMetric(totals?.protein_g, "g")} / {formatMetric(goals?.protein_goal_g, "g")}</span></div><Progress value={proteinPct} className="h-2.5 app-progress-track [&>div]:bg-emerald-400" /></div>
          <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-cyan-300">Carbohidratos</span><span className="text-slate-400">{formatMetric(totals?.carbs_g, "g")} / {formatMetric(goals?.carb_goal_g, "g")}</span></div><Progress value={carbsPct} className="h-2.5 app-progress-track [&>div]:bg-cyan-400" /></div>
          <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-amber-300">Grasas</span><span className="text-slate-400">{formatMetric(totals?.fat_g, "g")} / {formatMetric(goals?.fat_goal_g, "g")}</span></div><Progress value={fatPct} className="h-2.5 app-progress-track [&>div]:bg-amber-400" /></div>
        </div>
      </div>

      <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="flex items-center justify-between"><div className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.26em]">Perfiles guardados</div><Button type="button" size="sm" onClick={onCreateProfile} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">Nuevo</Button></div>
        <div className="mt-4 space-y-3">
          {profileOptions.length === 0 ? (
            <div className="app-panel-block app-surface-muted rounded-2xl border-dashed px-4 py-5 text-sm">Crea perfiles como Torso, Pierna o Descanso. El perfil del dia recalcula metas sin duplicar tus comidas.</div>
          ) : profileOptions.map((profileRow) => (
            <div key={profileRow.id} className="app-panel-block rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><span className="app-surface-heading text-sm font-semibold">{profileRow.name}</span>{profileRow.is_default ? <Star className="h-4 w-4 text-amber-300" /> : null}{profileRow.is_archived ? <span className="app-surface-caption text-[10px] uppercase tracking-[0.2em]">Archivado</span> : null}</div>
                  <p className="app-surface-muted mt-1 text-xs">{NUTRITION_ARCHETYPE_META[profileRow.archetype].description}</p>
                </div>
                <div className="app-surface-soft app-surface-muted rounded-xl px-2 py-1 text-[10px] uppercase tracking-[0.2em]">{NUTRITION_ARCHETYPE_META[profileRow.archetype].shortLabel}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEditProfile(profileRow)} className="app-outline-button">Editar</Button>
                {!profileRow.is_default ? <Button type="button" variant="outline" size="sm" onClick={() => onSetDefaultProfile(profileRow.id)} className="app-outline-button">Predeterminado</Button> : null}
                {!profileRow.is_archived ? <Button type="button" variant="outline" size="sm" onClick={() => onArchiveProfile(profileRow.id)} className="app-outline-button">Archivar</Button> : null}
                <Button type="button" variant="outline" size="sm" onClick={() => onDeleteProfile(profileRow.id)} className="border-red-400/20 bg-transparent text-red-200">Eliminar</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="app-surface-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
        <div className="app-surface-caption flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em]"><Flame className="h-3.5 w-3.5 text-primary" />Perfil metabolico</div>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Sexo</div><div className="app-surface-heading mt-2 text-sm">{metabolicProfile?.sex === "female" ? "Femenino" : "Masculino"}</div></div><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Edad</div><div className="app-surface-heading mt-2 text-sm">{metabolicProfile?.age ?? "--"} anos</div></div></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Peso</div><div className="app-surface-heading mt-2 text-sm">{formatMetric(metabolicProfile?.weightKg, " kg", 1)}</div></div><div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Altura</div><div className="app-surface-heading mt-2 text-sm">{formatMetric(metabolicProfile?.heightCm, " cm", 0)}</div></div></div>
          <div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Actividad</div><div className="app-surface-heading mt-2 text-sm">{ACTIVITY_LABELS[metabolicProfile?.activityLevel ?? "moderate"] ?? "--"}</div></div>
          <div className="rounded-2xl border app-surface-soft p-3"><div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Objetivo</div><div className="app-surface-heading mt-2 text-sm">{GOAL_LABELS[metabolicProfile?.goalType ?? "maintain"] ?? "--"}</div></div>
          <Button asChild className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/fitness-profile">Abrir Perfil Fitness</Link></Button>
        </div>
      </div>
    </aside>
  );
}
