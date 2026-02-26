import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Droplets, Moon, PencilLine, Plus, Scale, Target, Zap } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ProfileSummaryCard from "@/components/dashboard/ProfileSummaryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  BodyMetricEntry,
  getGuestBodyMetrics,
  listBodyMetricsByRange,
} from "@/services/bodyMetrics";
import {
  DailyCheckin,
  getDailyCheckin,
  getGuestDailyCheckins,
  saveGuestDailyCheckins,
  upsertDailyCheckin,
} from "@/services/dailyCheckins";
import {
  DailyTask,
  DEFAULT_DAILY_TASKS,
  ensureDailyTasks,
  getGuestDailyTasks,
  saveGuestDailyTasks,
  setDailyTaskCompleted,
} from "@/services/dailyTasks";

const todayISO = () => new Date().toISOString().slice(0, 10);

const computeStreak = (entriesAsc: BodyMetricEntry[]) => {
  const days = new Set(entriesAsc.map((e) => e.measured_at));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const d = cursor.toISOString().slice(0, 10);
    if (!days.has(d)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const Dashboard = () => {
  const today = todayISO();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, user, isGuest } = useAuth();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [sleepHoursInput, setSleepHoursInput] = useState("");

  const [guestDailyCheckin, setGuestDailyCheckin] = useState<DailyCheckin | null>(null);
  const [guestTasks, setGuestTasks] = useState<DailyTask[]>([]);
  const guestActionWarned = useRef(false);

  const { data: allMetrics = [] } = useQuery({
    queryKey: ["body_metrics", user?.id, "all"],
    queryFn: () => listBodyMetricsByRange(user?.id ?? null, "all", isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const { data: todayCheckin = null } = useQuery({
    queryKey: ["daily_checkin", user?.id, today],
    queryFn: () => getDailyCheckin(user?.id ?? null, today, isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const { data: todayTasks = [] } = useQuery({
    queryKey: ["daily_tasks", user?.id, today],
    queryFn: () => ensureDailyTasks(user?.id ?? null, today, isGuest),
    enabled: Boolean(user?.id) && !isGuest,
  });

  useEffect(() => {
    if (!isGuest) return;

    const checkins = getGuestDailyCheckins();
    const tasksStore = getGuestDailyTasks();

    const fallbackCheckin: DailyCheckin = {
      id: "guest-checkin",
      user_id: "guest",
      date: today,
      water_count: 0,
      workout_done: false,
      sleep_hours: null,
      created_at: new Date().toISOString(),
    };

    setGuestDailyCheckin(checkins[today] ? { ...fallbackCheckin, ...checkins[today] } : fallbackCheckin);

    const existingTasks = tasksStore[today];
    if (existingTasks && existingTasks.length > 0) {
      setGuestTasks(existingTasks);
    } else {
      const seeded: DailyTask[] = DEFAULT_DAILY_TASKS.map((title) => ({
        id: crypto.randomUUID(),
        user_id: "guest",
        date: today,
        title,
        completed: false,
        created_at: new Date().toISOString(),
      }));
      const nextStore = { ...tasksStore, [today]: seeded };
      saveGuestDailyTasks(nextStore);
      setGuestTasks(seeded);
    }
  }, [isGuest, today]);

  const checkin = isGuest ? guestDailyCheckin : todayCheckin;
  const tasks = isGuest ? guestTasks : todayTasks;
  const metricsAsc = isGuest
    ? getGuestBodyMetrics().sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    : allMetrics;

  const latestWeightEntry = metricsAsc.length > 0 ? metricsAsc[metricsAsc.length - 1] : null;
  const previousWeightEntry = metricsAsc.length > 1 ? metricsAsc[metricsAsc.length - 2] : null;
  const todayWeightEntry = metricsAsc.find((m) => m.measured_at === today) || null;
  const latestWeight = latestWeightEntry ? Number(latestWeightEntry.weight_kg) : (profile?.weight ?? null);
  const weightDelta = latestWeightEntry && previousWeightEntry
    ? Number(latestWeightEntry.weight_kg) - Number(previousWeightEntry.weight_kg)
    : null;
  const streakDays = computeStreak(metricsAsc);

  const goalProgress = useMemo(() => {
    const start = profile?.start_weight_kg ?? null;
    const target = profile?.target_weight_kg ?? null;
    const current = latestWeight;
    const direction =
      profile?.goal_direction ??
      (start !== null && target !== null ? (target < start ? "lose" : target > start ? "gain" : "maintain") : null);
    if (start === null || target === null || current === null || !direction) return null;

    if (direction === "lose") {
      const denom = start - target;
      if (denom === 0) return 100;
      return Math.max(0, Math.min(100, ((start - current) / denom) * 100));
    }
    if (direction === "gain") {
      const denom = target - start;
      if (denom === 0) return 100;
      return Math.max(0, Math.min(100, ((current - start) / denom) * 100));
    }
    return Math.max(0, Math.min(100, 100 - Math.abs(current - target) * 20));
  }, [latestWeight, profile?.goal_direction, profile?.start_weight_kg, profile?.target_weight_kg]);

  const warnGuestActionOnce = () => {
    if (!isGuest || guestActionWarned.current) return;
    toast.info("Guest mode: data won't be saved.");
    guestActionWarned.current = true;
  };

  const checkinMutation = useMutation({
    mutationFn: async (partial: Partial<Pick<DailyCheckin, "water_count" | "workout_done" | "sleep_hours">>) =>
      upsertDailyCheckin(user?.id ?? null, today, partial, isGuest),
    onMutate: async (partial) => {
      if (!user?.id || isGuest) return;
      await queryClient.cancelQueries({ queryKey: ["daily_checkin", user.id, today] });
      const prev = queryClient.getQueryData<DailyCheckin | null>(["daily_checkin", user.id, today]);
      const optimistic: DailyCheckin = {
        id: prev?.id || "optimistic-checkin",
        user_id: user.id,
        date: today,
        water_count: partial.water_count ?? prev?.water_count ?? 0,
        workout_done: partial.workout_done ?? prev?.workout_done ?? false,
        sleep_hours: partial.sleep_hours ?? prev?.sleep_hours ?? null,
        created_at: prev?.created_at || new Date().toISOString(),
      };
      queryClient.setQueryData(["daily_checkin", user.id, today], optimistic);
      return { prev };
    },
    onError: (_error, _partial, context) => {
      if (!user?.id || !context) return;
      queryClient.setQueryData(["daily_checkin", user.id, today], context.prev ?? null);
    },
    onSuccess: async () => {
      if (!isGuest && user?.id) {
        await queryClient.invalidateQueries({ queryKey: ["daily_checkin", user.id, today] });
      }
    },
  });

  const taskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) =>
      setDailyTaskCompleted(id, completed, user?.id ?? null, isGuest),
    onMutate: async ({ id, completed }) => {
      if (!user?.id || isGuest) return;
      await queryClient.cancelQueries({ queryKey: ["daily_tasks", user.id, today] });
      const prev = queryClient.getQueryData<DailyTask[]>(["daily_tasks", user.id, today]) || [];
      queryClient.setQueryData(
        ["daily_tasks", user.id, today],
        prev.map((task) => (task.id === id ? { ...task, completed } : task)),
      );
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (!user?.id || !context) return;
      queryClient.setQueryData(["daily_tasks", user.id, today], context.prev || []);
    },
    onSuccess: async () => {
      if (!isGuest && user?.id) {
        await queryClient.invalidateQueries({ queryKey: ["daily_tasks", user.id, today] });
      }
    },
  });

  const handleAddWater = async () => {
    if (isGuest) {
      warnGuestActionOnce();
      const current = guestDailyCheckin ?? {
        id: "guest-checkin",
        user_id: "guest",
        date: today,
        water_count: 0,
        workout_done: false,
        sleep_hours: null,
        created_at: new Date().toISOString(),
      };
      const next = { ...current, water_count: (current.water_count || 0) + 1 };
      setGuestDailyCheckin(next);
      const map = getGuestDailyCheckins();
      map[today] = {
        date: today,
        water_count: next.water_count,
        workout_done: next.workout_done,
        sleep_hours: next.sleep_hours,
      };
      saveGuestDailyCheckins(map);
      return;
    }

    const nextWater = (checkin?.water_count || 0) + 1;
    await checkinMutation.mutateAsync({
      water_count: nextWater,
      workout_done: checkin?.workout_done ?? false,
      sleep_hours: checkin?.sleep_hours ?? null,
    });
  };

  const handleToggleWorkout = async () => {
    if (isGuest) {
      warnGuestActionOnce();
      const current = guestDailyCheckin ?? {
        id: "guest-checkin",
        user_id: "guest",
        date: today,
        water_count: 0,
        workout_done: false,
        sleep_hours: null,
        created_at: new Date().toISOString(),
      };
      const next = { ...current, workout_done: !current.workout_done };
      setGuestDailyCheckin(next);
      const map = getGuestDailyCheckins();
      map[today] = {
        date: today,
        water_count: next.water_count,
        workout_done: next.workout_done,
        sleep_hours: next.sleep_hours,
      };
      saveGuestDailyCheckins(map);
      return;
    }

    await checkinMutation.mutateAsync({
      water_count: checkin?.water_count ?? 0,
      workout_done: !(checkin?.workout_done ?? false),
      sleep_hours: checkin?.sleep_hours ?? null,
    });
  };

  const handleSaveSleep = async () => {
    const value = Number(sleepHoursInput);
    if (!Number.isFinite(value) || value <= 0 || value > 24) {
      toast.error("Sleep hours must be between 0 and 24.");
      return;
    }

    if (isGuest) {
      warnGuestActionOnce();
      const current = guestDailyCheckin ?? {
        id: "guest-checkin",
        user_id: "guest",
        date: today,
        water_count: 0,
        workout_done: false,
        sleep_hours: null,
        created_at: new Date().toISOString(),
      };
      const next = { ...current, sleep_hours: value };
      setGuestDailyCheckin(next);
      const map = getGuestDailyCheckins();
      map[today] = {
        date: today,
        water_count: next.water_count,
        workout_done: next.workout_done,
        sleep_hours: next.sleep_hours,
      };
      saveGuestDailyCheckins(map);
      setSleepModalOpen(false);
      setSleepHoursInput("");
      return;
    }

    await checkinMutation.mutateAsync({
      water_count: checkin?.water_count ?? 0,
      workout_done: checkin?.workout_done ?? false,
      sleep_hours: value,
    });
    setSleepModalOpen(false);
    setSleepHoursInput("");
  };

  const handleToggleTask = async (task: DailyTask, completed: boolean) => {
    if (isGuest) {
      warnGuestActionOnce();
      const nextTasks = guestTasks.map((t) => (t.id === task.id ? { ...t, completed } : t));
      setGuestTasks(nextTasks);
      const map = getGuestDailyTasks();
      map[today] = nextTasks;
      saveGuestDailyTasks(map);
      return;
    }

    await taskMutation.mutateAsync({ id: task.id, completed });
  };

  const profileName = isGuest ? "Guest" : profile?.full_name || user?.email || "User";

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del dia</CardTitle>
              <CardDescription>Metricas de hoy con datos reales.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Peso actual</p>
                <p className="text-xl font-semibold">{latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : "--"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Delta</p>
                <p className="text-xl font-semibold">
                  {weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg` : "--"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Agua</p>
                <p className="text-xl font-semibold">{checkin?.water_count ?? 0} vasos</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Entreno</p>
                <p className="text-xl font-semibold">{checkin?.workout_done ? "Hecho" : "Pendiente"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones rapidas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/weight")}><Scale className="w-4 h-4 mr-2" />Log weight</Button>
              <Button variant="outline" onClick={handleAddWater}><Droplets className="w-4 h-4 mr-2" />Add water</Button>
              <Button variant="outline" onClick={handleToggleWorkout}><Zap className="w-4 h-4 mr-2" />Mark workout</Button>
              <Button variant="outline" onClick={() => setSleepModalOpen(true)}><Moon className="w-4 h-4 mr-2" />Log sleep</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diario</CardTitle>
              <CardDescription>Registro de hoy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso</span>
                <span>
                  {todayWeightEntry
                    ? `${todayWeightEntry.weight_kg} kg (${todayWeightEntry.measured_at} ${new Date(todayWeightEntry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agua</span>
                <span>{checkin?.water_count ?? 0} vasos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sueno</span>
                <span>{checkin?.sleep_hours !== null && checkin?.sleep_hours !== undefined ? `${checkin.sleep_hours} h` : "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrenamiento</span>
                <span>{checkin?.workout_done ? "Completado" : "Pendiente"}</span>
              </div>
              {!todayWeightEntry && (checkin?.water_count ?? 0) === 0 && !checkin?.workout_done && checkin?.sleep_hours == null && (
                <div className="pt-3 flex gap-2">
                  <Button size="sm" onClick={() => navigate("/weight")}><Plus className="w-4 h-4 mr-1" />Log weight</Button>
                  <Button size="sm" variant="outline" onClick={handleAddWater}>Add water</Button>
                  <Button size="sm" variant="outline" onClick={() => setSleepModalOpen(true)}>Log sleep</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agenda tactica</CardTitle>
              <CardDescription>Prioridades para hoy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={task.completed} onCheckedChange={(checked) => handleToggleTask(task, Boolean(checked))} />
                    <span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                  </div>
                  {task.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Target className="w-4 h-4 text-muted-foreground" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <ProfileSummaryCard
            name={profileName}
            birthDate={profile?.birth_date ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            latestWeight={latestWeight}
            height={profile?.height ?? null}
            targetWeight={profile?.target_weight_kg ?? null}
            targetDate={profile?.target_date ?? null}
            progressPct={goalProgress}
            streakDays={streakDays}
            onEditProfile={() => setEditProfileOpen(true)}
            showGuestWarning={isGuest}
          />
        </div>
      </div>

      <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />

      <Dialog open={sleepModalOpen} onOpenChange={setSleepModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log sleep</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="24"
              placeholder="Hours slept"
              value={sleepHoursInput}
              onChange={(e) => setSleepHoursInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSleepModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSleep}><PencilLine className="w-4 h-4 mr-2" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
