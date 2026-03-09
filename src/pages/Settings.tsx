import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from "@/lib/metabolismOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Scale, Ruler, Target, User, Settings as SettingsIcon, Languages, Palette, Check, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { MINECRAFT_WOOL_COLORS } from "@/theme/accentPalette";

const Settings = () => {
  const { profile, updateProfile, isGuest, loading, signOut, exitGuest } = useAuth();
  const queryClient = useQueryClient();
  const { t, language, themePreference, accentColorId, setLanguagePreference, setThemePreference, setAccentColorPreference } =
    usePreferences();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] = useState<"low" | "moderate" | "high" | "very_high" | "hyperactive">("moderate");
  const [nutritionGoalType, setNutritionGoalType] = useState<"lose" | "lose_slow" | "maintain" | "gain_slow" | "gain">("maintain");
  const [sleepGoalMinutes, setSleepGoalMinutes] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [carbGoal, setCarbGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBirthDate(profile.birth_date || "");
      setWeight(profile.weight?.toString() || "");
      setHeight(profile.height?.toString() || "");
      setActivityLevel((profile.activity_level as "low" | "moderate" | "high" | "very_high" | "hyperactive" | null) ?? "moderate");
      setNutritionGoalType((profile.nutrition_goal_type as "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain" | null) ?? "maintain");
      setSleepGoalMinutes(profile.sleep_goal_minutes?.toString() || "480");
      setCalorieGoal((profile as any).calorie_goal?.toString() || "2000");
      setProteinGoal((profile as any).protein_goal_g?.toString() || "150");
      setCarbGoal((profile as any).carb_goal_g?.toString() || "250");
      setFatGoal((profile as any).fat_goal_g?.toString() || "70");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHeight = height ? Number(height) : null;
    const parsedWeight = weight ? Number(weight) : null;
    const parsedSleepGoal = sleepGoalMinutes ? Number(sleepGoalMinutes) : 480;
    const parsedCalorieGoal = calorieGoal ? Number(calorieGoal) : 2000;
    const parsedProteinGoal = proteinGoal ? Number(proteinGoal) : 150;
    const parsedCarbGoal = carbGoal ? Number(carbGoal) : 250;
    const parsedFatGoal = fatGoal ? Number(fatGoal) : 70;

    if (parsedHeight !== null && (!Number.isFinite(parsedHeight) || parsedHeight <= 0)) {
      toast.error(t("settings.heightError"));
      return;
    }

    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      toast.error(t("settings.weightError"));
      return;
    }
    if (!Number.isFinite(parsedSleepGoal) || parsedSleepGoal <= 0 || parsedSleepGoal > 1440) {
      toast.error(t("settings.sleepGoalError"));
      return;
    }
    if (!Number.isFinite(parsedCalorieGoal) || parsedCalorieGoal <= 0) {
      toast.error("La meta de calorias debe ser mayor que 0.");
      return;
    }
    if (!Number.isFinite(parsedProteinGoal) || parsedProteinGoal < 0) {
      toast.error("La meta de proteina no puede ser negativa.");
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

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        birth_date: birthDate || null,
        weight: parsedWeight,
        height: parsedHeight,
        activity_level: activityLevel,
        nutrition_goal_type: nutritionGoalType,
        goal_type: GOAL_OPTIONS.find((option) => option.value === nutritionGoalType)?.legacyGoalTypeLabel ?? "Maintain Weight",
        sleep_goal_minutes: parsedSleepGoal,
        calorie_goal: parsedCalorieGoal,
        protein_goal_g: parsedProteinGoal,
        carb_goal_g: parsedCarbGoal,
        fat_goal_g: parsedFatGoal,
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
        toast.info("Modo invitado: los cambios no se guardan de forma permanente.");
      } else {
        toast.success(t("settings.success"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("settings.fail"));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">{t("settings.loading")}</p>
      </div>
    );
  }

  const handleLanguageChange = async (value: string) => {
    const next = value === "es" ? "es" : "en";
    try {
      await setLanguagePreference(next);
      toast.success(t("settings.success"));
    } catch (error: any) {
      toast.error(error?.message || t("settings.fail"));
    }
  };

  const handleThemeChange = async (value: string) => {
    const next: "light" | "dark" | "system" =
      value === "light" || value === "dark" || value === "system" ? value : "system";
    try {
      await setThemePreference(next);
      toast.success(t("settings.success"));
    } catch (error: any) {
      toast.error(error?.message || t("settings.fail"));
    }
  };

  const handleAccentColorChange = async (colorId: (typeof MINECRAFT_WOOL_COLORS)[number]["id"]) => {
    try {
      await setAccentColorPreference(colorId);
    } catch (error: any) {
      toast.error(error?.message || t("settings.fail"));
    }
  };

  const handleSwitchAccount = async () => {
    setIsSwitchingAccount(true);
    try {
      if (isGuest) {
        exitGuest();
        navigate("/auth", { replace: true, state: { fromGuestSwitch: true } });
        return;
      }

      await signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error?.message || t("settings.switchUserError"));
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  const selectedAccent = MINECRAFT_WOOL_COLORS.find((color) => color.id === accentColorId);
  const selectedAccentLabel =
    language === "es" ? selectedAccent?.label.es ?? "Sin color" : selectedAccent?.label.en ?? "No color";

  return (
    <div className="container max-w-2xl py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">{t("settings.title")}</h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("settings.profileTitle")}</CardTitle>
          <CardDescription>
            {t("settings.profileDescription")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-6">
            {isGuest && (
              <Alert>
                <AlertDescription>{t("settings.guestWarning")}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar de perfil" />
                <AvatarFallback>{(fullName || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                {t("settings.avatarFromProfile")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" /> {t("settings.fullName")}
              </Label>
              <Input
                id="fullName"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">{t("settings.birthDate")}</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="weight" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" /> {t("settings.weight")}
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" /> {t("settings.height")}
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nutritionGoalType" className="flex items-center gap-2">
                  <Target className="h-4 w-4" /> {t("settings.fitnessGoal")}
                </Label>
                <Select value={nutritionGoalType} onValueChange={(value) => setNutritionGoalType(value as typeof nutritionGoalType)}>
                  <SelectTrigger id="nutritionGoalType" className="bg-background/50">
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
                <p className="text-xs text-muted-foreground">
                  {GOAL_OPTIONS.find((option) => option.value === nutritionGoalType)?.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityLevel" className="flex items-center gap-2">
                  <Target className="h-4 w-4" /> Nivel de actividad
                </Label>
                <Select value={activityLevel} onValueChange={(value) => setActivityLevel(value as typeof activityLevel)}>
                  <SelectTrigger id="activityLevel" className="bg-background/50">
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
                <p className="text-xs text-muted-foreground">
                  {ACTIVITY_OPTIONS.find((option) => option.value === activityLevel)?.description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sleepGoal">{t("settings.sleepGoal")}</Label>
              <Input
                id="sleepGoal"
                type="number"
                min="1"
                max="1440"
                placeholder="480"
                value={sleepGoalMinutes}
                onChange={(e) => setSleepGoalMinutes(e.target.value)}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">{t("settings.sleepGoalHint")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="calorieGoal">Meta calorias (kcal)</Label>
                <Input
                  id="calorieGoal"
                  type="number"
                  min="1"
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proteinGoal">Meta proteina (g)</Label>
                <Input
                  id="proteinGoal"
                  type="number"
                  min="0"
                  value={proteinGoal}
                  onChange={(e) => setProteinGoal(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbGoal">Meta carbs (g)</Label>
                <Input
                  id="carbGoal"
                  type="number"
                  min="0"
                  value={carbGoal}
                  onChange={(e) => setCarbGoal(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatGoal">Meta grasas (g)</Label>
                <Input
                  id="fatGoal"
                  type="number"
                  min="0"
                  value={fatGoal}
                  onChange={(e) => setFatGoal(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6">
            <Button type="submit" className="w-full md:w-auto ml-auto" disabled={isSaving}>
              {isSaving ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("settings.preferencesTitle")}</CardTitle>
          <CardDescription>{t("settings.preferencesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              {t("settings.language")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("settings.languageDescription")}</p>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language" className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("settings.language.en")}</SelectItem>
                <SelectItem value="es">{t("settings.language.es")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t("settings.theme")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("settings.themeDescription")}</p>
            <Select value={themePreference} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme" className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("settings.theme.light")}</SelectItem>
                <SelectItem value="dark">{t("settings.theme.dark")}</SelectItem>
                <SelectItem value="system">{t("settings.theme.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t("settings.accentColor")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("settings.accentColorDescription")}</p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
              {MINECRAFT_WOOL_COLORS.map((color) => {
                const isSelected = color.id === accentColorId;
                const textColor = color.id === "white" || color.id === "yellow" || color.id === "light_gray" ? "#111827" : "#FFFFFF";

                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleAccentColorChange(color.id)}
                    className={`relative h-9 w-9 rounded-md border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={language === "es" ? color.label.es : color.label.en}
                    title={language === "es" ? color.label.es : color.label.en}
                  >
                    {isSelected && <Check className="h-4 w-4 mx-auto" style={{ color: textColor }} />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.accentSelected")}: {selectedAccentLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("settings.accountTitle")}</CardTitle>
          <CardDescription>{t("settings.accountDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            onClick={handleSwitchAccount}
            disabled={isSwitchingAccount}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isSwitchingAccount
              ? t("settings.saving")
              : isGuest
              ? t("settings.switchUserGuest")
              : t("settings.switchUser")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("settings.switchUserHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
