# @repo/web — Syncro v1

The Syncro v1 app lives here. Full documentation (architecture, diagrams, API, limitations) is in the **[root README](../../README.md)**.

## Quick start

```bash
cp .env.example .env.local   # add OPENAI_API_KEY
npm run dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Workspace: [http://localhost:3000/workspace](http://localhost:3000/workspace)

## CLI tests

```bash
npm run test:agent      # full agent run (headed browser)
npm run test:computer   # screenshot smoke test
```
