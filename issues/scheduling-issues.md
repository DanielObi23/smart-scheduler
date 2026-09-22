1. Trying to get the total number of fixed hours from a list of time ranges without overlap

   I particularly struggled with this one, the idea was **Given a list of time ranges, get the total number of hours, whilst accounting for overlapping intervals.**

   Failure 1: My original mistake was simply adding the ranges together before I realised the above edge case.

   Failure 2: I sorted the ranges in ascending order based on start time. Then I went through the list of sorted time ranges, if the previous end time is greater than the current start time, then I simply did `currentEndTime - prevEndTime` and kept doing this throughout the array. Then I had claude run through it and look for failures. It found that this doesn't account for multiple ranges within an interval and gave negative numbers if the currentEndTime is within prevEndTime. For example, if range A has a range of 1 - 7, range B from 2 - 3 and range C from 3 - 5, the correct total is 6, but with this failure it's:

   `First pass = 7 - 1 (range A)`
   `Second pass = 3 (range B end) - 7 (range A end) = -4`
   `Third pass = 5 (range C end) - 3 (range B end) = 2`
   Adding all together:
   `Range = 6 + (-4) + 2 = 4` which is wrong.

   Side Note: I could have easily just gotten claude to do this for me, but just like every other issue I've faced here, I chose to do it myself. Only used claude to find and flag things I may have missed, so I can fix it myself.

   My solution:
   I found the best approach for me was to put it in words before attempting it, without using the word "time" itself, so it was easier to understand. So I wrote this comment:

   // Sort the ranges by start time in ascending order.

   // For range in ranges

   // if start of range is greater than previous highest end range in the list or the first range,
   // then get the difference, end of range - start of range,
   // and add to list of range differences

   // else if end of range is less or equal to end of range of previous ranges in list,
   // then pass/return early with no addition

   // else go through the list of previous ranges, and get the highest end range
   // subtract the highest previous end range from the end of the current range
   // and add to list of range differences

   Then this was converted to code.

---

2. Handling time ranges above one day:

   The issue is some task may span 2 days. But in this case it's sleep time, where it's from 11pm the night before to 7am the day after. The issue is that the schedule is computed on a daily basis, and I couldn't just minus the two times, as it's a recurring time, not a single fixed date.

   **My solution:** It was fairly straightforward, the solution was to simply think of it as split, so for sleep time, instead of 1 continuous time from the day before, it should be from 00:00 - 07:00 and from 23:00 - 23:59. The issue was simply how I was viewing the problem.

   **Now this led to a new problem:**
   How do I handle intervals when a fixed time entry overlaps with sleep time?
   **My solution:**
   Fairly easy fix, just add it to the list of fixed time slots, and it simply goes through the same unique time duration pass.

---

3. Slotting the task into the free time slot:

   This is undoubtedly the hardest problem I've faced so far. I had to determine how to slot tasks in order ranked by priority into free time slots before their due dates, first by the most accommodating slot, if none then split into parts, and I had to keep track of the used slots and the tasks that had been scheduled. Then if the task doesn't fit in, it is to be flagged for the user to deal with. What makes this even more difficult is the fact that free time is different per day, so in trying to fit into the best time slot, I have to first compute the free time for that particular day.

   This was incredibly difficult for me to even wrap my head around, I did several searches to find similar problems and see how they were solved, I found 2 quite close, which are Bin packing and Preemptive scheduling:
   - Bin packing: fitting items of varying sizes into a fixed container, with First-Fit Decreasing which is sorting by size first before trying to fit into the container, which I'm doing with priority.
   - Preemptive scheduling: splitting a job into several by pausing partway through and resumed later, rather than running from start-to-finish. Which I had already thought of.

   So just like issue 1, I had to break it down in comments:

   // Take a list of tasks, calculate their priority, and
   // then schedule them in free time for the day.

   // two types of tasks:
   // 1. to-do/to be scheduled
   // 2. ones scheduled by the user, i.e fixed time

   // -------------------

   // priority is called for type 1 tasks only

   // So for type 1 tasks, I need:
   // 1. estimated time
   // 2. importance
   // 3. due date and time
   // 4. state

   // And extras to calculate priority:
   // 1. daily capacity
   // 2. date and time now

   // -------------------

   // freetime is calculated from subtracting time given to type 2 tasks
   // per the day looked at

   // so for type 2 tasks, I need:
   // 1. start time
   // 2. end time

   // And extras to calculate free time:
   // 1. daily capacity
   // 2. buffer

   // -------------------

   // Type 1 task is to be scheduled within these free time, based on their priority.
   // Following these steps in a loop (from highest rank task):

   // 1. Fit into the earliest fully accommodating free time slot before due date.
   // 2. If none exists, split into several slots,
   // and the next highest priority follows step 1.
   // This repeats until all slots are filled or all tasks are given a slot.

   // The problem,
   // 1. how to keep track of these tasks that have been scheduled?
   // Considering a for loop that goes through them, after slotting in them, marks as scheduled
   // 2. how to determine the slots that are free, not just how many hours are free?
   // 3. how to keep track of used time slots and when all slots are filled?

   // Any type 1 task left, to be flagged for user to manually add.
   // After adding, it becomes a type 2 task.

---

4. Deciding what factors should influence free time scheduling:
   I decided that free time is to be used to compute unique free time ranges rather than free hours in a day. That introduced 2 issues, how would daily capacity and buffer be handled?
   - Daily capacity is the max number of hours a user is available to tackle tasks in a normal day.
   - Buffer is the number of hours a user spends doing random tasks, like driving to work, catching up with a friend, cooking, relaxation.

   **For the daily capacity issue:**
   I think for daily capacity, it'll actually be the bin packing problem,
   given different sizes (i.e ranges), fit within the available space (i.e daily capacity).
   The idea is sort by sizes (i.e time ranges) first (i.e First-Fit Decreasing)
   and then try to fit into the container (i.e daily capacity).
   The reason is a long uninterrupted task is favoured more than a frequent interruption, so I'm favouring this over preemptive scheduling.

   This introduced new problems:
   Tasks are ordered by priority, not estimated time (highest to lowest).
   So a 5 minute task could end up taking a 3 hour slot.
   leaving a 20 minute slot for a 2 hours task. This is a problem.

   **My solution:**
   How about instead of First-Fit Decreasing, rather Best-Fit. So the task takes the minimum sized accommodating slot before its due date. Although this reduces waste, it's still possible for a 5 minute task to take a 1 hour slot if it's the minimum. As a solution to this, I thought how about fitting multiple tasks into one time range, which increases the complexity of keeping track of free time, but it solves the main issue.

   For buffer I decided to remove it as a factor as it added extra complexity to an already NP-hard problem. This is because daily capacity sort of accounts for it. Daily capacity is already the amount of time the user is comfortable spending on doing tasks on a normal day, so adding buffer's slight benefit isn't worth the added complexity.

---

5. Deciding if to take a strict or loose approach in deciding the time slots that should fit a user's daily capacity:

   With the bin packing problem (Best-fit), the idea is most number of items with different sizes, sorted according to sizes, that can fit into a bin with minimum wastage. What I'm trying to decide is, should it be:

   A. Strict: all the items must not be less than the bin space.
   B. Loose: the items can overflow the bin, but only the last item is allowed to overflow.
   C. Best-fit: After reaching the max in strict, go a step further by looking for smaller items that can fit in without the bin overflowing.

   I decided to go with option B, because like I wrote in issue 4, I prefer a long uninterrupted task over numerous cuts, with A there's wastage and with C there's more fragmented time slots. So B is the best solution with a cap on the task overflow or truncating the final.

   Another point of view is UX vs expectation:
   UX -> fitting within user's defined constraint.
   Expectation -> user would expect that occasionally tasks should overshoot their defined constraint for the day.

   I decided to lean towards expectation, as this is a best-effort scheduler, not an exact-fit one, so it's already built on the premise that some imprecision is acceptable, and (this is my opinion) schedules should go a little over when necessary.
