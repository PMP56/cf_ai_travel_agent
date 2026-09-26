---
description: Run every check in both packages and summarize failures
---

Run this repo's full check suite. There are no tests, so these three are the whole gate.

```
cd frontend && npm run lint
cd frontend && npm run build
cd worker && npx tsc --noEmit
```

Run all three even if an earlier one fails. Then:

- If everything passes, say so in one line with the build's output size.
- If anything fails, list each failure as `file:line — what is wrong`, grouped by package, and say
  which are pre-existing (check with `git stash list` / `git diff` whether the file was touched this
  session) versus newly introduced. Propose fixes but do not apply them unless I ask.
