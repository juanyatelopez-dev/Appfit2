alter table public.exercises
  add column if not exists name_i18n jsonb,
  add column if not exists instructions_i18n jsonb;

alter table public.workout_templates
  add column if not exists name_i18n jsonb,
  add column if not exists description_i18n jsonb;

create unique index if not exists workout_sessions_one_active_per_user_idx
  on public.workout_sessions (user_id)
  where status = 'active';

create or replace function public.save_workout_with_exercises(
  p_user_id uuid,
  p_workout_id uuid,
  p_name text,
  p_description text,
  p_exercises jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_workout_id uuid := coalesce(p_workout_id, gen_random_uuid());
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  if coalesce(length(trim(p_name)), 0) = 0 then
    raise exception 'workout_name_required';
  end if;

  if jsonb_typeof(p_exercises) is distinct from 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'workout_exercises_required';
  end if;

  insert into public.workouts (id, user_id, name, description)
  values (v_workout_id, p_user_id, trim(p_name), p_description)
  on conflict (id) do update
    set name = excluded.name,
        description = excluded.description,
        updated_at = now()
  where public.workouts.user_id = p_user_id;

  delete from public.workout_exercises
  where workout_id = v_workout_id;

  insert into public.workout_exercises (
    workout_id,
    exercise_id,
    order_index,
    target_sets,
    target_reps,
    rest_seconds,
    notes
  )
  select
    v_workout_id,
    row_value.exercise_id,
    row_number() over (order by coalesce(row_value.order_index, 0), row_value.exercise_id) - 1,
    greatest(coalesce(row_value.target_sets, 3), 1),
    coalesce(nullif(trim(row_value.target_reps), ''), '8-10'),
    greatest(coalesce(row_value.rest_seconds, 90), 0),
    nullif(trim(row_value.notes), '')
  from jsonb_to_recordset(p_exercises) as row_value(
    exercise_id uuid,
    order_index integer,
    target_sets integer,
    target_reps text,
    rest_seconds integer,
    notes text
  );

  return v_workout_id;
end;
$$;

create or replace function public.start_workout_session_safe(
  p_user_id uuid,
  p_workout_id uuid
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_existing_id uuid;
  v_session_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  select id
  into v_existing_id
  from public.workout_sessions
  where user_id = p_user_id
    and status = 'active'
  order by started_at desc
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  begin
    insert into public.workout_sessions (user_id, workout_id, status, total_volume)
    values (p_user_id, p_workout_id, 'active', 0)
    returning id into v_session_id;
  exception
    when unique_violation then
      select id
      into v_session_id
      from public.workout_sessions
      where user_id = p_user_id
        and status = 'active'
      order by started_at desc
      limit 1;
  end;

  return v_session_id;
end;
$$;
