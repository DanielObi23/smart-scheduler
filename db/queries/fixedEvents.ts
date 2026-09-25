import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fixedEvents, type FixedEventRow } from "@/db/schema";

export function getFixedEventsForUser(userId: string): Promise<FixedEventRow[]> {
  return db.select().from(fixedEvents).where(eq(fixedEvents.userId, userId));
}
