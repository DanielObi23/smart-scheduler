import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const taskStateEnum = pgEnum("task_state", [
  "todo",
  "in_progress",
  "done",
]);

export const recurrenceTypeEnum = pgEnum("recurrence_type", [
  "once",
  "daily",
  "weekly",
]);

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  estimatedTime: integer("estimated_time").notNull(), // minutes
  importance: integer("importance").notNull(), // 1-5, 1 = highest
  dueDateTime: timestamp("due_date_time", { withTimezone: true }).notNull(),
  state: taskStateEnum("state").notNull().default("todo"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const fixedEvents = pgTable("fixed_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(), // "Sleep", "Work", "CS 101", etc.
  recurrenceType: recurrenceTypeEnum("recurrence_type").notNull(),
  // only set when recurrenceType = "once"
  startDate: timestamp("start_date", { withTimezone: true }),
  // 0=Sun..6=Sat; only used when recurrenceType = "weekly"
  daysOfWeek: integer("days_of_week").array(),
  startTime: text("start_time").notNull(), // "HH:mm", local wall-clock time
  endTime: text("end_time").notNull(), // "HH:mm"; endTime <= startTime means it crosses midnight
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(), // Clerk user id
  dailyCapacityHours: integer("daily_capacity_hours").notNull().default(8),
  capacityOverflowPercent: integer("capacity_overflow_percent")
    .notNull()
    .default(10),
});

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type FixedEventRow = typeof fixedEvents.$inferSelect;
export type NewFixedEventRow = typeof fixedEvents.$inferInsert;
export type UserSettingsRow = typeof userSettings.$inferSelect;
