// Overdue task and Done tasks are filtered out before scheduling

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

  const daysUntilDue = (dueDateTime.getTime() - now.getTime()) / 86400000;
  const daysUntilDueMins = daysUntilDue * 1440;

  // Pace needed is how much time it takes to complete a task per day
  // evenly split across remaining minutes till it's due from now.
  const k = 0.0001; // steepness of the decay, how fast paceNeeded shrinks
  const paceNeeded = estimatedTime / (1 + k * daysUntilDueMins);

  // Daily capacity is how much time a user has to do their tasks on a normal day.
  const dailyCapacityMins = dailyCapacity * 60;
  const urgencyValue = paceNeeded / dailyCapacityMins;
  const normalisedUrgency = urgencyValue / (1 + urgencyValue);
  return normalisedUrgency; // return value greater than 0 and less than 1.
};

const overdueUrgency = (
  estimatedTime: number,
  dueDateTime: Date,
  now: Date,
) => {
  // If task is overdue, return urgency based on how long it has been overdue for
  // For overdue task ranking, not part of scheduling
  return (
    estimatedTime / (1 / (Math.abs(dueDateTime.getTime() - now.getTime()) + 1))
  );
};

const STATE = {
  todo: 0,
  inProgress: 1,
  done: 2,
};

// A greater weight is given to urgency,
// because it is important to get tasks done on time.
// And people tend to inflate the importance of a task.
const IMPORTANCE_WEIGHT = 0.45;
const URGENCY_WEIGHT = 0.55;

const priority = (
  importanceScore: number,
  state: "todo" | "inProgress" | "done",
  estimatedTime: number,
  dueDateTime: Date,
  now: Date,
  dailyCapacity: number,
) => {
  // A task has 3 states: to-do, in-progress and done.
  // Done: It's removed from the candidate pool. Filtered before scheduling.
  // In-progress: A value of 0.1 is added to its priority scoring.
  // To-do: No effect on the task
  const importanceValue = importance(importanceScore);
  const urgencyValue = urgency(estimatedTime, dueDateTime, now, dailyCapacity);

  if (STATE[state] === 1)
    return (
      IMPORTANCE_WEIGHT * importanceValue + URGENCY_WEIGHT * urgencyValue + 0.3
    );
  return IMPORTANCE_WEIGHT * importanceValue + URGENCY_WEIGHT * urgencyValue;
};

const overduePriority = (
  importanceScore: number,
  state: "todo" | "inProgress" | "done",
  estimatedTime: number,
  dueDateTime: Date,
  now: Date,
) => {
  const importanceValue = importance(importanceScore);
  const urgencyValue = overdueUrgency(estimatedTime, dueDateTime, now);
  if (STATE[state] === 1)
    return (
      IMPORTANCE_WEIGHT * importanceValue + URGENCY_WEIGHT * urgencyValue + 0.3
    );
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
