// Turns fixed/recurring event definitions into concrete per-day time blocks
// matching the shape schedule.ts expects ({id, start, end}), for a given
// horizon. Pure, dependency-free of priority.ts/schedule.ts.
//
// Handles the one contract gap schedule.ts explicitly leaves to its caller
// (see algorithm/documentation/scheduling.md): an event whose start/end crosses
// midnight (e.g. sleep 23:00-07:00) is split into two same-day pieces before
// being emitted, since schedule() only ever buckets a fixed task under the
// single day containing its .start.

export type FixedEventRecurrence =
  | { type: "once"; date: Date }
  | { type: "daily" }
  | { type: "weekly"; daysOfWeek: number[] }; // 0=Sun..6=Sat

export type FixedEventDefinition = {
  id: string;
  title: string;
  recurrence: FixedEventRecurrence;
  startTime: string; // "HH:mm", local wall-clock time
  endTime: string; // "HH:mm"
};

export type ExpandedFixedTask = {
  id: string;
  start: Date;
  end: Date;
};

function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const [hoursStr, minutesStr] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time-of-day string: "${value}"`);
  }
  return { hours, minutes };
}

function atTimeOfDay(day: Date, time: { hours: number; minutes: number }): Date {
  const result = new Date(day);
  result.setHours(time.hours, time.minutes, 0, 0);
  return result;
}

function endOfDay(day: Date): Date {
  const result = new Date(day);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfDay(day: Date): Date {
  const result = new Date(day);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Adds calendar days by incrementing the date field directly, rather than
// adding a fixed millisecond offset -- raw ms arithmetic drifts by an hour
// across a DST transition (e.g. the UK's clocks-back day has 25 real hours),
// which can make two different day indices land on the same local midnight.
function addDays(day: Date, amount: number): Date {
  const result = new Date(day);
  result.setDate(result.getDate() + amount);
  return result;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function occursOn(recurrence: FixedEventRecurrence, day: Date): boolean {
  switch (recurrence.type) {
    case "once":
      return isSameCalendarDay(recurrence.date, day);
    case "daily":
      return true;
    case "weekly":
      return recurrence.daysOfWeek.includes(day.getDay());
  }
}

export function expandFixedEvents({
  events,
  rangeStart,
  daysAhead,
}: {
  events: FixedEventDefinition[];
  rangeStart: Date;
  daysAhead: number;
}): ExpandedFixedTask[] {
  const expanded: ExpandedFixedTask[] = [];
  const horizonStart = startOfDay(rangeStart);

  for (let dayIndex = 0; dayIndex < daysAhead; dayIndex++) {
    const day = addDays(horizonStart, dayIndex);

    for (const event of events) {
      if (!occursOn(event.recurrence, day)) continue;

      const start = atTimeOfDay(day, parseTimeOfDay(event.startTime));
      const end = atTimeOfDay(day, parseTimeOfDay(event.endTime));

      if (end.getTime() <= start.getTime()) {
        // Crosses midnight: split into this day's tail and the next day's head.
        const nextDay = addDays(day, 1);
        expanded.push({
          id: `${event.id}:${dayIndex}:a`,
          start,
          end: endOfDay(day),
        });
        expanded.push({
          id: `${event.id}:${dayIndex}:b`,
          start: startOfDay(nextDay),
          end: atTimeOfDay(nextDay, parseTimeOfDay(event.endTime)),
        });
      } else {
        expanded.push({
          id: `${event.id}:${dayIndex}`,
          start,
          end,
        });
      }
    }
  }

  return expanded;
}
