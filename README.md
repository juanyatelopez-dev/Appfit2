# AppFit

AppFit is a fitness tracking single-page application built with React, TypeScript, Vite, and Supabase. The app covers authentication, onboarding, dashboard tracking, water, sleep, body metrics, nutrition, training, and profile management.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix UI
- React Query
- Supabase
- Vitest
- Docker + Nginx
- Dokploy

## Local Development

Requirements:

- Node.js 20+
- npm

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Environment Variables

The frontend expects these variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use `.env.example` as the reference template. Do not commit real secret values.

## Deployment

The app is deployed as a static bundle behind Nginx using the included `Dockerfile` and `nginx.conf`.

Current deployment assumptions:

- build via Dokploy
- SPA fallback handled by Nginx
- Vite variables must be present at build time

See:

- `docs/DEPLOYMENT.md`
- `docs/COMMANDS.md`
- `docs/SERVER_OPERATIONS.md`

## Engineering Docs

The repo includes agent-oriented documentation in `docs/`:

- `ENGINEERING_RUNBOOK.md`
- `ARCHITECTURE.md`
- `DEPLOYMENT.md`
- `COMMANDS.md`
- `KNOWN_BUGS.md`
- `SERVER_OPERATIONS.md`
- `SCAN_PROJECT_REPORT.md`

## Current Priorities

Based on the current repo scan:

1. protect secrets and repo hygiene
2. consolidate Supabase access
3. refactor auth and training incrementally
4. improve test coverage on critical flows
