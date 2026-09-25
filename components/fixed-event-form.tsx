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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createFixedEvent,
  deleteFixedEvent,
  updateFixedEvent,
  type FixedEventInput,
} from "@/actions/fixed-events";
import type { FixedEventRow } from "@/db/schema";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formStateFromEvent(
  event: FixedEventRow | undefined,
  defaultDate: Date | undefined,
) {
  return {
    title: event?.title ?? "",
    recurrenceType: event?.recurrenceType ?? "once",
    startDate: toDateInputValue(event?.startDate ?? defaultDate ?? new Date()),
    daysOfWeek: new Set<number>(event?.daysOfWeek ?? []),
    startTime: event?.startTime ?? "09:00",
    endTime: event?.endTime ?? "10:00",
  };
}

type FixedEventFormProps = {
  trigger: React.ReactNode;
  event?: FixedEventRow;
  defaultDate?: Date;
};

export function FixedEventForm({ trigger, event, defaultDate }: FixedEventFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(() => formStateFromEvent(event, defaultDate));

  function resetForm() {
    setForm(formStateFromEvent(event, defaultDate));
  }

  function toggleDay(day: number) {
    setForm((prev) => {
      const daysOfWeek = new Set(prev.daysOfWeek);
      if (daysOfWeek.has(day)) daysOfWeek.delete(day);
      else daysOfWeek.add(day);
      return { ...prev, daysOfWeek };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const input: FixedEventInput = {
      title: form.title,
      recurrenceType: form.recurrenceType,
      startDate:
        form.recurrenceType === "once" ? new Date(form.startDate) : undefined,
      daysOfWeek:
        form.recurrenceType === "weekly" ? Array.from(form.daysOfWeek) : undefined,
      startTime: form.startTime,
      endTime: form.endTime,
    };

    startTransition(async () => {
      try {
        if (event) {
          await updateFixedEvent(event.id, input);
          toast.success("Timetable entry updated");
        } else {
          await createFixedEvent(input);
          toast.success("Timetable entry added");
        }
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (!event) return;
    startTransition(async () => {
      try {
        await deleteFixedEvent(event.id);
        toast.success("Timetable entry deleted");
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
          <DialogTitle>{event ? "Edit timetable entry" : "New timetable entry"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Sleep, Work, CS 101..."
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Repeats</Label>
            <Select
              value={form.recurrenceType}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  recurrenceType: value as "once" | "daily" | "weekly",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekly">Specific days of the week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.recurrenceType === "once" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
              />
            </div>
          )}

          {form.recurrenceType === "weekly" && (
            <div className="flex flex-col gap-1.5">
              <Label>Days</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                      form.daysOfWeek.has(day.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted",
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                required
              />
            </div>
          </div>

          <DialogFooter className="items-center sm:justify-between">
            {event ? (
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
