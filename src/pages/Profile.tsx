import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Target, User } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { calculateGoalProgress, resolveInitialWeight, type GoalDirection } from "@/features/goals/goalProgress";
import { GOAL_OPTIONS } from "@/lib/metabolismOptions";
import {
  getGuestBodyMetrics,
  getGuestWeightGoal,
  listBodyMetricsByRange,
  saveGuestWeightGoal,
} from "@/services/bodyMetrics";
import ProfileCalibrationPanel from "@/components/profile/ProfileCalibrationPanel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatNumber = (n: number | null) => (n === null ? "--" : `${n.toFixed(1)} kg`);

const Profile = () => {
  const { profile, updateProfile, isGuest, user } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState<"low" | "moderate" | "high" | "very_high" | "hyperactive">("moderate");
  const [nutritionGoalType, setNutritionGoalType] = useState<"lose" | "lose_slow" | "maintain" | "gain_slow" | "gain">("maintain");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalDirection, setGoalDirection] = useState<GoalDirection>("lose");
  const [sleepGoalMinutes, setSleepGoalMinutes] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [carbGoal, setCarbGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const guestGoalHydrated = useRef(false);

  const { data: allEntriesFromDb = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, "fitness-profile-all"],
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
    if (!profile) return;

    setFullName(profile.full_name || "");
    setBirthDate(profile.birth_date || "");
    setWeight(profile.weight?.toString() || "");
    setHeight(profile.height?.toString() || "");
    setBiologicalSex((profile.biological_sex as "male" | "female" | null) ?? "male");
    setActivityLevel((profile.activity_level as "low" | "moderate" | "high" | "very_high" | "hyperactive" | null) ?? "moderate");
    setNutritionGoalType((profile.nutrition_goal_type as "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain" | null) ?? "maintain");
    setTargetWeight(profile.target_weight_kg ? String(profile.target_weight_kg) : "");
    setTargetDate(profile.target_date || "");
    setGoalDirection((profile.goal_direction as GoalDirection | null) ?? "lose");
    setSleepGoalMinutes(profile.sleep_goal_minutes?.toString() || "480");
    setCalorieGoal((profile as any).calorie_goal?.toString() || "2000");
    setProteinGoal((profile as any).protein_goal_g?.toString() || "150");
    setCarbGoal((profile as any).carb_goal_g?.toString() || "250");
    setFatGoal((profile as any).fat_goal_g?.toString() || "70");
  }, [profile]);

  const selectedGoal = useMemo(() => GOAL_OPTIONS.find((option) => option.value === nutritionGoalType), [nutritionGoalType]);
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

  const invalidateFitnessQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
      queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      queryClient.invalidateQueries({ queryKey: ["body_metrics"] }),
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
      queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
    ]);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedWeight = weight ? Number(weight) : null;
    const parsedHeight = height ? Number(height) : null;
    const parsedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00`) : null;
    const parsedTargetWeight = targetWeight ? Number(targetWeight) : null;
    const parsedSleepGoal = sleepGoalMinutes ? Number(sleepGoalMinutes) : 480;
    const parsedCalorieGoal = calorieGoal ? Number(calorieGoal) : 2000;
    const parsedProteinGoal = proteinGoal ? Number(proteinGoal) : 150;
    const parsedCarbGoal = carbGoal ? Number(carbGoal) : 250;
    const parsedFatGoal = fatGoal ? Number(fatGoal) : 70;

    if (parsedBirthDate && Number.isNaN(parsedBirthDate.getTime())) {
        toast.error("La fecha de nacimiento no es válida.");
      return;
    }
    if (parsedBirthDate) {
      const now = new Date();
      let age = now.getFullYear() - parsedBirthDate.getFullYear();
      const monthDiff = now.getMonth() - parsedBirthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsedBirthDate.getDate())) {
        age -= 1;
      }
      if (age < 12 || age > 95) {
        toast.error("La edad debe estar entre 12 y 95 años.");
        return;
      }
    }
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      toast.error("El peso debe ser mayor que 0.");
      return;
    }
    if (parsedHeight !== null && (!Number.isFinite(parsedHeight) || parsedHeight <= 0)) {
      toast.error("La altura debe ser mayor que 0.");
      return;
    }
    if (parsedTargetWeight !== null && (!Number.isFinite(parsedTargetWeight) || parsedTargetWeight < 20 || parsedTargetWeight > 400)) {
      toast.error("La meta de peso debe estar entre 20 y 400 kg.");
      return;
    }
    if (parsedTargetWeight !== null && !targetDate) {
      toast.error("La fecha objetivo es obligatoria si defines una meta de peso.");
      return;
    }
    if (!Number.isFinite(parsedSleepGoal) || parsedSleepGoal <= 0 || parsedSleepGoal > 1440) {
      toast.error("La meta de sueño debe estar entre 1 y 1440 minutos.");
      return;
    }
    if (!Number.isFinite(parsedCalorieGoal) || parsedCalorieGoal <= 0) {
      toast.error("La meta de calorías debe ser mayor que 0.");
      return;
    }
    if (!Number.isFinite(parsedProteinGoal) || parsedProteinGoal < 0) {
      toast.error("La meta de proteína no puede ser negativa.");
      return;
    }
    if (!Number.isFinite(parsedCarbGoal) || parsedCarbGoal < 0) {
      toast.error("La meta de carbs no puede ser negativa.");
      return;
    }
    if (!Number.isFinite(parsedFatGoal) || parsedFatGoal < 0) {
      toast.error("La meta de grasas no puede ser negativa.");
      return;
    }

    const baseline = profile?.start_weight_kg ?? latestWeight ?? initialWeight ?? profile?.weight ?? parsedTargetWeight;

    setIsSaving(true);
    try {
      const payload = {
        full_name: fullName,
        birth_date: birthDate || null,
        weight: parsedWeight,
        height: parsedHeight,
        biological_sex: biologicalSex,
        activity_level: activityLevel,
        nutrition_goal_type: nutritionGoalType,
        goal_type: selectedGoal?.legacyGoalTypeLabel ?? "Maintain Weight",
        target_weight_kg: parsedTargetWeight,
        target_date: parsedTargetWeight ? targetDate : null,
        start_weight_kg: parsedTargetWeight ? baseline : null,
        goal_direction: parsedTargetWeight ? goalDirection : null,
        sleep_goal_minutes: parsedSleepGoal,
        calorie_goal: parsedCalorieGoal,
        protein_goal_g: parsedProteinGoal,
        carb_goal_g: parsedCarbGoal,
        fat_goal_g: parsedFatGoal,
      } as any;

      await updateProfile(payload);

      if (isGuest) {
        saveGuestWeightGoal({
          target_weight_kg: parsedTargetWeight,
          target_date: parsedTargetWeight ? targetDate : null,
          start_weight_kg: parsedTargetWeight ? baseline : null,
          goal_direction: parsedTargetWeight ? goalDirection : null,
        });
      }

      await invalidateFitnessQueries();

      if (isGuest) {
        toast.info("Modo invitado: los cambios no se guardan de forma permanente.");
      } else {
        toast.success("Perfil fitness actualizado.");
      }
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar el perfil fitness.");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="container max-w-6xl space-y-5 py-6 md:space-y-6 md:py-8">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="app-surface-hero overflow-hidden rounded-[30px]">
          <CardContent className="grid gap-5 p-6 md:grid-cols-[auto_1fr]">
            <div className="flex items-start justify-center">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="app-surface-soft text-2xl">
                  {fullName ? getInitials(fullName) : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-4">
              <div>
                <div className="app-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                  <Flag className="h-3.5 w-3.5" />
                  Perfil Fitness
                </div>
                <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">{fullName || (isGuest ? "Usuario invitado" : "Mi plan metabólico")}</h1>
                <p className="app-surface-muted mt-2 text-sm">
                  Configura en una sola vista tus datos base, actividad, objetivo corporal, meta de peso y metas metabólicas.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="app-surface-tile rounded-2xl p-4">
                  <p className="app-surface-caption text-[11px] uppercase tracking-[0.22em]">Actual</p>
                  <p className="app-surface-heading mt-2 text-xl font-semibold">{formatNumber(latestWeight)}</p>
                </div>
                <div className="app-surface-tile rounded-2xl p-4">
                  <p className="app-surface-caption text-[11px] uppercase tracking-[0.22em]">Inicial</p>
                  <p className="app-surface-heading mt-2 text-xl font-semibold">{formatNumber(initialWeight)}</p>
                </div>
                <div className="app-surface-tile rounded-2xl p-4">
                  <p className="app-surface-caption text-[11px] uppercase tracking-[0.22em]">Objetivo</p>
                  <p className="app-surface-heading mt-2 text-xl font-semibold">{formatNumber(targetWeightValue)}</p>
                </div>
                <div className="app-surface-tile rounded-2xl p-4">
                  <p className="app-surface-caption text-[11px] uppercase tracking-[0.22em]">Progreso</p>
                  <p className="app-surface-heading mt-2 text-xl font-semibold">{progress === null ? "--" : `${progress.toFixed(0)}%`}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="app-surface-muted flex items-center justify-between text-xs uppercase tracking-[0.22em]">
                  <span>Meta de peso</span>
                  <span>Restante {remaining}</span>
                </div>
                <Progress value={progress ?? 0} className="app-progress-track h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Metas activas
            </CardTitle>
            <CardDescription>Resumen ejecutivo del plan actual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="app-panel-block rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Objetivo metabólico</p>
              <p className="mt-2 text-lg font-semibold">{selectedGoal?.label ?? "Mantener peso"}</p>
              <p className="text-sm text-muted-foreground">{selectedGoal?.description}</p>
            </div>
            <div className="app-panel-block rounded-2xl p-4 text-sm">
              <p>Sueño: {sleepGoalMinutes || "480"} min</p>
              <p>Calorías: {calorieGoal || "2000"} kcal</p>
              <p>Proteína: {proteinGoal || "150"} g</p>
              <p>Carbs: {carbGoal || "250"} g</p>
              <p>Grasas: {fatGoal || "70"} g</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del plan</CardTitle>
          <CardDescription>Todo tu modelo metabólico y tus metas en una sola pantalla.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="fitness-full-name">Nombre completo</Label>
              <Input
                id="fitness-full-name"
                placeholder="Ingresa tu nombre completo"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

            <ProfileCalibrationPanel
              birthDate={birthDate}
              onBirthDateChange={setBirthDate}
              biologicalSex={biologicalSex}
              onBiologicalSexChange={setBiologicalSex}
              weight={weight}
              onWeightChange={setWeight}
              height={height}
              onHeightChange={setHeight}
              activityLevel={activityLevel}
              onActivityLevelChange={setActivityLevel}
              nutritionGoalType={nutritionGoalType}
              onNutritionGoalTypeChange={setNutritionGoalType}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Objetivo de peso</CardTitle>
                  <CardDescription>Define la dirección, el peso meta y la fecha objetivo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="targetWeight">Peso objetivo (kg)</Label>
                      <Input id="targetWeight" type="number" min="20" max="400" step="0.1" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetDate">Fecha objetivo</Label>
                      <Input id="targetDate" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección de la meta</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Si dejas el peso objetivo vacío, el plan seguirá usando solo tus metas metabólicas diarias.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metas metabólicas</CardTitle>
                  <CardDescription>Calorías, macros y sueño objetivo del plan.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sleepGoal">Meta de sueño (min)</Label>
                    <Input id="sleepGoal" type="number" min="1" max="1440" value={sleepGoalMinutes} onChange={(event) => setSleepGoalMinutes(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calorieGoal">Calorías objetivo</Label>
                    <Input id="calorieGoal" type="number" min="1" value={calorieGoal} onChange={(event) => setCalorieGoal(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proteinGoal">Proteína objetivo (g)</Label>
                    <Input id="proteinGoal" type="number" min="0" value={proteinGoal} onChange={(event) => setProteinGoal(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbGoal">Carbs objetivo (g)</Label>
                    <Input id="carbGoal" type="number" min="0" value={carbGoal} onChange={(event) => setCarbGoal(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatGoal">Grasas objetivo (g)</Label>
                    <Input id="fatGoal" type="number" min="0" value={fatGoal} onChange={(event) => setFatGoal(event.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>

          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar perfil fitness"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
