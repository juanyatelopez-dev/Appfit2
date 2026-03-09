import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Languages, LogOut, Palette, RotateCcw, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { clearUserDayData, clearUserHistory, resetUserAccount, RESETTABLE_DAY_SCOPES, type ResettableDayScope } from "@/services/dataManagement";
import { MINECRAFT_WOOL_COLORS } from "@/theme/accentPalette";
import { APP_BACKGROUND_STYLES } from "@/theme/backgroundStyles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

const Settings = () => {
  const { user, profile, refreshProfile, isGuest, loading, signOut, exitGuest, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    t,
    language,
    themePreference,
    accentColorId,
    backgroundStyleId,
    setLanguagePreference,
    setThemePreference,
    setAccentColorPreference,
    setBackgroundStylePreference,
  } =
    usePreferences();

  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [resetDate, setResetDate] = useState(getTodayDateKey());
  const [selectedResetScopes, setSelectedResetScopes] = useState<ResettableDayScope[]>(["water", "sleep", "nutrition"]);
  const [isClearingDay, setIsClearingDay] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isResettingAccount, setIsResettingAccount] = useState(false);
  const [hardResetConfirm, setHardResetConfirm] = useState("");
  const [isHardResetDialogOpen, setIsHardResetDialogOpen] = useState(false);

  const invalidateDataQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["stats_nutrition_goals"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      queryClient.invalidateQueries({ queryKey: ["water_presets"] }),
      queryClient.invalidateQueries({ queryKey: ["daily_biofeedback"] }),
      queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_weekly"] }),
      queryClient.invalidateQueries({ queryKey: ["daily_biofeedback_recent"] }),
      queryClient.invalidateQueries({ queryKey: ["body_metrics"] }),
      queryClient.invalidateQueries({ queryKey: ["body_metrics_trend"] }),
      queryClient.invalidateQueries({ queryKey: ["body_measurements_latest"] }),
      queryClient.invalidateQueries({ queryKey: ["body_measurements_range"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition_favorites"] }),
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
      queryClient.invalidateQueries({ queryKey: ["weekly_review_summary"] }),
    ]);
  };

  const resetGuestProfileDefaults = async () => {
    await updateProfile({
      full_name: "Guest",
      birth_date: null,
      avatar_url: null,
      weight: null,
      height: null,
      biological_sex: "male",
      activity_level: "moderate",
      nutrition_goal_type: "maintain",
      day_archetype: "base",
      goal_type: null,
      target_weight_kg: null,
      target_date: null,
      start_weight_kg: null,
      goal_direction: null,
      water_goal_ml: 2000,
      water_quick_options_ml: [250, 500, 1000, 2000],
      sleep_goal_minutes: 480,
      calorie_goal: 2000,
      protein_goal_g: 150,
      carb_goal_g: 250,
      fat_goal_g: 70,
      onboarding_completed: true,
    });
  };

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

  const handleBackgroundStyleChange = async (styleId: (typeof APP_BACKGROUND_STYLES)[number]["id"]) => {
    try {
      await setBackgroundStylePreference(styleId);
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

  const toggleResetScope = (scope: ResettableDayScope, checked: boolean) => {
    setSelectedResetScopes((current) => {
      if (checked) return current.includes(scope) ? current : [...current, scope];
      return current.filter((item) => item !== scope);
    });
  };

  const handleClearDay = async () => {
    if (selectedResetScopes.length === 0) {
      toast.error("Selecciona al menos una categoria para limpiar.");
      return;
    }

    setIsClearingDay(true);
    try {
      await clearUserDayData({
        userId: user?.id ?? null,
        dateKey: resetDate,
        scopes: selectedResetScopes,
        isGuest,
      });
      await invalidateDataQueries();
      toast.success(`Se limpiaron los datos seleccionados del ${resetDate}.`);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo limpiar la fecha seleccionada.");
    } finally {
      setIsClearingDay(false);
    }
  };

  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      await clearUserHistory({ userId: user?.id ?? null, isGuest });
      await invalidateDataQueries();
      toast.success("Se limpio el historial del usuario.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo limpiar el historial.");
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleResetAccount = async () => {
    if (hardResetConfirm.trim().toUpperCase() !== "RESET") {
      toast.error("Escribe RESET para confirmar.");
      return;
    }

    setIsResettingAccount(true);
    try {
      await resetUserAccount({ userId: user?.id ?? null, isGuest, keepPreferences: true });

      if (isGuest) {
        await resetGuestProfileDefaults();
      } else {
        await refreshProfile();
      }

      await invalidateDataQueries();
      setHardResetConfirm("");
      setIsHardResetDialogOpen(false);
      toast.success("La cuenta se reinicio desde cero.");

      if (!isGuest) {
        navigate("/onboarding", { replace: true });
      }
    } catch (error: any) {
      toast.error(error?.message || "No se pudo reiniciar la cuenta.");
    } finally {
      setIsResettingAccount(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">{t("settings.loading")}</p>
      </div>
    );
  }

  const selectedAccent = MINECRAFT_WOOL_COLORS.find((color) => color.id === accentColorId);
  const selectedAccentLabel = language === "es" ? selectedAccent?.label.es ?? "Sin color" : selectedAccent?.label.en ?? "No color";

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground">
            Preferencias de la aplicacion, gestion de datos y opciones de cuenta. El plan fitness vive ahora en Perfil Fitness.
          </p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("settings.preferencesTitle")}</CardTitle>
          <CardDescription>{t("settings.preferencesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isGuest && (
            <Alert>
              <AlertDescription>{t("settings.guestWarning")}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
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
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t("settings.accentColor")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("settings.accentColorDescription")}</p>
            <div className="grid grid-cols-4 gap-2 pt-1 sm:grid-cols-8">
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
                    {isSelected && <Check className="mx-auto h-4 w-4" style={{ color: textColor }} />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.accentSelected")}: {selectedAccentLabel}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background-style" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Fondo de la app
            </Label>
            <p className="text-xs text-muted-foreground">
              Ajusta el ambiente visual general sin cambiar tu color primario.
            </p>
            <Select value={backgroundStyleId} onValueChange={(value) => handleBackgroundStyleChange(value as (typeof APP_BACKGROUND_STYLES)[number]["id"])}>
              <SelectTrigger id="background-style" className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_BACKGROUND_STYLES.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {language === "es" ? style.label.es : style.label.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {language === "es"
                ? APP_BACKGROUND_STYLES.find((style) => style.id === backgroundStyleId)?.description.es
                : APP_BACKGROUND_STYLES.find((style) => style.id === backgroundStyleId)?.description.en}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-destructive/30">
        <CardHeader>
          <CardTitle>Gestion de datos</CardTitle>
          <CardDescription>
            Corrige errores puntuales, limpia historiales completos o reinicia la cuenta para empezar otra vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <h3 className="font-medium">Limpiar una fecha especifica</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Borra solo las categorías seleccionadas en una fecha concreta. Es la opción más segura para corregir errores diarios.
            </p>

            <div className="space-y-2">
              <Label htmlFor="resetDate">Fecha a limpiar</Label>
              <Input id="resetDate" type="date" value={resetDate} onChange={(e) => setResetDate(e.target.value)} className="max-w-xs" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {RESETTABLE_DAY_SCOPES.map((scope) => {
                const checked = selectedResetScopes.includes(scope.key);
                return (
                  <label key={scope.key} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-sm">
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleResetScope(scope.key, value === true)} className="mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{scope.label}</div>
                      <p className="text-xs text-muted-foreground">{scope.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isClearingDay || selectedResetScopes.length === 0}>
                  {isClearingDay ? "Limpiando..." : "Limpiar fecha seleccionada"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpiar datos del {resetDate}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminaran solo las categorias marcadas para esa fecha. Esta accion no afecta tu plan fitness ni tus preferencias.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearDay} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirmar limpieza
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              <h3 className="font-medium">Limpiar historial completo</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Borra registros diarios, medidas, peso y revisiones semanales, pero conserva tu cuenta, tu plan base y tus preferencias.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isClearingHistory}>
                  {isClearingHistory ? "Limpiando..." : "Limpiar historial"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpiar historial completo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta accion eliminara el historial operativo del usuario, pero mantendra la cuenta, las preferencias y la configuracion base del plan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>Confirmar limpieza</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="font-medium text-destructive">Reiniciar cuenta desde cero</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Borra historial, favoritos, presets y resetea el perfil metabólico para que vuelvas a comenzar desde onboarding.
            </p>

            <AlertDialog open={isHardResetDialogOpen} onOpenChange={setIsHardResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isResettingAccount}>
                  {isResettingAccount ? "Reiniciando..." : "Hard reset de cuenta"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reiniciar cuenta desde cero</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta accion eliminara historial, metas de progreso, favoritos y configuracion metabolica. Escribe RESET para continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="hardResetConfirm">Confirmacion escrita</Label>
                  <Input
                    id="hardResetConfirm"
                    value={hardResetConfirm}
                    onChange={(e) => setHardResetConfirm(e.target.value)}
                    placeholder="RESET"
                    autoComplete="off"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setHardResetConfirm("");
                    }}
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetAccount}
                    disabled={hardResetConfirm.trim().toUpperCase() !== "RESET" || isResettingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirmar hard reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("settings.accountTitle")}</CardTitle>
          <CardDescription>{t("settings.accountDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" className="w-full md:w-auto" onClick={handleSwitchAccount} disabled={isSwitchingAccount}>
            <LogOut className="mr-2 h-4 w-4" />
            {isSwitchingAccount ? t("settings.saving") : isGuest ? t("settings.switchUserGuest") : t("settings.switchUser")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("settings.switchUserHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
