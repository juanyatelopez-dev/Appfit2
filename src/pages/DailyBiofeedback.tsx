import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import {
  getBiofeedbackWeeklyAverages,
  getDailyBiofeedback,
  listRecentBiofeedback,
  upsertDailyBiofeedback,
} from "@/services/dailyBiofeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

type BiofeedbackValues = {
  sleep_quality: number;
  hunger_level: number;
  daily_energy: number;
  training_energy: number;
  perceived_stress: number;
  libido: number;
  digestion: number;
};

const defaultValues = (): BiofeedbackValues => ({
  sleep_quality: 5,
  hunger_level: 5,
  daily_energy: 5,
  training_energy: 5,
  perceived_stress: 5,
  libido: 5,
  digestion: 5,
});

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const MetricRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <span className="text-sm font-semibold">{value}/10</span>
    </div>
    <Slider min={1} max={10} step={1} value={[value]} onValueChange={(next) => onChange(next[0] ?? value)} />
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 10 }).map((_, idx) => {
        const score = idx + 1;
        return (
          <Button
            key={`${label}-${score}`}
            type="button"
            variant={value === score ? "default" : "outline"}
            size="sm"
            className="px-0"
            onClick={() => onChange(score)}
          >
            {score}
          </Button>
        );
      })}
    </div>
  </div>
);

const DailyBiofeedback = () => {
  const { user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  const dateFromQuery = useMemo(() => {
    const value = new URLSearchParams(location.search).get("date");
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }, [location.search]);

  const [selectedDateKey, setSelectedDateKey] = useState(() => dateFromQuery ?? toDateKey(new Date()));
  const [values, setValues] = useState<BiofeedbackValues>(() => defaultValues());
  const [notes, setNotes] = useState("");

  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const selectedDate = useMemo(() => new Date(`${selectedDateKey}T12:00:00`), [selectedDateKey]);

  useEffect(() => {
    if (dateFromQuery && dateFromQuery !== selectedDateKey) {
      setSelectedDateKey(dateFromQuery);
    }
  }, [dateFromQuery, selectedDateKey]);

  const { data: dayData, isLoading } = useQuery({
    queryKey: ["daily_biofeedback", user?.id, selectedDateKey, isGuest, timeZone],
    queryFn: () => getDailyBiofeedback(user?.id ?? null, selectedDate, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: weeklyAverages } = useQuery({
    queryKey: ["daily_biofeedback_weekly", user?.id, selectedDateKey, isGuest, timeZone],
    queryFn: () => getBiofeedbackWeeklyAverages(user?.id ?? null, selectedDate, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: recentRows = [] } = useQuery({
    queryKey: ["daily_biofeedback_recent", user?.id, isGuest],
    queryFn: () => listRecentBiofeedback(user?.id ?? null, 7, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  useEffect(() => {
    if (!dayData) {
      setValues(defaultValues());
      setNotes("");
      return;
    }
    setValues({
      sleep_quality: dayData.sleep_quality,
      hunger_level: dayData.hunger_level,
      daily_energy: dayData.daily_energy,
      training_energy: dayData.training_energy,
      perceived_stress: dayData.perceived_stress,
      libido: dayData.libido,
      digestion: dayData.digestion,
    });
    setNotes(dayData.notes || "");
  }, [dayData]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      upsertDailyBiofeedback({
        userId: user?.id ?? null,
        date: selectedDate,
        isGuest,
        timeZone,
        notes: notes.trim() || null,
        ...values,
      }),
    onSuccess: async () => {
      toast.success("Check-in guardado.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback"] }),
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_weekly"] }),
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_recent"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_day_biofeedback"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar el check-in.");
    },
  });

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <HeartPulse className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Daily Biofeedback Check-in</h1>
          <p className="text-sm text-muted-foreground">Escala subjetiva 1-10 para estado fisiológico diario.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Energia (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{weeklyAverages?.avg_energy ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estres (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{weeklyAverages?.avg_stress ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sueño (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{weeklyAverages?.avg_sleep_quality ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dias con check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{weeklyAverages?.days_logged ?? 0}/7</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Check-in diario</CardTitle>
            <CardDescription>Completa en menos de 1 minuto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="biofeedback-date">Fecha</Label>
              <Input
                id="biofeedback-date"
                type="date"
                value={selectedDateKey}
                onChange={(e) => setSelectedDateKey(e.target.value)}
              />
            </div>

            <MetricRow
              label="Calidad de sueño"
              value={values.sleep_quality}
              onChange={(next) => setValues((prev) => ({ ...prev, sleep_quality: next }))}
            />
            <MetricRow
              label="Nivel de hambre"
              value={values.hunger_level}
              onChange={(next) => setValues((prev) => ({ ...prev, hunger_level: next }))}
            />
            <MetricRow
              label="Energía diaria"
              value={values.daily_energy}
              onChange={(next) => setValues((prev) => ({ ...prev, daily_energy: next }))}
            />
            <MetricRow
              label="Energia en entrenamiento"
              value={values.training_energy}
              onChange={(next) => setValues((prev) => ({ ...prev, training_energy: next }))}
            />
            <MetricRow
              label="Estres percibido"
              value={values.perceived_stress}
              onChange={(next) => setValues((prev) => ({ ...prev, perceived_stress: next }))}
            />
            <MetricRow
              label="Libido"
              value={values.libido}
              onChange={(next) => setValues((prev) => ({ ...prev, libido: next }))}
            />
            <MetricRow
              label="Digestion"
              value={values.digestion}
              onChange={(next) => setValues((prev) => ({ ...prev, digestion: next }))}
            />

            <div className="space-y-2">
              <Label htmlFor="biofeedback-notes">Notas (opcional)</Label>
              <Textarea
                id="biofeedback-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sensaciones, molestias, contexto..."
              />
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading}>
              Guardar check-in
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos check-ins</CardTitle>
            <CardDescription>Historial rapido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin registros aun.</p>
            ) : (
              recentRows.map((row) => (
                <div key={row.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{row.date_key}</p>
                  <p className="text-muted-foreground">
                    Energía {row.daily_energy}/10 | Estrés {row.perceived_stress}/10 | Sueño {row.sleep_quality}/10
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DailyBiofeedback;
