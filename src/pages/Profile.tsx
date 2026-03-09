import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Scale, Ruler, Target, Activity } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from "@/lib/metabolismOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Profile = () => {
  const { profile, updateProfile, isGuest } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState<"low" | "moderate" | "high" | "very_high" | "hyperactive">("moderate");
  const [nutritionGoalType, setNutritionGoalType] = useState<"lose" | "lose_slow" | "maintain" | "gain_slow" | "gain">("maintain");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setFullName(profile.full_name || "");
    setBirthDate(profile.birth_date || "");
    setWeight(profile.weight?.toString() || "");
    setHeight(profile.height?.toString() || "");
    setBiologicalSex((profile.biological_sex as "male" | "female" | null) ?? "male");
    setActivityLevel((profile.activity_level as "low" | "moderate" | "high" | "very_high" | "hyperactive" | null) ?? "moderate");
    setNutritionGoalType((profile.nutrition_goal_type as "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain" | null) ?? "maintain");
  }, [profile]);

  const selectedGoal = useMemo(() => GOAL_OPTIONS.find((option) => option.value === nutritionGoalType), [nutritionGoalType]);
  const selectedActivity = useMemo(() => ACTIVITY_OPTIONS.find((option) => option.value === activityLevel), [activityLevel]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = weight ? Number(weight) : null;
    const parsedHeight = height ? Number(height) : null;
    const parsedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00`) : null;

    if (parsedBirthDate && Number.isNaN(parsedBirthDate.getTime())) {
      toast.error("La fecha de nacimiento no es valida.");
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
        toast.error("La edad debe estar entre 12 y 95 anios.");
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

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        birth_date: birthDate || null,
        weight: parsedWeight,
        height: parsedHeight,
        biological_sex: biologicalSex,
        activity_level: activityLevel,
        nutrition_goal_type: nutritionGoalType,
        goal_type: selectedGoal?.legacyGoalTypeLabel ?? "Maintain Weight",
      } as any);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
        queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      ]);

      if (isGuest) {
        toast.info("Modo invitado: los cambios no se guardaran.");
      } else {
        toast.success("Perfil actualizado correctamente");
      }
    } catch {
      toast.error("No se pudo actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ajustes de perfil</CardTitle>
          <CardDescription>
            {isGuest
              ? "Estas viendo el perfil en modo invitado. Los cambios no se guardaran."
              : "Gestiona tu informacion personal, objetivo y nivel de actividad."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSave}>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">{fullName ? getInitials(fullName) : <User className="h-12 w-12" />}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-medium">{fullName || (isGuest ? "Usuario invitado" : "Usuario nuevo")}</h3>
                <p className="text-sm text-muted-foreground">{isGuest ? "Sesion temporal" : "Personaliza tu cuenta"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input id="fullName" placeholder="Ingresa tu nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Sexo biologico</Label>
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
                <Label htmlFor="weight" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Peso (kg)
                </Label>
                <Input id="weight" type="number" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" /> Altura (cm)
                </Label>
                <Input id="height" type="number" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" /> Objetivo fisico
                </Label>
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
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Nivel de actividad
                </Label>
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
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t pt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
