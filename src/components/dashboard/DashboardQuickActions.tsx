import { ArrowUpRight, Activity, Ruler, Scale, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuickAction = {
  key: "weight" | "measurements" | "biofeedback" | "nutrition";
  label: string;
  description: string;
  to: string;
  icon: typeof Scale;
};

type Props = {
  embedded?: boolean;
  excludeKeys?: QuickAction["key"][];
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "weight",
    label: "Registrar peso",
    description: "Actualizar el peso diario",
    to: "/weight",
    icon: Scale,
  },
  {
    key: "measurements",
    label: "Registrar medidas",
    description: "Guardar perimetros corporales",
    to: "/body",
    icon: Ruler,
  },
  {
    key: "biofeedback",
    label: "Registrar biofeedback",
    description: "Actualizar energia, estres y lectura diaria",
    to: "/biofeedback",
    icon: Activity,
  },
  {
    key: "nutrition",
    label: "Registrar comida",
    description: "Cargar consumo y avance nutricional",
    to: "/nutrition",
    icon: UtensilsCrossed,
  },
];

const DashboardQuickActions = ({ embedded = false, excludeKeys = [] }: Props) => {
  const visibleActions = QUICK_ACTIONS.filter((action) => !excludeKeys.includes(action.key));
  const content = (
    <div className={cn("min-w-0 space-y-3", embedded && "overflow-hidden rounded-xl border border-border/60 bg-muted/10 p-3")}>
      {embedded ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Acciones rapidas</p>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-2 md:gap-3 sm:grid-cols-2",
          embedded && (visibleActions.length <= 2 ? "grid-cols-2 xl:grid-cols-2" : "grid-cols-2 xl:grid-cols-4"),
        )}
      >
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.key}
              to={action.to}
              className={cn(
                "group rounded-2xl border border-border/60 bg-background/50 p-3 transition hover:border-primary/40 hover:bg-primary/5 md:p-4",
                embedded && "rounded-xl p-2 md:p-2.5",
                embedded && "md:min-h-[58px] md:p-2.5",
              )}
            >
              <div className="flex min-w-0 items-start gap-2 md:items-center">
                <div className="rounded-xl border border-border/60 bg-card p-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold leading-tight md:truncate", embedded && "text-[13px]")}>{action.label}</p>
                  <p className={cn("mt-0.5 text-xs leading-snug text-muted-foreground", embedded && "hidden lg:block")}>{action.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Button asChild variant="outline" className="h-10 w-full justify-center">
        <Link to="/biofeedback">Abrir registro completo</Link>
      </Button>
    </div>
  );

  if (embedded) return content;

  return (
    <Card className="rounded-[22px] border-border/50 bg-card/80 md:rounded-[24px]">
      <CardHeader>
        <CardTitle>Acciones rapidas</CardTitle>
        <CardDescription>Desde aqui deberias poder registrar o revisar lo importante sin salir del dashboard.</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default DashboardQuickActions;
