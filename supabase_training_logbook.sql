create extension if not exists pgcrypto;

create or replace function public.set_training_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  secondary_muscles text[] not null default '{}',
  equipment text not null,
  movement_type text not null,
  difficulty text not null,
  instructions text,
  video_url text,
  is_custom boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists exercises_name_idx on public.exercises (name);
create index if not exists exercises_muscle_group_idx on public.exercises (muscle_group);
create index if not exists exercises_equipment_idx on public.exercises (equipment);
create index if not exists exercises_movement_type_idx on public.exercises (movement_type);

alter table public.exercises enable row level security;

drop policy if exists exercises_select_policy on public.exercises;
create policy exercises_select_policy on public.exercises
for select
using (not is_custom or created_by = auth.uid());

drop policy if exists exercises_insert_policy on public.exercises;
create policy exercises_insert_policy on public.exercises
for insert
with check (is_custom = true and created_by = auth.uid());

drop policy if exists exercises_update_policy on public.exercises;
create policy exercises_update_policy on public.exercises
for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists exercises_delete_policy on public.exercises;
create policy exercises_delete_policy on public.exercises
for delete
using (created_by = auth.uid());

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  focus_tags text[] not null default '{}',
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index integer not null default 0,
  target_sets integer not null default 3 check (target_sets > 0),
  target_reps text not null default '8-10',
  rest_seconds integer not null default 90 check (rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workout_template_exercises_template_idx
  on public.workout_template_exercises (template_id, order_index);

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;

drop policy if exists workout_templates_select_policy on public.workout_templates;
create policy workout_templates_select_policy on public.workout_templates
for select
using (true);

drop policy if exists workout_template_exercises_select_policy on public.workout_template_exercises;
create policy workout_template_exercises_select_policy on public.workout_template_exercises
for select
using (true);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index integer not null default 0,
  target_sets integer not null default 3 check (target_sets > 0),
  target_reps text not null default '8-10',
  rest_seconds integer not null default 90 check (rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_idx on public.workouts (user_id, updated_at desc);
create index if not exists workout_exercises_workout_idx on public.workout_exercises (workout_id, order_index);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;

drop policy if exists workouts_select_own on public.workouts;
create policy workouts_select_own on public.workouts
for select
using (user_id = auth.uid());

drop policy if exists workouts_insert_own on public.workouts;
create policy workouts_insert_own on public.workouts
for insert
with check (user_id = auth.uid());

drop policy if exists workouts_update_own on public.workouts;
create policy workouts_update_own on public.workouts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists workouts_delete_own on public.workouts;
create policy workouts_delete_own on public.workouts
for delete
using (user_id = auth.uid());

drop policy if exists workout_exercises_select_own on public.workout_exercises;
create policy workout_exercises_select_own on public.workout_exercises
for select
using (
  exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_exercises_insert_own on public.workout_exercises;
create policy workout_exercises_insert_own on public.workout_exercises
for insert
with check (
  exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_exercises_update_own on public.workout_exercises;
create policy workout_exercises_update_own on public.workout_exercises
for update
using (
  exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_exercises_delete_own on public.workout_exercises;
create policy workout_exercises_delete_own on public.workout_exercises
for delete
using (
  exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and w.user_id = auth.uid()
  )
);

create table if not exists public.workout_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  workout_id uuid references public.workouts(id) on delete set null,
  is_rest_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day_of_week)
);

alter table public.workout_schedule
  add column if not exists is_rest_day boolean not null default false;

create index if not exists workout_schedule_user_idx on public.workout_schedule (user_id, day_of_week);

alter table public.workout_schedule enable row level security;

drop policy if exists workout_schedule_select_own on public.workout_schedule;
create policy workout_schedule_select_own on public.workout_schedule
for select
using (user_id = auth.uid());

drop policy if exists workout_schedule_insert_own on public.workout_schedule;
create policy workout_schedule_insert_own on public.workout_schedule
for insert
with check (user_id = auth.uid());

drop policy if exists workout_schedule_update_own on public.workout_schedule;
create policy workout_schedule_update_own on public.workout_schedule
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists workout_schedule_delete_own on public.workout_schedule;
create policy workout_schedule_delete_own on public.workout_schedule
for delete
using (user_id = auth.uid());

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  total_volume numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_idx on public.workout_sessions (user_id, started_at desc);
create index if not exists workout_sessions_status_idx on public.workout_sessions (user_id, status);

alter table public.workout_sessions enable row level security;

drop policy if exists workout_sessions_select_own on public.workout_sessions;
create policy workout_sessions_select_own on public.workout_sessions
for select
using (user_id = auth.uid());

drop policy if exists workout_sessions_insert_own on public.workout_sessions;
create policy workout_sessions_insert_own on public.workout_sessions
for insert
with check (user_id = auth.uid());

drop policy if exists workout_sessions_update_own on public.workout_sessions;
create policy workout_sessions_update_own on public.workout_sessions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists workout_sessions_delete_own on public.workout_sessions;
create policy workout_sessions_delete_own on public.workout_sessions
for delete
using (user_id = auth.uid());

create table if not exists public.session_exercise_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, exercise_id)
);

create index if not exists session_exercise_notes_session_idx on public.session_exercise_notes (session_id);

alter table public.session_exercise_notes enable row level security;

drop policy if exists session_exercise_notes_select_own on public.session_exercise_notes;
create policy session_exercise_notes_select_own on public.session_exercise_notes
for select
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = session_exercise_notes.session_id
      and ws.user_id = auth.uid()
  )
);

drop policy if exists session_exercise_notes_insert_own on public.session_exercise_notes;
create policy session_exercise_notes_insert_own on public.session_exercise_notes
for insert
with check (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = session_exercise_notes.session_id
      and ws.user_id = auth.uid()
  )
);

drop policy if exists session_exercise_notes_update_own on public.session_exercise_notes;
create policy session_exercise_notes_update_own on public.session_exercise_notes
for update
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = session_exercise_notes.session_id
      and ws.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = session_exercise_notes.session_id
      and ws.user_id = auth.uid()
  )
);

drop policy if exists session_exercise_notes_delete_own on public.session_exercise_notes;
create policy session_exercise_notes_delete_own on public.session_exercise_notes
for delete
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = session_exercise_notes.session_id
      and ws.user_id = auth.uid()
  )
);

create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  set_number integer not null check (set_number > 0),
  weight numeric not null default 0,
  reps integer not null default 0,
  rir numeric,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, exercise_id, set_number)
);

create index if not exists exercise_sets_session_idx on public.exercise_sets (session_id, exercise_id, set_number);
create index if not exists exercise_sets_exercise_idx on public.exercise_sets (exercise_id, created_at desc);

alter table public.exercise_sets enable row level security;

drop policy if exists exercise_sets_select_own on public.exercise_sets;
create policy exercise_sets_select_own on public.exercise_sets
for select
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = exercise_sets.session_id
      and ws.user_id = auth.uid()
  )
);

drop policy if exists exercise_sets_insert_own on public.exercise_sets;
create policy exercise_sets_insert_own on public.exercise_sets
for insert
with check (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = exercise_sets.session_id
      and ws.user_id = auth.uid()
  )
);

drop policy if exists exercise_sets_update_own on public.exercise_sets;
create policy exercise_sets_update_own on public.exercise_sets
for update
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = exercise_sets.session_id
      and ws.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = exercise_sets.session_id
      and ws.user_id = auth.uid()
  )
);

drop policy if exists exercise_sets_delete_own on public.exercise_sets;
create policy exercise_sets_delete_own on public.exercise_sets
for delete
using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = exercise_sets.session_id
      and ws.user_id = auth.uid()
  )
);

create table if not exists public.exercise_prs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  pr_type text not null check (pr_type in ('max_weight', 'estimated_1rm', 'max_volume')),
  value_num numeric not null,
  achieved_at timestamptz not null default now(),
  session_id uuid references public.workout_sessions(id) on delete set null,
  set_id uuid references public.exercise_sets(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_id, pr_type)
);

create index if not exists exercise_prs_user_idx on public.exercise_prs (user_id, exercise_id);

alter table public.exercise_prs enable row level security;

drop policy if exists exercise_prs_select_own on public.exercise_prs;
create policy exercise_prs_select_own on public.exercise_prs
for select
using (user_id = auth.uid());

drop policy if exists exercise_prs_insert_own on public.exercise_prs;
create policy exercise_prs_insert_own on public.exercise_prs
for insert
with check (user_id = auth.uid());

drop policy if exists exercise_prs_update_own on public.exercise_prs;
create policy exercise_prs_update_own on public.exercise_prs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists exercise_prs_delete_own on public.exercise_prs;
create policy exercise_prs_delete_own on public.exercise_prs
for delete
using (user_id = auth.uid());

drop trigger if exists workouts_updated_at on public.workouts;
create trigger workouts_updated_at
before update on public.workouts
for each row execute function public.set_training_updated_at();

drop trigger if exists workout_schedule_updated_at on public.workout_schedule;
create trigger workout_schedule_updated_at
before update on public.workout_schedule
for each row execute function public.set_training_updated_at();

drop trigger if exists session_exercise_notes_updated_at on public.session_exercise_notes;
create trigger session_exercise_notes_updated_at
before update on public.session_exercise_notes
for each row execute function public.set_training_updated_at();

drop trigger if exists exercise_prs_updated_at on public.exercise_prs;
create trigger exercise_prs_updated_at
before update on public.exercise_prs
for each row execute function public.set_training_updated_at();

insert into public.exercises (id, name, muscle_group, secondary_muscles, equipment, movement_type, difficulty, instructions, video_url, is_custom, created_by)
values
  ('11111111-1111-1111-1111-111111111111', 'Bench Press', 'chest', array['triceps','shoulders'], 'barbell', 'push', 'intermediate', 'Escapulas retraidas, baja controlado y empuja fuerte.', null, false, null),
  ('11111111-1111-1111-1111-111111111112', 'Incline Dumbbell Press', 'chest', array['shoulders','triceps'], 'dumbbell', 'push', 'beginner', 'Mantener banco inclinado moderado y recorrido completo.', null, false, null),
  ('11111111-1111-1111-1111-111111111113', 'Chest Fly Machine', 'chest', array['shoulders'], 'machine', 'isolation', 'beginner', 'Cerrar con control y pausar en la contraccion.', null, false, null),
  ('11111111-1111-1111-1111-111111111114', 'Pull-Up', 'back', array['biceps','core'], 'pull_up_bar', 'pull', 'intermediate', 'Sube el pecho hacia la barra y controla la bajada.', null, false, null),
  ('11111111-1111-1111-1111-111111111115', 'Barbell Row', 'back', array['biceps','rear_delts'], 'barbell', 'pull', 'intermediate', 'Torso firme y barra al abdomen.', null, false, null),
  ('11111111-1111-1111-1111-111111111116', 'Lat Pulldown', 'back', array['biceps'], 'cable', 'pull', 'beginner', 'Lleva la barra al pecho sin perder posicion.', null, false, null),
  ('11111111-1111-1111-1111-111111111117', 'Back Squat', 'legs', array['quads','glutes','core'], 'barbell', 'squat', 'intermediate', 'Respira profundo, baja estable y sube con todo el pie.', null, false, null),
  ('11111111-1111-1111-1111-111111111118', 'Romanian Deadlift', 'hamstrings', array['glutes','back'], 'barbell', 'hinge', 'intermediate', 'Cadera atras y barra pegada al cuerpo.', null, false, null),
  ('11111111-1111-1111-1111-111111111119', 'Leg Press', 'quads', array['glutes'], 'machine', 'squat', 'beginner', 'Controla el rango y empuja con todo el pie.', null, false, null),
  ('11111111-1111-1111-1111-111111111120', 'Walking Lunge', 'legs', array['glutes','quads'], 'dumbbell', 'lunge', 'intermediate', 'Paso largo y torso erguido.', null, false, null),
  ('11111111-1111-1111-1111-111111111121', 'Standing Calf Raise', 'calves', array[]::text[], 'machine', 'isolation', 'beginner', 'Estira abajo y pausa arriba.', null, false, null),
  ('11111111-1111-1111-1111-111111111122', 'Overhead Press', 'shoulders', array['triceps','core'], 'barbell', 'push', 'intermediate', 'Apreta abdomen y barra vertical.', null, false, null),
  ('11111111-1111-1111-1111-111111111123', 'Lateral Raise', 'shoulders', array[]::text[], 'dumbbell', 'isolation', 'beginner', 'Evita balanceo y llega a linea del hombro.', null, false, null),
  ('11111111-1111-1111-1111-111111111124', 'Barbell Curl', 'biceps', array['forearms'], 'ez_bar', 'isolation', 'beginner', 'Codos quietos y contraccion completa.', null, false, null),
  ('11111111-1111-1111-1111-111111111125', 'Hammer Curl', 'biceps', array['forearms'], 'dumbbell', 'isolation', 'beginner', 'Agarre neutro y control de bajada.', null, false, null),
  ('11111111-1111-1111-1111-111111111126', 'Cable Pushdown', 'triceps', array[]::text[], 'cable', 'isolation', 'beginner', 'Bloquea abajo sin mover hombros.', null, false, null),
  ('11111111-1111-1111-1111-111111111127', 'Skull Crusher', 'triceps', array[]::text[], 'ez_bar', 'isolation', 'intermediate', 'Baja controlado hacia frente.', null, false, null),
  ('11111111-1111-1111-1111-111111111128', 'Hip Thrust', 'glutes', array['hamstrings'], 'barbell', 'hinge', 'intermediate', 'Retroversion pelvica y pausa arriba.', null, false, null),
  ('11111111-1111-1111-1111-111111111129', 'Plank', 'core', array['full_body'], 'bodyweight', 'core', 'beginner', 'Linea recta y abdomen firme.', null, false, null),
  ('11111111-1111-1111-1111-111111111130', 'Cable Crunch', 'core', array[]::text[], 'cable', 'core', 'beginner', 'Flexiona tronco sin tirar de brazos.', null, false, null)
on conflict (id) do nothing;

insert into public.workout_templates (id, name, description, focus_tags, is_system)
values
  ('22222222-2222-2222-2222-222222222221', 'Push', 'Pecho, hombros y triceps.', array['push','upper'], true),
  ('22222222-2222-2222-2222-222222222222', 'Pull', 'Espalda y biceps.', array['pull','upper'], true),
  ('22222222-2222-2222-2222-222222222223', 'Legs', 'Pierna completa.', array['legs','lower'], true),
  ('22222222-2222-2222-2222-222222222224', 'Full Body', 'Sesion compacta de cuerpo completo.', array['full_body'], true)
on conflict (id) do nothing;

insert into public.workout_template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
select *
from (
  values
    ('22222222-2222-2222-2222-222222222221'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 0, 4, '6-8', 150, 'Serie top + backoff'),
    ('22222222-2222-2222-2222-222222222221'::uuid, '11111111-1111-1111-1111-111111111112'::uuid, 1, 3, '8-10', 120, null),
    ('22222222-2222-2222-2222-222222222221'::uuid, '11111111-1111-1111-1111-111111111122'::uuid, 2, 3, '6-8', 120, null),
    ('22222222-2222-2222-2222-222222222221'::uuid, '11111111-1111-1111-1111-111111111126'::uuid, 3, 3, '10-12', 75, null),
    ('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111114'::uuid, 0, 4, '6-8', 150, null),
    ('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111115'::uuid, 1, 4, '8-10', 120, null),
    ('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111124'::uuid, 2, 3, '10-12', 75, null),
    ('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111125'::uuid, 3, 2, '12-15', 60, null),
    ('22222222-2222-2222-2222-222222222223'::uuid, '11111111-1111-1111-1111-111111111117'::uuid, 0, 4, '5-8', 180, null),
    ('22222222-2222-2222-2222-222222222223'::uuid, '11111111-1111-1111-1111-111111111118'::uuid, 1, 4, '6-8', 150, null),
    ('22222222-2222-2222-2222-222222222223'::uuid, '11111111-1111-1111-1111-111111111120'::uuid, 2, 3, '10-12', 90, null),
    ('22222222-2222-2222-2222-222222222223'::uuid, '11111111-1111-1111-1111-111111111121'::uuid, 3, 4, '12-15', 60, null),
    ('22222222-2222-2222-2222-222222222224'::uuid, '11111111-1111-1111-1111-111111111117'::uuid, 0, 3, '5-6', 180, null),
    ('22222222-2222-2222-2222-222222222224'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 1, 3, '6-8', 150, null),
    ('22222222-2222-2222-2222-222222222224'::uuid, '11111111-1111-1111-1111-111111111116'::uuid, 2, 3, '8-10', 120, null),
    ('22222222-2222-2222-2222-222222222224'::uuid, '11111111-1111-1111-1111-111111111129'::uuid, 3, 3, '45s', 45, null)
) as seed(template_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
where not exists (
  select 1
  from public.workout_template_exercises wte
  where wte.template_id = seed.template_id
    and wte.exercise_id = seed.exercise_id
);
