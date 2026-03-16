import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import {
  DASHBOARD_TREND_METRIC_DEFINITIONS,
  DEFAULT_DASHBOARD_TREND_METRICS,
  type DashboardTrendMetricKey,
  getDashboardTrendMetricPreferences,
  saveDashboardTrendMetricPreferences,
} from "@/services/dashboardTrendMetrics";

type TrendRow = {
  dateKey: string;
  label: string;
  weight: number | null;
  water: number;
  sleep_hours: number;
  sleep_quality: number | null;
  energy: number | null;
  stress: number | null;
  training_energy: number | null;
  hunger: number | null;
  digestion: number | null;
  libido: number | null;
  waist_cm: number | null;
  body_fat_pct: number | null;
  completion_count: number;
  goal_hits: number;
};

type Props = {
  loading?: boolean;
  data: TrendRow[];
};

const formatMetricValue = (metric: DashboardTrendMetricKey, value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  const v = Number(value);
  if (metric === "weight") return `${v.toFixed(1)} kg`;
  if (metric === "water") return `${Math.round(v)} ml`;
  if (metric === "sleep_hours") return `${v.toFixed(1)} h`;
  if (metric === "waist_cm") return `${v.toFixed(1)} cm`;
  if (metric === "body_fat_pct") return `${v.toFixed(1)} %`;
  if (metric === "completion_count") return `${Math.round(v)}/6`;
  if (metric === "goal_hits") return `${Math.round(v)}/2`;
  return `${v.toFixed(1)}/10`;
};

const TrendChart = ({ title, color, data, dataKey }: { title: string; color: string; data: TrendRow[]; dataKey: DashboardTrendMetricKey }) => (
  <div className="rounded-lg border border-border/60 p-3">
    <p className="mb-2 text-xs text-muted-foreground">{title}</p>
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value: number | string) => formatMetricValue(dataKey, typeof value === "number" ? value : Number(value))}
            labelFormatter={(label) => `Dia ${label}`}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const WeeklyTrendsCard = ({ loading = false, data }: Props) => {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const userId = user?.id ?? null;
  const preferencesKey = ["dashboard", "trend_metric_preferences", userId, isGuest] as const;

  const preferencesQuery = useQuery({
    queryKey: preferencesKey,
    queryFn: () => getDashboardTrendMetricPreferences(userId, { isGuest }),
    enabled: Boolean(userId) || isGuest,
  });

  const selectedMetrics = preferencesQuery.data ?? DEFAULT_DASHBOARD_TREND_METRICS;

  const savePreferencesMutation = useMutation({
    mutationFn: (next: DashboardTrendMetricKey[]) => saveDashboardTrendMetricPreferences(userId, next, { isGuest }),
    onSuccess: (saved) => {
      queryClient.setQueryData(preferencesKey, saved);
      toast.success("Metricas de tendencias actualizadas.");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "No se pudieron guardar las metricas."));
    },
  });

  const handleToggleMetric = (metric: DashboardTrendMetricKey, enabled: boolean) => {
    const base = selectedMetrics;
    const next = enabled ? Array.from(new Set([...base, metric])) : base.filter((item) => item !== metric);
    if (next.length === 0) {
      toast.error("Debes mantener al menos una metrica activa.");
      return;
    }
    savePreferencesMutation.mutate(next);
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle>Tendencias semanales</CardTitle>
          <CardDescription>Evolución de los últimos 7 días.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const selectedDefinitions = DASHBOARD_TREND_METRIC_DEFINITIONS.filter((definition) => selectedMetrics.includes(definition.key));

  return (
    <Card className="rounded-2xl border-border/50 bg-card/80">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Tendencias semanales</CardTitle>
            <CardDescription>Personaliza y monitorea las métricas clave de los últimos 7 días.</CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Personalizar
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-3">
              <p className="text-sm font-medium">Selecciona metricas para tendencias</p>
              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-auto pr-1">
                {DASHBOARD_TREND_METRIC_DEFINITIONS.map((metric) => {
                  const checked = selectedMetrics.includes(metric.key);
                  return (
                    <div key={metric.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`trend-${metric.key}`}
                        checked={checked}
                        onCheckedChange={(value) => handleToggleMetric(metric.key, Boolean(value))}
                        disabled={savePreferencesMutation.isPending}
                      />
                      <Label htmlFor={`trend-${metric.key}`} className="text-sm font-normal">
                        {metric.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {selectedDefinitions.map((metric) => (
          <TrendChart key={metric.key} title={metric.label} color={metric.color} data={data} dataKey={metric.key} />
        ))}
      </CardContent>
    </Card>
  );
};

export default WeeklyTrendsCard;
