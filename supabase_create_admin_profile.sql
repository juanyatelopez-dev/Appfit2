-- Ejecuta este script en Supabase SQL Editor.
-- Reemplaza el email en la variable target_email antes de correrlo.
-- Objetivo:
-- 1) Marcar el usuario como verificado (si existe en auth.users)
-- 2) Crear/actualizar su fila en public.profiles
-- 3) (Opcional) Agregar columna role y asignar 'admin'

begin;

-- 1) Define el email objetivo
with params as (
  select 'admin@appfit.local'::text as target_email
),
target_user as (
  select u.id, u.email
  from auth.users u
  join params p on p.target_email = u.email
  limit 1
)
-- 2) Marca email como verificado
update auth.users u
set
  email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  confirmed_at = coalesce(u.confirmed_at, now()),
  updated_at = now()
from target_user t
where u.id = t.id;

-- 3) Crea perfil si no existe (o actualiza nombre por defecto)
with params as (
  select 'admin@appfit.local'::text as target_email
),
target_user as (
  select u.id
  from auth.users u
  join params p on p.target_email = u.email
  limit 1
)
insert into public.profiles (
  id,
  full_name,
  weight,
  height,
  goal_type,
  is_premium
)
select
  t.id,
  'Administrador',
  null,
  null,
  null,
  false
from target_user t
on conflict (id) do update
set full_name = excluded.full_name;

-- 4) Opcional: soporte real de rol admin
alter table public.profiles
add column if not exists role text default 'user';

with params as (
  select 'admin@appfit.local'::text as target_email
),
target_user as (
  select u.id
  from auth.users u
  join params p on p.target_email = u.email
  limit 1
)
update public.profiles p
set role = 'admin'
from target_user t
where p.id = t.id;

commit;

-- Validación rápida:
-- select id, email, email_confirmed_at, confirmed_at from auth.users where email = 'admin@appfit.local';
-- select * from public.profiles where id = (select id from auth.users where email = 'admin@appfit.local');
