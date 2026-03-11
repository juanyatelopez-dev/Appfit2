import { Activity, CalendarDays, Ruler, Scale, Target, UserRound } from "lucide-react";

import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from "@/lib/metabolismOptions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type BiologicalSex = "male" | "female";
type ActivityLevel = "low" | "moderate" | "high" | "very_high" | "hyperactive";
type NutritionGoalType = "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain";

type Props = {
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  biologicalSex: BiologicalSex;
  onBiologicalSexChange: (value: BiologicalSex) => void;
  weight: string;
  onWeightChange: (value: string) => void;
  height: string;
  onHeightChange: (value: string) => void;
  activityLevel: ActivityLevel;
  onActivityLevelChange: (value: ActivityLevel) => void;
  nutritionGoalType: NutritionGoalType;
  onNutritionGoalTypeChange: (value: NutritionGoalType) => void;
};

const sexOptions: Array<{ value: BiologicalSex; label: string }> = [
  { value: "male", label: "Masc" },
  { value: "female", label: "Fem" },
];

const calculateAge = (birthDate: string) => {
  if (!birthDate) return null;

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

const optionCardClassName =
  "group flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-200";

const ProfileCalibrationPanel = ({
  birthDate,
  onBirthDateChange,
  biologicalSex,
  onBiologicalSexChange,
  weight,
  onWeightChange,
  height,
  onHeightChange,
  activityLevel,
  onActivityLevelChange,
  nutritionGoalType,
  onNutritionGoalTypeChange,
}: Props) => {
  const age = calculateAge(birthDate);

  return (
    <section className="app-surface-hero overflow-hidden rounded-[28px]">
      <div className="border-b border-border/40 px-5 py-5 sm:px-6">
        <div className="app-surface-heading flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]">
          <UserRound className="h-4 w-4 text-primary" />
          Calibracion de perfil
        </div>
        <p className="app-surface-muted mt-2 max-w-2xl text-sm">
          Ajusta tus datos base, tu nivel de actividad y el objetivo metabólico que usaremos para tus cálculos.
        </p>
      </div>

      <div className="space-y-8 px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <div className="app-surface-caption flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
            <CalendarDays className="h-3.5 w-3.5" />
            Datos estaticos
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="app-surface-tile rounded-2xl p-3">
              <Label className="app-surface-caption text-[11px] font-medium uppercase tracking-[0.18em]">Edad</Label>
              <div className="app-surface-soft mt-2 flex h-12 items-center rounded-xl px-4 text-lg font-semibold">
                {age ?? "--"}
              </div>
            </div>

            <div className="app-surface-tile rounded-2xl p-3">
              <Label className="app-surface-caption text-[11px] font-medium uppercase tracking-[0.18em]">Sexo</Label>
              <div className="mt-2 grid h-12 grid-cols-2 gap-2">
                {sexOptions.map((option) => {
                  const isSelected = biologicalSex === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onBiologicalSexChange(option.value)}
                      className={cn(
                        "rounded-xl border text-sm font-semibold transition-colors",
                        isSelected
                          ? "border-primary/70 bg-primary/15 text-primary-foreground"
                          : "app-surface-soft app-surface-muted hover:border-border hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="app-surface-tile rounded-2xl p-3">
              <Label htmlFor="calibration-height" className="app-surface-caption flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em]">
                <Ruler className="h-3.5 w-3.5" />
                Altura (cm)
              </Label>
              <Input
                id="calibration-height"
                type="number"
                min="1"
                step="0.1"
                inputMode="decimal"
                placeholder="171.3"
                value={height}
                onChange={(event) => onHeightChange(event.target.value)}
                className="app-input-surface mt-2 h-12 text-base font-semibold"
              />
            </div>

            <div className="app-surface-tile rounded-2xl p-3">
              <Label htmlFor="calibration-weight" className="app-surface-caption flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em]">
                <Scale className="h-3.5 w-3.5" />
                Peso (kg)
              </Label>
              <Input
                id="calibration-weight"
                type="number"
                min="1"
                step="0.1"
                inputMode="decimal"
                placeholder="73.7"
                value={weight}
                onChange={(event) => onWeightChange(event.target.value)}
                className="app-input-surface mt-2 h-12 text-base font-semibold"
              />
            </div>
          </div>

          <div className="app-surface-tile rounded-2xl p-3">
            <Label htmlFor="calibration-birth-date" className="app-surface-caption text-[11px] font-medium uppercase tracking-[0.18em]">
              Fecha de nacimiento
            </Label>
            <Input
              id="calibration-birth-date"
              type="date"
              value={birthDate}
              onChange={(event) => onBirthDateChange(event.target.value)}
              className="app-input-surface mt-2 h-12 text-base font-medium"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="app-surface-caption flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
            <Activity className="h-3.5 w-3.5" />
            Nivel de actividad
          </div>

          <RadioGroup value={activityLevel} onValueChange={(value) => onActivityLevelChange(value as ActivityLevel)} className="gap-3">
            {ACTIVITY_OPTIONS.map((option) => {
              const isSelected = activityLevel === option.value;

              return (
                <Label
                  key={option.value}
                  htmlFor={`activity-${option.value}`}
                  className={cn(
                    optionCardClassName,
                    isSelected
                      ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
                      : "app-surface-soft hover:border-border hover:bg-background/60",
                  )}
                >
                  <div className="space-y-1">
                    <div className="app-surface-heading text-sm font-semibold uppercase tracking-[0.08em]">{option.label}</div>
                    <p className="app-surface-muted text-xs">{option.description}</p>
                  </div>
                  <RadioGroupItem
                    value={option.value}
                    id={`activity-${option.value}`}
                    className={cn(
                       "mt-1 h-5 w-5 border-border text-primary ring-offset-background",
                       isSelected && "border-primary",
                    )}
                  />
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <div className="app-surface-caption flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
            <Target className="h-3.5 w-3.5" />
            Objetivo metabólico
          </div>

          <RadioGroup value={nutritionGoalType} onValueChange={(value) => onNutritionGoalTypeChange(value as NutritionGoalType)} className="gap-3">
            {GOAL_OPTIONS.map((option) => {
              const isSelected = nutritionGoalType === option.value;

              return (
                <Label
                  key={option.value}
                  htmlFor={`goal-${option.value}`}
                  className={cn(
                    optionCardClassName,
                    isSelected
                      ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
                      : "app-surface-soft hover:border-border hover:bg-background/60",
                  )}
                >
                  <div className="space-y-1">
                    <div className={cn("text-sm font-semibold uppercase tracking-[0.08em]", isSelected ? "text-primary" : "app-surface-heading")}>
                      {option.label}
                    </div>
                    <p className="app-surface-muted text-xs">{option.description}</p>
                  </div>
                  <RadioGroupItem
                    value={option.value}
                    id={`goal-${option.value}`}
                    className={cn(
                       "mt-1 h-5 w-5 border-border text-primary ring-offset-background",
                       isSelected && "border-primary",
                    )}
                  />
                </Label>
              );
            })}
          </RadioGroup>
        </div>
      </div>
    </section>
  );
};

export default ProfileCalibrationPanel;
