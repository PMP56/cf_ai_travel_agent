# CLAUDE.md

## Project
Grounded travel planner. Seven agents run over keyless sources — Wikipedia, Wikivoyage, the ERA5
climate archive — and a Cloudflare Worker streams their progress to a React 19 + Vite workspace.
Nothing in an itinerary is invented: specialists reason over fetched data rather than recalling,
and the places agent selects by index from real geocoded candidates.
Deployed at https://travel-agent-111.pages.dev/

## Repo map
- `worker/` — Cloudflare Worker. Worker name `travel-agent-backend` (wrangler.toml).
  - `src/index.ts` — router: `GET /`, `POST /api/v2/brief`, `POST /api/v2/stream`
  - `src/pipeline.ts` — orchestration + the SSE event contract; `explainFailure()` maps upstream faults
  - `src/agents/` — one per specialist. All follow: fetch in code → hand the model only that data →
    constrain with a JSON Schema. `intake, destination, climate, places, food, compose, critic`
  - `src/tools/` — keyless data sources with **no LLM dependency**, so they are testable without
    spending neurons: `geocode, climate, places, wikivoyage, cluster`
  - `src/schema/trip.ts` — `TripBrief` + its flat JSON Schema; mirrored by `frontend/src/types.ts`
  - `src/utils/` — `structured` (JSON Mode), `aiJson`, `cache`, `helpers` (CORS), `rateLimit`
  - `src/memory/UserMemory.ts` — Durable Object. **Bound and exported but unread**: v2 has no
    persistent memory. A regression from v1, not a decision. See docs/PROGRESS.md.
- `frontend/` — React 19 + Vite 7 + Tailwind v4 + MapLibre
  - `src/usePlanStream.ts` — drives the SSE run; `submit`, `replan`, `showSample`, `reset`
  - `src/components/` — `AgentRail` (pipeline telemetry), `BriefBar` (editable brief),
    `ItineraryView`, `MapView`, `Dossier` (fact panels), `PromptBar`, `EditableFact`
  - `src/samplePlan.ts` — a real fixture; the home page renders it with no backend
  - `src/index.css` — Tailwind v4 `@theme inline` + HSL tokens. There is **no** `tailwind.config.js`.
- `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, `docs/PLAN-v2.md`

## Commands
Verified (run from the named directory):
- `cd frontend && npm install` / `cd worker && npm install`
- `cd frontend && npm run lint` — eslint, currently clean
- `cd frontend && npm run build` — `tsc -b && vite build`, currently clean (~2s)
- `cd frontend && npm test` — vitest, 16 tests over `itineraryEdits`
- `cd worker && npm run typecheck` — tsc --noEmit, currently clean
- `cd worker && npm test` — vitest, 63 tests over cluster, trip schema, aiJson, CORS, rate limiting, failure messages

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
- **The free tier is ~7 plans/day.** One plan is seven model calls, ~1,450 neurons, against
  10,000/day. `wrangler dev` spends the same allowance as production, so a testing session exhausts
  it. Use the home page's "see a finished plan" (the `samplePlan` fixture) to work on UI for free.
- `frontend/src/types.ts` mirrors the worker's shapes by hand. Change one, change the other, or the
  UI silently renders blanks.
- **Tailwind v4 `@theme inline` does not emit runtime CSS variables.** `var(--color-day-1)` resolves
  to nothing in an inline style; reference the raw `--day-N` on `:root` instead. This silently
  blanked every day badge and map pin once already — see `src/dayColour.ts`.
- **Fonts are linked from `index.html`, not imported in CSS.** An `@import` inside `index.css` lands
  after Tailwind's output and CSS requires `@import` to come first, so the browser drops it.
- **Layout differs by breakpoint in JS, not just CSS.** `useMediaQuery(DESKTOP_QUERY)` decides where
  the map and the place detail *render*, because hiding a duplicate with `lg:hidden` would build two
  WebGL contexts, and the detail is a column on desktop but a sheet on mobile — different parents.
  Desktop is three columns; below `lg` everything stacks, the map goes inline above the itinerary,
  and the pipeline collapses into a `<details>` once the run finishes.
- **Native controls need `color-scheme`, not CSS.** Select popups, scrollbars and form widgets are
  painted by the browser and never see our variables — `:root` / `:root.dark` set `color-scheme`,
  which is what makes dropdowns readable in dark mode. MapLibre's zoom glyphs are hard-coded dark
  SVGs and get `filter: invert(1)` in dark.
- **MapLibre overwrites `transform` on marker elements** to position them. Anything transform-based
  on a marker root is clobbered; `.fg-pin` uses a pseudo-element pointer for that reason.
- Partial results that look like empty ones have caused four separate bugs here (rate-limited
  batches, a distance cap, MediaWiki `continue` pagination, section truncation). When a grounded
  agent underperforms, check what it was actually *shown* before touching the prompt.
- **Two env files, on purpose.** `frontend/.env` (gitignored) points at localhost for `npm run dev`;
  `frontend/.env.production` (committed, public URL only) is what `npm run build` uses. Vite prefers
  the mode-specific file, so a build cannot ship the dev URL — which happened once, putting
  `http://localhost:8787` into the deployed bundle so every visitor called their own machine.
  Vite reads env only at start — restart after editing.
- The repo root has a stray untracked `node_modules/` with no `package.json`. Ignore it.

## Rules
- **IMPORTANT:** Never put a secret in `wrangler.toml [vars]` — that file is committed. v2 needs no
  secrets at all (every source is keyless); deployed values would go through `npx wrangler secret
  put`. An old `UNSPLASH_ACCESS_KEY` is visible in commit `9440211`; it was rotated on 2026-09-26
  and is dead, so it needs no action — but do not reintroduce that pattern.
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
- Changing a shape means touching the worker type and `frontend/src/types.ts` together.
- Anything visual must be **looked at**, not reasoned about. Playwright is installed in `frontend/`;
  three UI bugs here were invisible in code and obvious in a screenshot.
- Update `docs/PROGRESS.md` (session log + status) at the end of each task.

## Pointers
- Components, data flow and design decisions: `docs/ARCHITECTURE.md`
- Current focus, backlog, open questions, decision log: `docs/PROGRESS.md`
