# Notifications

## Purpose
This module introduces the first persistent in-app notification layer for AppFit.

It is designed for:

- admin reminders to users with incomplete setup
- operational messages inside the product
- a future inbox model without rebuilding the UI shell

## Current Product Behavior
Admins can now send reminders from the user directory when a user has one of these signals:

- missing profile
- inconsistent onboarding
- no activity yet

Users receive those reminders inside the app through:

- the bell icon in the header
- a top banner when there is at least one unread reminder

## SQL
Apply:

- `supabase_notifications.sql`

This script creates:

- `public.user_notifications`
- `send_admin_notification(...)`
- `list_my_notifications(...)`
- `mark_my_notification_read(...)`
- `mark_all_my_notifications_read()`
- `get_admin_notification_audit(...)`

## Frontend Surface
Main pieces:

- `src/components/NotificationCenter.tsx`
- `src/components/NotificationBanner.tsx`
- `src/services/notifications.ts`

Admin integration:

- `src/pages/AdminUsers.tsx`

## Templates
Initial reminder templates:

- `complete_profile`
- `resolve_onboarding`
- `log_first_activity`

They are defined in `src/services/notifications.ts`.

## Future-safe Base
The schema already leaves room for:

- general announcements
- richer notification metadata
- future notification categories
- read-state analytics
- additional sender types beyond admins

## Guardrails
- this is in-app only for now
- no email or push delivery yet
- do not store secrets or sensitive free-text payloads inside notification metadata
