import { priority } from "./priority";

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

  // Calculate free time ranges in a day

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
  // Bin packing (First-Fit Decreasing, refined to Best-Fit, plus a
  // percentage-based overflow cap). See scheduling-issues.md issues 4 and 5.

  if (fixedTime.length === 0) {
    // daily capacity + overflow
    const overflow = (capacityOverflowPercent / 100) * dailyCapacity;
    // let it get a little more as it's a free day.
    const fullCapacity = Math.ceil(dailyCapacity + overflow);
    const date = new Date();
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(fullCapacity, 0, 0, 0));
    return [
      {
        start,
        end,
      },
    ];
  }

  const usedTimeRanges: TimeRange[] = uniqueTimeRange(fixedTime);
  const allFreeTimeRanges = freeTimeRanges(usedTimeRanges);

  if (allFreeTimeRanges === null) {
    // if no free time, return null
    return [];
  }
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

type FixedTask = {
  id: string;
  start: Date;
  end: Date;
};

type TaskState = "todo" | "in_progress" | "done";
export type Task = {
  id: string;
  estimatedTime: number;
  importance: number;
  dueDateTime: Date;
  state: TaskState;
  createdAt: Date;
};

type Schedule = {
  tasks: Task[];
  fixedTask: FixedTask[];
  dailyCapacity: number; // in hours
  capacityOverflowPercent: number; // in percent, 0-100
  dateTimeNow: Date;
};

type ScheduledRecord = {
  taskId: string;
  start: Date;
  end: Date;
};

type FlattenedSlot = {
  start: Date;
  end: Date;
  day: number;
};

const taskDay = (dueDayTime: number, today: number) => {
  // both dueDayTime and today are in milliseconds
  return Math.floor((dueDayTime - today) / 86_400_000);
  // 0 is today, 1 is tomorrow, etc.
};

const schedule = ({
  tasks, // tasks to be scheduled
  fixedTask, // already scheduled tasks
  dailyCapacity,
  dateTimeNow,
  capacityOverflowPercent,
}: Schedule) => {
  if (tasks.length === 0) {
    return null;
  }
  // Sort the tasks to be scheduled by priority, and a tie breaker if multiple priority are equal
  const withPriority = tasks.map((task) => ({
    // Not computed within .sort() to avoid re-computing, resulting in better efficiency
    task,
    priority: priority({ task, now: dateTimeNow, dailyCapacity }),
  }));
  const prioritySortedTasks = withPriority.sort((a, b) => {
    const priorityA = a.priority;
    const priorityB = b.priority;
    const createdAtA = a.task.createdAt;
    const createdAtB = b.task.createdAt;

    if (priorityA > priorityB) {
      return -1;
    } else if (priorityA < priorityB) {
      return 1;
    }
    // First-come-first-served tiebreak for equal priority scores.
    // See priority-issues.md issue 4.
    // if multiple tasks have the same priority,
    // return a sorted list of tasks in order of created first
    else if (createdAtA > createdAtB) {
      return 1;
    } else if (createdAtA < createdAtB) {
      return -1;
    } else {
      return 0;
    }
  });

  // I need to arrange the fixed tasks into a record of day and array of same day tasks
  // until the furthest due date, to bound recurring tasks
  let furthestDueDate = new Date();
  if (tasks.length === 1) {
    furthestDueDate = tasks[0].dueDateTime;
  } else {
    const dueDateSortedTasks = [...tasks].sort((a, b) => {
      const dueDateTimeA = a.dueDateTime;
      const dueDateTimeB = b.dueDateTime;
      if (dueDateTimeA > dueDateTimeB) {
        return 1;
      } else if (dueDateTimeA < dueDateTimeB) {
        return -1;
      } else {
        return 0;
      }
    });
    furthestDueDate = dueDateSortedTasks.at(-1)!.dueDateTime;
  }

  const date = new Date();
  const todayStart = date.setHours(0, 0, 0, 0);
  const millisecondsPerDay = 86_400_000;
  // how many days from now is furthest due date
  let maxDayCount = Math.ceil(
    (furthestDueDate.getTime() - todayStart) / millisecondsPerDay,
  );
  let fixedTaskByDay: Record<number, FixedTask[]> = {};

  for (let i = 0; i < fixedTask.length; i++) {
    const currentTaskDay = taskDay(fixedTask[i].start.getTime(), todayStart); // 0 is today, 1 is tomorrow, etc.

    if (currentTaskDay < 0 || currentTaskDay > maxDayCount) {
      continue;
    }

    if (!fixedTaskByDay[currentTaskDay]) {
      fixedTaskByDay[currentTaskDay] = [];
    }

    fixedTaskByDay[currentTaskDay].push(fixedTask[i]);
  }

  // then determine the free time for each of those days, and
  // store these time ranges and date
  const freeTimeRanges: { day: number; freeTime: TimeRange[] }[] = [];

  for (let i = 0; i <= maxDayCount; i++) {
    // 0 is today, 1 is tomorrow, etc.
    let dayTasks: FixedTask[] = [];
    if (fixedTaskByDay[i]) {
      dayTasks = fixedTaskByDay[i];
    }

    freeTimeRanges.push({
      day: i,
      freeTime: allowedFreeTime(
        dayTasks,
        dailyCapacity,
        capacityOverflowPercent,
      ),
    });
  }

  const unscheduledTasks: Task[] = [];
  const scheduledTasks: ScheduledRecord[] = [];
  const flattenedSlots: FlattenedSlot[] = [];
  // then schedule the to-do tasks in the minimum accommodating free time slots before due

  // 1. flatten the free time ranges into a single array of object {start, end, day}

  freeTimeRanges.forEach((day) => {
    day.freeTime.forEach((freeTime) => {
      flattenedSlots.push({
        start: freeTime.start,
        end: freeTime.end,
        day: day.day,
      });
    });
  });

  // 2. filter out slots that are past due day and time
  // 3. sort by range
  prioritySortedTasks.forEach(({ task }) => {
    const dueDay = taskDay(task.dueDateTime.getTime(), todayStart);
    const selectableSlots = flattenedSlots
      .filter((slot) => {
        if (slot.day < dueDay) {
          return true;
        } else if (slot.day === dueDay) {
          if (slot.end.getTime() <= task.dueDateTime.getTime()) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => {
        const slotA = a.end.getTime() - a.start.getTime();
        const slotB = b.end.getTime() - b.start.getTime();
        if (slotA < slotB) {
          return -1;
        } else if (slotA > slotB) {
          return 1;
        } else {
          return 0;
        }
      });

    if (selectableSlots.length === 0) {
      unscheduledTasks.push(task);
      return;
    }

    const estimatedTimeMs = task.estimatedTime * 60000;
    const selectedSlot: FlattenedSlot | undefined = selectableSlots.find(
      (slot) => estimatedTimeMs <= slot.end.getTime() - slot.start.getTime(),
    );

    // TODO: implement task slot splitting
    if (!selectedSlot) {
      unscheduledTasks.push(task);
    } else {
      const end = new Date(selectedSlot.start.getTime() + estimatedTimeMs);
      scheduledTasks.push({
        taskId: task.id,
        start: selectedSlot.start,
        end,
      });
    }
  });

  //TODO: keep track of used time slots, and when all slots are filled,
  //TODO: return tasks unscheduled and flag them

  return;
};
