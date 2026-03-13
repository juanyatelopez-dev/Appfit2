# Architecture

## System Summary

AppFit is a client-heavy fitness tracking SPA. The browser is responsible for rendering the full app, managing route transitions, initiating auth with Supabase, and reading/writing most application data through a service layer that wraps Supabase operations.

## High-Level Architecture

### Frontend

- `src/App.tsx` wires providers and the router
- `src/routes/AppRoutes.tsx` defines public, protected, and onboarding-gated routes
- `src/layouts/MainLayout.tsx` renders the shared authenticated shell
- `src/pages/*` hold route-level screens
- `src/components/*` hold reusable UI and dashboard modules

### Data Access

- Supabase is the primary backend
- The main client currently used by auth and services is `src/services/supabaseClient.ts`
- Service modules in `src/services/*` encapsulate CRUD, RPC calls, and storage access
- `src/features/*` contain pure calculations and domain helpers

### Auth

- `src/context/AuthContext.tsx` owns session initialization, sign in, sign up, sign out, onboarding state, guest mode, profile sync, and avatar uploads
- Protected access is enforced through route guards:
  - `ProtectedRoute`
  - `RequireOnboarding`

### Deployment

- Vite builds static assets
- Docker multi-stage build compiles the app and serves it via Nginx
- `nginx.conf` provides SPA fallback for client-side routes
- Dokploy is used as the current deployment platform

## Main Domains

Detected application domains:

- Authentication and onboarding
- Dashboard aggregation
- Profile and goals
- Weight and body measurements
- Water and sleep
- Daily biofeedback and notes
- Nutrition
- Training and workout scheduling
- Settings and data reset flows

## Data Flow

1. User loads SPA from Nginx
2. React initializes providers
3. Auth context calls Supabase to resolve session
4. Route guards decide access
5. Pages/hooks request module data through service functions
6. Services call Supabase tables, storage, or RPC functions
7. UI renders module states and mutations

## Patterns In Use

- Layered frontend structure:
  - pages
  - components
  - hooks
  - services
  - features
- Context-based auth/session management
- Query-based server-state fetching with React Query
- Utility-heavy domain calculation modules for some features

## Architecture Gaps

### 1. Multiple Supabase clients

There are duplicate client definitions under `services`, `services/supabase`, and `integrations/supabase`. This increases the chance of configuration drift and inconsistent usage.

Recommendation:

- Keep one canonical client module
- Convert the others into thin re-exports or remove them

### 2. Large orchestration files

Examples:

- `src/context/AuthContext.tsx`
- `src/services/training.ts`
- `src/hooks/useDashboardData.ts`

These files combine validation, orchestration, storage, and UI-facing shaping. They are likely to become maintenance hotspots.

Recommendation:

- Split by domain responsibility
- Extract validators, mappers, guest-mode adapters, and RPC calls into smaller modules

### 3. Docs and ops knowledge were implicit

The repo previously lacked the documents expected by the agent prompts, which made architectural reasoning depend on ad hoc repo scanning.

Recommendation:

- Keep the docs in `docs/` up to date whenever deployment, auth, or data contracts change

## Recommended Target Structure

This is the direction that best matches the prompts you collected:

- `src/app`
  - providers
  - router
  - layouts
- `src/modules`
  - `auth`
  - `dashboard`
  - `nutrition`
  - `training`
  - `recovery`
  - `profile`
- Each module should own:
  - components
  - hooks
  - services
  - validators
  - types
  - tests
- `src/shared`
  - ui
  - lib
  - theme
  - infra

This does not need a big-bang rewrite. It should be applied incrementally when touching a module.

## Security Considerations

- Never expose service-role credentials in the frontend
- Keep all `VITE_*` values public-only
- Review `.env` hygiene regularly
- Treat SMTP, admin tokens, and future server-side secrets as backend-only concerns

## Observability Gaps

Current repo evidence suggests limited operational observability.

Recommended additions:

- structured error logging strategy
- release/version tagging in the frontend
- post-deploy smoke checks
- a known-bugs log tied to fixes

## Architectural Recommendation

Use the agent prompts in this order for substantial changes:

1. `cto_agent`
2. `architecture_agent`
3. feature-specific agent (`frontend_agent`, `backend_agent`, or `devops_agent`)
4. `qa_agent`
5. `refactor_agent`
6. `cybersecurity_agent`
