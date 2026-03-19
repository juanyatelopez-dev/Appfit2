import { addDays } from "date-fns";

import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getBiofeedbackRange, getDailyBiofeedback, type DailyBiofeedback } from "@/services/dailyBiofeedback";
import { getDailyNote, getLatestDailyNote, listDailyNotesByRange, type DailyNote } from "@/services/dailyNotes";
import { getSleepDay, getSleepGoal, getSleepRangeTotals } from "@/services/sleep";
import { supabase } from "@/services/supabaseClient";
import { getWaterDayTotal, getWaterGoal, getWaterRangeTotals } from "@/services/waterIntake";

type DashboardOperationalSnapshot = {
  waterTodayMl: number;
  waterGoalMl: number;
  water7d: Array<{ date_key: string; total_ml: number }>;
  sleepDay: { date_key: string; total_minutes: number; logs?: unknown[] };
  sleepGoalMinutes: number;
  sleep7d: Array<{ date_key: string; total_minutes: number }>;
  bioToday: DailyBiofeedback | null;
  bio7d: DailyBiofeedback[];
  notes7d: DailyNote[];
  noteToday: DailyNote | null;
  noteLatest: DailyNote | null;
  activeDays7: number;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isRpcUnavailableError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("PGRST202") ||
    message.includes("42883") ||
    message.toLowerCase().includes("could not find the function")
  );
};

const fallbackDashboardOperationalSnapshot = async (
  userId: string | null,
  today: Date,
  options?: { isGuest?: boolean; timeZone?: string },
): Promise<DashboardOperationalSnapshot> => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const sevenDaysAgo = addDays(today, -6);

  const [
    waterTodayMl,
    waterGoal,
    water7d,
    sleepDay,
    sleepGoal,
    sleep7d,
    bioToday,
    bio7d,
    notes7d,
    noteToday,
    noteLatest,
  ] = await Promise.all([
    getWaterDayTotal(userId, today, { isGuest, timeZone }),
    getWaterGoal(userId, { isGuest }),
    getWaterRangeTotals(userId, sevenDaysAgo, today, { isGuest, timeZone }),
    getSleepDay(userId, today, { isGuest, timeZone }),
    getSleepGoal(userId, { isGuest }),
    getSleepRangeTotals(userId, sevenDaysAgo, today, { isGuest, timeZone }),
    getDailyBiofeedback(userId, today, { isGuest, timeZone }),
    getBiofeedbackRange(userId, sevenDaysAgo, today, { isGuest, timeZone }),
    listDailyNotesByRange(userId, sevenDaysAgo, today, { isGuest, timeZone }),
    getDailyNote(userId, today, { isGuest, timeZone }),
    getLatestDailyNote(userId, { isGuest }),
  ]);

  const activeDays = new Set<string>();
  water7d.forEach((row) => row.total_ml > 0 && activeDays.add(row.date_key));
  sleep7d.forEach((row) => row.total_minutes > 0 && activeDays.add(row.date_key));
  bio7d.forEach((row) => activeDays.add(row.date_key));
  notes7d.forEach((row) => activeDays.add(row.date_key));

  return {
    waterTodayMl: Number(waterTodayMl || 0),
    waterGoalMl: Number(waterGoal.water_goal_ml || 2000),
    water7d: water7d.map((row) => ({ date_key: row.date_key, total_ml: Number(row.total_ml || 0) })),
    sleepDay: {
      date_key: sleepDay.date_key,
      total_minutes: Number(sleepDay.total_minutes || 0),
      logs: sleepDay.logs,
    },
    sleepGoalMinutes: Number(sleepGoal.sleep_goal_minutes || 480),
    sleep7d: sleep7d.map((row) => ({ date_key: row.date_key, total_minutes: Number(row.total_minutes || 0) })),
    bioToday,
    bio7d,
    notes7d,
    noteToday,
    noteLatest,
    activeDays7: activeDays.size,
  };
};

export const getDashboardOperationalSnapshot = async (
  userId: string | null,
  today: Date,
  options?: { isGuest?: boolean; timeZone?: string },
): Promise<DashboardOperationalSnapshot> => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  if (!userId || isGuest) {
    return fallbackDashboardOperationalSnapshot(userId, today, { isGuest, timeZone });
  }

  const todayKey = getDateKeyForTimezone(today, timeZone);

  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;

  const { data, error } = await rpc("get_dashboard_operational_snapshot", {
    p_today: todayKey,
    p_timezone: timeZone,
  });

  if (error) {
    if (!isRpcUnavailableError(error)) {
      console.warn("[dashboardOperationalSnapshot] RPC failed, using fallback.", error);
    }
    return fallbackDashboardOperationalSnapshot(userId, today, { isGuest, timeZone });
  }

  const row = (data ?? {}) as Record<string, unknown>;
  const water7dRaw = Array.isArray(row.water_7d) ? row.water_7d : [];
  const sleep7dRaw = Array.isArray(row.sleep_7d) ? row.sleep_7d : [];
  const bio7dRaw = Array.isArray(row.bio_7d) ? row.bio_7d : [];
  const notes7dRaw = Array.isArray(row.notes_7d) ? row.notes_7d : [];

  return {
    waterTodayMl: toNumber(row.water_today_ml),
    waterGoalMl: toNumber(row.water_goal_ml, 2000),
    water7d: water7dRaw.map((item) => {
      const value = item as Record<string, unknown>;
      return {
        date_key: String(value.date_key ?? ""),
        total_ml: toNumber(value.total_ml),
      };
    }),
    sleepDay: {
      date_key: String((row.sleep_day as Record<string, unknown> | null)?.date_key ?? todayKey),
      total_minutes: toNumber((row.sleep_day as Record<string, unknown> | null)?.total_minutes),
      logs: [],
    },
    sleepGoalMinutes: toNumber(row.sleep_goal_minutes, 480),
    sleep7d: sleep7dRaw.map((item) => {
      const value = item as Record<string, unknown>;
      return {
        date_key: String(value.date_key ?? ""),
        total_minutes: toNumber(value.total_minutes),
      };
    }),
    bioToday: (row.bio_today as DailyBiofeedback | null) ?? null,
    bio7d: bio7dRaw as DailyBiofeedback[],
    notes7d: notes7dRaw as DailyNote[],
    noteToday: (row.note_today as DailyNote | null) ?? null,
    noteLatest: (row.note_latest as DailyNote | null) ?? null,
    activeDays7: toNumber(row.active_days_7),
  };
};
