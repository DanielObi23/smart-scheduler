type TimeRange = {
  start: Date;
  end: Date;
};

const uniqueTimeRange = (fixedTimeRange: TimeRange[]) => {
  // Interval merging (classic overlap/merge-intervals problem).
  // See scheduling-issues.md issue 1 for the reasoning trail.
  // Dealing with "interval overlap" or "range intersection" problem
  // 1. Sort the ranges by start time in ascending order.
  const sortedFixedTime = fixedTimeRange.sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const uniqueFixedTimeRanges = sortedFixedTime.map(
    (timeRange: TimeRange, index) => {
      const prevHigestEndTime = sortedFixedTime
        .slice(0, index)
        .reduce((currentValue, sortedTimeRange) => {
          if (sortedTimeRange.end.getTime() > currentValue) {
            return sortedTimeRange.end.getTime();
          }
          return currentValue;
        }, 0);

      if (index === 0 || timeRange.start.getTime() > prevHigestEndTime) {
        // if start time is greater than previous highest end time in the list
        // or if it's the first range,
        // return the range

        return {
          start: timeRange.start,
          end: timeRange.end,
        };
      } else if (timeRange.end.getTime() <= prevHigestEndTime) {
        // if current end time is less or equal to highest previous end time,
        // then pass/return early with no addition
        return null;
      } else {
        // else return previous highest end time as the start time
        // and current end time as end time
        // and add to list of time differences
        return {
          start: new Date(prevHigestEndTime),
          end: timeRange.end,
        };
      }
    },
  );
  return uniqueFixedTimeRanges.filter((r) => r !== null);
};

const freeTimeRanges = (usedTimeRanges: TimeRange[]) => {
  // Interval complement / gap-finding — the free-time counterpart to the
  // merge in uniqueTimeRange above. See scheduling-issues.md issue 4.
  const date = new Date();
  const startDay = date.setHours(0, 0, 0, 0);
  const endDay = date.setHours(23, 59, 59, 999);
  let freeTimeRanges = [];

  if (usedTimeRanges.length === 0) {
    return null;
  }
  for (let i = 0; i < usedTimeRanges.length; i++) {
    const firstRange = i === 0;
    const lastRange = i === usedTimeRanges.length - 1;

    if (firstRange && lastRange) {
      freeTimeRanges.push(
        {
          start: new Date(startDay),
          end: usedTimeRanges[i].start,
        },
        {
          start: usedTimeRanges[i].end,
          end: new Date(endDay),
        },
      );
      break;
    }

    if (firstRange) {
      freeTimeRanges.push({
        start: new Date(startDay),
        end: usedTimeRanges[i].start,
      });
      continue;
    }

    const prevEndTime = usedTimeRanges[i - 1].end;
    freeTimeRanges.push({
      start: prevEndTime,
      end: usedTimeRanges[i].start,
    });

    if (lastRange) {
      freeTimeRanges.push({
        start: usedTimeRanges[i].end,
        end: new Date(endDay),
      });
    }
  }

  return freeTimeRanges;
};

const allowedFreeTime = (
  fixedTime: TimeRange[], // includes sleep time
  dailyCapacity: number, // in hours
  capacityOverflowPercent: number, // in percent, 0-100
) => {
  // Calculate free time ranges in a day

  const usedTimeRanges: TimeRange[] = uniqueTimeRange(fixedTime);
  const allFreeTimeRanges = freeTimeRanges(usedTimeRanges);

  if (allFreeTimeRanges === null) {
    // if no free time, return null
    return null;
  }
  // Bin packing (First-Fit Decreasing, refined to Best-Fit, plus a
  // percentage-based overflow cap). See scheduling-issues.md issues 4 and 5.
  const sortedRanges = allFreeTimeRanges.sort((a, b) => {
    const aRange = a.end.getTime() - a.start.getTime();
    const bRange = b.end.getTime() - b.start.getTime();
    if (aRange > bRange) {
      return -1;
    } else if (aRange < bRange) {
      return 1;
    } else {
      return 0;
    }
  });

  let dailyCapacityRanges = [];
  let currentCapacity = 0;
  let currentIndex = 0;

  while (
    currentCapacity < dailyCapacity &&
    currentIndex < sortedRanges.length
  ) {
    const range = sortedRanges[currentIndex];

    const rangeCapacity =
      (range.end.getTime() - range.start.getTime()) / 3_600_000;

    if (currentCapacity + rangeCapacity > dailyCapacity) {
      // if adding the current range will overflow the daily capacity
      // then truncate to fit within the allowed overflow

      const allowedOverflow = (capacityOverflowPercent / 100) * dailyCapacity; // in hours
      const overflow = currentCapacity + rangeCapacity - dailyCapacity; // in hours

      if (overflow <= allowedOverflow) {
        dailyCapacityRanges.push(range);
      } else {
        const disallowedOverflow = overflow - allowedOverflow;
        const end = range.end.getTime() - disallowedOverflow * 3_600_000;
        const newRange = (end - range.start.getTime()) / 3_600_000;
        dailyCapacityRanges.push({
          start: range.start,
          end: new Date(end),
        });
        currentCapacity += newRange;
        break;
      }
    } else {
      dailyCapacityRanges.push(range);
    }
    currentCapacity += rangeCapacity;
    currentIndex++;
  }

  return dailyCapacityRanges;
};

type Task = {
  estimatedTime: number;
  importance: number;
  dueDateTime: Date;
};

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
// 1) how to keep track of these tasks that have been scheduled?
// Considering a for loop that goes through them, after slotting in them, marks as scheduled
// 2) how to determine the slots that are free, not just how many hours are free?
// 3) how to keep track of used time slots and when all slots are filled?

// Any type 1 task left, to be flagged for user to manually add.
// After adding, it becomes a type 2 task.

const schedule = (tasks: Task[]) => {
  const fixedTime: TimeRange[] = [];
  //const tas
  return tasks;
};

// I think for daily capacity, it'll actually be the bin packing problem,
// given different sizes (i.e ranges), fit within the available space (i.e daily capacity)
// The idea is sort by sizes first (i.e First-fit decreasing)
// and then try to fit into the container (i.e daily capacity).
// The reason is a long none interrupted task is favoured more than a frequent interruption.

// But comes an issue, tasks are ordered by priority, not estimated time (highest to lowest).
// So a 5 minute task could end up taking a 1 hour slot.
// leaving a 20 minute slot for a 3 hours task. This is a problem.
