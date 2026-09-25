import { requireUserId } from "@/lib/auth/require-user-id";
import { schedule } from "@/algorithm/schedule";
import { dbTaskToTask } from "@/lib/map-task";
import { dbFixedEventToDefinition } from "@/lib/map-fixed-event";
import { expandFixedEvents } from "@/lib/expand-fixed-events";
import { getSchedulableTasksForUser } from "@/db/queries/tasks";
import { getFixedEventsForUser } from "@/db/queries/fixedEvents";
import { getUserSettings } from "@/db/queries/settings";
import { MonthCalendar, type CalendarItem } from "@/components/month-calendar";
import type { TaskRow } from "@/db/schema";

const HORIZON_DAYS = 90;

// Server components using Neon Auth's session methods must render dynamically.
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const userId = await requireUserId();

  // Fresh instance for this request -- schedule() now takes a single `now`
  // (mutates it internally), and nothing here reads `now` again afterward.
  const now = new Date();

  const [taskRows, fixedEventRows, settings] = await Promise.all([
    getSchedulableTasksForUser(userId, now),
    getFixedEventsForUser(userId),
    getUserSettings(userId),
  ]);

  const tasksById = new Map<string, TaskRow>(taskRows.map((row) => [row.id, row]));
  const fixedEventsById = new Map(fixedEventRows.map((row) => [row.id, row]));

  const expandedFixedTasks = expandFixedEvents({
    events: fixedEventRows.map(dbFixedEventToDefinition),
    rangeStart: now,
    daysAhead: HORIZON_DAYS,
  });

  const result =
    taskRows.length > 0
      ? schedule({
          tasks: taskRows.map(dbTaskToTask),
          fixedTask: expandedFixedTasks,
          dailyCapacity: settings.dailyCapacityHours,
          capacityOverflowPercent: settings.capacityOverflowPercent,
          now,
        })
      : null;

  const items: CalendarItem[] = [];

  for (const record of result?.scheduledTasks ?? []) {
    const task = tasksById.get(record.taskId);
    if (!task) continue;
    items.push({
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
    const fixedEvent = fixedEventsById.get(originalId);
    if (!fixedEvent) continue;
    items.push({
      key: `fixed:${expanded.id}`,
      kind: "fixed",
      title: fixedEvent.title,
      start: expanded.start,
      end: expanded.end,
      fixedEvent,
    });
  }

  return <MonthCalendar items={items} />;
}
