import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  getGuestBodyMetrics,
  getGuestWeightGoal,
  listBodyMetricsByRange,
  saveGuestWeightGoal,
} from "@/services/bodyMetrics";
import { calculateGoalProgress, resolveInitialWeight, type GoalDirection } from "@/features/goals/goalProgress";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";

const formatNumber = (n: number | null) => (n === null ? "--" : `${n.toFixed(1)} kg`);

const Goals = () => {
  const { user, isGuest, profile, updateProfile } = useAuth();
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalDirection, setGoalDirection] = useState<GoalDirection>("lose");
  const guestGoalHydrated = useRef(false);

  const { data: allEntriesFromDb = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, "all"],
    queryFn: () => listBodyMetricsByRange(user?.id ?? null, "all", isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const allEntries = useMemo(
    () => (isGuest ? getGuestBodyMetrics().sort((a, b) => a.measured_at.localeCompare(b.measured_at)) : allEntriesFromDb),
    [allEntriesFromDb, isGuest],
  );

  useEffect(() => {
    if (!isGuest || guestGoalHydrated.current) return;
    const guestGoal = getGuestWeightGoal();
    updateProfile({
      target_weight_kg: guestGoal.target_weight_kg,
      target_date: guestGoal.target_date,
      start_weight_kg: guestGoal.start_weight_kg,
      goal_direction: guestGoal.goal_direction,
    });
    guestGoalHydrated.current = true;
  }, [isGuest, updateProfile]);

  useEffect(() => {
    setTargetWeight(profile?.target_weight_kg ? String(profile.target_weight_kg) : "");
    setTargetDate(profile?.target_date || "");
    setGoalDirection((profile?.goal_direction as GoalDirection) || "lose");
  }, [profile?.target_weight_kg, profile?.target_date, profile?.goal_direction]);

  const latestWeight = allEntries.length ? Number(allEntries[allEntries.length - 1].weight_kg) : null;
  const initialWeight = resolveInitialWeight(allEntries, profile?.weight ?? null);
  const targetWeightValue = profile?.target_weight_kg ?? null;
  const startWeightForProgress = profile?.start_weight_kg ?? initialWeight;
  const progress = calculateGoalProgress({
    start: startWeightForProgress,
    target: targetWeightValue,
    current: latestWeight,
    direction: (profile?.goal_direction as GoalDirection) ?? null,
  });

  const remaining =
    targetWeightValue !== null && latestWeight !== null ? `${(targetWeightValue - latestWeight).toFixed(1)} kg` : "--";

  const handleSaveGoal = async () => {
    const numericTarget = Number(targetWeight);
    if (!Number.isFinite(numericTarget) || numericTarget < 20 || numericTarget > 400) {
      toast.error("El peso objetivo debe estar entre 20 y 400 kg.");
      return;
    }
    if (!targetDate) {
      toast.error("La fecha objetivo es obligatoria.");
      return;
    }

    const baseline = profile?.start_weight_kg ?? latestWeight ?? initialWeight ?? profile?.weight ?? numericTarget;
    const payload = {
      target_weight_kg: numericTarget,
      target_date: targetDate,
      start_weight_kg: baseline,
      goal_direction: goalDirection,
    };

    try {
      await updateProfile(payload);
      if (isGuest) {
        saveGuestWeightGoal(payload);
        toast.info("Modo invitado: los cambios no se guardarán en tu cuenta.");
      } else {
        toast.success("Meta de peso guardada.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo guardar la meta."));
    }
  };

  return (
    <div className="container max-w-5xl space-y-5 py-6 md:space-y-6 md:py-8">
      {isGuest && <GuestWarningBanner />}

      <div className="flex items-center gap-3">
        <Target className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Objetivos</h1>
          <p className="text-sm text-muted-foreground">Crea y gestiona tu meta de peso.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progreso de meta</CardTitle>
          <CardDescription>Referencia: el peso inicial es el primer registro corporal; si no existe, se usa el del onboarding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-5">
            <div>
               <p className="text-muted-foreground">Actual</p>
              <p className="font-semibold">{formatNumber(latestWeight)}</p>
            </div>
            <div>
               <p className="text-muted-foreground">Inicial</p>
              <p className="font-semibold">{formatNumber(initialWeight)}</p>
            </div>
            <div>
               <p className="text-muted-foreground">Objetivo</p>
              <p className="font-semibold">{formatNumber(targetWeightValue)}</p>
            </div>
            <div>
               <p className="text-muted-foreground">Restante</p>
              <p className="font-semibold">{remaining}</p>
            </div>
            <div>
               <p className="text-muted-foreground">Progreso</p>
              <p className="font-semibold">{progress === null ? "--" : `${progress.toFixed(0)}%`}</p>
            </div>
          </div>
          <Progress value={progress ?? 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{targetWeightValue === null ? "Crear meta" : "Editar meta"}</CardTitle>
          <CardDescription>Define tu peso objetivo y fecha meta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Peso objetivo (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                min="20"
                max="400"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Fecha objetivo</Label>
              <Input id="targetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Direccion de la meta</Label>
            <Select value={goalDirection} onValueChange={(value: GoalDirection) => setGoalDirection(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">Bajar</SelectItem>
                <SelectItem value="gain">Subir</SelectItem>
                <SelectItem value="maintain">Mantener</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isGuest && <p className="text-xs text-amber-700">Modo invitado: los datos no se guardarán en tu cuenta.</p>}
          <Button onClick={handleSaveGoal}>Guardar meta</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Goals;
