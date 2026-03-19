import { ArrowUpRight, BarChart3, ClipboardCheck, Ruler, Scale, UtensilsCrossed } from "lucide-react";
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
  nextActionLabel?: string | null;
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
    label: "Ver estadisticas",
    description: "Abrir tendencias y progreso",
    to: "/progress",
    icon: BarChart3,
  },
  {
    label: "Ir a nutricion",
    description: "Revisar comidas y objetivos",
    to: "/nutrition",
    icon: UtensilsCrossed,
  },
];

const DashboardQuickActions = ({ embedded = false, nextActionLabel }: Props) => {
  const content = (
    <div className={cn("space-y-4", embedded && "rounded-xl border border-border/60 bg-muted/10 p-3 md:p-4")}>
      {embedded ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Acciones rapidas</p>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-background/40 p-3 md:p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Siguiente paso</p>
            <p className="text-sm font-medium">{nextActionLabel ?? "Dia al dia. No hay registros urgentes pendientes."}</p>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-2 md:gap-3 sm:grid-cols-2", embedded && "xl:grid-cols-4")}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={cn(
                "group rounded-2xl border border-border/60 bg-background/50 p-3 transition hover:border-primary/40 hover:bg-primary/5 md:p-4",
                embedded && "rounded-xl",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl border border-border/60 bg-card p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <p className="mt-3 text-sm font-semibold">{action.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
            </Link>
          );
        })}
      </div>

      <Button asChild variant="outline" className="w-full justify-center">
        <Link to="/progress">Abrir resumen completo</Link>
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
