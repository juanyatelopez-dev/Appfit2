import { supabase } from "@/services/supabaseClient";

export type DashboardHomeWidgetKey =
  | "hero_routine"
  | "hero_date"
  | "hero_modules"
  | "hero_consistency"
  | "hero_recovery"
  | "hero_focus"
  | "physical_progress"
  | "quick_actions"
  | "status_row"
  | "nutrition"
  | "water"
  | "weight"
  | "sleep"
  | "biofeedback"
  | "body_measurements"
  | "notes"
  | "recovery_card"
  | "calendar";

export type DashboardHomeWidgetDefinition = {
  key: DashboardHomeWidgetKey;
  label: string;
};

export const DASHBOARD_HOME_WIDGET_DEFINITIONS: DashboardHomeWidgetDefinition[] = [
  { key: "hero_routine", label: "Rutina de hoy" },
  { key: "hero_date", label: "Fecha" },
  { key: "hero_modules", label: "Modulos completos" },
  { key: "hero_consistency", label: "Consistencia 7d" },
  { key: "hero_recovery", label: "Recuperacion" },
  { key: "hero_focus", label: "Enfoque" },
  { key: "physical_progress", label: "Progreso fisico" },
  { key: "quick_actions", label: "Acciones rapidas" },
  { key: "status_row", label: "Resumen rapido" },
  { key: "nutrition", label: "Comidas del dia" },
  { key: "water", label: "Agua hoy" },
  { key: "weight", label: "Peso de hoy" },
  { key: "sleep", label: "Sueño" },
  { key: "biofeedback", label: "Estado fisiologico" },
  { key: "body_measurements", label: "Medidas corporales" },
  { key: "notes", label: "Notas tacticas" },
  { key: "recovery_card", label: "Recovery card" },
  { key: "calendar", label: "Calendario mini" },
];

export const DEFAULT_DASHBOARD_HOME_WIDGETS: DashboardHomeWidgetKey[] = [
  "hero_routine",
  "hero_date",
  "hero_modules",
  "hero_consistency",
  "hero_recovery",
  "hero_focus",
  "physical_progress",
  "quick_actions",
  "status_row",
  "nutrition",
  "water",
  "weight",
  "sleep",
  "biofeedback",
  "body_measurements",
  "notes",
  "recovery_card",
  "calendar",
];

const GUEST_WIDGETS_KEY = "appfit_guest_dashboard_home_widgets";
const AUTH_WIDGETS_KEY_PREFIX = "appfit_dashboard_home_widgets_";
let dashboardHomeWidgetsSchemaUnavailable = false;

const isDashboardHomeWidgetKey = (value: unknown): value is DashboardHomeWidgetKey =>
  typeof value === "string" && DASHBOARD_HOME_WIDGET_DEFINITIONS.some((definition) => definition.key === value);

export const normalizeDashboardHomeWidgetKeys = (value: unknown): DashboardHomeWidgetKey[] => {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_HOME_WIDGETS;
  const normalized = Array.from(new Set(value.filter(isDashboardHomeWidgetKey)));
  return normalized.length > 0 ? normalized : DEFAULT_DASHBOARD_HOME_WIDGETS;
};

const getAuthStorageKey = (userId: string | null) => `${AUTH_WIDGETS_KEY_PREFIX}${userId ?? "anon"}`;

const getLocalWidgets = (userId: string | null, isGuest: boolean): DashboardHomeWidgetKey[] => {
  const key = isGuest ? GUEST_WIDGETS_KEY : getAuthStorageKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return DEFAULT_DASHBOARD_HOME_WIDGETS;
  try {
    return normalizeDashboardHomeWidgetKeys(JSON.parse(raw));
  } catch {
    return DEFAULT_DASHBOARD_HOME_WIDGETS;
  }
};

const saveLocalWidgets = (userId: string | null, isGuest: boolean, keys: DashboardHomeWidgetKey[]) => {
  const key = isGuest ? GUEST_WIDGETS_KEY : getAuthStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(normalizeDashboardHomeWidgetKeys(keys)));
};

const isSchemaMissingError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  const status = (error as { status?: number } | null)?.status;
  return (
    status === 400 ||
    message.includes("dashboard_home_widgets") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("column")
  );
};

export const getDashboardHomeWidgetPreferences = async (
  userId: string | null,
  options?: { isGuest?: boolean },
): Promise<DashboardHomeWidgetKey[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest || !userId) return getLocalWidgets(userId, isGuest);
  if (dashboardHomeWidgetsSchemaUnavailable) return getLocalWidgets(userId, false);

  const { data, error } = await supabase.from("profiles").select("dashboard_home_widgets").eq("id", userId).maybeSingle();
  if (error) {
    if (isSchemaMissingError(error)) {
      dashboardHomeWidgetsSchemaUnavailable = true;
      return getLocalWidgets(userId, false);
    }
    throw error;
  }

  const normalized = normalizeDashboardHomeWidgetKeys((data as { dashboard_home_widgets?: unknown } | null)?.dashboard_home_widgets);
  saveLocalWidgets(userId, false, normalized);
  return normalized;
};

export const saveDashboardHomeWidgetPreferences = async (
  userId: string | null,
  keys: DashboardHomeWidgetKey[],
  options?: { isGuest?: boolean },
): Promise<DashboardHomeWidgetKey[]> => {
  const isGuest = options?.isGuest || false;
  const normalized = normalizeDashboardHomeWidgetKeys(keys);

  if (isGuest || !userId) {
    saveLocalWidgets(userId, isGuest, normalized);
    return normalized;
  }
  if (dashboardHomeWidgetsSchemaUnavailable) {
    saveLocalWidgets(userId, false, normalized);
    return normalized;
  }

  const { error } = await supabase.from("profiles").update({ dashboard_home_widgets: normalized }).eq("id", userId);
  if (error) {
    if (isSchemaMissingError(error)) {
      dashboardHomeWidgetsSchemaUnavailable = true;
      saveLocalWidgets(userId, false, normalized);
      return normalized;
    }
    throw error;
  }

  saveLocalWidgets(userId, false, normalized);
  return normalized;
};
