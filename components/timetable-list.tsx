import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FixedEventForm } from "@/components/fixed-event-form";
import type { FixedEventRow } from "@/db/schema";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function recurrenceLabel(event: FixedEventRow): string {
  switch (event.recurrenceType) {
    case "once":
      return event.startDate
        ? event.startDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Once";
    case "daily":
      return "Every day";
    case "weekly":
      return (event.daysOfWeek ?? [])
        .slice()
        .sort()
        .map((d) => WEEKDAY_LABELS[d])
        .join(", ");
  }
}

export function TimetableList({ events }: { events: FixedEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground">
        Nothing here yet — add your sleep schedule, work hours, or classes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => (
        <Card key={event.id} className="flex-row items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{event.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {recurrenceLabel(event)} · {event.startTime}–{event.endTime}
            </p>
          </div>
          <FixedEventForm
            event={event}
            trigger={
              <Button variant="outline" size="sm" className="shrink-0">
                Edit
              </Button>
            }
          />
        </Card>
      ))}
    </div>
  );
}
