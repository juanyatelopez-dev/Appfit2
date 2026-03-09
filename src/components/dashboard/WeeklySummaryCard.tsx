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
  sleepAverageMinutes: number;
  sleepMonthAverageMinutes: number;
  sleepDaysMet: number;
  sleepDaysTotal: number;
  weightTrend: string;
  bioEnergy?: number;
  bioStress?: number;
  bioSleep?: number;
  activeDays?: number;
  weeklyReviewHref?: string;
  loading?: boolean;
  error?: unknown;
};

const WeeklySummaryCard = ({
  waterAverageMl,
  waterMonthAverageMl,
  waterDaysMet,
  waterDaysTotal,
  sleepAverageMinutes,
  sleepMonthAverageMinutes,
  sleepDaysMet,
  sleepDaysTotal,
  weightTrend,
  bioEnergy = 0,
  bioStress = 0,
  bioSleep = 0,
  activeDays = 0,
  weeklyReviewHref = "/progress",
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
          Resumen semanal
        </CardTitle>
        <CardDescription>Últimos 7 días: agua, sueño, biofeedback y peso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar resumen semanal.</p>
        ) : (
          <>
            <p className="text-sm">
              Agua promedio: <span className="font-semibold">{(waterAverageMl / 1000).toFixed(1)} L/día</span>{" "}
              <span className="text-muted-foreground">({waterAverageMl} ml)</span>
            </p>
            <p className="text-sm">
              Promedio 30d: <span className="font-semibold">{(waterMonthAverageMl / 1000).toFixed(1)} L/día</span>{" "}
              <span className="text-muted-foreground">({waterMonthAverageMl} ml)</span>
            </p>
            <p className="text-sm">
              Objetivo agua cumplido: <span className="font-semibold">{waterDaysMet}/{waterDaysTotal}</span>
            </p>
            <p className="text-sm">
              Sueño promedio: <span className="font-semibold">{(sleepAverageMinutes / 60).toFixed(1)} h/día</span>{" "}
              <span className="text-muted-foreground">({sleepAverageMinutes} min)</span>
            </p>
            <p className="text-sm">
              Sueño 30d: <span className="font-semibold">{(sleepMonthAverageMinutes / 60).toFixed(1)} h/día</span>{" "}
              <span className="text-muted-foreground">({sleepMonthAverageMinutes} min)</span>
            </p>
            <p className="text-sm">
              Meta de sueño: <span className="font-semibold">{sleepDaysMet}/{sleepDaysTotal}</span>
            </p>
            <p className="text-sm">
              Tendencia peso: <span className="font-semibold">{weightTrend}</span>
            </p>
            <p className="text-sm">
              Biofeedback 7d: <span className="font-semibold">Energía {bioEnergy}/10</span>,{" "}
              <span className="font-semibold">Estrés {bioStress}/10</span>,{" "}
              <span className="font-semibold">Sueño {bioSleep}/10</span>
            </p>
            <p className="text-sm">
              Días activos (7d): <span className="font-semibold">{activeDays}/7</span>
            </p>
          </>
        )}
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/progress">Ver detalle semanal</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/today#water">Agua</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/today#sleep">Sueño</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={weeklyReviewHref}>Revisión semanal</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklySummaryCard;
