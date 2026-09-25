# Scheduler — Scheduling / Slotting System

This documents the scheduling/slotting half of the scheduler (`algorithm/schedule.ts`) — how a prioritized task list actually gets placed into real calendar time. For the full chronological reasoning trail behind every decision here, see `../issues/scheduling-issues.md`. For how each task's priority score is computed before it ever reaches this file, see `priority.md`.

## Design principles

Same as the priority system (see `priority.md`): pure functions (`now`/`dateTimeNow` always passed in, never read from the system clock), deterministic and rule-based (not ML), best-effort rather than an exact solver — true optimal task scheduling under real-world constraints is NP-hard, so this deliberately leans on classic, well-understood heuristics (interval merging, gap-finding, bin packing) rather than searching for a perfect solution.

## Pipeline overview

`schedule()` runs in five stages:
1. **Priority-sort** every task (via `priority()` from `priority.ts`), tie-broken by `createdAt` ascending.
2. **Bound the horizon** — compute `maxDayCount`, the number of days from today through the furthest due date among the current tasks. The function never needs to reason about time beyond that.
3. **Bucket fixed tasks by day**, then compute each day's free time.
4. **Flatten** all days' free time into one list of dated slots.
5. **Place tasks** into slots, highest priority first, mutating the slot list as capacity gets consumed so lower-priority tasks never double-book already-claimed time.

## `uniqueTimeRange(fixedTimeRange)`

Classic **interval merging** (the "merge overlapping intervals" problem): sorts fixed time ranges by start time, then walks through tracking the highest end-time seen so far, merging any range that overlaps or is contained within a previous one. See `scheduling-issues.md` issue 1 for the original failure traces that led here.

## `freeTimeRanges(usedTimeRanges, now)`

**Interval complement / gap-finding** — the free-time counterpart to the merge above. Given a day's *merged* used (fixed) time ranges, walks through and returns the gaps: before the first range, between consecutive ranges, and after the last range, bounded to `now`'s calendar day (`00:00:00.000`–`23:59:59.999`). Returns `null` if there are no used ranges at all (handled by the caller as "fully free day" — see below). See `scheduling-issues.md` issue 4.

## `allowedFreeTime({ fixedTime, dailyCapacity, capacityOverflowPercent, now })`

**Bin packing** (First-Fit Decreasing, refined to Best-Fit) plus a **percentage-based overflow cap**. Takes a day's fixed time ranges (including sleep) and returns the time ranges actually available for scheduling, capped at `dailyCapacity` hours plus an allowed overflow.

- **Fully free day** (`fixedTime.length === 0`): returns one slot from midnight to `ceil(dailyCapacity + overflow)` hours — deliberately *rounded up*, as a small bonus for days with nothing else on them.
- **Otherwise**: merges and inverts the fixed ranges (via the two functions above), sorts the resulting free ranges by size descending, then greedily fills a running total up to `dailyCapacity`. If the next range would overflow the cap, it's truncated to fit within `capacityOverflowPercent` of allowed overflow (or admitted whole if the overflow is within that allowance).

The overflow percentage subsumes an earlier strict-vs-loose design debate: `0%` behaves strictly, any positive value behaves progressively looser. See `scheduling-issues.md` issues 4 and 5.

## `schedule({ tasks, fixedTask, dailyCapacity, capacityOverflowPercent, dateTimeNow, now })`

The orchestrating function. `dateTimeNow` feeds `priority()`; `now` feeds the day-bucketing and free-time math — both must be supplied by the caller (never read from the system clock internally), per the pure-function principle above.

### Day-bucketing and free time

Fixed tasks are grouped by which day (`0` = today, `1` = tomorrow, etc.) they fall on, then `allowedFreeTime` is run once per day up to `maxDayCount`, using that day's own midnight (`now` advanced by the day's offset) as its anchor — **not** a single shared `now` reused for every day. Getting this offset wrong was a real, confirmed bug during development: every day's "fully free" slot collapsed onto the same real calendar timestamp, causing tasks assigned to different logical days to land on the exact same real time and overlap. Confirmed via a direct dump of the per-day free-time output and fixed by threading a per-day-advanced date through instead of one shared reference.

**Known open gap:** a fixed task whose `.start` and `.end` fall on different calendar days (crossing midnight) is only ever bucketed under its start day — the day containing its `.end` has no record of it at all, and can incorrectly treat that time as free. `scheduling-issues.md` issue 2 already established the intended fix for this (split any such entry into two same-day pieces at the midnight boundary — this is how sleep, which naturally crosses midnight, is meant to be represented) — but that splitting is **the caller's responsibility**, not this file's. `schedule()` assumes every `fixedTask` entry it receives is already confined to a single calendar day; it does not defend against or repair one that isn't.

### Placement loop

Tasks are processed strictly in priority order. For each task:
1. Candidate slots are filtered to those that fall entirely before the task's due day, or on the due day but ending no later than the task's due time — then sorted by size ascending.
2. **Best-Fit**: the smallest candidate slot that still fully fits the task is used directly.
3. **Split fallback**: if no single slot fits, the task is packed largest-slot-first across as many slots as needed. This is checked speculatively first — chunks are only committed (pushed to the result and only then subtracted from the live slot list) if the task's *entire* duration is accounted for. A task that can't be fully split goes to `unscheduledTasks` with no partial time held against it, rather than leaving orphaned partial placements that would waste shared capacity other tasks could have used.
4. **Slot consumption tracking**: after a task claims time from a slot, that slot's remaining time is reduced (or the slot removed entirely) *in the live slot list*, not a disposable per-task copy — otherwise a lower-priority task processed afterward would see stale, already-claimed capacity as still free and double-book it. A `10`-minute buffer is reserved after each placed task before the remainder of a slot is offered again; if what's left after that buffer is under a `15`-minute floor, the slot is dropped entirely rather than kept alive as an unusably small sliver.

### Bugs found and fixed during review (for the record)

A few bugs surfaced during testing that are worth keeping a record of, since they're the kind of subtle JS/TS mistake that's easy to reintroduce:
- **Unit mismatches and `.forEach()`-instead-of-`.find()`** in early versions of the Best-Fit selection turned it into Worst-Fit without erroring.
- **Mutation-order corruption**: a slot object and its corresponding entry in the live slot list are the *same object reference* (since `.filter()`/`.sort()` don't clone). Mutating a slot's `.start` before reading `.start` for the placement record (rather than after) silently produced records where `end` came before `start` — caught via a targeted trace reproducing the exact negative-duration output, not just inferred from reading the code.
- **Reading the system clock instead of the passed-in `now`**: multiple `new Date()` calls inside the free-time functions bypassed the deterministic-input principle and silently broke any run where the real current moment differed from the intended scheduling reference point.

All of the above are fixed and verified — confirmed via a hand-picked edge-case suite (empty input, forced multi-day splits, zero capacity, overlapping fixed tasks, exact-boundary due times, high-contention same-day scheduling, multi-day horizons) plus a 2000-run randomized fuzz test checking for crashes, overlapping placements, negative durations, lost/double-counted tasks, and correct total scheduled time per task — all clean, under the contract that fixed tasks never cross midnight (see the open gap above).

## Return shape

```
{ unscheduledTasks: Task[], scheduledTasks: { taskId, start, end }[] }
```

or `null` if given an empty task list. `unscheduledTasks` holds full `Task` objects (not just IDs) since the caller needs the complete task to decide what to do next (e.g. surface it for manual placement); `scheduledTasks` is a flat list of placement records, potentially several per task if it was split across multiple slots.

## Explicitly out of scope for this phase

- **Recurrence expansion** — turning a recurring task/event definition into concrete per-occurrence entries is an upstream concern; `schedule()` only ever sees already-expanded, concrete tasks and fixed tasks.
- **Splitting midnight-crossing fixed tasks** — see the open gap above; this is the caller's responsibility, matching the recurrence-expansion boundary.
- **Time-of-day preference** (e.g. "I prefer doing tasks at night") — tracked as a future direction in `../issues/open-issues-&-improvement.md`, not implemented here.
