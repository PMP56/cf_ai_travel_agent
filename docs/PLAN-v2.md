# v2 Plan — from chat app to multi-agent travel workspace

Status: **decisions made, ready to build.** Nothing here is built yet.
Written 2026-09-26, revised same day after Prashanna's answers (§8).

---

## 1. The core problem with v1

v1 is one LLM call wearing a trench coat. `executeWorkflow` asks Llama for a JSON itinerary, and
everything in the plan — the places, the timings, the budget, the "best time to visit" — is the
model's recollection, not a fact. That is why the prompt has to beg for day coverage and why
`parsePlanResponse` needs 40 lines of defensive validation. The output *looks* structured; it isn't
*grounded*.

**The trap to avoid in v2:** running six copies of the same model with six different system prompts
and calling it a multi-agent system. That is theatre — it multiplies cost and latency and produces
six flavours of the same hallucination. An agent earns its place only if it owns a **distinct
capability**: a real data source, a real tool, or a genuinely different judgement task.

So the organising principle below is: **every specialist agent is grounded in a real API.** The LLM's
job shifts from *recalling* travel facts to *reasoning over fetched ones*. That single change is what
makes this a real system rather than a prompt collection, and it also fixes the #1 complaint about
every AI trip planner — invented restaurants and museums that closed in 2019.

---

## 2. What the product becomes

**A travel planning workspace, not a conversation.** The user states an intent once; a swarm of
grounded agents fans out; the result is a living document they manipulate directly. Chat is demoted
from *the interface* to *one input among several*.

Concretely, the screen is four regions:

```
┌────────────────────────────────────────────────────────────┐
│  BRIEF (editable chips)          │  AGENT ACTIVITY          │
│  Kyoto · 7 days · Apr · $2000    │  ●weather ●places ○food  │
│  pace: relaxed · interests: …    │  ○budget  ○events        │
├──────────────────────────────────┴──────────────────────────┤
│                                   │                          │
│   PLAN CANVAS                     │   MAP                    │
│   Day 1 ──●── Fushimi Inari       │   (pins, coloured        │
│          └── Nishiki Market       │    by day, clustered)    │
│   Day 2 ──●── Arashiyama          │                          │
│   [drag to reorder, click to swap]│                          │
├──────────────────────────────────────────────────────────────┤
│  ⌘  "make day 3 cheaper"        [Refine] [Compare] [Export]  │
└──────────────────────────────────────────────────────────────┘
```

Four ideas carry the design:

1. **The brief is editable state, not a sent message.** Change "7 days" to "10" and only the agents
   affected by duration re-run. This is the thing a chat app fundamentally cannot do — in ChatGPT you
   re-ask and get a different plan; here you mutate one field and the plan converges.
2. **Agent activity is visible.** A live strip showing which specialists are running, what they
   found, how long they took. This is both honest UX (a 30s wait needs to show progress) and the
   single most compelling thing to demo — you can *watch* the system think in parallel.
3. **Choice instead of prose.** When an agent is uncertain it emits a choice component — "two viable
   routes for Day 4: scenic (2h) or direct (40min)?" — rather than a paragraph asking a question.
4. **Direct manipulation.** Drag a card to another day, pin a place, lock a day so refinement won't
   touch it, delete and get a grounded replacement. v1's "Replace this activity" is the seed of this.

### Generative UI — the disciplined version

Industry practice splits generative UI into three levels of agent freedom: *static* (agent picks a
predefined component and fills it), *declarative* (agent returns a UI spec the frontend renders with
its own styling), and *open-ended* (agent emits arbitrary markup)
([CopilotKit](https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026)).

**Recommendation: declarative, over a fixed component registry.** Open-ended generation is what
produces the cluttered, inconsistent interfaces you said you don't want — every response inventing
its own layout. A closed registry of well-designed blocks that agents *compose* gives you dynamism
where it matters and consistency everywhere else.

Proposed registry (~8 blocks, deliberately small):

| Block | Used for |
|---|---|
| `DayTimeline` | the spine of the itinerary |
| `PlaceCard` | one grounded POI: name, why, hours, coords, photo |
| `MapView` | pins for any set of places |
| `WeatherStrip` | climate normals for the travel window |
| `BudgetBreakdown` | estimated cost by category, against the stated budget |
| `ComparisonTable` | two or three options side by side |
| `ChoiceChips` | a decision the agent wants the user to make |
| `AlertCard` | visa requirement, closure, safety note, budget overrun |

Agents return `{block: "PlaceCard", props: {...}}` validated against a schema. The frontend owns all
styling, so the app can never render something ugly or off-brand.

---

## 3. Agent roster

Nine agents. Six run in parallel; three are sequential stages around them.

| # | Agent | Grounded in | Job |
|---|---|---|---|
| 0 | **Intake** | — | Turn free text into a typed `TripBrief`. Ask at most one clarifying question. |
| 1 | **Destination** | Wikivoyage, REST Countries | Overview, districts, visa, currency, language, safety |
| 2 | **Climate** | Open-Meteo | Conditions for the actual travel window; packing implications |
| 3 | **Places** | OSM Overpass + Nominatim | Real POIs with real coordinates and categories |
| 4 | **Food** | OSM Overpass | Restaurants, markets, cafés near the day's cluster |
| 5 | **Logistics** | OSM + REST Countries | Transit between chosen places, realistic travel times |
| 6 | **Budget** | REST Countries FX + heuristics | Cost estimate by category vs. the stated budget |
| 7 | **Composer** | outputs of 1–6 | Assemble days, **cluster geographically** so no zigzagging |
| 8 | **Critic** | the composed plan | Reject: impossible travel times, over-packed days, budget overrun, unverified POIs |

**The Critic is the quality differentiator** and the piece most AI trip planners skip. It gets the
composed plan plus the raw agent data and answers one question: *would a competent human travel agent
sign off on this?* If not, it returns specific defects and the Composer runs once more. One retry
maximum — this is a quality gate, not an optimisation loop.

Agents 1–6 fan out in parallel the moment the brief is settled. They don't talk to each other; they
write into shared trip state. That keeps the topology a simple fan-out/fan-in rather than a
conversation graph, which is far easier to debug and to render as a progress strip.

---

## 4. Data sources

The big constraint discovered while researching this: **Amadeus shut down its free self-service
developer portal on 17 July 2026** — keys disabled, no free tier for independent developers, and
access now requires negotiated Enterprise terms
([PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers),
[Tripgic](https://www.tripgic.com/playbook/amadeus-self-service-api-alternatives/)). The usual
"add flights and hotels" move is therefore off the table for a free portfolio project.

The good news is that a genuinely useful grounded stack exists with **no keys and no cost**:

| Source | Key needed | Gives us |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) | **none** | Forecast + historical climate back to 1940, no usage limits |
| Wikivoyage REST API | **none** | 30,000+ destination guides, structured sections |
| REST Countries | **none** | Visa, currency, language, calling codes, flags |
| OSM Nominatim + Overpass | **none** | Geocoding and real POIs with coordinates |
| MapLibre GL + OSM tiles | **none** | The map, without a Mapbox/Google bill |
| Unsplash | have it | Photos (already working) |

Optional paid/keyed additions, only if you want them: Ticketmaster Discovery (events, free tier with
a key), Duffel (flights — the recommended Amadeus migration path, has a test mode), Foursquare or
Google Places (richer POI metadata than OSM).

**My recommendation: ship the keyless stack.** It is free, it needs no signup, it makes the
"grounded, not hallucinated" claim true, and "plans trips, doesn't book them" is a perfectly
coherent product. Flights can be a later phase behind a Duffel key.

⚠️ **Overpass and Nominatim have strict usage policies** — low request rates, a required identifying
User-Agent, and no heavy commercial use. Caching in a Durable Object or KV is mandatory, not
optional. Plan for it from day one.

---

## 5. Platform and models

### Orchestration

Cloudflare has shipped exactly the primitives this needs since v1 was written. The
[Agents SDK](https://developers.cloudflare.com/agents/) gives each agent a Durable Object with its own
SQLite, hibernation at zero cost when idle, WebSockets for streaming to the UI, and direct RPC between
agents. [Workflows](https://developers.cloudflare.com/workflows/get-started/durable-agents/) (now GA)
adds durable execution — checkpointed steps, per-step retries, and pauses that cost nothing.

**Recommendation:** Workflows for the plan pipeline (it survives a failed agent without losing the
other five's work), Agents SDK + WebSockets for streaming progress to the activity strip. The
existing `UserMemory` DO becomes one of several.

### Models — all Workers AI

**Decision: stay entirely on Workers AI.** Zero marginal cost per plan, no API keys, no billing to
watch. Two research findings make this a much better option than it first appeared.

**1. The current model already supports schema-enforced JSON.**
`@cf/meta/llama-3.3-70b-instruct-fp8-fast` is one of only six Workers AI models supporting
[JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) with a full
`json_schema` declaration:

```ts
response_format: { type: "json_schema", json_schema: { type: "object", properties: {...}, required: [...] } }
```

This delivers most of what Claude's structured outputs would have — the model is constrained to our
schema rather than asked nicely for it. `utils/aiJson.ts` and the hand-rolled field validation
shrink to a schema definition per agent. Notably the newer tool-calling models (GLM-4.7-Flash,
Kimi K2.6, Gemma-4) are **not** on the JSON Mode list, so the model already in use is the right one.
It is also not deprecated — `-fast` variants explicitly survive the May 2026 cull.

Two caveats: JSON Mode does not support streaming, and Cloudflare does not guarantee compliance —
a "JSON Mode couldn't be met" error is possible on complex schemas. So keep a validation layer, just
a much thinner one, and keep schemas flat and small rather than deeply nested.

**2. We don't need LLM function calling.**
Workers AI's function-calling support is thin — the documented model is
`@hf/nousresearch/hermes-2-pro-mistral-7b`, a 7B Mistral variant, which is far too weak for the
Composer or Critic.

But the fan-out design doesn't need it. Each specialist has **exactly one** data source, so the
orchestrator fetches from Overpass or Open-Meteo **in code**, deterministically, and passes the
fetched data to the model to reason over. Tool calling is only necessary when the *model* must choose
which tool to call — here the topology already decides. Code-orchestrated fetching is cheaper,
faster, fully testable without a model, and cannot hallucinate a tool call.

This is a genuine simplification, not a workaround. Even with Claude available I would probably
structure it this way.

**Per-agent model assignment:** all nine on `@cf/meta/llama-3.3-70b-instruct-fp8-fast` to start, each
with its own tight JSON schema and a focused system prompt. If the Composer or Critic underperforms,
those two are the candidates for an upgrade — evaluate Kimi K2.6 or GLM-4.7-Flash there and fall back
to hand-validated JSON for them, since they'd lose JSON Mode. **Verify model IDs and JSON Mode
support against the live catalog at implementation time**; the docs lag the catalog.

**Cost: $0 marginal**, within Workers AI free-tier limits. The constraint becomes free-tier
neuron quota rather than dollars, which still argues for caching and rate limiting.

---

## 6. Honest limitations

- **No real prices.** Without Amadeus/Duffel, flight and hotel costs are estimates, not quotes. The
  UI must say so — a fake precise number is worse than an honest range.
- **Latency.** A full nine-agent plan is 20–60s even with fan-out. This is why the activity strip
  isn't decoration; it's what makes the wait tolerable.
- **OSM data quality varies wildly** by region. Excellent in Europe and Japan, thin in parts of
  Africa and South America. The Critic should flag low-confidence regions rather than pretend.
- **Cost scales with ambition.** Nine agents per plan, unauthenticated, is abusable. Rate limiting is
  a prerequisite for going public, not a nice-to-have.
- **Complexity.** This is a 5–10× increase in moving parts over v1. Phases 1–2 must stay shippable on
  their own or this stalls half-built.

---

## 7. Phasing

Each phase ends with something demonstrable.

| Phase | Deliverable | Notes |
|---|---|---|
| **0. Foundations** | `TripBrief` schema, Claude client, structured outputs, one grounded tool (Open-Meteo) end to end | Proves the pattern. Deletes `parseAiJson`. |
| **1. Grounded specialists** | Agents 1–4 with real data, still rendering v1's timeline | The "no more hallucinated places" milestone |
| **2. Parallel + durable** | Workflows fan-out, Composer, Critic, WebSocket progress | The multi-agent system genuinely exists |
| **3. Workspace UI** | Block registry, brief panel, activity strip, MapLibre map | The product stops looking like a chat app |
| **4. Direct manipulation** | Drag/reorder/lock/swap, edit-brief-and-reconverge | The thing chat can't do |
| **5. Hardening** | Rate limiting, caching, CORS, real identity, tests | Backlog items 8–11 land here |

Phase 0–1 is where I'd start, and it's worth doing even if you later reject the rest of this plan —
grounding improves v1 as it stands.

---

## 8. Decisions made (2026-09-26)

1. **Models — all Workers AI.** Zero marginal cost. Stay on
   `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with JSON Mode; code-orchestrated tools rather than LLM
   function calling. See §5.
2. **Grounding — keyless sources only.** Open-Meteo, Wikivoyage, REST Countries, OSM. No flights
   (Duffel) and no events (Ticketmaster) in v2. Each source sits behind a tool interface, so adding a
   keyed source later is a contained change, not a rewrite. The product is "plans trips, doesn't book
   them" and the UI must not imply otherwise.
3. **Evolve in place, on a branch.** Not a parallel `worker-v2`. Reasoning below.
4. **Map — MapLibre GL + OSM tiles.** Free, no key.

### Why evolve rather than rebuild

At ~1,500 lines, a parallel `worker-v2/` would double the wrangler configs, deploys, Durable Object
namespaces and CI surface while sharing most of its code with v1 — and it creates a migration problem
later that a branch does not. The genuinely reusable parts (CORS and response helpers, the
`UserMemory` DO, Unsplash photos, the whole frontend shell and design system) all carry forward
unchanged.

What v2 needs is not a new deployment target but an **internal restructure** of the existing worker:

```
worker/src/
├── index.ts              # thin router, unchanged in shape
├── agents/               # NEW — one file per specialist, each: fetch → schema → reason
│   ├── destination.ts  climate.ts  places.ts  food.ts  logistics.ts  budget.ts
│   ├── compose.ts      critic.ts   intake.ts
├── tools/                # NEW — grounded data sources, no LLM involved, unit-testable
│   ├── overpass.ts  openMeteo.ts  wikivoyage.ts  restCountries.ts  unsplash.ts (moved)
├── schema/               # NEW — TripBrief, UIBlock, per-agent JSON schemas
├── workflow.ts           # becomes the fan-out orchestrator
└── memory/, utils/       # unchanged
```

`tools/` having no LLM dependency is the point: those are ordinary async functions that can be tested
without spending a single neuron, which is what makes the grounding claim verifiable.

**Branch strategy:** work on `v2`, keep `main` deployed and working throughout. Merge when Phase 3
lands and the workspace UI is demonstrable. If v2 stalls, `main` is untouched and still live.

---

## Sources

- [Cloudflare Agents](https://developers.cloudflare.com/agents/) · [Agents SDK repo](https://github.com/cloudflare/agents) · [Project Think](https://blog.cloudflare.com/project-think/)
- [Cloudflare Workflows — durable agents](https://developers.cloudflare.com/workflows/get-started/durable-agents/) · [Workflows GA](https://blog.cloudflare.com/workflows-ga-production-ready-durable-execution/)
- [Workers AI model deprecations, May 2026](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/) · [Workers AI models](https://developers.cloudflare.com/workers-ai/models/)
- [Amadeus self-service shutdown](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers) · [Migration alternatives](https://www.tripgic.com/playbook/amadeus-self-service-api-alternatives/)
- [Generative UI patterns](https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026) · [awesome-generative-ui](https://github.com/narrowin/awesome-generative-ui)
- [Open-Meteo](https://open-meteo.com) · [Wikivoyage API](https://enterprise.wikimedia.org/project-data/wikivoyage-api/)
- Product references worth a look: Mindtrip (chat over a map workspace), Trip.com Trip.Planner (canvas editing with a floating AI assist), iplan.ai (map + reorderable timeline)
