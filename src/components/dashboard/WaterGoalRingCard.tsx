import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Droplets, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { addWaterIntake } from "@/services/waterIntake";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";

type WaterGoalRingCardProps = {
  waterMl: number;
  goalMl: number;
  loading?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const WaterGoalRingCard = ({ waterMl, goalMl, loading = false }: WaterGoalRingCardProps) => {
  const queryClient = useQueryClient();
  const { user, isGuest, profile } = useAuth();
  const timeZone = profile?.timezone || DEFAULT_WATER_TIMEZONE;
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"ml" | "l">("ml");
  const today = useMemo(() => new Date(), []);

  const safeGoal = Math.max(1, Number(goalMl || 0));
  const safeWater = Math.max(0, Number(waterMl || 0));
  const progress = clamp((safeWater / safeGoal) * 100, 0, 100);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;
  const isGoalMet = safeWater >= safeGoal;

  const addWaterMutation = useMutation({
    mutationFn: (consumedMl: number) =>
      addWaterIntake({
        userId: user?.id ?? null,
        consumed_ml: consumedMl,
        date: today,
        timeZone,
        isGuest,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["water_day_total"] }),
        queryClient.invalidateQueries({ queryKey: ["water_logs_day"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "No se pudo registrar el agua."));
    },
  });

  const handleQuickCup = async () => {
    await addWaterMutation.mutateAsync(250);
    toast.success("+250 ml agregados.");
  };

  const handleAddCustom = async () => {
    const numeric = Number(customValue);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Ingresa una cantidad valida.");
      return;
    }
    const ml = customUnit === "l" ? Math.round(numeric * 1000) : Math.round(numeric);
    await addWaterMutation.mutateAsync(ml);
    setCustomOpen(false);
    setCustomValue("");
    setCustomUnit("ml");
    toast.success(`+${ml} ml agregados.`);
  };

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Agua hoy</p>
          <Droplets className={`h-4 w-4 ${isGoalMet ? "text-primary" : "text-muted-foreground"}`} />
        </div>

        <div className="relative mx-auto mb-3 flex h-40 w-40 items-center justify-center">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--muted) / 0.55)" strokeWidth="10" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              className="transition-all duration-500"
              style={{
                filter: isGoalMet ? "drop-shadow(0 0 10px hsl(var(--primary) / 0.45))" : "none",
              }}
            />
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-semibold leading-none">{loading ? "--" : `${safeWater} ml`}</p>
            <p className="mt-1 text-xs text-muted-foreground">de {safeGoal} ml</p>
            <p className="mt-1 text-xs font-medium text-primary">{Math.round(progress)}%</p>
          </div>
        </div>

        <p className="mb-3 text-center text-xs text-muted-foreground">Objetivo diario: {safeGoal} ml</p>

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={handleQuickCup} disabled={addWaterMutation.isPending || loading}>
            <Plus className="mr-1 h-4 w-4" />
            Vaso
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCustomOpen(true)} disabled={addWaterMutation.isPending || loading}>
            Personalizado
          </Button>
        </div>

        <Button asChild size="sm" variant="outline" className="w-full mt-2">
          <Link to="/water">Ir a Agua</Link>
        </Button>
      </CardContent>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar agua rapido</DialogTitle>
            <DialogDescription>
              Introduce una cantidad puntual para sumarla al consumo de agua del dia actual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              type="number"
              min="1"
              step="1"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Cantidad"
            />
            <Select value={customUnit} onValueChange={(value: "ml" | "l") => setCustomUnit(value)}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="l">L</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCustom} disabled={addWaterMutation.isPending}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WaterGoalRingCard;
