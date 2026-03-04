import { Link } from "react-router-dom";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  target: number | null;
  progress: number | null;
  remainingKg: number | null;
  loading?: boolean;
  error?: unknown;
};

const GoalCard = ({ target, progress, remainingKg, loading = false, error }: Props) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Meta
        </CardTitle>
        <CardDescription>Objetivo y progreso actual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar meta.</p>
        ) : (
          <>
            <p className="text-2xl font-semibold">{target !== null ? `${target.toFixed(1)} kg` : "Sin meta"}</p>
            <Progress value={progress ?? 0} />
            <p className="text-sm text-muted-foreground">
              Progreso: {progress === null ? "--" : `${progress.toFixed(0)}%`}
            </p>
            <p className="text-sm text-muted-foreground">
              {remainingKg === null ? "Sin estimacion" : `Te faltan ${Math.abs(remainingKg).toFixed(1)} kg`}
            </p>
          </>
        )}
        <Button asChild size="sm">
          <Link to="/goals">{target === null ? "Crear meta" : "Editar meta"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoalCard;
