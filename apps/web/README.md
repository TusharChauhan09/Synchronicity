# @repo/web

Next.js frontend for Synchronicity. API requests go to `/api/*`, which Next rewrites to the Express server in `apps/api`.

## Quick start

From the repo root:

```bash
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Workspace: [http://localhost:3000/workspace](http://localhost:3000/workspace)

The API runs separately on port 4000 (`npm run dev` starts both via Turbo).
