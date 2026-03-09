create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists biological_sex text,
add column if not exists activity_level text,
add column if not exists nutrition_goal_type text,
add column if not exists day_archetype text not null default 'base';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_biological_sex_check'
  ) then
    alter table public.profiles
    add constraint profiles_biological_sex_check
    check (biological_sex is null or biological_sex in ('male', 'female'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_activity_level_check'
  ) then
    alter table public.profiles
    add constraint profiles_activity_level_check
    check (activity_level is null or activity_level in ('low', 'moderate', 'high', 'very_high', 'hyperactive'));
  end if;

  if exists (
    select 1 from pg_constraint where conname = 'profiles_nutrition_goal_type_check'
  ) then
    alter table public.profiles
    drop constraint profiles_nutrition_goal_type_check;
  end if;

  alter table public.profiles
  add constraint profiles_nutrition_goal_type_check
  check (nutrition_goal_type is null or nutrition_goal_type in ('lose', 'lose_slow', 'maintain', 'gain_slow', 'gain'));

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_day_archetype_check'
  ) then
    alter table public.profiles
    add constraint profiles_day_archetype_check
    check (day_archetype in ('base', 'heavy', 'recovery'));
  end if;
end $$;

alter table public.nutrition_entries
add column if not exists sodium_mg numeric not null default 0 check (sodium_mg >= 0),
add column if not exists potassium_mg numeric not null default 0 check (potassium_mg >= 0),
add column if not exists micronutrients jsonb,
add column if not exists nutrient_density_score numeric;

alter table public.nutrition_favorites
add column if not exists sodium_mg numeric not null default 0 check (sodium_mg >= 0),
add column if not exists potassium_mg numeric not null default 0 check (potassium_mg >= 0),
add column if not exists micronutrients jsonb,
add column if not exists nutrient_density_score numeric;

alter table public.food_database
add column if not exists sodium_mg numeric not null default 0 check (sodium_mg >= 0),
add column if not exists potassium_mg numeric not null default 0 check (potassium_mg >= 0),
add column if not exists micronutrients jsonb;

create table if not exists public.daily_nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  day_archetype text not null default 'base' check (day_archetype in ('base', 'heavy', 'recovery')),
  bmr numeric not null,
  tdee numeric not null,
  calorie_target numeric not null,
  final_target_calories numeric not null,
  protein_grams numeric not null,
  fat_grams numeric not null,
  carb_grams numeric not null,
  protein_calories numeric not null,
  fat_calories numeric not null,
  carb_calories numeric not null,
  activity_multiplier numeric not null,
  goal_multiplier numeric not null,
  archetype_delta numeric not null,
  calorie_override numeric,
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_nutrition_targets_user_day_uniq unique (user_id, date_key)
);

create index if not exists daily_nutrition_targets_user_date_idx
  on public.daily_nutrition_targets (user_id, date_key);

alter table public.daily_nutrition_targets enable row level security;

drop policy if exists daily_nutrition_targets_select_own on public.daily_nutrition_targets;
create policy daily_nutrition_targets_select_own
on public.daily_nutrition_targets
for select
using (user_id = auth.uid());

drop policy if exists daily_nutrition_targets_insert_own on public.daily_nutrition_targets;
create policy daily_nutrition_targets_insert_own
on public.daily_nutrition_targets
for insert
with check (user_id = auth.uid());

drop policy if exists daily_nutrition_targets_update_own on public.daily_nutrition_targets;
create policy daily_nutrition_targets_update_own
on public.daily_nutrition_targets
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_nutrition_targets_delete_own on public.daily_nutrition_targets;
create policy daily_nutrition_targets_delete_own
on public.daily_nutrition_targets
for delete
using (user_id = auth.uid());

create table if not exists public.daily_nutrition_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  total_calories numeric not null default 0,
  total_protein_g numeric not null default 0,
  total_carbs_g numeric not null default 0,
  total_fat_g numeric not null default 0,
  total_fiber_g numeric not null default 0,
  total_sugar_g numeric not null default 0,
  total_sodium_mg numeric not null default 0,
  total_potassium_mg numeric not null default 0,
  sodium_potassium_ratio numeric,
  nutrient_density_score numeric,
  meal_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_nutrition_summaries_user_day_uniq unique (user_id, date_key)
);

create index if not exists daily_nutrition_summaries_user_date_idx
  on public.daily_nutrition_summaries (user_id, date_key);

alter table public.daily_nutrition_summaries enable row level security;

drop policy if exists daily_nutrition_summaries_select_own on public.daily_nutrition_summaries;
create policy daily_nutrition_summaries_select_own
on public.daily_nutrition_summaries
for select
using (user_id = auth.uid());

drop policy if exists daily_nutrition_summaries_insert_own on public.daily_nutrition_summaries;
create policy daily_nutrition_summaries_insert_own
on public.daily_nutrition_summaries
for insert
with check (user_id = auth.uid());

drop policy if exists daily_nutrition_summaries_update_own on public.daily_nutrition_summaries;
create policy daily_nutrition_summaries_update_own
on public.daily_nutrition_summaries
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_nutrition_summaries_delete_own on public.daily_nutrition_summaries;
create policy daily_nutrition_summaries_delete_own
on public.daily_nutrition_summaries
for delete
using (user_id = auth.uid());
