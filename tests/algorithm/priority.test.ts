// Written by Claude Code -- see tests/README.md. Verifies algorithm/priority.ts
// (authored by hand) through its one exported function, priority().

import { describe, it, expect } from "vitest";
import { priority } from "../../algorithm/priority";
import type { Task } from "../../algorithm/schedule";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = new Date("2026-06-15T09:00:00Z");

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    estimatedTime: 60,
    importance: 3,
    dueDateTime: new Date(now.getTime() + 3 * DAY),
    state: "todo",
    createdAt: new Date(now.getTime() - HOUR),
    ...overrides,
  };
}

describe("priority()", () => {
  it("always returns a value in [0, 1]", () => {
    const cases: Partial<Task>[] = [
      { importance: 1, estimatedTime: 5, dueDateTime: new Date(now.getTime() + HOUR) },
      { importance: 5, estimatedTime: 600, dueDateTime: new Date(now.getTime() + 30 * DAY) },
      { importance: 3, dueDateTime: new Date(now.getTime() - 10 * DAY) }, // overdue
    ];
    for (const overrides of cases) {
      const value = priority({ task: makeTask(overrides), now, dailyCapacity: 8 });
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("ranks higher importance above lower importance, all else equal", () => {
    const important = priority({
      task: makeTask({ importance: 1 }),
      now,
      dailyCapacity: 8,
    });
    const unimportant = priority({
      task: makeTask({ importance: 5 }),
      now,
      dailyCapacity: 8,
    });
    expect(important).toBeGreaterThan(unimportant);
  });

  it("ranks a sooner due date above a later one, all else equal (not overdue)", () => {
    const soon = priority({
      task: makeTask({ dueDateTime: new Date(now.getTime() + HOUR) }),
      now,
      dailyCapacity: 8,
    });
    const later = priority({
      task: makeTask({ dueDateTime: new Date(now.getTime() + 10 * DAY) }),
      now,
      dailyCapacity: 8,
    });
    expect(soon).toBeGreaterThan(later);
  });

  it("regression: a near-due, low-importance task beats a far-due, high-importance one", () => {
    // This is the exact failure mode documented in algorithm/issues/priority-issues.md:
    // urgency's ceiling used to sit mathematically below importance's floor, so an
    // urgent-but-unimportant task could never outrank an important-but-unhurried one,
    // no matter how urgent. The fix (raising k, dampening the capacity term) is what
    // this test locks in.
    const urgentButUnimportant = priority({
      task: makeTask({ importance: 5, dueDateTime: new Date(now.getTime() + HOUR) }),
      now,
      dailyCapacity: 8,
    });
    const importantButUnhurried = priority({
      task: makeTask({ importance: 1, dueDateTime: new Date(now.getTime() + 3 * DAY) }),
      now,
      dailyCapacity: 8,
    });
    expect(urgentButUnimportant).toBeGreaterThan(importantButUnhurried);
  });

  describe("overdue tasks", () => {
    it("favors a quick task over a long one when freshly overdue (SPT-style)", () => {
      const quick = priority({
        task: makeTask({ estimatedTime: 10, dueDateTime: new Date(now.getTime() - HOUR) }),
        now,
        dailyCapacity: 8,
      });
      const long = priority({
        task: makeTask({ estimatedTime: 240, dueDateTime: new Date(now.getTime() - HOUR) }),
        now,
        dailyCapacity: 8,
      });
      expect(quick).toBeGreaterThan(long);
    });

    it("doesn't let a long-overdue task be buried indefinitely by a stream of tiny ones", () => {
      // Matches the starvation check from priority-issues.md: a 3-hour task overdue
      // for 7+ days should still outrank a freshly-overdue 5-minute task.
      const oldAndLong = priority({
        task: makeTask({
          estimatedTime: 180,
          dueDateTime: new Date(now.getTime() - 7 * DAY),
        }),
        now,
        dailyCapacity: 8,
      });
      const freshAndTiny = priority({
        task: makeTask({
          estimatedTime: 5,
          dueDateTime: new Date(now.getTime() - 60_000),
        }),
        now,
        dailyCapacity: 8,
      });
      expect(oldAndLong).toBeGreaterThan(freshAndTiny);
    });

    it("gives in_progress a bonus only when overdue", () => {
      const overdueTodo = priority({
        task: makeTask({ dueDateTime: new Date(now.getTime() - DAY), state: "todo" }),
        now,
        dailyCapacity: 8,
      });
      const overdueInProgress = priority({
        task: makeTask({ dueDateTime: new Date(now.getTime() - DAY), state: "in_progress" }),
        now,
        dailyCapacity: 8,
      });
      expect(overdueInProgress).toBeGreaterThan(overdueTodo);

      const notOverdueTodo = priority({
        task: makeTask({ dueDateTime: new Date(now.getTime() + DAY), state: "todo" }),
        now,
        dailyCapacity: 8,
      });
      const notOverdueInProgress = priority({
        task: makeTask({ dueDateTime: new Date(now.getTime() + DAY), state: "in_progress" }),
        now,
        dailyCapacity: 8,
      });
      // Deliberately not just "close" -- the bonus must be exactly absent here, since
      // applying it to the auto-scheduled pool was the specific instability bug this
      // restriction was meant to prevent (see priority-issues.md).
      expect(notOverdueInProgress).toBe(notOverdueTodo);
    });
  });
});
