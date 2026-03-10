import { Droplets, Flame, Moon, Zap } from "lucide-react";
import type { ComponentType } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  loading?: boolean;
  waterMl: number;
  waterGoalMl: number;
  sleepMinutes: number;
  sleepGoalMinutes: number;
  energy?: number | null;
  stress?: number | null;
  streakDays: number;
};

const Item = ({
  title,
  value,
  subtitle,
  icon: Icon,
  progress,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  progress?: number;
}) => (
  <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
    <CardContent className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {progress !== undefined ? <Progress value={progress} className="h-1.5" /> : null}
    </CardContent>
  </Card>
);

const TodayStatusRow = ({
  loading = false,
  waterMl,
  waterGoalMl,
  sleepMinutes,
  sleepGoalMinutes,
  energy,
  stress,
  streakDays,
}: Props) => {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={`today-skeleton-${idx}`} className="rounded-2xl border-border/60 bg-card/80">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-1.5 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const waterProgress = Math.min(100, Math.round((waterMl / Math.max(waterGoalMl, 1)) * 100));
  const sleepProgress = Math.min(100, Math.round((sleepMinutes / Math.max(sleepGoalMinutes, 1)) * 100));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Item title="Agua hoy" value={`${waterMl} ml`} subtitle={`Objetivo: ${waterGoalMl} ml`} icon={Droplets} progress={waterProgress} />
      <Item
        title="Sueno hoy"
        value={`${(sleepMinutes / 60).toFixed(1)} h`}
        subtitle={`Objetivo: ${(sleepGoalMinutes / 60).toFixed(1)} h`}
        icon={Moon}
        progress={sleepProgress}
      />
      <Item title="Biofeedback" value={`E ${energy ?? "--"} | S ${stress ?? "--"}`} subtitle="Energia y estres diarios" icon={Zap} />
      <Item
        title="Consistencia"
        value={`${streakDays} dias`}
        subtitle="Actividad registrada reciente"
        icon={Flame}
        progress={Math.min(100, Math.round((streakDays / 7) * 100))}
      />
    </div>
  );
};

export default TodayStatusRow;
