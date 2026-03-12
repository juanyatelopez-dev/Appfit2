import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleHelp, Pencil, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import {
  buildMeasurementChartData,
  buildMeasurementComparison,
  deriveMeasurementSummary,
  filterMeasurementsByRangePreset,
  type MeasurementMetricKey,
  type MeasurementRangePreset,
} from "@/features/bodyMeasurements/measurementInsights";
import { getAllBodyMetrics, resolveWeightReferenceFromEntries } from "@/services/bodyMetrics";
import {
  addBodyMeasurement,
  deleteBodyMeasurement,
  listBodyMeasurements,
  type BodyMeasurementWeightReference,
} from "@/services/bodyMeasurements";
import BodyMeasurementsCard from "@/components/dashboard/BodyMeasurementsCard";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const toNullableNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const RANGE_OPTIONS: Array<{ value: MeasurementRangePreset; label: string }> = [
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "180d", label: "180 dias" },
  { value: "all", label: "Todo" },
];

const METRIC_OPTIONS: Array<{ value: MeasurementMetricKey; label: string; unit: string }> = [
  { value: "body_fat_pct", label: "% grasa", unit: "%" },
  { value: "waist_cm", label: "Cintura", unit: "cm" },
  { value: "neck_cm", label: "Cuello", unit: "cm" },
  { value: "arm_cm", label: "Brazo", unit: "cm" },
  { value: "hip_cm", label: "Cadera", unit: "cm" },
  { value: "thigh_cm", label: "Muslo", unit: "cm" },
];

const formatWeightReference = (reference: BodyMeasurementWeightReference) => {
  if (reference.weightKg === null) return "Sin peso de referencia";
  if (reference.source === "closest_on_or_before" && reference.measuredAt) {
    return `Peso de referencia: ${reference.weightKg.toFixed(1)} kg (${reference.measuredAt})`;
  }
  if (reference.source === "latest_available" && reference.measuredAt) {
    return `Sin peso previo. Se usa el ultimo disponible: ${reference.weightKg.toFixed(1)} kg (${reference.measuredAt})`;
  }
  if (reference.source === "profile_fallback") {
    return `Sin registro de peso. Se usa el peso del perfil: ${reference.weightKg.toFixed(1)} kg`;
  }
  return `Peso de referencia: ${reference.weightKg.toFixed(1)} kg`;
};

const BodyMeasurements = () => {
  const { user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();

  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [hip, setHip] = useState("");
  const [thigh, setThigh] = useState("");
  const [arm, setArm] = useState("");
  const [notes, setNotes] = useState("");
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [editingOriginalDateKey, setEditingOriginalDateKey] = useState<string | null>(null);
  const [rangePreset, setRangePreset] = useState<MeasurementRangePreset>("180d");
  const [chartMetric, setChartMetric] = useState<MeasurementMetricKey>("body_fat_pct");
  const [compareFromKey, setCompareFromKey] = useState<string>("");
  const [compareToKey, setCompareToKey] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; dateKey: string } | null>(null);

  const timeZone = (profile as { timezone?: string; weight?: number | null; height?: number | null; goal_direction?: string | null } | null)
    ?.timezone || DEFAULT_WATER_TIMEZONE;
  const selectedDate = useMemo(() => new Date(`${dateKey}T12:00:00`), [dateKey]);

  const { data: measurementRows = [], isLoading } = useQuery({
    queryKey: ["body_measurements_all", user?.id, isGuest],
    queryFn: () => listBodyMeasurements(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: weightEntries = [] } = useQuery({
    queryKey: ["body_metrics_all", user?.id, isGuest, "measurements-module"],
    queryFn: () => getAllBodyMetrics(user?.id ?? null, isGuest),
    enabled: Boolean(user?.id) || isGuest,
  });

  const summary = useMemo(() => deriveMeasurementSummary(measurementRows), [measurementRows]);
  const visibleMeasurements = useMemo(
    () => filterMeasurementsByRangePreset(measurementRows, rangePreset),
    [measurementRows, rangePreset],
  );

  const latestWeightReference = useMemo(() => {
    if (!summary.latest) {
      return { weightKg: null, source: null, measuredAt: null } as BodyMeasurementWeightReference;
    }
    const reference = resolveWeightReferenceFromEntries(weightEntries, summary.latest.date_key);
    if (reference.entry) {
      return {
        weightKg: Number(reference.entry.weight_kg),
        source: reference.source,
        measuredAt: reference.entry.measured_at,
      } as BodyMeasurementWeightReference;
    }
    if (profile?.weight !== null && profile?.weight !== undefined) {
      return {
        weightKg: Number(profile.weight),
        source: "profile_fallback",
        measuredAt: null,
      } as BodyMeasurementWeightReference;
    }
    return { weightKg: null, source: null, measuredAt: null } as BodyMeasurementWeightReference;
  }, [profile?.weight, summary.latest, weightEntries]);

  const bodyMetricCards = [
    {
      title: "Grasa corporal",
      value:
        summary.latest?.body_fat_pct !== null && summary.latest?.body_fat_pct !== undefined
          ? `${Number(summary.latest.body_fat_pct).toFixed(1)}%`
          : "--",
      description: "Porcentaje del peso total que corresponde a grasa corporal.",
      formula: "Masa grasa (kg) / peso total (kg) x 100",
    },
    {
      title: "Grasa total",
      value:
        summary.latest?.fat_mass_kg !== null && summary.latest?.fat_mass_kg !== undefined
          ? `${Number(summary.latest.fat_mass_kg).toFixed(1)} kg`
          : "--",
      description: "Cantidad estimada de grasa corporal expresada en kilos.",
      formula: "Peso total (kg) x grasa corporal (%) / 100",
    },
    {
      title: "Peso libre de grasa",
      value:
        summary.latest?.lean_mass_kg !== null && summary.latest?.lean_mass_kg !== undefined
          ? `${Number(summary.latest.lean_mass_kg).toFixed(1)} kg`
          : "--",
      description: "Todo lo que no es grasa: musculo, agua, hueso y organos.",
      formula: "Peso total (kg) - masa grasa (kg)",
    },
    {
      title: "Registros",
      value: String(measurementRows.length),
      description: "Cantidad de mediciones guardadas para comparar tu evolucion.",
      formula: "Conteo total de mediciones historicas registradas",
    },
  ] as const;

  const selectedWeightReference = useMemo(() => {
    const reference = resolveWeightReferenceFromEntries(weightEntries, dateKey);
    if (reference.entry) {
      return {
        weightKg: Number(reference.entry.weight_kg),
        source: reference.source,
        measuredAt: reference.entry.measured_at,
      } as BodyMeasurementWeightReference;
    }
    if (profile?.weight !== null && profile?.weight !== undefined) {
      return {
        weightKg: Number(profile.weight),
        source: "profile_fallback",
        measuredAt: null,
      } as BodyMeasurementWeightReference;
    }
    return { weightKg: null, source: null, measuredAt: null } as BodyMeasurementWeightReference;
  }, [dateKey, profile?.weight, weightEntries]);

  const chartConfig = METRIC_OPTIONS.find((metric) => metric.value === chartMetric) ?? METRIC_OPTIONS[0];
  const chartData = useMemo(() => buildMeasurementChartData(visibleMeasurements, chartMetric), [chartMetric, visibleMeasurements]);
  const measurementDateOptions = useMemo(
    () => [...measurementRows].sort((a, b) => b.date_key.localeCompare(a.date_key)).map((row) => row.date_key),
    [measurementRows],
  );
  const comparison = useMemo(
    () => buildMeasurementComparison(measurementRows, compareFromKey || null, compareToKey || null),
    [compareFromKey, compareToKey, measurementRows],
  );

  useEffect(() => {
    if (measurementDateOptions.length === 0) {
      setCompareFromKey("");
      setCompareToKey("");
      return;
    }

    setCompareToKey((current) => (current && measurementDateOptions.includes(current) ? current : measurementDateOptions[0]));
    setCompareFromKey((current) =>
      current && measurementDateOptions.includes(current)
        ? current
        : measurementDateOptions[Math.min(1, measurementDateOptions.length - 1)] ?? measurementDateOptions[0],
    );
  }, [measurementDateOptions]);

  const saveMutation = useMutation({
    mutationFn: () =>
      addBodyMeasurement({
        userId: user?.id ?? null,
        date: selectedDate,
        waist_cm: Number(waist),
        neck_cm: Number(neck),
        hip_cm: toNullableNumber(hip),
        thigh_cm: toNullableNumber(thigh),
        arm_cm: toNullableNumber(arm),
        notes: notes.trim() || null,
        isGuest,
        timeZone,
        profileHeightCm: profile?.height ?? null,
        profileWeightKg: profile?.weight ?? null,
        biologicalSex: ((profile as { biological_sex?: "male" | "female" | null } | null)?.biological_sex as
          | "male"
          | "female"
          | null) ?? null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["body_measurements_all"] }),
        queryClient.invalidateQueries({ queryKey: ["body_measurements_latest"] }),
        queryClient.invalidateQueries({ queryKey: ["body_measurements_range"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_latest_measurement"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_measurements_range"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBodyMeasurement(id, user?.id ?? null, { isGuest }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["body_measurements_all"] }),
        queryClient.invalidateQueries({ queryKey: ["body_measurements_latest"] }),
        queryClient.invalidateQueries({ queryKey: ["body_measurements_range"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_latest_measurement"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_measurements_range"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
  });

  const resetForm = () => {
    setDateKey(toDateKey(new Date()));
    setWaist("");
    setNeck("");
    setHip("");
    setThigh("");
    setArm("");
    setNotes("");
    setEditingMeasurementId(null);
    setEditingOriginalDateKey(null);
  };

  const handleSave = async () => {
    const waistValue = Number(waist);
    const neckValue = Number(neck);
    if (!Number.isFinite(waistValue) || waistValue <= 0 || !Number.isFinite(neckValue) || neckValue <= 0) {
      toast.error("Cintura y cuello son obligatorios.");
      return;
    }

    try {
      await saveMutation.mutateAsync();

      if (editingMeasurementId && editingOriginalDateKey && editingOriginalDateKey !== dateKey) {
        await deleteMutation.mutateAsync(editingMeasurementId);
      }

      toast.success(editingMeasurementId ? "Medicion actualizada." : "Medicion guardada.");
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar la medicion.");
    }
  };

  const handleEdit = (row: (typeof measurementRows)[number]) => {
    setEditingMeasurementId(row.id);
    setEditingOriginalDateKey(row.date_key);
    setDateKey(row.date_key);
    setWaist(String(row.waist_cm));
    setNeck(String(row.neck_cm));
    setHip(row.hip_cm ? String(row.hip_cm) : "");
    setThigh(row.thigh_cm ? String(row.thigh_cm) : "");
    setArm(row.arm_cm ? String(row.arm_cm) : "");
    setNotes(row.notes || "");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Medicion eliminada.");
      if (editingMeasurementId === deleteTarget.id) {
        resetForm();
      }
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar la medicion.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="container max-w-6xl space-y-5 py-6 md:space-y-6 md:py-8">
      {isGuest && <GuestWarningBanner />}

      <div className="flex items-center gap-3">
        <Ruler className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Cuerpo</h1>
          <p className="text-sm text-muted-foreground">Perimetros, composicion corporal estimada y comparativas de progreso.</p>
        </div>
      </div>

      <TooltipProvider delayDuration={120}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <BodyMeasurementsCard
            latest={summary.latest}
            previous={summary.previous}
            latestWeight={latestWeightReference.weightKg}
            waistComparison={summary.waistComparison}
            goalDirection={
              profile?.goal_direction === "lose" || profile?.goal_direction === "gain" || profile?.goal_direction === "maintain"
                ? profile.goal_direction
                : null
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:sticky xl:top-6">
            {bodyMetricCards.map((item) => (
              <Card key={item.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-sm">{item.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs">{item.description}</CardDescription>
                    </div>
                    <UiTooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                          aria-label={`Ver formula de ${item.title}`}
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        <p className="text-xs font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.formula}</p>
                      </TooltipContent>
                    </UiTooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold md:text-2xl">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editingMeasurementId ? "Editar medicion" : "Nueva medicion"}</CardTitle>
            <CardDescription>Se usa el peso mas cercano a la fecha. Si no existe, se toma el ultimo disponible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="measurement-date">Fecha</Label>
              <Input id="measurement-date" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
              {formatWeightReference(selectedWeightReference)}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="waist">Cintura (cm)</Label>
                <Input id="waist" type="number" step="0.1" value={waist} onChange={(e) => setWaist(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="neck">Cuello (cm)</Label>
                <Input id="neck" type="number" step="0.1" value={neck} onChange={(e) => setNeck(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hip">Cadera/Gluteo (cm)</Label>
                <Input id="hip" type="number" step="0.1" value={hip} onChange={(e) => setHip(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="thigh">Muslo (cm)</Label>
                <Input id="thigh" type="number" step="0.1" value={thigh} onChange={(e) => setThigh(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="arm">Brazo (cm)</Label>
                <Input id="arm" type="number" step="0.1" value={arm} onChange={(e) => setArm(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="measurement-notes">Notas</Label>
              <Textarea
                id="measurement-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cambios percibidos, edema, sensaciones o contexto de la medicion..."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending || deleteMutation.isPending}>
                {editingMeasurementId ? "Actualizar medicion" : "Guardar medicion"}
              </Button>
              {editingMeasurementId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar edicion
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Progreso</CardTitle>
              <CardDescription>Una sola grafica, varias metricas para no saturar la pantalla.</CardDescription>
            </div>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={chartMetric}
              onChange={(event) => setChartMetric(event.target.value as MeasurementMetricKey)}
            >
              {METRIC_OPTIONS.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay datos suficientes para {chartConfig.label.toLowerCase()}.</p>
            ) : (
              <div className="h-[220px] w-full md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(String(value)).toLocaleDateString()}
                      formatter={(value: number) => [`${value}${chartConfig.unit}`, chartConfig.label]}
                    />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparacion libre</CardTitle>
          <CardDescription>Compara cualquier par de fechas guardadas y revisa el cambio por perimetro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="compare-from">Fecha inicial</Label>
              <select
                id="compare-from"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={compareFromKey}
                onChange={(event) => setCompareFromKey(event.target.value)}
              >
                {measurementDateOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compare-to">Fecha final</Label>
              <select
                id="compare-to"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={compareToKey}
                onChange={(event) => setCompareToKey(event.target.value)}
              >
                {measurementDateOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!comparison.from || !comparison.to ? (
            <p className="text-sm text-muted-foreground">Necesitas al menos dos mediciones para comparar.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-5">
              {comparison.rows.map((row) => (
                <div key={row.key} className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="mt-2 text-sm">{row.from !== null ? `${row.from.toFixed(1)} cm` : "--"}</p>
                  <p className="text-sm">{row.to !== null ? `${row.to.toFixed(1)} cm` : "--"}</p>
                  <p className="mt-2 text-lg font-semibold">
                    {row.delta === null ? "--" : `${row.delta > 0 ? "+" : ""}${row.delta.toFixed(1)} cm`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Historial</CardTitle>
            <CardDescription>Notas visibles, edicion rapida y eliminacion individual.</CardDescription>
          </div>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={rangePreset}
            onChange={(event) => setRangePreset(event.target.value as MeasurementRangePreset)}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando mediciones...</p>
          ) : visibleMeasurements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin mediciones para el rango seleccionado.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {[...visibleMeasurements].reverse().map((row) => (
                  <div key={row.id} className="rounded-2xl border p-4">
                    <div className="font-semibold">{row.date_key}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl border px-3 py-2">Cintura {Number(row.waist_cm).toFixed(1)} cm</div>
                      <div className="rounded-xl border px-3 py-2">Cuello {Number(row.neck_cm).toFixed(1)} cm</div>
                      <div className="rounded-xl border px-3 py-2">Cadera {row.hip_cm ? `${Number(row.hip_cm).toFixed(1)} cm` : "--"}</div>
                      <div className="rounded-xl border px-3 py-2">Muslo {row.thigh_cm ? `${Number(row.thigh_cm).toFixed(1)} cm` : "--"}</div>
                      <div className="rounded-xl border px-3 py-2">Brazo {row.arm_cm ? `${Number(row.arm_cm).toFixed(1)} cm` : "--"}</div>
                      <div className="rounded-xl border px-3 py-2">% grasa {row.body_fat_pct !== null ? `${Number(row.body_fat_pct).toFixed(1)}%` : "--"}</div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{row.notes?.trim() ? row.notes : "--"}</p>
                    <div className="mt-4 grid gap-2">
                      <Button className="w-full" size="sm" variant="outline" onClick={() => handleEdit(row)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button className="w-full" size="sm" variant="destructive" onClick={() => setDeleteTarget({ id: row.id, dateKey: row.date_key })}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
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
                      <TableHead>Cintura</TableHead>
                      <TableHead>Cuello</TableHead>
                      <TableHead>Cadera</TableHead>
                      <TableHead>Muslo</TableHead>
                      <TableHead>Brazo</TableHead>
                      <TableHead>% grasa</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...visibleMeasurements].reverse().map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.date_key}</TableCell>
                        <TableCell>{Number(row.waist_cm).toFixed(1)} cm</TableCell>
                        <TableCell>{Number(row.neck_cm).toFixed(1)} cm</TableCell>
                        <TableCell>{row.hip_cm ? `${Number(row.hip_cm).toFixed(1)} cm` : "--"}</TableCell>
                        <TableCell>{row.thigh_cm ? `${Number(row.thigh_cm).toFixed(1)} cm` : "--"}</TableCell>
                        <TableCell>{row.arm_cm ? `${Number(row.arm_cm).toFixed(1)} cm` : "--"}</TableCell>
                        <TableCell>{row.body_fat_pct !== null ? `${Number(row.body_fat_pct).toFixed(1)}%` : "--"}</TableCell>
                        <TableCell className="max-w-[280px] whitespace-normal text-sm text-muted-foreground">
                          {row.notes?.trim() ? row.notes : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ id: row.id, dateKey: row.date_key })}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Eliminar
                            </Button>
                          </div>
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
            <AlertDialogTitle>Eliminar medicion</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Se eliminara la medicion del ${deleteTarget.dateKey}. Esta accion no se puede deshacer.` : ""}
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

export default BodyMeasurements;
