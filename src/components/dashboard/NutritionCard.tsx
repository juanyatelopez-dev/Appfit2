import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { getNutritionDaySummary } from "@/services/nutrition";

const NutritionCard = () => {
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
  const timeZone = (profile as { timezone?: string } | null)?.timezone || DEFAULT_WATER_TIMEZONE;
  const today = useMemo(() => new Date(), []);

  const dayQuery = useQuery({
    queryKey: ["nutrition_day_summary", userId, "dashboard_today", isGuest, timeZone],
    queryFn: () => getNutritionDaySummary(userId, today, { isGuest, timeZone, profile: profile as any }).catch(() => null),
    enabled: Boolean(userId) || isGuest,
  });

  const totals = dayQuery.data?.totals;
  const goals = dayQuery.data?.goals;
  const lastEntry = dayQuery.data?.lastEntry;

  const caloriePct = goals ? Math.min(100, Math.round(((totals?.calories ?? 0) / Math.max(goals.calorie_goal, 1)) * 100)) : 0;
  const proteinPct = goals ? Math.min(100, Math.round(((totals?.protein_g ?? 0) / Math.max(goals.protein_goal_g, 1)) * 100)) : 0;
  const carbsPct = goals ? Math.min(100, Math.round(((totals?.carbs_g ?? 0) / Math.max(goals.carb_goal_g, 1)) * 100)) : 0;
  const fatPct = goals ? Math.min(100, Math.round(((totals?.fat_g ?? 0) / Math.max(goals.fat_goal_g, 1)) * 100)) : 0;

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Alimentacion hoy</p>
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xl font-semibold md:text-2xl">
          {totals?.calories ?? 0} / {goals?.calorie_goal ?? 2000} kcal
        </p>
        <Progress value={caloriePct} />
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground">
            Proteina {totals?.protein_g ?? 0}/{goals?.protein_goal_g ?? 150} g ({proteinPct}%)
          </p>
          <p className="text-muted-foreground">
            Carbs {totals?.carbs_g ?? 0}/{goals?.carb_goal_g ?? 250} g ({carbsPct}%)
          </p>
          <p className="text-muted-foreground">
            Grasas {totals?.fat_g ?? 0}/{goals?.fat_goal_g ?? 70} g ({fatPct}%)
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Ultima comida: {lastEntry ? `${lastEntry.food_name} (${Math.round(lastEntry.calories)} kcal)` : "Sin registros"}
        </p>
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/nutrition">Ir a alimentación</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default NutritionCard;
