import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getWaterDayTotal, getWaterGoal, getWaterLogsByDate, getWaterRangeTotals } from "@/services/waterIntake";
import WaterCard from "@/components/dashboard/WaterCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Range = "7d" | "30d" | "month";

const Water = () => {
  const { user, isGuest, profile } = useAuth();
  const [range, setRange] = useState<Range>("7d");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const tz = profile?.timezone || DEFAULT_WATER_TIMEZONE;
  const today = useMemo(() => new Date(), []);
  const dayKey = getDateKeyForTimezone(today, tz);

  const rangeDates = useMemo(() => {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);
    if (range === "7d") from.setDate(from.getDate() - 6);
    if (range === "30d") from.setDate(from.getDate() - 29);
    if (range === "month") {
      from.setDate(1);
    }
    return { from, to };
  }, [range]);

  const { data: todayTotal = 0 } = useQuery({
    queryKey: ["water_day_total", user?.id, dayKey],
    queryFn: () => getWaterDayTotal(user?.id ?? null, today, { isGuest, timeZone: tz }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: goal = { water_goal_ml: 2000, water_quick_options_ml: [250, 500, 1000, 2000] } } = useQuery({
    queryKey: ["water_goal", user?.id],
    queryFn: () => getWaterGoal(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: totals = [] } = useQuery({
    queryKey: ["water_range", user?.id, range, rangeDates.from.toISOString(), rangeDates.to.toISOString()],
    queryFn: () => getWaterRangeTotals(user?.id ?? null, rangeDates.from, rangeDates.to, { isGuest, timeZone: tz }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const { data: selectedLogs = [] } = useQuery({
    queryKey: ["water_logs_day", user?.id, selectedDate.toISOString().slice(0, 10)],
    queryFn: () => getWaterLogsByDate(user?.id ?? null, selectedDate, { isGuest, timeZone: tz }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const chartData = totals.map((item) => ({
    date: item.date_key,
    liters: Number((item.total_ml / 1000).toFixed(2)),
    total_ml: item.total_ml,
  }));

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <WaterCard showHistoryButton={false} />

      <Card>
        <CardHeader>
          <CardTitle>Analitica de agua</CardTitle>
          <CardDescription>Día, semana y mes con totales diarios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Hoy</p>
              <p className="text-xl font-semibold">{todayTotal} ml</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Objetivo</p>
              <p className="text-xl font-semibold">{goal.water_goal_ml} ml</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Rango</p>
              <p className="text-xl font-semibold">{range === "7d" ? "Últimos 7 días" : range === "30d" ? "Últimos 30 días" : "Este mes"}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant={range === "7d" ? "default" : "outline"} onClick={() => setRange("7d")}>
              Semana
            </Button>
            <Button size="sm" variant={range === "30d" ? "default" : "outline"} onClick={() => setRange("30d")}>
              Mes (30d)
            </Button>
            <Button size="sm" variant={range === "month" ? "default" : "outline"} onClick={() => setRange("month")}>
              Este mes
            </Button>
          </div>

          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para el rango seleccionado.</p>
          ) : (
            <div className="h-[240px] w-full md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                    formatter={(value: number | string) => {
                      const liters = typeof value === "number" ? value : Number(value);
                      return [`${Math.round(liters * 1000)} ml`, "Total"];
                    }}
                  />
                  <Bar dataKey="liters" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial del día seleccionado</CardTitle>
          <CardDescription>Eventos individuales del consumo de agua.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="date"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedDate.toISOString().slice(0, 10)}
            onChange={(e) => setSelectedDate(new Date(`${e.target.value}T00:00:00`))}
          />
          {selectedLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay eventos para esta fecha.</p>
          ) : (
            <div className="space-y-2">
              {selectedLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="font-medium">{log.consumed_ml} ml</p>
                  <p className="text-sm text-muted-foreground">{new Date(log.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Water;
