"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask, deleteTask, updateTask, type TaskInput } from "@/actions/tasks";
import type { TaskRow } from "@/db/schema";

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "Highest",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Lowest",
};

const STATE_LABELS: Record<TaskInput["state"], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

function toDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formStateFromTask(task: TaskRow | undefined, defaultDueDate: Date | undefined) {
  const due = task?.dueDateTime ?? defaultDueDate ?? new Date();
  return {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    dueDateTime: toDateTimeInputValue(due),
    estimateHours: task ? Math.floor(task.estimatedTime / 60) : 0,
    estimateMinutes: task ? task.estimatedTime % 60 : 45,
    importance: task?.importance ?? 3,
    state: task?.state ?? "todo",
  };
}

type TaskModalProps = {
  trigger: React.ReactNode;
  task?: TaskRow;
  defaultDueDate?: Date;
};

export function TaskModal({ trigger, task, defaultDueDate }: TaskModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(() => formStateFromTask(task, defaultDueDate));

  function resetForm() {
    setForm(formStateFromTask(task, defaultDueDate));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const input: TaskInput = {
      title: form.title,
      notes: form.notes || undefined,
      dueDateTime: new Date(form.dueDateTime),
      estimatedTime: form.estimateHours * 60 + form.estimateMinutes,
      importance: form.importance,
      state: form.state,
    };

    startTransition(async () => {
      try {
        if (task) {
          await updateTask(task.id, input);
          toast.success("Task updated");
        } else {
          await createTask(input);
          toast.success("Task added");
        }
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (!task) return;
    startTransition(async () => {
      try {
        await deleteTask(task.id);
        toast.success("Task deleted");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Add any detail you want to remember..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDateTime">Due</Label>
            <Input
              id="dueDateTime"
              type="datetime-local"
              value={form.dueDateTime}
              onChange={(e) => setForm((f) => ({ ...f, dueDateTime: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Estimate</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  value={form.estimateHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimateHours: Number(e.target.value) }))
                  }
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">hr</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={form.estimateMinutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimateMinutes: Number(e.target.value) }))
                  }
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Importance</Label>
              <Select
                value={String(form.importance)}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, importance: Number(value) }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={String(level)}>
                      {IMPORTANCE_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={form.state}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, state: value as TaskInput["state"] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATE_LABELS) as TaskInput["state"][]).map((state) => (
                  <SelectItem key={state} value={state}>
                    {STATE_LABELS[state]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="items-center sm:justify-between">
            {task ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
