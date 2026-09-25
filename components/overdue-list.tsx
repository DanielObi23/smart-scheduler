import { priority } from "@/algorithm/priority";
import { dbTaskToTask } from "@/lib/map-task";
import { TaskModal } from "@/components/task-modal";
import { Card } from "@/components/ui/card";
import type { TaskRow } from "@/db/schema";

function daysOverdue(dueDateTime: Date, now: Date): number {
  return Math.floor((now.getTime() - dueDateTime.getTime()) / 86_400_000);
}

export function OverdueList({
  tasks,
  dailyCapacity,
  now,
}: {
  tasks: TaskRow[];
  dailyCapacity: number;
  now: Date;
}) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground">Nothing overdue. Nice.</p>;
  }

  const ranked = tasks
    .map((task) => ({
      task,
      priority: priority({ task: dbTaskToTask(task), now, dailyCapacity }),
    }))
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="flex flex-col gap-2">
      {ranked.map(({ task }) => (
        <TaskModal
          key={task.id}
          task={task}
          trigger={
            <Card className="w-full cursor-pointer flex-row items-center justify-between gap-4 p-4 text-left">
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-muted-foreground">
                Due {task.dueDateTime.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · "}
                {daysOverdue(task.dueDateTime, now)} days overdue
                {" · "}
                ~{task.estimatedTime} min
              </p>
            </Card>
          }
        />
      ))}
    </div>
  );
}
