import { supabase } from "@/services/supabaseClient";
import { DEFAULT_WATER_TIMEZONE, createDateKeyRange, getDateKeyForTimezone } from "@/features/water/waterUtils";

export type SleepLog = {
  id: string;
  user_id: string;
  date_key: string;
  sleep_start: string | null;
  sleep_end: string | null;
  total_minutes: number;
  quality: number | null;
  notes: string | null;
  created_at: string;
};

type SleepTotalRow = {
  date_key: string;
  total_minutes: number;
};

type AddSleepInput = {
  userId: string | null;
  date: Date;
  total_minutes: number;
  start?: string | null;
  end?: string | null;
  quality?: number | null;
  notes?: string | null;
  timeZone?: string;
  isGuest?: boolean;
};

const GUEST_SLEEP_LOGS_KEY = "appfit_guest_sleep_logs";
const GUEST_SLEEP_GOAL_KEY = "appfit_guest_sleep_goal";
const DEFAULT_SLEEP_GOAL_MINUTES = 480;

const getGuestLogs = (): SleepLog[] => {
  const raw = localStorage.getItem(GUEST_SLEEP_LOGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SleepLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveGuestLogs = (logs: SleepLog[]) => localStorage.setItem(GUEST_SLEEP_LOGS_KEY, JSON.stringify(logs));
const getGuestGoal = () => Number(localStorage.getItem(GUEST_SLEEP_GOAL_KEY) || DEFAULT_SLEEP_GOAL_MINUTES);
const saveGuestGoal = (minutes: number) => localStorage.setItem(GUEST_SLEEP_GOAL_KEY, String(minutes));

export const addSleepLog = async ({
  userId,
  date,
  total_minutes,
  start = null,
  end = null,
  quality = null,
  notes = null,
  timeZone = DEFAULT_WATER_TIMEZONE,
  isGuest = false,
}: AddSleepInput): Promise<SleepLog | null> => {
  const total = Math.round(Number(total_minutes));
  if (!Number.isFinite(total) || total <= 0 || total > 1440) {
    throw new Error("Sleep total must be between 1 and 1440 minutes.");
  }
  if (quality !== null && (quality < 1 || quality > 5)) {
    throw new Error("Sleep quality must be between 1 and 5.");
  }

  const dateKey = getDateKeyForTimezone(date, timeZone);
  if (isGuest) {
    const entry: SleepLog = {
      id: crypto.randomUUID(),
      user_id: "guest",
      date_key: dateKey,
      sleep_start: start,
      sleep_end: end,
      total_minutes: total,
      quality,
      notes,
      created_at: new Date().toISOString(),
    };
    const logs = [entry, ...getGuestLogs()];
    saveGuestLogs(logs);
    return entry;
  }
  if (!userId) return null;

  const { data, error } = await supabase
    .from("sleep_logs")
    .insert({
      user_id: userId,
      date_key: dateKey,
      sleep_start: start,
      sleep_end: end,
      total_minutes: total,
      quality,
      notes,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SleepLog;
};

export const getSleepDay = async (
  userId: string | null,
  date: Date,
  options?: { isGuest?: boolean; timeZone?: string },
) => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const dateKey = getDateKeyForTimezone(date, timeZone);

  if (isGuest) {
    const logs = getGuestLogs()
      .filter((log) => log.date_key === dateKey)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      date_key: dateKey,
      total_minutes: logs.reduce((sum, row) => sum + Number(row.total_minutes || 0), 0),
      logs,
    };
  }
  if (!userId) return { date_key: dateKey, total_minutes: 0, logs: [] as SleepLog[] };

  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date_key", dateKey)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const logs = (data || []) as SleepLog[];
  return {
    date_key: dateKey,
    total_minutes: logs.reduce((sum, row) => sum + Number(row.total_minutes || 0), 0),
    logs,
  };
};

export const getSleepRangeTotals = async (
  userId: string | null,
  from: Date,
  to: Date,
  options?: { isGuest?: boolean; timeZone?: string },
): Promise<Array<{ date_key: string; total_minutes: number }>> => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const fromKey = getDateKeyForTimezone(from, timeZone);
  const toKey = getDateKeyForTimezone(to, timeZone);

  const map = new Map<string, number>();
  if (isGuest) {
    const rows = getGuestLogs().filter((row) => row.date_key >= fromKey && row.date_key <= toKey);
    rows.forEach((row) => {
      map.set(row.date_key, (map.get(row.date_key) ?? 0) + Number(row.total_minutes || 0));
    });
  } else if (userId) {
    const { data, error } = await supabase
      .from("sleep_logs")
      .select("date_key,total_minutes")
      .eq("user_id", userId)
      .gte("date_key", fromKey)
      .lte("date_key", toKey)
      .order("date_key", { ascending: true });
    if (error) throw error;
    ((data || []) as SleepTotalRow[]).forEach((row) => {
      map.set(row.date_key, (map.get(row.date_key) ?? 0) + Number(row.total_minutes || 0));
    });
  }

  return createDateKeyRange(from, to).map((date_key) => ({
    date_key,
    total_minutes: map.get(date_key) ?? 0,
  }));
};

export const getSleepGoal = async (userId: string | null, options?: { isGuest?: boolean }) => {
  const isGuest = options?.isGuest || false;
  if (isGuest) {
    return { sleep_goal_minutes: getGuestGoal() };
  }
  if (!userId) {
    return { sleep_goal_minutes: DEFAULT_SLEEP_GOAL_MINUTES };
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("sleep_goal_minutes")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return { sleep_goal_minutes: Number(data?.sleep_goal_minutes ?? DEFAULT_SLEEP_GOAL_MINUTES) };
};

export const updateSleepGoal = async (
  userId: string | null,
  minutes: number,
  options?: { isGuest?: boolean },
): Promise<number> => {
  const goal = Math.round(Number(minutes));
  if (!Number.isFinite(goal) || goal <= 0 || goal > 1440) {
    throw new Error("Sleep goal must be between 1 and 1440 minutes.");
  }
  const isGuest = options?.isGuest || false;
  if (isGuest) {
    saveGuestGoal(goal);
    return goal;
  }
  if (!userId) return goal;
  const { error } = await supabase.from("profiles").update({ sleep_goal_minutes: goal }).eq("id", userId);
  if (error) throw error;
  return goal;
};

export const getSleepWeeklySummary = async (
  userId: string | null,
  referenceDate = new Date(),
  options?: { isGuest?: boolean; timeZone?: string },
) => {
  const to = new Date(referenceDate);
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  const [totals, goal] = await Promise.all([
    getSleepRangeTotals(userId, from, to, options),
    getSleepGoal(userId, { isGuest: options?.isGuest }),
  ]);
  const daysMet = totals.filter((row) => row.total_minutes >= goal.sleep_goal_minutes).length;
  const avg = totals.length ? Math.round(totals.reduce((sum, row) => sum + row.total_minutes, 0) / totals.length) : 0;
  return {
    days_total: totals.length,
    days_met: daysMet,
    average_minutes: avg,
  };
};

export const listRecentSleepLogs = async (
  userId: string | null,
  limit = 3,
  options?: { isGuest?: boolean },
): Promise<SleepLog[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) {
    return getGuestLogs().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }
  if (!userId) return [];
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as SleepLog[];
};
