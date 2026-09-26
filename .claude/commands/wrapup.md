---
description: Update PROGRESS.md, audit CLAUDE.md, and propose a commit message
---

Close out this session.

1. Run `git status --short` and `git diff` to see exactly what changed in this session.
2. Update `docs/PROGRESS.md`:
   - Add a new "Session log" entry at the top of that section, dated today, 2-4 lines.
   - Move anything completed out of Backlog and into Status → Done. Add anything newly discovered.
   - Add a row to the Decision log for any non-obvious choice made this session, with the why.
   - Resolve or update any Open question this session answered.
3. Audit `CLAUDE.md` against the current code: check that every path in "Repo map" still exists,
   every command in "Commands" is still correct, and no Gotcha has been fixed. Report anything now
   wrong and fix it.
4. Run the checks for whatever was touched: `cd frontend && npm run lint && npm run build`,
   and/or `cd worker && npx tsc --noEmit`. Report failures rather than papering over them.
5. Propose a commit message in this repo's style (`ADD: ...`, `UPDATE: ...`, `fix: ...`).
   **No attribution trailers** — no `Co-Authored-By`, no "Generated with Claude Code", no 🤖 line.
   Prashanna is the sole committer. Print the message for him to use; do not run `git commit`.
