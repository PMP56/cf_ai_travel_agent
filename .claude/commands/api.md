---
description: Start the worker locally and exercise an endpoint end to end
argument-hint: [generate|replace|profile] [message]
---

Exercise the worker's API locally. Endpoint: `$1` (default `generate`). Message: `$2`.

1. Check whether a worker is already listening: `curl -s -m 2 http://localhost:8787/`.
   It should answer "AI Travel Agent Worker is running!". If nothing is listening, tell me to run
   `cd worker && npx wrangler dev` in another terminal and stop — do not start it yourself, since it
   needs a Cloudflare login and holds the terminal.
2. Send the request for the chosen endpoint:

   **generate** (costs 2 Workers AI calls + 1 Unsplash call — send exactly one):
   ```
   curl -s -X POST http://localhost:8787/api/generate \
     -H "Content-Type: application/json" \
     -d '{"userId":"local-test","message":"<$2, or: Plan a week in Paris for $2000>"}'
   ```

   **replace** (needs a plan from a previous `generate` call to fill the fields):
   ```
   curl -s -X POST http://localhost:8787/api/replace-highlight \
     -H "Content-Type: application/json" \
     -d '{"destination":"...","day":"Day 1","currentTitle":"...","allHighlights":[...]}'
   ```

   **profile**:
   ```
   curl -s http://localhost:8787/api/profile/local-test
   ```
3. Validate the response against the types in `worker/src/utils/plan.ts`: every field present and
   non-empty, `highlights` covering Day 1 through the last day with no gaps, same-day highlights
   sharing a byte-identical `date` string (the UI groups on exact equality).
4. Report the destination, the highlight count, the day range, the photo count, and any field that
   failed validation. Do not re-run `generate` to "confirm" a result — each run costs AI quota.
