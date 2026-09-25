import { and, eq, gte, lt, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks, type TaskRow } from "@/db/schema";

export function getAllTasksForUser(userId: string): Promise<TaskRow[]> {
  return db.select().from(tasks).where(eq(tasks.userId, userId));
}

/** Tasks eligible for auto-scheduling: not done, not yet overdue. */
export function getSchedulableTasksForUser(
  userId: string,
  now: Date,
): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        ne(tasks.state, "done"),
        gte(tasks.dueDateTime, now),
      ),
    );
}

/** Tasks past their due date, excluded from auto-scheduling. */
export function getOverdueTasksForUser(
  userId: string,
  now: Date,
): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        ne(tasks.state, "done"),
        lt(tasks.dueDateTime, now),
      ),
    );
}

export function getTasksByState(
  userId: string,
  state: TaskRow["state"],
): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.state, state)));
}
