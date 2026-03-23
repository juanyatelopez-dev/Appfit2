import { useEffect, useMemo, useState } from "react";
import { CirclePlus, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FOOD_SERVING_UNITS } from "@/modules/nutrition/ui/nutritionConstants";
import type { FavoriteFood, FoodDatabaseItem } from "@/modules/nutrition/types";

type FoodLibrarySource = "database" | "favorite";
type FoodLibrarySourceFilter = "all" | FoodLibrarySource;
type FoodLibrarySort = "name_asc" | "calories_desc" | "protein_desc" | "newest";

type FoodLibraryRow = {
  id: string;
  name: string;
  category: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  created_at: string;
  source: FoodLibrarySource;
};

type FavoriteEditorState = {
  id: string;
  name: string;
  serving_size: string;
  serving_unit: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
  sodium_mg: string;
  potassium_mg: string;
};

type NutritionFoodLibrarySectionProps = {
  foodLibraryItems: FoodDatabaseItem[];
  favorites: FavoriteFood[];
  categories: string[];
  onAddMeal: () => void;
  onUpdateFavorite: (payload: {
    id: string;
    name: string;
    serving_size: number;
    serving_unit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number | null;
    sodium_mg?: number | null;
    potassium_mg?: number | null;
  }) => void;
  onDeleteFavorite: (favoriteId: string) => void;
  isUpdatingFavorite: boolean;
  isDeletingFavorite: boolean;
};

const PAGE_SIZE = 24;
const CUSTOM_CATEGORY = "Personalizado";

const toInputValue = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

const toOptionalNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  if (!Number.isFinite(next) || next < 0) return null;
  return next;
};

export function NutritionFoodLibrarySection({
  foodLibraryItems,
  favorites,
  categories,
  onAddMeal,
  onUpdateFavorite,
  onDeleteFavorite,
  isUpdatingFavorite,
  isDeletingFavorite,
}: NutritionFoodLibrarySectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<FoodLibrarySourceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState<FoodLibrarySort>("name_asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editingFood, setEditingFood] = useState<FavoriteEditorState | null>(null);

  const rows = useMemo<FoodLibraryRow[]>(() => {
    const databaseRows = foodLibraryItems.map((item) => ({
      id: item.id,
      name: item.food_name,
      category: item.category,
      serving_size: item.serving_size,
      serving_unit: item.serving_unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
      potassium_mg: item.potassium_mg,
      created_at: item.created_at,
      source: "database" as const,
    }));

    const customRows = favorites.map((item) => ({
      id: item.id,
      name: item.name,
      category: CUSTOM_CATEGORY,
      serving_size: item.serving_size,
      serving_unit: item.serving_unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
      potassium_mg: item.potassium_mg,
      created_at: item.created_at,
      source: "favorite" as const,
    }));

    return [...databaseRows, ...customRows];
  }, [foodLibraryItems, favorites]);

  const categoryOptions = useMemo(() => {
    const next = new Set(categories.filter(Boolean));
    if (favorites.length > 0) next.add(CUSTOM_CATEGORY);
    return Array.from(next).sort((a, b) => a.localeCompare(b));
  }, [categories, favorites.length]);

  const unitOptions = useMemo(() => {
    const next = new Set(rows.map((row) => row.serving_unit).filter(Boolean));
    return Array.from(next).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (sourceFilter !== "all" && row.source !== sourceFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (unitFilter !== "all" && row.serving_unit !== unitFilter) return false;
      if (!normalizedSearch) return true;
      const searchable = `${row.name} ${row.category} ${row.serving_unit}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });

    next.sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      if (sortBy === "calories_desc") return b.calories - a.calories;
      if (sortBy === "protein_desc") return b.protein_g - a.protein_g;
      return b.created_at.localeCompare(a.created_at);
    });

    return next;
  }, [rows, searchTerm, sourceFilter, categoryFilter, unitFilter, sortBy]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, sourceFilter, categoryFilter, unitFilter, sortBy]);

  const visibleRows = filteredRows.slice(0, visibleCount);
  const canLoadMore = visibleRows.length < filteredRows.length;

  const openEditor = (row: FoodLibraryRow) => {
    if (row.source !== "favorite") return;
    setEditingFood({
      id: row.id,
      name: row.name,
      serving_size: String(row.serving_size),
      serving_unit: row.serving_unit,
      calories: String(row.calories),
      protein_g: String(row.protein_g),
      carbs_g: String(row.carbs_g),
      fat_g: String(row.fat_g),
      fiber_g: toInputValue(row.fiber_g),
      sodium_mg: toInputValue(row.sodium_mg),
      potassium_mg: toInputValue(row.potassium_mg),
    });
  };

  const saveEditor = () => {
    if (!editingFood) return;
    const servingSize = Number(editingFood.serving_size);
    const calories = Number(editingFood.calories);
    const protein = Number(editingFood.protein_g);
    const carbs = Number(editingFood.carbs_g);
    const fat = Number(editingFood.fat_g);
    const fiber = toOptionalNumber(editingFood.fiber_g);
    const sodium = toOptionalNumber(editingFood.sodium_mg);
    const potassium = toOptionalNumber(editingFood.potassium_mg);

    if (!editingFood.name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!Number.isFinite(servingSize) || servingSize <= 0) {
      toast.error("La porcion debe ser mayor a 0.");
      return;
    }
    if (!Number.isFinite(calories) || calories < 0 || !Number.isFinite(protein) || protein < 0 || !Number.isFinite(carbs) || carbs < 0 || !Number.isFinite(fat) || fat < 0) {
      toast.error("Revisa los macros y calorias.");
      return;
    }
    if (!editingFood.serving_unit.trim()) {
      toast.error("Selecciona una unidad.");
      return;
    }

    onUpdateFavorite({
      id: editingFood.id,
      name: editingFood.name.trim(),
      serving_size: servingSize,
      serving_unit: editingFood.serving_unit,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: fiber,
      sodium_mg: sodium,
      potassium_mg: potassium,
    });
    setEditingFood(null);
  };

  const sourceCounts = useMemo(
    () => ({
      database: rows.filter((row) => row.source === "database").length,
      favorite: rows.filter((row) => row.source === "favorite").length,
    }),
    [rows],
  );

  return (
    <section className="app-surface-panel rounded-[24px] sm:rounded-[28px]">
      <div className="flex flex-col gap-3 border-b border-border/40 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="app-surface-caption text-[11px] font-semibold uppercase tracking-[0.28em]">Biblioteca</p>
            <h2 className="app-surface-heading mt-1 text-xl font-bold md:text-2xl">Biblioteca de alimentos</h2>
            <p className="app-surface-caption mt-1 text-xs">Base completa + personalizados. Los personalizados se pueden editar.</p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <Button type="button" onClick={onAddMeal} className="w-full rounded-2xl bg-primary px-4 text-primary-foreground hover:bg-primary/90 md:w-auto">
              <CirclePlus className="mr-2 h-4 w-4" />
              Agregar comida
            </Button>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="app-panel-block rounded-xl px-3 py-2">Total: <span className="font-semibold">{rows.length}</span></div>
              <div className="app-panel-block rounded-xl px-3 py-2">Base: <span className="font-semibold">{sourceCounts.database}</span></div>
              <div className="app-panel-block rounded-xl px-3 py-2">Custom: <span className="font-semibold">{sourceCounts.favorite}</span></div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar alimento..."
            className="app-input-surface xl:col-span-2"
          />
          <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as FoodLibrarySourceFilter)}>
            <SelectTrigger className="app-input-surface">
              <SelectValue placeholder="Fuente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fuentes</SelectItem>
              <SelectItem value="database">Base AppFit</SelectItem>
              <SelectItem value="favorite">Personalizados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="app-input-surface">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorias</SelectItem>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="app-input-surface">
                <SelectValue placeholder="Unidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as FoodLibrarySort)}>
              <SelectTrigger className="app-input-surface">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Nombre A-Z</SelectItem>
                <SelectItem value="calories_desc">Kcal mayor a menor</SelectItem>
                <SelectItem value="protein_desc">Proteina mayor a menor</SelectItem>
                <SelectItem value="newest">Mas recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="app-surface-soft hidden overflow-hidden rounded-2xl border md:block">
          <table className="w-full text-left">
            <thead className="border-b border-border/50 bg-background/30">
              <tr className="app-surface-caption text-[11px] uppercase tracking-[0.24em]">
                <th className="px-4 py-3">Alimento</th>
                <th className="px-3 py-3">Fuente</th>
                <th className="px-3 py-3 text-right">Porcion</th>
                <th className="px-3 py-3 text-right">P</th>
                <th className="px-3 py-3 text-right">C</th>
                <th className="px-3 py-3 text-right">F</th>
                <th className="px-3 py-3 text-right">Kcal</th>
                <th className="px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="app-surface-caption px-4 py-8 text-center text-sm">
                    No hay alimentos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="border-b border-border/40 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="app-surface-heading font-medium">{row.name}</div>
                      <div className="app-surface-caption text-xs">{row.category}</div>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className={row.source === "favorite" ? "text-cyan-300" : "text-slate-300"}>
                        {row.source === "favorite" ? "Personalizado" : "Base"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm">{row.serving_size} {row.serving_unit}</td>
                    <td className="px-3 py-3 text-right text-sm text-emerald-300">{row.protein_g}</td>
                    <td className="px-3 py-3 text-right text-sm text-cyan-300">{row.carbs_g}</td>
                    <td className="px-3 py-3 text-right text-sm text-amber-300">{row.fat_g}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold">{row.calories}</td>
                    <td className="px-4 py-3 text-right">
                      {row.source === "favorite" ? (
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditor(row)}
                            className="app-surface-muted rounded-xl"
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm("Quieres eliminar este alimento personalizado?")) onDeleteFavorite(row.id);
                            }}
                            disabled={isDeletingFavorite}
                            className="app-surface-muted rounded-xl hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="app-surface-caption text-xs">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {visibleRows.length === 0 ? (
            <div className="app-surface-caption rounded-2xl border border-dashed border-border/50 px-4 py-6 text-center text-sm">
              No hay alimentos para los filtros seleccionados.
            </div>
          ) : (
            visibleRows.map((row) => (
              <article key={`${row.source}-${row.id}`} className="app-surface-soft rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="app-surface-heading truncate text-sm font-semibold">{row.name}</h3>
                    <p className="app-surface-caption text-xs">{row.category}</p>
                  </div>
                  {row.source === "favorite" ? (
                    <div className="inline-flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEditor(row)} className="app-surface-muted rounded-xl">
                        <PencilLine className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm("Quieres eliminar este alimento personalizado?")) onDeleteFavorite(row.id);
                        }}
                        disabled={isDeletingFavorite}
                        className="app-surface-muted rounded-xl hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="app-surface-caption text-[11px]">Base</span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="app-panel-block rounded-xl px-3 py-2">{row.serving_size} {row.serving_unit}</div>
                  <div className="app-panel-block rounded-xl px-3 py-2 font-semibold">{row.calories} kcal</div>
                  <div className="app-panel-block rounded-xl px-3 py-2">P {row.protein_g}</div>
                  <div className="app-panel-block rounded-xl px-3 py-2">C {row.carbs_g}</div>
                  <div className="app-panel-block rounded-xl px-3 py-2">F {row.fat_g}</div>
                  <div className="app-panel-block rounded-xl px-3 py-2">{row.source === "favorite" ? "Custom" : "Base"}</div>
                </div>
              </article>
            ))
          )}
        </div>

        {canLoadMore ? (
          <Button type="button" variant="outline" className="mt-4 w-full app-outline-button" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
            Cargar mas alimentos ({filteredRows.length - visibleRows.length} restantes)
          </Button>
        ) : null}
      </div>

      <Dialog open={Boolean(editingFood)} onOpenChange={(open) => !open && setEditingFood(null)}>
        <DialogContent className="app-dialog-surface max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar alimento personalizado</DialogTitle>
          </DialogHeader>
          {editingFood ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="app-surface-muted">Nombre</Label>
                <Input value={editingFood.name} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, name: event.target.value } : prev))} className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Porcion</Label>
                <Input value={editingFood.serving_size} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, serving_size: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Unidad</Label>
                <Select value={editingFood.serving_unit || undefined} onValueChange={(value) => setEditingFood((prev) => (prev ? { ...prev, serving_unit: value } : prev))}>
                  <SelectTrigger className="app-input-surface mt-1">
                    <SelectValue placeholder="unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_SERVING_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="app-surface-muted">kcal</Label>
                <Input value={editingFood.calories} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, calories: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Proteina g</Label>
                <Input value={editingFood.protein_g} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, protein_g: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Carbs g</Label>
                <Input value={editingFood.carbs_g} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, carbs_g: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Grasas g</Label>
                <Input value={editingFood.fat_g} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, fat_g: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Fibra g</Label>
                <Input value={editingFood.fiber_g} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, fiber_g: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Sodio mg</Label>
                <Input value={editingFood.sodium_mg} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, sodium_mg: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
              <div>
                <Label className="app-surface-muted">Potasio mg</Label>
                <Input value={editingFood.potassium_mg} onChange={(event) => setEditingFood((prev) => (prev ? { ...prev, potassium_mg: event.target.value } : prev))} type="number" min="0" className="app-input-surface mt-1" />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="w-full app-outline-button sm:w-auto" onClick={() => setEditingFood(null)}>Cancelar</Button>
            <Button onClick={saveEditor} disabled={isUpdatingFavorite} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
              {isUpdatingFavorite ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
