# Engineering Runbook

## Overview

AppFit is a React + TypeScript single-page application built with Vite and deployed as a static bundle behind Nginx. The app uses Supabase for authentication, storage, and application data. It includes guest-mode fallbacks for some modules and mixes UI-driven pages with service-layer data access.

## Current Stack

- Frontend: React 18, TypeScript, Vite 5
- Routing: `react-router-dom`
- State/data fetching: React Query
- UI: Tailwind CSS, shadcn/ui, Radix UI
- Backend platform: Supabase
- Storage: Supabase Storage (`avatars`)
- Testing: Vitest, Testing Library
- Deployment: Dockerfile + Nginx SPA fallback, currently deployed through Dokploy

## Runtime Dependencies

Required environment variables detected in the repo:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Notes:

- Do not commit real values.
- For builds in Dokploy, these variables must exist in build-time arguments, not only runtime environment settings.
- The frontend uses `VITE_SUPABASE_PUBLISHABLE_KEY`; `service_role` must never be exposed to the browser.

## Repository Shape

- `src/pages`: route-level screens
- `src/components`: reusable UI and dashboard modules
- `src/context`: auth and preferences providers
- `src/services`: Supabase access and domain operations
- `src/features`: pure helpers and domain-specific calculations
- `src/routes`: route guards and route definitions
- `src/layouts`: shared app layout
- `supabase/*.sql`: schema and migration-like SQL scripts maintained in-repo
- `supabase/config.toml`: local Supabase project metadata

## Working Agreements

- Keep business logic out of page components when it can live in `services`, `features`, or hooks.
- Prefer explicit service functions over direct Supabase queries scattered through the UI.
- Add tests for pure domain logic and service helpers when behavior changes.
- Treat secrets handling as a first-class engineering concern.
- Avoid creating a second source of truth for Supabase clients; standardize on one exported client.

## Known Structural Risks

- Documentation baseline was missing; most agent prompts depend on docs that did not exist.
- There are multiple Supabase client entry points:
  - `src/services/supabaseClient.ts`
  - `src/services/supabase/client.ts`
  - `src/integrations/supabase/client.ts`
- Large page/service files suggest mixed responsibilities, especially in training and auth flows.
- `.env` exists in the repo root. Its values were not copied into docs, but presence alone requires care to ensure it is ignored and not leaked.
- The default `README.md` still contains Lovable boilerplate and does not reflect actual operations.

## Recommended Delivery Flow

For meaningful changes, use this order:

1. Architecture review for scope and boundaries
2. Backend/service changes
3. Frontend integration
4. QA/test updates
5. Refactor pass if the change increased coupling
6. Security review for auth, secrets, and deployment impact

## Active Initiative: Dashboard Restructure Phase 1

- Initiative doc: `docs/DASHBOARD_RESTRUCTURE_PHASE1.md`
- Target screen: `/today`
- Scope: structure and interaction only (no theme redesign)
- Execution order: Architecture -> Frontend -> QA
- Constraint: preserve behavior parity while reducing orchestration coupling in dashboard composition

## Release Checklist

Before deployment:

1. Verify `VITE_*` build arguments are present
2. Run `npm test`
3. Run `npm run build`
4. Confirm no placeholders remain in the built bundle
5. Confirm SPA routes resolve through Nginx fallback
6. Smoke-test `/auth` and `/today`
7. Validate Supabase Site URL and Redirect URLs

## Incident Notes

Recent production incident pattern observed:

- App deployed successfully but browser still used old cached assets
- Result: stale bundle or stale auth behavior in the browser
- Fast mitigation: hard refresh or clear browser cache
- Structural mitigation: clearer cache headers strategy and post-deploy smoke checks
