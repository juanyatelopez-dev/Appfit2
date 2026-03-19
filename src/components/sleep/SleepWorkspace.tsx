import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Moon } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { addSleepLog, getSleepDay, getSleepGoal, getSleepRangeTotals } from "@/services/sleep";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";

type Range = "7d" | "30d" | "month";

type SleepWorkspaceProps = {
  embedded?: boolean;
};

const SleepWorkspace = ({ embedded = false }: SleepWorkspaceProps) => {
  const { user, isGuest, profile } = useAuth();
  const { t } = usePreferences();
  const queryClient = useQueryClient();

  const [range, setRange] = useState<Range>("7d");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [quality, setQuality] = useState("");
  const [notes, setNotes] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [sleepStart, setSleepStart] = useState("");
  const [sleepEnd, setSleepEnd] = useState("");

  const timeZone = profile?.timezone || DEFAULT_WATER_TIMEZONE;

  const rangeDates = useMemo(() => {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);
    if (range === "7d") from.setDate(from.getDate() - 6);
    if (range === "30d") from.setDate(from.getDate() - 29);
    if (range === "month") from.setDate(1);
    return { from, to };
  }, [range]);

  const { data: goalData = { sleep_goal_minutes: 480 } } = useQuery({
    queryKey: ["sleep_goal", user?.id],
    queryFn: () => getSleepGoal(user?.id ?? null, { isGuest }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: rangeTotals = [] } = useQuery({
    queryKey: ["sleep_range", user?.id, range, rangeDates.from.toISOString(), rangeDates.to.toISOString(), isGuest],
    queryFn: () => getSleepRangeTotals(user?.id ?? null, rangeDates.from, rangeDates.to, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });
  const { data: dayData } = useQuery({
    queryKey: ["sleep_day", user?.id, selectedDate.toISOString().slice(0, 10)],
    queryFn: () => getSleepDay(user?.id ?? null, selectedDate, { isGuest, timeZone }),
    enabled: Boolean(user?.id) || isGuest,
  });

  const avgMinutes = rangeTotals.length
    ? Math.round(rangeTotals.reduce((sum, row) => sum + row.total_minutes, 0) / rangeTotals.length)
    : 0;
  const daysMet = rangeTotals.filter((row) => row.total_minutes >= goalData.sleep_goal_minutes).length;

  const chartData = rangeTotals.map((row) => ({
    date: row.date_key,
    hours: Number((row.total_minutes / 60).toFixed(2)),
    total_minutes: row.total_minutes,
  }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const h = Number(hours || 0);
      const m = Number(minutes || 0);
      const total = h * 60 + m;
      await addSleepLog({
        userId: user?.id ?? null,
        date: selectedDate,
        total_minutes: total,
        quality: quality ? Number(quality) : null,
        notes: notes.trim() || null,
        start: sleepStart || null,
        end: sleepEnd || null,
        isGuest,
        timeZone,
      });
    },
    onSuccess: async () => {
      toast.success(t("sleep.page.saved"));
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
        queryClient.invalidateQueries({ queryKey: ["header_weekly_consistency"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
      ]);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, t("sleep.page.saveError"))),
  });

  return (
    <div className={embedded ? "space-y-5 md:space-y-6" : "container max-w-6xl space-y-5 py-6 md:space-y-6 md:py-8"}>
      <div className="flex items-center gap-3">
        <Moon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("sleep.page.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("sleep.page.description")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("sleep.page.today")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{((dayData?.total_minutes ?? 0) / 60).toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("sleep.page.goal")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{(goalData.sleep_goal_minutes / 60).toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("sleep.page.avg")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{(avgMinutes / 60).toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("sleep.page.daysMet")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{daysMet}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("nav.sleep")}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={range === "7d" ? "default" : "outline"} onClick={() => setRange("7d")}>
              {t("sleep.page.range.7d")}
            </Button>
            <Button size="sm" variant={range === "30d" ? "default" : "outline"} onClick={() => setRange("30d")}>
              {t("sleep.page.range.30d")}
            </Button>
            <Button size="sm" variant={range === "month" ? "default" : "outline"} onClick={() => setRange("month")}>
              {t("sleep.page.range.month")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("sleep.page.noLogs")}</p>
          ) : (
            <div className="h-[240px] w-full md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number | string) => {
                      const hoursValue = typeof value === "number" ? value : Number(value);
                      return [`${Math.round(hoursValue * 60)} min`, "Total"];
                    }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("sleep.page.logs")}</CardTitle>
            <CardDescription>
              <Input
                type="date"
                value={selectedDate.toISOString().slice(0, 10)}
                onChange={(e) => setSelectedDate(new Date(`${e.target.value}T12:00:00`))}
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!dayData || dayData.logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("sleep.page.noLogs")}</p>
            ) : (
              <div className="space-y-2">
                {dayData.logs.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{(log.total_minutes / 60).toFixed(1)}h</p>
                    <p className="text-muted-foreground">
                      {log.quality ? `${t("sleep.page.quality")}: ${log.quality}/5` : "--"}
                    </p>
                    {log.notes && <p className="text-muted-foreground">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("sleep.page.addTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>{t("sleep.page.totalHours")}</Label>
                <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} min="0" />
              </div>
              <div className="space-y-1">
                <Label>{t("common.minutes")}</Label>
                <Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} min="0" max="59" />
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

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {t("sleep.page.save")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SleepWorkspace;

