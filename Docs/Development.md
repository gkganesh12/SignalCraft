# Development Guide

## Local setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure environment
   ```bash
   cp .env.example .env
   ```

3. Start services
   ```bash
   docker compose up -d
   ```

4. Run migrations + seed
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start apps
   ```bash
   npm run dev
   ```

## Common tasks

- Start API only: `npm run dev:api`
- Start web only: `npm run dev:web`
- Start DB services only: `npm run dev:db`
- Run tests: `npm run test`
- Build all: `npm run build`

## Troubleshooting

- DB connection errors: verify `DATABASE_URL` and that Postgres is running.
- Auth errors: confirm Clerk keys in `.env` and the frontend publishable key.
- Redis errors: verify `REDIS_URL` and that Redis container is up.

## Sentry webhook testing

```bash
WORKSPACE_ID=your_workspace_id scripts/send-sentry-webhook.sh
```
