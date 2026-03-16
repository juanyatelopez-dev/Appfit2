import { supabase } from "@/services/supabaseClient";
import {
  aggregateDailyTotals,
  averageMl,
  countDaysMeetingGoal,
  DEFAULT_WATER_GOAL_ML,
  DEFAULT_WATER_PRESETS_ML,
  DEFAULT_WATER_TIMEZONE,
  getDateKeyForTimezone,
  normalizeWaterPresets,
} from "@/features/water/waterUtils";

export type WaterLog = {
  id: string;
  user_id: string;
  consumed_ml: number;
  logged_at: string;
  date_key: string;
  created_at: string;
};

export type WaterPreset = {
  id: string;
  user_id: string;
  name: string;
  amount_ml: number;
  created_at: string;
};

export type WaterGoalRecord = {
  water_goal_ml: number;
  water_quick_options_ml: number[];
};

type WaterConsumedRow = {
  consumed_ml: number;
};

type AddWaterInput = {
  userId: string | null;
  consumed_ml: number;
  date?: Date;
  timeZone?: string;
  isGuest?: boolean;
};

const GUEST_WATER_LOGS_KEY = "appfit_guest_water_logs";
const GUEST_WATER_GOAL_KEY = "appfit_guest_water_goal";
const GUEST_WATER_PRESETS_KEY = "appfit_guest_water_presets";

const getGuestLogs = () => {
  const raw = localStorage.getItem(GUEST_WATER_LOGS_KEY);
  if (!raw) return [] as WaterLog[];
  try {
    const parsed = JSON.parse(raw) as WaterLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveGuestLogs = (logs: WaterLog[]) => {
  localStorage.setItem(GUEST_WATER_LOGS_KEY, JSON.stringify(logs));
};

const getGuestGoal = () => Number(localStorage.getItem(GUEST_WATER_GOAL_KEY) || DEFAULT_WATER_GOAL_ML);
const saveGuestGoal = (ml: number) => localStorage.setItem(GUEST_WATER_GOAL_KEY, String(ml));

const getGuestPresets = () => {
  const raw = localStorage.getItem(GUEST_WATER_PRESETS_KEY);
  if (!raw) return [] as WaterPreset[];
  try {
    const parsed = JSON.parse(raw) as Array<WaterPreset | number>;
    if (!Array.isArray(parsed)) return [] as WaterPreset[];

    // Backward compatibility: numeric presets stored in old versions
    if (typeof parsed[0] === "number") {
      return normalizeWaterPresets(parsed as number[]).map((amount) => ({
        id: crypto.randomUUID(),
        user_id: "guest",
        name: `${amount} ml`,
        amount_ml: amount,
        created_at: new Date().toISOString(),
      }));
    }

    return (parsed as WaterPreset[])
      .filter((item) => item && Number(item.amount_ml) > 0)
      .map((item) => ({
        ...item,
        amount_ml: Math.round(Number(item.amount_ml)),
        name: item.name || `${item.amount_ml} ml`,
      }));
  } catch {
    return [] as WaterPreset[];
  }
};
const saveGuestPresets = (presets: WaterPreset[]) => localStorage.setItem(GUEST_WATER_PRESETS_KEY, JSON.stringify(presets));

export const addWaterIntake = async ({
  userId,
  consumed_ml,
  date = new Date(),
  timeZone = DEFAULT_WATER_TIMEZONE,
  isGuest = false,
}: AddWaterInput): Promise<WaterLog | null> => {
  const ml = Math.round(Number(consumed_ml));
  if (!Number.isFinite(ml) || ml <= 0) throw new Error("Water intake must be greater than 0.");
  if (ml > 10000) throw new Error("Water intake is too large.");

  const dateKey = getDateKeyForTimezone(date, timeZone);
  const loggedAt = date.toISOString();

  if (isGuest) {
    const next: WaterLog = {
      id: crypto.randomUUID(),
      user_id: "guest",
      consumed_ml: ml,
      logged_at: loggedAt,
      date_key: dateKey,
      created_at: new Date().toISOString(),
    };
    const logs = [next, ...getGuestLogs()];
    saveGuestLogs(logs);
    return next;
  }

  if (!userId) return null;

  const { data, error } = await supabase
    .from("water_intake_logs")
    .insert({
      user_id: userId,
      consumed_ml: ml,
      logged_at: loggedAt,
      date_key: dateKey,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as WaterLog;
};

export const getWaterDayTotal = async (
  userId: string | null,
  date: Date,
  options?: { timeZone?: string; isGuest?: boolean },
): Promise<number> => {
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const isGuest = options?.isGuest || false;
  const dateKey = getDateKeyForTimezone(date, timeZone);

  if (isGuest) {
    return getGuestLogs()
      .filter((log) => log.date_key === dateKey)
      .reduce((acc, log) => acc + Number(log.consumed_ml || 0), 0);
  }

  if (!userId) return 0;

  const { data, error } = await supabase
    .from("water_intake_logs")
    .select("consumed_ml")
    .eq("user_id", userId)
    .eq("date_key", dateKey);

  if (error) throw error;
  return ((data || []) as WaterConsumedRow[]).reduce((acc, row) => acc + Number(row.consumed_ml || 0), 0);
};

export const getWaterRangeTotals = async (
  userId: string | null,
  from: Date,
  to: Date,
  options?: { isGuest?: boolean; timeZone?: string },
): Promise<Array<{ date_key: string; total_ml: number }>> => {
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const fromKey = getDateKeyForTimezone(from, timeZone);
  const toKey = getDateKeyForTimezone(to, timeZone);
  const isGuest = options?.isGuest || false;

  if (isGuest) {
    const logs = getGuestLogs().filter((log) => log.date_key >= fromKey && log.date_key <= toKey);
    return aggregateDailyTotals(logs, from, to);
  }

  if (!userId) return aggregateDailyTotals([], from, to);

  const { data, error } = await supabase
    .from("water_intake_logs")
    .select("date_key,consumed_ml")
    .eq("user_id", userId)
    .gte("date_key", fromKey)
    .lte("date_key", toKey)
    .order("date_key", { ascending: true });

  if (error) throw error;
  return aggregateDailyTotals((data || []) as Array<{ date_key: string; consumed_ml: number }>, from, to);
};

export const getWaterLogsByDate = async (
  userId: string | null,
  date: Date,
  options?: { timeZone?: string; isGuest?: boolean },
) => {
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const isGuest = options?.isGuest || false;
  const dateKey = getDateKeyForTimezone(date, timeZone);

  if (isGuest) {
    return getGuestLogs()
      .filter((log) => log.date_key === dateKey)
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  }
  if (!userId) return [];

  const { data, error } = await supabase
    .from("water_intake_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date_key", dateKey)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data || []) as WaterLog[];
};

export const deleteWaterLog = async (id: string, userId: string | null, options?: { isGuest?: boolean }) => {
  const isGuest = options?.isGuest || false;
  if (!id) return;

  if (isGuest) {
    const logs = getGuestLogs().filter((log) => log.id !== id);
    saveGuestLogs(logs);
    return;
  }

  if (!userId) return;

  const { error } = await supabase.from("water_intake_logs").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
};

export const getWaterGoal = async (userId: string | null, options?: { isGuest?: boolean }): Promise<WaterGoalRecord> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) {
    const presetAmounts = normalizeWaterPresets(getGuestPresets().map((preset) => preset.amount_ml));
    return {
      water_goal_ml: getGuestGoal(),
      water_quick_options_ml: presetAmounts.length > 0 ? presetAmounts : DEFAULT_WATER_PRESETS_ML,
    };
  }

  if (!userId) {
    return {
      water_goal_ml: DEFAULT_WATER_GOAL_ML,
      water_quick_options_ml: DEFAULT_WATER_PRESETS_ML,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("water_goal_ml,water_quick_options_ml")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return {
    water_goal_ml: Number(data?.water_goal_ml ?? DEFAULT_WATER_GOAL_ML),
    water_quick_options_ml: normalizeWaterPresets(data?.water_quick_options_ml as number[] | null | undefined),
  };
};

export const updateWaterGoal = async (
  userId: string | null,
  ml: number,
  options?: { isGuest?: boolean },
): Promise<number> => {
  const goal = Math.round(Number(ml));
  if (!Number.isFinite(goal) || goal <= 0) throw new Error("Water goal must be greater than 0.");
  if (goal > 20000) throw new Error("Water goal is too large.");

  const isGuest = options?.isGuest || false;
  if (isGuest) {
    saveGuestGoal(goal);
    return goal;
  }
  if (!userId) return goal;

  const { error } = await supabase.from("profiles").update({ water_goal_ml: goal }).eq("id", userId);
  if (error) throw error;
  return goal;
};

export const updateWaterQuickOptions = async (
  userId: string | null,
  options: number[],
  params?: { isGuest?: boolean },
): Promise<number[]> => {
  const normalized = normalizeWaterPresets(options);
  const isGuest = params?.isGuest || false;

  if (isGuest) {
    saveGuestPresets(
      normalized.map((amount) => ({
        id: crypto.randomUUID(),
        user_id: "guest",
        name: `${amount} ml`,
        amount_ml: amount,
        created_at: new Date().toISOString(),
      })),
    );
    return normalized;
  }
  if (!userId) return normalized;

  const { error } = await supabase
    .from("profiles")
    .update({ water_quick_options_ml: normalized })
    .eq("id", userId);
  if (error) throw error;
  return normalized;
};

export const listWaterPresets = async (userId: string | null, options?: { isGuest?: boolean }): Promise<WaterPreset[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) {
    return getGuestPresets().sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  if (!userId) return [];

  const { data, error } = await supabase
    .from("water_presets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as WaterPreset[];
};

export const addWaterPreset = async (
  userId: string | null,
  payload: { name: string; amount_ml: number },
  options?: { isGuest?: boolean },
): Promise<WaterPreset | null> => {
  const isGuest = options?.isGuest || false;
  const amount = Math.round(Number(payload.amount_ml));
  const name = payload.name.trim();
  if (!name) throw new Error("Preset name is required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Preset amount must be greater than 0.");

  if (isGuest) {
    const preset: WaterPreset = {
      id: crypto.randomUUID(),
      user_id: "guest",
      name,
      amount_ml: amount,
      created_at: new Date().toISOString(),
    };
    saveGuestPresets([...getGuestPresets(), preset]);
    return preset;
  }

  if (!userId) return null;

  const { data, error } = await supabase
    .from("water_presets")
    .insert({
      user_id: userId,
      name,
      amount_ml: amount,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as WaterPreset;
};

export const deleteWaterPreset = async (id: string, userId: string | null, options?: { isGuest?: boolean }) => {
  const isGuest = options?.isGuest || false;
  if (!id) return;

  if (isGuest) {
    saveGuestPresets(getGuestPresets().filter((preset) => preset.id !== id));
    return;
  }
  if (!userId) return;

  const { error } = await supabase.from("water_presets").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
};

export const clearWaterLogsByDate = async (
  userId: string | null,
  date: Date,
  options?: { isGuest?: boolean; timeZone?: string },
) => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const dateKey = getDateKeyForTimezone(date, timeZone);

  if (isGuest) {
    saveGuestLogs(getGuestLogs().filter((log) => log.date_key !== dateKey));
    return;
  }
  if (!userId) return;

  const { error } = await supabase.from("water_intake_logs").delete().eq("user_id", userId).eq("date_key", dateKey);
  if (error) throw error;
};

export const getWaterWeeklySummary = async (
  userId: string | null,
  referenceDate = new Date(),
  options?: { isGuest?: boolean; timeZone?: string },
) => {
  const to = new Date(referenceDate);
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);

  const [totals, goal] = await Promise.all([
    getWaterRangeTotals(userId, from, to, { isGuest: options?.isGuest, timeZone: options?.timeZone }),
    getWaterGoal(userId, { isGuest: options?.isGuest }),
  ]);

  return {
    days_total: totals.length,
    days_met: countDaysMeetingGoal(totals, goal.water_goal_ml),
    average_ml: averageMl(totals),
  };
};

export const listRecentWaterLogs = async (
  userId: string | null,
  limit = 3,
  options?: { isGuest?: boolean },
): Promise<WaterLog[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) {
    return getGuestLogs()
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
      .slice(0, limit);
  }
  if (!userId) return [];

  const { data, error } = await supabase
    .from("water_intake_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as WaterLog[];
};
