import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  waterAverageMl: number;
  waterMonthAverageMl: number;
  waterDaysMet: number;
  waterDaysTotal: number;
  weightTrend: string;
  loading?: boolean;
  error?: unknown;
};

const WeeklySummaryCard = ({
  waterAverageMl,
  waterMonthAverageMl,
  waterDaysMet,
  waterDaysTotal,
  weightTrend,
  loading = false,
  error,
}: Props) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen semanal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Weekly summary
        </CardTitle>
        <CardDescription>Ultimos 7 dias (agua + peso).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar resumen semanal.</p>
        ) : (
          <>
            <p className="text-sm">
              Agua promedio: <span className="font-semibold">{(waterAverageMl / 1000).toFixed(1)} L/dia</span>{" "}
              <span className="text-muted-foreground">({waterAverageMl} ml)</span>
            </p>
            <p className="text-sm">
              Promedio 30d: <span className="font-semibold">{(waterMonthAverageMl / 1000).toFixed(1)} L/dia</span>{" "}
              <span className="text-muted-foreground">({waterMonthAverageMl} ml)</span>
            </p>
            <p className="text-sm">
              Objetivo cumplido: <span className="font-semibold">{waterDaysMet}/{waterDaysTotal}</span>
            </p>
            <p className="text-sm">
              Tendencia peso: <span className="font-semibold">{weightTrend}</span>
            </p>
          </>
        )}
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/statistics">Ver detalle semanal</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/water">Agua</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklySummaryCard;
