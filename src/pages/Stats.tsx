import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
  BodyMetricEntry,
  getGuestBodyMetrics,
  getGuestWeightGoal,
  listBodyMetricsByRange,
  saveGuestWeightGoal,
} from "@/services/bodyMetrics";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Range = "7d" | "30d" | "90d" | "all";
type GoalDirection = "lose" | "gain" | "maintain";

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const formatNumber = (n: number | null) => (n === null ? "--" : n.toFixed(1));

const findOnOrBefore = (entriesAsc: BodyMetricEntry[], targetISO: string) => {
  const candidates = entriesAsc.filter((e) => e.measured_at <= targetISO);
  if (candidates.length > 0) return candidates[candidates.length - 1];
  return entriesAsc[0] ?? null;
};

const Stats = () => {
  const { user, isGuest, profile, updateProfile } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const [goalOpen, setGoalOpen] = useState(false);
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalDirection, setGoalDirection] = useState<GoalDirection>("lose");
  const guestGoalHydrated = useRef(false);

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

  const guestEntries = useMemo(() => (isGuest ? getGuestBodyMetrics().sort((a, b) => a.measured_at.localeCompare(b.measured_at)) : []), [isGuest]);
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

  useEffect(() => {
    if (!isGuest || guestGoalHydrated.current) return;
    const guestGoal = getGuestWeightGoal();
    updateProfile({
      target_weight_kg: guestGoal.target_weight_kg,
      target_date: guestGoal.target_date,
      start_weight_kg: guestGoal.start_weight_kg,
      goal_direction: guestGoal.goal_direction,
    });
    guestGoalHydrated.current = true;
  }, [isGuest, updateProfile]);

  useEffect(() => {
    if (!goalOpen) return;
    setTargetWeight(profile?.target_weight_kg ? String(profile.target_weight_kg) : "");
    setTargetDate(profile?.target_date || "");
    setGoalDirection((profile?.goal_direction as GoalDirection) || "lose");
  }, [goalOpen, profile?.target_weight_kg, profile?.target_date, profile?.goal_direction]);

  const latest = allEntries.length ? allEntries[allEntries.length - 1] : null;
  const latestWeight = latest ? Number(latest.weight_kg) : null;

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

  const target = profile?.target_weight_kg ?? null;
  const start = profile?.start_weight_kg ?? null;
  const remaining = target !== null && latestWeight !== null ? target - latestWeight : null;

  const progress = useMemo(() => {
    if (target === null || start === null || latestWeight === null) return null;
    const direction = (profile?.goal_direction as GoalDirection) || (target < start ? "lose" : target > start ? "gain" : "maintain");

    if (direction === "lose") {
      const denom = start - target;
      if (denom === 0) return 100;
      return clamp(((start - latestWeight) / denom) * 100);
    }
    if (direction === "gain") {
      const denom = target - start;
      if (denom === 0) return 100;
      return clamp(((latestWeight - start) / denom) * 100);
    }

    const diff = Math.abs((latestWeight ?? 0) - (target ?? 0));
    return clamp(100 - diff * 20);
  }, [latestWeight, profile?.goal_direction, start, target]);

  const handleSaveGoal = async () => {
    const numericTarget = Number(targetWeight);
    if (!Number.isFinite(numericTarget) || numericTarget < 20 || numericTarget > 400) {
      toast.error("Target weight must be between 20 and 400 kg.");
      return;
    }
    if (!targetDate) {
      toast.error("Target date is required.");
      return;
    }

    const baseline = profile?.start_weight_kg ?? latestWeight ?? profile?.weight ?? numericTarget;

    const payload = {
      target_weight_kg: numericTarget,
      target_date: targetDate,
      start_weight_kg: baseline,
      goal_direction: goalDirection,
    };

    try {
      await updateProfile(payload);
      if (isGuest) {
        saveGuestWeightGoal(payload);
        toast.info("Guest mode: changes won't be saved to your account.");
      } else {
        toast.success("Weight goal saved.");
      }
      setGoalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save goal.");
    }
  };

  const chartData = entriesForChart.map((e) => ({
    date: e.measured_at,
    weight: Number(e.weight_kg),
  }));

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {isGuest && <GuestWarningBanner />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weight Goal
          </CardTitle>
          <CardDescription>Track progress toward your target weight.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            <div><p className="text-muted-foreground">Current</p><p className="font-semibold">{formatNumber(latestWeight)} kg</p></div>
            <div><p className="text-muted-foreground">Target</p><p className="font-semibold">{formatNumber(target)} kg</p></div>
            <div><p className="text-muted-foreground">Target date</p><p className="font-semibold">{profile?.target_date || "--"}</p></div>
            <div><p className="text-muted-foreground">Remaining</p><p className="font-semibold">{remaining === null ? "--" : `${remaining > 0 ? "+" : ""}${remaining.toFixed(1)} kg`}</p></div>
            <div><p className="text-muted-foreground">Progress</p><p className="font-semibold">{progress === null ? "--" : `${progress.toFixed(0)}%`}</p></div>
          </div>
          <Button onClick={() => setGoalOpen(true)}>
            {target === null ? "Set your goal" : "Edit goal"}
          </Button>
          {isGuest && <p className="text-xs text-amber-700">Guest mode: data won't be saved to your account.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Latest weight</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatNumber(latestWeight)} kg</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Change vs 7d</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{delta7 === null ? "--" : `${delta7 > 0 ? "+" : ""}${delta7.toFixed(1)} kg`}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Change vs 30d</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{delta30 === null ? "--" : `${delta30 > 0 ? "+" : ""}${delta30.toFixed(1)} kg`}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Weekly average</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{weeklyAvg === null ? "--" : `${weeklyAvg.toFixed(1)} kg`}</p></CardContent></Card>
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
                  <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleDateString()} formatter={(value: number) => [`${value} kg`, "Weight"]} />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Weight Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Target weight (kg)</Label>
              <Input id="targetWeight" type="number" min="20" max="400" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target date</Label>
              <Input id="targetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Goal direction</Label>
              <Select value={goalDirection} onValueChange={(value: GoalDirection) => setGoalDirection(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Lose</SelectItem>
                  <SelectItem value="gain">Gain</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isGuest && <p className="text-xs text-amber-700">Guest mode: data won't be saved to your account.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGoal}>Save goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stats;
