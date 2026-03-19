import { ArrowUpRight, Activity, Ruler, Scale, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuickAction = {
  label: string;
  description: string;
  to: string;
  icon: typeof Scale;
};

type Props = {
  embedded?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Registrar peso",
    description: "Actualizar el peso diario",
    to: "/weight",
    icon: Scale,
  },
  {
    label: "Registrar medidas",
    description: "Guardar perimetros corporales",
    to: "/body",
    icon: Ruler,
  },
  {
    label: "Registrar biofeedback",
    description: "Actualizar energia, estres y lectura diaria",
    to: "/biofeedback",
    icon: Activity,
  },
  {
    label: "Registrar comida",
    description: "Cargar consumo y avance nutricional",
    to: "/nutrition",
    icon: UtensilsCrossed,
  },
];

const DashboardQuickActions = ({ embedded = false }: Props) => {
  const content = (
    <div className={cn("min-w-0 space-y-3", embedded && "overflow-hidden rounded-xl border border-border/60 bg-muted/10 p-3")}>
      {embedded ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Acciones rapidas</p>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : null}

      <div className={cn("grid gap-2 md:gap-3 sm:grid-cols-2", embedded && "grid-cols-2 xl:grid-cols-4")}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={cn(
                "group rounded-2xl border border-border/60 bg-background/50 p-3 transition hover:border-primary/40 hover:bg-primary/5 md:p-4",
                embedded && "rounded-xl p-2.5 md:p-3",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl border border-border/60 bg-card p-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <p className="mt-2 text-sm font-semibold leading-tight">{action.label}</p>
              <p className={cn("mt-1 text-xs leading-snug text-muted-foreground", embedded && "hidden sm:block")}>{action.description}</p>
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
