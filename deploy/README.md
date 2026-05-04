# Deployment Guide

This folder contains the self-hosting and production deployment assets for `C404-blog`.

## What Is Here

- `deploy.sh`: one-shot deployment script
- `DEPLOYMENT.md`: longer production guide
- `ENV_SETUP_GUIDE.md`: environment and secret setup notes
- `nginx/`: reverse-proxy configs
- `systemd/`: backend service unit files
- `scripts/`: backup, restore, health-check, and hardening helpers

## Recommended Build Flow

1. Install the repo dependencies from the project root.
2. Build the application with `pnpm build`.
3. Build the desktop shell separately if you need a native app with `pnpm tauri:build`.
4. Copy or deploy the frontend output, backend binary, and AI service runtime according to your environment.

## Service Paths

The current repo layout is:

- Backend: `apps/backend`
- Frontend: `apps/frontend`
- AI service: `apps/ai-service`
- Desktop shell: `apps/desktop`

The production documentation and scripts should use those paths, not older flat-layout references.

## Common Commands

Backend rebuild:

```bash
cd apps/backend
go build -o bin/server main.go
```

Frontend rebuild:

```bash
pnpm -C apps/frontend build
```

AI service restart:

```bash
cd apps/ai-service
uv sync
uv run python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Environment Notes

- Backend secrets live in `apps/backend/.env`
- AI service settings live in `apps/ai-service/.env`
- Keep generated databases, caches, logs, and uploads out of version control
- Remove any historical secrets from git before publishing a production deployment

## Next Reads

- `deploy/DEPLOYMENT.md`
- `deploy/ENV_SETUP_GUIDE.md`

