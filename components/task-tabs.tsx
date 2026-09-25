"use client";

import { CalendarIcon, Building2Icon, LayoutGridIcon, TriangleAlertIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/task-modal";
import { FixedEventForm } from "@/components/fixed-event-form";
import { MonthCalendar, type CalendarItem } from "@/components/month-calendar";
import { KanbanBoard } from "@/components/kanban-board";
import { TimetableList } from "@/components/timetable-list";
import { OverdueList } from "@/components/overdue-list";
import type { TaskRow, FixedEventRow } from "@/db/schema";

type TaskTabsProps = {
  calendarItems: CalendarItem[];
  allTasks: TaskRow[];
  fixedEvents: FixedEventRow[];
  overdueTasks: TaskRow[];
  dailyCapacity: number;
  now: Date;
};

export function TaskTabs({
  calendarItems,
  allTasks,
  fixedEvents,
  overdueTasks,
  dailyCapacity,
  now,
}: TaskTabsProps) {
  return (
    <Tabs defaultValue="calendar" className="gap-4">
      <TabsList className="h-auto w-full sm:w-fit">
        <TabsTrigger value="calendar">
          <CalendarIcon /> <span className="hidden sm:inline">Calendar</span>
        </TabsTrigger>
        <TabsTrigger value="timetable">
          <Building2Icon /> <span className="hidden sm:inline">Timetable</span>
        </TabsTrigger>
        <TabsTrigger value="board">
          <LayoutGridIcon /> <span className="hidden sm:inline">Board</span>
        </TabsTrigger>
        <TabsTrigger value="overdue">
          <TriangleAlertIcon /> <span className="hidden sm:inline">Overdue</span>
          {overdueTasks.length > 0 && (
            <Badge variant="secondary">{overdueTasks.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calendar" className="flex flex-col gap-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-4" /> Task
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-2" /> Timetable
          </span>
        </div>
        <MonthCalendar items={calendarItems} />
      </TabsContent>

      <TabsContent value="timetable" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Your fixed commitments — sleep, work, classes — that the
            scheduler works around when placing tasks.
          </p>
          <FixedEventForm
            trigger={
              <Button size="sm" className="self-start sm:self-auto">
                + New entry
              </Button>
            }
          />
        </div>
        <TimetableList events={fixedEvents} />
      </TabsContent>

      <TabsContent value="board" className="flex flex-col gap-4">
        <div className="flex justify-end">
          <TaskModal trigger={<Button size="sm">+ New task</Button>} />
        </div>
        <KanbanBoard tasks={allTasks} />
      </TabsContent>

      <TabsContent value="overdue" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          These aren&apos;t auto-scheduled — the plan&apos;s job is to keep
          work from becoming overdue, not to keep rearranging around it once
          it has. Click one to give it a new date and time yourself.
        </p>
        <OverdueList tasks={overdueTasks} dailyCapacity={dailyCapacity} now={now} />
      </TabsContent>
    </Tabs>
  );
}
