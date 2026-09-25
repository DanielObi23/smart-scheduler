"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontalIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskModal } from "@/components/task-modal";
import { setTaskState, type TaskInput } from "@/actions/tasks";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/db/schema";

const OTHER_STATES: Record<TaskRow["state"], { value: TaskInput["state"]; label: string }[]> = {
  todo: [
    { value: "in_progress", label: "Move to In Progress" },
    { value: "done", label: "Mark as Done" },
  ],
  in_progress: [
    { value: "todo", label: "Move back to To Do" },
    { value: "done", label: "Mark as Done" },
  ],
  done: [
    { value: "todo", label: "Move back to To Do" },
    { value: "in_progress", label: "Move to In Progress" },
  ],
};

export function KanbanCard({ task }: { task: TaskRow }) {
  const [isPending, startTransition] = useTransition();

  function moveTo(state: TaskInput["state"]) {
    startTransition(async () => {
      try {
        await setTaskState(task.id, state);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Card className="flex-row items-start justify-between gap-2 p-3">
      <TaskModal
        task={task}
        trigger={
          <button type="button" className="flex-1 text-left">
            <p
              className={cn(
                "font-medium",
                task.state === "done" && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {task.dueDateTime.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
          </button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={isPending}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {OTHER_STATES[task.state].map((option) => (
            <DropdownMenuItem key={option.value} onClick={() => moveTo(option.value)}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}
