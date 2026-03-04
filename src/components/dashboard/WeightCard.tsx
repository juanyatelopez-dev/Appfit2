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
  loading?: boolean;
  error?: unknown;
};

const WeightCard = ({ latest, initial, initialDate, weeklyDelta, loading = false, error }: Props) => {
  if (loading) {
    return (
      <Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Weight
        </CardTitle>
        <CardDescription>Estado actual y cambio semanal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar peso.</p>
        ) : (
          <>
            <p className="text-2xl font-semibold">{latest !== null ? `${latest.toFixed(1)} kg` : "Sin registros"}</p>
            <p className="text-sm text-muted-foreground">
              Cambio semanal: {weeklyDelta === null ? "--" : `${weeklyDelta > 0 ? "+" : ""}${weeklyDelta.toFixed(1)} kg`}
            </p>
            <p className="text-sm text-muted-foreground">
              Peso inicial: {initial !== null ? `${initial.toFixed(1)} kg` : "Sin registros"}
              {initialDate ? ` (${initialDate})` : ""}
            </p>
          </>
        )}
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/weight">Registrar peso</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/statistics">Ver Statistics</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeightCard;
