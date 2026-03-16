import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scale } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
  BodyMetricEntry,
  deleteBodyMetric,
  getGuestBodyMetrics,
  getWeightTrendAnalysis,
  listBodyMetrics,
  saveGuestBodyMetrics,
  upsertBodyMetric,
} from "@/services/bodyMetrics";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";

const todayISO = () => new Date().toISOString().slice(0, 10);

const BodyWeight = () => {
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();

  const [measuredAt, setMeasuredAt] = useState(todayISO());
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingOriginalDate, setEditingOriginalDate] = useState<string | null>(null);
  const [guestEntries, setGuestEntries] = useState<BodyMetricEntry[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<BodyMetricEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["body_metrics", user?.id],
    queryFn: () => listBodyMetrics(user?.id ?? null, isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });
  const { data: trendAnalysis } = useQuery({
    queryKey: ["body_metrics_trend", user?.id, isGuest],
    queryFn: () => getWeightTrendAnalysis(user?.id ?? null, isGuest),
    enabled: Boolean(user?.id) || isGuest,
  });

  useEffect(() => {
    if (!isGuest) return;
    setGuestEntries(getGuestBodyMetrics());
  }, [isGuest]);

  const displayedEntries = isGuest ? guestEntries : entries;

  const saveMutation = useMutation({
    mutationFn: async (payload: { measured_at: string; weight_kg: number; notes: string | null }) => {
      if (isGuest) return null;
      return upsertBodyMetric({
        userId: user?.id ?? null,
        isGuest,
        measured_at: payload.measured_at,
        weight_kg: payload.weight_kg,
        notes: payload.notes,
      });
    },
    onSuccess: async () => {
      if (!isGuest && user?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["body_metrics", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["body_metrics_trend"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
          queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
          queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
          queryClient.invalidateQueries({ queryKey: ["stats"] }),
        ]);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) return;
      await deleteBodyMetric(id, user?.id ?? null, isGuest);
    },
    onSuccess: async () => {
      if (!isGuest && user?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["body_metrics", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["body_metrics_trend"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
          queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
          queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
          queryClient.invalidateQueries({ queryKey: ["stats"] }),
        ]);
      }
    },
  });

  const resetForm = () => {
    setMeasuredAt(todayISO());
    setWeightKg("");
    setNotes("");
    setEditingEntryId(null);
    setEditingOriginalDate(null);
  };

  const validate = () => {
    const numericWeight = Number(weightKg);
    if (!measuredAt) {
      toast.error("La fecha es obligatoria.");
      return null;
    }
    if (!Number.isFinite(numericWeight) || numericWeight < 20 || numericWeight > 400) {
      toast.error("El peso debe estar entre 20 y 400 kg.");
      return null;
    }
    return numericWeight;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericWeight = validate();
    if (numericWeight === null) return;

    try {
      if (isGuest) {
        let nextEntries = [...guestEntries];

        if (editingEntryId) {
          nextEntries = nextEntries.filter((entry) => entry.id !== editingEntryId);
        }

        const sameDayIdx = nextEntries.findIndex((entry) => entry.measured_at === measuredAt);
        const localEntry: BodyMetricEntry = {
          id: editingEntryId || crypto.randomUUID(),
          user_id: "guest",
          measured_at: measuredAt,
          weight_kg: numericWeight,
          notes: notes || null,
          created_at: new Date().toISOString(),
        };

        if (sameDayIdx >= 0) {
          nextEntries[sameDayIdx] = localEntry;
        } else {
          nextEntries.push(localEntry);
        }

        nextEntries.sort((a, b) => b.measured_at.localeCompare(a.measured_at));
        setGuestEntries(nextEntries);
        saveGuestBodyMetrics(nextEntries);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["body_metrics_trend"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
          queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
          queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
          queryClient.invalidateQueries({ queryKey: ["stats"] }),
        ]);
        toast.info("Modo invitado: los registros de peso no se guardarán en tu cuenta.");
        resetForm();
        return;
      }

      await saveMutation.mutateAsync({
        measured_at: measuredAt,
        weight_kg: numericWeight,
        notes: notes || null,
      });

      if (editingEntryId && editingOriginalDate && editingOriginalDate !== measuredAt) {
        await deleteMutation.mutateAsync(editingEntryId);
      }

      toast.success("Registro de peso guardado.");
      resetForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo guardar el registro de peso."));
    }
  };

  const handleEdit = (entry: BodyMetricEntry) => {
    setEditingEntryId(entry.id);
    setEditingOriginalDate(entry.measured_at);
    setMeasuredAt(entry.measured_at);
    setWeightKg(String(entry.weight_kg));
    setNotes(entry.notes || "");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (isGuest) {
        const nextEntries = guestEntries.filter((entry) => entry.id !== deleteTarget.id);
        setGuestEntries(nextEntries);
        saveGuestBodyMetrics(nextEntries);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["body_metrics_trend"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
          queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
          queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
          queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
          queryClient.invalidateQueries({ queryKey: ["stats"] }),
        ]);
      } else {
        await deleteMutation.mutateAsync(deleteTarget.id);
      }
      toast.success("Registro de peso eliminado.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo eliminar el registro de peso."));
    } finally {
      setDeleteTarget(null);
    }
  };

  const latestWeight = useMemo(() => displayedEntries[0]?.weight_kg ?? null, [displayedEntries]);
  const trendLabel = useMemo(() => {
    if (!trendAnalysis) return "Sin datos";
    if (trendAnalysis.trend === "up") return "Subiendo";
    if (trendAnalysis.trend === "down") return "Bajando";
    return "Estable";
  }, [trendAnalysis]);

  return (
    <div className="container max-w-4xl space-y-5 py-6 md:space-y-6 md:py-8">
      {isGuest && <GuestWarningBanner />}

      <div className="flex items-center gap-3">
        <Scale className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Peso</h1>
          <p className="text-sm text-muted-foreground">
            Sigue la evolucion de tu peso corporal.
            {latestWeight !== null ? ` Ultimo: ${latestWeight} kg` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Media móvil 7d:{" "}
            {trendAnalysis?.movingAvg7 === null || trendAnalysis?.movingAvg7 === undefined
              ? "--"
              : `${trendAnalysis.movingAvg7.toFixed(2)} kg`}{" "}
            | Cambio semanal:{" "}
            {trendAnalysis?.weeklyChange === null || trendAnalysis?.weeklyChange === undefined
              ? "--"
              : `${trendAnalysis.weeklyChange > 0 ? "+" : ""}${trendAnalysis.weeklyChange.toFixed(2)} kg`}{" "}
            | Tendencia: {trendLabel}
          </p>
          {isGuest && (
            <p className="text-xs text-amber-700 mt-1">Modo invitado: los registros de peso no se guardarán en tu cuenta.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promedio movil 7d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold md:text-2xl">
              {trendAnalysis?.movingAvg7 === null || trendAnalysis?.movingAvg7 === undefined
                ? "--"
                : `${trendAnalysis.movingAvg7.toFixed(2)} kg`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cambio semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold md:text-2xl">
              {trendAnalysis?.weeklyChange === null || trendAnalysis?.weeklyChange === undefined
                ? "--"
                : `${trendAnalysis.weeklyChange > 0 ? "+" : ""}${trendAnalysis.weeklyChange.toFixed(2)} kg`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Clasificacion de tendencia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold md:text-2xl">{trendLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingEntryId ? "Editar registro" : "Agregar registro"}</CardTitle>
          <CardDescription>Guarda un registro por día.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="measuredAt">Fecha</Label>
                <Input
                  id="measuredAt"
                  type="date"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weightKg">Peso (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como te sentiste hoy?"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saveMutation.isPending || deleteMutation.isPending}>
                {editingEntryId ? "Actualizar registro" : "Guardar registro"}
              </Button>
              {editingEntryId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar edicion
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !isGuest ? (
            <p className="text-sm text-muted-foreground">Cargando registros...</p>
          ) : displayedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay registros.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {displayedEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border p-4">
                    <div className="font-semibold">{entry.measured_at}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{entry.weight_kg} kg</div>
                    <p className="mt-3 text-sm text-muted-foreground">{entry.notes || "-"}</p>
                    <div className="mt-4 grid gap-2">
                      <Button className="w-full" size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                        Editar
                      </Button>
                      <Button className="w-full" size="sm" variant="destructive" onClick={() => setDeleteTarget(entry)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.measured_at}</TableCell>
                        <TableCell>{entry.weight_kg} kg</TableCell>
                        <TableCell>{entry.notes || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(entry)}>
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registro de peso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BodyWeight;
