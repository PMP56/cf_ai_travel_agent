---
description: Summarize where the project stands and propose the next step
---

Get me back up to speed on this repo.

1. Read `CLAUDE.md`, `docs/PROGRESS.md`, and the top of `docs/ARCHITECTURE.md`.
2. Find the date of the newest entry under "Session log" in `docs/PROGRESS.md`, then run
   `git log --oneline --since=<that date>` and `git status --short` to see what changed since.
   If the tree is dirty, run `git diff` and read the actual changes.
3. Tell me, in under 15 lines:
   - where we left off, and what changed in the repo since that session log entry
   - anything in the working tree that is uncommitted
   - whether anything in "Status: broken" or the top 3 backlog items has since been fixed
4. Propose one concrete next step with the specific files it would touch. Do not start it.
