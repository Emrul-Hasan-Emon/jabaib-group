# Deployment

Two deployables: `server/` (NestJS API + Postgres) and `web/` (Next.js admin + storefront).
They are independent processes — the API has no knowledge of where the web app is hosted
beyond `CORS_ORIGINS`.

## Environment separation (dev / staging / prod)

Both apps read config from environment variables (`.env` locally; real env vars in every
other environment — never commit `.env`). Keep one value set per environment:

| Var | dev | staging | prod |
|---|---|---|---|
| `server`: `DB_HOST`/`DB_DATABASE` | local Postgres | staging Postgres instance | prod Postgres instance (managed, backed up — see `BACKUP_RESTORE.md`) |
| `server`: `JWT_SECRET` | any value | unique random secret | unique random secret, rotated independently of staging |
| `server`: `CORS_ORIGINS` | unset (reflects any origin) | `https://staging.jabaib.com` | `https://jabaib.com,https://admin.jabaib.com` |
| `server`: `PAYMENT_CALLBACK_SECRET` | unset (check skipped) | staging gateway secret | live gateway secret |
| `server`: `LOCAL_UPLOAD_DIR` | `./uploads` | persistent volume path | persistent volume path (or swap for S3-backed storage later) |
| `web`: `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | `https://api-staging.jabaib.com` | `https://api.jabaib.com` |
| `web`: `NEXT_PUBLIC_SITE_URL` | `http://localhost:3011` | `https://staging.jabaib.com` | `https://jabaib.com` |

Never point a staging web build at the prod API or vice versa — `NEXT_PUBLIC_*` vars are
baked into the build at `next build` time, not read at runtime, so a wrong value means a
rebuild + redeploy to fix, not a config change.

## Server (`server/`)

Two supported paths — pick one per environment, don't mix.

### Option A — Docker

```bash
docker build -t jabaib-api .
docker run -d --name jabaib-api \
  --env-file .env \
  -p 3000:3000 \
  -v jabaib-uploads:/app/uploads \
  jabaib-api
```

The `Dockerfile` is a two-stage build (`npm ci && npm run build`, then a `--omit=dev`
runtime image) — it does not run migrations. Run them as a one-off against the same
`--env-file` before starting the container (or as a deploy-pipeline step):

```bash
docker run --rm --env-file .env jabaib-api npm run migration:run
```

`uploads/` is a named volume — losing it loses every uploaded image. Back it up alongside
the database (see `BACKUP_RESTORE.md`).

### Option B — PM2 (single box, no containers)

```bash
npm ci
npm run build
npm run migration:run
pm2 start ecosystem.config.js
pm2 save          # survive a reboot
```

`ecosystem.config.js` runs `dist/main.js` in fork mode (the app holds one DB connection
pool and isn't built for the cluster module's multi-process model). Logs land in
`server/logs/`.

### Either way

- Run `npm run seed` once against a fresh database (creates the default country/divisions/
  districts/shipping zones/languages/super-admin — override `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Put a reverse proxy (nginx/Caddy) in front for TLS; the app itself speaks plain HTTP.
- Swagger is served at `/api/docs` — keep that path internal-only or behind auth in prod.

## Web (`web/`)

### Option A — Vercel

Point a Vercel project at `web/` as the root directory, set `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_SITE_URL` in the project's environment variables (per-environment: Production/
Preview/Development), and deploy. No further config — `next build` / `next start` are
Vercel's defaults.

### Option B — Node server (self-hosted, e.g. alongside the API)

```bash
npm ci
npm run build
npm run start   # next start, reads PORT (default 3000 — don't collide with the API)
```

Run this under PM2 or Docker the same way as the server if self-hosting; Vercel is simpler
and is the default recommendation unless there's a reason to keep everything on one box.

## Rollout order

1. Run new migrations against the target DB (`npm run migration:run` in `server/`).
2. Deploy the API, confirm `GET /` returns 200 and `/api/docs` loads.
3. Deploy the web app pointed at that API.
4. Smoke-test: admin login, storefront home, one product page, `/sitemap.xml`, `/robots.txt`.
