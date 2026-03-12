import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  latest: number | null;
  initial: number | null;
  initialDate: string | null;
  weeklyDelta: number | null;
  movingAvg7?: number | null;
  trend?: string;
  loading?: boolean;
  error?: unknown;
};

const WeightCard = ({ latest, initial, initialDate, weeklyDelta, movingAvg7 = null, trend = "sin datos", loading = false, error }: Props) => {
  if (loading) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Peso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Peso
        </CardTitle>
        <CardDescription>Peso actual, cambio 7d, media móvil y tendencia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar peso.</p>
        ) : (
          <>
            <p className="text-2xl font-semibold md:text-3xl">{latest !== null ? `${latest.toFixed(1)} kg` : "Sin registros"}</p>
            <p className="text-sm text-muted-foreground border rounded-lg p-2">
              Cambio semanal: {weeklyDelta === null ? "--" : `${weeklyDelta > 0 ? "+" : ""}${weeklyDelta.toFixed(1)} kg`}
            </p>
            <p className="text-sm text-muted-foreground border rounded-lg p-2">
              Media móvil 7d: {movingAvg7 === null ? "--" : `${movingAvg7.toFixed(2)} kg`}
            </p>
            <p className="text-sm text-muted-foreground border rounded-lg p-2">Tendencia: {trend}</p>
            <p className="text-sm text-muted-foreground">
              Peso inicial: {initial !== null ? `${initial.toFixed(1)} kg` : "Sin registros"}
              {initialDate ? ` (${initialDate})` : ""}
            </p>
          </>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="sm">
            <Link to="/today#weight">Registrar peso</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/progress">Ver progreso</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeightCard;
