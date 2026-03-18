import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from "@/lib/metabolismOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, Scale, Ruler, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getErrorMessage } from "@/lib/errors";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onOpenChange }) => {
  const { profile, updateProfile, updateAvatar, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState<"low" | "moderate" | "high" | "very_high" | "hyperactive">("moderate");
  const [nutritionGoalType, setNutritionGoalType] = useState<"lose" | "lose_slow" | "maintain" | "gain_slow" | "gain">("maintain");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedGoal = useMemo(() => GOAL_OPTIONS.find((option) => option.value === nutritionGoalType), [nutritionGoalType]);
  const selectedActivity = useMemo(() => ACTIVITY_OPTIONS.find((option) => option.value === activityLevel), [activityLevel]);
  const updateProfilePayload = useMemo<Parameters<typeof updateProfile>[0]>(
    () => ({
      full_name: fullName,
      birth_date: birthDate || null,
      weight: weight ? Number(weight) : null,
      height: height ? Number(height) : null,
      biological_sex: biologicalSex,
      activity_level: activityLevel,
      nutrition_goal_type: nutritionGoalType,
      goal_type: selectedGoal?.legacyGoalTypeLabel ?? "Maintain Weight",
      avatar_url: profile?.avatar_url ?? null,
    }),
    [
      activityLevel,
      biologicalSex,
      birthDate,
      fullName,
      height,
      nutritionGoalType,
      profile?.avatar_url,
      selectedGoal?.legacyGoalTypeLabel,
      weight,
    ],
  );

  useEffect(() => {
    if (open && profile) {
      setFullName(profile.full_name || "");
      setBirthDate(profile.birth_date || "");
      setWeight(profile.weight?.toString() || "");
      setHeight(profile.height?.toString() || "");
      setBiologicalSex((profile.biological_sex as "male" | "female" | null) ?? "male");
      setActivityLevel((profile.activity_level as "low" | "moderate" | "high" | "very_high" | "hyperactive" | null) ?? "moderate");
      setNutritionGoalType((profile.nutrition_goal_type as "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain" | null) ?? "maintain");
      setAvatarPreview(profile.avatar_url || null);
      setAvatarFile(null);
      setRemoveAvatar(false);
    }
  }, [open, profile]);

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isGuest) {
      toast.info("Modo invitado: la carga de avatar esta deshabilitada.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
        setAvatarFile(file);
        setRemoveAvatar(false);
      }
    };
    reader.onerror = () => toast.error("No se pudo leer el archivo de imagen.");
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHeight = height ? Number(height) : null;
    const parsedWeight = weight ? Number(weight) : null;
    const parsedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00`) : null;

    if (parsedHeight !== null && (!Number.isFinite(parsedHeight) || parsedHeight <= 0)) {
      toast.error("La altura debe ser un numero positivo.");
      return;
    }

    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      toast.error("El peso debe ser un numero positivo.");
      return;
    }

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
        toast.error("La edad debe estar entre 12 y 95 años.");
        return;
      }
    }

    setIsSaving(true);
    try {
      let nextAvatarUrl: string | null | undefined = profile?.avatar_url ?? null;

      if (avatarFile && !isGuest) {
        nextAvatarUrl = await updateAvatar(avatarFile);
      }

      if (removeAvatar && !isGuest) {
        nextAvatarUrl = null;
      }

      await updateProfile({
        ...updateProfilePayload,
        weight: parsedWeight,
        height: parsedHeight,
        avatar_url: nextAvatarUrl,
      });

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
        toast.info("Modo invitado: los cambios no se guardarán.");
      } else {
        toast.success("Perfil actualizado correctamente");
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo actualizar el perfil"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            {isGuest
              ? "Realiza cambios en tu perfil temporal de invitado."
              : "Actualiza datos personales, objetivo y nivel de actividad."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          {isGuest && (
            <Alert>
              <AlertDescription>Modo invitado: los cambios no se guardarán.</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarPreview || undefined} alt="Avatar de perfil" />
              <AvatarFallback>{(fullName || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-2 flex-1">
              <Label htmlFor="avatar">Foto de perfil</Label>
              <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarSelect} disabled={isGuest} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGuest || !avatarPreview}
                onClick={() => {
                  setAvatarPreview(null);
                  setAvatarFile(null);
                  setRemoveAvatar(true);
                }}
              >
                Quitar foto
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input id="fullName" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
                <Activity className="h-4 w-4" /> Actividad
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

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
