import type { Task } from "@/algorithm/schedule";
import type { TaskRow } from "@/db/schema";

export function dbTaskToTask(row: TaskRow): Task {
  return {
    id: row.id,
    estimatedTime: row.estimatedTime,
    importance: row.importance,
    dueDateTime: row.dueDateTime,
    state: row.state,
    createdAt: row.createdAt,
  };
}
