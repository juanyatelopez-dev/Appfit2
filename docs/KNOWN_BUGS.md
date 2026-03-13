# Known Bugs

## Bug

`.env` in repo root is not ignored by `.gitignore`.

## Contexto

The repository contains a root `.env` file, but `.gitignore` does not include `.env` or `.env.*` ignore rules.

## Stack involucrado

- Git
- local environment management
- Supabase frontend configuration

## Sintomas

- local secrets can be accidentally staged or committed
- developers may assume `.env` is protected when it is not

## Causa raiz

Missing ignore rules for environment files.

## Solucion

- add `.env` and environment variants to `.gitignore`
- if any secret values were ever committed, rotate them and remove them from history if needed
- keep only `.env.example` with variable names, never real values

## Comandos utiles

```powershell
git status --short
```

## Prevencion

- standardize on `.env.example`
- review secrets hygiene during every security pass
- treat committed credentials as a security incident

---

## Bug

Stale frontend bundle after redeploy can preserve outdated auth configuration in the browser.

## Contexto

The app was redeployed successfully with corrected Vite build variables, but the browser continued using cached assets/state from a previous build.

## Stack involucrado

- Vite
- Nginx
- Dokploy
- Browser cache
- Supabase Auth

## Sintomas

- login or signup behavior does not match the latest deployment
- user sees stale errors such as `Failed to fetch`
- production HTML or bundle changed remotely, but the local browser behavior does not

## Causa raiz

The deployment was updated, but the client still served cached frontend assets or stale local browser state.

## Solucion

- perform hard refresh
- clear browser cache for the domain
- re-open in incognito to confirm latest bundle behavior
- for operations, include a post-deploy smoke test in a clean browser session

## Comandos utiles

```powershell
Invoke-WebRequest -UseBasicParsing 'http://<DEPLOYED_HOST>/' | Select-Object -ExpandProperty Content
```

## Prevencion

- use explicit post-deploy validation
- consider better HTML cache-control behavior
- communicate that environment-variable changes require both rebuild and browser refresh

---

## Bug

Email confirmation can appear functional in the app while actual email delivery remains unreliable with built-in Supabase mail service.

## Contexto

User registration succeeds and the app correctly shows that email confirmation is enabled, but the confirmation email may not arrive consistently.

## Stack involucrado

- Supabase Auth
- built-in Supabase email service
- browser frontend

## Sintomas

- signup returns confirmation-required flow
- user exists or signup succeeds
- confirmation email does not arrive or arrives inconsistently

## Causa raiz

Built-in Supabase email is rate-limited and not intended for production reliability.

## Solucion

- configure a custom SMTP provider
- reduce repeated rapid-fire test signups
- test with fresh emails and inspect spam

## Comandos utiles

No local command is sufficient; verify through Supabase dashboard and SMTP provider configuration.

## Prevencion

- configure custom SMTP before production rollout
- document auth email behavior and test cases
