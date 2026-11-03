# Tests

Everything in this folder was written by **Claude Code**, not by the author of `algorithm/`.

The algorithm itself — `algorithm/priority.ts` and `algorithm/schedule.ts` — was designed, written, and debugged by hand by the project's author; Claude's role there was limited to reviewing and flagging issues, never writing the solution. These tests are different: they're verification tooling, written after the fact to turn the manual testing that happened during development (hand-picked edge cases, a randomized fuzz test, specific regression cases for bugs that were found and fixed) into something anyone can actually run, rather than just read about in `algorithm/documentation/` and `algorithm/issues/`.

Tests exercise the algorithm only through its public API (`priority()` and `schedule()`) — the internal helper functions aren't exported, and that's intentional on the author's part, not a testing limitation.

Run with:

```bash
pnpm test
```
