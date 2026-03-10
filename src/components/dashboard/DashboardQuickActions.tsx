import { ArrowUpRight, BarChart3, ClipboardCheck, Ruler, Scale, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QuickAction = {
  label: string;
  description: string;
  to: string;
  icon: typeof Scale;
};

type Props = {
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

const DashboardQuickActions = ({ nextActionLabel }: Props) => {
  return (
    <Card className="rounded-[28px] border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>Acciones rapidas</CardTitle>
        <CardDescription>Desde aqui deberias poder registrar o revisar lo importante sin salir del dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
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

        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="group rounded-2xl border border-border/60 bg-background/50 p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl border border-border/60 bg-card p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <p className="mt-4 text-sm font-semibold">{action.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              </Link>
            );
          })}
        </div>

        <Button asChild variant="outline" className="w-full justify-center">
          <Link to="/progress">Abrir resumen completo</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default DashboardQuickActions;
