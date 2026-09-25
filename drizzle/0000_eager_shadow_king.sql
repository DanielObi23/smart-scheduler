CREATE TYPE "public"."recurrence_type" AS ENUM('once', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."task_state" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "fixed_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"recurrence_type" "recurrence_type" NOT NULL,
	"start_date" timestamp with time zone,
	"days_of_week" integer[],
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"estimated_time" integer NOT NULL,
	"importance" integer NOT NULL,
	"due_date_time" timestamp with time zone NOT NULL,
	"state" "task_state" DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"daily_capacity_hours" integer DEFAULT 8 NOT NULL,
	"capacity_overflow_percent" integer DEFAULT 10 NOT NULL
);
