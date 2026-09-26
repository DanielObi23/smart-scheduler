import { requireUserId } from "@/lib/auth/require-user-id";
import { schedule } from "@/algorithm/schedule";
import { dbTaskToTask } from "@/lib/map-task";
import { dbFixedEventToDefinition } from "@/lib/map-fixed-event";
import { expandFixedEvents, type FixedEventDefinition } from "@/lib/expand-fixed-events";
import {
  getSchedulableTasksForUser,
  getAllTasksForUser,
  getOverdueTasksForUser,
} from "@/db/queries/tasks";
import { getFixedEventsForUser } from "@/db/queries/fixedEvents";
import { getUserSettings } from "@/db/queries/settings";
import { TaskTabs } from "@/components/task-tabs";
import type { CalendarItem } from "@/components/month-calendar";
import type { TaskRow } from "@/db/schema";

const HORIZON_DAYS = 90;

// Server components using Neon Auth's session methods must render dynamically.
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const userId = await requireUserId();

  // Fresh instance for this request -- schedule() mutates its own local
  // binding internally now, never the object the caller passed in, so this
  // same `now` is safe to reuse afterward for the Overdue tab.
  const now = new Date();

  const [schedulableTaskRows, allTaskRows, overdueTaskRows, fixedEventRows, settings] =
    await Promise.all([
      getSchedulableTasksForUser(userId, now),
      getAllTasksForUser(userId),
      getOverdueTasksForUser(userId, now),
      getFixedEventsForUser(userId),
      getUserSettings(userId),
    ]);

  const tasksById = new Map<string, TaskRow>(schedulableTaskRows.map((row) => [row.id, row]));
  const fixedEventsById = new Map(fixedEventRows.map((row) => [row.id, row]));

  const sleepDefinition: FixedEventDefinition = {
    id: "sleep",
    title: "Sleep",
    recurrence: { type: "daily" },
    startTime: settings.sleepStart,
    endTime: settings.sleepEnd,
  };

  const expandedFixedTasks = expandFixedEvents({
    events: [sleepDefinition, ...fixedEventRows.map(dbFixedEventToDefinition)],
    rangeStart: now,
    daysAhead: HORIZON_DAYS,
  });

  const result =
    schedulableTaskRows.length > 0
      ? schedule({
          tasks: schedulableTaskRows.map(dbTaskToTask),
          fixedTask: expandedFixedTasks,
          dailyCapacity: settings.dailyCapacityHours,
          capacityOverflowPercent: settings.capacityOverflowPercent,
          now,
        })
      : null;

  const calendarItems: CalendarItem[] = [];

  for (const record of result?.scheduledTasks ?? []) {
    const task = tasksById.get(record.taskId);
    if (!task) continue;
    calendarItems.push({
      key: `task:${record.taskId}:${record.start.getTime()}`,
      kind: "task",
      title: task.title,
      start: record.start,
      end: record.end,
      task,
    });
  }

  for (const expanded of expandedFixedTasks) {
    const originalId = expanded.id.split(":")[0];

    if (originalId === "sleep") {
      calendarItems.push({
        key: `sleep:${expanded.id}`,
        kind: "sleep",
        title: "Sleep",
        start: expanded.start,
        end: expanded.end,
      });
      continue;
    }

    const fixedEvent = fixedEventsById.get(originalId);
    if (!fixedEvent) continue;
    calendarItems.push({
      key: `fixed:${expanded.id}`,
      kind: "fixed",
      title: fixedEvent.title,
      start: expanded.start,
      end: expanded.end,
      fixedEvent,
    });
  }

  return (
    <TaskTabs
      calendarItems={calendarItems}
      allTasks={allTaskRows}
      fixedEvents={fixedEventRows}
      overdueTasks={overdueTaskRows}
      dailyCapacity={settings.dailyCapacityHours}
      now={now}
    />
  );
}
