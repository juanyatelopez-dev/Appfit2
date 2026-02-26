create extension if not exists pgcrypto;

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'daily_tasks_user_date_title_key'
  ) then
    alter table public.daily_tasks
      add constraint daily_tasks_user_date_title_key unique (user_id, date, title);
  end if;
end $$;

alter table public.daily_tasks enable row level security;

drop policy if exists daily_tasks_select_own on public.daily_tasks;
create policy daily_tasks_select_own
on public.daily_tasks
for select
using (user_id = auth.uid());

drop policy if exists daily_tasks_insert_own on public.daily_tasks;
create policy daily_tasks_insert_own
on public.daily_tasks
for insert
with check (user_id = auth.uid());

drop policy if exists daily_tasks_update_own on public.daily_tasks;
create policy daily_tasks_update_own
on public.daily_tasks
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_tasks_delete_own on public.daily_tasks;
create policy daily_tasks_delete_own
on public.daily_tasks
for delete
using (user_id = auth.uid());
