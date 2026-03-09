create extension if not exists pgcrypto;

create or replace function public.reset_user_day(
  p_user_id uuid,
  p_date date,
  p_scopes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scopes text[] := coalesce(p_scopes, array[]::text[]);
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  if array_length(v_scopes, 1) is null then
    raise exception 'At least one scope is required';
  end if;

  if v_scopes && array['water', 'all_daily'] then
    delete from public.water_intake_logs where user_id = p_user_id and date_key = p_date;
  end if;

  if v_scopes && array['sleep', 'all_daily'] then
    delete from public.sleep_logs where user_id = p_user_id and date_key = p_date;
  end if;

  if v_scopes && array['nutrition', 'all_daily'] then
    delete from public.nutrition_entries where user_id = p_user_id and date_key = p_date;
    delete from public.daily_nutrition_targets where user_id = p_user_id and date_key = p_date;
    delete from public.daily_nutrition_summaries where user_id = p_user_id and date_key = p_date;
  end if;

  if v_scopes && array['biofeedback', 'all_daily'] then
    delete from public.daily_biofeedback where user_id = p_user_id and date_key = p_date;
  end if;

  if v_scopes && array['notes', 'all_daily'] then
    delete from public.daily_notes where user_id = p_user_id and date_key = p_date;
  end if;

  if v_scopes && array['measurements', 'all_daily'] then
    delete from public.body_measurements where user_id = p_user_id and date_key = p_date;
  end if;

  if v_scopes && array['weight', 'all_daily'] then
    delete from public.body_metrics where user_id = p_user_id and measured_at = p_date;
  end if;

  if v_scopes && array['checkins', 'all_daily'] then
    delete from public.daily_checkins where user_id = p_user_id and date = p_date;
  end if;

  if v_scopes && array['tasks', 'all_daily'] then
    delete from public.daily_tasks where user_id = p_user_id and date = p_date;
  end if;
end;
$$;

grant execute on function public.reset_user_day(uuid, date, text[]) to authenticated;

create or replace function public.reset_user_history(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  delete from public.water_intake_logs where user_id = p_user_id;
  delete from public.sleep_logs where user_id = p_user_id;
  delete from public.nutrition_entries where user_id = p_user_id;
  delete from public.daily_nutrition_targets where user_id = p_user_id;
  delete from public.daily_nutrition_summaries where user_id = p_user_id;
  delete from public.daily_biofeedback where user_id = p_user_id;
  delete from public.daily_notes where user_id = p_user_id;
  delete from public.body_measurements where user_id = p_user_id;
  delete from public.body_metrics where user_id = p_user_id;
  delete from public.daily_checkins where user_id = p_user_id;
  delete from public.daily_tasks where user_id = p_user_id;
  delete from public.weekly_reviews where user_id = p_user_id;
end;
$$;

grant execute on function public.reset_user_history(uuid) to authenticated;

drop function if exists public.reset_user_account(uuid, boolean);
drop function if exists public.reset_user_account(boolean, uuid);

create or replace function public.reset_user_account(
  p_keep_preferences boolean default true,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updates text := '';
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  perform public.reset_user_history(p_user_id);

  delete from public.nutrition_favorites where user_id = p_user_id;
  delete from public.water_presets where user_id = p_user_id;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name'
  ) then
    v_updates := v_updates || 'full_name = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'birth_date'
  ) then
    v_updates := v_updates || 'birth_date = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'weight'
  ) then
    v_updates := v_updates || 'weight = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'height'
  ) then
    v_updates := v_updates || 'height = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'biological_sex'
  ) then
    v_updates := v_updates || 'biological_sex = ''male'',';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'activity_level'
  ) then
    v_updates := v_updates || 'activity_level = ''moderate'',';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'nutrition_goal_type'
  ) then
    v_updates := v_updates || 'nutrition_goal_type = ''maintain'',';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'day_archetype'
  ) then
    v_updates := v_updates || 'day_archetype = ''base'',';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'goal_type'
  ) then
    v_updates := v_updates || 'goal_type = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'target_weight_kg'
  ) then
    v_updates := v_updates || 'target_weight_kg = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'target_date'
  ) then
    v_updates := v_updates || 'target_date = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'start_weight_kg'
  ) then
    v_updates := v_updates || 'start_weight_kg = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'goal_direction'
  ) then
    v_updates := v_updates || 'goal_direction = null,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'water_goal_ml'
  ) then
    v_updates := v_updates || 'water_goal_ml = 2000,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'water_quick_options_ml'
  ) then
    v_updates := v_updates || 'water_quick_options_ml = array[250, 500, 1000, 2000],';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'sleep_goal_minutes'
  ) then
    v_updates := v_updates || 'sleep_goal_minutes = 480,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'calorie_goal'
  ) then
    v_updates := v_updates || 'calorie_goal = 2000,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'protein_goal_g'
  ) then
    v_updates := v_updates || 'protein_goal_g = 150,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'carb_goal_g'
  ) then
    v_updates := v_updates || 'carb_goal_g = 250,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'fat_goal_g'
  ) then
    v_updates := v_updates || 'fat_goal_g = 70,';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarding_completed'
  ) then
    v_updates := v_updates || 'onboarding_completed = false,';
  end if;
  if not p_keep_preferences then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'app_language'
    ) then
      v_updates := v_updates || 'app_language = ''en'',';
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'theme_preference'
    ) then
      v_updates := v_updates || 'theme_preference = ''system'',';
    end if;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) then
    v_updates := v_updates || 'updated_at = now(),';
  end if;

  if v_updates <> '' then
    v_updates := left(v_updates, length(v_updates) - 1);
    execute format('update public.profiles set %s where id = $1', v_updates) using p_user_id;
  end if;
end;
$$;

grant execute on function public.reset_user_account(boolean, uuid) to authenticated;

notify pgrst, 'reload schema';
