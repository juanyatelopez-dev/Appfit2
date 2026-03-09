-- Persist onboarding state in profiles

alter table public.profiles
add column if not exists onboarding_completed boolean not null default false;

-- Backfill for existing users that already have profile data.
-- Compatible with schemas where nutrition/activity columns may not exist yet.
do $$
declare
  has_nutrition_goal_type boolean;
  has_activity_level boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'nutrition_goal_type'
  ) into has_nutrition_goal_type;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'activity_level'
  ) into has_activity_level;

  if has_nutrition_goal_type and has_activity_level then
    execute $q$
      update public.profiles
      set onboarding_completed = true
      where onboarding_completed = false
        and (
          full_name is not null
          or weight is not null
          or height is not null
          or goal_type is not null
          or nutrition_goal_type is not null
          or activity_level is not null
        )
    $q$;
  elsif has_nutrition_goal_type then
    execute $q$
      update public.profiles
      set onboarding_completed = true
      where onboarding_completed = false
        and (
          full_name is not null
          or weight is not null
          or height is not null
          or goal_type is not null
          or nutrition_goal_type is not null
        )
    $q$;
  elsif has_activity_level then
    execute $q$
      update public.profiles
      set onboarding_completed = true
      where onboarding_completed = false
        and (
          full_name is not null
          or weight is not null
          or height is not null
          or goal_type is not null
          or activity_level is not null
        )
    $q$;
  else
    update public.profiles
    set onboarding_completed = true
    where onboarding_completed = false
      and (
        full_name is not null
        or weight is not null
        or height is not null
        or goal_type is not null
      );
  end if;
end $$;
