# Progress

Living status file. Newest session log entry goes on top.

## Current focus
**Phase 0 in progress on branch `v2` — see `docs/PLAN-v2.md`.** The project is becoming a grounded multi-agent
travel workspace rather than a chat app. Decisions locked: all Workers AI (zero marginal cost),
keyless data sources only, evolve the existing worker on a `v2` branch, MapLibre + OSM for maps.
Phase 0 has landed the pattern: `schema/`, `tools/`, `agents/` split, JSON Mode via
`utils/structured.ts`, two keyless tools (geocoding, climate normals) and two agents (intake,
climate), behind `POST /api/v2/brief`. The tools are verified against the live APIs; **the two
agents have not yet run against a real model** — that needs `wrangler dev`. Next: verify the agent
path end to end, then Phase 1 (destination, places, food specialists).

Hygiene pass complete. The Unsplash key has been rotated, the leaked value is dead, and the new one
is set as a deployed Cloudflare secret. Cloudflare login is active, so `wrangler dev` can now serve
`/api/generate` and changes can finally be verified end to end rather than by typecheck alone.

One loose end: `worker/.dev.vars` exists but `UNSPLASH_ACCESS_KEY` is empty, so **local** dev returns
no photos (it degrades silently — an empty gallery, not an error). Paste the key from
unsplash.com/oauth/applications to fix. Does not affect the deployed worker.

Next substantive work: backlog #1, retry/degrade on malformed model output.

## Status

**Done and working**
- `POST /api/generate` — full flow: DO load → plan generation → parallel photos + preference
  extraction → DO save.
- `POST /api/replace-highlight` — swaps one activity, told about the rest of the itinerary so it
  doesn't duplicate.
- `GET /api/profile/:userId` — implemented and working, despite the README calling it "in progress".
- Durable Object memory: last 10 extracted preference sentences, last 3 injected into the prompt.
- Frontend: timeline UI, photo gallery sidebar, dark/light theme, persisted userId, welcome screen.
- `frontend` lint and build are clean; `worker` typechecks clean.

**In progress / half-done**
- `UserProfile` is mostly aspirational — `name`, `budget`, `homeCountry`, `travelStyle`, `pastTrips`
  are declared in `memory/schema.ts` and never written.
- The markdown-rendering fallback in `MessageContent.tsx` is unreachable in practice: every
  assistant message after the greeting carries a `plan`.

**Broken / wrong**
- No error surface for a malformed model response: `parsePlanResponse` throws, the worker returns
  500, and the UI shows a generic "Sorry, I encountered an error."

## Backlog

Priority order. Prashanna confirmed on 2026-09-26 that this is a portfolio demo *for now* but is
intended to become a real user-facing app, so the hardening items stay on the list rather than
being written off — they move up once real users are in scope.

1. **Retry on malformed plan JSON.** Enrichment now degrades cleanly, but the plan call itself still
   has one shot: any validation failure in `parsePlanResponse` is a 500. Add one reparse attempt with
   a corrective prompt, and consider dropping malformed highlights rather than failing all of them.
   Truncation at `max_tokens: 2048` is the likeliest trigger on long trips.
2. **Deduplicate the plan types.** `worker/src/utils/plan.ts` and `frontend/src/types.ts` are
   maintained by hand in parallel, and `buildPlanPrompt` describes the same shape a third time.
3. **Add tests.** `worker` now has a `typecheck` script, but neither package has a test runner.
   `parseAiJson`, `parsePlanResponse` and `groupByDay`/`dayOrder` are pure and worth covering first.
4. **Pass `userId` to `/api/replace-highlight`.** The worker's request interface declares it, the
   frontend never sends it, nothing uses it. Wire it up or drop it from the interface.
5. **Bump `compatibility_date`.** It is `2024-01-01` while the code uses modern `cloudflare:workers`
   DO imports and SQLite-backed DO classes.
6. **Upgrade wrangler.** v3.114.15 installed; v4 is current and warns on every invocation.
7. **Prune the Durable Object's dead surface.** `UserMemory` exposes both direct methods and a
   `fetch` interface; only `fetch` is used, and `reset()` is unreachable from any route.

**Before real users** (deferred by decision, not forgotten):

8. **Tighten CORS.** `corsHeaders` reflects any `Origin`; pin it to the Pages domain and localhost.
9. **Rate-limit the AI endpoints.** `/api/generate` costs two Workers AI calls per request and is
    unauthenticated — trivially abusable once public.
10. **Real user identity.** The `userId` is a client-generated UUID in `localStorage`: memory is
    per-browser, lost on clear, and spoofable by editing one key.
11. **Populate `UserProfile`.** `name`, `budget`, `homeCountry`, `travelStyle`, `pastTrips` are
    declared in `memory/schema.ts` and never written; only the free-text `preferences` list is used.

## Open questions

Assumptions made while writing these docs — correct any that are wrong.

- **Frontend deploy is `wrangler pages deploy dist`.** Inferred from `frontend/.wrangler/` existing
  and the site being on `pages.dev`. No Pages config or CI is committed, so the actual step is
  unknown — it may be a Git-connected Pages build.
- **The markdown fallback in `MessageContent.tsx` is intentional safety, not leftover.** Left in place.
- **The stray untracked `node_modules/` at the repo root is unrelated junk** (dnd-kit, redux, with no
  `package.json`). Not touched.
- **`PROMPTS.md` is a historical record** of the prompts used to scaffold the project, not something
  the runtime reads.

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-09-26 | `docs/PROGRESS.md` is the single status file; no separate TODO/STATUS | One place to update at the end of a task |
| 2026-09-26 | Trust the code over `README.md` wherever they disagree | Five concrete contradictions found; README lagged three rewrites |
| 2026-09-26 | Unsplash key moved out of `[vars]` to a secret / `.dev.vars` | Stops the leak growing; git history still holds the old value, so rotation was required too |
| 2026-09-26 | Key rotated by Prashanna and set via `wrangler secret put`; leaked value now dead | Closes the exposure in commit `9440211` — removal from the tree alone would not have |
| 2026-09-26 | Root `.env` deleted rather than wired up; `.env`/`.env.*` added to `.gitignore` | Nothing reads a root `.env` (Vite reads `frontend/.env`, wrangler reads `worker/.dev.vars`), and it was unignored — one `git add .` from being committed |
| 2026-09-26 | Enrichment (photos, preference extraction) swallows its own failures; only the plan call is load-bearing | A generated itinerary should never be lost because a photo CDN was slow |
| 2026-09-26 | Day ordering fixed in the UI rather than the worker | Sorting at render fixes existing plans too, and the label is a display concern; numeric extraction also handles `Day 10` vs `Day 3` |
| 2026-09-26 | 500 responses return a generic message; detail goes to `console.error` | Internal error text was reaching clients |
| 2026-09-26 | `UNSPLASH_SECRET_KEY` deliberately not deployed anywhere | Only used for Unsplash OAuth user-auth; this app does public search with `Client-ID` alone |
| 2026-09-26 | Photos degrade to `[]` when the key is absent rather than erroring | Keeps local dev usable without a key; the guard already existed, the types now match it |
| 2026-09-26 | Hardening (CORS, rate limits, real identity) kept in the backlog but ranked below correctness | Demo today, real users later — deferred, explicitly not dropped |
| 2026-09-26 | Prashanna is the sole committer; no attribution trailers, and Claude never runs `git commit` | His instruction, marked very important; enforced by a deny rule in `.claude/settings.json` |
| 2026-03-18 | (from `5ceade4`) Photos and preference extraction run under `Promise.all` | Independent calls; cuts a round trip off `/api/generate` |
| 2026-03-18 | (from `4b4f976`) Single-activity replacement sends the whole itinerary to the model | Cheapest way to stop it suggesting an activity already in the plan |

## Session log

### 2026-09-26 — Phase 0 (branch `v2`)
Built the v2 skeleton: `schema/trip.ts` (TripBrief + flat JSON Schema), `tools/` (geocode, climate
normals — no LLM, independently testable), `agents/` (intake, climate), `utils/structured.ts`
wrapping Workers AI JSON Mode, and `POST /api/v2/brief`. Verified the tools against live APIs across
seven destinations.

Two bugs found by that testing, both fixed. Geocoders are city-oriented, so "Patagonia" resolved to
Patagonia, Arizona and "Tuscany" to Tuscany, Canada — intake now also emits a `destinationCity`
gateway anchor ("Patagonia" -> "El Calafate"), which matters because "Patagonia trek" is one of the
app's own suggestion chips. And the first climate implementation fired one request per year, which
got rate limited in bursts and silently reported "no data for this location"; it now takes a single
multi-year request (3x fewer calls, all twelve months from one response, cacheable) and throws
`ClimateFetchError` so a failed request is distinguishable from a location with no data.

### 2026-09-26 — v2 planning
Researched and wrote `docs/PLAN-v2.md`: nine grounded agents (six parallel specialists plus intake,
composer and critic), a workspace UI with a declarative block registry instead of a chat log, and a
six-phase build. Two findings shaped it — Amadeus killed its free self-service tier in July 2026, so
no free flight/hotel data; and the model already in use supports JSON Mode with a full `json_schema`,
which removes most of the reason to move to Claude. Also concluded the fan-out design does not need
LLM function calling at all, since each specialist has exactly one data source and the orchestrator
can fetch in code. Decisions recorded in the plan's §8.

### 2026-09-26 — Code review and fixes
Full review of `worker/src` and `frontend/src` before starting feature work. Fixed three real bugs:
days could render out of order (`Day 3` before `Day 2`) because `groupByDay` relied on Map insertion
order and nothing sorted; a failing Unsplash call or a 200 without `results` rejected the
`Promise.all` and turned a finished plan into a 500; and `highlights: []` passed validation. Also
stopped returning internal `err.message` text to clients, extracted the duplicated AI-JSON parsing
into `utils/aiJson.ts`, moved `replaceHighlight`'s prompt into `utils/prompts.ts`, added a timeout
and defensive field access to the Unsplash call, capped `max_tokens` on the preference call, added a
`typecheck` script, and added `aria-expanded`/`aria-controls` to the accordion plus a label on the
textarea. Removed `Bash(cat|grep|head|tail|rg:*)` from `.claude/settings.json` allow — they defeated
every `Read(...)` deny rule. All checks clean.

### 2026-09-26 — Unsplash key rotation
Prashanna rotated the key, set it via `npx wrangler secret put UNSPLASH_ACCESS_KEY` (confirmed
present on the deployed worker) and deleted the root `.env`. Added `.env`/`.env.*` to `.gitignore` —
the root `.env` had not been ignored — plus `worker/.dev.vars.example`. Cloudflare login now active.
Backlog item #1 closed. Outstanding: `worker/.dev.vars` still has an empty value, so local dev
returns no photos.

### 2026-09-26 — Hygiene pass
Removed `UNSPLASH_ACCESS_KEY` from `wrangler.toml [vars]`; it is now a secret (`.dev.vars` locally)
and typed optional end to end. Rewrote `README.md` against the actual code — five contradictions
gone, `/api/replace-highlight` documented, real plan shape shown. Deleted dead code
(`exxtractDestination.ts` + its import, `Loader.tsx`, `App.css`, `assets/react.svg`) and all four
debug `console.log`s. Lint, build and typecheck all clean; CSS bundle shrank 0.7 kB because
Tailwind had been scanning the orphaned `App.css`. **Rotating the key at Unsplash is still to do.**

### 2026-09-26 — Onboarding
Read the full tree (42 tracked files, ~1,500 lines of TS/TSX), git history, and both configs.
Verified `frontend` lint + build and `worker` typecheck — all clean; no tests exist anywhere.
Created `CLAUDE.md`, `docs/ARCHITECTURE.md`, this file, `.claude/settings.json`, and four slash
commands. No source, config, or data was modified. Flagged a live Unsplash key committed in
`worker/wrangler.toml`.
