-- Weight goal fields on profiles

alter table public.profiles
add column if not exists target_weight_kg numeric null;

alter table public.profiles
add column if not exists target_date date null;

alter table public.profiles
add column if not exists start_weight_kg numeric null;

alter table public.profiles
add column if not exists goal_direction text null;

alter table public.profiles
add column if not exists updated_at timestamp with time zone default now();
