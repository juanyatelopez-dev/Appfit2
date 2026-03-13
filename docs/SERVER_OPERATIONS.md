# Server Operations

## Scope

This project is currently operated as a frontend container served through Nginx in Dokploy. Base infrastructure assumptions from the agent prompts remain relevant, but current repo evidence is strongest for the Docker + Nginx + Dokploy path.

## Active Runtime Model

- containerized frontend
- Nginx serving static assets
- Dokploy orchestrating builds and deploys
- temporary public domain routed through Dokploy/Traefik

## Operational Checks

If a deployment is unhealthy, validate in this order:

1. confirm Dokploy build completed
2. confirm the deployed HTML responds with `200`
3. confirm `/auth` responds with `200`
4. confirm the active JS bundle contains the expected Supabase URL
5. confirm browser cache is not masking the latest deploy

## Linux / Nginx / Docker Commands

These commands are relevant when operating directly on the host rather than only through Dokploy.

List containers:

```bash
docker ps
```

Inspect container logs:

```bash
docker logs <container_name>
```

Check listening ports:

```bash
ss -tulpn
```

Validate Nginx config:

```bash
nginx -t
```

Check Nginx service:

```bash
systemctl status nginx
```

Check recent logs:

```bash
journalctl -u nginx -n 200 --no-pager
```

## Common Failure Modes

### SPA routes return 404

Probable cause:

- missing SPA fallback in Nginx

### Auth fails after apparently successful redeploy

Probable causes:

- Vite build args missing in Dokploy
- old build cache reused
- browser cache serving stale bundle

### Email verification flow works inconsistently

Probable causes:

- malformed redirect URL in Supabase
- built-in Supabase email service rate limits
- missing custom SMTP

## Operational Recommendations

- keep a stable smoke-test checklist after every deployment
- record deployed bundle hash during incidents
- move email delivery off the built-in Supabase service before production launch
- standardize final domain and HTTPS before broad rollout
