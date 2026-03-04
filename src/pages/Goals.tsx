import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  getGuestBodyMetrics,
  getGuestWeightGoal,
  listBodyMetricsByRange,
  saveGuestWeightGoal,
} from "@/services/bodyMetrics";
import { calculateGoalProgress, resolveInitialWeight, type GoalDirection } from "@/features/goals/goalProgress";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatNumber = (n: number | null) => (n === null ? "--" : `${n.toFixed(1)} kg`);

const Goals = () => {
  const { user, isGuest, profile, updateProfile } = useAuth();
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalDirection, setGoalDirection] = useState<GoalDirection>("lose");
  const guestGoalHydrated = useRef(false);

  const { data: allEntriesFromDb = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, "all"],
    queryFn: () => listBodyMetricsByRange(user?.id ?? null, "all", isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const allEntries = useMemo(
    () => (isGuest ? getGuestBodyMetrics().sort((a, b) => a.measured_at.localeCompare(b.measured_at)) : allEntriesFromDb),
    [allEntriesFromDb, isGuest],
  );

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
    setTargetWeight(profile?.target_weight_kg ? String(profile.target_weight_kg) : "");
    setTargetDate(profile?.target_date || "");
    setGoalDirection((profile?.goal_direction as GoalDirection) || "lose");
  }, [profile?.target_weight_kg, profile?.target_date, profile?.goal_direction]);

  const latestWeight = allEntries.length ? Number(allEntries[allEntries.length - 1].weight_kg) : null;
  const initialWeight = resolveInitialWeight(allEntries, profile?.weight ?? null);
  const targetWeightValue = profile?.target_weight_kg ?? null;
  const startWeightForProgress = profile?.start_weight_kg ?? initialWeight;
  const progress = calculateGoalProgress({
    start: startWeightForProgress,
    target: targetWeightValue,
    current: latestWeight,
    direction: (profile?.goal_direction as GoalDirection) ?? null,
  });

  const remaining =
    targetWeightValue !== null && latestWeight !== null ? `${(targetWeightValue - latestWeight).toFixed(1)} kg` : "--";

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

    const baseline = profile?.start_weight_kg ?? latestWeight ?? initialWeight ?? profile?.weight ?? numericTarget;
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
    } catch (error: any) {
      toast.error(error?.message || "Failed to save goal.");
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {isGuest && <GuestWarningBanner />}

      <div className="flex items-center gap-3">
        <Target className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground">Create and manage your weight goal.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal Progress</CardTitle>
          <CardDescription>Source of truth: initial weight is the first body weight record, fallback to onboarding weight.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-5">
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-semibold">{formatNumber(latestWeight)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Initial</p>
              <p className="font-semibold">{formatNumber(initialWeight)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target</p>
              <p className="font-semibold">{formatNumber(targetWeightValue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-semibold">{remaining}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Progress</p>
              <p className="font-semibold">{progress === null ? "--" : `${progress.toFixed(0)}%`}</p>
            </div>
          </div>
          <Progress value={progress ?? 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{targetWeightValue === null ? "Create goal" : "Edit goal"}</CardTitle>
          <CardDescription>Set your target weight and date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Target weight (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                min="20"
                max="400"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target date</Label>
              <Input id="targetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
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
          <Button onClick={handleSaveGoal}>Save goal</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Goals;
