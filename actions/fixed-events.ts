"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { fixedEvents } from "@/db/schema";
import { requireUserId } from "@/lib/auth/require-user-id";

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

const fixedEventInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    recurrenceType: z.enum(["once", "daily", "weekly"]),
    startDate: z.coerce.date().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    startTime: timeOfDay,
    endTime: timeOfDay,
  })
  .refine((data) => data.startTime !== data.endTime, {
    message: "Start and end time can't be the same",
    path: ["endTime"],
  })
  .refine((data) => data.recurrenceType !== "once" || data.startDate, {
    message: "Date is required for a one-off event",
    path: ["startDate"],
  })
  .refine(
    (data) =>
      data.recurrenceType !== "weekly" ||
      (data.daysOfWeek && data.daysOfWeek.length > 0),
    { message: "Pick at least one day of the week", path: ["daysOfWeek"] },
  );

export type FixedEventInput = z.infer<typeof fixedEventInputSchema>;

function revalidateFixedEventPages() {
  // Calendar and Timetable are both tabs on the same route now.
  revalidatePath("/calendar");
}

export async function createFixedEvent(input: FixedEventInput) {
  const userId = await requireUserId();

  const data = fixedEventInputSchema.parse(input);

  await db.insert(fixedEvents).values({
    id: crypto.randomUUID(),
    userId,
    title: data.title,
    recurrenceType: data.recurrenceType,
    startDate: data.startDate,
    daysOfWeek: data.daysOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  revalidateFixedEventPages();
}

export async function updateFixedEvent(id: string, input: FixedEventInput) {
  const userId = await requireUserId();

  const data = fixedEventInputSchema.parse(input);

  await db
    .update(fixedEvents)
    .set({
      title: data.title,
      recurrenceType: data.recurrenceType,
      startDate: data.startDate,
      daysOfWeek: data.daysOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    })
    .where(and(eq(fixedEvents.id, id), eq(fixedEvents.userId, userId)));

  revalidateFixedEventPages();
}

export async function deleteFixedEvent(id: string) {
  const userId = await requireUserId();

  await db
    .delete(fixedEvents)
    .where(and(eq(fixedEvents.id, id), eq(fixedEvents.userId, userId)));

  revalidateFixedEventPages();
}
