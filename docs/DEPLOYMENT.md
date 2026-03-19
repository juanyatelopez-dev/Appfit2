# Deployment

## Current Deployment Model

AppFit is deployed as a static Vite build served by Nginx inside a Docker image. Dokploy is the current deployment platform.

## Build Inputs

Build-time variables required by Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Important:

- These must be present at build time in Dokploy.
- Runtime-only environment variables are not enough for a Vite frontend.

## Docker Strategy

`Dockerfile` is a multi-stage build:

1. `node:20-alpine` builder
2. install dependencies with `npm install`
3. run `npm run build`
4. copy `dist/` into `nginx:1.27-alpine`

## Nginx Strategy

`nginx.conf` implements SPA routing:

- `/assets/*` must exist physically
- all other paths fall back to `/index.html`

This is required for routes like:

- `/auth`
- `/today`
- `/training`

## Dokploy Notes

Known-good base settings:

- Build Type: `Dockerfile`
- Docker File: `/Dockerfile`
- Docker Context Path: `/`

Recommended operational settings:

- set `VITE_*` values in Build-time Arguments
- rebuild after any environment change
- prefer rebuild without cache when diagnosing stale bundles

## Supabase Auth URLs

When using the current temporary HTTP domain, keep Supabase Auth configured with absolute URLs.

Recommended values while the temporary domain remains in use:

- Site URL:
  - `http://appfit-test-yrrcmo-cf0564-45-33-74-166.traefik.me`
- Redirect URLs:
  - `http://appfit-test-yrrcmo-cf0564-45-33-74-166.traefik.me`
  - `http://appfit-test-yrrcmo-cf0564-45-33-74-166.traefik.me/auth`

Important:

- redirect URLs must include the scheme (`http://` or `https://`)
- malformed redirect values can break post-email verification flows

## Post-Deploy Verification

After each redeploy:

1. Open `/`
2. Open `/auth`
3. Open `/today`
4. Inspect the served HTML and confirm the JS asset changed if a rebuild was expected
5. Confirm the active bundle contains the real Supabase URL and not placeholders
6. Test login
7. Test registration
8. If email confirmation is enabled, validate the full email flow

## Current Deployment Risks

- Browser cache can preserve old bundles after redeploys
- Dokploy cache can preserve an old build if not rebuilt properly
- Built-in Supabase email delivery is not reliable for production use

## Production Hardening Recommendations

- move to HTTPS on the final domain
- configure custom SMTP for email confirmation
- define a repeatable smoke-test checklist
- consider adding cache headers explicitly for HTML vs hashed assets

## Dashboard Phase 1 Deployment Notes

Reference: `docs/DASHBOARD_RESTRUCTURE_PHASE1.md`

- No infrastructure or schema change expected by default.
- Validate `/today` rendering in mobile/tablet/desktop after deploy.
- Include smoke test for widget/module preference persistence.
- Monitor frontend errors and primary CTA interaction drop after release.
