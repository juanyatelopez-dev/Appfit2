import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Moon } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { addSleepLog, getSleepDay, getSleepGoal } from "@/services/sleep";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const SleepCard = () => {
  const { user, isGuest, profile } = useAuth();
  const { t } = usePreferences();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [quality, setQuality] = useState("");
  const [notes, setNotes] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [sleepStart, setSleepStart] = useState("");
  const [sleepEnd, setSleepEnd] = useState("");

  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;
  const today = useMemo(() => new Date(), []);
  const dayKey = getDateKeyForTimezone(today, timeZone);

  const { data: dayData } = useQuery({
    queryKey: ["sleep_day", user?.id, dayKey],
    queryFn: () => getSleepDay(user?.id ?? null, today, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: goalData } = useQuery({
    queryKey: ["sleep_goal", user?.id],
    queryFn: () => getSleepGoal(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const totalMinutes = dayData?.total_minutes ?? 0;
  const goalMinutes = goalData?.sleep_goal_minutes ?? (profile?.sleep_goal_minutes ?? 480);
  const progress = goalMinutes > 0 ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)) : 0;

  const addMutation = useMutation({
    mutationFn: async () => {
      const h = Number(hours || 0);
      const m = Number(minutes || 0);
      const total = h * 60 + m;
      if (!Number.isFinite(total) || total <= 0) {
        throw new Error(t("sleep.error.invalidDuration"));
      }
      await addSleepLog({
        userId: user?.id ?? null,
        date: today,
        total_minutes: total,
        quality: quality ? Number(quality) : null,
        notes: notes.trim() || null,
        start: sleepStart || null,
        end: sleepEnd || null,
        timeZone,
        isGuest,
      });
    },
    onSuccess: async () => {
      toast.success(t("sleep.page.saved"));
      setOpen(false);
      setHours("");
      setMinutes("");
      setQuality("");
      setNotes("");
      setSleepStart("");
      setSleepEnd("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sleep_day"] }),
        queryClient.invalidateQueries({ queryKey: ["sleep_range"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard_snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || t("sleep.page.saveError"));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          {t("sleep.card.title")}
        </CardTitle>
        <CardDescription>{t("sleep.card.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xl font-semibold md:text-2xl">
          {(totalMinutes / 60).toFixed(1)}h / {(goalMinutes / 60).toFixed(1)}h
        </p>
        <p className="text-sm text-muted-foreground">
          {totalMinutes} / {goalMinutes} min
        </p>
        <Progress value={progress} />
        <p className="text-xs text-muted-foreground">
          {t("sleep.card.progressLabel")}: {progress}%
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="sm" onClick={() => setOpen(true)}>
            {t("sleep.card.quickButton")}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/calendar">{t("nav.calendar")}</Link>
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sleep.page.addTitle")}</DialogTitle>
            <DialogDescription>
              {t("sleep.card.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>{t("common.hours")}</Label>
                <Input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("common.minutes")}</Label>
                <Input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </div>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={() => setAdvanced((v) => !v)}>
              {t("sleep.page.advanced")}
            </Button>

            {advanced && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>{t("sleep.page.sleepStart")}</Label>
                    <Input type="datetime-local" value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("sleep.page.sleepEnd")}</Label>
                    <Input type="datetime-local" value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("sleep.page.quality")}</Label>
                  <Input type="number" min="1" max="5" value={quality} onChange={(e) => setQuality(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("sleep.page.notes")}</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {t("sleep.page.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SleepCard;
