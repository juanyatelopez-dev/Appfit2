import { supabase } from "@/services/supabaseClient";

export type NotificationSeverity = "info" | "warning" | "action";
export type NotificationKind = "complete_profile" | "resolve_onboarding" | "log_first_activity" | "general";

export type UserNotification = {
  id: string;
  notification_kind: NotificationKind;
  title: string;
  body: string;
  action_path: string | null;
  action_label: string | null;
  severity: NotificationSeverity;
  metadata: Record<string, string | number | boolean | null>;
  sender_user_id: string | null;
  sender_email: string | null;
  read_at: string | null;
  created_at: string | null;
};

export type AdminNotificationAuditRow = {
  id: string;
  notification_kind: NotificationKind;
  title: string;
  severity: NotificationSeverity;
  action_path: string | null;
  sender_user_id: string | null;
  sender_email: string | null;
  target_user_id: string;
  target_email: string | null;
  read_at: string | null;
  created_at: string | null;
};

type ReminderTemplate = {
  kind: NotificationKind;
  title: string;
  body: string;
  actionPath: string;
  actionLabel: string;
  severity: NotificationSeverity;
};

export const reminderTemplates: Record<Exclude<NotificationKind, "general">, ReminderTemplate> = {
  complete_profile: {
    kind: "complete_profile",
    title: "Completa tu perfil base",
    body: "Tu cuenta aun necesita completar los datos base del perfil para que la experiencia quede bien configurada.",
    actionPath: "/fitness-profile",
    actionLabel: "Completar perfil",
    severity: "warning",
  },
  resolve_onboarding: {
    kind: "resolve_onboarding",
    title: "Retoma tu onboarding",
    body: "Aun tienes pasos pendientes en tu onboarding. Completarlo ayudara a activar mejor tu cuenta dentro de la app.",
    actionPath: "/onboarding",
    actionLabel: "Ir a onboarding",
    severity: "warning",
  },
  log_first_activity: {
    kind: "log_first_activity",
    title: "Registra tu primera actividad",
    body: "Todavia no vemos actividad relevante en tu cuenta. Empieza con un primer registro para activar tu seguimiento.",
    actionPath: "/today",
    actionLabel: "Ir al panel diario",
    severity: "info",
  },
};

export async function listMyNotifications(limit = 20) {
  const { data, error } = await supabase.rpc("list_my_notifications", {
    p_limit: limit,
  });

  if (error) throw error;

  return ((data ?? []) as Partial<UserNotification>[]).map((row) => ({
    id: row.id ?? "",
    notification_kind: (row.notification_kind as NotificationKind | undefined) ?? "general",
    title: row.title ?? "Notificacion",
    body: row.body ?? "",
    action_path: row.action_path ?? null,
    action_label: row.action_label ?? null,
    severity: (row.severity as NotificationSeverity | undefined) ?? "info",
    metadata: (row.metadata as Record<string, string | number | boolean | null> | undefined) ?? {},
    sender_user_id: row.sender_user_id ?? null,
    sender_email: row.sender_email ?? null,
    read_at: row.read_at ?? null,
    created_at: row.created_at ?? null,
  }));
}

export async function markMyNotificationRead(notificationId: string) {
  const { error } = await supabase.rpc("mark_my_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllMyNotificationsRead() {
  const { error } = await supabase.rpc("mark_all_my_notifications_read");

  if (error) throw error;
}

export async function sendAdminReminder(targetUserId: string, kind: Exclude<NotificationKind, "general">) {
  const template = reminderTemplates[kind];

  const { data, error } = await supabase.rpc("send_admin_notification", {
    p_target_user_id: targetUserId,
    p_notification_kind: template.kind,
    p_title: template.title,
    p_body: template.body,
    p_action_path: template.actionPath,
    p_action_label: template.actionLabel,
    p_severity: template.severity,
    p_metadata: {
      template_kind: template.kind,
      source: "admin_users",
    },
  });

  if (error) throw error;

  return data as string | null;
}

export async function getAdminNotificationAudit(limit = 100) {
  const { data, error } = await supabase.rpc("get_admin_notification_audit", {
    p_limit: limit,
  });

  if (error) throw error;

  return ((data ?? []) as Partial<AdminNotificationAuditRow>[]).map((row) => ({
    id: row.id ?? "",
    notification_kind: (row.notification_kind as NotificationKind | undefined) ?? "general",
    title: row.title ?? "Notificacion",
    severity: (row.severity as NotificationSeverity | undefined) ?? "info",
    action_path: row.action_path ?? null,
    sender_user_id: row.sender_user_id ?? null,
    sender_email: row.sender_email ?? null,
    target_user_id: row.target_user_id ?? "",
    target_email: row.target_email ?? null,
    read_at: row.read_at ?? null,
    created_at: row.created_at ?? null,
  }));
}
