import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from "@/lib/metabolismOptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const calculateAge = (birthDate: string) => {
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
};

const Onboarding = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, isGuest, updateProfile, completeOnboarding } = useAuth();

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState<"low" | "moderate" | "high" | "very_high" | "hyperactive">("moderate");
  const [nutritionGoalType, setNutritionGoalType] = useState<"lose" | "lose_slow" | "maintain" | "gain_slow" | "gain">("maintain");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setFullName(profile.full_name ?? "");
    setBirthDate(profile.birth_date ?? "");
    setWeightKg(profile.weight !== null && profile.weight !== undefined ? String(profile.weight) : "");
    setHeightCm(profile.height !== null && profile.height !== undefined ? String(profile.height) : "");
    setBiologicalSex((profile.biological_sex as "male" | "female" | null) ?? "male");
    setActivityLevel((profile.activity_level as "low" | "moderate" | "high" | "very_high" | "hyperactive" | null) ?? "moderate");
    setNutritionGoalType((profile.nutrition_goal_type as "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain" | null) ?? "maintain");
  }, [profile]);

  const selectedActivity = useMemo(() => ACTIVITY_OPTIONS.find((option) => option.value === activityLevel), [activityLevel]);
  const selectedGoal = useMemo(() => GOAL_OPTIONS.find((option) => option.value === nutritionGoalType), [nutritionGoalType]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const parsedWeight = Number(weightKg);
    const parsedHeight = Number(heightCm);

    if (!fullName.trim()) {
      toast.error("Ingresa tu nombre.");
      return;
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      toast.error("El peso debe ser mayor que 0.");
      return;
    }

    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
      toast.error("La altura debe ser mayor que 0.");
      return;
    }

    if (birthDate) {
      const age = calculateAge(birthDate);
      if (age === null || age < 12 || age > 95) {
        toast.error("La edad debe estar entre 12 y 95 años.");
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        weight: parsedWeight,
        height: parsedHeight,
        biological_sex: biologicalSex,
        activity_level: activityLevel,
        nutrition_goal_type: nutritionGoalType,
        goal_type: selectedGoal?.legacyGoalTypeLabel ?? "Maintain Weight",
      } as any);

      if (!isGuest) {
        await completeOnboarding();
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
      ]);

      toast.success("Onboarding completado.");
      navigate("/today", { replace: true });
    } catch (error: any) {
      toast.error(error?.message || "No se pudo completar el onboarding.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Configura tu perfil metabólico</CardTitle>
            <CardDescription>
              Esta configuración conecta onboarding, perfil, biometría y nutrición para calcular targets automáticos.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName">Nombre</Label>
                  <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tu nombre" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                  <Input id="birthDate" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Sexo biológico</Label>
                  <Select value={biologicalSex} onValueChange={(value) => setBiologicalSex(value as "male" | "female")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightKg">Peso actual (kg)</Label>
                  <Input id="weightKg" type="number" min="1" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heightCm">Altura (cm)</Label>
                  <Input id="heightCm" type="number" min="1" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Objetivo físico</Label>
                <Select value={nutritionGoalType} onValueChange={(value) => setNutritionGoalType(value as typeof nutritionGoalType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{selectedGoal?.description}</p>
              </div>

              <div className="space-y-2">
                <Label>Nivel de actividad (PAL)</Label>
                <Select value={activityLevel} onValueChange={(value) => setActivityLevel(value as typeof activityLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{selectedActivity?.description}</p>
              </div>
            </CardContent>

            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Finalizar onboarding"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
