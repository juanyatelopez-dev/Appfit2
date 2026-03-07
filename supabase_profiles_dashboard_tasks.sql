-- Persist metric To-Do preferences in profiles.
-- If this column is not present, the app falls back to localStorage.

alter table public.profiles
add column if not exists dashboard_task_metrics text[] not null default array['water', 'sleep', 'weight', 'biofeedback'];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_dashboard_task_metrics_check'
  ) then
    alter table public.profiles
    add constraint profiles_dashboard_task_metrics_check
    check (
      array_length(dashboard_task_metrics, 1) >= 1
      and dashboard_task_metrics <@ array['water', 'sleep', 'weight', 'biofeedback', 'notes', 'measurements']::text[]
    );
  end if;
end $$;
