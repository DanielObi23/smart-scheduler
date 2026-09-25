import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/task-modal";
import { KanbanBoard } from "@/components/kanban-board";
import { getAllTasksForUser } from "@/db/queries/tasks";
import { requireUserId } from "@/lib/auth/require-user-id";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const userId = await requireUserId();

  const tasks = await getAllTasksForUser(userId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
        <TaskModal trigger={<Button>+ New task</Button>} />
      </div>
      <KanbanBoard tasks={tasks} />
    </div>
  );
}
