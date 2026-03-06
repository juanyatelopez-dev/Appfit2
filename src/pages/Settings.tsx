import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
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
  const { t, language, themePreference, accentColorId, setLanguagePreference, setThemePreference, setAccentColorPreference } =
    usePreferences();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goalType, setGoalType] = useState("");
  const [sleepGoalMinutes, setSleepGoalMinutes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBirthDate(profile.birth_date || "");
      setWeight(profile.weight?.toString() || "");
      setHeight(profile.height?.toString() || "");
      setGoalType(profile.goal_type || "");
      setSleepGoalMinutes(profile.sleep_goal_minutes?.toString() || "480");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHeight = height ? Number(height) : null;
    const parsedWeight = weight ? Number(weight) : null;
    const parsedSleepGoal = sleepGoalMinutes ? Number(sleepGoalMinutes) : 480;

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

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        birth_date: birthDate || null,
        weight: parsedWeight,
        height: parsedHeight,
        goal_type: goalType,
        sleep_goal_minutes: parsedSleepGoal,
      });

      if (isGuest) {
        toast.info("Guest mode: Changes are not permanently saved.");
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
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile avatar" />
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
                placeholder="Your Name"
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

            <div className="space-y-2">
              <Label htmlFor="goalType" className="flex items-center gap-2">
                <Target className="h-4 w-4" /> {t("settings.fitnessGoal")}
              </Label>
              <Select value={goalType} onValueChange={setGoalType}>
                <SelectTrigger id="goalType" className="bg-background/50">
                  <SelectValue placeholder={t("settings.selectGoal")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Build Muscles">{t("settings.goal.buildMuscles")}</SelectItem>
                  <SelectItem value="Lose Weight">{t("settings.goal.loseWeight")}</SelectItem>
                  <SelectItem value="Keep Fit">{t("settings.goal.keepFit")}</SelectItem>
                  <SelectItem value="Improve Endurance">{t("settings.goal.improveEndurance")}</SelectItem>
                </SelectContent>
              </Select>
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
