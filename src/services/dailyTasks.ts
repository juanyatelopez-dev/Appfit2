import { supabase } from "@/services/supabaseClient";

export type DailyTask = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  completed: boolean;
  created_at: string;
};

export const DEFAULT_DAILY_TASKS = [
  "Registrar peso",
  "Beber agua",
  "Entrenar",
  "Dormir 8h",
];

export const GUEST_DAILY_TASKS_STORAGE_KEY = "guestDailyTasks";

export const getGuestDailyTasks = (): Record<string, DailyTask[]> => {
  const raw = localStorage.getItem(GUEST_DAILY_TASKS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, DailyTask[]>;
    return parsed || {};
  } catch {
    return {};
  }
};

export const saveGuestDailyTasks = (value: Record<string, DailyTask[]>) => {
  localStorage.setItem(GUEST_DAILY_TASKS_STORAGE_KEY, JSON.stringify(value));
};

export const listDailyTasks = async (userId: string | null, date: string, isGuest = false): Promise<DailyTask[]> => {
  if (!userId || isGuest) return [];
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as DailyTask[];
};

export const ensureDailyTasks = async (userId: string | null, date: string, isGuest = false): Promise<DailyTask[]> => {
  if (!userId || isGuest) return [];

  await supabase
    .from("daily_tasks")
    .upsert(
      DEFAULT_DAILY_TASKS.map((title) => ({ user_id: userId, date, title, completed: false })),
      { onConflict: "user_id,date,title", ignoreDuplicates: true },
    );

  return listDailyTasks(userId, date, false);
};

export const setDailyTaskCompleted = async (
  id: string,
  completed: boolean,
  userId: string | null,
  isGuest = false,
) => {
  if (!id || !userId || isGuest) return null;

  const { data, error } = await supabase
    .from("daily_tasks")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DailyTask;
};
