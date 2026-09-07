# Synchronicity

Browser automation SaaS: marketing site + a live agent-driven browser workspace.

Phase 1 is a **minimal demo** inside `apps/web`. This repo is the target layout for later scale.

## Layout

```
apps/
  web/                 Next.js — landing + dashboard/workspace
  ws-service/          WebSocket streaming (later)
  worker/              Isolated Playwright sessions (later)
packages/
  db/                  Prisma + Postgres
  types/               Shared TypeScript types
  ui/                  Shared UI
  eslint-config/
  typescript-config/
docker/
  docker-compose.yml   Local Postgres + Redis
```

## Setup

```sh
npm install
cp .env.example .env
cp packages/db/.env.example packages/db/.env
npm run docker:up
npm run db:generate
```

## Develop (v1 demo)

```sh
npm install
npm run playwright:install -w web
cp apps/web/.env.example apps/web/.env.local
# put your OPENAI_API_KEY in apps/web/.env.local
npm run dev -- --filter=web
```

Open http://localhost:3000 then **Open workspace**. Try: go to `http://localhost:3000/demo-login` and sign in.
