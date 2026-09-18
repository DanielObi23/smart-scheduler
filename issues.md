1. **Comparing 2 derived values for determining priority:**
   Currently I have both importanceScore which is simply 1-5, but urgency gives wide ranges of value. im trying to compare the two values in a meaningful way, i want the two values to have similar ranges.

   **My solution:** I decided to work on a way to normalise the two values to always be less than 1 and above 0. This way it's more like comparing apples to apples, which allows me to add weights to the comparison equation, which i can then fine tune to give either importanceScore or urgencyScore more importance. And i can have a control of the range of the final score, knowing the value always caps at 1.

2. **The "minimizing the number of late jobs" problem:** should the goal be to minimize backlog or prevent a backlog from forming?

   I'm wondering which should have more weight, an overdue task or (a task that's close to be due or is due today).
   If I focus on working on overdue task, that means more tasks are likely to get overdue, but each overdue task would spend less time overdue, but also the goal of a scheduler is to get tasks done before they are due. so do overdue tasks have more weight or less? On the flip side, if the focus is on completing before due, there'll be less deadline broken, but the already broken deadline would be longer in overdue before being completed.

   Of course it's not that simple, a task that takes 5 minutes to complete but is overdue, does it have more or less weight than a task that takes 3 hours but is due in 3 days? So does how long it takes to complete the task matter more or simply another factor?

   **My solution:** seeing as the job of the scheduler is to fix a task before its due date, tasks passed its due date shouldnt be counted, but rather flagged for user to manually edit into the calendar as a fixed slot.

3. Should tasks that has passed its due date be given a grace period buffer?

   The issue was if a task was due at 11:59pm, should it automatically be moved into overdue pile by 12:01? or should it be given a grace period buffer, let's say 30 minutes passed it due time, but the question is does the system treat the extra time as part of the due time? does the user see this extra time or what?

   **My solution:** Originally I thought perhaps this grace period is to be for only tasks that are inProgress state, if a task is in done state, it's automatically removed and set aside as completed, and if a task is in todo state then it isnt given any grace period at all. But the issue now is, if a user then starts an overdue card right after it's overdue, and change the state to in_progress, the scheduler would have to readd it to the pile. Then we are back to the issue from earlier, which takes more priority, overdue or close to be due tasks? so my conclusion is same as before with better clarity, user should manually fit the slot, the reason is the point of the scheduler is to try and minimise the number of tasks that become overdue, its design is prevention not cure. I may have to revisit this later if i want this to also be used to act as a cure, as of now (v1), the algorithm is only given 1 objective. Also the user would most likely continue even if the scheduler marks the task they are doing as overdue, it doesnt forcibly stop them, and then when done, user can just mark the task as done in the overdue pile. The key point is this is simply a recommendation.

4. How should task with same due date, importance and estimatedTime be ranked?

   The issue is if multiple tasks have all 3 at the same time, how does the algorithm decide which to take priority.

   **My solution:** I originally thought, how about adding due day with time, but then issue comes what if they also share due time. My conclusion was simple, first come first serve. I decided to give each task a createdAt timestamp, and give higher priority to task created first. Due day with time factor will remain, and will replace due day as now it's redundant.

5. **Deciding what drives urgency:** Should urgency be pace-driven or deadline-proximity-driven?

   The issue is I was trying to decide should a task that's due in let's say 3 days be given more priority than a task due in 30 days but has a greater value of urgency if its estimated time over the due time (in this case, 30 days) i.e its pace, is greater than that of the task due in 3 days. You could argue that the closer the task is, the more urgent it is, even if its pace is less because there's less time till its deadline. On the other hand, shouldnt more urgency be given to the task with a much higher needed pace, because of how much time it needs to complete it before its deadline?

   **My solution:** I had thought of giving deadline-proximity a greater urgency by using an Inverted Logistic Sigmoid Function, where 3 days in minutes would be the inflection point.

   `y = H / (1 + Math.exp(-k(i - x)))`

   H -> starting value
   k -> the control factor, larger k makes it drop faster. I chose 0.0001.
   i -> inflection point, where there's a sharp drop. I chose 3\*60 for this value.
   x -> the remaining time till due in minutes.

   then: `paceNeeded = estimatedTime * y`.

   But i realised that this creates a bug, this scheduler isnt create once and save, but recomputed on every view. This means that the moment a task reaches 3 days, the entire schedule changes to match the sudden change in urgency, so the schedule you saw when was 4 days due, would be different from 3 days due. And most likely, the schedule will continuously change daily assuming everyday a task reaches 3 days due, this resulting in an incosistent calendar.

   So i had to test the other choice being pace-driven using a linear function after testing and comparing to Power-law and half-life functions, although it is now possible that a task due in 30 days could have a higher urgency value compared to a task due in 3 days. Weighing the tradeoffs of both, the pace-driven seems to be more manageable and most importantly predictable, predictability being deciding factor between both options.

   And the reason linear function was chosen is because of its simplicity and it smooth reduction compared to the other 2 options.

   `y = 1 + k * x`

   k -> the control factor, larger k makes it drop faster. I chose 0.0001.
   x -> the remaining time till due in minutes.

   then: `paceNeeded = estimatedTime / y`.
