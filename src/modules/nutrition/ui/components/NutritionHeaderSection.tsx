import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import { cn } from "@/lib/utils";
import { formatMetric } from "@/modules/nutrition/ui/nutritionConstants";
import type { NutritionProfileRecord } from "@/modules/nutrition/types";

type NutritionHeaderSectionProps = {
  selectedDate: Date;
  selectedProfileId: string | null;
  profileOptions: NutritionProfileRecord[];
  activeArchetype: string;
  archetypeDescription: string;
  totalCalories: number | null | undefined;
  onPreviousDate: () => void;
  onNextDate: () => void;
  onSelectProfile: (value: string | null) => void;
  onCreateProfile: () => void;
};

export function NutritionHeaderSection({
  selectedDate,
  selectedProfileId,
  profileOptions,
  activeArchetype,
  archetypeDescription,
  totalCalories,
  onPreviousDate,
  onNextDate,
  onSelectProfile,
  onCreateProfile,
}: NutritionHeaderSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/80">Panel diario</p>
        <h1 className="app-surface-heading text-3xl font-black uppercase tracking-tight md:text-4xl">Nutricion & Combustible</h1>
        <p className="app-surface-caption text-sm uppercase tracking-[0.24em]">Perfil del dia, objetivos dinamicos y registro de comidas</p>
      </div>
      <div className="app-surface-hero rounded-[24px] px-4 py-5 sm:rounded-[28px] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="grid gap-3 md:grid-cols-[minmax(0,280px)_1fr_auto] xl:flex-1">
            <div className="app-chip-muted rounded-2xl px-3 py-3">
              <div className="app-surface-caption mb-2 text-[10px] font-semibold uppercase tracking-[0.24em]">Perfil del dia</div>
              <Select value={selectedProfileId ?? "__fallback__"} onValueChange={(value) => onSelectProfile(value === "__fallback__" ? null : value)}>
                <SelectTrigger className="app-input-surface"><SelectValue placeholder="Selecciona perfil" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__fallback__">Sin perfil explicito</SelectItem>
                  {profileOptions.filter((row) => !row.is_archived).map((profileRow) => (
                    <SelectItem key={profileRow.id} value={profileRow.id}>
                      {profileRow.name} - {NUTRITION_ARCHETYPE_META[profileRow.archetype].shortLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="app-chip-muted rounded-2xl px-4 py-3">
              <div className="app-surface-caption text-[10px] font-semibold uppercase tracking-[0.24em]">Arquetipo activo</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(NUTRITION_ARCHETYPE_META).map(([key, meta]) => (
                  <div key={key} className={cn("rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]", activeArchetype === key ? "border-primary/50 bg-primary/15 text-primary" : "border-border/70 text-muted-foreground")}>
                    {meta.shortLabel}
                  </div>
                ))}
              </div>
              <p className="app-surface-muted mt-2 text-sm">{archetypeDescription}</p>
            </div>
            <Button type="button" onClick={onCreateProfile} className="app-outline-button h-auto rounded-2xl px-4 py-3">
              <FolderKanban className="mr-2 h-4 w-4" />
              Nuevo perfil
            </Button>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="app-chip-muted flex items-center gap-2 rounded-2xl px-3 py-2">
              <Button variant="ghost" size="icon" className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground" onClick={onPreviousDate}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="min-w-0 flex-1 text-center sm:min-w-40"><div className="app-surface-caption text-[11px] uppercase tracking-[0.24em]">Bitacora</div><div className="app-surface-heading text-sm font-semibold">{format(selectedDate, "dd/MM/yyyy")}</div></div>
              <Button variant="ghost" size="icon" className="app-surface-muted h-9 w-9 rounded-xl hover:bg-background/60 hover:text-foreground" onClick={onNextDate}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="app-chip rounded-2xl px-4 py-3 text-right sm:min-w-[10rem]"><div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Acumulado</div><div className="text-xl font-black text-primary md:text-2xl">{formatMetric(totalCalories, " kcal")}</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
