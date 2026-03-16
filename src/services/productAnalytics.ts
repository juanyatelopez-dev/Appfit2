import { supabase } from "@/services/supabaseClient";
import type { AccountRole } from "@/context/auth/types";

const SESSION_STORAGE_KEY = "appfit_product_analytics_session_id";

type TrackingMetadata = Record<string, string | number | boolean | null>;

type TrackedPanelDefinition = {
  panelKey: string;
  featureArea: string;
  route: string;
  label: string;
};

const TRACKED_PANELS: TrackedPanelDefinition[] = [
  { panelKey: "auth_login", featureArea: "auth", route: "/auth", label: "Auth" },
  { panelKey: "auth_callback", featureArea: "auth", route: "/auth/callback", label: "Auth callback" },
  { panelKey: "onboarding", featureArea: "activation", route: "/onboarding", label: "Onboarding" },
  { panelKey: "today", featureArea: "workspace", route: "/today", label: "Today" },
  { panelKey: "training", featureArea: "workspace", route: "/training", label: "Training" },
  { panelKey: "nutrition", featureArea: "workspace", route: "/nutrition", label: "Nutrition" },
  { panelKey: "body", featureArea: "workspace", route: "/body", label: "Body" },
  { panelKey: "progress", featureArea: "workspace", route: "/progress", label: "Progress" },
  { panelKey: "calendar", featureArea: "workspace", route: "/calendar", label: "Calendar" },
  { panelKey: "fitness_profile", featureArea: "workspace", route: "/fitness-profile", label: "Fitness profile" },
  { panelKey: "settings", featureArea: "workspace", route: "/settings", label: "Settings" },
  { panelKey: "admin_overview", featureArea: "admin", route: "/admin", label: "Admin resumen" },
  { panelKey: "admin_users", featureArea: "admin", route: "/admin/users", label: "Admin usuarios" },
  { panelKey: "admin_usage", featureArea: "admin", route: "/admin/usage", label: "Admin uso" },
];

export type ResolvedTrackedPanel = TrackedPanelDefinition;

export const getTrackedPanels = () => TRACKED_PANELS.slice();

export const resolveTrackedPanel = (pathname: string): ResolvedTrackedPanel | null =>
  TRACKED_PANELS.find((panel) => panel.route === pathname) ?? null;

const createSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
};

export const getAnalyticsSessionId = () => {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const next = createSessionId();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
};

export async function trackPanelView(params: {
  pathname: string;
  accountRole: AccountRole;
  metadata?: TrackingMetadata;
}) {
  const { pathname, accountRole, metadata } = params;
  const panel = resolveTrackedPanel(pathname);

  if (!panel) {
    return;
  }

  const payload: TrackingMetadata = {
    label: panel.label,
    account_role_client: accountRole,
    ...(metadata ?? {}),
  };

  const { error } = await supabase.rpc("track_panel_event", {
    p_session_id: getAnalyticsSessionId(),
    p_route: pathname,
    p_panel_key: panel.panelKey,
    p_feature_area: panel.featureArea,
    p_event_name: "panel_view",
    p_metadata: payload,
  });

  if (error) {
    throw error;
  }
}
