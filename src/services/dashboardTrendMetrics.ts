import { supabase } from "@/services/supabaseClient";

export type DashboardTrendMetricKey =
  | "weight"
  | "water"
  | "sleep_hours"
  | "sleep_quality"
  | "energy"
  | "stress"
  | "training_energy"
  | "hunger"
  | "digestion"
  | "libido"
  | "waist_cm"
  | "body_fat_pct"
  | "completion_count"
  | "goal_hits";

export type DashboardTrendMetricDefinition = {
  key: DashboardTrendMetricKey;
  label: string;
  color: string;
};

export const DASHBOARD_TREND_METRIC_DEFINITIONS: DashboardTrendMetricDefinition[] = [
  { key: "weight", label: "Peso (kg)", color: "hsl(var(--primary))" },
  { key: "water", label: "Agua (ml)", color: "#0ea5e9" },
  { key: "sleep_hours", label: "Sueño (h)", color: "#6366f1" },
  { key: "sleep_quality", label: "Calidad de sueño", color: "#f59e0b" },
  { key: "energy", label: "Energía diaria", color: "#22c55e" },
  { key: "stress", label: "Estres percibido", color: "#ef4444" },
  { key: "training_energy", label: "Energia de entrenamiento", color: "#14b8a6" },
  { key: "hunger", label: "Hambre", color: "#f97316" },
  { key: "digestion", label: "Digestion", color: "#84cc16" },
  { key: "libido", label: "Libido", color: "#ec4899" },
  { key: "waist_cm", label: "Cintura (cm)", color: "#06b6d4" },
  { key: "body_fat_pct", label: "Grasa corporal (%)", color: "#a855f7" },
  { key: "completion_count", label: "Cumplimiento diario", color: "#eab308" },
  { key: "goal_hits", label: "Metas del día", color: "#38bdf8" },
];

export const DEFAULT_DASHBOARD_TREND_METRICS: DashboardTrendMetricKey[] = ["weight", "water", "sleep_hours"];

const GUEST_TRENDS_KEY = "appfit_guest_dashboard_trend_metrics";
const AUTH_TRENDS_KEY_PREFIX = "appfit_dashboard_trend_metrics_";

const isTrendMetricKey = (value: unknown): value is DashboardTrendMetricKey =>
  typeof value === "string" && DASHBOARD_TREND_METRIC_DEFINITIONS.some((definition) => definition.key === value);

export const normalizeDashboardTrendMetricKeys = (value: unknown): DashboardTrendMetricKey[] => {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_TREND_METRICS;
  const normalized = Array.from(new Set(value.filter(isTrendMetricKey)));
  return normalized.length > 0 ? normalized : DEFAULT_DASHBOARD_TREND_METRICS;
};

const getAuthStorageKey = (userId: string | null) => `${AUTH_TRENDS_KEY_PREFIX}${userId ?? "anon"}`;

const getLocalTrendMetrics = (userId: string | null, isGuest: boolean): DashboardTrendMetricKey[] => {
  const key = isGuest ? GUEST_TRENDS_KEY : getAuthStorageKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return DEFAULT_DASHBOARD_TREND_METRICS;
  try {
    return normalizeDashboardTrendMetricKeys(JSON.parse(raw));
  } catch {
    return DEFAULT_DASHBOARD_TREND_METRICS;
  }
};

const saveLocalTrendMetrics = (userId: string | null, isGuest: boolean, keys: DashboardTrendMetricKey[]) => {
  const key = isGuest ? GUEST_TRENDS_KEY : getAuthStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(normalizeDashboardTrendMetricKeys(keys)));
};

const isSchemaMissingError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return (
    message.includes("dashboard_trend_metrics") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("column")
  );
};

export const getDashboardTrendMetricPreferences = async (
  userId: string | null,
  options?: { isGuest?: boolean },
): Promise<DashboardTrendMetricKey[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest || !userId) return getLocalTrendMetrics(userId, isGuest);

  const { data, error } = await supabase.from("profiles").select("dashboard_trend_metrics").eq("id", userId).maybeSingle();
  if (error) {
    if (isSchemaMissingError(error)) return getLocalTrendMetrics(userId, false);
    throw error;
  }

  const normalized = normalizeDashboardTrendMetricKeys((data as { dashboard_trend_metrics?: unknown } | null)?.dashboard_trend_metrics);
  saveLocalTrendMetrics(userId, false, normalized);
  return normalized;
};

export const saveDashboardTrendMetricPreferences = async (
  userId: string | null,
  keys: DashboardTrendMetricKey[],
  options?: { isGuest?: boolean },
): Promise<DashboardTrendMetricKey[]> => {
  const isGuest = options?.isGuest || false;
  const normalized = normalizeDashboardTrendMetricKeys(keys);

  if (isGuest || !userId) {
    saveLocalTrendMetrics(userId, isGuest, normalized);
    return normalized;
  }

  const { error } = await supabase.from("profiles").update({ dashboard_trend_metrics: normalized }).eq("id", userId);
  if (error) {
    if (isSchemaMissingError(error)) {
      saveLocalTrendMetrics(userId, false, normalized);
      return normalized;
    }
    throw error;
  }

  saveLocalTrendMetrics(userId, false, normalized);
  return normalized;
};
