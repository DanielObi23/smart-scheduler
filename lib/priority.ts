// Overdue tasks and Done tasks are filtered out before scheduling.

const importance = (importanceScore: number) => {
  // how important a task is from 1 to 5. 1 is most important `;
  // Normalising the value:
  // total number of possible choices + 1, minus the chosen choice number, divided by the total number of choices.
  // i.e importance (normalisation) = (N + 1 − x) / N
  // The idea is a fixed, known maximum number of choices (N),
  // scoring options based on rank (i.e 1 - 5),
  // where a lower index (i.e 1) yields a higher score,
  // whilst the lowest value (i.e 5) never yields absolute 0.
  return (6 - importanceScore) / 5; // or (5 + 1 - importanceScore) / 5
};

const urgency = (
  estimatedTime: number, // in minutes
  dueDateTime: Date,
  now: Date,
  dailyCapacity: number, // in hours
) => {
  // How urgent a task is based on:
  // 1) How long it takes to complete the task
  // 2) How close it is to the due date
  // 3) How much time/availability a user has to do their tasks on a normal day
  // It leans towards being pace-driven instead of deadline-proximity-driven

  const daysUntilDue = (dueDateTime.getTime() - now.getTime()) / 86_400_000;
  const minsUntilDue = daysUntilDue * 1440;

  // Pace needed is how much time it takes to complete a task per day
  // evenly split across remaining minutes till it's due from now.

  // The parameter k controls how much of a difference two different due dates has, by what magnitude,
  // i.e how much of a difference in value between 5 days till due vs 30 days till due.
  const k = 0.05;
  // The parameter p controls how much weight estimated time has on urgency
  // relative to how long till due,
  // set to 1 to mean urgency is fully pace-driven.
  const p = 1;
  const paceNeeded = estimatedTime ** p / (1 + k * minsUntilDue);

  // Daily capacity is how much time a user has to do their tasks on a normal day.
  // It's assume to be greater than 0.
  // The constant q controls how much of an impact daily capacity has on urgency.
  // value between 0 and 1.
  const q = 0.2;
  const dailyCapacityMins = (dailyCapacity * 60) ** q;
  const urgencyValue = paceNeeded / dailyCapacityMins;
  const normalisedUrgency = urgencyValue / (1 + urgencyValue);
  return normalisedUrgency; // return value greater than 0 and less than 1.
};

const overdueUrgency = (
  estimatedTime: number,
  dueDateTime: Date,
  now: Date,
) => {
  // Shortest Processing Time (SPT) style ranking, with a fairness floor
  // against starvation for older tasks. See priority-issues.md issue 6.
  // If task is overdue, return urgency based on how long it has been overdue for
  // For overdue task ranking, not part of scheduling
  const daysSinceOverdue = (now.getTime() - dueDateTime.getTime()) / 86_400_000;
  const minsSinceOverdue = daysSinceOverdue * 1440;

  // the longer it's been overdue from now, the higher the urgency
  // So the farther it is from its due date, the higher the urgency

  // The parameter k controls how of a difference two different due dates has, by what magnitude,
  // i.e how much of a difference in value between 5 days since due vs 30 days since due.
  const k = 0.00025; // Roughly a week-long window where quick wins take priority over old tasks.

  // The parameter p controls how much weight estimated time has on urgency.
  // The higher the value, the more weight it has, value between greater than 0 and 1
  const p = 0.3;
  const paceNeeded = estimatedTime ** p / (1 + k * minsSinceOverdue);

  // Daily capacity has no weight here,
  // because overdue tasks arent part of the auto scheduling,
  // rather user chooses a fixed slot for it.

  // Overdue tasks that are quicker to finish are given higher priority.
  // In order to minimize the number of overdue tasks.
  const urgencyValue = 1 / paceNeeded;
  const normalisedUrgency = urgencyValue / (1 + urgencyValue);
  return normalisedUrgency;
};

// A greater weight is given to urgency,
// because it is important to get tasks done on time.
// And people tend to inflate the importance of a task.
const IMPORTANCE_WEIGHT = 0.45;
const URGENCY_WEIGHT = 0.55;

// A greater weight is given to in-progress tasks,
// As it makes more sense to prioritise tasks that are already started.
const IN_PROGRESS_WEIGHT = 0.05;

type Priority = {
  importanceScore: number;
  state: "todo" | "in_progress" | "done";
  estimatedTime: number;
  dueDateTime: Date;
  now: Date;
  dailyCapacity: number;
};
export const priority = ({
  importanceScore,
  state,
  estimatedTime,
  dueDateTime,
  now,
  dailyCapacity,
}: Priority) => {
  // A task has 3 states: to-do, in-progress and done.
  // Done: It's removed from the candidate pool. Filtered before scheduling.
  // In-progress: A value is added for higher priority
  // To-do: No effect on the task
  const importanceValue = importance(importanceScore);
  let urgencyValue = 0;

  if (now > dueDateTime) {
    // Overdue tasks that have been filtered out are then ordered based on their priority.
    urgencyValue = overdueUrgency(estimatedTime, dueDateTime, now);
    if (state === "in_progress")
      return (
        IMPORTANCE_WEIGHT * importanceValue +
        URGENCY_WEIGHT * urgencyValue +
        IN_PROGRESS_WEIGHT
      );
  } else {
    urgencyValue = urgency(estimatedTime, dueDateTime, now, dailyCapacity);
  }

  return IMPORTANCE_WEIGHT * importanceValue + URGENCY_WEIGHT * urgencyValue;
};

type TiedTasks = {
  taskId: number;
  createdAt: Date;
};

const tieBreaker = (tasks: TiedTasks[]) => {
  // if multiple tasks have the same priority,
  // return a sorted list of tasks in order of created first
  return tasks.sort((a, b) => {
    if (a.createdAt > b.createdAt) return 1;
    if (a.createdAt < b.createdAt) return -1;
    return 0;
  });
};
