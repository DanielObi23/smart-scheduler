"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskModal } from "@/components/task-modal";
import { FixedEventForm } from "@/components/fixed-event-form";
import type { TaskRow, FixedEventRow } from "@/db/schema";

export type CalendarItem = {
  key: string;
  kind: "task" | "fixed";
  title: string;
  start: Date;
  end: Date;
  task?: TaskRow;
  fixedEvent?: FixedEventRow;
};

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(monthAnchor: Date): Date[] {
  const firstOfMonth = startOfMonth(monthAnchor);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

export function MonthCalendar({ items }: { items: CalendarItem[] }) {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));

  const itemsByDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dayKey(item.start);
    const existing = itemsByDay.get(key);
    if (existing) existing.push(item);
    else itemsByDay.set(key, [item]);
  }

  const days = buildMonthGrid(monthAnchor);
  const today = new Date();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold sm:text-xl">
          {monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h1>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
            }
          >
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonthAnchor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
            }
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-muted py-1.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {days.map((day) => {
          const inCurrentMonth = day.getMonth() === monthAnchor.getMonth();
          const isToday = dayKey(day) === dayKey(today);
          const dayItems = itemsByDay.get(dayKey(day)) ?? [];

          return (
            <div
              key={dayKey(day)}
              className={cn(
                "flex min-h-16 flex-col gap-1 bg-background p-1 sm:min-h-24 sm:p-1.5",
                !inCurrentMonth && "bg-muted/40",
              )}
            >
              <FixedEventForm
                defaultDate={day}
                trigger={
                  <button
                    type="button"
                    className={cn(
                      "self-start rounded px-1 text-[11px] sm:text-xs",
                      !inCurrentMonth && "text-muted-foreground",
                      isToday && "bg-primary text-primary-foreground font-semibold",
                    )}
                  >
                    {day.getDate()}
                  </button>
                }
              />
              <div className="flex flex-col gap-0.5 sm:gap-1">
                {dayItems.map((item) =>
                  item.kind === "task" && item.task ? (
                    <TaskModal
                      key={item.key}
                      task={item.task}
                      trigger={
                        <button
                          type="button"
                          className={cn(
                            "truncate rounded bg-primary/15 px-1 py-0.5 text-left text-[10px] text-primary sm:px-1.5 sm:text-xs",
                            item.task.state === "done" && "line-through opacity-60",
                          )}
                        >
                          {item.title}
                        </button>
                      }
                    />
                  ) : item.fixedEvent ? (
                    <FixedEventForm
                      key={item.key}
                      event={item.fixedEvent}
                      trigger={
                        <button
                          type="button"
                          className="truncate rounded bg-accent px-1 py-0.5 text-left text-[10px] text-accent-foreground sm:px-1.5 sm:text-xs"
                        >
                          {item.title}
                        </button>
                      }
                    />
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
