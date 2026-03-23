import { ChevronDown, CirclePlus, Library, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMetric, type AddMode } from "@/modules/nutrition/ui/nutritionConstants";
import type { NutritionEntry, NutritionMealType } from "@/modules/nutrition/types";

type MealOverviewItem = {
  meal: { key: NutritionMealType; label: string; accentClass: string; railClass: string };
  entries: NutritionEntry[];
  subtotal: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
};

type NutritionMealsSectionProps = {
  mealOverview: MealOverviewItem[];
  expandedMeals: Record<NutritionMealType, boolean>;
  onOpenMealDialog: (meal: NutritionMealType, mode?: AddMode) => void;
  onToggleMeal: (meal: NutritionMealType) => void;
  onDeleteEntry: (entryId: string) => void;
  onOpenFoodLibrary: () => void;
};

export function NutritionMealsSection({
  mealOverview,
  expandedMeals,
  onOpenMealDialog,
  onToggleMeal,
  onDeleteEntry,
  onOpenFoodLibrary,
}: NutritionMealsSectionProps) {
  return (
    <div className="app-surface-panel rounded-[24px] sm:rounded-[28px]">
      <div className="flex flex-col gap-3 border-b border-border/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div>
          <div className="flex items-center gap-2">
            <p className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.28em]">Logbook</p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-xl app-outline-button"
              onClick={onOpenFoodLibrary}
              aria-label="Abrir biblioteca de alimentos"
              title="Biblioteca de alimentos"
            >
              <Library className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="app-surface-heading mt-1 text-xl font-bold md:text-2xl">Registro operativo de comidas</h2>
          <p className="app-surface-caption mt-1 text-xs">Expande un bloque y registra sin salir del flujo diario.</p>
        </div>
        <Button
          onClick={() => onOpenMealDialog("breakfast")}
          className="w-full rounded-2xl bg-primary px-4 text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          <CirclePlus className="mr-2 h-4 w-4" />
          Agregar comida
        </Button>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-5 sm:py-5">
        {mealOverview.map(({ meal, entries, subtotal }, index) => (
          <article key={meal.key} className="app-surface-tile overflow-hidden rounded-[20px] sm:rounded-[24px]">
            <div className="grid gap-4 px-4 py-4 sm:px-5 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className={cn("mt-1 h-14 w-1.5 shrink-0 rounded-full", meal.railClass)} />
                  <div className="min-w-0 space-y-1">
                    <div className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.26em]">
                      Registro {index + 1}
                    </div>
                    <div className={cn("text-lg font-bold uppercase leading-tight md:text-xl", meal.accentClass)}>
                      {meal.label}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="app-panel-block rounded-2xl px-3 py-2 text-center">
                  <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Pro</div>
                  <div className="text-sm font-semibold text-emerald-300">{formatMetric(subtotal?.protein_g, "g")}</div>
                </div>
                <div className="app-panel-block rounded-2xl px-3 py-2 text-center">
                  <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Cho</div>
                  <div className="text-sm font-semibold text-cyan-300">{formatMetric(subtotal?.carbs_g, "g")}</div>
                </div>
                <div className="app-panel-block rounded-2xl px-3 py-2 text-center">
                  <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Fat</div>
                  <div className="text-sm font-semibold text-amber-300">{formatMetric(subtotal?.fat_g, "g")}</div>
                </div>
                <div className="app-panel-block rounded-2xl px-3 py-2 text-center">
                  <div className="app-surface-caption text-[10px] uppercase tracking-[0.24em]">Kcal</div>
                  <div className="app-surface-heading text-sm font-semibold">{formatMetric(subtotal?.calories)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleMeal(meal.key)}
                className="app-surface-soft app-surface-muted justify-self-end rounded-2xl p-3"
              >
                <ChevronDown className={cn("h-5 w-5 transition-transform", expandedMeals[meal.key] && "rotate-180")} />
              </button>
            </div>

            {expandedMeals[meal.key] && (
              <div className="border-t border-border/40 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <div className="app-surface-soft hidden overflow-hidden rounded-2xl border md:block">
                  <table className="w-full text-left">
                    <thead className="border-b border-border/50 bg-background/30">
                      <tr className="app-surface-caption text-[11px] uppercase tracking-[0.24em]">
                        <th className="px-4 py-3">Alimento</th>
                        <th className="px-3 py-3 text-right">Cant</th>
                        <th className="px-3 py-3 text-right">P</th>
                        <th className="px-3 py-3 text-right">C</th>
                        <th className="px-3 py-3 text-right">F</th>
                        <th className="px-3 py-3 text-right">Kcal</th>
                        <th className="px-4 py-3 text-right">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="app-surface-caption px-4 py-8 text-center text-sm">
                            Esta comida aun esta vacia.
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-border/40 last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="app-surface-heading font-medium">{entry.food_name}</div>
                              <div className="app-surface-caption text-xs">
                                Na {formatMetric(entry.sodium_mg, "mg")} | K {formatMetric(entry.potassium_mg, "mg")}
                              </div>
                            </td>
                            <td className="app-surface-muted px-3 py-3 text-right text-sm">
                              {entry.serving_size} {entry.serving_unit}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-medium text-emerald-300">{entry.protein_g}</td>
                            <td className="px-3 py-3 text-right text-sm font-medium text-cyan-300">{entry.carbs_g}</td>
                            <td className="px-3 py-3 text-right text-sm font-medium text-amber-300">{entry.fat_g}</td>
                            <td className="app-surface-heading px-3 py-3 text-right text-sm font-semibold">
                              {entry.calories}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDeleteEntry(entry.id)}
                                className="app-surface-muted rounded-xl hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {entries.length === 0 ? (
                    <div className="app-surface-caption rounded-2xl border border-dashed border-border/50 px-4 py-6 text-center text-sm">
                      Esta comida aun esta vacia.
                    </div>
                  ) : (
                    entries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-border/50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="app-surface-heading font-medium">{entry.food_name}</div>
                            <div className="app-surface-caption mt-1 text-xs">
                              {entry.serving_size} {entry.serving_unit}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteEntry(entry.id)}
                            className="app-surface-muted rounded-xl hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="app-panel-block rounded-xl px-3 py-2">P {entry.protein_g}</div>
                          <div className="app-panel-block rounded-xl px-3 py-2">C {entry.carbs_g}</div>
                          <div className="app-panel-block rounded-xl px-3 py-2">F {entry.fat_g}</div>
                          <div className="app-panel-block rounded-xl px-3 py-2 font-semibold">{entry.calories} kcal</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenMealDialog(meal.key, "database")}
                    className="app-surface-soft w-full rounded-2xl px-4 py-3 text-sm font-medium"
                  >
                    + Agregar alimento
                  </button>
                  <p className="app-surface-caption text-xs">
                    Tambien puedes usar favoritos, recientes, ayer o carga manual.
                  </p>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
