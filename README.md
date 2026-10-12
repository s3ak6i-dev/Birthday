# Dr. Chandra's Waiting Room

A private, two-player, doctor-themed game site - a long-distance birthday
gift. **The full design lives in [`masterdoc.md`](./masterdoc.md)**; this
README only covers the repo layout and how to run things locally.
`masterspec.md` is an earlier, superseded draft kept for reference (see its
note at the top).

Don't test live two-player sessions with real content on Lakshmi's own
accounts/devices - see masterdoc.md section 10.4.

## Layout

```
apps/
  web/          React + TS + Vite front end (deploys to Vercel)
  rooms/        Cloudflare Worker, partyserver rooms (Durable Objects)
packages/
  shared/       Game engines, types, XP/rank config, room message types
  content/      JSON content packs + Zod schemas + validation script
  ui/           Shared pixel-UI component library (design tokens, palette)
scenes/         .ink story source files
art/            Source and exported pixel art, locked palette
supabase/       Database migrations (schema + RLS)
scripts/        One-off helpers (seed accounts, art cleanup)
TODO.md         The working backlog - see masterdoc.md section 7 for the full plan
```

## Getting started

```sh
npm install

# Front end (apps/web/.env.example -> apps/web/.env.local first)
npm run dev:web

# Rooms worker (apps/rooms/.dev.vars.example -> apps/rooms/.dev.vars first)
npm run dev:rooms

# Validate every content pack against its schema
npm run validate-content
```

Supabase project setup, migrations, and the two seed accounts are covered in
masterdoc.md sections 4.4-4.5 and `scripts/seed-accounts.ts`.
