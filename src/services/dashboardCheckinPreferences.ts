import { supabase } from "@/services/supabaseClient";

export type DashboardCheckinModuleKey = "water" | "sleep" | "weight" | "measurements" | "biofeedback" | "nutrition";

export type DashboardCheckinModuleDefinition = {
  key: DashboardCheckinModuleKey;
  label: string;
  route: string;
};

export const DASHBOARD_CHECKIN_MODULE_DEFINITIONS: DashboardCheckinModuleDefinition[] = [
  { key: "water", label: "Agua", route: "#water" },
  { key: "sleep", label: "Sueno", route: "#sleep" },
  { key: "weight", label: "Peso", route: "#weight" },
  { key: "measurements", label: "Medidas", route: "/body" },
  { key: "biofeedback", label: "Biofeedback", route: "#biofeedback" },
  { key: "nutrition", label: "Comidas", route: "#nutrition" },
];

export const DEFAULT_DASHBOARD_CHECKIN_MODULES: DashboardCheckinModuleKey[] = [
  "water",
  "sleep",
  "weight",
  "measurements",
  "biofeedback",
  "nutrition",
];

const GUEST_MODULES_KEY = "appfit_guest_dashboard_checkin_modules";
const AUTH_MODULES_KEY_PREFIX = "appfit_dashboard_checkin_modules_";
const CHECKIN_SCHEMA_FLAG_KEY = "appfit_dashboard_checkin_modules_schema_unavailable";
let dashboardCheckinSchemaUnavailable = localStorage.getItem(CHECKIN_SCHEMA_FLAG_KEY) === "true";

const isDashboardCheckinModuleKey = (value: unknown): value is DashboardCheckinModuleKey =>
  typeof value === "string" && DASHBOARD_CHECKIN_MODULE_DEFINITIONS.some((definition) => definition.key === value);

export const normalizeDashboardCheckinModuleKeys = (value: unknown): DashboardCheckinModuleKey[] => {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_CHECKIN_MODULES;
  const normalized = Array.from(new Set(value.filter(isDashboardCheckinModuleKey)));
  return normalized.length > 0 ? normalized : DEFAULT_DASHBOARD_CHECKIN_MODULES;
};

const getAuthStorageKey = (userId: string | null) => `${AUTH_MODULES_KEY_PREFIX}${userId ?? "anon"}`;

const getLocalModules = (userId: string | null, isGuest: boolean): DashboardCheckinModuleKey[] => {
  const key = isGuest ? GUEST_MODULES_KEY : getAuthStorageKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return DEFAULT_DASHBOARD_CHECKIN_MODULES;
  try {
    return normalizeDashboardCheckinModuleKeys(JSON.parse(raw));
  } catch {
    return DEFAULT_DASHBOARD_CHECKIN_MODULES;
  }
};

const saveLocalModules = (userId: string | null, isGuest: boolean, keys: DashboardCheckinModuleKey[]) => {
  const key = isGuest ? GUEST_MODULES_KEY : getAuthStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(normalizeDashboardCheckinModuleKeys(keys)));
};

const markSchemaUnavailable = () => {
  dashboardCheckinSchemaUnavailable = true;
  localStorage.setItem(CHECKIN_SCHEMA_FLAG_KEY, "true");
};

const clearSchemaUnavailable = () => {
  dashboardCheckinSchemaUnavailable = false;
  localStorage.removeItem(CHECKIN_SCHEMA_FLAG_KEY);
};

const isSchemaMissingError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  const status = (error as { status?: number } | null)?.status;
  return (
    status === 400 ||
    message.includes("dashboard_checkin_modules") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("column")
  );
};

export const getDashboardCheckinModulePreferences = async (
  userId: string | null,
  options?: { isGuest?: boolean },
): Promise<DashboardCheckinModuleKey[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest || !userId) return getLocalModules(userId, isGuest);
  if (dashboardCheckinSchemaUnavailable) return getLocalModules(userId, false);

  const { data, error } = await supabase.from("profiles").select("dashboard_checkin_modules").eq("id", userId).maybeSingle();
  if (error) {
    if (isSchemaMissingError(error)) {
      markSchemaUnavailable();
      return getLocalModules(userId, false);
    }
    throw error;
  }
  clearSchemaUnavailable();

  const normalized = normalizeDashboardCheckinModuleKeys((data as { dashboard_checkin_modules?: unknown } | null)?.dashboard_checkin_modules);
  saveLocalModules(userId, false, normalized);
  return normalized;
};

export const saveDashboardCheckinModulePreferences = async (
  userId: string | null,
  keys: DashboardCheckinModuleKey[],
  options?: { isGuest?: boolean },
): Promise<DashboardCheckinModuleKey[]> => {
  const isGuest = options?.isGuest || false;
  const normalized = normalizeDashboardCheckinModuleKeys(keys);

  if (isGuest || !userId) {
    saveLocalModules(userId, isGuest, normalized);
    return normalized;
  }
  if (dashboardCheckinSchemaUnavailable) {
    saveLocalModules(userId, false, normalized);
    return normalized;
  }

  const { error } = await supabase.from("profiles").update({ dashboard_checkin_modules: normalized }).eq("id", userId);
  if (error) {
    if (isSchemaMissingError(error)) {
      markSchemaUnavailable();
      saveLocalModules(userId, false, normalized);
      return normalized;
    }
    throw error;
  }
  clearSchemaUnavailable();

  saveLocalModules(userId, false, normalized);
  return normalized;
};
