## This is a log of issues faced during building the priority algorithm.

**Side note:** I used claude mainly for finding and flagging flaws in my logic and for running tests with random but meaningful numbers, occasionally suggesting possible directions but never the solution. Every logic and solutions are my own, albeit some are from searching on google e.g normalisation formulas in issue 1, reading about others conclusions like the "minimizing the number of late jobs" problem in issue 2.

1. **Comparing 2 derived values for determining priority:**
   Currently I have the result of both the importance, which is simply a range of 1-5, and the result for urgency calculation which gives wide ranges of value. I'm trying to compare the two values (importanceValue and urgencyValue) in a meaningful way, to calculate the value for priority.

   **My solution:** I decided to work on a way to normalise the two values to always be less than 1 and greater than 0. This way it's more like comparing apples to apples, which allows me to add weights to importance and urgency values the final equation, which I can then fine-tune to give either importanceValue or urgencyValue more importance in determining priority. Also now I have control over the range of the final score for priority, knowing the value always ranges between >0 and 1.

---

2. **The "minimizing the number of late jobs" problem:** should the goal be to minimize backlog or prevent a backlog from forming?

   I'm wondering which should have more weight, an overdue task or (a task that's close to be due or is due today).
   If I focus on working on overdue task, that means more tasks are likely to get overdue, but each overdue task would spend less time overdue, but the goal of a scheduler is to get tasks done before they are due. So do overdue tasks have more weight or less? Because on the flip side, if the focus is on completing before due, there'll be less deadline broken, but the already-broken deadline would remain overdue for longer before being completed.

   Of course it's not that simple, a task that takes 5 minutes to complete but is overdue, does it have more or less weight than a task that takes 3 hours but is due in 3 days? Does how long it takes to complete the task matter more, or is it simply another factor to weigh?

   **My solution:** I came to the realisation that the job of this scheduler is for a task to be completed before its due date, so task passed its due date should be treated as an outlier and removed from the equation, so my solution was simply to filter out overdue tasks, and flag for user to manually add them into the calendar as a fixed slot.

---

3. Should tasks that have passed its due date be given a grace period buffer?

   The issue was if a task was due at 11:59pm, should it automatically be moved into overdue pile by 12:01 if not completed in time? or should it be given a grace period buffer, let's say 30 minutes passed it due time, but the issue now is does the system treat the extra time as part of the due time? does the user see this extra time or what?

   **My solution:** Originally I thought perhaps this grace period is to be for only tasks that are in_progress state, if a task is in done state, it's automatically filtered from the pool of tasks, and if a task is in todo state then it isn't given any grace period at all.
   But the issue now is, if a user then starts an overdue card right after it's overdue, and change the state to in_progress, the scheduler would have to re-add it to the pile. Then we are back to the issue from earlier, which takes more priority, overdue or close to be due tasks?
   So my conclusion is same as before with better clarity, user should manually fit the slot, the reason is the point of the scheduler is to try and minimise the number of tasks that become overdue, its design is prevention not cure.
   I may have to revisit this later if I want this to also be used to act as a cure, as of now (v1), the algorithm is only given 1 objective. Also the user would most likely continue even if the scheduler marks the task they are doing as overdue, it doesn't forcibly stop them, and then when done, user can just mark the task as done in the overdue pile. The key point is this is simply a recommendation algorithm.

---

4. How should a task with the same due date, importance and estimated time be ranked?

   The issue is if multiple tasks have all 3 which are equal then priority would be equal, how does the algorithm decide which to take a greater priority?

   **My solution:** I originally thought, how about adding due day with time, but then issue comes what if they also share due time. My conclusion was simple, first come first serve. I decided to give each task a createdAt timestamp, and give higher priority to task created first. Due day with time factor will remain, and will replace due day as now it's redundant. Also this fix solves the issue even if all 3 values are different from the other task but has the same priority value.

---

5. **Deciding what drives urgency:** Should urgency be pace-driven or deadline-proximity-driven?

   The issue is I was trying to decide, should a task that's due in 3 days be given more priority than a task due in 30 days if it (30 days task) has a higher urgency value (i.e the pace needed to complete it, is greater than that of the task due in 3 days)?

   You could argue that the closer the task is, the more urgent it is, even if its pace is less because there's less time till its deadline? -> Deadline-proximity-driven

   On the other hand, shouldn't more urgency be given to the task with a much higher needed pace, because of how much time it needs to complete it before its deadline? -> Pace-driven

   **My solution:** I had thought of giving deadline-proximity a greater urgency by using an Inverted Logistic Sigmoid Function, where 3 days in minutes would be the inflection point (i.e the point urgency gets a boost).

   `y = H / (1 + Math.exp(-k(i - x)))`

   H -> starting value

   k -> the control factor. Right at the inflection point, urgency is always exactly H/2, regardless of k. Moving toward due (past the inflection point), a higher k pushes urgency up toward H more sharply; moving further from due, a higher k pushes urgency down toward 0 more sharply. A lower k does the same thing in both directions, just more gradually - urgency climbs and falls more slowly on either side of the inflection point instead of jumping sharply right at it. I chose 0.0001, since even small-looking k values (e.g. 0.01) still produced an almost-instant jump at this scale.

   i -> inflection point, where there's a sharp drop. I chose 4320 mins (3 days) for this value.

   x -> the remaining time till due in minutes.

   then: `paceNeeded = estimatedTime * y`.

   But I realised that this creates a bug, this scheduler isn't created once and saved, but recomputed on every view. This means that the moment a task reaches 3 days, the entire schedule changes to match the sudden change in urgency, so the schedule you saw when it was 4 days due, would be different from 3 days due. And most likely, the schedule will continuously change daily assuming everyday a task reaches 3 days due, resulting in an inconsistent calendar.

   So I had to test the other choice being pace-driven using a linear function after testing and comparing to Power-law and half-life functions, although it is now possible that a task due in 30 days could have a higher urgency value compared to a task due in 3 days. Weighing the tradeoffs of both, the pace-driven seems to be more manageable and most importantly predictable, predictability being the deciding factor between both options due to the schedule being recomputed on every view, this is to allow for the schedule to auto-complete after every change and to be consistent.

   The linear function was chosen for its simplicity and its smooth reduction compared to the other two options.

   `y = 1 + k * x`

   k -> the control factor, controls how fast paceNeeded drops as x grows, larger k makes it drop faster. I chose 0.0001.
   x -> the remaining time till due in minutes.

   then: `paceNeeded = estimatedTime / y`.

---

6. What should have more weight in overdue tasks urgency score, how long since it was due or the estimated time to complete the task?

   If more weight is given to time-since-overdue (k), then the issue is more time could end up being spent on tasks far overdue and new tasks with short time could end up piling up.

   If more weight is given to estimated-time (p), then the issue is more time may be given to newly overdue tasks and older tasks may never be reached if new overdue tasks with short estimated time keeps coming in.

   So the question I asked myself: if the point of the scheduler, as raised in issue 3, is that the scheduler's job is to prevent as many tasks from going overdue, shouldn't the other side (i.e the overdue tasks) job be to focus on curing?

   **My solution:** the goal this time is to try and minimise the number of overdue tasks (i.e cure) rather than try to prevent, so the goal is to do the most tasks in the least possible time. Which means tasks with lower estimated time will be given a greater urgency relative to how long since overdue. This is similar to Shortest Processing Time (SPT) scheduling but differs as my logic also is influenced by the time since the task was overdue. As of the time writing this, i set the value for k to roughly be a week-long window where quick wins take priority over old tasks.

   I did some more research and found out about Moore-Hodgson-style reasoning but where my logic differs (i.e in determining final priority scoring, not just urgency as above) is that unlike Moore-Hodgson-style reasoning, the final priority score is also influenced by importance. This led me to believe my logic is backed, although others may disagree with my conclusion.

---

7. A bug with task priority caused by importance score:

   I found a bug where a task due in 3 days with estimated time of 60 minutes and the highest importance value is given a higher priority score than a task due in 1 hour with an estimated time of 60 minutes and the lowest importance value.

   So my first conclusion was to reduce the value of IMPORTANCE_WEIGHT, but that didn't fix the issue until it was close to 0.02, which is basically saying importance has no influence at all, which was wrong. I realised it's because the reduction affects both high and low importance equally and because the urgency ceiling was significantly smaller compared to importance due to daily capacity. The ceiling for urgency was 0.111 given a 60 minutes estimated time and a daily capacity of 8 hours. so for the value to get anywhere close to 1, there needed to be an absurd amount for estimated time, whereas the lowest importance score had a value of 0.2.

   My second idea was merging the importance equation into the urgency formula, but then I realised that means giving up independent tuning for the influence of the values importance and urgency. Also there's a risk of overcorrecting and resulting in the opposite problem.

   **My solution:** Going back to my first idea, the idea is to raise the urgency ceiling rather than try to bring down the importance value.

   After trying different approaches, like:
   - changing the value of k alone (The constant k determines how much weight is given to the differences between 2 due dates.),
   - multiplying the final urgency value by a constant to raise urgency over importance.
   - shrinking the value of daily capacity by a constant, but even at the extreme, although it raised the ceiling, it added the risk of the saturation-collision problem, that is the value of urgency for 1 hour and 3 days could both end up getting close numbers near the ceiling etc.

   I found the best solution was simply dampening the value for daily capacity by a constant q, giving it a value below 1, in order to raise the urgency ceiling. But that was only one part of the solution, the difference in urgency between 2 due dates was still low, so the constant k needed to be raised as well. I tested different values for this and found the value 0.2 worked best for q, as well as increasing the value of constant k, from 0.0001 to 0.05.
