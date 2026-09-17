const importance = (importance_score: number) => {
  // how important a task is from 1 to 5. 1 is most important `;
  // Normalising the value:
  // total number of possible choices + 1, minus the chosen choice number, divided by the total number of choices.
  // i.e importance (normalisation) = (N + 1 − x) / N
  return (6 - importance_score) / 5;
};

const urgency = (
  estimated_time: number,
  days_until_due: number,
  daily_capacity: number,
) => {
  // How urgent a task is based on:
  // 1) How long it takes to complete the task
  // 2) How close it is to the due date
  // 3) How much time/availability a user has to do their tasks on a normal day

  // If task is due, return 1
  if (days_until_due == 0) return 1;

  // If task is overdue, return 0
  if (days_until_due < 0) return 2;

  const pace_needed = estimated_time / Math.exp(days_until_due);
  const daily_capacity_mins = daily_capacity * 60;
  return Math.min(1, pace_needed / daily_capacity_mins);
};

// decay = 1 / (1 + k * days_until_due)
// urgency_contribution = estimated_time * decay
// urgency = min(1, urgency_contribution / daily_capacity_mins)

const STATE = {
  to_do: 0,
  in_progress: 1,
  done: 2,
};

// A greater weight is given to urgency,
// because it is important to get tasks done on time.
// And people tend to inflate the importance of a task.
const IMPORTANCE_WEIGHT = 0.45;
const URGENCY_WEIGHT = 0.55;

const priority = (
  importance_score: number,
  urgency_score: number,
  state: "to_do" | "in_progress" | "done",
) => {
  // A task has 3 states: to-do, in-progress and done.
  // Done: It's removed from the candidate pool. Filtered before scheduling.
  // In-progress: A value of 0.1 is added to its priority scoring.
  // To-do: No effect on the task
  if (STATE[state] === 1)
    return (
      IMPORTANCE_WEIGHT * importance_score +
      URGENCY_WEIGHT * urgency_score +
      0.3
    );
  return IMPORTANCE_WEIGHT * importance_score + URGENCY_WEIGHT * urgency_score;
};
