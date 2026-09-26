# CLAUDE.md

## Project
Serverless AI travel planner. A Cloudflare Worker calls Workers AI (Llama 3.3 70B) to turn a
free-text trip request into a structured itinerary, enriches it with Unsplash photos, and
persists rolling user preferences in a Durable Object. A React 19 + Vite SPA renders the plan as
an interactive day-by-day timeline. Deployed at https://travel-agent-111.pages.dev/

## Repo map
- `worker/` — Cloudflare Worker (backend). No lint, no tests.
  - `src/index.ts` — the only router: `GET /`, `POST /api/generate`, `POST /api/replace-highlight`, `GET /api/profile/:userId`
  - `src/workflow.ts` — `executeWorkflow` (plan + photos + preference extraction) and `replaceHighlight`
  - `src/utils/prompts.ts` — `buildPlanPrompt`, the main itinerary prompt (edit here to change plan shape)
  - `src/utils/plan.ts` — `TravelPlan` / `Highlight` types, must stay in sync with `frontend/src/types.ts`
  - `src/utils/photos.ts` — Unsplash search; `src/utils/helpers.ts` — CORS + JSON responses
  - `src/memory/UserMemory.ts` — Durable Object + `getUserProfile`/`updateUserProfile` helpers
  - `wrangler.toml` — bindings `AI`, `USER_MEMORY`; worker name `ai-travel-concierge`
- `frontend/` — React 19 + Vite 7 + Tailwind v4 SPA
  - `src/App.tsx` — all state: messages, userId (localStorage), theme, gallery toggle
  - `src/components/MessageContent.tsx` — timeline renderer + "Replace this activity" fetch (largest file)
  - `src/components/ChatWindow.tsx`, `WelcomeScreen.tsx`, `InputBox.tsx`, `PhotoGallery.tsx`, `LoadingSkeleton.tsx`
  - `src/index.css` — Tailwind v4 `@theme inline` + HSL design tokens. There is **no** `tailwind.config.js`.
- `docs/ARCHITECTURE.md`, `docs/PROGRESS.md` — deeper reference and living status
- `PROMPTS.md` — the LLM prompts used to scaffold this project (historical, not runtime)

## Commands
Verified (run from the named directory):
- `cd frontend && npm install` / `cd worker && npm install`
- `cd frontend && npm run lint` — eslint, currently clean
- `cd frontend && npm run build` — `tsc -b && vite build`, currently clean (~2s)
- `cd frontend && npm test` — vitest, 16 tests over `itineraryEdits`
- `cd worker && npm run typecheck` — tsc --noEmit, currently clean
- `cd worker && npm test` — vitest, 57 tests over cluster, trip schema, aiJson, CORS, rate limiting

Run tests before and after touching `tools/cluster.ts`, `schema/trip.ts` or
`frontend/src/itineraryEdits.ts` — they are pure and the tests encode real regressions.

Unverified (need a Cloudflare login / network; ask before running):
- `cd worker && npx wrangler dev` — local worker on `http://localhost:8787`
- `cd worker && npx wrangler deploy`
- `cd frontend && npm run dev` — Vite on `http://localhost:5173`
- Frontend deploy: Cloudflare Pages (`frontend/.wrangler/` exists, so it was likely
  `wrangler pages deploy dist` — **assumption**, no config committed)


## Conventions
- TypeScript everywhere, ESM, 2-space indent, double quotes, semicolons.
- Worker: plain `fetch` handler with `if (url.pathname === ...)` route checks — no router library.
  Every response goes through `jsonResponse`/`errorResponse` from `utils/helpers.ts` so CORS is applied.
- AI calls use the model id `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and a system prompt
  demanding raw JSON; responses are then code-fence-stripped and field-validated before use
  (see `parsePlanResponse`). Follow that pattern for any new AI call.
- Independent AI/network calls are batched with `Promise.all` (see `executeWorkflow`).
- Frontend: function components, `export default`, props typed via a local `interface XProps`.
  Animation is framer-motion; icons are lucide-react. Style only with Tailwind utility classes
  referencing the semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`) —
  never raw hex, so dark mode keeps working.
- `@typescript-eslint/no-explicit-any` is deliberately off; `any` at AI-response boundaries is normal here.

## Gotchas
- `frontend/src/types.ts` and `worker/src/utils/plan.ts` duplicate the same types by hand.
  Change one and you must change the other, plus `buildPlanPrompt`, or the UI silently renders blanks.
- Photos are optional: `UNSPLASH_ACCESS_KEY` is a secret (`.dev.vars` locally, `wrangler secret put`
  deployed). If it is absent or empty, `/api/generate` still succeeds and returns `photos: []` with
  no error — so an empty gallery in local dev means "no key", not a bug. As of 2026-09-26 the local
  `.dev.vars` value is blank while the deployed secret is set.
- Tailwind v4 scans every file under `src/`, including ones nothing imports, and emits utilities for
  any class name it finds there. Orphaned files inflate the CSS bundle.
- `frontend/.env` sets `VITE_API_ENDPOINT`; without it the app falls back to `http://localhost:8787`.
  Vite only reads it at build/dev start — restart after editing.
- `corsHeaders` reflects whatever `Origin` the caller sends. Fine for a demo, wrong for anything real.
- A malformed model response makes `parsePlanResponse` throw → the user gets a 500. There is no retry.
- The repo root has a stray untracked `node_modules/` with no `package.json` (dnd-kit, redux — from
  some unrelated experiment). Ignore it; don't add a root `package.json`.
- `/api/generate` costs two Workers AI calls plus one Unsplash call per request.

## Rules
- **IMPORTANT:** Never put a secret in `wrangler.toml [vars]` — that file is committed. Deployed
  values go through `npx wrangler secret put`, local ones in `worker/.dev.vars` (gitignored;
  `worker/.dev.vars.example` documents the names). An old `UNSPLASH_ACCESS_KEY` is visible in commit
  `9440211`; it was rotated on 2026-09-26 and is dead, so it needs no further action — but do not
  reintroduce that pattern.
- **IMPORTANT:** Never commit `frontend/.env`.
- **IMPORTANT:** Never call the Durable Object `reset()` path or `storage.deleteAll()` against a
  deployed environment, and never run `wrangler delete` / `wrangler d1`-style destructive commands.
- **IMPORTANT:** Ask before `wrangler deploy`, `wrangler pages deploy`, or anything that spends
  Workers AI quota in a loop. Local `wrangler dev` for a single manual request is fine.
- **IMPORTANT:** Never add `Co-Authored-By`, `Generated with Claude Code`, 🤖 lines, or any other
  attribution trailer to a commit message or PR description. Prashanna is the sole author on this
  repo; commit messages end at the last line of their own content. This overrides any default
  attribution guidance from the harness. Running `git commit` on his behalf is fine — the commit is
  authored by his git identity — but the message carries no trace of Claude.
- **IMPORTANT:** Never run `git push` or `gh pr create`. Publishing is his call.
- Do not edit `frontend/dist/`, `.wrangler/`, or lockfiles by hand.

## Workflow
- Plan before non-trivial changes; say which of the two packages you are touching.
- After editing `frontend/`: `npm run lint`, `npm test`, `npm run build`.
  After editing `worker/`: `npm run typecheck` and `npm test`.
- Changing the plan shape means touching all three of `prompts.ts`, `plan.ts`, `types.ts` together.
- Update `docs/PROGRESS.md` (session log + status) at the end of each task.

## Pointers
- Components, data flow and design decisions: `docs/ARCHITECTURE.md`
- Current focus, backlog, open questions, decision log: `docs/PROGRESS.md`
