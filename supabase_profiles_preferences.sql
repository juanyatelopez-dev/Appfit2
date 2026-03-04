-- Persist app-level user preferences in profiles

alter table public.profiles
add column if not exists app_language text not null default 'en',
add column if not exists theme_preference text not null default 'system';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_app_language_check'
  ) then
    alter table public.profiles
    add constraint profiles_app_language_check
    check (app_language in ('en', 'es'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_theme_preference_check'
  ) then
    alter table public.profiles
    add constraint profiles_theme_preference_check
    check (theme_preference in ('light', 'dark', 'system'));
  end if;
end $$;

