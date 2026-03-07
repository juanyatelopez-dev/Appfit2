import { Droplets } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type WaterGoalRingCardProps = {
  waterMl: number;
  goalMl: number;
  loading?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const WaterGoalRingCard = ({ waterMl, goalMl, loading = false }: WaterGoalRingCardProps) => {
  const safeGoal = Math.max(1, Number(goalMl || 0));
  const safeWater = Math.max(0, Number(waterMl || 0));
  const progress = clamp((safeWater / safeGoal) * 100, 0, 100);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;
  const isGoalMet = safeWater >= safeGoal;

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Agua hoy</p>
          <Droplets className={`h-4 w-4 ${isGoalMet ? "text-primary" : "text-muted-foreground"}`} />
        </div>

        <div className="relative mx-auto mb-3 flex h-40 w-40 items-center justify-center">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--muted) / 0.55)" strokeWidth="10" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              className="transition-all duration-500"
              style={{
                filter: isGoalMet ? "drop-shadow(0 0 10px hsl(var(--primary) / 0.45))" : "none",
              }}
            />
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-semibold leading-none">{loading ? "--" : `${safeWater} ml`}</p>
            <p className="mt-1 text-xs text-muted-foreground">de {safeGoal} ml</p>
            <p className="mt-1 text-xs font-medium text-primary">{Math.round(progress)}%</p>
          </div>
        </div>

        <p className="mb-3 text-center text-xs text-muted-foreground">Objetivo diario: {safeGoal} ml</p>

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/water">Ir a Agua</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default WaterGoalRingCard;
