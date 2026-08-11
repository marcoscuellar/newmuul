# OLLIN : MUUL — The Gatherer

Post like you mean it. LinkedIn content engine — content = pipeline, never vanity.

Built from `MUUL-HANDOFF.md`. Next.js 14 · TypeScript · zero UI dependencies.

## Run it locally

```bash
npm install
cp .env.local.example .env.local   # add your Anthropic API key (optional)
npm run dev                        # http://localhost:3000
```

Without a key, OLLIN:AI falls back to copy-prompt mode (packs your context + question to the clipboard for pasting into Claude). With `ANTHROPIC_API_KEY` set, it answers inline — the key stays server-side, never in the browser.

## Push to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/muul.git
git push -u origin main
```

## Deploy (Vercel, ~5 minutes, free)

1. Go to vercel.com → Add New Project → import the GitHub repo.
2. In Project Settings → Environment Variables, add `ANTHROPIC_API_KEY`.
3. Deploy. Done — MUUL is live on your own URL, on every device.

## What's inside

- **One editorial page** — hero + sections 00–05 (Today's Run, Foundation, Mix, Batch Studio, Engage, Scoreboard)
- **OLLIN:AI companion** — the Ollin guide pattern ("Ask OLLIN:AI" pill), context-aware: knows your ICP, drafts, mix, and streak; replies save straight into Batch as drafts
- **Real streak** — counts consecutive Chicago-timezone days with a posted entry
- **Auto-reset** — Today's Run clears itself at midnight America/Chicago
- **Persistence** — everything saves to the browser (localStorage) as you type; Export/Import JSON for backup
- **Brand rules enforced** — OLLIN base + volt accent, Archivo 900 / IBM Plex Mono, no emojis, all text ≥ 4.9:1 contrast

## Salvaged from the original Múul repo

- **`lib/prompts.ts`** — Marcos's voice PERSONA (prepended to every OLLIN:AI call) + the prompt library: post writer, idea generator, Friday recap, content calendar, draft grader, comment drafter, strategist analysis.
- **PWA** — `public/` icons + manifest: install MUUL on a phone home screen from the deployed URL (Share → Add to Home Screen).
- **`supabase/schema.sql`** — per-user cloud storage schema with RLS, ready for when multi-device sync is wanted: create a Supabase project, run the schema, then wire `@supabase/supabase-js` (the original repo's `src/lib/cloud.js` + `AuthGate.jsx` are the reference implementation).

## Structure

```
app/
  layout.tsx          fonts + metadata
  globals.css         full design system (tokens in :root)
  page.tsx
  api/ollin/route.ts  server route → Anthropic (claude-sonnet-4-5)
components/
  Muul.tsx            the whole app UI
lib/
  state.ts            types, persistence, streak/mix logic, AI context builder
```
