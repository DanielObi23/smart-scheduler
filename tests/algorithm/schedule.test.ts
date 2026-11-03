// Written by Claude Code -- see tests/README.md. Verifies algorithm/schedule.ts
// (authored by hand) through its one exported function, schedule().
//
// Ports the manual verification that happened during development -- hand-picked
// edge cases, a randomized fuzz test, and targeted regressions for specific bugs
// that were found and fixed (see algorithm/issues/scheduling-issues.md and
// algorithm/documentation/scheduling.md) -- into something that actually runs.

import { describe, it, expect } from "vitest";
import { schedule } from "../../algorithm/schedule";
import type { Task } from "../../algorithm/schedule";

type FixedTask = { id: string; start: Date; end: Date };
type ScheduledRecord = { taskId: string; start: Date; end: Date };

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

function makeTask(id: string, overrides: Partial<Task> = {}, now: Date): Task {
  return {
    id,
    estimatedTime: 60,
    importance: 3,
    dueDateTime: new Date(now.getTime() + 3 * DAY),
    state: "todo",
    createdAt: new Date(now.getTime() - 1000),
    ...overrides,
  };
}

/**
 * No two *scheduled* blocks may overlap each other or any given fixed task.
 * Fixed tasks are the caller's input, not schedule()'s output -- they're
 * allowed to overlap each other (schedule() merges them internally via
 * uniqueTimeRange), so fixed-vs-fixed pairs are deliberately not checked here.
 */
function assertNoOverlaps(
  scheduledTasks: ScheduledRecord[],
  fixedTask: FixedTask[] = [],
) {
  type Block = { start: Date; end: Date; isScheduled: boolean };
  const blocks: Block[] = [
    ...scheduledTasks.map((s) => ({ ...s, isScheduled: true })),
    ...fixedTask.map((f) => ({ ...f, isScheduled: false })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1];
    const curr = blocks[i];
    if (!prev.isScheduled && !curr.isScheduled) continue; // fixed-vs-fixed: not our concern here
    expect(curr.start.getTime()).toBeGreaterThanOrEqual(prev.end.getTime());
  }
}

describe("schedule() -- hand-picked edge cases", () => {
  const now = new Date("2026-06-15T08:00:00");

  it("returns null for an empty task list", () => {
    expect(
      schedule({ tasks: [], fixedTask: [], dailyCapacity: 8, capacityOverflowPercent: 0, now }),
    ).toBeNull();
  });

  it("schedules two ordinary tasks with no fixed commitments", () => {
    const tasks = [makeTask("a", { estimatedTime: 60 }, now), makeTask("b", { estimatedTime: 90 }, now)];
    const result = schedule({ tasks, fixedTask: [], dailyCapacity: 8, capacityOverflowPercent: 0, now });
    expect(result?.unscheduledTasks).toHaveLength(0);
    assertNoOverlaps(result!.scheduledTasks);
  });

  it("splits a task longer than daily capacity across multiple days", () => {
    const tasks = [makeTask("big", { estimatedTime: 600, dueDateTime: new Date(now.getTime() + 5 * DAY) }, now)];
    const result = schedule({ tasks, fixedTask: [], dailyCapacity: 4, capacityOverflowPercent: 0, now });
    expect(result?.unscheduledTasks).toHaveLength(0);
    const totalMs = result!.scheduledTasks.reduce((sum, r) => sum + (r.end.getTime() - r.start.getTime()), 0);
    expect(totalMs).toBe(600 * MIN);
    assertNoOverlaps(result!.scheduledTasks);
  });

  it("leaves an impossible task (due too soon to fit) unscheduled", () => {
    const tasks = [makeTask("impossible", { estimatedTime: 600, dueDateTime: new Date(now.getTime() + DAY) }, now)];
    const result = schedule({ tasks, fixedTask: [], dailyCapacity: 2, capacityOverflowPercent: 0, now });
    expect(result?.unscheduledTasks.map((t) => t.id)).toEqual(["impossible"]);
  });

  it("never double-books multiple same-day tasks competing for capacity", () => {
    const tasks = [1, 2, 3, 4].map((n) =>
      makeTask(`t${n}`, { estimatedTime: 120, importance: n, dueDateTime: new Date(now.getTime() + DAY) }, now),
    );
    const result = schedule({ tasks, fixedTask: [], dailyCapacity: 8, capacityOverflowPercent: 0, now });
    assertNoOverlaps(result!.scheduledTasks);
  });

  it("respects fixed tasks carving up the day", () => {
    const fixedTask: FixedTask[] = [
      { id: "sleep", start: new Date(now.getTime() - 8 * HOUR), end: now },
      { id: "lunch", start: new Date(now.getTime() + 4 * HOUR), end: new Date(now.getTime() + 5 * HOUR) },
    ];
    const tasks = [makeTask("work", { estimatedTime: 180, dueDateTime: new Date(now.getTime() + DAY) }, now)];
    const result = schedule({ tasks, fixedTask, dailyCapacity: 8, capacityOverflowPercent: 0, now });
    assertNoOverlaps(result!.scheduledTasks, fixedTask);
  });

  it("leaves everything unscheduled at zero daily capacity", () => {
    const tasks = [makeTask("t1", { estimatedTime: 30 }, now)];
    const result = schedule({ tasks, fixedTask: [], dailyCapacity: 0, capacityOverflowPercent: 0, now });
    expect(result?.unscheduledTasks.map((t) => t.id)).toEqual(["t1"]);
  });

  it("merges overlapping fixed tasks without crashing or double-counting them", () => {
    const fixedTask: FixedTask[] = [
      { id: "f1", start: new Date(now.getTime() + HOUR), end: new Date(now.getTime() + 3 * HOUR) },
      { id: "f2", start: new Date(now.getTime() + 2 * HOUR), end: new Date(now.getTime() + 4 * HOUR) },
    ];
    const tasks = [makeTask("t1", { estimatedTime: 60, dueDateTime: new Date(now.getTime() + DAY) }, now)];
    const result = schedule({ tasks, fixedTask, dailyCapacity: 8, capacityOverflowPercent: 0, now });
    assertNoOverlaps(result!.scheduledTasks, fixedTask);
  });

  it("every scheduled block has a positive duration", () => {
    const tasks = [1, 2, 3].map((n) =>
      makeTask(`t${n}`, { estimatedTime: 400, dueDateTime: new Date(now.getTime() + 2 * DAY) }, now),
    );
    const result = schedule({ tasks, fixedTask: [], dailyCapacity: 3, capacityOverflowPercent: 10, now });
    for (const record of result!.scheduledTasks) {
      expect(record.end.getTime()).toBeGreaterThan(record.start.getTime());
    }
  });
});

describe("schedule() -- doesn't mutate what it's given", () => {
  it("leaves the caller's `now` Date object unchanged after returning", () => {
    const now = new Date();
    const before = now.toISOString();
    const tasks = [makeTask("t1", { estimatedTime: 30, dueDateTime: new Date(now.getTime() + DAY) }, now)];
    schedule({ tasks, fixedTask: [], dailyCapacity: 8, capacityOverflowPercent: 0, now });
    expect(now.toISOString()).toBe(before);
  });
});

describe("schedule() -- DST safety", () => {
  // Only meaningful if the machine running this test actually observes a DST
  // transition around this date (true in the UK, where the original bug was
  // found and fixed) -- skips with a clear message elsewhere rather than
  // silently passing without testing anything.
  const beforeTransition = new Date(2026, 9, 24);
  const afterTransition = new Date(2026, 9, 26);
  const observesDst = beforeTransition.getTimezoneOffset() !== afterTransition.getTimezoneOffset();

  (observesDst ? it : it.skip)(
    "doesn't collide two different days onto the same real time across a DST transition",
    () => {
      const now = new Date(2026, 9, 22); // a few days before the UK's autumn transition
      const tasks = [makeTask("t1", { estimatedTime: 60, dueDateTime: new Date(now.getTime() + 6 * DAY) }, now)];
      const result = schedule({ tasks, fixedTask: [], dailyCapacity: 8, capacityOverflowPercent: 0, now });
      assertNoOverlaps(result!.scheduledTasks);
    },
  );

  if (!observesDst) {
    console.warn(
      "[schedule.test.ts] Skipping DST test: this machine's timezone doesn't observe a transition on the tested date.",
    );
  }
});

describe("schedule() -- randomized fuzz test", () => {
  // Deterministic PRNG so failures are reproducible.
  let seed = 42;
  function rand() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  function randInt(min: number, max: number) {
    return Math.floor(rand() * (max - min + 1)) + min;
  }

  it("produces no crashes, overlaps, negative durations, or lost/mismatched tasks across 2000 randomized runs", () => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    for (let run = 0; run < 2000; run++) {
      const numTasks = randInt(1, 8);
      const tasks: Task[] = [];
      for (let i = 0; i < numTasks; i++) {
        tasks.push(
          makeTask(
            `T${i}`,
            {
              estimatedTime: randInt(5, 300),
              importance: randInt(1, 5),
              dueDateTime: new Date(now.getTime() + randInt(0, 10) * DAY + randInt(0, 23) * HOUR),
              state: rand() < 0.1 ? "in_progress" : "todo",
              createdAt: new Date(now.getTime() - randInt(0, 100_000)),
            },
            now,
          ),
        );
      }

      const numFixed = randInt(0, 3);
      const fixedTask: FixedTask[] = [];
      for (let i = 0; i < numFixed; i++) {
        const dayOffset = randInt(0, 5);
        const startHour = randInt(0, 22);
        // Clamped so the fixed task never crosses midnight -- schedule()
        // explicitly documents that as the caller's responsibility, not
        // something it handles itself.
        const maxDuration = Math.min(3, 24 - startHour);
        const duration = randInt(1, Math.max(1, maxDuration));
        const start = new Date(todayStart.getTime() + dayOffset * DAY + startHour * HOUR);
        const end = new Date(start.getTime() + duration * HOUR);
        fixedTask.push({ id: `F${i}`, start, end });
      }

      const dailyCapacity = randInt(1, 12);
      const capacityOverflowPercent = randInt(0, 50);

      const result = schedule({
        tasks,
        fixedTask,
        dailyCapacity,
        capacityOverflowPercent,
        now: new Date(now),
      });

      if (!result) continue;

      for (const record of result.scheduledTasks) {
        expect(record.end.getTime()).toBeGreaterThan(record.start.getTime());
      }

      assertNoOverlaps(result.scheduledTasks, fixedTask);

      const scheduledIds = new Set(result.scheduledTasks.map((s) => s.taskId));
      const unscheduledIds = new Set(result.unscheduledTasks.map((t) => t.id));
      for (const task of tasks) {
        const inScheduled = scheduledIds.has(task.id);
        const inUnscheduled = unscheduledIds.has(task.id);
        expect(inScheduled || inUnscheduled).toBe(true);
        expect(inScheduled && inUnscheduled).toBe(false);

        if (inScheduled) {
          const totalMs = result.scheduledTasks
            .filter((r) => r.taskId === task.id)
            .reduce((sum, r) => sum + (r.end.getTime() - r.start.getTime()), 0);
          expect(Math.abs(totalMs - task.estimatedTime * MIN)).toBeLessThan(1000);
        }
      }
    }
  });
});
