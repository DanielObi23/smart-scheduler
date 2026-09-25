import type { FixedEventRow } from "@/db/schema";
import type { FixedEventDefinition, FixedEventRecurrence } from "@/lib/expand-fixed-events";

export function dbFixedEventToDefinition(row: FixedEventRow): FixedEventDefinition {
  let recurrence: FixedEventRecurrence;

  switch (row.recurrenceType) {
    case "once":
      recurrence = { type: "once", date: row.startDate! };
      break;
    case "daily":
      recurrence = { type: "daily" };
      break;
    case "weekly":
      recurrence = { type: "weekly", daysOfWeek: row.daysOfWeek ?? [] };
      break;
  }

  return {
    id: row.id,
    title: row.title,
    recurrence,
    startTime: row.startTime,
    endTime: row.endTime,
  };
}
