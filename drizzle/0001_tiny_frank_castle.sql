ALTER TABLE "user_settings" ADD COLUMN "sleep_start" text DEFAULT '23:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "sleep_end" text DEFAULT '07:00' NOT NULL;