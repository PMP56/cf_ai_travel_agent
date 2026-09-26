# Field Guide

![Field Guide](travel-agent.png)

A travel planner where **nothing is invented**. Seven agents run over real sources — Wikipedia,
Wikivoyage and the ECMWF ERA5 climate archive — and every place in the resulting itinerary carries
its coordinates, its photograph and a link to where it came from.

Built on Cloudflare Workers with Workers AI. No API keys: every data source is keyless.

> Live at https://travel-agent-111.pages.dev/

## Why it is not a chatbot

A chat app answers, then forgets. Ask it for ten days instead of seven and it re-reads your sentence
and produces a different trip.

Here the request becomes a **brief** — a structured object that stays on screen. Change one field
and only the affected agents re-run, so the plan converges instead of drifting. The itinerary is a
document you rearrange directly, not a message you argue with.

## The agents

Six specialists fan out in parallel, wrapped by three sequential stages:

| Agent | Grounded in | Job |
| --- | --- | --- |
| Intake | — | Free text to a typed `TripBrief` |
| Destination | Wikivoyage | Overview, transport, safety, etiquette |
| Climate | ERA5 archive | Five-year normals for every month |
| Places | Wikipedia | Real POIs ranked by pageviews |
| Food | Wikivoyage | Local dishes and how eating works |
| Composer | geometry | Groups places by location, orders each day |
| Critic | the plan | Rejects impossible days before you see them |

Two rules make the output trustworthy:

**Agents reason over fetched data, never recall.** Each specialist gets real text or real numbers
and interprets them. The climate agent does not remember what April is like in Kyoto; it reads
measured normals.

**The model selects, it does not name.** The places agent picks by *index* from a list of real
geocoded candidates, so every coordinate on the map came from a source. A hallucinated place is
structurally impossible.

## Architecture

```
frontend/  React 19 + Vite + Tailwind 4 + MapLibre
    │  POST /api/v2/stream  (Server-Sent Events)
    ▼
worker/
├── pipeline.ts     orchestration; emits progress per agent
├── agents/         one per specialist: fetch → schema → reason
├── tools/          keyless data sources; no LLM, unit-tested
├── schema/         TripBrief and the JSON Schemas
└── utils/          structured output, cache, CORS, rate limiting
```

`tools/` has no model dependency, which is what makes the grounding claim testable: those functions
are exercised in CI without spending a single neuron.

Deeper detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); status and backlog in
[docs/PROGRESS.md](docs/PROGRESS.md).

## Running it

```bash
# backend — needs a Cloudflare login; Workers AI has no local emulation
cd worker && npm install && npx wrangler login && npx wrangler dev

# frontend
cd frontend && npm install && cp .env.example .env && npm run dev
```

Or skip the backend entirely: **"see a finished plan"** on the home page renders a complete sample
from real data, with no network call.

### Checks

```bash
cd worker   && npm run typecheck && npm test   # 63 tests
cd frontend && npm run lint && npm test        # 16 tests
```

## The cost ceiling, stated plainly

One plan is seven model calls, about **1,450 neurons**. The Workers AI free tier is 10,000 a day —
roughly **seven plans**, and `wrangler dev` spends the same allowance as production. Past that the
app says so and tells you when it resets.

The Workers Paid plan ($5/month) removes the cap; a plan then costs about **1.6 cents**.

## API

### `POST /api/v2/stream`

Server-Sent Events. Takes either `{ "message": "a week in Kyoto in April" }` or an edited
`{ "brief": TripBrief, "place": ResolvedPlace }`, which skips intake and re-plans against the same
intent.

Emits `agent:start`, `agent:done`, `agent:failed`, `brief`, then `complete` with the full result.

### `POST /api/v2/brief`

The same pipeline as one JSON response, for scripting.

Both are rate limited to five plans per minute per IP.

## Sources

[Wikipedia](https://en.wikipedia.org) · [Wikivoyage](https://en.wikivoyage.org) ·
[Open-Meteo](https://open-meteo.com) (ERA5) · [OpenStreetMap](https://www.openstreetmap.org) ·
[MapLibre](https://maplibre.org)

## License

MIT
