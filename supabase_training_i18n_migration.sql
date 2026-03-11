alter table public.exercises
  add column if not exists name_i18n jsonb,
  add column if not exists instructions_i18n jsonb;

alter table public.workout_templates
  add column if not exists name_i18n jsonb,
  add column if not exists description_i18n jsonb;

update public.exercises
set
  name_i18n = case id
    when '11111111-1111-1111-1111-111111111111'::uuid then jsonb_build_object('en', 'Bench Press', 'es', 'Press banca')
    when '11111111-1111-1111-1111-111111111112'::uuid then jsonb_build_object('en', 'Incline Dumbbell Press', 'es', 'Press inclinado con mancuernas')
    when '11111111-1111-1111-1111-111111111113'::uuid then jsonb_build_object('en', 'Chest Fly Machine', 'es', 'Aperturas en maquina')
    when '11111111-1111-1111-1111-111111111114'::uuid then jsonb_build_object('en', 'Pull-Up', 'es', 'Dominadas')
    when '11111111-1111-1111-1111-111111111115'::uuid then jsonb_build_object('en', 'Barbell Row', 'es', 'Remo con barra')
    when '11111111-1111-1111-1111-111111111116'::uuid then jsonb_build_object('en', 'Lat Pulldown', 'es', 'Jalon al pecho')
    when '11111111-1111-1111-1111-111111111117'::uuid then jsonb_build_object('en', 'Back Squat', 'es', 'Sentadilla trasera')
    when '11111111-1111-1111-1111-111111111118'::uuid then jsonb_build_object('en', 'Romanian Deadlift', 'es', 'Peso muerto rumano')
    when '11111111-1111-1111-1111-111111111119'::uuid then jsonb_build_object('en', 'Leg Press', 'es', 'Prensa de piernas')
    when '11111111-1111-1111-1111-111111111120'::uuid then jsonb_build_object('en', 'Walking Lunge', 'es', 'Zancada caminando')
    when '11111111-1111-1111-1111-111111111121'::uuid then jsonb_build_object('en', 'Standing Calf Raise', 'es', 'Elevacion de talones de pie')
    when '11111111-1111-1111-1111-111111111122'::uuid then jsonb_build_object('en', 'Overhead Press', 'es', 'Press militar')
    when '11111111-1111-1111-1111-111111111123'::uuid then jsonb_build_object('en', 'Lateral Raise', 'es', 'Elevaciones laterales')
    when '11111111-1111-1111-1111-111111111124'::uuid then jsonb_build_object('en', 'Barbell Curl', 'es', 'Curl con barra')
    when '11111111-1111-1111-1111-111111111125'::uuid then jsonb_build_object('en', 'Hammer Curl', 'es', 'Curl martillo')
    when '11111111-1111-1111-1111-111111111126'::uuid then jsonb_build_object('en', 'Cable Pushdown', 'es', 'Extension de triceps en polea')
    when '11111111-1111-1111-1111-111111111127'::uuid then jsonb_build_object('en', 'Skull Crusher', 'es', 'Rompecraneos')
    when '11111111-1111-1111-1111-111111111128'::uuid then jsonb_build_object('en', 'Hip Thrust', 'es', 'Hip thrust')
    when '11111111-1111-1111-1111-111111111129'::uuid then jsonb_build_object('en', 'Plank', 'es', 'Plancha')
    when '11111111-1111-1111-1111-111111111130'::uuid then jsonb_build_object('en', 'Cable Crunch', 'es', 'Crunch en polea')
    else coalesce(name_i18n, jsonb_build_object('en', name, 'es', name))
  end,
  instructions_i18n = coalesce(instructions_i18n, jsonb_build_object('en', instructions, 'es', instructions))
where is_custom = false;

update public.workout_templates
set
  name_i18n = case id
    when '22222222-2222-2222-2222-222222222221'::uuid then jsonb_build_object('en', 'Push', 'es', 'Empuje')
    when '22222222-2222-2222-2222-222222222222'::uuid then jsonb_build_object('en', 'Pull', 'es', 'Traccion')
    when '22222222-2222-2222-2222-222222222223'::uuid then jsonb_build_object('en', 'Legs', 'es', 'Piernas')
    when '22222222-2222-2222-2222-222222222224'::uuid then jsonb_build_object('en', 'Full Body', 'es', 'Cuerpo completo')
    else coalesce(name_i18n, jsonb_build_object('en', name, 'es', name))
  end,
  description_i18n = case id
    when '22222222-2222-2222-2222-222222222221'::uuid then jsonb_build_object('en', 'Chest, shoulders and triceps with moderate volume.', 'es', 'Pecho, hombros y triceps con volumen moderado.')
    when '22222222-2222-2222-2222-222222222222'::uuid then jsonb_build_object('en', 'Back and biceps with vertical and horizontal pulling focus.', 'es', 'Espalda y biceps con foco en traccion vertical y horizontal.')
    when '22222222-2222-2222-2222-222222222223'::uuid then jsonb_build_object('en', 'Full lower body day with squat, hinge and unilateral work.', 'es', 'Pierna completa con squat, hinge y trabajo unilateral.')
    when '22222222-2222-2222-2222-222222222224'::uuid then jsonb_build_object('en', 'Compact session for short-time days.', 'es', 'Sesion compacta para dias de poco tiempo.')
    else coalesce(description_i18n, jsonb_build_object('en', description, 'es', description))
  end
where is_system = true;

create index if not exists exercises_name_i18n_gin_idx
  on public.exercises using gin (name_i18n jsonb_path_ops);

create index if not exists workout_templates_name_i18n_gin_idx
  on public.workout_templates using gin (name_i18n jsonb_path_ops);
