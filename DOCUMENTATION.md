# Optimum personal schedule recommender — design log & build plan

This is a best effort fit scheduler, not an exact fit.
designed and implemented a priority-based greedy scheduling heuristic

Tasks -> activities/time blocks ranked by importance (1-5) and urgency (i.e how close it is to the due date and how much time needed to complete the task) to get priority.
based on which it's timeslotted into the calendar (i.e free time).

`pace needed = estimated minutes ÷ days until due`
`urgency = min(1, pace needed ÷ daily capacity)`

estimated time is select by user in the UI, default to 45 mins.

importance is from a scale of 1 - 5, where 1 is highest importance and 5 is lowest importance.

`importance (normalisation) = (N + 1 − x) / N`
`importance (normalisation) = (6 - task's importance)/5 `

Normalising the value: total number of possible choices + 1, minus the chosen choice number, divided by the total number of choices.

Daily capacity -> How much time a user has to do their tasks on a normal day. A value determined by user in hours.

Each task are given 3 states: to-do, in-progress and done.

Done: It's removed from the candidate pool.
In-progress: A value of 0.1 is added to its priority scoring.
To-do: No effect on the task

`priority = w1·urgency + w2·importance`

`Free time (per day) = 24 hours (full time in a day) - fixed time - buffer`

Buffer -> _A random interruption eating into the day_ (e.g stopping for 30 minutes to talk to a friend, stuck in traffic) and _A task running long_ (e.g a coding problem taking 3 hours to complete instead of 2 hours, resolution is padding around estimated time, perhaps 15 to 30 minutes) and _Leisure_ (e.g gaming, hanging out with friends etc.)

The value of buffer will be affected based on the urgency of the tasks to be assigned for that day to a certain floor. i.e

`proposed time = total available time - cap` (or going with a fraction)

`usable/extra time = proposed × (1 − urgency)`. This is equal to proposed time, if no task is due.

`buffer = usable/extra time + cap`

Fixed time -> _One-off event_ (e.g visiting the dentist) and, _Recurring events_ (e.g specific study/exercise time on specific days, church specific time every sunday, work 9-5 monday to friday) and _Daily tasks_ (e.g eating, showering, cooking)

With the time slots determined from fixed time, the remaining time (i.e free time) is then used to schedule based on how well the task fit the slot, either may be split or moved to another open slot during the day and a task that can fit into that slot is moved in there.

Follow this steps (from highest rank task):

1. Fit into the earliest fully accomodating free time slot before due date.
2. If none exists, split into several slots, and the next highest priority follows step 1. This repeats until all slots are filled or all tasks are given a slot.

scan backlog → shrink today's buffer → compute today's free time → place what fits → leftovers roll into tomorrow's backlog → repeat.

On the off chance all tasks cant fit before their due date, it'll be flagged for user to manually add it, then user can then put the slot when they want.

Then tasks are scheduled into the free time based on how long it'd take and the priority.

The tasks are stored in a database to be retrieved for the computation.

What is stored:

1. Importance value (i.e 1-5)
2. Its state: to_do, in_progress, done
3. Its estimated time to completion in mins
4. Its due date time
5. Its creation timestamp

are stored (For fixed/recurring tasks, their time slot are also stored). each time the calendar is viewed, the value is recomputed to be displayed. Reason this is fine, is because the values are deterministic, so same input will always give the same output, and the computation is fast enough to be near instant, this also makes it very easy to change.

Overdue tasks are removed from the pool, unlike done tasks, they are put in a pile, and reorder based on priority. formula goes:

`urgency = (estimated time / (1 / (time since was due + 1)))`

`priority = w1 * importance + w2 * urgency (if state == in_progress, + 0.3)`.

daily_capacity isnt factored in as this is only for ranking

# AI aspect

There will be 2 aspects of LLM use, none of which would be for determining the optimum schedule.

1. Inputing from text, the LLM job is to get all the required information, e.g

User: I have a dental work on saturday,
LLM: What time will this be?
User: at 2pm to 4pm
LLM then uses a tool to add this to the database.

2. Reading the scheduler to help user better schedule or know their schedule

User: I have a dental appointment on tuesday at 2pm.
LLM: (LLM checks that slot is available or not) There's an issue, you have an work at that time, how would you like to schedule it? replace the work time or reschedule the dental appointment for a different day?
User: I think wednesday at the same time.
LLM: Great! That time slot is available, scheduling it in now.

### Stretch goal: the adherence/reliability loop

I am considering omitting this, as it gets significantly more complex if to factor in adherrence.

Optional, second pass after the core algorithm works: track which time-of-day
buckets tasks actually get completed vs. skipped (a rolling window, e.g. 14
days), reduce that to a per-bucket reliability score, and fill free windows
**most-reliable-bucket-first** instead of purely chronologically. This is the
"the plan learns your actual patterns" feature — genuinely nice to demo, but
correctly scoped as v2, not required to prove the core idea.

- **Core is a pure, dependency-free package** — no I/O, no `Date.now()`
  (accept "now" as a parameter, exactly like `compose.ts` does), no
  randomness. Same inputs, same plan, every time. This is what makes it
  trivially unit-testable and is worth calling out explicitly in the README
  as a design decision, not an accident.

## The UI

3 interfaces:

1. A kanban board: to-do, in-progress and done.
2. The calendar
3. LLM chat interface

Interface for selecting estimated time for task completion during creation.

## Mobile

Mobile version would mean all data stored on device storage, no dependency means can run offline. Would need to go online for cloud sync across devices and LLM chat.
