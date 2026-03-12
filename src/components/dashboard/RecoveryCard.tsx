import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  loading?: boolean;
  score: number;
  status: string;
  drivers: string[];
  subscores: {
    sleep: number;
    biofeedback: number;
    hydration: number;
    consistency: number;
  };
};

const RecoveryCard = ({ loading = false, score, status, drivers, subscores }: Props) => {
  if (loading) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Recovery Score</CardTitle>
          <CardDescription>Estado de recuperación diario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  const ringColor = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500";
  const strokeColor = score >= 75 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-rose-500";
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(circumference, (score / 100) * circumference));

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>Recovery Score</CardTitle>
        <CardDescription>Modelo diario basado en sueño, biofeedback, hidratación y consistencia.</CardDescription>
      </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 md:h-28 md:w-28">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={radius} className="fill-none stroke-muted/40" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                className={`fill-none ${strokeColor}`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`text-xl font-bold md:text-2xl ${ringColor}`}>{score}</p>
              <p className="text-[11px] uppercase text-muted-foreground">/100</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className={`text-base font-semibold ${ringColor}`}>{status}</p>
            <p className="text-xs text-muted-foreground">Drivers: {drivers.join(" | ")}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-2">
            <p className="text-xs text-muted-foreground">Sueño</p>
            <Progress value={subscores.sleep} className="h-1.5 mt-1" />
          </div>
          <div className="rounded-lg border border-border/60 p-2">
            <p className="text-xs text-muted-foreground">Biofeedback</p>
            <Progress value={subscores.biofeedback} className="h-1.5 mt-1" />
          </div>
          <div className="rounded-lg border border-border/60 p-2">
            <p className="text-xs text-muted-foreground">Hidratacion</p>
            <Progress value={subscores.hydration} className="h-1.5 mt-1" />
          </div>
          <div className="rounded-lg border border-border/60 p-2">
            <p className="text-xs text-muted-foreground">Consistencia</p>
            <Progress value={subscores.consistency} className="h-1.5 mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecoveryCard;
