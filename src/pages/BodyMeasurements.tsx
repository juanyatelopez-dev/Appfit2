import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Ruler } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { getLatestWeight } from "@/services/bodyMetrics";
import { addBodyMeasurement, getBodyMeasurementsRange, getLatestBodyMeasurement } from "@/services/bodyMeasurements";
import BodyMeasurementsCard from "@/components/dashboard/BodyMeasurementsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const toNullableNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const selectedDate = useMemo(() => new Date(`${dateKey}T12:00:00`), [dateKey]);

  const fromDate = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - 180);
    return from;
  }, []);

  const { data: latestWeightEntry } = useQuery({
    queryKey: ["weight_latest_for_measurements", user?.id, isGuest],
    queryFn: () => getLatestWeight(user?.id ?? null, isGuest),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: latestMeasurement } = useQuery({
    queryKey: ["body_measurements_latest", user?.id, isGuest],
    queryFn: () => getLatestBodyMeasurement(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: measurementRows = [] } = useQuery({
    queryKey: ["body_measurements_range", user?.id, fromDate.toISOString(), isGuest, timeZone],
    queryFn: () => getBodyMeasurementsRange(user?.id ?? null, fromDate, new Date(), { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const waistValue = Number(waist);
      const neckValue = Number(neck);
      if (!Number.isFinite(waistValue) || waistValue <= 0 || !Number.isFinite(neckValue) || neckValue <= 0) {
        throw new Error("Cintura y cuello son obligatorios.");
      }

      return addBodyMeasurement({
        userId: user?.id ?? null,
        date: selectedDate,
        waist_cm: waistValue,
        neck_cm: neckValue,
        hip_cm: toNullableNumber(hip),
        thigh_cm: toNullableNumber(thigh),
        arm_cm: toNullableNumber(arm),
        notes: notes.trim() || null,
        isGuest,
        timeZone,
        profileHeightCm: profile?.height ?? null,
        profileWeightKg: latestWeightEntry?.weight_kg ? Number(latestWeightEntry.weight_kg) : profile?.weight ?? null,
        biologicalSex: ((profile as any)?.biological_sex as "male" | "female" | null) ?? null,
      });
    },
    onSuccess: async () => {
      toast.success("Medidas guardadas.");
      setWaist("");
      setNeck("");
      setHip("");
      setThigh("");
      setArm("");
      setNotes("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["body_measurements_latest"] }),
        queryClient.invalidateQueries({ queryKey: ["body_measurements_range"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar la medicion.");
    },
  });

  const chartData = measurementRows
    .filter((row) => row.body_fat_pct !== null)
    .map((row) => ({
      date: row.date_key,
      body_fat_pct: Number(row.body_fat_pct),
    }));

  const sortedMeasurements = useMemo(() => [...measurementRows].sort((a, b) => a.date_key.localeCompare(b.date_key)), [measurementRows]);
  const latestMeasuredRow = latestMeasurement ?? sortedMeasurements.at(-1) ?? null;
  const previousMeasuredRow =
    latestMeasuredRow === null
      ? null
      : [...sortedMeasurements].reverse().find((row) => row.date_key < latestMeasuredRow.date_key) ?? null;
  const latestWeightKg =
    latestWeightEntry?.weight_kg !== null && latestWeightEntry?.weight_kg !== undefined
      ? Number(latestWeightEntry.weight_kg)
      : profile?.weight ?? null;
  const weeklyWaistDeltaCm =
    latestMeasuredRow && previousMeasuredRow
      ? Number((Number(latestMeasuredRow.waist_cm) - Number(previousMeasuredRow.waist_cm)).toFixed(1))
      : null;
  const goalDirection =
    profile?.goal_direction === "lose" || profile?.goal_direction === "gain" || profile?.goal_direction === "maintain"
      ? profile.goal_direction
      : null;

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Ruler className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Cuerpo</h1>
          <p className="text-sm text-muted-foreground">Perímetros semanales, composición corporal estimada y mapa visual de medidas.</p>
        </div>
      </div>

      <BodyMeasurementsCard
        latest={latestMeasuredRow}
        previous={previousMeasuredRow}
        latestWeight={latestWeightKg}
        weeklyWaistDeltaCm={weeklyWaistDeltaCm}
        goalDirection={goalDirection}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Grasa corporal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {latestMeasurement?.body_fat_pct !== null && latestMeasurement?.body_fat_pct !== undefined
                ? `${Number(latestMeasurement.body_fat_pct).toFixed(1)}%`
                : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Masa grasa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {latestMeasurement?.fat_mass_kg !== null && latestMeasurement?.fat_mass_kg !== undefined
                ? `${Number(latestMeasurement.fat_mass_kg).toFixed(1)} kg`
                : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Masa magra</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {latestMeasurement?.lean_mass_kg !== null && latestMeasurement?.lean_mass_kg !== undefined
                ? `${Number(latestMeasurement.lean_mass_kg).toFixed(1)} kg`
                : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registros (180d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{measurementRows.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva medición</CardTitle>
            <CardDescription>La fórmula Navy usa altura + perímetros para estimar % de grasa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="measurement-date">Fecha</Label>
              <Input id="measurement-date" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
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
                <Label htmlFor="hip">Cadera/Glúteo (cm)</Label>
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
              <Label htmlFor="measurement-notes">Notas (opcional)</Label>
              <Textarea
                id="measurement-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cambios percibidos, edema, sensaciones..."
              />
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Guardar medición
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia % grasa</CardTitle>
            <CardDescription>Historial de estimación Navy</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay datos suficientes.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                      formatter={(value: number) => [`${value}%`, "Grasa corporal"]}
                    />
                    <Line type="monotone" dataKey="body_fat_pct" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Ultimas mediciones corporales guardadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {measurementRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin mediciones registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cintura</TableHead>
                  <TableHead>Cuello</TableHead>
                  <TableHead>Cadera</TableHead>
                  <TableHead>Muslo</TableHead>
                  <TableHead>Brazo</TableHead>
                  <TableHead>% Grasa</TableHead>
                  <TableHead>Masa grasa</TableHead>
                  <TableHead>Masa magra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...measurementRows].reverse().map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date_key}</TableCell>
                    <TableCell>{Number(row.waist_cm).toFixed(1)} cm</TableCell>
                    <TableCell>{Number(row.neck_cm).toFixed(1)} cm</TableCell>
                    <TableCell>{row.hip_cm ? `${Number(row.hip_cm).toFixed(1)} cm` : "--"}</TableCell>
                    <TableCell>{row.thigh_cm ? `${Number(row.thigh_cm).toFixed(1)} cm` : "--"}</TableCell>
                    <TableCell>{row.arm_cm ? `${Number(row.arm_cm).toFixed(1)} cm` : "--"}</TableCell>
                    <TableCell>{row.body_fat_pct !== null ? `${Number(row.body_fat_pct).toFixed(1)}%` : "--"}</TableCell>
                    <TableCell>{row.fat_mass_kg !== null ? `${Number(row.fat_mass_kg).toFixed(1)} kg` : "--"}</TableCell>
                    <TableCell>{row.lean_mass_kg !== null ? `${Number(row.lean_mass_kg).toFixed(1)} kg` : "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BodyMeasurements;
