-- Canonical roles and admin analytics layer for AppFit
-- Apply this in Supabase SQL editor before using /admin in production.

alter table public.users
add column if not exists account_role text not null default 'member';

alter table public.users
add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_account_role_check'
  ) then
    alter table public.users
    add constraint users_account_role_check
    check (account_role in ('member', 'admin_manager', 'super_admin'));
  end if;
end $$;

insert into public.users (id)
select id
from auth.users
where id not in (select id from public.users);

update public.users u
set onboarding_completed = coalesce(p.onboarding_completed, u.onboarding_completed, false)
from public.profiles p
where p.id = u.id;

create table if not exists public.admin_role_change_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  target_user_id uuid references public.users(id) on delete cascade,
  previous_role text not null,
  next_role text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_role_change_audit enable row level security;

create or replace function public.current_account_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select account_role from public.users where id = auth.uid()),
    'member'
  );
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_role_change_audit'
      and policyname = 'Super admins can view role audit'
  ) then
    create policy "Super admins can view role audit"
    on public.admin_role_change_audit
    for select
    using (public.current_account_role() = 'super_admin');
  end if;
end $$;

create or replace function public.get_admin_dashboard_metrics()
returns table (
  total_users bigint,
  completed_onboarding_users bigint,
  admin_users bigint,
  nutrition_entries bigint,
  body_metrics_entries bigint,
  body_measurements_entries bigint,
  nutrition_profiles bigint,
  users_without_profile bigint,
  onboarding_inconsistent bigint,
  users_without_activity bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    (select count(*) from public.users),
    (select count(*) from public.users where onboarding_completed = true),
    (select count(*) from public.users where account_role in ('admin_manager', 'super_admin')),
    (select count(*) from public.nutrition_entries),
    (select count(*) from public.body_metrics),
    (select count(*) from public.body_measurements),
    (select count(*) from public.nutrition_profiles),
    (select count(*) from public.users u left join public.profiles p on p.id = u.id where p.id is null),
    (
      select count(*)
      from public.users u
      left join public.profiles p on p.id = u.id
      where p.id is not null
        and coalesce(u.onboarding_completed, false) <> coalesce(p.onboarding_completed, false)
    ),
    (
      select count(*)
      from public.users u
      where not exists (select 1 from public.nutrition_entries ne where ne.user_id = u.id)
        and not exists (select 1 from public.body_metrics bm where bm.user_id = u.id)
        and not exists (select 1 from public.body_measurements bme where bme.user_id = u.id)
    );
end;
$$;

create or replace function public.get_admin_user_directory()
returns table (
  user_id uuid,
  email text,
  full_name text,
  account_role text,
  onboarding_completed boolean,
  avatar_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id as user_id,
    au.email::text,
    p.full_name,
    u.account_role,
    coalesce(u.onboarding_completed, p.onboarding_completed, false) as onboarding_completed,
    p.avatar_url,
    au.created_at
  from public.users u
  left join public.profiles p on p.id = u.id
  left join auth.users au on au.id = u.id
  order by au.created_at desc nulls last, u.id;
end;
$$;

create or replace function public.set_user_account_role(target_user_id uuid, next_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_role text;
begin
  if public.current_account_role() <> 'super_admin' then
    raise exception 'Not authorized';
  end if;

  if next_role not in ('member', 'admin_manager', 'super_admin') then
    raise exception 'Invalid role';
  end if;

  select account_role into previous_role
  from public.users
  where id = target_user_id;

  update public.users
  set account_role = next_role,
      updated_at = now()
  where id = target_user_id;

  if previous_role is not null and previous_role <> next_role then
    insert into public.admin_role_change_audit (actor_user_id, target_user_id, previous_role, next_role)
    values (auth.uid(), target_user_id, previous_role, next_role);
  end if;
end;
$$;

create or replace function public.get_admin_role_change_audit()
returns table (
  id uuid,
  actor_user_id uuid,
  actor_email text,
  target_user_id uuid,
  target_email text,
  previous_role text,
  next_role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    audit.id,
    audit.actor_user_id,
    actor.email::text as actor_email,
    audit.target_user_id,
    target.email::text as target_email,
    audit.previous_role,
    audit.next_role,
    audit.created_at
  from public.admin_role_change_audit audit
  left join auth.users actor on actor.id = audit.actor_user_id
  left join auth.users target on target.id = audit.target_user_id
  order by audit.created_at desc
  limit 100;
end;
$$;

grant execute on function public.current_account_role() to authenticated;
grant execute on function public.get_admin_dashboard_metrics() to authenticated;
grant execute on function public.get_admin_user_directory() to authenticated;
grant execute on function public.set_user_account_role(uuid, text) to authenticated;
grant execute on function public.get_admin_role_change_audit() to authenticated;

create or replace function public.get_admin_user_directory_detailed()
returns table (
  user_id uuid,
  email text,
  full_name text,
  account_role text,
  onboarding_completed boolean,
  avatar_url text,
  created_at timestamptz,
  missing_profile boolean,
  onboarding_inconsistent boolean,
  without_activity boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id as user_id,
    au.email::text,
    p.full_name,
    u.account_role,
    coalesce(u.onboarding_completed, p.onboarding_completed, false) as onboarding_completed,
    p.avatar_url,
    au.created_at,
    (p.id is null) as missing_profile,
    (
      p.id is not null
      and coalesce(u.onboarding_completed, false) <> coalesce(p.onboarding_completed, false)
    ) as onboarding_inconsistent,
    (
      not exists (select 1 from public.nutrition_entries ne where ne.user_id = u.id)
      and not exists (select 1 from public.body_metrics bm where bm.user_id = u.id)
      and not exists (select 1 from public.body_measurements bme where bme.user_id = u.id)
    ) as without_activity
  from public.users u
  left join public.profiles p on p.id = u.id
  left join auth.users au on au.id = u.id
  order by au.created_at desc nulls last, u.id;
end;
$$;

create table if not exists public.product_panel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id text not null,
  route text not null,
  panel_key text not null,
  feature_area text not null,
  event_name text not null default 'panel_view',
  account_role text not null default 'member',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_panel_events_created_at_idx on public.product_panel_events (created_at desc);
create index if not exists product_panel_events_panel_key_idx on public.product_panel_events (panel_key, created_at desc);
create index if not exists product_panel_events_user_id_idx on public.product_panel_events (user_id, created_at desc);

alter table public.product_panel_events enable row level security;

create or replace function public.track_panel_event(
  p_session_id text,
  p_route text,
  p_panel_key text,
  p_feature_area text,
  p_event_name text default 'panel_view',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  insert into public.product_panel_events (
    user_id,
    session_id,
    route,
    panel_key,
    feature_area,
    event_name,
    account_role,
    metadata
  )
  values (
    auth.uid(),
    left(coalesce(nullif(trim(p_session_id), ''), 'unknown-session'), 120),
    left(coalesce(nullif(trim(p_route), ''), 'unknown-route'), 200),
    left(coalesce(nullif(trim(p_panel_key), ''), 'unknown-panel'), 80),
    left(coalesce(nullif(trim(p_feature_area), ''), 'workspace'), 80),
    left(coalesce(nullif(trim(p_event_name), ''), 'panel_view'), 80),
    public.current_account_role(),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.get_admin_panel_usage(p_days integer default 30)
returns table (
  panel_key text,
  feature_area text,
  route text,
  total_views bigint,
  unique_users bigint,
  last_viewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(coalesce(p_days, 30), 1);
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    e.panel_key,
    e.feature_area,
    min(e.route)::text as route,
    count(*) as total_views,
    count(distinct e.user_id) as unique_users,
    max(e.created_at) as last_viewed_at
  from public.product_panel_events e
  where e.created_at >= now() - make_interval(days => v_days)
    and e.event_name = 'panel_view'
  group by e.panel_key, e.feature_area
  order by total_views desc, unique_users desc, panel_key asc;
end;
$$;

create or replace function public.get_admin_usage_daily(p_days integer default 14)
returns table (
  event_date date,
  total_views bigint,
  unique_users bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(coalesce(p_days, 14), 1);
begin
  if public.current_account_role() not in ('admin_manager', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    timezone('utc', e.created_at)::date as event_date,
    count(*) as total_views,
    count(distinct e.user_id) as unique_users
  from public.product_panel_events e
  where e.created_at >= now() - make_interval(days => v_days)
    and e.event_name = 'panel_view'
  group by timezone('utc', e.created_at)::date
  order by event_date desc;
end;
$$;

grant execute on function public.get_admin_user_directory_detailed() to authenticated;
grant execute on function public.track_panel_event(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.get_admin_panel_usage(integer) to authenticated;
grant execute on function public.get_admin_usage_daily(integer) to authenticated;

notify pgrst, 'reload schema';
