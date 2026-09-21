type TimeRange = {
  start: Date;
  end: Date;
};

const freeTime = (
  fixedTime: TimeRange[], // includes sleep time
  buffer: number, // in hours
  dailyCapacity: number, // in hours
) => {
  // Calculate the free time in a day in hours

  // Dealing with "interval overlap" or "range intersection" problem
  // 1. Sort the ranges by start time in ascending order.
  const sortedFixedTime = fixedTime.sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const uniqueTimeDifferences = sortedFixedTime.map(
    (timeRange: TimeRange, index) => {
      const prevHigestEndTime = sortedFixedTime
        .slice(0, index)
        .reduce((currentValue, sortedTimeRange) => {
          if (sortedTimeRange.end.getTime() > currentValue) {
            return sortedTimeRange.end.getTime();
          }
          return currentValue;
        }, 0);

      if (timeRange.start.getTime() > prevHigestEndTime) {
        // if start time is greater than previous highest end time in the list
        // or the first range,
        // get the difference, end time - start time,
        // and add to list of time differences
        return timeRange.end.getTime() - timeRange.start.getTime();
      } else if (timeRange.end.getTime() <= prevHigestEndTime) {
        // if current end time is less or equal to highest previous end time,
        // then pass/return early with no addition
        return 0;
      } else {
        // else subtract the previous highest end time from the current end time
        // and add to list of time differences
        return timeRange.end.getTime() - prevHigestEndTime;
      }
    },
  );

  const unavailableTimeInMs = uniqueTimeDifferences.reduce(
    (currentValue, duration) => {
      return currentValue + duration;
    },
    0,
  );
  const unavailableHours = unavailableTimeInMs / 1000 / 60 / 60;
  const hoursInADay = 24;
  const freeTimeHours = hoursInADay - unavailableHours - buffer;

  if (freeTimeHours < 0) {
    return 0;
  }

  return Math.min(dailyCapacity, freeTimeHours);
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
