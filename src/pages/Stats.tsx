import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { calculateGoalProgress, resolveInitialWeight, type GoalDirection } from "@/features/goals/goalProgress";
import {
  BodyMetricEntry,
  getGuestBodyMetrics,
  getGuestWeightGoal,
  listBodyMetricsByRange,
} from "@/services/bodyMetrics";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Range = "7d" | "30d" | "90d" | "all";

const formatNumber = (n: number | null) => (n === null ? "--" : n.toFixed(1));

const findOnOrBefore = (entriesAsc: BodyMetricEntry[], targetISO: string) => {
  const candidates = entriesAsc.filter((e) => e.measured_at <= targetISO);
  if (candidates.length > 0) return candidates[candidates.length - 1];
  return entriesAsc[0] ?? null;
};

const Stats = () => {
  const { user, isGuest, profile } = useAuth();
  const [range, setRange] = useState<Range>("30d");

  const { data: chartEntries = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, range],
    queryFn: () => listBodyMetricsByRange(user?.id ?? null, range, isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const { data: allEntriesFromDb = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, "all"],
    queryFn: () => listBodyMetricsByRange(user?.id ?? null, "all", isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const guestEntries = useMemo(
    () => (isGuest ? getGuestBodyMetrics().sort((a, b) => a.measured_at.localeCompare(b.measured_at)) : []),
    [isGuest],
  );
  const allEntries = isGuest ? guestEntries : allEntriesFromDb;
  const entriesForChart = isGuest
    ? guestEntries.filter((e) => {
        if (range === "all") return true;
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        return e.measured_at >= fromDate.toISOString().slice(0, 10);
      })
    : chartEntries;

  const latest = allEntries.length ? allEntries[allEntries.length - 1] : null;
  const latestWeight = latest ? Number(latest.weight_kg) : null;
  const initialWeight = resolveInitialWeight(allEntries, profile?.weight ?? null);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const ref7 = findOnOrBefore(allEntries, sevenDaysAgo);
  const ref30 = findOnOrBefore(allEntries, thirtyDaysAgo);
  const delta7 = latestWeight !== null && ref7 ? latestWeight - Number(ref7.weight_kg) : null;
  const delta30 = latestWeight !== null && ref30 ? latestWeight - Number(ref30.weight_kg) : null;

  const last7Entries = allEntries.filter((e) => e.measured_at >= sevenDaysAgo);
  const weeklyAvg =
    last7Entries.length > 0
      ? last7Entries.reduce((acc, e) => acc + Number(e.weight_kg), 0) / last7Entries.length
      : null;

  const guestGoal = isGuest ? getGuestWeightGoal() : null;
  const target = (isGuest ? guestGoal?.target_weight_kg : profile?.target_weight_kg) ?? null;
  const start = (isGuest ? guestGoal?.start_weight_kg : profile?.start_weight_kg) ?? initialWeight;
  const goalDirection = ((isGuest ? guestGoal?.goal_direction : profile?.goal_direction) as GoalDirection | null) ?? null;
  const targetDate = (isGuest ? guestGoal?.target_date : profile?.target_date) ?? "--";
  const remaining = target !== null && latestWeight !== null ? target - latestWeight : null;
  const progress = calculateGoalProgress({
    start,
    target,
    current: latestWeight,
    direction: goalDirection,
  });

  const chartData = entriesForChart.map((e) => ({
    date: e.measured_at,
    weight: Number(e.weight_kg),
  }));

  const hasInitialFallback = initialWeight === null;

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {isGuest && <GuestWarningBanner />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weight Goal Summary
          </CardTitle>
          <CardDescription>Goals are managed in the Goals module.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-6">
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-semibold">{formatNumber(latestWeight)} kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Initial</p>
              <p className="font-semibold">{hasInitialFallback ? "Not defined yet" : `${formatNumber(initialWeight)} kg`}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target</p>
              <p className="font-semibold">{formatNumber(target)} kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target date</p>
              <p className="font-semibold">{targetDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-semibold">{remaining === null ? "--" : `${remaining > 0 ? "+" : ""}${remaining.toFixed(1)} kg`}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Progress</p>
              <p className="font-semibold">{progress === null ? "--" : `${progress.toFixed(0)}%`}</p>
            </div>
          </div>

          {hasInitialFallback && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/weight">Register weight</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/onboarding">Complete onboarding</Link>
              </Button>
            </div>
          )}

          <Button asChild>
            <Link to="/goals">{target === null ? "Create goal" : "Manage goal"}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latest weight</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(latestWeight)} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Change vs 7d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{delta7 === null ? "--" : `${delta7 > 0 ? "+" : ""}${delta7.toFixed(1)} kg`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Change vs 30d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{delta30 === null ? "--" : `${delta30 > 0 ? "+" : ""}${delta30.toFixed(1)} kg`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Weekly average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{weeklyAvg === null ? "--" : `${weeklyAvg.toFixed(1)} kg`}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Weight Trend</CardTitle>
            <CardDescription>Body weight over time</CardDescription>
          </div>
          <div className="flex gap-2">
            {(["7d", "30d", "90d", "all"] as Range[]).map((r) => (
              <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
                {r.toUpperCase()}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weight data for this range.</p>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                    formatter={(value: number) => [`${value} kg`, "Weight"]}
                  />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;
