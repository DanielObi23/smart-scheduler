# Scheduler — Priority Ranking System Documentation

This documents the priority-ranking half of the scheduler (`lib/input.ts`) — how tasks are scored so they can be ordered before the scheduling/slotting phase (a separate, not-yet-built phase). For the full chronological reasoning trail behind every decision here, see `issues.md`.

## Design principles

- **Pure functions, no hidden state.** Nothing in this file calls `Date.now()` internally — the current time (`now`) is always passed in as a parameter, exactly like `estimatedTime` or `dueDateTime`. This guarantees the same inputs always produce the same output, which is what makes it safe to recompute every task's priority on every calendar view instead of storing a stale precomputed value.
- **Deterministic, not machine-learned.** This is a rule-based/mathematical scheduling algorithm (in the same family as classic scheduling heuristics like SPT and Moore-Hodgson), not an ML model — there is no training or learned behavior anywhere in this file.
- **Best-effort, not exact.** True optimal task scheduling under real-world constraints is NP-hard; this system deliberately uses fast, well-reasoned heuristics rather than an exact solver.

## `importance(importanceScore)`

Converts a 1–5 importance rating (1 = most important) into a normalized `0–1` score:

```
importance = (6 - importanceScore) / 5
```

Score 1 → `1.0` (most important). Score 5 → `0.2` (least important — deliberately never reaches exactly `0`, since even the lowest-importance task still has some weight).

## `urgency(estimatedTime, dueDateTime, now, dailyCapacity)`

Computes urgency for **not-yet-due** tasks only. Overdue tasks never reach this function — see `overdueUrgency` below.

```
minsUntilDue = (dueDateTime - now) in minutes
paceNeeded   = estimatedTime^p / (1 + k * minsUntilDue)
urgencyValue = paceNeeded / (dailyCapacity_in_mins)^q
urgency      = urgencyValue / (1 + urgencyValue)      // squashed to (0, 1)
```

**Why pace-driven, not deadline-proximity-driven:** an earlier design used an inverted logistic sigmoid centered on a fixed "days until due" cliff (e.g., a sharp jump in urgency at the 3-day mark). This was rejected — because priority is recomputed on every calendar view (not computed once and cached), a hard cliff means the entire schedule could visibly reshuffle overnight, every time any task crossed that threshold. The current pace-based formula decays smoothly instead, so recomputation never produces a jarring jump.

**Parameters:**
- **`k`** — decay rate. Controls how much urgency differs between two different due dates (e.g., 5 days vs. 30 days out). Chosen via testing against realistic due-date ranges rather than guessed.
- **`p`** — currently `1`, meaning `estimatedTime` fully participates in the pace calculation (deliberately "fully pace-driven" — see the "Known bug and fix" section below for why this differs from `overdueUrgency`'s `p`).
- **`q`** — dampens how strongly `dailyCapacity` shrinks the denominator (see below).

### Known bug and fix: urgency couldn't compete with importance

**The bug:** a task due in 1 hour with the *lowest* importance score could lose in final priority to a task due in 3 days with the *highest* importance score — purely because urgency's practical ceiling was mathematically far below `1`, while importance easily spans nearly its full `0.2–1.0` range.

**Root cause, precisely:** `paceNeeded` can never exceed `estimatedTime` (the `1 + k*x` denominator is always `≥ 1`). Dividing that by the *entire* day's capacity (e.g., 480 minutes for an 8-hour day) means a single ordinary task's raw ratio is almost always small (`estimatedTime / dailyCapacityMins`), so even the best-case urgency (due immediately) rarely approaches the ceiling the squashing function is capable of reaching. This isn't a bug in the squashing function itself — it barely compresses small inputs at all; the smallness is baked in *before* squashing ever runs.

**Approaches ruled out** (with numeric confirmation, not just reasoning):
- **Reducing `IMPORTANCE_WEIGHT`** — worked only at extreme values (~2% weight), which effectively deletes importance as a factor rather than rebalancing it.
- **Increasing `k`** — proven, not just observed, to never work: as `k → ∞`, every task's urgency collapses to `0`, so both tasks converge to their pure-importance floors — and the lower-importance task's floor is always below the higher-importance task's floor, regardless of `k`.
- **Multiplying the final urgency value by a constant** — mathematically identical to increasing `URGENCY_WEIGHT`; the constant needed (~22x) pushes urgency values past `1` for nearly all tasks, breaking the `0–1` comparability the whole system depends on.
- **Merging importance and urgency into one interacting equation** — technically capable of solving it, but sacrifices independent tuning of the two signals and risks overcorrecting into the opposite problem (urgency always dominating regardless of importance).

**The fix:** two changes combined (neither alone was sufficient):
1. Increase `k` enough to create real separation between near-term and far-term raw urgency (previously, "due in 1 hour" and "due in 3 days" produced almost the same raw value).
2. Dampen the daily-capacity term with an exponent `q < 1` (`dailyCapacityMins^q` instead of the raw value), raising urgency's achievable ceiling without removing capacity from the calculation entirely.

Current values: `k = 0.05`, `q = 0.2`. Verified against: the original bug case (now correctly resolved), same-importance near-vs-far comparisons (nearer task still wins), and the deliberately-accepted "large far-out task can outrank a small near-term one" pace-driven behavior (still holds, matches the original design intent — see `urgency` design rationale above).

## `overdueUrgency(estimatedTime, dueDateTime, now)`

Ranks tasks that have **already** passed their due date. These tasks are removed from the automatic scheduling pool entirely (the scheduler's job is prevention, not cure) and shown in a separate manually-placed list, ranked by this function.

```
minsSinceOverdue = (now - dueDateTime) in minutes
paceNeeded       = estimatedTime^p / (1 + k * minsSinceOverdue)
urgencyValue     = 1 / paceNeeded
overdueUrgency   = urgencyValue / (1 + urgencyValue)
```

**Design goal:** minimize the *number* of overdue tasks (a "cure" objective, complementing the main pool's "prevention" objective) — similar in spirit to Shortest Processing Time (SPT) scheduling, but differing from pure SPT by also weighing time-since-overdue (via `k`), so an old neglected task can't be buried indefinitely by a stream of smaller, newer overdue tasks. Also related to Moore-Hodgson-style reasoning (minimizing the count of late jobs), but differs there too — final priority for overdue tasks still factors in importance (via the shared `priority()` combination below), which neither SPT nor Moore-Hodgson considers.

**Parameters:**
- **`k`** — controls the magnitude of difference between different amounts of time-since-overdue (e.g., 5 days vs. 30 days overdue).
- **`p`** (currently `0.3`) — dampens how much `estimatedTime` affects urgency independently of `k`. Without dampening, urgency would be exactly inversely proportional to task size, letting a 5-minute task outrank a 1000-minute task by ~200x purely from size — `p < 1` compresses that swing while preserving the intended direction (shorter tasks still rank slightly more urgent, matching the "clear quick wins first" cure objective).

Verified via a starvation test: at the current constants, a 3-hour task overdue for 14+ days outranks even a constantly-refreshed 5-minute freshly-overdue task — confirming quick wins are favored short-term, without letting old tasks be buried indefinitely.

No `dailyCapacity` term here — overdue tasks aren't part of automatic scheduling, so there's no "does this fit in today's capacity" question to answer.

## `priority(...)`

Combines importance and urgency (using the correct urgency function depending on whether the task is overdue) into one final score:

```
priority = IMPORTANCE_WEIGHT * importance + URGENCY_WEIGHT * urgency
         + IN_PROGRESS_WEIGHT   (only if overdue AND state === "in_progress")
```

- **`IMPORTANCE_WEIGHT = 0.45`, `URGENCY_WEIGHT = 0.55`** — urgency weighted slightly higher, since getting tasks done on time matters, and people tend to over-rate importance.
- **Overdue routing**: determined internally via `now > dueDateTime` — not passed in as a separate flag, so there's no risk of a caller's flag disagreeing with the actual dates.
- **`in_progress` bonus (`IN_PROGRESS_WEIGHT = 0.05`) applies only to overdue tasks.** It was originally applied to all tasks, but since priority is recomputed on every view, a bonus that applies to the *auto-scheduled* pool would cause the calendar to visibly reshuffle the instant a user changes a task's state — the same class of instability problem that ruled out the deadline-proximity sigmoid. Restricting the bonus to the overdue pool (which is manually placed, not auto-slotted) avoids this: a ranking change there just reorders a suggestion list the user is already choosing from, rather than silently moving something already committed to the calendar.
- **`done` tasks never reach this function** — they're filtered out of the candidate pool before scheduling entirely (assumed to happen upstream; not enforced inside this file).

## `tieBreaker(tasks)`

When multiple tasks land on the exact same priority score, orders them by `createdAt` (oldest first) as a deterministic fallback. Sorts in place — acceptable here since it operates on a small, transient tied-subset with no other holder of that reference, not a long-lived shared array.

## Data stored per task

Only what's needed to recompute priority on demand:
1. Importance value (1–5)
2. State (`todo` / `in_progress` / `done`)
3. Estimated time to completion (minutes)
4. Due date + time (a single timestamp — not split into separate date and time fields)
5. Creation timestamp (`createdAt`, used only for tie-breaking)

Nothing else is stored — priority is recomputed fresh every time the calendar is viewed, since it's cheap and fully deterministic.

## Explicitly out of scope for this phase

The following belong to the next phase (scheduling/slotting) and are **not** implemented here:
- Free time / buffer computation
- Fixed and recurring event modeling
- The actual slot-fitting algorithm
- The orchestrating function that ranks a full task list end-to-end (compute priority for every task, group ties, apply `tieBreaker`)

## Notable deferred decisions (see `issues.md` for full reasoning)

- **No grace period for overdue tasks.** The scheduler's design is prevention, not cure (v1 scope) — a task crosses into "overdue" immediately at its due timestamp, with no buffer window. Revisiting this to also act as a "cure" mechanism is a possible future direction, though the overdue pool's SPT-style ranking already partially serves that purpose.
- **Timezone handling for "due today" boundaries** is a known open edge case, not yet resolved.
