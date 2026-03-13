# Commands

## Local Development

Install dependencies:

```powershell
npm install
```

Start dev server:

```powershell
npm run dev
```

Build production bundle:

```powershell
npm run build
```

Preview production build locally:

```powershell
npm run preview
```

Run tests:

```powershell
npm test
```

Run tests in watch mode:

```powershell
npm run test:watch
```

Run lint:

```powershell
npm run lint
```

## Repository Inspection

Show package manifest:

```powershell
$i=1; Get-Content package.json | ForEach-Object { '{0,4}: {1}' -f $i, $_; $i++ }
```

Search for Supabase usage:

```powershell
rg -n "createClient|VITE_SUPABASE|rpc\\(|from\\(" src
```

List tests:

```powershell
rg -n "describe\\(|it\\(|test\\(" src --glob "*.test.ts" --glob "*.test.tsx"
```

## Deployment Validation

Fetch deployed HTML:

```powershell
Invoke-WebRequest -UseBasicParsing 'http://appfit-test-yrrcmo-cf0564-45-33-74-166.traefik.me/' | Select-Object -ExpandProperty Content
```

Fetch deployed auth route:

```powershell
(Invoke-WebRequest -UseBasicParsing 'http://appfit-test-yrrcmo-cf0564-45-33-74-166.traefik.me/auth').StatusCode
```

Check whether a bundle still contains placeholders:

```powershell
$js = Invoke-WebRequest -UseBasicParsing 'http://<DEPLOYED_HOST>/assets/<BUNDLE>.js' | Select-Object -ExpandProperty Content
@(
  'HAS_PLACEHOLDER_URL=' + [bool]($js -match 'placeholder\.supabase\.co'),
  'HAS_REAL_URL=' + [bool]($js -match '<SUPABASE_PROJECT>\.supabase\.co')
)
```

## Supabase Validation

Check local Supabase project metadata:

```powershell
Get-Content supabase\config.toml
```

List env var names without printing values:

```powershell
Get-Content .env | ForEach-Object { if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }; ($_ -split '=',2)[0] }
```

## Manual Smoke Test

1. Load `/`
2. Load `/auth`
3. Login with a known test account
4. Register a new test account
5. If email confirmation is enabled, verify delivery and redirect
6. Open `/today`
7. Navigate to water, sleep, nutrition, training, and settings

## Safety Notes

- Never print real secret values into logs or docs
- Never run destructive git commands for cleanup without explicit approval
- Never use `service_role` in the browser
