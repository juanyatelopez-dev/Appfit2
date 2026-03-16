import { supabase } from "@/services/supabaseClient";
import type { AccountRole } from "@/context/auth/types";

export type AdminDashboardMetrics = {
  total_users: number;
  completed_onboarding_users: number;
  admin_users: number;
  nutrition_entries: number;
  body_metrics_entries: number;
  body_measurements_entries: number;
  nutrition_profiles: number;
  users_without_profile: number;
  onboarding_inconsistent: number;
  users_without_activity: number;
};

export type AdminUserDirectoryRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  account_role: AccountRole;
  onboarding_completed: boolean | null;
  avatar_url: string | null;
  created_at: string | null;
};

export type AdminRoleAuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  target_user_id: string;
  target_email: string | null;
  previous_role: AccountRole;
  next_role: AccountRole;
  created_at: string | null;
};

const normalizeMetrics = (row: Partial<AdminDashboardMetrics> | null | undefined): AdminDashboardMetrics => ({
  total_users: Number(row?.total_users ?? 0),
  completed_onboarding_users: Number(row?.completed_onboarding_users ?? 0),
  admin_users: Number(row?.admin_users ?? 0),
  nutrition_entries: Number(row?.nutrition_entries ?? 0),
  body_metrics_entries: Number(row?.body_metrics_entries ?? 0),
  body_measurements_entries: Number(row?.body_measurements_entries ?? 0),
  nutrition_profiles: Number(row?.nutrition_profiles ?? 0),
  users_without_profile: Number(row?.users_without_profile ?? 0),
  onboarding_inconsistent: Number(row?.onboarding_inconsistent ?? 0),
  users_without_activity: Number(row?.users_without_activity ?? 0),
});

export async function getAdminDashboardMetrics() {
  const { data, error } = await supabase.rpc("get_admin_dashboard_metrics");

  if (error) throw error;

  return normalizeMetrics(Array.isArray(data) ? data[0] : data);
}

export async function getAdminUserDirectory() {
  const { data, error } = await supabase.rpc("get_admin_user_directory");

  if (error) throw error;

  return ((data ?? []) as Partial<AdminUserDirectoryRow>[]).map((row) => ({
    user_id: row.user_id ?? "",
    email: row.email ?? null,
    full_name: row.full_name ?? null,
    account_role: (row.account_role as AccountRole | undefined) ?? "member",
    onboarding_completed: row.onboarding_completed ?? null,
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at ?? null,
  }));
}

export async function updateUserAccountRole(targetUserId: string, nextRole: AccountRole) {
  const { error } = await supabase.rpc("set_user_account_role", {
    target_user_id: targetUserId,
    next_role: nextRole,
  });

  if (error) throw error;
}

export async function getAdminRoleChangeAudit() {
  const { data, error } = await supabase.rpc("get_admin_role_change_audit");

  if (error) throw error;

  return ((data ?? []) as Partial<AdminRoleAuditRow>[]).map((row) => ({
    id: row.id ?? "",
    actor_user_id: row.actor_user_id ?? null,
    actor_email: row.actor_email ?? null,
    target_user_id: row.target_user_id ?? "",
    target_email: row.target_email ?? null,
    previous_role: (row.previous_role as AccountRole | undefined) ?? "member",
    next_role: (row.next_role as AccountRole | undefined) ?? "member",
    created_at: row.created_at ?? null,
  }));
}
