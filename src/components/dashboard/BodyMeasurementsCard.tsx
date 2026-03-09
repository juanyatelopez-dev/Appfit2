import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { BodyMannequin, type MeasurementPoint } from "@/components/body/BodyMannequin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BodyMeasurement } from "@/services/bodyMeasurements";

type Props = {
  className?: string;
  loading?: boolean;
  latest: BodyMeasurement | null;
  previous: BodyMeasurement | null;
  latestWeight: number | null;
  weeklyWaistDeltaCm: number | null;
  goalDirection: "lose" | "gain" | "maintain" | null;
};

const metricDelta = (latest?: number | null, previous?: number | null) => {
  if (latest === null || latest === undefined || previous === null || previous === undefined) return null;
  return Number((latest - previous).toFixed(1));
};

const formatDelta = (value: number | null) => {
  if (value === null) return undefined;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} cm`;
};

const measurementTone = (
  key: "neck" | "arm" | "waist" | "hip" | "thigh",
  delta: number | null,
  goalDirection: "lose" | "gain" | "maintain" | null,
): MeasurementPoint["tone"] => {
  if (delta === null || delta === 0) return "neutral";
  if (key === "waist" || key === "hip") {
    if (goalDirection === "gain") return delta > 0 ? "positive" : "negative";
    return delta < 0 ? "positive" : "negative";
  }
  if (key === "arm" || key === "thigh") {
    if (goalDirection === "lose") return delta < 0 ? "positive" : "negative";
    return delta > 0 ? "positive" : "negative";
  }
  return delta < 0 ? "positive" : "negative";
};

const BodyMeasurementsCard = ({
  className,
  loading = false,
  latest,
  previous,
  latestWeight,
  weeklyWaistDeltaCm,
  goalDirection,
}: Props) => {
  const navigate = useNavigate();
  if (loading) {
    return (
      <Card className={`rounded-2xl border-border/60 bg-card/80 shadow-sm ${className ?? ""}`}>
        <CardHeader>
          <CardTitle>Resumen de medidas corporales</CardTitle>
          <CardDescription>Visualizacion corporal y variacion de medidas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!latest) {
    return (
      <Card className={`rounded-2xl border-border/60 bg-card/80 shadow-sm ${className ?? ""}`}>
        <CardHeader>
          <CardTitle>Resumen de medidas corporales</CardTitle>
          <CardDescription>Aún no hay medidas corporales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Registra cuello, cintura, cadera, brazo y muslo para ver el maniqui interactivo.</p>
          <Button asChild>
            <Link to="/body">Agregar medidas</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const neckDelta = metricDelta(latest.neck_cm, previous?.neck_cm ?? null);
  const waistDelta = metricDelta(latest.waist_cm, previous?.waist_cm ?? null);
  const hipDelta = metricDelta(latest.hip_cm, previous?.hip_cm ?? null);
  const armDelta = metricDelta(latest.arm_cm, previous?.arm_cm ?? null);
  const thighDelta = metricDelta(latest.thigh_cm, previous?.thigh_cm ?? null);

  const points: MeasurementPoint[] = [
    {
      key: "neck",
      label: "Cuello",
      valueText: `${latest.neck_cm.toFixed(1)} cm`,
      deltaText: formatDelta(neckDelta),
      x: 50,
      y: 18,
      tone: measurementTone("neck", neckDelta, goalDirection),
    },
    {
      key: "arm",
      label: "Brazo",
      valueText: latest.arm_cm ? `${Number(latest.arm_cm).toFixed(1)} cm` : "--",
      deltaText: formatDelta(armDelta),
      x: 28,
      y: 38,
      tone: measurementTone("arm", armDelta, goalDirection),
    },
    {
      key: "waist",
      label: "Cintura",
      valueText: `${latest.waist_cm.toFixed(1)} cm`,
      deltaText: formatDelta(waistDelta),
      x: 59,
      y: 42,
      tone: measurementTone("waist", waistDelta, goalDirection),
    },
    {
      key: "hip",
      label: "Cadera",
      valueText: latest.hip_cm ? `${Number(latest.hip_cm).toFixed(1)} cm` : "--",
      deltaText: formatDelta(hipDelta),
      x: 60,
      y: 50,
      tone: measurementTone("hip", hipDelta, goalDirection),
    },
    {
      key: "thigh",
      label: "Muslo",
      valueText: latest.thigh_cm ? `${Number(latest.thigh_cm).toFixed(1)} cm` : "--",
      deltaText: formatDelta(thighDelta),
      x: 31,
      y: 68,
      tone: measurementTone("thigh", thighDelta, goalDirection),
    },
  ];

  return (
    <Card className={`rounded-2xl border-border/60 bg-card/80 shadow-sm ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Resumen de medidas corporales</CardTitle>
          <CardDescription>Ultima medicion: {latest.date_key}</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/body">Editar medidas</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex justify-center lg:justify-start">
          <BodyMannequin points={points} onPointClick={() => navigate("/body")} />
        </div>
        <div className="w-full space-y-2">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Peso mas reciente</p>
            <p className="text-lg font-semibold">{latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : "--"}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Grasa corporal est.</p>
            <p className="text-lg font-semibold">
              {latest.body_fat_pct !== null && latest.body_fat_pct !== undefined ? `${Number(latest.body_fat_pct).toFixed(1)}%` : "--"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Cambio semanal</p>
            <p className="text-sm font-medium">
              {weeklyWaistDeltaCm === null
                ? "--"
                : `${weeklyWaistDeltaCm > 0 ? "+" : ""}${weeklyWaistDeltaCm.toFixed(1)} cm cintura`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BodyMeasurementsCard;
