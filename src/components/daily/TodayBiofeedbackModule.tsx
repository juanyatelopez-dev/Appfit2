import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { getBiofeedbackWeeklyAverages, getDailyBiofeedback, upsertDailyBiofeedback } from "@/services/dailyBiofeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const MetricInput = ({
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
  </div>
);

const TodayBiofeedbackModule = () => {
  const { user, isGuest, profile } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<BiofeedbackValues>(() => defaultValues());

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;

  const { data: todayData } = useQuery({
    queryKey: ["daily_biofeedback", user?.id, todayKey, isGuest, timeZone],
    queryFn: () => getDailyBiofeedback(user?.id ?? null, today, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: weeklyAverages } = useQuery({
    queryKey: ["daily_biofeedback_weekly", user?.id, todayKey, isGuest, timeZone],
    queryFn: () => getBiofeedbackWeeklyAverages(user?.id ?? null, today, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  useEffect(() => {
    if (!todayData) {
      setValues(defaultValues());
      setNotes("");
      return;
    }

    setValues({
      sleep_quality: todayData.sleep_quality,
      hunger_level: todayData.hunger_level,
      daily_energy: todayData.daily_energy,
      training_energy: todayData.training_energy,
      perceived_stress: todayData.perceived_stress,
      libido: todayData.libido,
      digestion: todayData.digestion,
    });
    setNotes(todayData.notes || "");
  }, [todayData]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      upsertDailyBiofeedback({
        userId: user?.id ?? null,
        date: today,
        isGuest,
        timeZone,
        notes: notes.trim() || null,
        ...values,
      }),
    onSuccess: async () => {
      setDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback"] }),
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_weekly"] }),
        queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_recent"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
      toast.success(todayData ? "Check-in fisiologico actualizado." : "Check-in fisiologico guardado.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo guardar el check-in.");
    },
  });

  return (
    <Card className="h-full rounded-[22px] border-border/50 bg-card/80 md:rounded-[24px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          Estado fisiologico
        </CardTitle>
        <CardDescription>Check-in subjetivo rapido para energia, estres y recuperacion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hoy</p>
            <p className="mt-2 text-sm text-foreground">
              Energia {todayData?.daily_energy ?? "--"}/10
              <br />
              Estres {todayData?.perceived_stress ?? "--"}/10
              <br />
              Sueño {todayData?.sleep_quality ?? "--"}/10
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Promedio 7d</p>
            <p className="mt-2 text-sm text-foreground">
              Energia {weeklyAverages?.avg_energy ?? 0}/10
              <br />
              Estres {weeklyAverages?.avg_stress ?? 0}/10
              <br />
              Sueño {weeklyAverages?.avg_sleep_quality ?? 0}/10
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
          <p className="text-sm text-muted-foreground">
            {todayData ? "Ya tienes check-in hoy. Puedes ajustarlo sin cambiar de pantalla." : "Aún no registras tu estado fisiológico de hoy."}
          </p>
          <Button className="mt-3" onClick={() => setDialogOpen(true)}>
            {todayData ? "Editar check-in" : "Registrar check-in"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Check-in fisiologico de hoy</DialogTitle>
            <DialogDescription>
              Registra tus sensaciones del dia para dejar contexto de recuperacion, estres y energia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricInput label="Calidad de sueño" value={values.sleep_quality} onChange={(next) => setValues((prev) => ({ ...prev, sleep_quality: next }))} />
            <MetricInput label="Hambre" value={values.hunger_level} onChange={(next) => setValues((prev) => ({ ...prev, hunger_level: next }))} />
            <MetricInput label="Energía diaria" value={values.daily_energy} onChange={(next) => setValues((prev) => ({ ...prev, daily_energy: next }))} />
            <MetricInput label="Energia entrenando" value={values.training_energy} onChange={(next) => setValues((prev) => ({ ...prev, training_energy: next }))} />
            <MetricInput label="Estres" value={values.perceived_stress} onChange={(next) => setValues((prev) => ({ ...prev, perceived_stress: next }))} />
            <MetricInput label="Digestion" value={values.digestion} onChange={(next) => setValues((prev) => ({ ...prev, digestion: next }))} />
            <MetricInput label="Libido" value={values.libido} onChange={(next) => setValues((prev) => ({ ...prev, libido: next }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="today-bio-notes">Notas</Label>
            <Textarea
              id="today-bio-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Contexto del día, molestias, sensaciones..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TodayBiofeedbackModule;
