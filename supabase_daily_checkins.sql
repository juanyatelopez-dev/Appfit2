create extension if not exists pgcrypto;

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  water_count int not null default 0,
  workout_done boolean not null default false,
  sleep_hours numeric null,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'daily_checkins_user_date_key'
  ) then
    alter table public.daily_checkins
      add constraint daily_checkins_user_date_key unique (user_id, date);
  end if;
end $$;

alter table public.daily_checkins enable row level security;

drop policy if exists daily_checkins_select_own on public.daily_checkins;
create policy daily_checkins_select_own
on public.daily_checkins
for select
using (user_id = auth.uid());

drop policy if exists daily_checkins_insert_own on public.daily_checkins;
create policy daily_checkins_insert_own
on public.daily_checkins
for insert
with check (user_id = auth.uid());

drop policy if exists daily_checkins_update_own on public.daily_checkins;
create policy daily_checkins_update_own
on public.daily_checkins
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_checkins_delete_own on public.daily_checkins;
create policy daily_checkins_delete_own
on public.daily_checkins
for delete
using (user_id = auth.uid());
