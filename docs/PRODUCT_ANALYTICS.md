# Product Analytics

## Purpose
This layer records which panels authenticated users visit so the admin console can answer:

- Which modules are used the most
- Which panels are barely adopted
- How many users are active in a recent window
- Whether adoption is moving between workspace and admin areas

## Scope
Current tracking is intentionally small and only stores panel views.

Tracked routes:

- `/auth`
- `/auth/callback`
- `/onboarding`
- `/today`
- `/training`
- `/nutrition`
- `/body`
- `/progress`
- `/calendar`
- `/fitness-profile`
- `/settings`
- `/admin`
- `/admin/users`
- `/admin/usage`

## Data Model
SQL lives in `supabase_user_roles_admin.sql`.

Main table:

- `public.product_panel_events`

Stored fields:

- `user_id`
- `session_id`
- `route`
- `panel_key`
- `feature_area`
- `event_name`
- `account_role`
- `metadata`
- `created_at`

## RPC Functions
- `track_panel_event(...)`
- `get_admin_panel_usage(p_days integer default 30)`
- `get_admin_usage_daily(p_days integer default 14)`

## Frontend Integration
The tracker is mounted globally in `src/App.tsx` through `src/components/PanelUsageTracker.tsx`.

Route definitions live in `src/services/productAnalytics.ts`.

## Admin Reading Surface
The admin console exposes usage analytics in `src/pages/AdminUsage.tsx`.

Key outputs:

- total views in the current window
- top panels by views
- unique users by panel
- recent daily trend

## Operational Notes
- Tracking currently skips guest sessions.
- Tracking is designed for product validation, not billing.
- Do not send secrets, health data payloads, or free-text notes inside `metadata`.
- If a new panel is added to routing, add it to `TRACKED_PANELS` to keep analytics complete.
