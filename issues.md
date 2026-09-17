1. **Comparing 2 derived values for determining priority:**
   Currently I have both importance_score which is simply 1-5, but urgency gives wide ranges of value. im trying to compare the two values in a meaningful way, i want the two values to have similar ranges.

   My solution: I decided to work on a way to normalise the two values to always be less than 1 and above 0. This way it's more like comparing apples to apples, which allows me to add weights to the comparison equation, which i can then fine tune to give either importance_score or urgency_score more importance. And i can have a control of the range of the final score, knowing the value always caps at 1.

2. **The "minimizing the number of late jobs" problem:** should the goal be to minimize backlog or prevent a backlog from forming?

   I'm wondering which should have more weight, an overdue task or (a task that's close to be due or is due today).
   If I focus on working on overdue task, that means more tasks are likely to get overdue, but each overdue task would spend less time overdue, but also the goal of a scheduler is to get tasks done before they are due. so do overdue tasks have more weight or less? On the flip side, if the focus is on completing before due, there'll be less deadline broken, but the already broken deadline would be longer in overdue before being completed.

   Of course it's not that simple, a task that takes 5 minutes to complete but is overdue, does it have more or less weight than a task that takes 3 hours but is due in 3 days? So does how long it takes to complete the task matter more or simply another factor?

   My solution: seeing as the job of the scheduler is to fix a task before its due date, tasks passed its due date shouldnt be counted, but rather flagged for user to manually edit into the calendar as a fixed slot.

3. Should tasks that has passed its due date be given a grace period buffer?

   The issue was if a task was due at 11:59pm, should it automatically be moved into overdue pile by 12:01? or should it be given a grace period buffer, let's say 30 minutes passed it due time, but the question is does the system treat the extra time as part of the due time? does the user see this extra time or what?

   My solution: Originally I thought perhaps this grace period is to be for only tasks that are in_progress state, if a task is in done state, it's automatically removed and set aside as completed, and if a task is in to_do state then it isnt given any grace period at all. But the issue now is, if a user then starts an overdue card right after it's overdue, and change the state to in_progress, the scheduler would have to readd it to the pile. Then we are back to the issue from earlier, which takes more priority, overdue or close to be due tasks? so my conclusion is same as before with better clarity, user should manually fit the slot, the reason is the point of the scheduler is to try and minimise the number of tasks that become overdue, its design is prevention not cure. I may have to revisit this later if i want this to also be used to act as a cure, as of now (v1), the algorithm is only given 1 objective. Also the user would most likely continue even if the scheduler marks the task they are doing as overdue, it doesnt forcibly stop them, and then when done, user can just mark the task as done in the overdue pile. The key point is this is simply a recommendation.

4. How should task with same due date, importance and estimated_time be ranked?

   The issue is if multiple tasks have all 3 at the same time, how does the algorithm decide which to take priority.

   My solution: I originally thought, how about adding due day with time, but then issue comes what if they also share due time. My conclusion was simple, first come first serve. I decided to give each task a created_at timestamp, and give higher priority to task created first. Due day with time factor will remain, and will replace due day as now it's redundant.
