alter table public.profiles
  add column if not exists theme_accent_color text,
  add column if not exists theme_background_style text;

update public.profiles
set
  theme_accent_color = coalesce(theme_accent_color, 'cyan'),
  theme_background_style = coalesce(theme_background_style, 'focus');
