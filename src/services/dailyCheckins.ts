import { supabase } from "@/services/supabaseClient";

export type DailyCheckin = {
  id: string;
  user_id: string;
  date: string;
  water_count: number;
  workout_done: boolean;
  sleep_hours: number | null;
  created_at: string;
};

export type GuestDailyCheckin = {
  date: string;
  water_count: number;
  workout_done: boolean;
  sleep_hours: number | null;
};

export const GUEST_DAILY_CHECKINS_STORAGE_KEY = "guestDailyCheckins";

export const getGuestDailyCheckins = (): Record<string, GuestDailyCheckin> => {
  const raw = localStorage.getItem(GUEST_DAILY_CHECKINS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, GuestDailyCheckin>;
    return parsed || {};
  } catch {
    return {};
  }
};

export const saveGuestDailyCheckins = (value: Record<string, GuestDailyCheckin>) => {
  localStorage.setItem(GUEST_DAILY_CHECKINS_STORAGE_KEY, JSON.stringify(value));
};

export const getDailyCheckin = async (userId: string | null, date: string, isGuest = false): Promise<DailyCheckin | null> => {
  if (!userId || isGuest) return null;
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return (data as DailyCheckin) || null;
};

export const upsertDailyCheckin = async (
  userId: string | null,
  date: string,
  partial: Partial<Pick<DailyCheckin, "water_count" | "workout_done" | "sleep_hours">>,
  isGuest = false,
) => {
  if (!userId || isGuest) return null;

  const payload = {
    user_id: userId,
    date,
    water_count: partial.water_count ?? 0,
    workout_done: partial.workout_done ?? false,
    sleep_hours: partial.sleep_hours ?? null,
  };

  const { data, error } = await supabase
    .from("daily_checkins")
    .upsert(payload, { onConflict: "user_id,date" })
    .select("*")
    .single();

  if (error) throw error;
  return data as DailyCheckin;
};
