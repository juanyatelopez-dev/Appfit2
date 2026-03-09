import { supabase } from "@/services/supabaseClient";

export type DailyMetricTaskKey = "water" | "sleep" | "weight" | "biofeedback" | "notes" | "measurements";

export type DailyMetricTaskDefinition = {
  key: DailyMetricTaskKey;
  label: string;
  route: string;
};

export const DAILY_METRIC_TASK_DEFINITIONS: DailyMetricTaskDefinition[] = [
  { key: "water", label: "Registrar agua", route: "/today#water" },
  { key: "sleep", label: "Registrar sueño", route: "/today#sleep" },
  { key: "weight", label: "Registrar peso", route: "/today#weight" },
  { key: "biofeedback", label: "Registrar biofeedback", route: "/today#biofeedback" },
  { key: "notes", label: "Registrar nota diaria", route: "/today" },
  { key: "measurements", label: "Registrar medidas corporales", route: "/body" },
];

export const DEFAULT_DAILY_METRIC_TASKS: DailyMetricTaskKey[] = ["water", "sleep", "weight", "biofeedback"];

const GUEST_TASKS_KEY = "appfit_guest_daily_metric_tasks";
const AUTH_TASKS_KEY_PREFIX = "appfit_daily_metric_tasks_";

const isMetricTaskKey = (value: unknown): value is DailyMetricTaskKey =>
  typeof value === "string" &&
  DAILY_METRIC_TASK_DEFINITIONS.some((definition) => definition.key === value);

export const normalizeMetricTaskKeys = (value: unknown): DailyMetricTaskKey[] => {
  if (!Array.isArray(value)) return DEFAULT_DAILY_METRIC_TASKS;
  const normalized = Array.from(new Set(value.filter(isMetricTaskKey)));
  return normalized.length > 0 ? normalized : DEFAULT_DAILY_METRIC_TASKS;
};

const getAuthStorageKey = (userId: string | null) => `${AUTH_TASKS_KEY_PREFIX}${userId ?? "anon"}`;

const getLocalMetricTasks = (userId: string | null, isGuest: boolean): DailyMetricTaskKey[] => {
  const key = isGuest ? GUEST_TASKS_KEY : getAuthStorageKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return DEFAULT_DAILY_METRIC_TASKS;
  try {
    return normalizeMetricTaskKeys(JSON.parse(raw));
  } catch {
    return DEFAULT_DAILY_METRIC_TASKS;
  }
};

const saveLocalMetricTasks = (userId: string | null, isGuest: boolean, keys: DailyMetricTaskKey[]) => {
  const key = isGuest ? GUEST_TASKS_KEY : getAuthStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(normalizeMetricTaskKeys(keys)));
};

const isSchemaMissingError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return (
    message.includes("dashboard_task_metrics") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("column")
  );
};

export const getDailyMetricTaskPreferences = async (
  userId: string | null,
  options?: { isGuest?: boolean },
): Promise<DailyMetricTaskKey[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest || !userId) {
    return getLocalMetricTasks(userId, isGuest);
  }

  const { data, error } = await supabase.from("profiles").select("dashboard_task_metrics").eq("id", userId).maybeSingle();
  if (error) {
    if (isSchemaMissingError(error)) {
      return getLocalMetricTasks(userId, false);
    }
    throw error;
  }

  const normalized = normalizeMetricTaskKeys((data as { dashboard_task_metrics?: unknown } | null)?.dashboard_task_metrics);
  saveLocalMetricTasks(userId, false, normalized);
  return normalized;
};

export const saveDailyMetricTaskPreferences = async (
  userId: string | null,
  keys: DailyMetricTaskKey[],
  options?: { isGuest?: boolean },
): Promise<DailyMetricTaskKey[]> => {
  const isGuest = options?.isGuest || false;
  const normalized = normalizeMetricTaskKeys(keys);

  if (isGuest || !userId) {
    saveLocalMetricTasks(userId, isGuest, normalized);
    return normalized;
  }

  const { error } = await supabase.from("profiles").update({ dashboard_task_metrics: normalized }).eq("id", userId);
  if (error) {
    if (isSchemaMissingError(error)) {
      saveLocalMetricTasks(userId, false, normalized);
      return normalized;
    }
    throw error;
  }

  saveLocalMetricTasks(userId, false, normalized);
  return normalized;
};
