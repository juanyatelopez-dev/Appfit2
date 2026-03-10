import { useMemo } from "react";
import { BarChart3, Bell, CalendarDays, Dumbbell, Home, LogOut, Menu, Plus, Ruler, Settings, Target, UtensilsCrossed } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useAuth } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TranslationKey } from "@/i18n/translations";

const resolvePageTitle = (pathname: string, t: (key: TranslationKey) => string) => {
  if (pathname.startsWith("/today")) return t("nav.today");
  if (pathname.startsWith("/progress")) return t("nav.progress");
  if (pathname.startsWith("/training")) return t("nav.training");
  if (pathname.startsWith("/body")) return t("nav.body");
  if (pathname.startsWith("/fitness-profile")) return t("nav.fitnessProfile");
  if (pathname.startsWith("/dashboard")) return t("nav.dashboard");
  if (pathname.startsWith("/goals")) return t("nav.goals");
  if (pathname.startsWith("/weight")) return t("nav.weight");
  if (pathname.startsWith("/water")) return t("nav.water");
  if (pathname.startsWith("/sleep")) return t("nav.sleep");
  if (pathname.startsWith("/nutrition")) return t("nav.nutrition");
  if (pathname.startsWith("/biofeedback")) return t("nav.biofeedback");
  if (pathname.startsWith("/measurements")) return t("nav.measurements");
  if (pathname.startsWith("/statistics")) return t("nav.statistics");
  if (pathname.startsWith("/weekly-review")) return t("nav.weeklyReview");
  if (pathname.startsWith("/calendar")) return t("nav.calendar");
  if (pathname.startsWith("/profile")) return t("nav.profile");
  if (pathname.startsWith("/settings")) return t("nav.settings");
  return t("nav.today");
};

const DashboardHeader = () => {
  const { language, t } = usePreferences();
  const { signOut, isGuest, exitGuest } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const dateStr = today.toLocaleDateString(language === "es" ? "es-ES" : "en-US", options);
  const pageTitle = useMemo(() => resolvePageTitle(location.pathname, t), [location.pathname, t]);

  const days = language === "es" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDay = today.getDay();
  const activeDayIndex = currentDay === 0 ? 6 : currentDay - 1;
  const mobileNavItems = [
    { label: t("nav.today"), path: "/today", icon: Home },
    { label: t("nav.training"), path: "/training", icon: Dumbbell },
    { label: t("nav.nutrition"), path: "/nutrition", icon: UtensilsCrossed },
    { label: t("nav.body"), path: "/body", icon: Ruler },
    { label: t("nav.progress"), path: "/progress", icon: BarChart3 },
    { label: t("nav.calendar"), path: "/calendar", icon: CalendarDays },
    { label: t("nav.fitnessProfile"), path: "/fitness-profile", icon: Target },
    { label: t("nav.settings"), path: "/settings", icon: Settings },
  ];

  const handleAuthAction = async () => {
    try {
      if (isGuest) {
        exitGuest();
        navigate("/auth", { replace: true, state: { fromGuestSwitch: true } });
        return;
      }

      await signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cerrar sesión.");
    }
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetTitle>Navegación</SheetTitle>
            <div className="mt-4 grid gap-2">
              {mobileNavItems.map((item) => (
                <SheetClose asChild key={item.path}>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      navigate(item.path);
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </SheetClose>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">{pageTitle || t("header.dashboard")}</h2>
          <p className="text-xs text-muted-foreground">{dateStr}</p>
        </div>
        <div className="hidden md:flex items-center gap-1 ml-4">
          {days.map((day, i) => (
            <span
              key={day}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i === activeDayIndex
                  ? "bg-primary text-primary-foreground"
                  : i < activeDayIndex
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {day.charAt(0)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
              aria-label="Registro rápido"
              title="Registro rápido"
            >
              <Plus className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Registro rápido</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/today#water")}>Agregar agua</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/today#sleep")}>Agregar sueño</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/today#weight")}>Agregar peso</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/today#nutrition")}>Agregar comida</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
          onClick={handleAuthAction}
          aria-label={isGuest ? "Ir a iniciar sesión" : "Cerrar sesión"}
          title={isGuest ? "Cambiar cuenta" : "Cerrar sesión"}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
