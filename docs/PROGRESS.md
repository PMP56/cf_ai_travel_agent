# Progress

Living status file. Newest session log entry goes on top.

## Current focus
**Phase 0 in progress on branch `v2` — see `docs/PLAN-v2.md`.** The project is becoming a grounded multi-agent
travel workspace rather than a chat app. Decisions locked: all Workers AI (zero marginal cost),
keyless data sources only, evolve the existing worker on a `v2` branch, MapLibre + OSM for maps.
Phase 0 has landed the pattern: `schema/`, `tools/`, `agents/` split, JSON Mode via
`utils/structured.ts`, two keyless tools (geocoding, climate normals) and two agents (intake,
climate), behind `POST /api/v2/brief`. **v2 is ready to release** — v1 code removed, README rewritten, all checks green.
**UI reworked against real screenshots.** **Phase 5 hardening underway** — 73 tests, origin allowlist, per-IP rate limiting.
**Phase 4 (direct manipulation) built.** **Phase 3 (UI) built** — the frontend is rewritten around
the workspace model. **Phase 2 done**
apart from Workflows, which is a deliberate decision rather than a task (see below). **Phase 1 complete.** Intake plus four grounded specialists — destination, climate, places, food —
all verified against a real model and fanning out in parallel. Places produces correct shortlists for Kyoto, Florence
and Marrakesh with real coordinates throughout. The pipeline is extracted into `pipeline.ts` and streams progress over SSE at
`POST /api/v2/stream`, which is the feed Phase 3's activity strip needs. A Kyoto run: intake 3.0s,
four specialists in parallel 3.1-8.0s, composer 8.7s, critic 0.5s, 20.2s total.

**Workflows is blocked on two upgrades and is not urgent.** It needs a current wrangler (project is
on v3.114, v4 is current) and a recent `compatibility_date` (project is on 2024-01-01). Both are
existing backlog items, both touch the deployed worker, and both deserve their own verified change
rather than being smuggled in. Workflows earns its keep when losing a run is expensive; at 20
seconds and effectively zero cost, it is not yet. Recommend doing the upgrades deliberately, then
Workflows, rather than blocking Phase 3 on it.

The region-anchor problem is now **visible rather than silent** — a Patagonia trip returns one
scheduled day and the critic reports "13 of 14 days have nothing scheduled". That is the right
behaviour, but the underlying gap still needs the Wikivoyage-region-links fix.

**Efficiency note for Phase 2:** the destination and food agents each fetch the same Wikivoyage
guide independently, so a single brief makes 2-4 redundant calls. Caching guides in a Durable Object
is the obvious fix and pairs naturally with Workflows.

**Known limitation — remote destinations.** Wikipedia geosearch caps at a 10km radius and tiling
reaches ~46km, but Perito Moreno Glacier is ~78km from El Calafate, so a Patagonia trip currently
finds only Lake Argentino. The town is the wrong anchor for a region trip; a likely fix is
discovering places via the Wikivoyage region page's linked destinations rather than by radius.

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
| 2026-09-26 | Host stays Cloudflare; $5/mo Workers Paid budgeted before any public demo | Only platform bundling free inference + DO + Workflows + WS + hosting on one free tier; free tier is only ~6-7 plans/day (see PLAN-v2 §5) |
| 2026-09-26 | `utils/structured.ts` is the only file allowed to call the model | Keeps the provider swappable; it is the hedge against the Workers AI quality ceiling, and costs nothing to maintain now |
| 2026-09-26 | Prashanna is the sole committer; no attribution trailers, and Claude never runs `git commit` | His instruction, marked very important; enforced by a deny rule in `.claude/settings.json` |
| 2026-03-18 | (from `5ceade4`) Photos and preference extraction run under `Promise.all` | Independent calls; cuts a round trip off `/api/generate` |
| 2026-03-18 | (from `4b4f976`) Single-activity replacement sends the whole itinerary to the model | Cheapest way to stop it suggesting an activity already in the plan |

## Session log

### 2026-09-27 — Homepage animation: orbit band (replaces the departure board)
The split-flap board worked but was judged not to fit. Prashanna supplied a reference —
[Jose Aguinaga's "Travel Animation"](https://codepen.io/loic_album/pen/aZEWNg) — and chose its
*mechanism* in the app's own ink rather than its look, and the existing bottom-strip placement.

The reference is unusually economical and worth recording: one Illustrator SVG, no JavaScript, no
library, and only two real keyframes — rotate 0→360 and its mirror. Every group shares
`transform-origin: 200px 200px` and turns about it at a different duration and sign
(`#countryObjects` 240s, `#floatingGlobe` 360s reversed, planes 60s, arcs 12s/24s alternating,
`#windmill` 2s on its own origin). All the richness is the speed differential.

`OrbitBand.tsx` reproduces that exactly: a globe centred at (440, 560) with r=420, eighteen
line-drawn landmarks standing off the arc, two dashed interior tracks, two planes, a balloon and
bobbing weather — seven layers, seven durations, one origin. Monochrome, per the standing
instruction; the reference's flat colour would read as a different product under an engraving.

Four things had to be corrected by looking:

- **The band rendered 550px tall.** The SVG had `w-full` with no max-width, so it scaled to the
  full 1512px viewport. Constrained to `max-w-[880px]`, giving 880×308.
- **Twelve landmarks left the dome half empty** — only about a third of the ring is ever in frame.
  Raised to eighteen at 20°, which puts five or six on screen.
- **The Duomo's lantern floated detached above its dome.** A quadratic reaches only halfway to its
  control point, so `Q0 -64` peaks at y=-47; the lantern had been placed at -64.
- **Landmarks were sliced by a hard vertical cut** at the frame edge. A `mask-image` gradient fades
  the outer 8% so they go over the horizon instead.

`transform-box: view-box` is the load-bearing line: without it each group resolves
`transform-origin` against its own bounding box and spins in place instead of about the globe.

Verified by measuring each layer's rotation over six seconds — ring +10.3°, tracks +63.5°/+22.5°,
planes +45.0°/+27.7°, balloon −16.9°, sails 1.76 turns — all matching their declared durations.
Checked light, dark, mobile (390px) and `prefers-reduced-motion`, which holds everything still.
Lint, 25 tests and build clean. `DepartureBoard.tsx` and its CSS are deleted.

**Still undeployed.** Eight-plus frontend changes have accumulated, including the
`.env.production` fix — until a deploy runs, the live site still calls each visitor's own machine.

### 2026-09-27 — Homepage animation: split-flap departure board
Replaced the rejected route-plotting animation (`SurveyStrip.tsx`, deleted) with a split-flap
departure board at the foot of the homepage. The first idea was judged basic and not meaningful;
this one is unmistakably travel without a pictogram, is made of type like the rest of the page, and
makes the product's own claim — each destination that lands is one the planner can build, and the
coordinates locking in beneath it are the real ones the geocoder returns. Strictly monochrome, per
instruction: the board uses only `--ink`, `--paper`, `--paper-sunken` and `--rule`.

Two defects were found by looking rather than by reading the code:

1. **Letters never settled** — the board spelled `K QVQBA` instead of `KYOTO`. The per-cell counter
   conflated the stagger delay with the flap distance, so every cell advanced by delay + distance
   and overshot. Split into two independent counters, and each character is now computed as
   `start + elapsed step` rather than by mutating the previous frame, which also makes it immune to
   StrictMode's double invocation.
2. **The longest name was never readable** — a fixed 3.4s hold measured from the index change was
   shorter than `EL CALAFATE`'s eleven-cell stagger plus flap travel, so the board turned over
   mid-word. The dwell is now counted from the moment the board finishes spelling.

Verified by sampling the live DOM over a full 40s cycle: all five destinations settle, ~4.3s each.
Checked in light, dark, mobile (390px) and `prefers-reduced-motion`, which holds a static board.
Also fixed the sample-plan button, whose centred icon floated away from its label when the text
wrapped to two lines on mobile. Lint, 25 tests and build all clean.

**Still undeployed.** Seven-plus frontend changes have accumulated, including the
`.env.production` fix — until a deploy runs, the live site still calls each visitor's own machine.

### 2026-09-27 — Homepage animation: the survey strip
The brief was "a bus drives in from the left, a plane takes off on the right". The instinct —
movement at the foot of the page — was right, but the vocabulary would have fought the design: this
is an editorial field guide in serif and monospace whose headline reads "Every place, verified", and
vehicle clipart reads as a budget booking site. It is also exactly the "meaningless illustration
fluff" the 2026 design research warned about.

So the same idea is rendered as cartography. A route plots itself like a survey sheet coming off a
plotter: contours drift at three speeds, waypoints drop in the day-colours the real map uses, a
dashed route draws between them, and a chevron travels the line. Past the last waypoint it climbs
out and leaves the frame — which is where the plane went, as an air route rather than an aircraft.
It depicts what the product does (find places, cluster, route) instead of decorating the page.

Pure SVG and CSS, no library, nothing on the main thread. Four iterations, screenshotting each.

Two real bugs found only by looking:

**The route was never drawing.** Animating `stroke-dashoffset` on a path that already carries a
repeating `stroke-dasharray` *slides the dash pattern along* — it does not reveal progressively, so
the whole line was present from the first frame while the traveller was still mid-route. The reveal
now lives in an SVG mask: a solid stroke with `pathLength=1` and `dasharray=1` whose offset runs
1 to 0, uncovering the dashed route beneath. The mask and the traveller share one 8%-58% keyframe
segment, so the mark always sits exactly at the pen tip.

**The departure doubled the route.** Its path was route-plus-tail, so it drew a second fainter
dashed line over the whole route. It is now just the tail.

Reduced motion settles into the finished survey — route complete, all five waypoints, nothing
animating. Verified, along with dark mode and 390px.

Also removed `framer-motion`: nothing had imported it since the v1 components were deleted. It was
already tree-shaken out, so this does not shrink the bundle — it removes a dependency from the
supply chain and ~100kB from node_modules.

### 2026-09-27 — Mobile
Audited at 390px and 768px, having only ever tested at 1512-1600. No horizontal overflow anywhere
and the brief, itinerary and context all stacked correctly — but two things were simply absent
below `lg`: **the map**, and **the place detail**, so tapping a place name did nothing at all.

Both now render, and both needed JS rather than CSS. `useMediaQuery` decides which layout is *live*:
rendering the map in a desktop column and a mobile block and hiding one with `lg:hidden` would build
two WebGL contexts, and the detail is a side column on desktop but a full-screen sheet on mobile —
different parents, so one element cannot merely be restyled. Verified one map instance and one GL
canvas at every breakpoint.

The hook uses `useSyncExternalStore` rather than useState + useEffect: matchMedia is an external
store, that is the API for subscribing to one, and it reads during render so there is no first-paint
flash of the wrong layout and no setState in an effect.

Three smaller mobile fixes: the map sits above the itinerary rather than below it (spatial context
before five day cards), the pipeline collapses into a `<details>` once the run completes instead of
putting seven finished rows above the plan, and the sheet suppresses `PlaceDetail`'s own
"← overview" header so there are not two stacked headers.

Desktop layout is unchanged — every change is behind a breakpoint.

### 2026-09-27 — Weather chart made legible; context sections separated
The chart was a floating high/low range bar with a 33°/1° axis and a "warm ▲ · rain ▬" legend —
a convention that has to be decoded (people read bar *height* as magnitude, not bar *position* as a
band), and it answered the wrong question anyway. What a traveller wants is "is this a good month,
and if not, when?"

`monthComfort()` now scores each month for walking around — heat, cold, rain, and wind only once it
passes 30km/h — and the strip colours each month by that verdict with its average high printed on
it. The selected month is outlined and labelled in words ("ideal"), and an **Also good** line names
the alternatives. Pure and unit-tested, 12 cases.

Worth recording as validation: run against real Kyoto normals the function independently reproduces
the conventional advice — April, May, October and November ideal, August harsh. Nobody encoded that;
it falls out of the thresholds.

Text cut hard: the three stat tiles duplicated what the strip now shows, and the model's summary
paragraph restated the same figures in prose. Both gone. What remains is a verdict badge, one line
of numbers, the strip, the alternatives, any caution, and packing as chips.

Section separation: a hairline between "the place" and the weather was not enough in a single
scroll area, so flat panel headers became full-bleed tinted bands.

Added the destination's timezone and current local time, which we already knew from geocoding and
which answers "is anything open right now".

### 2026-09-27 — Details panel polish
Three fixes from review of the new column.

The context and map columns were 380/420 and 420/460, close enough to look like a mistake rather
than a choice. Both are now 380px, 420 at xl — verified by measuring the rendered widths, not by eye.

The panels nested a card inside a card: the details column already draws a border and a background,
and `DestinationPanel` / `ClimatePanel` each drew their own on top. `Panel` gained a `flat` variant
that drops the chrome, and inside the column the sections are separated by rules instead. The same
components keep their card when they stand alone in the main column below `lg`.

The itinerary tiles lost the Wikipedia link icon and the pageview figure. Both were duplicating what
the details panel now shows, and the tile reads better as title, reason, category and distance —
provenance belongs in the dossier, not on every row.

### 2026-09-27 — Third column: a details panel
Added a collapsible middle column between the plan and the map, so the reading order is now
*what* (itinerary) → *about what* (details) → *where* (map). "The place" and the weather moved into
it out of the main column, where they sat below five day cards and were rarely reached.

It has two modes. By default it shows that context; clicking a place name in the itinerary switches
it to a dossier for that place — hero image, which day and stop it falls on, the measured facts
(category, pageviews/day, distance from centre, coordinates), a Wikipedia link, the **full** intro
extract rather than the two-sentence version the prompt gets, and a captioned gallery.

The extra detail is fetched **client-side, directly from Wikipedia**. It serves
`Access-Control-Allow-Origin: *`, so going through the worker would add a hop and rate-limit
pressure for nothing, and no model is involved either way — opening the panel costs nothing against
the seven-plans-a-day ceiling. Two endpoints, because neither suffices alone: the action API for the
extract, and the REST `media-list` for the gallery. `prop=images` returns every file on a page —
Commons logos, flag icons, a location map, an unrelated photo of a French garden — while media-list
returns only what the article displays, in order, with captions.

The place title became a button rather than a link, so a small external-link icon stays in the row
to preserve that affordance. Collapse state persists in localStorage; clicking a place while
collapsed expands the panel. Below `lg` there is no third column and the context panels render
inline instead.

Verified: mode switching, back-to-overview, collapse persistence across reload, click-while-collapsed,
and dark mode.

### 2026-09-27 — Dark-mode contrast fixes
Two reported: the day-picker dropdown was unreadable, and MapLibre's zoom and attribution text were
grey on black.

The dropdown had a root cause worth knowing. Select popups, scrollbars and form widgets are painted
by the **browser**, not by our CSS, so none of our variables reach them — the fix is the
`color-scheme` property on `:root` / `:root.dark`, which tells the engine which palette to paint
with. Explicit `option` colours are belt and braces on top.

MapLibre's zoom glyphs are background SVGs hard-coded to near-black, so they disappear on a dark
control; they now get `filter: invert(1)` in dark. The attribution was set to our faintest ink and
is now full ink.

While auditing, the itinerary row controls measured about 3:1 against their card — under AA for
small text — so they moved from ink-faint to ink-soft. Measured after: day select 7.11:1, dropdown
options 14.55:1, attribution 15.82:1.

### 2026-09-27 — Live site was calling localhost; fixed the cause
The deployed bundle had `http://localhost:8787` baked in, so every visitor's browser tried to reach
their own machine. Caused by bad advice from me: I said `frontend/.env` already pointed at the
worker when only the **commented** line did, and Vite bakes the active value in at build time.

Fixed structurally rather than by editing the line. `frontend/.env.production` (committed — it holds
only a public URL) now carries the deployed endpoint, and Vite prefers mode-specific env files, so
`npm run build` cannot pick up the dev value. `frontend/.env` stays gitignored and points at
localhost for `npm run dev`. Verified: a fresh build bakes in the workers.dev URL.

Requires a Pages redeploy to take effect.

### 2026-09-27 — The brief reads as editable
Feedback: the brief looked like an information dashboard, not something you could change. Correct —
the affordance only appeared on hover, so at rest the values were indistinguishable from the
read-only coordinates line above them, and a caption underneath had to explain that they were
clickable. A control that needs a caption is not a control.

`EditableFact` replaced by `BriefField`, which makes the affordance permanent and the *kind* of
control visible before you touch it: month and pace are real `<select>`s with chevrons, which also
buys keyboard behaviour and native pickers on mobile; duration and budget are chips that open an
input. An unset field is now an invitation — "+ add budget" in accent, dashed border — rather than
the words "not specified". The controls sit on a tinted band separated from the metadata, and the
caption is gone.

Also fixed an inconsistency of my own making: the climate chart's month picker was disabled in
sample mode while the brief's was not. Both are live now — `replan()` clears `isSample`, so changing
a month is the natural path from looking at the sample to actually using it.

Verified all four fields are tab-reachable in visual order with proper labels.

### 2026-09-27 — Worker renamed to travel-agent-backend; CLAUDE.md refreshed
Two workers existed: `ai-travel-concierge` (what wrangler.toml has always named, deployed
2025-12-08) and `travel-agent-backend` (deployed 2026-03-16, and what the live frontend points at).
`wrangler.toml` has never said `travel-agent-backend` in any commit, so that worker was created
outside this repo's config.

Prashanna chose to keep `travel-agent-backend`. Checking made that safe rather than risky:
`/api/profile` served a live `USER_MEMORY` binding on it, which means the `v1` migration is already
applied there, so re-declaring the tag is a no-op. Renamed in wrangler.toml and **removed
`script_name`** from the Durable Object binding — it is only for binding a class defined in another
worker, and after a rename it would have silently pointed at a different deployment. Local dev now
reports `USER_MEMORY: UserMemory` instead of `(defined in ai-travel-concierge [not connected])`,
so that was a latent fault, not just tidiness.

`frontend/.env` already points at `travel-agent-backend`, so no frontend change is needed.

**Delete `ai-travel-concierge` only after v2 is verified live** — deleting a worker is permanent and
takes its Durable Object storage with it; until then it is a free rollback.

Also refreshed `CLAUDE.md`, which still described seven deleted files, the three v1 endpoints,
Unsplash and reflected CORS. It now carries the v2 map plus the traps that actually cost time here:
the free-tier ceiling, `@theme inline` not emitting runtime variables, fonts belonging in
index.html, MapLibre overwriting marker transforms, and partial-results-as-empty.

### 2026-09-26 — Removed v1; prepared v2 for release
The frontend had stopped calling v1 entirely, so `/api/generate`, `/api/replace-highlight` and
`/api/profile/:userId` were dead weight along with `workflow.ts`, `utils/prompts.ts`, `utils/plan.ts`
and `utils/photos.ts`. All removed; the removed routes now 404 and the v2 stream is unaffected.

Unsplash is gone with them — v2 takes every image from Wikipedia — so the worker needs no secrets at
all. The rotated key can be deleted from the deployed worker.

**Feature regression worth naming:** `UserMemory` was only ever read by the v1 routes, so v2 has no
persistent memory. The Durable Object is still bound and exported, because deleting a DO class needs
a migration, but nothing writes to it. v1 remembered a rolling list of preferences per user and v2
does not. This is the first thing to fix after release.

### 2026-09-26 — Supporting panels turned into instruments
The four panels below the itinerary were boxes of grey prose, so genuinely useful material — a
warning about photographing geiko, a month that rains a third of the time — read as filler.

The climate panel is the substantive change. `getClimateYear` already computes **all twelve months**
from the single archive request and the agent was discarding eleven of them, which threw away the
answer to the question travellers actually ask: is this the right month to go? It now returns the
whole year, and the panel draws it as a temperature band with a rain channel beneath. **Clicking any
month re-plans for it**, reusing the brief-edit path rather than inventing a second way to change a
trip. Three stat tiles lead with the figures that change what you pack.

The review panel said "No issues found" and nothing else. It now lists what was actually checked —
walking distance, stops against pace, duplicates, empty days, non-places, ordering — because an
empty result is more convincing when it shows its work, and it matches the transparency the pipeline
rail already provides.

Prose blocks in "the place" became icon callouts, so a safety warning looks like a warning. Both
context panels moved **above** the itinerary: weather and the character of a place are what you read
before day one, and behind five day cards they were never seen.

Two things caught by looking rather than reasoning: the rain channel was drawn with raw opacity,
which made a 20% month and a 45% month indistinguishable, and the chart had no scale at all.

### 2026-09-26 — Sample plan, so the UI can be seen without spending credit
Added `frontend/src/samplePlan.ts` and a "see a finished plan" button on the cold-start screen. It
renders the complete workspace instantly with no network call and no model call — verified by
screenshotting it with the worker not running at all.

This exists because of the constraint above: the free tier is about seven plans a day and local
`wrangler dev` draws on the same allowance, so a session spent adjusting layout runs out of credit
long before the layout is right.

The fixture is **real data**, not invented placeholders — coordinates, Wikipedia pageview figures,
lead image URLs and the April climate normals were all pulled from the live pipeline, and the
inter-stop distances are computed with the same haversine the composer uses. Only the day themes and
notes are hand-written. Judging a design against fabricated data means judging the wrong thing.

A banner states plainly that it is a sample and offers "plan your own", so it cannot be mistaken for
a generated plan.

### 2026-09-26 — Bounce-back on failure; Workers AI free tier exhausted
Clicking an example destination flashed the workspace and returned to the cold-start screen.
Reproduced in a headless browser and instrumented the stream hook: `run()` fired once, nothing
aborted, and the SSE stream closed 264ms in with HTTP 200. The worker was reporting

    4006: you have used up your daily free allocation of 10,000 neurons

which is precisely the budget calculated in PLAN-v2 §5 — about 1,450 neurons a plan against
10,000/day, so roughly seven plans. A day of testing spent it.

The quota is a constraint, not a bug, but it exposed two real ones.

**The workspace unmounted on failure.** `started` was `running || brief || result`, so a failed run
cleared `running` while brief and result were still null — the workspace disappeared and took the
error message with it, since the error renders inside the workspace. `started` now includes `error`,
and there is a "start over" control to get back deliberately.

**The real reason was being discarded.** Intake ran through the generic `stage()` wrapper, which
swallowed the cause and reported every failure as "Could not understand the request" — sending
people off to rewrite a perfectly good sentence. Intake is now handled inline so the cause survives,
and `explainFailure()` maps the common upstream faults (quota, rate limit, timeout) to something
actionable. Six tests cover it; one caught that the matcher looked for "timeout" while the real
wording is "timed out".

**Note for whoever hits this next:** the free tier really is about seven plans a day. Local
`wrangler dev` spends the same quota as production, so a testing session exhausts it quickly.

### 2026-09-26 — UI rework, driven by actual screenshots
Installed Playwright and drove a headless browser so the interface could be looked at rather than
reasoned about. That immediately found three bugs no amount of code review would have caught.

**The fonts had never loaded.** `@import` for Google Fonts sat inside `index.css` after Tailwind's
expanded output, and CSS requires `@import` to precede all other statements, so the browser silently
dropped it — `document.fonts.size` was 0 and everything rendered in Georgia and system-ui. The whole
typographic direction had never actually been seen. Moved to a `<link>` in index.html with
preconnect; 44 faces now load.

**Day colours resolved to nothing.** `dayColour()` returned `var(--color-day-N)`, but Tailwind v4's
`@theme inline` substitutes those values into utilities at build time and never emits them as
runtime custom properties. Probed it directly: `--color-day-1` was empty and fell back to ink, which
is why every day badge was a blank circle and every map pin a grey blob. Now references the raw
`--day-N` properties on `:root`.

**MapLibre owns the marker transform.** The pins were meant to be rotated teardrops, but MapLibre
writes `transform: translate()` on the marker root to position it, overwriting the rotation — so the
pin never rotated while its counter-rotating label did, leaving tilted digits. Rebuilt as a circle
with a bordered pseudo-element pointer, depending on no transform at all.

Beyond the bugs: added Wikipedia lead images to the places tool (same batched call, 9/10 places have
one), which is what actually fixes "too plain" — the page is now anchored by photographs of real
places rather than decorated with stock imagery. Day cards replace the flat list, with numbered
badges colour-matched to the map pins; category icons from lucide; example destinations as cards
rather than three stacked paragraphs of grey text; sources stated on the cold-start screen; content
column widened to reclaim ~350px of dead space.

Lesson worth keeping: three of these were invisible in code and obvious in a screenshot. Anything
visual needs to be looked at before it is called done.

### 2026-09-26 — Phase 5: tests and hardening
Added the test suite this project has never had: 57 in the worker (clustering, trip normalisation,
`parseAiJson`, CORS, rate limiting) and 16 in the frontend (itinerary edits), running in ~150ms
each. The cases deliberately encode bugs that actually happened rather than hypothetical ones —
the 3/3/3/1/1 clustering imbalance, sentinel-to-null normalisation, fence-stripped model output,
and origin lookalikes.

Replaced origin reflection with an allowlist. The old `corsHeaders` echoed whatever `Origin`
arrived, so any site could call the worker from a visitor's browser and burn the Workers AI quota;
`travel-agent-111.pages.dev.evil.com` now fails, where before it passed.

Added per-IP rate limiting at 5 plans/minute on the expensive routes. A plan is seven model calls
at ~1,450 neurons, against a 10,000/day free tier — roughly seven plans is the entire daily budget,
so one script could exhaust it. Deliberately isolate-local: each edge location enforces its own
budget and a cold isolate starts fresh, which makes it a brake on casual abuse rather than a
security control. A real limit needs a Durable Object or Cloudflare's rate-limiting binding.

Two notes. The limiter counts requests that fail validation, so probing with malformed bodies still
costs budget — deliberate, but it means a user fat-fingering a request burns an allowance.
And verification nearly went wrong: the first clean-worker run failed to bind because a stale
`workerd` still held port 8787, so the checks had been served by an instance whose provenance was
unclear. Freed the port and re-ran against a confirmed-fresh instance before believing the results.

### 2026-09-26 — Phase 4: direct manipulation
The pipeline now accepts either a message or an **edited brief**. Supplying a brief skips intake
entirely, so changing "relaxed" to "packed" reconverges against the same structured intent rather
than re-parsing a new sentence and drifting to a different trip. This is the capability a chat app
structurally cannot offer, and it is now demonstrable: the same Kyoto brief at `packed` returns 3
denser days and 16.9km instead of 4 days and 19.2km, with `intake skipped: brief supplied`.

Brief fields are click-to-edit (Enter commits, Escape abandons, keyboard reachable throughout), and
the itinerary supports reorder, move-to-day, remove and swap-for-an-unscheduled-place, each
recomputing distances so the kilometre figures never go stale. Edits are tagged with the result they
were made against and resolved during render, so a newer plan supersedes them without a `setState`
in an effect.

**Deliberately not drag-and-drop.** Dragging needs a whole parallel affordance to be keyboard
operable, and "move to day 3" from a select is clearer than dropping a card into the right gap.

Testing the replan exposed a real bug: pace set the number of days but never capped the number of
places, so a "relaxed 4 days" in Kyoto returned 11 sights across 4 days — which is not relaxed. Pace
now caps capacity at `days x perDay` and holds the rest back as swap candidates. Measured:
relaxed 2/day 8.1km, moderate 2-3/day 15.2km, packed 4/day 22.3km.

### 2026-09-26 — Phase 3: the frontend, rebuilt
Discarded the chat UI entirely and rebuilt around the workspace model. Research shaped two
decisions. On agent UX, current practice is to expose tool execution — each call, its elapsed time,
its result — rather than hide it, so the pipeline telemetry became a first-class panel instead of a
spinner. On visual design, the documented backlash is against the house style the old UI was a
textbook example of: pastel gradients, soft rounded cards, friendly sans-serif, decorative fluff.
The counter-direction is editorial typography and real data shown as data.

So the design is a **field dossier**: Instrument Serif for place names, Inter for interface, and
JetBrains Mono for anything measured. Coordinates, kilometres, pageviews-per-day and degrees are
all on screen, because "nothing here was invented" is the product's actual claim and the interface
should show receipts rather than ask for trust.

New: `usePlanStream` (fetch + reader, since EventSource cannot POST), `AgentRail`, `BriefBar`,
`ItineraryView`, `MapView` (MapLibre + OSM, markers coloured by day), `Dossier` panels, `PromptBar`.
Deleted all six old components. Accessibility was designed in, not retrofitted: focus-visible rings,
`prefers-reduced-motion`, aria-live on the running clock, screen-reader text for the status glyphs,
and labelled controls.

MapLibre is ~1MB, so it is lazy-loaded — the cold-start screen has no map, and the initial bundle
went from 353kB gzipped to 67kB.

Superseded — the UI has since been screenshotted and reworked; see the entry above.

### 2026-09-26 — Progress streaming and caching
Extracted the pipeline out of the route handler into `pipeline.ts` so one implementation serves both
the JSON endpoint and a new SSE endpoint at `POST /api/v2/stream`. SSE rather than WebSockets:
progress is strictly one-way, so a socket would add a Durable Object and a connection lifecycle for
nothing, and EventSource reconnects by itself. Every stage reports start, duration and a one-line
summary — a full plan takes 20-60s, far too long for a spinner. The stream makes the parallelism
visible: all four specialists start at the same instant.

Added an isolate-local TTL cache over all four tools. The concrete problem was duplication inside a
single request — destination and food each fetched the same Wikivoyage guide — and concurrent
callers now share one in-flight promise. Failures are deliberately never cached, since caching a
rate-limited miss would turn a transient fault into a sticky one.

Honest measurement: end-to-end agent timings barely moved, because they are dominated by model
latency rather than fetches. The cache's value is fewer upstream calls against keyless rate-limited
APIs — which has been the root cause of several silent-data-loss bugs here — not speed.

### 2026-09-26 — Phase 2: composer and critic
Which places share a day is geometry, not judgement, so `tools/cluster.ts` decides it in code —
deterministic, free, and the first piece here testable with no network and no model. Greedy
seeding from the most remote unassigned place, then nearest neighbours; measured at 27% less
travel than rank order on Kyoto (38.3km vs 52.7km). The composer supplies only the day theme,
within-day order and a practical note, and its day assignments are **not trusted**: if it moves a
place between days the clustering stands and only its prose is kept.

First run revealed the slot formula front-loaded — Kyoto came out 3/3/3/1/1 because it reserved
only one place per remaining day rather than a fair share. Now re-divides what is left across the
days still to fill; verified balanced across eight shapes including more days than places.

The critic splits the same way: arithmetic faults (distance, density, duplicates, empty days) are
computed, because a model asked to check them will sometimes agree that 40km is a pleasant stroll;
the model judges only what arithmetic cannot — non-places, nonsensical ordering, notes that
contradict the weather. Its prompt states that an empty list is a valid and common answer, and on
a good Kyoto itinerary it correctly returns zero defects rather than inventing one.

Also worth recording: wiring the composer in silently did nothing, because a `str.replace()`
pattern did not match and I had omitted the assert used elsewhere. Same failure shape this project
keeps producing — a no-op presenting as success. Every scripted edit now asserts its match.

### 2026-09-26 — Food specialist; Phase 1 complete
Added the food agent over the Wikivoyage Eat/Drink sections. It deliberately does not name
restaurants: specific venues are the worst thing for an AI planner to invent, and the keyless
sources cannot support them anyway (OSM gives local-script names with no quality signal). What the
guides carry reliably is what a place eats and how dining works, which is the more useful half.

First run exposed a truncation bug rather than a model failure. Kyoto returned only "ramen, kaiseki"
and a blank dietary note for a vegetarian traveller — because the tool truncated sections at 1,200
chars while Kyoto's Eat section is 4,501, so the model never saw shojin ryori or yatsuhashi at all.
Its silence was correct for the input it was given. Raising the limit to 4,500 for food (input
tokens cost a fraction of output) now yields kaiseki, yatsuhashi, matcha ice cream, shojin ryori,
hamo and tofu, and correctly points a vegetarian at shojin ryori.

Worth remembering: when a grounded agent underperforms, check what it was actually shown before
touching the prompt.

### 2026-09-26 — Destination specialist
Added `tools/wikivoyage.ts` and the destination agent. Uses plain-text extracts rather than
wikitext — the markup is inconsistent between articles and not worth parsing, while `explaintext`
returns clean prose with headers intact. Article titles resolve through search, so "Marrakesh"
correctly finds "Marrakech".

Where a region page is thin (Patagonia has only a lead paragraph) the agent prefers the gateway
city's fuller guide. Three specialists now fan out in parallel.

Two things worth recording from the verification run. Marrakesh produced genuinely local safety
advice — the "this street is closed" scam — which is exactly the kind of thing a model recalling
from memory would replace with generic pickpocket warnings. And for El Calafate, whose guide covers
neither safety nor etiquette, the model returned empty strings rather than inventing them, so the
"return blank rather than fill from your own knowledge" instruction holds under test.

### 2026-09-26 — Places: three layers of silent data loss
Chased the missing Uffizi. It was not one bug but three, each hiding the next, and all of the same
shape: partial results that looked like absence.

1. Tiled searches produced ~1,500 candidates, so 30 pageview batches fired at once and Wikipedia
   rate-limited them. A throttled batch scored its titles zero, which put them under the notability
   threshold. Fixed with bounded concurrency (4) and one retry, and by failing loudly when ANY batch
   is lost rather than only when all are.
2. The 300-candidate cap sorted by distance, but Florence's centre has 300+ geotagged articles
   inside 400m — so the cap discarded notable places by proximity. Cities now use a single 10km
   search (no tiling at all; it added candidates without adding reach) and the cap is 500.
3. The real one: MediaWiki paginates `prop=pageviews`. On a 50-title batch it returns PARTIAL data
   plus a `continue` token and no error, so `Uffizi` came back with no pageviews field while its
   neighbours in the same response had one. Now follows continuation to completion.

All three were the same failure mode the climate tool had: something incomplete presenting as
something empty. Verified: Florence 5/5 landmarks, Kyoto 4/4, Marrakesh 3/3.

With the tool fixed, `Nintendo` surfaced at 3,352/day in Kyoto (its HQ is geotagged there) — and the
model filter correctly rejected it, along with Heian-kyo, Kyoto Prefecture and the Medici person.
That is the two-layer split working as designed.

### 2026-09-26 — Phase 1: places specialist
Built the keyless places pipeline and the agent on top of it. Three plan assumptions turned out to
be wrong and were corrected: REST Countries v5 now needs an API key (so it leaves the keyless
stack), Overpass returns local-script names and ranks a records office level with Kinkaku-ji, and
Wikivoyage listing markup is inconsistent between articles. What works is Wikipedia geosearch ranked
by pageviews — roughly 100x separation between attractions and noise.

Ranking alone was not enough: it surfaced people, events, artworks, administrative areas and
neighbouring towns. Rather than grow a blocklist, the agent hands the model the ranked candidates
and has it select BY INDEX, so every name and coordinate still comes from the tool and a
hallucinated place is structurally impossible. Result for Kyoto: Fushimi Inari, Kiyomizu-dera,
Kinkaku-ji, Nijo Castle, Gion, Arashiyama — correct, with the noise gone. Florence likewise.

The Uffizi gap was chased down and fixed — see the next entry. Remote destinations remain weak
because geosearch caps at a 10km radius, and the "why" clauses sometimes restate the place name.

### 2026-09-26 — Phase 0 verified end to end
Ran the agent path against a real model. Intake handled both test messages correctly, including
leaving `pace`, `budget` and `partySize` null when unstated rather than inventing them, and
`Patagonia -> El Calafate` confirmed the gateway anchor works with a live model.

Two climate-agent quality fixes came out of it. The tool fetched no wind, so for Patagonia — where
December averages 31km/h peak winds gusting to 60 — the advice was silently missing the thing that
actually defines the place; wind now comes from the same request at no extra cost. Then the caution
field needed three prompt iterations: first a redundant restatement of the summary, then a bare
fragment ("sustained winds"), then over-reporting 15km/h in Kyoto as a hazard. It is now
threshold-based (>30C, <5C, >40% wet days, >30km/h wind) and picks whichever figure exceeds its
threshold by the widest margin. Verified across three climates: Kyoto April stays correctly silent,
Patagonia picks wind, Marrakesh July picks the 40.1C heat over its wind.

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
