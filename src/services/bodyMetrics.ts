import { supabase } from "@/services/supabaseClient";

export type BodyMetricEntry = {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
};

export type GuestWeightGoal = {
  target_weight_kg: number | null;
  target_date: string | null;
  start_weight_kg: number | null;
  goal_direction: "lose" | "gain" | "maintain" | null;
};

export type UpsertBodyMetricInput = {
  userId: string | null;
  isGuest?: boolean;
  measured_at: string;
  weight_kg: number;
  notes?: string | null;
};

export const GUEST_BODY_METRICS_STORAGE_KEY = "appfit_guest_body_metrics";
export const GUEST_WEIGHT_GOAL_STORAGE_KEY = "appfit_guest_weight_goal";

export const getGuestBodyMetrics = (): BodyMetricEntry[] => {
  const raw = localStorage.getItem(GUEST_BODY_METRICS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as BodyMetricEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

export const saveGuestBodyMetrics = (entries: BodyMetricEntry[]) => {
  localStorage.setItem(GUEST_BODY_METRICS_STORAGE_KEY, JSON.stringify(entries));
};

export const listBodyMetrics = async (userId: string | null, isGuest = false): Promise<BodyMetricEntry[]> => {
  if (!userId || isGuest) return [];

  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as BodyMetricEntry[];
};

export const listBodyMetricsByRange = async (
  userId: string | null,
  range: "7d" | "30d" | "90d" | "all",
  isGuest = false,
): Promise<BodyMetricEntry[]> => {
  if (!userId || isGuest) return [];

  let query = supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("measured_at", { ascending: true });

  if (range !== "all") {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    query = query.gte("measured_at", fromDate.toISOString().slice(0, 10));
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as BodyMetricEntry[];
};

export const upsertBodyMetric = async ({
  userId,
  isGuest = false,
  measured_at,
  weight_kg,
  notes,
}: UpsertBodyMetricInput): Promise<BodyMetricEntry | null> => {
  if (!userId || isGuest) return null;

  const payload = {
    user_id: userId,
    measured_at,
    weight_kg,
    notes: notes || null,
  };

  const { data, error } = await supabase
    .from("body_metrics")
    .upsert(payload, { onConflict: "user_id,measured_at" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as BodyMetricEntry;
};

export const deleteBodyMetric = async (id: string, userId: string | null, isGuest = false): Promise<void> => {
  if (!id || !userId || isGuest) return;

  const { error } = await supabase
    .from("body_metrics")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
};

export const getGuestWeightGoal = (): GuestWeightGoal => {
  const raw = localStorage.getItem(GUEST_WEIGHT_GOAL_STORAGE_KEY);
  if (!raw) {
    return {
      target_weight_kg: null,
      target_date: null,
      start_weight_kg: null,
      goal_direction: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as GuestWeightGoal;
    return {
      target_weight_kg: parsed.target_weight_kg ?? null,
      target_date: parsed.target_date ?? null,
      start_weight_kg: parsed.start_weight_kg ?? null,
      goal_direction: parsed.goal_direction ?? null,
    };
  } catch {
    return {
      target_weight_kg: null,
      target_date: null,
      start_weight_kg: null,
      goal_direction: null,
    };
  }
};

export const saveGuestWeightGoal = (goal: GuestWeightGoal) => {
  localStorage.setItem(GUEST_WEIGHT_GOAL_STORAGE_KEY, JSON.stringify(goal));
};
