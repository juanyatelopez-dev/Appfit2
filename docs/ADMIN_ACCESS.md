# Admin Access

## Roles

- `member`: usuario regular
- `admin_manager`: admin designado con acceso al entorno administrativo en modo lectura/operacion
- `super_admin`: admin total con capacidad de reasignar roles

## Frontend

Rutas nuevas:

- `/admin`
- `/admin/users`

El acceso esta protegido por el guard `RequireAccountRole`.

## Backend / Supabase

Antes de usar el entorno admin en produccion o staging, ejecutar:

- `supabase_user_roles_admin.sql`

Ese script:

- agrega `account_role` a `public.users`
- rellena filas faltantes para usuarios existentes
- expone RPCs seguras para metricas y directorio de usuarios

## RPCs usadas por el frontend

- `get_admin_dashboard_metrics`
- `get_admin_user_directory`
- `set_user_account_role`

## Recomendacion operativa

- definir una sola cuenta inicial como `super_admin`
- usar `admin_manager` para personal operativo
- no asignar permisos administrativos desde el frontend sin haber ejecutado primero el SQL de roles
