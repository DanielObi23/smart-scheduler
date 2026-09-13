# Smart Scheduler — Idea

## Core concept

List out weekly planned tasks with priorities, and a math-based scheduler
— not the LLM — auto-arranges them into your weekly schedule. The LLM's
only job is converting spoken/text input ("hey I have this planned for
this time") into structured data the scheduler can work with; it never
touches the arranging logic, so it can't hallucinate a bad schedule.

Looks back at recent history to inform how future weeks get arranged —
picking up on patterns like which tasks/slots keep getting skipped or
bumped.

## Core features

- Set up weekly tasks, rank by priority, assign time slots so a task
  repeats on that time
- Side-view Kanban board for tasks that need doing (not necessarily
  time-slotted)
- LLM breaks a task down into manageable chunks
- Voice/text input ("I have this planned for this time") parsed into a
  structured task and slotted in
- Completion tracking — mark tasks done / partial / skipped, feeding
  back into how future weeks get arranged (skipped slots/times get
  deprioritized over time)
- Awareness of actual available hours (sleep, work, existing fixed
  commitments) so nothing gets slotted somewhere impossible
- One-off tasks take priority over recurring tasks in a clash, unless
  manually set otherwise
- Higher-priority tasks get first claim on a slot over lower-priority
  ones
- Deterministic tie-break when two tasks share equal priority and want
  the same slot
- Mid-week updates ("I have this planned now") trigger the schedule to
  re-adjust around it

## Angles / features still worth considering

- **Flexible time-blocking for Kanban tasks** — right now tasks can be
  ranked and given a fixed slot, but there's no way to say "block some
  time for this, whenever fits" without picking an exact time yourself.
  Worth a task type that just states a duration/priority and lets the
  scheduler place it, same as a recurring task would be.
- **Flexible weekly quotas** — "3 hours of gym this week, whenever" as
  its own kind of commitment, distinct from a task pinned to a specific
  day/time.
- **External calendar import / sync** — invites or changes that
  originate outside the app (a friend's invite, a shift change) don't
  currently flow in automatically; still requires manual re-entry.
- **Atypical week handling** — a way to flag or exclude an unusual week
  (travel, sick, crunch) so it doesn't skew the completion-pattern
  history going forward.
- **Quick reschedule** — a lightweight "push this 30 minutes" action for
  a single item, rather than re-describing it as a fresh instruction.
- **Notifications/reminders** — not in scope for now (deferred to when
  this becomes a mobile app), but worth noting as a known gap: right
  now the loop is set-it-and-check-the-app, no active nudge.
