import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "@/components/kanban-card";
import type { TaskRow } from "@/db/schema";

const COLUMNS: { state: TaskRow["state"]; label: string }[] = [
  { state: "todo", label: "To Do" },
  { state: "in_progress", label: "In Progress" },
  { state: "done", label: "Done" },
];

export function KanbanBoard({ tasks }: { tasks: TaskRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.state === column.state);
        return (
          <div key={column.state} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">{column.label}</h2>
              <Badge variant="secondary">{columnTasks.length}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {columnTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet</p>
              ) : (
                columnTasks.map((task) => <KanbanCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
