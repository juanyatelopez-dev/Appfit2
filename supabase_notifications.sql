-- In-app notifications layer for AppFit
-- Apply after supabase_user_roles_admin.sql

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users(id) on delete cascade,
  sender_user_id uuid references public.users(id) on delete set null,
  notification_kind text not null,
  title text not null,
  body text not null,
  action_path text,
  action_label text,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_target_user_idx on public.user_notifications (target_user_id, created_at desc);
create index if not exists user_notifications_unread_idx on public.user_notifications (target_user_id, read_at, created_at desc);

alter table public.user_notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_notifications_severity_check'
  ) then
    alter table public.user_notifications
    add constraint user_notifications_severity_check
    check (severity in ('info', 'warning', 'action'));
  end if;
end $$;

create or replace function public.send_admin_notification(
  p_target_user_id uuid,
  p_notification_kind text,
  p_title text,
  p_body text,
  p_action_path text default null,
  p_action_label text default null,
  p_severity text default 'warning',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_notification_id uuid;
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  if p_severity not in ('info', 'warning', 'action') then
    raise exception 'Invalid severity';
  end if;

  insert into public.user_notifications (
    target_user_id,
    sender_user_id,
    notification_kind,
    title,
    body,
    action_path,
    action_label,
    severity,
    metadata
  )
  values (
    p_target_user_id,
    auth.uid(),
    left(coalesce(nullif(trim(p_notification_kind), ''), 'general'), 80),
    left(coalesce(nullif(trim(p_title), ''), 'Notificacion'), 180),
    left(coalesce(nullif(trim(p_body), ''), 'Tienes una accion pendiente dentro de AppFit.'), 600),
    case when p_action_path is null or trim(p_action_path) = '' then null else left(trim(p_action_path), 200) end,
    case when p_action_label is null or trim(p_action_label) = '' then null else left(trim(p_action_label), 80) end,
    p_severity,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.list_my_notifications(p_limit integer default 20)
returns table (
  id uuid,
  notification_kind text,
  title text,
  body text,
  action_path text,
  action_label text,
  severity text,
  metadata jsonb,
  sender_user_id uuid,
  sender_email text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := greatest(coalesce(p_limit, 20), 1);
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  return query
  select
    notification.id,
    notification.notification_kind,
    notification.title,
    notification.body,
    notification.action_path,
    notification.action_label,
    notification.severity,
    notification.metadata,
    notification.sender_user_id,
    sender.email::text as sender_email,
    notification.read_at,
    notification.created_at
  from public.user_notifications notification
  left join auth.users sender on sender.id = notification.sender_user_id
  where notification.target_user_id = auth.uid()
  order by notification.read_at asc nulls first, notification.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  update public.user_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and target_user_id = auth.uid();
end;
$$;

create or replace function public.mark_all_my_notifications_read()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  update public.user_notifications
  set read_at = coalesce(read_at, now())
  where target_user_id = auth.uid()
    and read_at is null;
end;
$$;

create or replace function public.get_admin_notification_audit(p_limit integer default 100)
returns table (
  id uuid,
  notification_kind text,
  title text,
  severity text,
  action_path text,
  sender_user_id uuid,
  sender_email text,
  target_user_id uuid,
  target_email text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := greatest(coalesce(p_limit, 100), 1);
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    notification.id,
    notification.notification_kind,
    notification.title,
    notification.severity,
    notification.action_path,
    notification.sender_user_id,
    sender.email::text as sender_email,
    notification.target_user_id,
    target.email::text as target_email,
    notification.read_at,
    notification.created_at
  from public.user_notifications notification
  left join auth.users sender on sender.id = notification.sender_user_id
  left join auth.users target on target.id = notification.target_user_id
  order by notification.created_at desc
  limit v_limit;
end;
$$;

grant execute on function public.send_admin_notification(uuid, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.list_my_notifications(integer) to authenticated;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_my_notifications_read() to authenticated;
grant execute on function public.get_admin_notification_audit(integer) to authenticated;

notify pgrst, 'reload schema';
