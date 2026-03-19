import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  LogOut,
  Menu,
  Plus,
  Ruler,
  Settings,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { usePreferences } from "@/context/PreferencesContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/NotificationCenter";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHeaderWeeklyConsistency } from "@/hooks/useHeaderWeeklyConsistency";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const DashboardHeader = () => {
  const { t } = usePreferences();
  const { signOut, isGuest, exitGuest, canAccessAdmin } = useAuth();
  const navigate = useNavigate();
  const { weeklyConsistency } = useHeaderWeeklyConsistency();
  const mobileNavItems = [
    { label: t("nav.progress"), path: "/progress", icon: BarChart3 },
    { label: t("nav.body"), path: "/body", icon: Ruler },
    { label: t("nav.calendar"), path: "/calendar", icon: CalendarDays },
    { label: t("nav.fitnessProfile"), path: "/fitness-profile", icon: Target },
    { label: t("nav.settings"), path: "/settings", icon: Settings },
  ];

  if (canAccessAdmin) {
    mobileNavItems.unshift({ label: "Admin", path: "/admin", icon: ShieldCheck });
  }

  const handleAuthAction = async () => {
    try {
      if (isGuest) {
        exitGuest();
        navigate("/auth", { replace: true, state: { fromGuestSwitch: true } });
        return;
      }

      await signOut();
      navigate("/auth", { replace: true });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo cerrar sesion."));
    }
  };

  return (
    <header
      className="z-30 flex min-h-[3.75rem] shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/92 px-5 py-2.5 shadow-[0_8px_24px_-22px_hsl(var(--foreground)/0.28)] backdrop-blur md:h-16 md:bg-card md:px-8 md:py-0 md:shadow-none"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(20rem,calc(100vw-1rem))] p-4">
            <SheetTitle>Navegacion</SheetTitle>
            <div className="mt-2 rounded-2xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
              Accesos secundarios y ajustes.
            </div>
            <div className="mt-4 grid gap-2">
              {mobileNavItems.map((item) => (
                <SheetClose asChild key={item.path}>
                  <Button
                    variant="ghost"
                    className="min-h-11 justify-start rounded-xl"
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
            <div className="mt-6 border-t border-border pt-4">
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="min-h-11 w-full justify-start rounded-xl text-destructive hover:text-destructive"
                  onClick={handleAuthAction}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isGuest ? "Cambiar cuenta" : "Cerrar sesion"}
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <p className="truncate text-[0.92rem] font-black uppercase tracking-[0.22em] text-card-foreground md:text-xl md:tracking-[0.28em]">
            THE <span className="text-primary">PRIME</span> PROTOCOL
          </p>
        </div>
        <div className="ml-4 hidden items-end gap-2 md:flex">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Dia de la semana</span>
            <div className="flex items-center gap-1">
              {weeklyConsistency.days.map((day) => (
                <span
                  key={day.dateKey}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    day.isToday
                      ? "bg-primary text-primary-foreground"
                      : day.completed
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {day.label}
                </span>
              ))}
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-2.5 py-1">
            <span className="text-sm font-semibold text-muted-foreground">{weeklyConsistency.completedCount}/7</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Como funciona la consistencia semanal"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" className="w-72 space-y-1.5">
                <p className="text-sm font-semibold">Consistencia semanal</p>
                <p className="text-xs text-muted-foreground">Mide cuantos dias completaste en la semana.</p>
                <p className="text-xs text-muted-foreground">Un dia cuenta como completo al registrar 2 o mas controles: agua, sueno, comida, peso o biofeedback.</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              aria-label="Registro rapido"
              title="Registro rapido"
            >
              <Plus className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Registro rapido</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/today#water")}>Agregar agua</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/today#sleep")}>Agregar sueno</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/today#weight")}>Agregar peso</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/today#nutrition")}>Agregar comida</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex">
          <NotificationCenter />
        </div>
        <button
          className="hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground md:flex"
          onClick={handleAuthAction}
          aria-label={isGuest ? "Ir a iniciar sesion" : "Cerrar sesion"}
          title={isGuest ? "Cambiar cuenta" : "Cerrar sesion"}
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
