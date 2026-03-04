import { Link } from "react-router-dom";

import { useDashboardData } from "@/hooks/useDashboardData";
import WeightCard from "@/components/dashboard/WeightCard";
import GoalCard from "@/components/dashboard/GoalCard";
import WaterCard from "@/components/dashboard/WaterCard";
import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const data = useDashboardData();

  const goalHeadline = data.goal.progress === null ? "--" : `${data.goal.progress.toFixed(0)}%`;
  const waterHeadline = `${(data.water.todayMl / 1000).toFixed(1)} / ${(data.water.goalMl / 1000).toFixed(1)} L`;

  return (
    <div className="space-y-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Hola, {data.displayName}</CardTitle>
          <CardDescription>{data.todayLabel}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Estado de meta</p>
            <p className="text-xl font-semibold">Vas {goalHeadline} hacia tu meta</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Agua hoy</p>
            <p className="text-xl font-semibold">{waterHeadline}</p>
            <p className="text-xs text-muted-foreground">
              {data.water.todayMl} ml / {data.water.goalMl} ml
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WeightCard
          latest={data.weight.latest}
          initial={data.weight.initial}
          initialDate={data.weight.initialDate}
          weeklyDelta={data.weight.weeklyDelta}
          loading={data.weight.loading}
          error={data.weight.error}
        />
        <GoalCard
          target={data.goal.target}
          progress={data.goal.progress}
          remainingKg={data.goal.remainingKg}
          loading={data.goal.loading}
          error={data.goal.error}
        />
        <WaterCard showHistoryButton />
        <WeeklySummaryCard
          waterAverageMl={data.water.weekAverageMl}
          waterMonthAverageMl={data.water.monthAverageMl}
          waterDaysMet={data.water.weekDaysMet}
          waterDaysTotal={data.water.weekDaysTotal}
          weightTrend={data.weight.trend}
          loading={data.water.loading}
          error={data.water.error}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Ultimos registros relevantes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Ultimo peso</p>
            {data.weight.latestEntry ? (
              <p className="font-medium">
                {Number(data.weight.latestEntry.weight_kg).toFixed(1)} kg ({data.weight.latestEntry.measured_at})
              </p>
            ) : (
              <p className="font-medium">Sin registros</p>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Ultimos consumos de agua</p>
            {data.water.recentLogs.length === 0 ? (
              <p className="font-medium">Sin registros</p>
            ) : (
              <div className="space-y-1">
                {data.water.recentLogs.slice(0, 3).map((log) => (
                  <p key={log.id} className="font-medium">
                    {log.consumed_ml} ml - {new Date(log.logged_at).toLocaleString()}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/statistics">Ver historial peso</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/water">Ver historial agua</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
